import { useEffect, useRef, useState } from 'react'
import { useMockWebSocket } from './useMockWebSocket'

export function useWebSocket({ onJoined, onRoomsUpdate, onModeChange, onChatMessage, onTalkStateChange }) {
  const [connected, setConnected] = useState(false)
  const [useMockMode, setUseMockMode] = useState(false)
  const ws = useRef(null)
  const reconnectTimeout = useRef(null)
  const connectionAttempts = useRef(0)

  // Use mock WebSocket if real connection fails after 3 attempts
  const mockWs = useMockWebSocket({ onJoined, onRoomsUpdate, onModeChange, onChatMessage, onTalkStateChange })

  useEffect(() => {
    if (!useMockMode) {
      connect()
    }

    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current)
      }
      if (ws.current) {
        ws.current.close()
      }
    }
  }, [useMockMode])

  const connect = () => {
    connectionAttempts.current++

    // After 5 failed attempts, switch to demo mode
    if (connectionAttempts.current > 5) {
      console.log('Switching to DEMO mode - using mock WebSocket')
      setUseMockMode(true)
      setConnected(true)

      // Show demo mode notification
      setTimeout(() => {
        onChatMessage({
          type: 'system',
          text: '🎭 DEMO MODE: Running without server. See DEPLOY_RAILWAY.md to enable real connections.',
          timestamp: Date.now()
        })
      }, 1000)
      return
    }

    // WebSocket server deployed on Render.com
    const wsUrl = import.meta.env.PROD
      ? 'wss://funkhaus-websocket.onrender.com'
      : 'ws://localhost:3001'

    try {
      ws.current = new WebSocket(wsUrl)

      ws.current.onopen = () => {
        console.log('WebSocket connected')
        connectionAttempts.current = 0
        setConnected(true)
      }

      ws.current.onclose = () => {
        console.log('WebSocket disconnected')
        setConnected(false)
        // Attempt to reconnect after 2 seconds
        reconnectTimeout.current = setTimeout(connect, 2000)
      }

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error)
      }
    } catch (error) {
      console.error('Failed to create WebSocket:', error)
      setConnected(false)
      reconnectTimeout.current = setTimeout(connect, 2000)
    }

    ws.current.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        handleMessage(message)
      } catch (error) {
        console.error('Error parsing message:', error)
      }
    }
  }

  const handleMessage = (message) => {
    switch (message.type) {
      case 'joined':
        onJoined(message.data)
        break
      case 'rooms':
        onRoomsUpdate(message.data)
        break
      case 'modeChange':
        onModeChange(message.data.mode)
        break
      case 'chat':
        onChatMessage(message.data)
        break
      case 'talkState':
        onTalkStateChange(message.data)
        break
      case 'signal':
        // Handle WebRTC signaling
        window.dispatchEvent(new CustomEvent('webrtc-signal', { detail: message.data }))
        break
      default:
        console.log('Unknown message type:', message.type)
    }
  }

  const sendMessage = (type, data) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type, data }))
    }
  }

  const joinHouse = (houseCode, roomName) => {
    sendMessage('join', { houseCode, roomName })
  }

  const changeMode = (mode) => {
    sendMessage('changeMode', { mode })
  }

  const sendChatMessage = (text, target) => {
    sendMessage('chat', { text, target })
  }

  // Return mock WebSocket if in demo mode
  if (useMockMode) {
    return mockWs
  }

  return {
    connected,
    sendMessage,
    joinHouse,
    changeMode,
    sendChatMessage
  }
}
