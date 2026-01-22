
import { ItemType } from './types';

export const GRID_SIZE = 8;
export const TILE_SIZE = 70;
export const BOARD_OFFSET_X = 50;
export const BOARD_OFFSET_Y = 100;

export const KFC_RED = 0xE4002B;
export const KFC_WHITE = 0xFFFFFF;
export const KFC_BLACK = 0x000000;
export const KITCHEN_BROWN = 0x8B4513;

export const ITEM_DATA: Record<ItemType, { color: number; label: string; emoji: string }> = {
  chicken: { color: 0xFFA500, label: '🍗', emoji: '🍗' },
  burger: { color: 0xFF6347, label: '🍔', emoji: '🍔' },
  fries: { color: 0xFFD700, label: '🍟', emoji: '🍟' },
  cola: { color: 0x4169E1, label: '🥤', emoji: '🥤' },
  bucket: { color: 0xFFFFFF, label: '🧺', emoji: '🧺' },
  cookie: { color: 0xD2691E, label: '🍪', emoji: '🍪' }
};

export const ITEM_TYPES: ItemType[] = ['chicken', 'burger', 'fries', 'cola', 'bucket', 'cookie'];
