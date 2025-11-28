import { useRef, useState, useEffect, useCallback } from 'react'

export function useWebRTC({ houseCode, roomName, sendSignal, onAudioLevel }) {
  const [isTalking, setIsTalking] = useState(null)
  const [audioLevel, setAudioLevel] = useState(0)
  const [isConnected, setIsConnected] = useState(false)
  const localStream = useRef(null)
  const peerConnections = useRef({})
  const audioContext = useRef(null)
  const analyser = useRef(null)
  const animationFrame = useRef(null)
  const remoteAudios = useRef({})
  const isTalkingRef = useRef(null)
  const activeSenders = useRef({})

  // Keep ref in sync with state
  useEffect(() => {
    isTalkingRef.current = isTalking
  }, [isTalking])

  useEffect(() => {
    // Listen for WebRTC signals
    const handleSignal = (event) => {
      const { from, signal, target } = event.detail
      handleRemoteSignal(from, signal, target)
    }

    // Listen for force stop talking from admin
    const handleForceStop = (event) => {
      console.log('Force stop talking:', event.detail)
      if (isTalkingRef.current) {
        stopTalking()
      }
    }

    window.addEventListener('webrtc-signal', handleSignal)
    window.addEventListener('force-stop-talking', handleForceStop)

    return () => {
      window.removeEventListener('webrtc-signal', handleSignal)
      window.removeEventListener('force-stop-talking', handleForceStop)
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
      // Close existing audio context if present
      if (audioContext.current) {
        audioContext.current.close()
      }

      audioContext.current = new (window.AudioContext || window.webkitAudioContext)()
      analyser.current = audioContext.current.createAnalyser()
      const source = audioContext.current.createMediaStreamSource(stream)

      analyser.current.fftSize = 256
      source.connect(analyser.current)

      const dataArray = new Uint8Array(analyser.current.frequencyBinCount)

      const updateLevel = () => {
        if (!analyser.current || !localStream.current) {
          // Stop monitoring if stream is gone
          return
        }

        analyser.current.getByteFrequencyData(dataArray)
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length
        const level = Math.min(100, (average / 128) * 100)
        setAudioLevel(level)

        if (onAudioLevel) {
          onAudioLevel(roomName, level)
        }

        // Continue monitoring as long as stream exists
        animationFrame.current = requestAnimationFrame(updateLevel)
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

      // Notify server
      sendSignal('startTalk', { target, roomName, houseCode })

      console.log('Microphone access granted, will create offers when init signal received')

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

    // Remove tracks from peer connections (but keep connections alive)
    Object.entries(activeSenders.current).forEach(([peerId, senders]) => {
      senders.forEach(sender => {
        const pc = peerConnections.current[peerId]
        if (pc) {
          try {
            pc.removeTrack(sender)
            console.log('Removed track from:', peerId)
          } catch (e) {
            console.log('Error removing track:', e)
          }
        }
      })
    })
    activeSenders.current = {}

    if (localStream.current) {
      localStream.current.getTracks().forEach(track => track.stop())
      localStream.current = null
    }

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

      if (signal.type === 'start-offers') {
        // Talker received signal to create offers for target rooms
        console.log('Creating offers for rooms:', signal.targets)
        for (const targetRoom of signal.targets) {
          const pc = await createPeerConnection(targetRoom)

          // If connection already exists, add tracks and renegotiate
          if (peerConnections.current[targetRoom] && localStream.current && !activeSenders.current[targetRoom]) {
            console.log('Reusing existing connection, adding tracks to:', targetRoom)
            const senders = []
            localStream.current.getTracks().forEach(track => {
              const sender = pc.addTrack(track, localStream.current)
              senders.push(sender)
              console.log('Re-added track:', track.kind)
            })
            activeSenders.current[targetRoom] = senders
          }

          const offer = await pc.createOffer()
          await pc.setLocalDescription(offer)

          sendSignal('webrtc-signal', {
            to: targetRoom,
            from: roomName,
            signal: offer,
            target: targetRoom
          })
          console.log('Sent offer to:', targetRoom)
        }
        setIsConnected(true)
      } else if (signal.type === 'offer') {
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
      const senders = []
      localStream.current.getTracks().forEach(track => {
        const sender = pc.addTrack(track, localStream.current)
        senders.push(sender)
        console.log('Added track:', track.kind)
      })
      // Store senders for later removal
      if (senders.length > 0) {
        activeSenders.current[peerId] = senders
      }
    }

    // Handle incoming audio stream
    pc.ontrack = (event) => {
      console.log('Received remote track from:', peerId, event.track.kind)

      if (event.streams && event.streams[0]) {
        const stream = event.streams[0]

        // Always update or create audio element
        if (!remoteAudios.current[peerId]) {
          const audio = new Audio()
          audio.autoplay = true
          audio.volume = 1.0
          remoteAudios.current[peerId] = audio
          console.log('Created new audio element for:', peerId)
        }

        const audio = remoteAudios.current[peerId]
        audio.srcObject = stream

        // Ensure audio plays (handle autoplay restrictions)
        const playAudio = () => {
          audio.play()
            .then(() => {
              console.log('✓ Playing audio from:', peerId)
            })
            .catch(error => {
              console.error('Error playing audio from', peerId, ':', error)
              // Retry after a short delay
              setTimeout(playAudio, 100)
            })
        }

        playAudio()

        // Monitor track state
        event.track.onended = () => {
          console.log('Track ended from:', peerId)
        }

        event.track.onmute = () => {
          console.log('Track muted from:', peerId)
        }

        event.track.onunmute = () => {
          console.log('Track unmuted from:', peerId)
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

      // Only close on 'failed', not 'disconnected' (which can recover)
      if (pc.iceConnectionState === 'failed') {
        console.error('Connection failed with:', peerId, '- will retry')

        // Clean up failed connection
        if (peerConnections.current[peerId]) {
          peerConnections.current[peerId].close()
          delete peerConnections.current[peerId]
        }
        if (remoteAudios.current[peerId]) {
          remoteAudios.current[peerId].pause()
          remoteAudios.current[peerId].srcObject = null
          delete remoteAudios.current[peerId]
        }
      } else if (pc.iceConnectionState === 'connected') {
        console.log('Successfully connected to:', peerId)
      } else if (pc.iceConnectionState === 'disconnected') {
        console.warn('Temporarily disconnected from:', peerId, '- attempting to reconnect')
        // Don't close yet, ICE will attempt to reconnect
      }
    }

    pc.onconnectionstatechange = () => {
      console.log('Connection state for', peerId, ':', pc.connectionState)
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        console.error('Peer connection failed/closed:', peerId)
        if (peerConnections.current[peerId]) {
          delete peerConnections.current[peerId]
        }
      }
    }

    peerConnections.current[peerId] = pc
    return pc
  }

  return {
    isTalking,
    audioLevel,
    isConnected,
    startTalking,
    stopTalking
  }
}
