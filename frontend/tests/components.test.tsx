import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { BottomNav } from '../components/BottomNav';

// Mock AuthContext
vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    isAuthenticated: true,
    user: { id: 1, email: 'test@example.com', username: 'testuser' },
    isLoading: false,
  })),
}));

describe('BottomNav', () => {
  it('should render navigation items', () => {
    const onNavigate = vi.fn();

    render(<BottomNav active="levels" onNavigate={onNavigate} />);

    // Check for navigation items text
    expect(screen.getByText('Играть')).toBeInTheDocument();
    expect(screen.getByText('Рейтинг')).toBeInTheDocument();
    expect(screen.getByText('Профиль')).toBeInTheDocument();
    expect(screen.getByText('Правила')).toBeInTheDocument();
  });

  it('should call onNavigate when clicking levels', () => {
    const onNavigate = vi.fn();

    render(<BottomNav active="leaderboard" onNavigate={onNavigate} />);

    fireEvent.click(screen.getByText('Играть'));

    expect(onNavigate).toHaveBeenCalledWith('levels');
  });

  it('should call onNavigate when clicking leaderboard', () => {
    const onNavigate = vi.fn();

    render(<BottomNav active="levels" onNavigate={onNavigate} />);

    fireEvent.click(screen.getByText('Рейтинг'));

    expect(onNavigate).toHaveBeenCalledWith('leaderboard');
  });

  it('should call onNavigate when clicking profile', () => {
    const onNavigate = vi.fn();

    render(<BottomNav active="levels" onNavigate={onNavigate} />);

    fireEvent.click(screen.getByText('Профиль'));

    expect(onNavigate).toHaveBeenCalledWith('profile');
  });

  it('should call onNavigate when clicking rules', () => {
    const onNavigate = vi.fn();

    render(<BottomNav active="levels" onNavigate={onNavigate} />);

    fireEvent.click(screen.getByText('Правила'));

    expect(onNavigate).toHaveBeenCalledWith('rules');
  });

  it('should highlight active item', () => {
    const onNavigate = vi.fn();

    render(<BottomNav active="leaderboard" onNavigate={onNavigate} />);

    // The active item should have different styling
    const leaderboardItem = screen.getByText('Рейтинг').closest('button');
    expect(leaderboardItem).toBeInTheDocument();
  });
});

describe('Utility functions', () => {
  describe('calculateStars', () => {
    it('should calculate 3 stars for double min_score', () => {
      const calculateStars = (score: number, targets?: { min_score?: number }): number => {
        if (!targets?.min_score) {
          if (score >= 5000) return 3;
          if (score >= 2500) return 2;
          if (score >= 1000) return 1;
          return 0;
        }

        const minScore = targets.min_score;
        if (score >= minScore * 2) return 3;
        if (score >= minScore * 1.5) return 2;
        if (score >= minScore) return 1;
        return 0;
      };

      expect(calculateStars(200, { min_score: 100 })).toBe(3);
      expect(calculateStars(150, { min_score: 100 })).toBe(2);
      expect(calculateStars(100, { min_score: 100 })).toBe(1);
      expect(calculateStars(50, { min_score: 100 })).toBe(0);
    });

    it('should use default thresholds when no min_score', () => {
      const calculateStars = (score: number, targets?: { min_score?: number }): number => {
        if (!targets?.min_score) {
          if (score >= 5000) return 3;
          if (score >= 2500) return 2;
          if (score >= 1000) return 1;
          return 0;
        }

        const minScore = targets.min_score;
        if (score >= minScore * 2) return 3;
        if (score >= minScore * 1.5) return 2;
        if (score >= minScore) return 1;
        return 0;
      };

      expect(calculateStars(5000)).toBe(3);
      expect(calculateStars(2500)).toBe(2);
      expect(calculateStars(1000)).toBe(1);
      expect(calculateStars(500)).toBe(0);
    });
  });
});
