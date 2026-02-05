-- Create database schema for OI-Gambling (SQLite)

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  points REAL DEFAULT 1000.00 CHECK (points >= 0),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Rooms table
CREATE TABLE IF NOT EXISTS rooms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(100) NOT NULL,
  owner_id INTEGER REFERENCES users(id),
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Room members table
CREATE TABLE IF NOT EXISTS room_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id),
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(room_id, user_id)
);

-- Game rounds table
CREATE TABLE IF NOT EXISTS game_rounds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
  problem_id VARCHAR(50) NOT NULL,
  problem_name VARCHAR(255),
  problem_tags TEXT,
  problem_rating INTEGER,
  problem_solved_count INTEGER,
  problem_total_attempts INTEGER,
  actual_pass_rate REAL,
  game_mode VARCHAR(20) NOT NULL,
  penalty_coefficient REAL NOT NULL,
  status VARCHAR(20) DEFAULT 'ongoing',
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  settled_at DATETIME
);

-- Guesses table
CREATE TABLE IF NOT EXISTS guesses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  round_id INTEGER REFERENCES game_rounds(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id),
  guess_tags TEXT,
  guess_rating_min INTEGER,
  guess_rating_max INTEGER,
  guess_pass_rate_min REAL,
  guess_pass_rate_max REAL,
  is_correct BOOLEAN,
  points_change REAL DEFAULT 0,
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(round_id, user_id)
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_user_id INTEGER REFERENCES users(id),
  to_user_id INTEGER REFERENCES users(id),
  amount REAL NOT NULL CHECK (amount > 0),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_rooms_owner ON rooms(owner_id);
CREATE INDEX IF NOT EXISTS idx_room_members_room ON room_members(room_id);
CREATE INDEX IF NOT EXISTS idx_room_members_user ON room_members(user_id);
CREATE INDEX IF NOT EXISTS idx_game_rounds_room ON game_rounds(room_id);
CREATE INDEX IF NOT EXISTS idx_guesses_round ON guesses(round_id);
CREATE INDEX IF NOT EXISTS idx_guesses_user ON guesses(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_from ON transactions(from_user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_to ON transactions(to_user_id);
CREATE INDEX IF NOT EXISTS idx_users_points ON users(points DESC);
