-- Create database schema for OI-Gambling

-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  points DECIMAL(10,2) DEFAULT 1000.00 CHECK (points >= 0),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rooms table
CREATE TABLE rooms (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  owner_id INTEGER REFERENCES users(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Room members table
CREATE TABLE room_members (
  id SERIAL PRIMARY KEY,
  room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id),
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(room_id, user_id)
);

-- Game rounds table
CREATE TABLE game_rounds (
  id SERIAL PRIMARY KEY,
  room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
  problem_id VARCHAR(50) NOT NULL,
  problem_name VARCHAR(255),
  problem_tags TEXT[],
  problem_rating INTEGER,
  problem_solved_count INTEGER,
  problem_total_attempts INTEGER,
  actual_pass_rate DECIMAL(5,2),
  game_mode VARCHAR(20) NOT NULL,
  penalty_coefficient DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'ongoing',
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  settled_at TIMESTAMP
);

-- Guesses table
CREATE TABLE guesses (
  id SERIAL PRIMARY KEY,
  round_id INTEGER REFERENCES game_rounds(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id),
  guess_tags TEXT[],
  guess_rating_min INTEGER,
  guess_rating_max INTEGER,
  guess_pass_rate_min DECIMAL(5,2),
  guess_pass_rate_max DECIMAL(5,2),
  is_correct BOOLEAN,
  points_change DECIMAL(10,2) DEFAULT 0,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(round_id, user_id)
);

-- Transactions table
CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  from_user_id INTEGER REFERENCES users(id),
  to_user_id INTEGER REFERENCES users(id),
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_rooms_owner ON rooms(owner_id);
CREATE INDEX idx_room_members_room ON room_members(room_id);
CREATE INDEX idx_room_members_user ON room_members(user_id);
CREATE INDEX idx_game_rounds_room ON game_rounds(room_id);
CREATE INDEX idx_guesses_round ON guesses(round_id);
CREATE INDEX idx_guesses_user ON guesses(user_id);
CREATE INDEX idx_transactions_from ON transactions(from_user_id);
CREATE INDEX idx_transactions_to ON transactions(to_user_id);
CREATE INDEX idx_users_points ON users(points DESC);
