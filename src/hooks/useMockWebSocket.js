import { useEffect, useRef, useState } from 'react'

// Mock WebSocket for demo mode when real server is unavailable
export function useMockWebSocket({ onHouseJoined, onRoomJoined, onRoomsUpdate, onModeChange, onChatMessage, onTalkStateChange }) {
  const [connected, setConnected] = useState(false)
  const mockRooms = useRef(new Map()) // Map of room names to room data
  const mockUsers = useRef(new Map()) // Map of user IDs to user data
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
    return Array.from(mockRooms.current.values()).map(room => ({
      name: room.name,
      occupancy: room.users ? room.users.length : 0,
      users: room.users || [],
      permanent: room.permanent || false
    }))
  }

  const sendMessage = (type, data) => {
    // Handle messages in mock mode
    switch (type) {
      case 'startTalk':
        if (currentUser.current) {
          onTalkStateChange({
            talking: true,
            userId: currentUser.current.id,
            userName: currentUser.current.name,
            target: data.target
          })
        }
        break

      case 'stopTalk':
        if (currentUser.current) {
          onTalkStateChange({
            talking: false,
            userId: currentUser.current.id,
            userName: currentUser.current.name
          })
        }
        break
    }
  }

  const joinHouse = (houseCode, userName) => {
    currentHouse.current = houseCode
    const userId = `${userName}-${Date.now()}`
    const isHousemaster = mockUsers.current.size === 0

    currentUser.current = {
      id: userId,
      name: userName,
      houseCode,
      isHousemaster,
      currentRoom: null
    }

    mockUsers.current.set(userId, currentUser.current)

    // Create some demo rooms with simulated occupancy
    if (mockRooms.current.size === 0) {
      const demoRooms = [
        { name: 'Lobby', users: ['Alice', 'Bob'], permanent: true },
        { name: 'Meeting Room', users: [], permanent: false },
        { name: 'Break Room', users: ['Charlie'], permanent: false }
      ]

      demoRooms.forEach(room => {
        mockRooms.current.set(room.name, {
          name: room.name,
          users: room.users,
          permanent: room.permanent
        })
      })
    }

    onHouseJoined({
      userId,
      isHousemaster,
      mode: mode.current,
      rooms: getRoomsList()
    })

    onRoomsUpdate(getRoomsList())
  }

  const joinRoom = (roomName) => {
    if (!currentUser.current) return

    // Leave current room
    if (currentUser.current.currentRoom) {
      const currentRoom = mockRooms.current.get(currentUser.current.currentRoom)
      if (currentRoom) {
        currentRoom.users = currentRoom.users.filter(u => u !== currentUser.current.name)
      }
    }

    // Create room if it doesn't exist
    if (!mockRooms.current.has(roomName)) {
      mockRooms.current.set(roomName, {
        name: roomName,
        users: [],
        permanent: false
      })
    }

    // Join new room
    const room = mockRooms.current.get(roomName)
    if (!room.users.includes(currentUser.current.name)) {
      room.users.push(currentUser.current.name)
    }
    currentUser.current.currentRoom = roomName

    onRoomJoined({
      roomName,
      userId: currentUser.current.id
    })

    onRoomsUpdate(getRoomsList())
  }

  const createRoom = (roomName, permanent = false) => {
    if (!mockRooms.current.has(roomName)) {
      mockRooms.current.set(roomName, {
        name: roomName,
        users: [],
        permanent: permanent && currentUser.current?.isHousemaster
      })

      onRoomsUpdate(getRoomsList())
    }
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
    joinRoom,
    createRoom,
    changeMode,
    sendChatMessage
  }
}
