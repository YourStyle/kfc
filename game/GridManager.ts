
import { GRID_SIZE } from '../constants';
import { GridPos } from '../types';

export class GridManager {
  public static getMatches(grid: (Phaser.GameObjects.Container | null)[][]) {
    const matches: { positions: GridPos[] }[] = [];

    // Горизонтальные
    for (let r = 0; r < GRID_SIZE; r++) {
      let count = 1;
      const row = grid[r];
      if (!row) continue; // Защита

      for (let c = 1; c <= GRID_SIZE; c++) {
        const current = row[c]?.getData('type');
        const prev = row[c - 1]?.getData('type');
        
        if (c < GRID_SIZE && current === prev && current !== undefined) {
          count++;
        } else {
          if (count >= 3) {
            const pos = [];
            for (let i = 0; i < count; i++) pos.push({ row: r, col: c - 1 - i });
            matches.push({ positions: pos });
          }
          count = 1;
        }
      }
    }

    // Вертикальные
    for (let c = 0; c < GRID_SIZE; c++) {
      let count = 1;
      for (let r = 1; r <= GRID_SIZE; r++) {
        const current = grid[r]?.[c]?.getData('type');
        const prev = grid[r - 1]?.[c]?.getData('type');
        
        if (r < GRID_SIZE && current === prev && current !== undefined) {
          count++;
        } else {
          if (count >= 3) {
            const pos = [];
            for (let i = 0; i < count; i++) pos.push({ row: r - 1 - i, col: c });
            matches.push({ positions: pos });
          }
          count = 1;
        }
      }
    }
    return matches;
  }

  public static getDropMap(grid: (Phaser.GameObjects.Container | null)[][]) {
    const drops: { item: Phaser.GameObjects.Container, fromRow: number, toRow: number, col: number }[] = [];
    const refills: { row: number, col: number }[] = [];

    for (let c = 0; c < GRID_SIZE; c++) {
      let emptySlots = 0;
      for (let r = GRID_SIZE - 1; r >= 0; r--) {
        if (!grid[r] || grid[r][c] === null) {
          emptySlots++;
        } else if (emptySlots > 0) {
          drops.push({
            item: grid[r][c]!,
            fromRow: r,
            toRow: r + emptySlots,
            col: c
          });
        }
      }
      for (let r = 0; r < emptySlots; r++) {
        refills.push({ row: r, col: c });
      }
    }
    return { drops, refills };
  }
}
