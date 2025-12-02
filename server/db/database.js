import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Database file location
const DB_PATH = process.env.NODE_ENV === 'production'
  ? '/data/likes.db'  // Render persistent disk
  : join(__dirname, 'likes.db')  // Local development

// Initialize database
const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL') // Better performance for concurrent access

// Initialize schema
function initializeDatabase() {
  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8')
  db.exec(schema)
  console.log('Database initialized at:', DB_PATH)
}

// Like a game mode
export function addLike(gameModeId, userId) {
  try {
    const stmt = db.prepare(`
      INSERT INTO likes (game_mode_id, user_id)
      VALUES (?, ?)
    `)
    stmt.run(gameModeId, userId)
    return { success: true }
  } catch (error) {
    // Unique constraint violation means already liked
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return { success: false, error: 'Already liked' }
    }
    throw error
  }
}

// Unlike a game mode
export function removeLike(gameModeId, userId) {
  const stmt = db.prepare(`
    DELETE FROM likes
    WHERE game_mode_id = ? AND user_id = ?
  `)
  const result = stmt.run(gameModeId, userId)
  return { success: result.changes > 0 }
}

// Get like count for a game mode
export function getLikeCount(gameModeId) {
  const stmt = db.prepare(`
    SELECT COUNT(*) as count
    FROM likes
    WHERE game_mode_id = ?
  `)
  const result = stmt.get(gameModeId)
  return result.count
}

// Check if user has liked a game mode
export function hasUserLiked(gameModeId, userId) {
  const stmt = db.prepare(`
    SELECT 1
    FROM likes
    WHERE game_mode_id = ? AND user_id = ?
  `)
  const result = stmt.get(gameModeId, userId)
  return !!result
}

// Get all game modes with like counts and user's like status
export function getAllGameModes(userId = null) {
  const stmt = db.prepare(`
    SELECT
      game_mode_id,
      COUNT(*) as like_count
    FROM likes
    GROUP BY game_mode_id
    ORDER BY like_count DESC
  `)

  const modes = stmt.all()

  // If userId provided, check which ones user has liked
  if (userId) {
    return modes.map(mode => ({
      gameModeId: mode.game_mode_id,
      likeCount: mode.like_count,
      userLiked: hasUserLiked(mode.game_mode_id, userId)
    }))
  }

  return modes.map(mode => ({
    gameModeId: mode.game_mode_id,
    likeCount: mode.like_count,
    userLiked: false
  }))
}

// Get like details for a specific game mode
export function getGameModeDetails(gameModeId, userId = null) {
  const likeCount = getLikeCount(gameModeId)
  const userLiked = userId ? hasUserLiked(gameModeId, userId) : false

  return {
    gameModeId,
    likeCount,
    userLiked
  }
}

// Initialize database on module load
initializeDatabase()

// Graceful shutdown
process.on('exit', () => db.close())
process.on('SIGINT', () => {
  db.close()
  process.exit(0)
})
