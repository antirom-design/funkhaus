import { useEffect, useRef, useState } from 'react'

export function useWebSocket({ onJoined, onRoomsUpdate, onModeChange, onChatMessage, onTalkStateChange }) {
  const [connected, setConnected] = useState(false)
  const ws = useRef(null)
  const reconnectTimeout = useRef(null)

  useEffect(() => {
    connect()

    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current)
      }
      if (ws.current) {
        ws.current.close()
      }
    }
  }, [])

  const connect = () => {
    // Use production WebSocket URL or local development
    const wsUrl = import.meta.env.PROD
      ? `wss://${window.location.host}/api/ws`
      : 'ws://localhost:3001'

    ws.current = new WebSocket(wsUrl)

    ws.current.onopen = () => {
      console.log('WebSocket connected')
      setConnected(true)
    }

    ws.current.onclose = () => {
      console.log('WebSocket disconnected')
      setConnected(false)
      // Attempt to reconnect after 3 seconds
      reconnectTimeout.current = setTimeout(connect, 3000)
    }

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error)
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

  return {
    connected,
    sendMessage,
    joinHouse,
    changeMode,
    sendChatMessage
  }
}
