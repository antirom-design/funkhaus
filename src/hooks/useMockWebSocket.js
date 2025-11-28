import { useEffect, useRef, useState } from 'react'

// Mock WebSocket for demo mode when real server is unavailable
export function useMockWebSocket({ onJoined, onRoomsUpdate, onModeChange, onChatMessage, onTalkStateChange }) {
  const [connected, setConnected] = useState(false)
  const mockRooms = useRef(new Map())
  const currentUser = useRef(null)
  const currentHouse = useRef(null)
  const mode = useRef('announcement')

  useEffect(() => {
    // Simulate connection delay
    const timer = setTimeout(() => {
      setConnected(true)
    }, 500)

    return () => clearTimeout(timer)
  }, [])

  const getRoomsList = () => {
    return Array.from(mockRooms.current.values())
  }

  const sendMessage = (type, data) => {
    // Handle messages in mock mode
    switch (type) {
      case 'startTalk':
        onTalkStateChange({
          talking: true,
          roomName: currentUser.current.roomName,
          target: data.target
        })

        // Simulate talk ending after 5 seconds if user holds button
        setTimeout(() => {
          onTalkStateChange({
            talking: false,
            roomName: currentUser.current.roomName
          })
        }, 5000)
        break

      case 'stopTalk':
        onTalkStateChange({
          talking: false,
          roomName: currentUser.current.roomName
        })
        break
    }
  }

  const joinHouse = (houseCode, roomName) => {
    currentHouse.current = houseCode
    currentUser.current = {
      id: `${houseCode}-${roomName}-${Date.now()}`,
      name: roomName,
      houseCode,
      isHousemaster: mockRooms.current.size === 0
    }

    mockRooms.current.set(roomName, currentUser.current)

    // Add some demo rooms
    if (mockRooms.current.size === 1) {
      setTimeout(() => {
        const demoRooms = [
          { name: 'Reception', isHousemaster: false },
          { name: 'Class A', isHousemaster: false },
          { name: 'Class B', isHousemaster: false }
        ]

        demoRooms.forEach((room, idx) => {
          if (!mockRooms.current.has(room.name)) {
            setTimeout(() => {
              mockRooms.current.set(room.name, {
                id: `${houseCode}-${room.name}-${Date.now()}`,
                name: room.name,
                houseCode,
                isHousemaster: false
              })

              onRoomsUpdate(getRoomsList())

              onChatMessage({
                type: 'system',
                text: `${room.name} joined the house`,
                timestamp: Date.now()
              })
            }, idx * 1000)
          }
        })
      }, 1000)
    }

    onJoined({
      isHousemaster: currentUser.current.isHousemaster,
      mode: mode.current,
      rooms: getRoomsList()
    })

    onRoomsUpdate(getRoomsList())
  }

  const changeMode = (newMode) => {
    mode.current = newMode
    onModeChange(newMode)
  }

  const sendChatMessage = (text, target) => {
    const message = {
      sender: currentUser.current.name,
      target: target,
      text: text,
      timestamp: Date.now()
    }

    onChatMessage(message)

    // Simulate responses from demo rooms
    if (target === 'ALL') {
      setTimeout(() => {
        const responders = Array.from(mockRooms.current.values())
          .filter(room => room.name !== currentUser.current.name && !room.isHousemaster)

        if (responders.length > 0) {
          const randomRoom = responders[Math.floor(Math.random() * responders.length)]
          onChatMessage({
            sender: randomRoom.name,
            target: currentUser.current.name,
            text: `Message received! (Demo response from ${randomRoom.name})`,
            timestamp: Date.now()
          })
        }
      }, 1000 + Math.random() * 2000)
    }
  }

  return {
    connected,
    sendMessage,
    joinHouse,
    changeMode,
    sendChatMessage
  }
}
