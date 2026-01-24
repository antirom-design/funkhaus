import { WebSocketServer } from 'ws'
import { createServer } from 'http'
import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import likesRouter from './routes/likes.js'

const PORT = process.env.PORT || 3001

// Initialize Express app
const app = express()

// CORS configuration - allow all vercel.app domains
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc)
    if (!origin) return callback(null, true);

    // Allow all vercel.app subdomains
    if (origin.endsWith('.vercel.app') || origin.endsWith('vercel.app')) {
      return callback(null, true);
    }

    // Allow specific domains
    const allowedOrigins = [
      'https://pattern-echo.vercel.app',
      'https://cogni-fidget.vercel.app',
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:8000'
    ];

    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}))

// Rate limiting (100 requests per 15 minutes per IP)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later'
})

// Middleware
app.use(express.json())
app.use('/api', limiter)

// API Routes
app.use('/api', likesRouter)

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'FunkHaus WebSocket & API Server',
    endpoints: {
      websocket: 'ws://<host>:<port>',
      api: '/api/likes, /api/games'
    }
  })
})

// Store houses and their rooms
const houses = new Map()

// Store connections by session ID
const connections = new Map()

// Store reverse lookup from WebSocket to session ID
const wsToSessionId = new Map()

// Store active polls per house
const activePolls = new Map()

// Store active circle sort games per house
const activeGames = new Map()

function getHouse(houseCode) {
  if (!houses.has(houseCode)) {
    houses.set(houseCode, {
      code: houseCode,
      rooms: new Map(),
      mode: 'free',
      housemaster: null
    })
  }
  return houses.get(houseCode)
}

function addRoom(houseCode, roomName, sessionId, ws) {
  const house = getHouse(houseCode)

  // Check for duplicate session ID
  if (connections.has(sessionId)) {
    console.error(`Duplicate session ID: ${sessionId}`)
    return null
  }

  // First room becomes housemaster
  const isHousemaster = house.rooms.size === 0
  if (isHousemaster) {
    house.housemaster = sessionId
  }

  const room = {
    id: sessionId,
    name: roomName,
    houseCode,
    isHousemaster,
    ws
  }

  house.rooms.set(sessionId, room)
  connections.set(sessionId, { ws, houseCode, roomName })
  wsToSessionId.set(ws, sessionId)

  return { room, house, isHousemaster }
}

function removeRoom(ws) {
  const sessionId = wsToSessionId.get(ws)
  if (!sessionId) return

  const connection = connections.get(sessionId)
  if (!connection) return

  const { houseCode, roomName } = connection
  const house = houses.get(houseCode)

  if (house) {
    house.rooms.delete(sessionId)

    // If housemaster left, assign new one
    if (house.housemaster === sessionId && house.rooms.size > 0) {
      const newHousemaster = Array.from(house.rooms.values())[0]
      house.housemaster = newHousemaster.id
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

  connections.delete(sessionId)
  wsToSessionId.delete(ws)
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

function sendToRoom(houseCode, targetSessionId, message) {
  const house = houses.get(houseCode)
  if (!house) return

  const room = house.rooms.get(targetSessionId)
  if (room) {
    sendToClient(room.ws, message)
  }
}

// Generate random grid for circle sort game
function generateCircleGrid(gridSize, colorCount = 3) {
  // Color palettes based on count
  const palettes = {
    2: ['#000000', '#ffffff'],           // Black & White
    3: ['#3b82f6', '#ef4444', '#10b981'], // Blue, Red, Green
    4: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b'], // Blue, Red, Green, Orange
    5: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'] // Blue, Red, Green, Orange, Purple
  }

  const colorPalette = palettes[colorCount] || palettes[3]
  const grid = []

  for (let y = 0; y < gridSize; y++) {
    const row = []
    for (let x = 0; x < gridSize; x++) {
      // Random color from palette
      const randomColor = colorPalette[Math.floor(Math.random() * colorPalette.length)]
      row.push(randomColor)
    }
    grid.push(row)
  }

  return { grid, colorPalette }
}

// Create HTTP server from Express app
const server = createServer(app)

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
      const { houseCode, roomName, sessionId } = data

      // Validation
      if (!sessionId || typeof sessionId !== 'string') {
        sendToClient(ws, {
          type: 'error',
          message: 'Invalid session ID'
        })
        return
      }

      const result = addRoom(houseCode, roomName, sessionId, ws)

      if (!result) {
        sendToClient(ws, {
          type: 'error',
          message: 'Session already connected'
        })
        return
      }

      const { room, house, isHousemaster } = result

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

      console.log(`${roomName} (${sessionId.substring(0, 8)}) joined house ${houseCode}`)
      break
    }

    case 'changeMode': {
      const { sessionId, mode: newMode } = data
      const connection = connections.get(sessionId)
      if (!connection) return

      const house = houses.get(connection.houseCode)
      if (!house) return

      const room = house.rooms.get(sessionId)
      if (!room || !room.isHousemaster) {
        sendToClient(connection.ws, {
          type: 'error',
          message: 'Only Housemaster can change mode'
        })
        return
      }

      house.mode = newMode
      broadcastToHouse(connection.houseCode, {
        type: 'modeChange',
        data: { mode: newMode }
      })

      console.log(`House ${connection.houseCode} mode changed to ${newMode}`)
      break
    }

    case 'chat': {
      const { sessionId, text, target } = data
      const connection = connections.get(sessionId)
      if (!connection) return

      const house = houses.get(connection.houseCode)
      if (!house) return

      const chatMessage = {
        type: 'chat',
        data: {
          sender: `${connection.roomName} [${sessionId.substring(0, 4)}]`,
          senderId: sessionId,
          target: target,
          text: text,
          timestamp: Date.now()
        }
      }

      if (target === 'ALL') {
        broadcastToHouse(connection.houseCode, chatMessage)
      } else {
        // Send to specific session
        sendToRoom(connection.houseCode, target, chatMessage)
        // Also send to sender
        sendToClient(connection.ws, chatMessage)
      }
      break
    }

    case 'typing': {
      const { sessionId, isTyping } = data
      const connection = connections.get(sessionId)
      if (!connection) return

      const house = houses.get(connection.houseCode)
      if (!house) return

      // Broadcast typing status to all other users in the house
      broadcastToHouse(connection.houseCode, {
        type: 'userTyping',
        data: {
          sessionId: sessionId,
          isTyping: isTyping
        }
      }, connection.ws)  // Exclude sender
      break
    }

    case 'startTalk': {
      const { sessionId, target } = data
      const connection = connections.get(sessionId)
      if (!connection) return

      const house = houses.get(connection.houseCode)
      if (!house) return

      // Broadcast that this session is talking
      broadcastToHouse(connection.houseCode, {
        type: 'talkState',
        data: {
          talking: true,
          sessionId: sessionId,
          roomName: connection.roomName,
          target: target
        }
      })

      // Send list of target sessions back to talker so they can create offers
      const targetSessions = target === 'ALL'
        ? Array.from(house.rooms.keys()).filter(sid => sid !== sessionId)
        : [target]

      sendToClient(connection.ws, {
        type: 'signal',
        data: {
          signal: { type: 'start-offers', targets: targetSessions },
          sessionId: sessionId
        }
      })
      break
    }

    case 'stopTalk': {
      const { sessionId } = data
      const connection = connections.get(sessionId)
      if (!connection) return

      broadcastToHouse(connection.houseCode, {
        type: 'talkState',
        data: {
          talking: false,
          sessionId: sessionId,
          roomName: connection.roomName
        }
      })
      break
    }

    case 'killAllAudio': {
      const { sessionId } = data
      const connection = connections.get(sessionId)
      if (!connection) return

      const house = houses.get(connection.houseCode)
      if (!house) return

      const room = house.rooms.get(sessionId)
      // Only housemaster can kill all audio
      if (!room || !room.isHousemaster) {
        sendToClient(connection.ws, {
          type: 'error',
          message: 'Only Housemaster can kill all audio'
        })
        return
      }

      // Force stop all talking in the house
      broadcastToHouse(connection.houseCode, {
        type: 'forceStopTalking',
        data: { reason: 'Admin killed all audio connections' }
      })

      console.log(`Housemaster ${connection.roomName} killed all audio in house ${connection.houseCode}`)
      break
    }

    case 'signal':
    case 'webrtc-signal': {
      // WebRTC signaling relay
      const { sessionId, to, signal, target } = data
      const connection = connections.get(sessionId)
      if (!connection) return

      if (to === 'ALL' || target === 'ALL') {
        // Broadcast signal to all sessions except sender
        broadcastToHouse(connection.houseCode, {
          type: 'signal',
          data: {
            from: sessionId,
            fromName: connection.roomName,
            signal,
            target: 'ALL'
          }
        }, connection.ws)
      } else {
        // Send to specific session
        sendToRoom(connection.houseCode, to, {
          type: 'signal',
          data: {
            from: sessionId,
            fromName: connection.roomName,
            signal,
            target: to
          }
        })
      }
      break
    }

    case 'startPoll': {
      const { sessionId, question, options, showRealtime = false, duration = 10, multipleChoice = false } = data
      const connection = connections.get(sessionId)
      if (!connection) return

      const house = houses.get(connection.houseCode)
      if (!house) return

      const room = house.rooms.get(sessionId)
      if (!room || !room.isHousemaster) {
        sendToClient(connection.ws, {
          type: 'error',
          message: 'Only Housemaster can start polls'
        })
        return
      }

      // Check if poll already active
      if (activePolls.has(connection.houseCode)) {
        sendToClient(connection.ws, {
          type: 'error',
          message: 'A poll is already running'
        })
        return
      }

      // Create poll with optional duration
      const hasTimeLimit = duration !== null && duration !== undefined
      const durationMs = hasTimeLimit ? Math.max(5, Math.min(120, duration)) * 1000 : null
      const poll = {
        question,
        options: options.map(opt => ({ text: opt, votes: [] })),
        showRealtime,
        multipleChoice,
        startedAt: Date.now(),
        endAt: hasTimeLimit ? Date.now() + durationMs : null
      }

      activePolls.set(connection.houseCode, poll)

      // Broadcast poll to house
      broadcastToHouse(connection.houseCode, {
        type: 'pollStarted',
        data: {
          question,
          options,
          showRealtime,
          multipleChoice,
          duration: hasTimeLimit ? duration : null,
          endAt: poll.endAt
        }
      })

      // Auto-end after duration (if time limit is set)
      if (hasTimeLimit) {
        setTimeout(() => {
          const activePoll = activePolls.get(connection.houseCode)
          if (activePoll) {
            broadcastToHouse(connection.houseCode, {
              type: 'pollEnded',
              data: {
                question: activePoll.question,
                results: activePoll.options
              }
            })
            activePolls.delete(connection.houseCode)
          }
        }, durationMs)
      }

      console.log(`Poll started in house ${connection.houseCode}: ${question} (${duration}s, realtime: ${showRealtime})`)
      break
    }

    case 'vote': {
      const { sessionId, optionIndex } = data
      const connection = connections.get(sessionId)
      if (!connection) return

      const poll = activePolls.get(connection.houseCode)
      if (!poll) {
        sendToClient(connection.ws, {
          type: 'error',
          message: 'No active poll'
        })
        return
      }

      if (optionIndex < 0 || optionIndex >= poll.options.length) {
        sendToClient(connection.ws, {
          type: 'error',
          message: 'Invalid option'
        })
        return
      }

      if (poll.multipleChoice) {
        // Multiple choice: Toggle the vote
        const currentOption = poll.options[optionIndex]
        const hasVoted = currentOption.votes.includes(sessionId)

        if (hasVoted) {
          // Remove vote
          currentOption.votes = currentOption.votes.filter(v => v !== sessionId)
        } else {
          // Add vote
          currentOption.votes.push(sessionId)
        }
      } else {
        // Single choice: Remove previous vote and add new vote
        poll.options.forEach(opt => {
          opt.votes = opt.votes.filter(v => v !== sessionId)
        })
        poll.options[optionIndex].votes.push(sessionId)
      }

      // Only broadcast updated results if showRealtime is enabled
      if (poll.showRealtime) {
        broadcastToHouse(connection.houseCode, {
          type: 'pollUpdate',
          data: {
            options: poll.options
          }
        })
      }
      break
    }

    case 'endPoll': {
      const { sessionId } = data
      const connection = connections.get(sessionId)
      if (!connection) return

      const house = houses.get(connection.houseCode)
      if (!house) return

      const room = house.rooms.get(sessionId)
      // Only housemaster can end poll
      if (!room || !room.isHousemaster) {
        sendToClient(connection.ws, {
          type: 'error',
          message: 'Only Housemaster can end polls'
        })
        return
      }

      const activePoll = activePolls.get(connection.houseCode)
      if (!activePoll) {
        sendToClient(connection.ws, {
          type: 'error',
          message: 'No active poll'
        })
        return
      }

      // Broadcast poll ended with results
      broadcastToHouse(connection.houseCode, {
        type: 'pollEnded',
        data: {
          question: activePoll.question,
          results: activePoll.options
        }
      })

      activePolls.delete(connection.houseCode)
      console.log(`Poll ended by housemaster in house ${connection.houseCode}`)
      break
    }

    case 'cancelPoll': {
      const { sessionId } = data
      const connection = connections.get(sessionId)
      if (!connection) return

      const house = houses.get(connection.houseCode)
      if (!house) return

      const room = house.rooms.get(sessionId)
      // Only housemaster can cancel poll
      if (!room || !room.isHousemaster) {
        sendToClient(connection.ws, {
          type: 'error',
          message: 'Only Housemaster can cancel polls'
        })
        return
      }

      const activePoll = activePolls.get(connection.houseCode)
      if (!activePoll) {
        sendToClient(connection.ws, {
          type: 'error',
          message: 'No active poll'
        })
        return
      }

      // Broadcast poll canceled
      broadcastToHouse(connection.houseCode, {
        type: 'pollCanceled',
        data: {}
      })

      activePolls.delete(connection.houseCode)
      console.log(`Poll canceled by housemaster in house ${connection.houseCode}`)
      break
    }

    case 'startCircleSort': {
      const { sessionId, gridSize = 4, timeLimit = 120, rounds = 1, colorCount = 3 } = data
      const connection = connections.get(sessionId)
      if (!connection) return

      const house = houses.get(connection.houseCode)
      if (!house) return

      const room = house.rooms.get(sessionId)
      if (!room || !room.isHousemaster) {
        sendToClient(connection.ws, {
          type: 'error',
          message: 'Only Housemaster can start games'
        })
        return
      }

      // Check if game already active
      if (activeGames.has(connection.houseCode)) {
        sendToClient(connection.ws, {
          type: 'error',
          message: 'A game is already running'
        })
        return
      }

      // Generate random grid (same for all players)
      const { grid, colorPalette } = generateCircleGrid(gridSize, colorCount)
      const startTime = Date.now()
      const endTime = startTime + (timeLimit * 1000)

      // Create game state
      const game = {
        gridSize,
        timeLimit,
        colorPalette,
        colorCount,
        totalRounds: rounds,
        currentRound: 1,
        initialGrid: grid,
        startTime,
        endTime,
        roundResults: [],
        playerTotalScores: new Map() // Track cumulative scores across rounds
      }

      activeGames.set(connection.houseCode, game)

      // Broadcast game start to all players
      broadcastToHouse(connection.houseCode, {
        type: 'circleSortStarted',
        data: {
          gridSize,
          timeLimit,
          colorPalette,
          initialGrid: grid,
          startTime,
          currentRound: 1,
          totalRounds: rounds
        }
      })

      // Auto-end round after time limit
      setTimeout(() => {
        const activeGame = activeGames.get(connection.houseCode)
        if (activeGame && activeGame.currentRound === 1) {
          endCircleSortRound(connection.houseCode, activeGame)
        }
      }, timeLimit * 1000)

      console.log(`Circle Sort game started in house ${connection.houseCode}: ${gridSize}x${gridSize}, ${timeLimit}s, ${rounds} rounds, ${colorCount} colors`)
      break
    }

    case 'submitCircleSort': {
      const { sessionId, completionTime, clicks, score, completed } = data
      const connection = connections.get(sessionId)
      if (!connection) return

      const game = activeGames.get(connection.houseCode)
      if (!game) {
        sendToClient(connection.ws, {
          type: 'error',
          message: 'No active game'
        })
        return
      }

      const house = houses.get(connection.houseCode)
      const room = house.rooms.get(sessionId)

      // Check if user already submitted for this round
      const alreadySubmitted = game.roundResults.some(r => r.userId === sessionId)
      if (alreadySubmitted) {
        console.log(`User ${sessionId} already submitted result for round ${game.currentRound}`)
        return
      }

      // Add result for this round
      game.roundResults.push({
        userId: sessionId,
        userName: room.name,
        completionTime,
        clicks,
        score,
        completed
      })

      // Update player's total score
      const currentTotal = game.playerTotalScores.get(sessionId) || 0
      game.playerTotalScores.set(sessionId, currentTotal + score)

      console.log(`Result submitted by ${room.name}: ${completionTime}s, ${clicks} clicks, ${score} pts (Round ${game.currentRound}/${game.totalRounds}, ${game.roundResults.length}/${house.rooms.size})`)

      // Check if all players have submitted for this round
      if (game.roundResults.length >= house.rooms.size) {
        endCircleSortRound(connection.houseCode, game)
      }
      break
    }

    case 'drawPoints': {
      const { sessionId, points } = data
      const connection = connections.get(sessionId)
      if (!connection) return

      const house = houses.get(connection.houseCode)
      if (!house) return

      // Add server timestamp for synchronization
      const serverTimestamp = Date.now()

      // Broadcast to all other users in the house
      broadcastToHouse(connection.houseCode, {
        type: 'remoteDrawPoints',
        data: {
          sessionId,
          userName: connection.roomName,
          points,
          serverTimestamp
        }
      }, connection.ws)
      break
    }

    case 'strokeStart': {
      const { sessionId, strokeId } = data
      const connection = connections.get(sessionId)
      if (!connection) return

      const serverTimestamp = Date.now()

      broadcastToHouse(connection.houseCode, {
        type: 'remoteStrokeStart',
        data: { sessionId, userName: connection.roomName, strokeId, serverTimestamp }
      }, connection.ws)
      break
    }

    case 'strokeEnd': {
      const { sessionId, strokeId } = data
      const connection = connections.get(sessionId)
      if (!connection) return

      broadcastToHouse(connection.houseCode, {
        type: 'remoteStrokeEnd',
        data: { sessionId, userName: connection.roomName, strokeId }
      }, connection.ws)
      break
    }

    case 'cursorMove': {
      const { sessionId, x, y } = data
      const connection = connections.get(sessionId)
      if (!connection) return

      const serverTimestamp = Date.now()

      broadcastToHouse(connection.houseCode, {
        type: 'remoteCursor',
        data: { sessionId, userName: connection.roomName, x, y, serverTimestamp }
      }, connection.ws)
      break
    }

    case 'settingsUpdate': {
      const { sessionId, settings } = data
      const connection = connections.get(sessionId)
      if (!connection) return

      broadcastToHouse(connection.houseCode, {
        type: 'remoteSettings',
        data: { sessionId, userName: connection.roomName, settings }
      }, connection.ws)
      break
    }

    case 'modeChange': {
      const { sessionId, mode } = data
      const connection = connections.get(sessionId)
      if (!connection) return

      const house = houses.get(connection.houseCode)
      if (!house) return

      // Store mode on house
      house.mode = mode

      // Broadcast to ALL users in the house (including sender for confirmation)
      broadcastToHouse(connection.houseCode, {
        type: 'modeChange',
        data: { mode, sessionId }
      })

      console.log(`Mode changed to ${mode} in house ${connection.houseCode} by ${connection.roomName}`)
      break
    }

    case 'tafelStroke': {
      const { sessionId, stroke } = data
      const connection = connections.get(sessionId)
      if (!connection) return

      // Broadcast stroke to all other users
      broadcastToHouse(connection.houseCode, {
        type: 'tafelStroke',
        data: { sessionId, userName: connection.roomName, stroke }
      }, connection.ws)
      break
    }

    case 'tafelErase': {
      const { sessionId, strokeIds } = data
      const connection = connections.get(sessionId)
      if (!connection) return

      // Broadcast erase to all other users
      broadcastToHouse(connection.houseCode, {
        type: 'tafelErase',
        data: { sessionId, strokeIds }
      }, connection.ws)
      break
    }

    case 'tafelClear': {
      const { sessionId } = data
      const connection = connections.get(sessionId)
      if (!connection) return

      // Broadcast clear to all other users
      broadcastToHouse(connection.houseCode, {
        type: 'tafelClear',
        data: { sessionId }
      }, connection.ws)

      console.log(`Tafel cleared in house ${connection.houseCode} by ${connection.roomName}`)
      break
    }

    case 'tafelClearMine': {
      const { sessionId } = data
      const connection = connections.get(sessionId)
      if (!connection) return

      // Broadcast to all other users that this user cleared their drawings
      broadcastToHouse(connection.houseCode, {
        type: 'tafelClearMine',
        data: { sessionId }
      }, connection.ws)

      console.log(`${connection.roomName} cleared their drawings in house ${connection.houseCode}`)
      break
    }

    case 'userColorChange': {
      const { sessionId, color } = data
      const connection = connections.get(sessionId)
      if (!connection) return

      // Broadcast color change to all other users
      broadcastToHouse(connection.houseCode, {
        type: 'userColorChange',
        data: { sessionId, userName: connection.roomName, color }
      }, connection.ws)
      break
    }

    default:
      console.log('Unknown message type:', type)
  }
}

// Helper function to end a circle sort round
function endCircleSortRound(houseCode, game) {
  // Sort round results by score (descending)
  const sortedRoundResults = game.roundResults.sort((a, b) => b.score - a.score)

  // Broadcast round ended with leaderboard
  broadcastToHouse(houseCode, {
    type: 'circleSortEnded',
    data: {
      results: sortedRoundResults,
      gridSize: game.gridSize,
      timeLimit: game.timeLimit,
      round: game.currentRound,
      totalRounds: game.totalRounds
    }
  })

  console.log(`Round ${game.currentRound}/${game.totalRounds} ended in house ${houseCode}. Winner: ${sortedRoundResults[0]?.userName || 'none'}`)

  // Check if this was the last round
  if (game.currentRound >= game.totalRounds) {
    // Game is complete - show final leaderboard after a short delay
    setTimeout(() => {
      endCircleSortGame(houseCode, game)
    }, 3000)
  } else {
    // Start next round after a short delay
    setTimeout(() => {
      startNextRound(houseCode, game)
    }, 3000)
  }
}

// Helper function to start the next round
function startNextRound(houseCode, game) {
  if (!activeGames.has(houseCode)) return // Game was cancelled

  // Increment round
  game.currentRound++

  // Generate new grid
  const { grid, colorPalette } = generateCircleGrid(game.gridSize, game.colorCount)
  const startTime = Date.now()
  const endTime = startTime + (game.timeLimit * 1000)

  // Reset round data
  game.initialGrid = grid
  game.startTime = startTime
  game.endTime = endTime
  game.roundResults = []

  // Broadcast next round start
  broadcastToHouse(houseCode, {
    type: 'circleSortStarted',
    data: {
      gridSize: game.gridSize,
      timeLimit: game.timeLimit,
      colorPalette,
      initialGrid: grid,
      startTime,
      currentRound: game.currentRound,
      totalRounds: game.totalRounds
    }
  })

  // Auto-end round after time limit
  setTimeout(() => {
    const activeGame = activeGames.get(houseCode)
    if (activeGame && activeGame.currentRound === game.currentRound) {
      endCircleSortRound(houseCode, activeGame)
    }
  }, game.timeLimit * 1000)

  console.log(`Round ${game.currentRound}/${game.totalRounds} started in house ${houseCode}`)
}

// Helper function to end the entire circle sort game
function endCircleSortGame(houseCode, game) {
  // Create final leaderboard from cumulative scores
  const house = houses.get(houseCode)
  if (!house) return

  const finalResults = []
  game.playerTotalScores.forEach((totalScore, userId) => {
    const room = house.rooms.get(userId)
    if (room) {
      finalResults.push({
        userId,
        userName: room.name,
        score: totalScore
      })
    }
  })

  // Sort by total score
  const sortedResults = finalResults.sort((a, b) => b.score - a.score)

  // Broadcast final game ended
  broadcastToHouse(houseCode, {
    type: 'circleSortGameEnded',
    data: {
      results: sortedResults,
      totalRounds: game.totalRounds
    }
  })

  activeGames.delete(houseCode)
  console.log(`Circle Sort game complete in house ${houseCode}. Winner: ${sortedResults[0]?.userName || 'none'} (${sortedResults[0]?.score || 0} pts)`)
}

server.listen(PORT, () => {
  console.log(`FunkHaus server running on port ${PORT}`)
})
