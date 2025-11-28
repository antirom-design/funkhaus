import { useState, useEffect, useRef } from 'react'
import JoinScreen from './components/JoinScreen'
import RoomSelector from './components/RoomSelector'
import MainScreen from './components/MainScreen'
import { useWebSocket } from './hooks/useWebSocket'
import { useWebRTC } from './hooks/useWebRTC'

function App() {
  const [viewMode, setViewMode] = useState('desktop') // 'desktop' or 'mobile'

  useEffect(() => {
    // Auto-detect device type
    const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
                           window.innerWidth < 768 ||
                           ('ontouchstart' in window)

    setViewMode(isMobileDevice ? 'mobile' : 'desktop')

    // Set attribute on root element for CSS targeting
    document.documentElement.setAttribute('data-view-mode', isMobileDevice ? 'mobile' : 'desktop')
  }, [])

  // Join flow states: null → 'inHouse' → 'inRoom'
  const [joinState, setJoinState] = useState(null)
  const [houseCode, setHouseCode] = useState('')
  const [userName, setUserName] = useState('')
  const [userId, setUserId] = useState('')
  const [roomName, setRoomName] = useState('')
  const [isHousemaster, setIsHousemaster] = useState(false)
  const [mode, setMode] = useState('announcement') // announcement, returnChannel, free
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
    joinRoom,
    createRoom,
    changeMode,
    sendChatMessage
  } = useWebSocket({
    onHouseJoined: (data) => {
      setUserId(data.userId)
      setIsHousemaster(data.isHousemaster)
      setMode(data.mode)
      setRooms(data.rooms)
      setJoinState('inHouse')
      if (data.isHousemaster) {
        addSystemMessage('You are the Housemaster!')
      }
    },
    onRoomJoined: (data) => {
      setRoomName(data.roomName)
      setJoinState('inRoom')
      addSystemMessage(`Joined room: ${data.roomName}`)
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
      setTalkingRoom(data.talking ? data.userId : null)
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
    houseCode,
    userId,
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

  const handleJoinHouse = (code, name) => {
    setHouseCode(code)
    setUserName(name)
    joinHouse(code, name)
  }

  const handleSelectRoom = (name) => {
    joinRoom(name)
  }

  const handleCreateRoom = (name) => {
    createRoom(name, false) // Create temporary room
    joinRoom(name) // Automatically join the new room
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

  // Three-phase UI: JoinScreen → RoomSelector → MainScreen
  if (joinState === null) {
    return <JoinScreen onJoin={handleJoinHouse} connected={connected} />
  }

  if (joinState === 'inHouse') {
    return (
      <RoomSelector
        houseCode={houseCode}
        userName={userName}
        rooms={rooms}
        onSelectRoom={handleSelectRoom}
        onCreateRoom={handleCreateRoom}
      />
    )
  }

  return (
    <MainScreen
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
