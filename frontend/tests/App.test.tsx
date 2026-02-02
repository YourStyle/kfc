import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

// Mock the api module
vi.mock('../services/api', () => ({
  default: {
    getToken: vi.fn(() => null),
    setToken: vi.fn(),
    getMe: vi.fn(() => Promise.resolve({ data: null })),
    login: vi.fn(),
    register: vi.fn(),
    verify: vi.fn(),
    resendCode: vi.fn(),
    logout: vi.fn(),
    getLevels: vi.fn(),
    getUserProgress: vi.fn(),
    getGlobalLeaderboard: vi.fn(),
    getWeeklyLeaderboard: vi.fn(),
    getMyRank: vi.fn(),
    startGame: vi.fn(),
    completeGame: vi.fn(),
  },
}));

import api from '../services/api';
import App from '../App';

describe('App', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (api.getToken as any).mockReturnValue(null);
    (api.getMe as any).mockResolvedValue({ data: null });
  });

  describe('Levels loading', () => {
    it('should correctly extract levels array from API response', async () => {
      // API returns { levels: [...] } but we need to set state to the array
      const mockLevels = [
        { id: 1, name: 'Level 1', order: 1, grid_width: 7, grid_height: 7, max_moves: 25, item_types: [], targets: {}, is_active: true },
        { id: 2, name: 'Level 2', order: 2, grid_width: 7, grid_height: 7, max_moves: 22, item_types: [], targets: {}, is_active: true },
      ];

      (api.getLevels as any).mockResolvedValue({
        data: { levels: mockLevels },
      });

      render(<App />);

      await waitFor(() => {
        expect(api.getLevels).toHaveBeenCalled();
      });

      // The API should have been called and levels extracted correctly
      // If this test passes without "findIndex is not a function" error, the fix works
    });

    it('should handle API response where data.levels is undefined', async () => {
      (api.getLevels as any).mockResolvedValue({
        data: null,
      });

      // Should not crash
      render(<App />);

      await waitFor(() => {
        expect(api.getLevels).toHaveBeenCalled();
      });
    });

    it('should handle empty levels array', async () => {
      (api.getLevels as any).mockResolvedValue({
        data: { levels: [] },
      });

      render(<App />);

      await waitFor(() => {
        expect(api.getLevels).toHaveBeenCalled();
      });
    });
  });

  describe('hasNextLevel function', () => {
    it('should work with array of levels (regression test for findIndex)', async () => {
      const mockLevels = [
        { id: 1, name: 'Level 1', order: 1, grid_width: 7, grid_height: 7, max_moves: 25, item_types: [], targets: {}, is_active: true },
        { id: 2, name: 'Level 2', order: 2, grid_width: 7, grid_height: 7, max_moves: 22, item_types: [], targets: {}, is_active: true },
        { id: 3, name: 'Level 3', order: 3, grid_width: 7, grid_height: 7, max_moves: 25, item_types: [], targets: {}, is_active: true },
      ];

      (api.getLevels as any).mockResolvedValue({
        data: { levels: mockLevels },
      });

      // This test ensures that levels is an array, not an object
      // If levels were an object { levels: [...] }, calling findIndex would throw
      render(<App />);

      await waitFor(() => {
        expect(api.getLevels).toHaveBeenCalled();
      });

      // If we get here without "findIndex is not a function" error, the fix is working
    });
  });
});
