
import { GRID_SIZE } from '../constants';
import { GridPos } from '../types';

export interface MatchResult {
  positions: GridPos[];
  length: number;
  direction: 'horizontal' | 'vertical';
  type: string;
  row?: number;  // для горизонтальных - какой ряд
  col?: number;  // для вертикальных - какая колонка
}

export class GridManager {
  public static getMatches(grid: (Phaser.GameObjects.Container | null)[][]): MatchResult[] {
    const matches: MatchResult[] = [];

    // Горизонтальные
    for (let r = 0; r < GRID_SIZE; r++) {
      let count = 1;
      const row = grid[r];
      if (!row) continue;

      for (let c = 1; c <= GRID_SIZE; c++) {
        const current = row[c]?.getData('type');
        const prev = row[c - 1]?.getData('type');

        if (c < GRID_SIZE && current === prev && current !== undefined) {
          count++;
        } else {
          if (count >= 3) {
            const pos = [];
            for (let i = 0; i < count; i++) pos.push({ row: r, col: c - 1 - i });
            matches.push({
              positions: pos,
              length: count,
              direction: 'horizontal',
              type: prev,
              row: r
            });
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
            matches.push({
              positions: pos,
              length: count,
              direction: 'vertical',
              type: prev,
              col: c
            });
          }
          count = 1;
        }
      }
    }
    return matches;
  }

  // Получить все позиции элементов определённого типа
  public static getAllOfType(grid: (Phaser.GameObjects.Container | null)[][], type: string): GridPos[] {
    const positions: GridPos[] = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (grid[r]?.[c]?.getData('type') === type) {
          positions.push({ row: r, col: c });
        }
      }
    }
    return positions;
  }

  // Получить все позиции в ряду
  public static getRow(row: number): GridPos[] {
    const positions: GridPos[] = [];
    for (let c = 0; c < GRID_SIZE; c++) {
      positions.push({ row, col: c });
    }
    return positions;
  }

  // Получить все позиции в колонке
  public static getColumn(col: number): GridPos[] {
    const positions: GridPos[] = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      positions.push({ row: r, col });
    }
    return positions;
  }

  // Найти возможный ход (возвращает пару позиций для свапа)
  public static findPossibleMove(grid: (Phaser.GameObjects.Container | null)[][]): { from: GridPos, to: GridPos } | null {
    const directions = [
      { dr: 0, dc: 1 },  // вправо
      { dr: 1, dc: 0 },  // вниз
    ];

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        for (const dir of directions) {
          const nr = r + dir.dr;
          const nc = c + dir.dc;

          if (nr >= GRID_SIZE || nc >= GRID_SIZE) continue;
          if (!grid[r]?.[c] || !grid[nr]?.[nc]) continue;

          // Пробуем свап
          const type1 = grid[r][c]!.getData('type');
          const type2 = grid[nr][nc]!.getData('type');

          // Временно меняем типы для проверки
          grid[r][c]!.setData('type', type2);
          grid[nr][nc]!.setData('type', type1);

          const matches = this.getMatches(grid);

          // Возвращаем обратно
          grid[r][c]!.setData('type', type1);
          grid[nr][nc]!.setData('type', type2);

          if (matches.length > 0) {
            return { from: { row: r, col: c }, to: { row: nr, col: nc } };
          }
        }
      }
    }
    return null;
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
