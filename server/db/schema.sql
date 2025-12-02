-- Likes Table
-- Stores user likes for game modes with once-per-user constraint

CREATE TABLE IF NOT EXISTS likes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_mode_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(game_mode_id, user_id)
);

-- Index for fast counting by game mode
CREATE INDEX IF NOT EXISTS idx_game_mode ON likes(game_mode_id);

-- Index for user lookup (check if user liked specific mode)
CREATE INDEX IF NOT EXISTS idx_user_likes ON likes(user_id, game_mode_id);
