import { useRef, useState, useEffect, useCallback } from 'react'

export function useWebRTC({ houseCode, roomName, sendSignal, onAudioLevel }) {
  const [isTalking, setIsTalking] = useState(null)
  const [audioLevel, setAudioLevel] = useState(0)
  const localStream = useRef(null)
  const peerConnections = useRef({})
  const audioContext = useRef(null)
  const analyser = useRef(null)
  const animationFrame = useRef(null)
  const remoteAudios = useRef({})

  useEffect(() => {
    // Listen for WebRTC signals
    const handleSignal = (event) => {
      const { from, signal, target } = event.detail
      handleRemoteSignal(from, signal, target)
    }

    window.addEventListener('webrtc-signal', handleSignal)

    return () => {
      window.removeEventListener('webrtc-signal', handleSignal)
      cleanup()
    }
  }, [roomName])

  const cleanup = () => {
    if (animationFrame.current) {
      cancelAnimationFrame(animationFrame.current)
    }

    if (localStream.current) {
      localStream.current.getTracks().forEach(track => track.stop())
      localStream.current = null
    }

    Object.values(peerConnections.current).forEach(pc => {
      pc.close()
    })
    peerConnections.current = {}

    Object.values(remoteAudios.current).forEach(audio => {
      audio.pause()
      audio.srcObject = null
    })
    remoteAudios.current = {}

    if (audioContext.current) {
      audioContext.current.close()
      audioContext.current = null
    }

    setAudioLevel(0)
  }

  const startAudioLevelMonitoring = (stream) => {
    try {
      audioContext.current = new (window.AudioContext || window.webkitAudioContext)()
      analyser.current = audioContext.current.createAnalyser()
      const source = audioContext.current.createMediaStreamSource(stream)

      analyser.current.fftSize = 256
      source.connect(analyser.current)

      const dataArray = new Uint8Array(analyser.current.frequencyBinCount)

      const updateLevel = () => {
        analyser.current.getByteFrequencyData(dataArray)
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length
        const level = Math.min(100, (average / 128) * 100)
        setAudioLevel(level)

        if (onAudioLevel) {
          onAudioLevel(roomName, level)
        }

        if (isTalking) {
          animationFrame.current = requestAnimationFrame(updateLevel)
        }
      }

      updateLevel()
    } catch (error) {
      console.error('Error setting up audio level monitoring:', error)
    }
  }

  const startTalking = async (target) => {
    try {
      console.log(`Starting to talk to: ${target}`)

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000
        },
        video: false
      })

      localStream.current = stream
      setIsTalking(target)

      // Start audio level monitoring
      startAudioLevelMonitoring(stream)

      // Notify server and initiate peer connections
      sendSignal('startTalk', { target, roomName, houseCode })

      console.log('Microphone access granted, starting peer connections')

    } catch (error) {
      console.error('Error accessing microphone:', error)
      alert('Could not access microphone. Please check permissions.')
      setIsTalking(null)
    }
  }

  const stopTalking = () => {
    console.log('Stopping talk')

    if (animationFrame.current) {
      cancelAnimationFrame(animationFrame.current)
    }

    if (localStream.current) {
      localStream.current.getTracks().forEach(track => track.stop())
      localStream.current = null
    }

    // Close all peer connections
    Object.values(peerConnections.current).forEach(pc => pc.close())
    peerConnections.current = {}

    // Notify server
    sendSignal('stopTalk', { roomName, houseCode })
    setIsTalking(null)
    setAudioLevel(0)
  }

  const handleRemoteSignal = async (from, signal, target) => {
    try {
      console.log('Received signal from:', from, 'type:', signal.type)

      // Only handle signals if we're the target or it's for ALL
      if (target !== 'ALL' && target !== roomName) {
        console.log('Signal not for us, ignoring')
        return
      }

      if (signal.type === 'offer') {
        console.log('Creating answer for offer from:', from)
        const pc = await createPeerConnection(from)
        await pc.setRemoteDescription(new RTCSessionDescription(signal))
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)

        sendSignal('webrtc-signal', {
          to: from,
          from: roomName,
          signal: answer,
          target: from
        })
        console.log('Sent answer to:', from)
      } else if (signal.type === 'answer') {
        const pc = peerConnections.current[from]
        if (pc) {
          console.log('Setting remote answer from:', from)
          await pc.setRemoteDescription(new RTCSessionDescription(signal))
        }
      } else if (signal.candidate) {
        const pc = peerConnections.current[from]
        if (pc && pc.remoteDescription) {
          console.log('Adding ICE candidate from:', from)
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate))
        }
      } else if (signal.type === 'init') {
        // Receiver initiates connection when someone starts talking
        console.log('Initializing connection to talker:', from)
        const pc = await createPeerConnection(from)
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)

        sendSignal('webrtc-signal', {
          to: from,
          from: roomName,
          signal: offer,
          target: from
        })
        console.log('Sent offer to:', from)
      }
    } catch (error) {
      console.error('Error handling remote signal:', error)
    }
  }

  const createPeerConnection = async (peerId) => {
    console.log('Creating peer connection for:', peerId)

    if (peerConnections.current[peerId]) {
      console.log('Peer connection already exists for:', peerId)
      return peerConnections.current[peerId]
    }

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ]
    })

    // Add local stream tracks if we're talking
    if (localStream.current) {
      console.log('Adding local stream tracks to peer connection')
      localStream.current.getTracks().forEach(track => {
        pc.addTrack(track, localStream.current)
        console.log('Added track:', track.kind)
      })
    }

    // Handle incoming audio stream
    pc.ontrack = (event) => {
      console.log('Received remote track from:', peerId, event.track.kind)

      if (event.streams && event.streams[0]) {
        if (!remoteAudios.current[peerId]) {
          const audio = new Audio()
          audio.autoplay = true
          audio.srcObject = event.streams[0]
          remoteAudios.current[peerId] = audio

          audio.play().then(() => {
            console.log('Playing audio from:', peerId)
          }).catch(error => {
            console.error('Error playing audio:', error)
          })
        }
      }
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('Sending ICE candidate to:', peerId)
        sendSignal('webrtc-signal', {
          to: peerId,
          from: roomName,
          signal: { candidate: event.candidate },
          target: peerId
        })
      }
    }

    pc.oniceconnectionstatechange = () => {
      console.log('ICE connection state for', peerId, ':', pc.iceConnectionState)
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        console.log('Connection lost with:', peerId)
        if (peerConnections.current[peerId]) {
          peerConnections.current[peerId].close()
          delete peerConnections.current[peerId]
        }
        if (remoteAudios.current[peerId]) {
          remoteAudios.current[peerId].pause()
          delete remoteAudios.current[peerId]
        }
      }
    }

    peerConnections.current[peerId] = pc
    return pc
  }

  return {
    isTalking,
    audioLevel,
    startTalking,
    stopTalking
  }
}
