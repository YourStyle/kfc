const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: data.error || 'Request failed' };
      }

      return { data };
    } catch (error) {
      return { error: 'Network error' };
    }
  }

  // Auth endpoints
  async register(email: string, username: string, password: string) {
    return this.request<{ message: string; user_id: number }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, username, password }),
    });
  }

  async verify(email: string, code: string) {
    return this.request<{ message: string; access_token: string; user: User }>(
      '/auth/verify',
      {
        method: 'POST',
        body: JSON.stringify({ email, code }),
      }
    );
  }

  async resendCode(email: string) {
    return this.request<{ message: string }>('/auth/resend-code', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async login(email: string, password: string) {
    return this.request<{ access_token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async getMe() {
    return this.request<{ user: User }>('/auth/me');
  }

  async logout() {
    return this.request<{ message: string }>('/auth/logout', {
      method: 'POST',
    });
  }

  // Levels endpoints
  async getLevels() {
    return this.request<{ levels: Level[] }>('/levels');
  }

  async getLevel(levelId: number) {
    return this.request<{ level: Level }>(`/levels/${levelId}`);
  }

  async getUserProgress() {
    return this.request<{ levels: LevelWithProgress[] }>('/levels/user/progress');
  }

  async getLevelLeaderboard(levelId: number, limit = 100) {
    return this.request<{ leaderboard: LeaderboardEntry[] }>(
      `/levels/${levelId}/leaderboard?limit=${limit}`
    );
  }

  // Game endpoints
  async startGame(levelId: number) {
    return this.request<{ session_id: number; level: Level }>('/game/start', {
      method: 'POST',
      body: JSON.stringify({ level_id: levelId }),
    });
  }

  async completeGame(
    sessionId: number,
    score: number,
    movesUsed: number,
    targetsMet: Record<string, any>,
    durationSeconds: number
  ) {
    return this.request<{
      is_won: boolean;
      stars: number;
      score: number;
      session: GameSession;
    }>('/game/complete', {
      method: 'POST',
      body: JSON.stringify({
        session_id: sessionId,
        score,
        moves_used: movesUsed,
        targets_met: targetsMet,
        duration_seconds: durationSeconds,
      }),
    });
  }

  // Leaderboard endpoints
  async getGlobalLeaderboard(limit = 100) {
    return this.request<{ leaderboard: GlobalLeaderboardEntry[] }>(
      `/leaderboard?limit=${limit}`
    );
  }

  async getWeeklyLeaderboard(limit = 100) {
    return this.request<{ leaderboard: WeeklyLeaderboardEntry[] }>(
      `/leaderboard/weekly?limit=${limit}`
    );
  }

  async getMyRank() {
    return this.request<{ rank: number; total_score: number; total_players: number }>(
      '/leaderboard/my-rank'
    );
  }
}

// Types
export interface User {
  id: number;
  email: string;
  username: string;
  is_verified: boolean;
  total_score: number;
  created_at: string;
}

export interface Level {
  id: number;
  name: string;
  order: number;
  grid_width: number;
  grid_height: number;
  max_moves: number;
  item_types: string[];
  targets: LevelTargets;
  is_active: boolean;
}

export interface LevelTargets {
  collect?: Record<string, number>;
  combos?: Record<string, number>;
  min_score?: number;
}

export interface LevelWithProgress extends Level {
  progress?: UserProgress;
}

export interface UserProgress {
  id: number;
  best_score: number;
  stars: number;
  completed_at: string | null;
  attempts_count: number;
}

export interface GameSession {
  id: number;
  user_id: number;
  level_id: number;
  score: number;
  moves_used: number;
  targets_met: Record<string, any>;
  duration_seconds: number;
  is_completed: boolean;
  is_won: boolean;
  created_at: string;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: number;
  username: string;
  score: number;
  stars: number;
}

export interface GlobalLeaderboardEntry {
  rank: number;
  user_id: number;
  username: string;
  total_score: number;
  completed_levels: number;
  total_stars: number;
}

export interface WeeklyLeaderboardEntry {
  rank: number;
  user_id: number;
  username: string;
  weekly_score: number;
}

export const api = new ApiClient();
export default api;
