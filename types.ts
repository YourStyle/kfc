
export type ItemType = 'chicken' | 'burger' | 'fries' | 'cola' | 'bucket' | 'cookie';

export interface GridPos {
  row: number;
  col: number;
}

export interface GameState {
  score: number;
  moves: number;
  isGameOver: boolean;
  level: number;
}
