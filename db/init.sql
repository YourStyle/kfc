-- ROSTIC'S Kitchen Database Initialization

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash VARCHAR(256) NOT NULL,
    username VARCHAR(80) NOT NULL,
    city VARCHAR(20) DEFAULT 'region',
    city_name VARCHAR(100),
    is_verified BOOLEAN DEFAULT FALSE,
    verification_code VARCHAR(6),
    verification_expires_at TIMESTAMP,
    total_score INTEGER DEFAULT 0,
    registration_source VARCHAR(20) DEFAULT 'game',
    quest_score INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP
);

-- Admin users table
CREATE TABLE IF NOT EXISTS admin_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(80) UNIQUE NOT NULL,
    password_hash VARCHAR(256) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    role VARCHAR(20) DEFAULT 'superadmin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Levels table
CREATE TABLE IF NOT EXISTS levels (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    "order" INTEGER DEFAULT 0,
    grid_width INTEGER DEFAULT 7,
    grid_height INTEGER DEFAULT 7,
    max_moves INTEGER DEFAULT 30,
    item_types TEXT DEFAULT '["drumstick", "wing", "burger", "fries", "bucket", "ice_cream", "donut", "cappuccino"]',
    targets JSONB DEFAULT '{}',
    obstacles JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User level progress table
CREATE TABLE IF NOT EXISTS user_level_progress (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    level_id INTEGER NOT NULL REFERENCES levels(id) ON DELETE CASCADE,
    best_score INTEGER DEFAULT 0,
    stars INTEGER DEFAULT 0 CHECK (stars >= 0 AND stars <= 3),
    completed_at TIMESTAMP,
    attempts_count INTEGER DEFAULT 0,
    UNIQUE(user_id, level_id)
);

-- Game sessions table
CREATE TABLE IF NOT EXISTS game_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    level_id INTEGER NOT NULL REFERENCES levels(id) ON DELETE CASCADE,
    score INTEGER DEFAULT 0,
    moves_used INTEGER DEFAULT 0,
    targets_met JSONB DEFAULT '{}',
    duration_seconds INTEGER DEFAULT 0,
    is_completed BOOLEAN DEFAULT FALSE,
    is_won BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User activities table (for analytics)
CREATE TABLE IF NOT EXISTS user_activities (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    metadata JSONB DEFAULT '{}',
    ip_address VARCHAR(45),
    user_agent VARCHAR(512),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_total_score ON users(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_levels_order ON levels("order");
CREATE INDEX IF NOT EXISTS idx_progress_user ON user_level_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_level ON user_level_progress(level_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON game_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_created ON game_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_activities_user ON user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_action ON user_activities(action);
CREATE INDEX IF NOT EXISTS idx_activities_created ON user_activities(created_at);

-- Insert default levels
INSERT INTO levels (name, "order", grid_width, grid_height, max_moves, item_types, targets, obstacles, is_active)
VALUES
    ('Tutorial', 1, 7, 7, 20,
     '["drumstick", "wing", "burger"]',
     '{"collect": {"drumstick": 5}, "min_score": 500}'::jsonb,
     '[]'::jsonb,
     TRUE),
    ('Easy Start', 2, 7, 7, 25,
     '["drumstick", "wing", "burger", "fries"]',
     '{"collect": {"drumstick": 10, "burger": 5}, "min_score": 1000}'::jsonb,
     '[]'::jsonb,
     TRUE),
    ('Combo Master', 3, 7, 7, 30,
     '["drumstick", "wing", "burger", "fries", "bucket"]',
     '{"collect": {"fries": 15}, "combos": {"4_match": 3}, "min_score": 2000}'::jsonb,
     '[]'::jsonb,
     TRUE),
    ('Big Order', 4, 7, 7, 35,
     '["drumstick", "wing", "burger", "fries", "bucket"]',
     '{"collect": {"drumstick": 20, "burger": 15, "fries": 10}, "min_score": 3000}'::jsonb,
     '[{"row": 3, "col": 3}]'::jsonb,
     TRUE),
    ('Rush Hour', 5, 7, 7, 25,
     '["drumstick", "wing", "burger", "fries", "bucket"]',
     '{"collect": {"drumstick": 25, "fries": 15}, "combos": {"5_match": 2}, "min_score": 5000}'::jsonb,
     '[{"row": 2, "col": 2}, {"row": 4, "col": 4}]'::jsonb,
     TRUE)
ON CONFLICT DO NOTHING;

-- Insert default admin user (password: admin123 - CHANGE IN PRODUCTION!)
-- Hash for 'admin123' using werkzeug.security.generate_password_hash
INSERT INTO admin_users (username, password_hash)
VALUES ('admin', 'scrypt:32768:8:1$WqJYhbLjN8QXKPZF$f8e7c6d5b4a3928170f1e2d3c4b5a69788796a5b4c3d2e1f0091827364554637')
ON CONFLICT (username) DO NOTHING;
