# ROSTIC'S Kitchen - Architecture

## Overview

Match-3 игра с системой уровней, регистрацией пользователей, лидербордом и админкой.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Browser / Telegram WebApp                    │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Nginx (Proxy)                           │
│                    Port 80/443 (Production)                     │
├─────────────────────────────┬───────────────────────────────────┤
│     /api/*       /admin/*   │              /*                   │
│         │            │      │               │                   │
│         ▼            ▼      │               ▼                   │
│ ┌─────────────┐ ┌────────┐  │      ┌─────────────────┐         │
│ │Flask Backend│ │ Admin  │  │      │ React Frontend  │         │
│ │  Port 5000  │ │  5001  │  │      │    Port 3000    │         │
│ └──────┬──────┘ └───┬────┘  │      └─────────────────┘         │
│        │            │       │                                   │
│        ▼            ▼       │                                   │
│   ┌─────────────────────┐   │                                   │
│   │     PostgreSQL      │   │                                   │
│   │     Port 5432       │   │                                   │
│   └─────────────────────┘   │                                   │
│   ┌─────────────────────┐   │                                   │
│   │       Redis         │   │                                   │
│   │     Port 6379       │   │                                   │
│   └─────────────────────┘   │                                   │
└─────────────────────────────┴───────────────────────────────────┘
```

## Domain Model

### Core Entities

```
┌──────────────────┐       ┌──────────────────┐
│       User       │       │      Level       │
├──────────────────┤       ├──────────────────┤
│ id               │       │ id               │
│ email            │       │ name             │
│ password_hash    │       │ order            │
│ is_verified      │       │ grid_width       │
│ verification_code│       │ grid_height      │
│ total_score      │       │ max_moves        │
│ created_at       │       │ item_types[]     │
│ last_login_at    │       │ targets (JSON)   │
└────────┬─────────┘       │ is_active        │
         │                 │ created_at       │
         │                 └────────┬─────────┘
         │                          │
         ▼                          ▼
┌──────────────────────────────────────────────┐
│               UserLevelProgress              │
├──────────────────────────────────────────────┤
│ id                                           │
│ user_id (FK)                                 │
│ level_id (FK)                                │
│ best_score                                   │
│ stars (1-3)                                  │
│ completed_at                                 │
│ attempts_count                               │
└──────────────────────────────────────────────┘

┌──────────────────┐       ┌──────────────────┐
│  UserActivity    │       │   GameSession    │
├──────────────────┤       ├──────────────────┤
│ id               │       │ id               │
│ user_id          │       │ user_id          │
│ action           │       │ level_id         │
│ metadata (JSON)  │       │ score            │
│ created_at       │       │ moves_used       │
│ ip_address       │       │ targets_met      │
│ user_agent       │       │ duration_sec     │
└──────────────────┘       │ created_at       │
                           └──────────────────┘
```

### Level Configuration (JSON targets)

```json
{
  "collect": {
    "chicken": 10,
    "burger": 5
  },
  "combos": {
    "4_match": 3,
    "5_match": 1
  },
  "min_score": 1000
}
```

## API Endpoints

### Auth
- `POST /api/auth/register` - Register with email
- `POST /api/auth/verify` - Verify email code
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Current user

### Levels
- `GET /api/levels` - List all levels
- `GET /api/levels/:id` - Get level config
- `GET /api/levels/:id/leaderboard` - Level leaderboard

### Game
- `POST /api/game/start` - Start game session
- `POST /api/game/complete` - Complete game session
- `GET /api/user/progress` - User's level progress

### Leaderboard
- `GET /api/leaderboard` - Global leaderboard (total scores)
- `GET /api/leaderboard/weekly` - Weekly leaderboard

### Analytics (Admin)
- `GET /api/admin/analytics/users` - User stats
- `GET /api/admin/analytics/levels` - Level stats
- `GET /api/admin/analytics/retention` - Retention stats

## Frontend Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── RegisterForm.tsx
│   │   │   └── VerifyEmail.tsx
│   │   ├── game/
│   │   │   ├── PixiGame.ts
│   │   │   ├── LevelSelect.tsx
│   │   │   ├── LevelCard.tsx
│   │   │   └── GameOverlay.tsx
│   │   ├── leaderboard/
│   │   │   └── Leaderboard.tsx
│   │   └── ui/
│   │       └── ...
│   │
│   ├── pages/
│   │   ├── index.tsx          # Landing / Level Select
│   │   ├── auth/
│   │   │   ├── login.tsx
│   │   │   ├── register.tsx
│   │   │   └── verify.tsx
│   │   ├── game/[levelId].tsx # Game page
│   │   ├── leaderboard.tsx
│   │   └── profile.tsx
│   │
│   ├── services/
│   │   ├── api.ts
│   │   ├── auth.ts
│   │   ├── levels.ts
│   │   └── game.ts
│   │
│   ├── stores/
│   │   ├── authStore.ts
│   │   └── gameStore.ts
│   │
│   └── types/
│       └── index.ts
```

## Backend Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── config.py
│   │
│   ├── models/
│   │   ├── user.py
│   │   ├── level.py
│   │   ├── user_progress.py
│   │   ├── game_session.py
│   │   └── user_activity.py
│   │
│   ├── api/
│   │   ├── auth.py
│   │   ├── levels.py
│   │   ├── game.py
│   │   └── leaderboard.py
│   │
│   ├── services/
│   │   ├── email.py
│   │   ├── scoring.py
│   │   └── analytics.py
│   │
│   └── utils/
│       └── ...
│
├── migrations/
├── requirements.txt
└── Dockerfile
```

## Admin Panel

Flask-Admin based panel at `/admin`:

### Pages:
1. **Dashboard** - Overview stats
2. **Users** - User management, export emails
3. **Levels** - Level constructor
   - Grid size selector
   - Item types checkboxes
   - Targets configuration
   - Preview
4. **Analytics**
   - User registration chart
   - Level completion rates
   - Retention funnel
5. **Leaderboard** - View/export winners

## Database Tables

```sql
-- Users
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    verification_code VARCHAR(6),
    verification_expires_at TIMESTAMP,
    total_score INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    last_login_at TIMESTAMP
);

-- Levels
CREATE TABLE levels (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    "order" INTEGER NOT NULL,
    grid_width INTEGER DEFAULT 8,
    grid_height INTEGER DEFAULT 8,
    max_moves INTEGER DEFAULT 30,
    item_types TEXT[] DEFAULT ARRAY['chicken','burger','fries','cola','bucket'],
    targets JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- User Level Progress
CREATE TABLE user_level_progress (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    level_id INTEGER REFERENCES levels(id) ON DELETE CASCADE,
    best_score INTEGER DEFAULT 0,
    stars INTEGER DEFAULT 0,
    completed_at TIMESTAMP,
    attempts_count INTEGER DEFAULT 0,
    UNIQUE(user_id, level_id)
);

-- Game Sessions
CREATE TABLE game_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    level_id INTEGER REFERENCES levels(id) ON DELETE CASCADE,
    score INTEGER DEFAULT 0,
    moves_used INTEGER DEFAULT 0,
    targets_met JSONB,
    duration_seconds INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- User Activity (Analytics)
CREATE TABLE user_activities (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    metadata JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_user_progress_user ON user_level_progress(user_id);
CREATE INDEX idx_game_sessions_user ON game_sessions(user_id);
CREATE INDEX idx_user_activities_user ON user_activities(user_id);
CREATE INDEX idx_user_activities_created ON user_activities(created_at);
```

## Docker Services

Based on moodsprint architecture:

1. **db** - PostgreSQL 15
2. **redis** - Redis 7 (sessions, caching)
3. **backend** - Flask API
4. **frontend** - React (Vite build served by nginx)
5. **admin** - Flask-Admin
6. **nginx** - Reverse proxy
7. **prometheus** - Metrics
8. **grafana** - Dashboards

## Email Verification Flow

1. User registers with email
2. Server generates 6-digit code, stores with expiry
3. Server sends email via SMTP (Yandex/Gmail)
4. User enters code
5. Server verifies, marks user as verified
6. User can now play and appear in leaderboard

## Scoring & Stars

- **1 Star**: Complete level (meet min targets)
- **2 Stars**: Score >= target_score * 1.5
- **3 Stars**: Score >= target_score * 2 + all bonus targets

## Implementation Phases

### Phase 1: Core Infrastructure
- [ ] Docker setup (db, redis, nginx)
- [ ] Backend skeleton (Flask + SQLAlchemy)
- [ ] Database migrations
- [ ] Basic auth (register, login, verify)

### Phase 2: Game Integration
- [ ] Level model & API
- [ ] Game session tracking
- [ ] Frontend level selection
- [ ] Game completion flow

### Phase 3: Leaderboard & Progress
- [ ] User progress tracking
- [ ] Leaderboard API
- [ ] Frontend leaderboard page

### Phase 4: Admin Panel
- [ ] Flask-Admin setup
- [ ] Level constructor
- [ ] User management
- [ ] Analytics dashboards

### Phase 5: Monitoring
- [ ] Prometheus metrics
- [ ] Grafana dashboards
- [ ] Alerting
