import { useEffect, useRef, useState } from 'react'

// Mock WebSocket for demo mode when real server is unavailable
export function useMockWebSocket({ sessionId, onJoined, onRoomsUpdate, onModeChange, onChatMessage, onTalkStateChange }) {
  const [connected, setConnected] = useState(false)
  const mockRooms = useRef(new Map())
  const currentUser = useRef(null)
  const currentHouse = useRef(null)
  const mode = useRef('free')

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
          sessionId: currentUser.current.id,
          roomName: currentUser.current.name,
          target: data.target
        })

        // Simulate talk ending after 5 seconds if user holds button
        setTimeout(() => {
          onTalkStateChange({
            talking: false,
            sessionId: currentUser.current.id,
            roomName: currentUser.current.name
          })
        }, 5000)
        break

      case 'stopTalk':
        onTalkStateChange({
          talking: false,
          sessionId: currentUser.current.id,
          roomName: currentUser.current.name
        })
        break
    }
  }

  const joinHouse = (houseCode, roomName, providedSessionId) => {
    currentHouse.current = houseCode
    currentUser.current = {
      id: providedSessionId,
      name: roomName,
      houseCode,
      isHousemaster: mockRooms.current.size === 0
    }

    mockRooms.current.set(providedSessionId, currentUser.current)

    // Add some demo rooms
    if (mockRooms.current.size === 1) {
      setTimeout(() => {
        const demoRooms = [
          { name: 'Reception', isHousemaster: false },
          { name: 'Class A', isHousemaster: false },
          { name: 'Class B', isHousemaster: false }
        ]

        demoRooms.forEach((room, idx) => {
          setTimeout(() => {
            const demoSessionId = crypto.randomUUID ?
              crypto.randomUUID() :
              `demo-${room.name}-${Date.now()}`

            if (!mockRooms.current.has(demoSessionId)) {
              mockRooms.current.set(demoSessionId, {
                id: demoSessionId,
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
            }
          }, idx * 1000)
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
      sender: `${currentUser.current.name} [${currentUser.current.id.substring(0, 4)}]`,
      senderId: currentUser.current.id,
      target: target,
      text: text,
      timestamp: Date.now()
    }

    onChatMessage(message)

    // Simulate responses from demo rooms
    if (target === 'ALL') {
      setTimeout(() => {
        const responders = Array.from(mockRooms.current.values())
          .filter(room => room.id !== currentUser.current.id && !room.isHousemaster)

        if (responders.length > 0) {
          const randomRoom = responders[Math.floor(Math.random() * responders.length)]
          onChatMessage({
            sender: `${randomRoom.name} [${randomRoom.id.substring(0, 4)}]`,
            senderId: randomRoom.id,
            target: currentUser.current.id,
            targetName: currentUser.current.name,
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
