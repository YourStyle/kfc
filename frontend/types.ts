
export type ItemType = 'chicken' | 'burger' | 'fries' | 'cola' | 'bucket' | 'obstacle';
export type BonusType = 'none' | 'row' | 'column' | 'color';

export interface GridPos {
  row: number;
  col: number;
}

export interface GameState {
  score: number;
  moves: number;
  isGameOver: boolean;
  wingsCollected: number;
}
