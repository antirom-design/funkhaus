import { WebSocketServer } from 'ws'
import { createServer } from 'http'

const PORT = process.env.PORT || 3001

// Store houses and their rooms
const houses = new Map()

// Store WebSocket connections by room
const connections = new Map()

function getHouse(houseCode) {
  if (!houses.has(houseCode)) {
    houses.set(houseCode, {
      code: houseCode,
      rooms: new Map(),
      mode: 'announcement',
      housemaster: null
    })
  }
  return houses.get(houseCode)
}

function addRoom(houseCode, roomName, ws) {
  const house = getHouse(houseCode)

  // First room becomes housemaster
  const isHousemaster = house.rooms.size === 0
  if (isHousemaster) {
    house.housemaster = roomName
  }

  const room = {
    id: `${houseCode}-${roomName}-${Date.now()}`,
    name: roomName,
    houseCode,
    isHousemaster,
    ws
  }

  house.rooms.set(roomName, room)
  connections.set(ws, { houseCode, roomName })

  return { room, house, isHousemaster }
}

function removeRoom(ws) {
  const connection = connections.get(ws)
  if (!connection) return

  const { houseCode, roomName } = connection
  const house = houses.get(houseCode)

  if (house) {
    house.rooms.delete(roomName)

    // If housemaster left, assign new one
    if (house.housemaster === roomName && house.rooms.size > 0) {
      const newHousemaster = Array.from(house.rooms.values())[0]
      house.housemaster = newHousemaster.name
      newHousemaster.isHousemaster = true

      // Notify new housemaster
      sendToClient(newHousemaster.ws, {
        type: 'system',
        message: 'You are now the Housemaster!'
      })
    }

    // Clean up empty houses
    if (house.rooms.size === 0) {
      houses.delete(houseCode)
    } else {
      broadcastToHouse(houseCode, {
        type: 'rooms',
        data: getRoomsList(house)
      })
    }
  }

  connections.delete(ws)
}

function getRoomsList(house) {
  return Array.from(house.rooms.values()).map(room => ({
    id: room.id,
    name: room.name,
    isHousemaster: room.isHousemaster
  }))
}

function sendToClient(ws, message) {
  if (ws.readyState === 1) { // WebSocket.OPEN
    ws.send(JSON.stringify(message))
  }
}

function broadcastToHouse(houseCode, message, excludeWs = null) {
  const house = houses.get(houseCode)
  if (!house) return

  house.rooms.forEach(room => {
    if (room.ws !== excludeWs) {
      sendToClient(room.ws, message)
    }
  })
}

function sendToRoom(houseCode, targetRoom, message) {
  const house = houses.get(houseCode)
  if (!house) return

  const room = house.rooms.get(targetRoom)
  if (room) {
    sendToClient(room.ws, message)
  }
}

// Create HTTP server
const server = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('FunkHaus WebSocket Server')
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
    removeRoom(ws)
  })

  ws.on('error', (error) => {
    console.error('WebSocket error:', error)
  })
})

function handleMessage(ws, message) {
  const { type, data } = message

  switch (type) {
    case 'join': {
      const { houseCode, roomName } = data
      const { room, house, isHousemaster } = addRoom(houseCode, roomName, ws)

      // Send join confirmation
      sendToClient(ws, {
        type: 'joined',
        data: {
          isHousemaster,
          mode: house.mode,
          rooms: getRoomsList(house)
        }
      })

      // Broadcast updated room list
      broadcastToHouse(houseCode, {
        type: 'rooms',
        data: getRoomsList(house)
      })

      console.log(`${roomName} joined house ${houseCode}`)
      break
    }

    case 'changeMode': {
      const connection = connections.get(ws)
      if (!connection) return

      const house = houses.get(connection.houseCode)
      if (!house) return

      const room = house.rooms.get(connection.roomName)
      if (!room || !room.isHousemaster) {
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
      const chatMessage = {
        type: 'chat',
        data: {
          sender: connection.roomName,
          target: target,
          text: text,
          timestamp: Date.now()
        }
      }

      if (target === 'ALL') {
        broadcastToHouse(connection.houseCode, chatMessage)
      } else {
        // Send to specific room
        sendToRoom(connection.houseCode, target, chatMessage)
        // Also send to sender
        sendToClient(ws, chatMessage)
      }
      break
    }

    case 'startTalk': {
      const connection = connections.get(ws)
      if (!connection) return

      const { target } = data

      // Broadcast that this room is talking
      broadcastToHouse(connection.houseCode, {
        type: 'talkState',
        data: {
          talking: true,
          roomName: connection.roomName,
          target: target
        }
      })

      // Signal other rooms to initiate WebRTC connection
      if (target === 'ALL') {
        // Tell all rooms to connect
        broadcastToHouse(connection.houseCode, {
          type: 'signal',
          data: {
            from: connection.roomName,
            signal: { type: 'init' },
            target: 'ALL'
          }
        }, ws)
      } else {
        // Tell specific room to connect
        sendToRoom(connection.houseCode, target, {
          type: 'signal',
          data: {
            from: connection.roomName,
            signal: { type: 'init' },
            target: target
          }
        })
      }
      break
    }

    case 'stopTalk': {
      const connection = connections.get(ws)
      if (!connection) return

      broadcastToHouse(connection.houseCode, {
        type: 'talkState',
        data: {
          talking: false,
          roomName: connection.roomName
        }
      })
      break
    }

    case 'signal':
    case 'webrtc-signal': {
      // WebRTC signaling relay
      const connection = connections.get(ws)
      if (!connection) return

      const { to, signal, target } = data

      if (to === 'ALL' || target === 'ALL') {
        // Broadcast signal to all rooms except sender
        broadcastToHouse(connection.houseCode, {
          type: 'signal',
          data: {
            from: connection.roomName,
            signal,
            target: 'ALL'
          }
        }, ws)
      } else {
        // Send to specific room
        sendToRoom(connection.houseCode, to, {
          type: 'signal',
          data: {
            from: connection.roomName,
            signal,
            target: to
          }
        })
      }
      break
    }

    default:
      console.log('Unknown message type:', type)
  }
}

server.listen(PORT, () => {
  console.log(`FunkHaus server running on port ${PORT}`)
})
