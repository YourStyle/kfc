import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '../services/api';

describe('ApiClient', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.setToken(null);
  });

  describe('Token management', () => {
    it('should set and get token', () => {
      api.setToken('test-token');
      expect(api.getToken()).toBe('test-token');
      expect(localStorage.setItem).toHaveBeenCalledWith('auth_token', 'test-token');
    });

    it('should remove token when set to null', () => {
      api.setToken('test-token');
      api.setToken(null);
      expect(api.getToken()).toBe(null);
      expect(localStorage.removeItem).toHaveBeenCalledWith('auth_token');
    });
  });

  describe('Auth endpoints', () => {
    it('should register a new user', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ message: 'Registration successful', user_id: 1 }),
      });

      const result = await api.register('test@example.com', 'testuser', 'password123');

      expect(result.data).toEqual({ message: 'Registration successful', user_id: 1 });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/register'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'test@example.com', username: 'testuser', password: 'password123' }),
        })
      );
    });

    it('should handle registration error', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Email already registered' }),
      });

      const result = await api.register('existing@example.com', 'user', 'password');

      expect(result.error).toBe('Email already registered');
      expect(result.data).toBeUndefined();
    });

    it('should login user', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: 'jwt-token',
            user: { id: 1, email: 'test@example.com', username: 'testuser' },
          }),
      });

      const result = await api.login('test@example.com', 'password123');

      expect(result.data?.access_token).toBe('jwt-token');
      expect(result.data?.user.email).toBe('test@example.com');
    });

    it('should handle login error', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Invalid email or password' }),
      });

      const result = await api.login('test@example.com', 'wrongpassword');

      expect(result.error).toBe('Invalid email or password');
    });

    it('should verify email', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            message: 'Email verified',
            access_token: 'jwt-token',
            user: { id: 1, email: 'test@example.com' },
          }),
      });

      const result = await api.verify('test@example.com', '123456');

      expect(result.data?.access_token).toBe('jwt-token');
    });

    it('should get current user with auth token', async () => {
      api.setToken('test-token');

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            user: { id: 1, email: 'test@example.com', username: 'testuser', total_score: 100 },
          }),
      });

      const result = await api.getMe();

      expect(result.data?.user.email).toBe('test@example.com');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/me'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });
  });

  describe('Game endpoints', () => {
    beforeEach(() => {
      api.setToken('test-token');
    });

    it('should get levels', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            levels: [
              { id: 1, name: 'Level 1', order: 1, grid_width: 7 },
              { id: 2, name: 'Level 2', order: 2, grid_width: 7 },
            ],
          }),
      });

      const result = await api.getLevels();

      expect(result.data?.levels).toHaveLength(2);
      expect(result.data?.levels[0].name).toBe('Level 1');
    });

    it('should start a game', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            session_id: 123,
            level: { id: 1, name: 'Level 1' },
          }),
      });

      const result = await api.startGame(1);

      expect(result.data?.session_id).toBe(123);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/game/start'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ level_id: 1 }),
        })
      );
    });

    it('should complete a game', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            is_won: true,
            stars: 3,
            score: 1500,
            session: { id: 123, is_completed: true },
          }),
      });

      const result = await api.completeGame(123, 1500, 20, { score: 1500 }, 120);

      expect(result.data?.is_won).toBe(true);
      expect(result.data?.stars).toBe(3);
    });
  });

  describe('Leaderboard endpoints', () => {
    it('should get global leaderboard', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            leaderboard: [
              { rank: 1, user_id: 1, username: 'player1', total_score: 5000 },
              { rank: 2, user_id: 2, username: 'player2', total_score: 3000 },
            ],
          }),
      });

      const result = await api.getGlobalLeaderboard();

      expect(result.data?.leaderboard).toHaveLength(2);
      expect(result.data?.leaderboard[0].rank).toBe(1);
    });

    it('should get weekly leaderboard', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            leaderboard: [{ rank: 1, user_id: 1, username: 'player1', weekly_score: 1000 }],
          }),
      });

      const result = await api.getWeeklyLeaderboard();

      expect(result.data?.leaderboard).toHaveLength(1);
      expect(result.data?.leaderboard[0].weekly_score).toBe(1000);
    });
  });

  describe('Network error handling', () => {
    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const result = await api.login('test@example.com', 'password');

      expect(result.error).toBe('Network error');
    });
  });
});
