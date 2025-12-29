import { useState, useEffect, useRef } from 'react'
import JoinScreen from './components/JoinScreen'
import MainScreen from './components/MainScreen'
import { useWebSocket } from './hooks/useWebSocket'
import { useWebRTC } from './hooks/useWebRTC'

function App() {
  const [viewMode, setViewMode] = useState('desktop') // 'desktop' or 'mobile'
  const [sessionId, setSessionId] = useState(null)

  // Generate unique session ID on mount
  useEffect(() => {
    const id = crypto.randomUUID ?
      crypto.randomUUID() :
      `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    setSessionId(id)
    console.log('Generated session ID:', id)
  }, [])

  useEffect(() => {
    // Auto-detect device type
    const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
                           window.innerWidth < 768 ||
                           ('ontouchstart' in window)

    setViewMode(isMobileDevice ? 'mobile' : 'desktop')

    // Set attribute on root element for CSS targeting
    document.documentElement.setAttribute('data-view-mode', isMobileDevice ? 'mobile' : 'desktop')
  }, [])
  const [joined, setJoined] = useState(false)
  const [houseCode, setHouseCode] = useState('')
  const [roomName, setRoomName] = useState('')
  const [autoJoinAttempted, setAutoJoinAttempted] = useState(false)
  const [isHousemaster, setIsHousemaster] = useState(false)
  const [mode, setMode] = useState('free') // announcement, returnChannel, free
  const [rooms, setRooms] = useState([])
  const [messages, setMessages] = useState([])
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [talkingRoom, setTalkingRoom] = useState(null)
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [roomAudioLevels, setRoomAudioLevels] = useState({})
  const [isAdmin, setIsAdmin] = useState(false)

  const {
    connected,
    sendMessage,
    joinHouse,
    changeMode,
    sendChatMessage
  } = useWebSocket({
    sessionId,
    onJoined: (data) => {
      setJoined(true)
      setIsHousemaster(data.isHousemaster)
      setMode(data.mode)
      setRooms(data.rooms)
      addSystemMessage(`Joined house ${houseCode} as ${roomName}`)
      if (data.isHousemaster) {
        addSystemMessage('You are the Housemaster!')
      }
    },
    onRoomsUpdate: (roomsList) => {
      setRooms(roomsList)
    },
    onModeChange: (newMode) => {
      setMode(newMode)
      addSystemMessage(`Mode changed to: ${newMode.toUpperCase()}`)
    },
    onChatMessage: (msg) => {
      setMessages(prev => [...prev, msg])
      // Detect demo mode message
      if (msg.text && msg.text.includes('DEMO MODE')) {
        setIsDemoMode(true)
      }
    },
    onTalkStateChange: (data) => {
      setTalkingRoom(data.talking ? data.sessionId : null)
    }
  })

  const handleAudioLevel = (fromRoom, level) => {
    setRoomAudioLevels(prev => ({
      ...prev,
      [fromRoom]: level
    }))

    // Clear audio level after a short delay
    if (level === 0) {
      setTimeout(() => {
        setRoomAudioLevels(prev => {
          const newLevels = { ...prev }
          delete newLevels[fromRoom]
          return newLevels
        })
      }, 100)
    }
  }

  const {
    startTalking,
    stopTalking,
    isTalking,
    audioLevel
  } = useWebRTC({
    sessionId,
    houseCode,
    roomName,
    sendSignal: sendMessage,
    onAudioLevel: handleAudioLevel
  })

  const addSystemMessage = (text) => {
    setMessages(prev => [...prev, {
      type: 'system',
      text,
      timestamp: Date.now()
    }])
  }

  // Check for URL parameters on mount
  useEffect(() => {
    if (!autoJoinAttempted && connected) {
      const urlParams = new URLSearchParams(window.location.search)
      const house = urlParams.get('house')
      const room = urlParams.get('room')

      if (house && room) {
        handleJoin(house, room)
      }
      setAutoJoinAttempted(true)
    }
  }, [connected, autoJoinAttempted])

  const handleJoin = (code, name) => {
    if (!sessionId) {
      console.error('Session ID not generated yet')
      return
    }
    setHouseCode(code)
    setRoomName(name)
    joinHouse(code, name, sessionId)
  }

  const handleModeChange = (newMode) => {
    changeMode(newMode)
  }

  const handleTalkToAll = () => {
    if (!canTalkToAll()) return
    startTalking('ALL')
  }

  const handleTalkToRoom = (targetRoom) => {
    if (!targetRoom) return
    startTalking(targetRoom)
  }

  const handleStopTalking = () => {
    stopTalking()
  }

  const handleSendChat = (message, target) => {
    sendChatMessage(message, target)
  }

  const canTalkToAll = () => {
    if (isHousemaster) return true
    if (mode === 'free') return true
    if (mode === 'returnChannel') return true // In real app, check if option enabled
    return false
  }

  const handleAdminLogin = (password) => {
    if (password === 'secret') {
      setIsAdmin(true)
      addSystemMessage('Admin mode activated')
      return true
    }
    return false
  }

  const handleAdminLogout = () => {
    setIsAdmin(false)
    addSystemMessage('Admin mode deactivated')
  }

  const handleKillAllAudio = () => {
    sendMessage('killAllAudio', {})
    addSystemMessage('Killed all audio connections')
  }

  if (!joined) {
    return <JoinScreen onJoin={handleJoin} connected={connected} />
  }

  return (
    <MainScreen
      sessionId={sessionId}
      connected={connected}
      houseCode={houseCode}
      roomName={roomName}
      isHousemaster={isHousemaster}
      isAdmin={isAdmin}
      mode={mode}
      rooms={rooms}
      messages={messages}
      selectedRoom={selectedRoom}
      talkingRoom={talkingRoom}
      isTalking={isTalking}
      canTalkToAll={canTalkToAll()}
      isDemoMode={isDemoMode}
      audioLevel={audioLevel}
      roomAudioLevels={roomAudioLevels}
      viewMode={viewMode}
      onModeChange={handleModeChange}
      onSelectRoom={setSelectedRoom}
      onTalkToAll={handleTalkToAll}
      onTalkToRoom={handleTalkToRoom}
      onStopTalking={handleStopTalking}
      onSendChat={handleSendChat}
      onAdminLogin={handleAdminLogin}
      onAdminLogout={handleAdminLogout}
      onKillAllAudio={handleKillAllAudio}
    />
  )
}

export default App
