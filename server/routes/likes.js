import { Router } from 'express'
import * as db from '../db/database.js'

const router = Router()

// POST /api/likes - Add a like
router.post('/likes', (req, res) => {
  try {
    const { gameModeId, userId } = req.body

    if (!gameModeId || !userId) {
      return res.status(400).json({
        success: false,
        error: 'gameModeId and userId are required'
      })
    }

    const result = db.addLike(gameModeId, userId)

    if (!result.success) {
      return res.status(409).json({
        success: false,
        error: result.error
      })
    }

    const likeCount = db.getLikeCount(gameModeId)

    res.json({
      success: true,
      likeCount,
      userLiked: true
    })
  } catch (error) {
    console.error('Error adding like:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
})

// DELETE /api/likes/:gameModeId - Remove a like
router.delete('/likes/:gameModeId', (req, res) => {
  try {
    const { gameModeId } = req.params
    const { userId } = req.body

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      })
    }

    const result = db.removeLike(gameModeId, userId)

    if (!result.success) {
      return res.status(404).json({
        success: false,
        error: 'Like not found'
      })
    }

    const likeCount = db.getLikeCount(gameModeId)

    res.json({
      success: true,
      likeCount,
      userLiked: false
    })
  } catch (error) {
    console.error('Error removing like:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
})

// GET /api/likes/:gameModeId - Get like count and user status
router.get('/likes/:gameModeId', (req, res) => {
  try {
    const { gameModeId } = req.params
    const { userId } = req.query

    const details = db.getGameModeDetails(gameModeId, userId)

    res.json(details)
  } catch (error) {
    console.error('Error getting like details:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
})

// GET /api/games - Get all game modes with like counts
router.get('/games', (req, res) => {
  try {
    const { userId } = req.query

    const games = db.getAllGameModes(userId)

    res.json({
      games
    })
  } catch (error) {
    console.error('Error getting games:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
})

export default router
