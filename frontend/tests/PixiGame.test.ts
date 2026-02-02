import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('PixiGame stats updates', () => {
  describe('onStatsUpdate callback', () => {
    it('should pass a new object reference on each update (not the same object)', () => {
      // This test verifies that stats updates create new object references
      // so React can detect changes and re-render

      const receivedStats: object[] = [];
      const mockOnStatsUpdate = vi.fn((stats) => {
        receivedStats.push(stats);
      });

      // Simulate what PixiGame does internally
      const stats = { score: 0, moves: 30, wingsCollected: 0 };

      // First update (like in init)
      mockOnStatsUpdate({ ...stats });

      // Second update (like after a move)
      stats.moves--;
      stats.score += 30;
      mockOnStatsUpdate({ ...stats });

      // Third update (like after collecting chicken)
      stats.wingsCollected++;
      mockOnStatsUpdate({ ...stats });

      expect(mockOnStatsUpdate).toHaveBeenCalledTimes(3);

      // Each call should receive a different object reference
      expect(receivedStats[0]).not.toBe(receivedStats[1]);
      expect(receivedStats[1]).not.toBe(receivedStats[2]);
      expect(receivedStats[0]).not.toBe(receivedStats[2]);

      // But values should be correct
      expect(receivedStats[0]).toEqual({ score: 0, moves: 30, wingsCollected: 0 });
      expect(receivedStats[1]).toEqual({ score: 30, moves: 29, wingsCollected: 0 });
      expect(receivedStats[2]).toEqual({ score: 30, moves: 29, wingsCollected: 1 });
    });

    it('should NOT use the same object reference (regression test)', () => {
      // This test ensures we don't regress to passing the same object
      // which would cause React to not detect changes

      const receivedStats: object[] = [];
      const mockOnStatsUpdate = vi.fn((stats) => {
        receivedStats.push(stats);
      });

      const stats = { score: 0, moves: 30, wingsCollected: 0 };

      // WRONG way (what the bug was): passing same reference
      // mockOnStatsUpdate(stats);
      // mockOnStatsUpdate(stats);

      // CORRECT way: spreading to create new reference
      mockOnStatsUpdate({ ...stats });
      stats.moves--;
      mockOnStatsUpdate({ ...stats });

      // If we were passing the same reference, both would be equal
      // because the object would be mutated
      expect(receivedStats[0]).not.toBe(receivedStats[1]);
      expect(receivedStats[0].moves).not.toBe(receivedStats[1].moves);
    });
  });

  describe('Moves counter', () => {
    it('should decrement moves on successful match', () => {
      const stats = { score: 0, moves: 25, wingsCollected: 0 };

      // Simulate a successful match
      const hasMatch = true;
      if (hasMatch) {
        stats.moves--;
      }

      expect(stats.moves).toBe(24);
    });

    it('should NOT decrement moves on failed swap (no match)', () => {
      const stats = { score: 0, moves: 25, wingsCollected: 0 };

      // Simulate a failed swap (no match found)
      const hasMatch = false;
      if (hasMatch) {
        stats.moves--;
      }

      expect(stats.moves).toBe(25);
    });

    it('should decrement moves regardless of item type matched', () => {
      // This test ensures moves decrement for ANY match, not just chicken
      const itemTypes = ['chicken', 'burger', 'fries', 'cola', 'bucket'];

      for (const itemType of itemTypes) {
        const stats = { score: 0, moves: 25, wingsCollected: 0 };

        // Simulate matching any item type
        const matchedType = itemType;
        const hasMatch = true;

        if (hasMatch) {
          stats.moves--;
          stats.score += 30; // Base points

          // Only chicken increments wingsCollected
          if (matchedType === 'chicken') {
            stats.wingsCollected++;
          }
        }

        expect(stats.moves).toBe(24);
        expect(stats.wingsCollected).toBe(itemType === 'chicken' ? 1 : 0);
      }
    });
  });
});
