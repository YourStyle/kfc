
export type ItemType = 'drumstick' | 'wing' | 'burger' | 'fries' | 'bucket' | 'ice_cream' | 'donut' | 'cappuccino' | 'obstacle';
export type BonusType = 'none' | 'row' | 'column' | 'color';

export interface GridPos {
  row: number;
  col: number;
}

export interface GameState {
  score: number;
  moves: number;
  isGameOver: boolean;
  collected: Record<string, number>;
}
