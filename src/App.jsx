import { useState, useEffect, useRef } from 'react'
import JoinScreen from './components/JoinScreen'
import MainScreen from './components/MainScreen'
import { useWebSocket } from './hooks/useWebSocket'
import { useWebRTC } from './hooks/useWebRTC'

function App() {
  const [joined, setJoined] = useState(false)
  const [houseCode, setHouseCode] = useState('')
  const [roomName, setRoomName] = useState('')
  const [isHousemaster, setIsHousemaster] = useState(false)
  const [mode, setMode] = useState('announcement') // announcement, returnChannel, free
  const [rooms, setRooms] = useState([])
  const [messages, setMessages] = useState([])
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [talkingRoom, setTalkingRoom] = useState(null)
  const [isDemoMode, setIsDemoMode] = useState(false)

  const {
    connected,
    sendMessage,
    joinHouse,
    changeMode,
    sendChatMessage
  } = useWebSocket({
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
      setTalkingRoom(data.talking ? data.roomName : null)
    }
  })

  const {
    startTalking,
    stopTalking,
    isTalking
  } = useWebRTC({
    houseCode,
    roomName,
    sendSignal: sendMessage
  })

  const addSystemMessage = (text) => {
    setMessages(prev => [...prev, {
      type: 'system',
      text,
      timestamp: Date.now()
    }])
  }

  const handleJoin = (code, name) => {
    setHouseCode(code)
    setRoomName(name)
    joinHouse(code, name)
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

  if (!joined) {
    return <JoinScreen onJoin={handleJoin} connected={connected} />
  }

  return (
    <MainScreen
      houseCode={houseCode}
      roomName={roomName}
      isHousemaster={isHousemaster}
      mode={mode}
      rooms={rooms}
      messages={messages}
      selectedRoom={selectedRoom}
      talkingRoom={talkingRoom}
      isTalking={isTalking}
      canTalkToAll={canTalkToAll()}
      isDemoMode={isDemoMode}
      onModeChange={handleModeChange}
      onSelectRoom={setSelectedRoom}
      onTalkToAll={handleTalkToAll}
      onTalkToRoom={handleTalkToRoom}
      onStopTalking={handleStopTalking}
      onSendChat={handleSendChat}
    />
  )
}

export default App
