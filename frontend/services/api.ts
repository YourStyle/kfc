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
  async register(email: string, username: string, password: string, city: 'moscow' | 'region', cityName: string, source: 'game' | 'quest' = 'game') {
    return this.request<{ message: string; user_id: number }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, username, password, city, city_name: cityName, source }),
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
  async getGlobalLeaderboard(limit = 100, city?: 'moscow' | 'region') {
    const params = new URLSearchParams({ limit: String(limit) });
    if (city) params.append('city', city);
    return this.request<{ leaderboard: GlobalLeaderboardEntry[] }>(
      `/leaderboard?${params.toString()}`
    );
  }

  async getWeeklyLeaderboard(limit = 100) {
    return this.request<{ leaderboard: WeeklyLeaderboardEntry[] }>(
      `/leaderboard/weekly?limit=${limit}`
    );
  }

  async getMyRank() {
    return this.request<{
      rank: number;
      total_score: number;
      total_players: number;
      city: 'moscow' | 'region';
      regional_rank: number;
      regional_total_players: number;
    }>('/leaderboard/my-rank');
  }

  // Quest endpoints
  async getQuestPages() {
    return this.request<{ pages: QuestPageSummary[] }>('/quest/pages');
  }

  async getQuestPage(slug: string) {
    return this.request<{ page: QuestPageDetail }>(`/quest/pages/${slug}`);
  }

  async scanQuestQR(qrToken: string) {
    return this.request<QuestScanResult>('/quest/scan', {
      method: 'POST',
      body: JSON.stringify({ qr_token: qrToken }),
    });
  }

  async skipQuestQuestion() {
    return this.request<QuestSkipResult>('/quest/skip', {
      method: 'POST',
    });
  }

  async getQuestProgress() {
    return this.request<QuestProgressData>('/quest/progress');
  }

  async getQuestResult() {
    return this.request<QuestResultData>('/quest/result');
  }

  async claimPromoCode() {
    return this.request<PromoClaimResult>('/quest/claim-promo', {
      method: 'POST',
    });
  }

  // Texts endpoint (public, no auth needed)
  async getTexts() {
    return this.request<Record<string, string>>('/api/texts');
  }
}

// Types
export interface User {
  id: number;
  email: string;
  username: string;
  city: 'moscow' | 'region';
  city_name?: string;
  is_verified: boolean;
  total_score: number;
  registration_source: 'game' | 'quest' | 'transferred';
  quest_score: number;
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
  obstacles: { row: number; col: number }[];
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
  city?: 'moscow' | 'region';
}

export interface WeeklyLeaderboardEntry {
  rank: number;
  user_id: number;
  username: string;
  weekly_score: number;
}

// Quest types
export interface QuestPageSummary {
  id: number;
  slug: string;
  order: number;
  title: string;
  riddle_text: string;
  fact_text?: string;
  image_url?: string;
  points: number;
  is_active: boolean;
}

export interface QuestPageDetail extends QuestPageSummary {
  description?: string;
}

export interface QuestScanResult {
  is_correct: boolean;
  points_earned: number;
  total_quest_score: number;
  fact_text?: string;
  page: QuestPageSummary;
  next_page_slug?: string;
  quest_completed: boolean;
}

export interface QuestSkipResult {
  skipped_page: string;
  next_page_slug?: string;
  quest_completed: boolean;
  total_quest_score: number;
}

export interface QuestProgressEntry {
  page_slug: string;
  page_order: number;
  page_title: string;
  is_answered: boolean;
  is_correct: boolean;
  is_skipped: boolean;
  points_earned: number;
}

export interface QuestProgressData {
  progress: QuestProgressEntry[];
  total_score: number;
  total_pages: number;
  answered_pages: number;
  current_page_slug?: string;
  quest_completed: boolean;
}

export interface QuestResultData {
  total_score: number;
  total_pages: number;
  correct_answers: number;
  skipped_answers: number;
  answered_pages: number;
  eligible_tier?: string;
  eligible_discount?: string;
  already_claimed: boolean;
  claimed_code?: string;
  claimed_tier?: string;
}

export interface PromoClaimResult {
  code: string;
  tier: string;
  discount_label: string;
}

export const api = new ApiClient();
export default api;
