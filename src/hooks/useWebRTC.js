import { useRef, useState, useEffect } from 'react'

export function useWebRTC({ houseCode, roomName, sendSignal }) {
  const [isTalking, setIsTalking] = useState(null) // null or target (room name or 'ALL')
  const localStream = useRef(null)
  const peerConnections = useRef({})
  const audioContext = useRef(null)

  useEffect(() => {
    // Listen for WebRTC signals
    const handleSignal = (event) => {
      const { from, signal } = event.detail
      handleRemoteSignal(from, signal)
    }

    window.addEventListener('webrtc-signal', handleSignal)

    return () => {
      window.removeEventListener('webrtc-signal', handleSignal)
      cleanup()
    }
  }, [])

  const cleanup = () => {
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => track.stop())
      localStream.current = null
    }

    Object.values(peerConnections.current).forEach(pc => pc.close())
    peerConnections.current = {}

    if (audioContext.current) {
      audioContext.current.close()
      audioContext.current = null
    }
  }

  const startTalking = async (target) => {
    try {
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })

      localStream.current = stream
      setIsTalking(target)

      // Notify server that we're talking
      sendSignal('startTalk', { target, roomName, houseCode })

      // In a real implementation, establish WebRTC peer connections here
      // For simplicity, we're using the server as a relay
      // You would create RTCPeerConnection objects and exchange SDP offers/answers

    } catch (error) {
      console.error('Error accessing microphone:', error)
      alert('Could not access microphone. Please check permissions.')
    }
  }

  const stopTalking = () => {
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => track.stop())
      localStream.current = null
    }

    // Notify server that we stopped talking
    sendSignal('stopTalk', { roomName, houseCode })
    setIsTalking(null)
  }

  const handleRemoteSignal = async (from, signal) => {
    // Handle incoming WebRTC signals (offers, answers, ICE candidates)
    // This would contain the full WebRTC negotiation logic

    if (signal.type === 'offer') {
      const pc = createPeerConnection(from)
      await pc.setRemoteDescription(signal)
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      sendSignal('signal', { to: from, signal: answer })
    } else if (signal.type === 'answer') {
      const pc = peerConnections.current[from]
      if (pc) {
        await pc.setRemoteDescription(signal)
      }
    } else if (signal.candidate) {
      const pc = peerConnections.current[from]
      if (pc) {
        await pc.addIceCandidate(signal.candidate)
      }
    }
  }

  const createPeerConnection = (peerId) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    })

    // Add local stream if we're talking
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => {
        pc.addTrack(track, localStream.current)
      })
    }

    // Handle incoming audio stream
    pc.ontrack = (event) => {
      const remoteAudio = new Audio()
      remoteAudio.srcObject = event.streams[0]
      remoteAudio.play()
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal('signal', {
          to: peerId,
          signal: { candidate: event.candidate }
        })
      }
    }

    peerConnections.current[peerId] = pc
    return pc
  }

  return {
    isTalking,
    startTalking,
    stopTalking
  }
}
