import { WebSocketServer } from 'ws'
import { createServer } from 'http'

const PORT = process.env.PORT || 3001

// Store houses with rooms and users
const houses = new Map()

// Store WebSocket connections
const connections = new Map()

function getHouse(houseCode) {
  if (!houses.has(houseCode)) {
    houses.set(houseCode, {
      code: houseCode,
      rooms: new Map(),
      users: new Map(),
      mode: 'announcement',
      housemaster: null
    })
  }
  return houses.get(houseCode)
}

function getRoomsList(house) {
  const rooms = []
  house.rooms.forEach((room, roomName) => {
    rooms.push({
      name: roomName,
      occupancy: room.users.size,
      users: Array.from(room.users),
      permanent: room.permanent || false
    })
  })
  return rooms
}

function getUsersList(house) {
  const users = []
  house.users.forEach((user, userId) => {
    users.push({
      id: userId,
      name: user.name,
      currentRoom: user.currentRoom,
      isHousemaster: user.isHousemaster
    })
  })
  return users
}

function joinHouse(houseCode, userName, ws) {
  const house = getHouse(houseCode)
  const userId = `${userName}-${Date.now()}`

  // First user becomes housemaster
  const isHousemaster = house.users.size === 0
  if (isHousemaster) {
    house.housemaster = userId
  }

  // Add user to house
  house.users.set(userId, {
    id: userId,
    name: userName,
    currentRoom: null,
    ws,
    isHousemaster
  })

  connections.set(ws, { houseCode, userId })

  return { userId, isHousemaster, house }
}

function joinRoom(houseCode, userId, roomName) {
  const house = houses.get(houseCode)
  if (!house) return null

  const user = house.users.get(userId)
  if (!user) return null

  // Leave current room if in one
  if (user.currentRoom) {
    const currentRoom = house.rooms.get(user.currentRoom)
    if (currentRoom) {
      currentRoom.users.delete(userId)
      // Delete empty non-permanent rooms
      if (currentRoom.users.size === 0 && !currentRoom.permanent) {
        house.rooms.delete(user.currentRoom)
      }
    }
  }

  // Create room if it doesn't exist
  if (!house.rooms.has(roomName)) {
    house.rooms.set(roomName, {
      name: roomName,
      users: new Set(),
      permanent: false
    })
  }

  // Join new room
  const room = house.rooms.get(roomName)
  room.users.add(userId)
  user.currentRoom = roomName

  return { room, user }
}

function leaveHouse(ws) {
  const connection = connections.get(ws)
  if (!connection) return

  const { houseCode, userId } = connection
  const house = houses.get(houseCode)

  if (house) {
    const user = house.users.get(userId)

    // Remove from current room
    if (user && user.currentRoom) {
      const room = house.rooms.get(user.currentRoom)
      if (room) {
        room.users.delete(userId)
        if (room.users.size === 0 && !room.permanent) {
          house.rooms.delete(user.currentRoom)
        }
      }
    }

    // Remove user
    house.users.delete(userId)

    // Reassign housemaster if needed
    if (house.housemaster === userId && house.users.size > 0) {
      const newHousemaster = Array.from(house.users.values())[0]
      house.housemaster = newHousemaster.id
      newHousemaster.isHousemaster = true

      sendToClient(newHousemaster.ws, {
        type: 'housemaster',
        data: { isHousemaster: true }
      })
    }

    // Clean up empty houses
    if (house.users.size === 0) {
      houses.delete(houseCode)
    } else {
      broadcastToHouse(houseCode, {
        type: 'roomsUpdate',
        data: getRoomsList(house)
      })
    }
  }

  connections.delete(ws)
}

function sendToClient(ws, message) {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify(message))
  }
}

function broadcastToHouse(houseCode, message, excludeWs = null) {
  const house = houses.get(houseCode)
  if (!house) return

  house.users.forEach(user => {
    if (user.ws !== excludeWs) {
      sendToClient(user.ws, message)
    }
  })
}

function broadcastToRoom(houseCode, roomName, message, excludeWs = null) {
  const house = houses.get(houseCode)
  if (!house) return

  const room = house.rooms.get(roomName)
  if (!room) return

  room.users.forEach(userId => {
    const user = house.users.get(userId)
    if (user && user.ws !== excludeWs) {
      sendToClient(user.ws, message)
    }
  })
}

function sendToUser(houseCode, targetUserId, message) {
  const house = houses.get(houseCode)
  if (!house) return

  const user = house.users.get(targetUserId)
  if (user) {
    sendToClient(user.ws, message)
  }
}

// Create HTTP server
const server = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('FunkHaus WebSocket Server v1.1')
})

// Create WebSocket server
const wss = new WebSocketServer({ server })

wss.on('connection', (ws) => {
  console.log('New WebSocket connection')

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString())
      handleMessage(ws, message)
    } catch (error) {
      console.error('Error parsing message:', error)
    }
  })

  ws.on('close', () => {
    console.log('WebSocket disconnected')
    leaveHouse(ws)
  })

  ws.on('error', (error) => {
    console.error('WebSocket error:', error)
  })
})

function handleMessage(ws, message) {
  const { type, data } = message

  switch (type) {
    case 'joinHouse': {
      const { houseCode, userName } = data
      const { userId, isHousemaster, house } = joinHouse(houseCode, userName, ws)

      // Send join confirmation
      sendToClient(ws, {
        type: 'houseJoined',
        data: {
          userId,
          isHousemaster,
          mode: house.mode,
          rooms: getRoomsList(house)
        }
      })

      console.log(`${userName} joined house ${houseCode}`)
      break
    }

    case 'joinRoom': {
      const connection = connections.get(ws)
      if (!connection) return

      const { roomName } = data
      const result = joinRoom(connection.houseCode, connection.userId, roomName)

      if (result) {
        const house = houses.get(connection.houseCode)

        // Confirm room join
        sendToClient(ws, {
          type: 'roomJoined',
          data: {
            roomName,
            userId: connection.userId
          }
        })

        // Broadcast updated room list
        broadcastToHouse(connection.houseCode, {
          type: 'roomsUpdate',
          data: getRoomsList(house)
        })

        console.log(`User ${connection.userId} joined room ${roomName}`)
      }
      break
    }

    case 'createRoom': {
      const connection = connections.get(ws)
      if (!connection) return

      const { roomName, permanent } = data
      const house = houses.get(connection.houseCode)
      if (!house) return

      // Only housemaster can create permanent rooms
      const user = house.users.get(connection.userId)
      const canCreatePermanent = user && user.isHousemaster

      if (!house.rooms.has(roomName)) {
        house.rooms.set(roomName, {
          name: roomName,
          users: new Set(),
          permanent: permanent && canCreatePermanent
        })

        // Broadcast updated room list
        broadcastToHouse(connection.houseCode, {
          type: 'roomsUpdate',
          data: getRoomsList(house)
        })

        console.log(`Room ${roomName} created in house ${connection.houseCode}`)
      }
      break
    }

    case 'changeMode': {
      const connection = connections.get(ws)
      if (!connection) return

      const house = houses.get(connection.houseCode)
      if (!house) return

      const user = house.users.get(connection.userId)
      if (!user || !user.isHousemaster) {
        sendToClient(ws, {
          type: 'error',
          message: 'Only Housemaster can change mode'
        })
        return
      }

      house.mode = data.mode
      broadcastToHouse(connection.houseCode, {
        type: 'modeChange',
        data: { mode: data.mode }
      })

      console.log(`House ${connection.houseCode} mode changed to ${data.mode}`)
      break
    }

    case 'chat': {
      const connection = connections.get(ws)
      if (!connection) return

      const { text, target } = data
      const house = houses.get(connection.houseCode)
      const user = house.users.get(connection.userId)

      const chatMessage = {
        type: 'chat',
        data: {
          sender: user.name,
          senderId: connection.userId,
          target: target,
          text: text,
          timestamp: Date.now()
        }
      }

      if (target === 'ALL') {
        broadcastToHouse(connection.houseCode, chatMessage)
      } else if (target.startsWith('room:')) {
        const roomName = target.substring(5)
        broadcastToRoom(connection.houseCode, roomName, chatMessage)
      } else {
        // Direct message to user
        sendToUser(connection.houseCode, target, chatMessage)
        sendToClient(ws, chatMessage)
      }
      break
    }

    case 'startTalk': {
      const connection = connections.get(ws)
      if (!connection) return

      const { target } = data
      const house = houses.get(connection.houseCode)
      const user = house.users.get(connection.userId)

      // Broadcast that this user is talking
      broadcastToHouse(connection.houseCode, {
        type: 'talkState',
        data: {
          talking: true,
          userId: connection.userId,
          userName: user.name,
          target: target
        }
      })

      // Send list of target users for WebRTC connections
      let targetUsers = []
      if (target === 'ALL') {
        targetUsers = Array.from(house.users.keys()).filter(id => id !== connection.userId)
      } else if (target.startsWith('room:')) {
        const roomName = target.substring(5)
        const room = house.rooms.get(roomName)
        if (room) {
          targetUsers = Array.from(room.users).filter(id => id !== connection.userId)
        }
      }

      sendToClient(ws, {
        type: 'signal',
        data: {
          signal: { type: 'start-offers', targets: targetUsers },
          target: connection.userId
        }
      })
      break
    }

    case 'stopTalk': {
      const connection = connections.get(ws)
      if (!connection) return

      const house = houses.get(connection.houseCode)
      const user = house.users.get(connection.userId)

      broadcastToHouse(connection.houseCode, {
        type: 'talkState',
        data: {
          talking: false,
          userId: connection.userId,
          userName: user.name
        }
      })
      break
    }

    case 'killAllAudio': {
      const connection = connections.get(ws)
      if (!connection) return

      const house = houses.get(connection.houseCode)
      if (!house) return

      const user = house.users.get(connection.userId)
      if (!user || !user.isHousemaster) {
        sendToClient(ws, {
          type: 'error',
          message: 'Only Housemaster can kill all audio'
        })
        return
      }

      broadcastToHouse(connection.houseCode, {
        type: 'forceStopTalking',
        data: { reason: 'Admin killed all audio connections' }
      })

      console.log(`Housemaster killed all audio in house ${connection.houseCode}`)
      break
    }

    case 'signal':
    case 'webrtc-signal': {
      const connection = connections.get(ws)
      if (!connection) return

      const { to, signal, target } = data
      const house = houses.get(connection.houseCode)
      const user = house.users.get(connection.userId)

      if (to === 'ALL' || target === 'ALL') {
        // Broadcast to all users except sender
        house.users.forEach((targetUser, targetId) => {
          if (targetId !== connection.userId) {
            sendToClient(targetUser.ws, {
              type: 'signal',
              data: {
                from: connection.userId,
                fromName: user.name,
                signal,
                target: targetId
              }
            })
          }
        })
      } else {
        // Send to specific user
        const targetUser = house.users.get(to)
        if (targetUser) {
          sendToClient(targetUser.ws, {
            type: 'signal',
            data: {
              from: connection.userId,
              fromName: user.name,
              signal,
              target: to
            }
          })
        }
      }
      break
    }

    default:
      console.log('Unknown message type:', type)
  }
}

server.listen(PORT, () => {
  console.log(`FunkHaus server v1.1 running on port ${PORT}`)
})
