import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '../services/api';

describe('Quest API endpoints', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.setToken('test-token');
  });

  describe('getQuestPages', () => {
    it('should get all quest pages', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            pages: [
              {
                id: 1,
                slug: 'first-quest',
                order: 1,
                title: 'First Quest',
                riddle_text: 'Where is the secret location?',
                fact_text: 'This is a historical fact',
                image_url: 'https://example.com/image1.jpg',
                points: 10,
                is_active: true,
              },
              {
                id: 2,
                slug: 'second-quest',
                order: 2,
                title: 'Second Quest',
                riddle_text: 'Find the hidden treasure',
                points: 15,
                is_active: true,
              },
            ],
          }),
      });

      const result = await api.getQuestPages();

      expect(result.data?.pages).toHaveLength(2);
      expect(result.data?.pages[0].slug).toBe('first-quest');
      expect(result.data?.pages[0].title).toBe('First Quest');
      expect(result.data?.pages[1].points).toBe(15);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/quest/pages'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });

    it('should handle error when getting quest pages', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Failed to fetch quest pages' }),
      });

      const result = await api.getQuestPages();

      expect(result.error).toBe('Failed to fetch quest pages');
      expect(result.data).toBeUndefined();
    });
  });

  describe('getQuestPage', () => {
    it('should get a specific quest page by slug', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            page: {
              id: 1,
              slug: 'first-quest',
              order: 1,
              title: 'First Quest',
              riddle_text: 'Where is the secret location?',
              description: 'A detailed description of the quest',
              fact_text: 'This is a historical fact',
              image_url: 'https://example.com/image1.jpg',
              points: 10,
              is_active: true,
            },
          }),
      });

      const result = await api.getQuestPage('first-quest');

      expect(result.data?.page.slug).toBe('first-quest');
      expect(result.data?.page.title).toBe('First Quest');
      expect(result.data?.page.description).toBe('A detailed description of the quest');
      expect(result.data?.page.points).toBe(10);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/quest/pages/first-quest'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });

    it('should handle error when quest page not found', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Quest page not found' }),
      });

      const result = await api.getQuestPage('non-existent-quest');

      expect(result.error).toBe('Quest page not found');
      expect(result.data).toBeUndefined();
    });
  });

  describe('scanQuestQR', () => {
    it('should scan QR code successfully with correct answer', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            is_correct: true,
            points_earned: 10,
            total_quest_score: 25,
            fact_text: 'Interesting historical fact about this location',
            page: {
              id: 1,
              slug: 'first-quest',
              order: 1,
              title: 'First Quest',
              riddle_text: 'Where is the secret location?',
              points: 10,
              is_active: true,
            },
            next_page_slug: 'second-quest',
            quest_completed: false,
          }),
      });

      const result = await api.scanQuestQR('qr-token-abc123');

      expect(result.data?.is_correct).toBe(true);
      expect(result.data?.points_earned).toBe(10);
      expect(result.data?.total_quest_score).toBe(25);
      expect(result.data?.fact_text).toBe('Interesting historical fact about this location');
      expect(result.data?.next_page_slug).toBe('second-quest');
      expect(result.data?.quest_completed).toBe(false);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/quest/scan'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ qr_token: 'qr-token-abc123' }),
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });

    it('should scan QR code with incorrect answer', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            is_correct: false,
            points_earned: 0,
            total_quest_score: 15,
            page: {
              id: 2,
              slug: 'second-quest',
              order: 2,
              title: 'Second Quest',
              riddle_text: 'Find the hidden treasure',
              points: 15,
              is_active: true,
            },
            quest_completed: false,
          }),
      });

      const result = await api.scanQuestQR('wrong-qr-token');

      expect(result.data?.is_correct).toBe(false);
      expect(result.data?.points_earned).toBe(0);
      expect(result.data?.total_quest_score).toBe(15);
    });

    it('should complete quest after scanning last QR', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            is_correct: true,
            points_earned: 20,
            total_quest_score: 100,
            fact_text: 'Final fact',
            page: {
              id: 10,
              slug: 'final-quest',
              order: 10,
              title: 'Final Quest',
              riddle_text: 'The final challenge',
              points: 20,
              is_active: true,
            },
            quest_completed: true,
          }),
      });

      const result = await api.scanQuestQR('final-qr-token');

      expect(result.data?.quest_completed).toBe(true);
      expect(result.data?.next_page_slug).toBeUndefined();
    });

    it('should handle error when scanning QR code', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Invalid QR token' }),
      });

      const result = await api.scanQuestQR('invalid-token');

      expect(result.error).toBe('Invalid QR token');
      expect(result.data).toBeUndefined();
    });
  });

  describe('skipQuestQuestion', () => {
    it('should skip current quest question', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            skipped_page: 'second-quest',
            next_page_slug: 'third-quest',
            quest_completed: false,
            total_quest_score: 35,
          }),
      });

      const result = await api.skipQuestQuestion();

      expect(result.data?.skipped_page).toBe('second-quest');
      expect(result.data?.next_page_slug).toBe('third-quest');
      expect(result.data?.quest_completed).toBe(false);
      expect(result.data?.total_quest_score).toBe(35);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/quest/skip'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });

    it('should complete quest after skipping last question', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            skipped_page: 'final-quest',
            quest_completed: true,
            total_quest_score: 80,
          }),
      });

      const result = await api.skipQuestQuestion();

      expect(result.data?.quest_completed).toBe(true);
      expect(result.data?.next_page_slug).toBeUndefined();
    });

    it('should handle error when skipping question', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'No active quest found' }),
      });

      const result = await api.skipQuestQuestion();

      expect(result.error).toBe('No active quest found');
      expect(result.data).toBeUndefined();
    });
  });

  describe('getQuestProgress', () => {
    it('should get current quest progress', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            progress: [
              {
                page_slug: 'first-quest',
                page_order: 1,
                page_title: 'First Quest',
                is_answered: true,
                is_correct: true,
                is_skipped: false,
                points_earned: 10,
              },
              {
                page_slug: 'second-quest',
                page_order: 2,
                page_title: 'Second Quest',
                is_answered: true,
                is_correct: false,
                is_skipped: false,
                points_earned: 0,
              },
              {
                page_slug: 'third-quest',
                page_order: 3,
                page_title: 'Third Quest',
                is_answered: true,
                is_correct: false,
                is_skipped: true,
                points_earned: 0,
              },
            ],
            total_score: 10,
            total_pages: 5,
            answered_pages: 3,
            current_page_slug: 'fourth-quest',
            quest_completed: false,
          }),
      });

      const result = await api.getQuestProgress();

      expect(result.data?.progress).toHaveLength(3);
      expect(result.data?.progress[0].is_correct).toBe(true);
      expect(result.data?.progress[0].points_earned).toBe(10);
      expect(result.data?.progress[2].is_skipped).toBe(true);
      expect(result.data?.total_score).toBe(10);
      expect(result.data?.total_pages).toBe(5);
      expect(result.data?.answered_pages).toBe(3);
      expect(result.data?.current_page_slug).toBe('fourth-quest');
      expect(result.data?.quest_completed).toBe(false);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/quest/progress'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });

    it('should get completed quest progress', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            progress: [
              {
                page_slug: 'first-quest',
                page_order: 1,
                page_title: 'First Quest',
                is_answered: true,
                is_correct: true,
                is_skipped: false,
                points_earned: 10,
              },
            ],
            total_score: 100,
            total_pages: 10,
            answered_pages: 10,
            quest_completed: true,
          }),
      });

      const result = await api.getQuestProgress();

      expect(result.data?.quest_completed).toBe(true);
      expect(result.data?.current_page_slug).toBeUndefined();
    });

    it('should handle error when getting quest progress', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Quest not started' }),
      });

      const result = await api.getQuestProgress();

      expect(result.error).toBe('Quest not started');
      expect(result.data).toBeUndefined();
    });
  });

  describe('getQuestResult', () => {
    it('should get quest results for completed quest', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            total_score: 80,
            total_pages: 10,
            correct_answers: 8,
            skipped_answers: 2,
            answered_pages: 10,
            eligible_tier: 'gold',
            eligible_discount: '15%',
            already_claimed: false,
          }),
      });

      const result = await api.getQuestResult();

      expect(result.data?.total_score).toBe(80);
      expect(result.data?.total_pages).toBe(10);
      expect(result.data?.correct_answers).toBe(8);
      expect(result.data?.skipped_answers).toBe(2);
      expect(result.data?.answered_pages).toBe(10);
      expect(result.data?.eligible_tier).toBe('gold');
      expect(result.data?.eligible_discount).toBe('15%');
      expect(result.data?.already_claimed).toBe(false);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/quest/result'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });

    it('should get quest results with already claimed promo code', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            total_score: 90,
            total_pages: 10,
            correct_answers: 9,
            skipped_answers: 1,
            answered_pages: 10,
            eligible_tier: 'platinum',
            eligible_discount: '20%',
            already_claimed: true,
            claimed_code: 'PROMO123ABC',
            claimed_tier: 'platinum',
          }),
      });

      const result = await api.getQuestResult();

      expect(result.data?.already_claimed).toBe(true);
      expect(result.data?.claimed_code).toBe('PROMO123ABC');
      expect(result.data?.claimed_tier).toBe('platinum');
    });

    it('should handle error when getting quest results', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Quest not completed yet' }),
      });

      const result = await api.getQuestResult();

      expect(result.error).toBe('Quest not completed yet');
      expect(result.data).toBeUndefined();
    });
  });

  describe('claimPromoCode', () => {
    it('should successfully claim promo code', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            code: 'KFC-GOLD-XYZ789',
            tier: 'gold',
            discount_label: '15% скидка',
          }),
      });

      const result = await api.claimPromoCode();

      expect(result.data?.code).toBe('KFC-GOLD-XYZ789');
      expect(result.data?.tier).toBe('gold');
      expect(result.data?.discount_label).toBe('15% скидка');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/quest/claim-promo'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });

    it('should handle error when claiming promo code', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Promo code already claimed' }),
      });

      const result = await api.claimPromoCode();

      expect(result.error).toBe('Promo code already claimed');
      expect(result.data).toBeUndefined();
    });
  });

  describe('register with quest source', () => {
    beforeEach(() => {
      api.setToken(null);
    });

    it('should register with quest source parameter', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ message: 'Registration successful', user_id: 42 }),
      });

      const result = await api.register(
        'quest@example.com',
        'questuser',
        'password123',
        'moscow',
        'Москва',
        'quest'
      );

      expect(result.data).toEqual({ message: 'Registration successful', user_id: 42 });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/register'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            email: 'quest@example.com',
            username: 'questuser',
            password: 'password123',
            city: 'moscow',
            city_name: 'Москва',
            source: 'quest',
          }),
        })
      );
    });

    it('should register with default game source when not specified', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ message: 'Registration successful', user_id: 43 }),
      });

      const result = await api.register(
        'game@example.com',
        'gameuser',
        'password123',
        'region',
        'Казань'
      );

      expect(result.data).toEqual({ message: 'Registration successful', user_id: 43 });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/register'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            email: 'game@example.com',
            username: 'gameuser',
            password: 'password123',
            city: 'region',
            city_name: 'Казань',
            source: 'game',
          }),
        })
      );
    });
  });
});
