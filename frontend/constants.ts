
import { ItemType } from './types';

export const GAME_URL = 'https://yourstyle.github.io/kfc/';

export const GRID_SIZE = 8;
export const TILE_SIZE = 64;
export const BOARD_PADDING = 20;

export const ROSTICS_RED = 0xE4002B;
export const ROSTICS_WHITE = 0xFFFFFF;
export const ROSTICS_BLACK = 0x000000;

export const ITEM_DATA: Record<ItemType, { label: string; emoji: string; particleColor: number; particleType: 'feather' | 'bubble' | 'crumb' | 'slice'; isObstacle?: boolean }> = {
  drumstick: {
    label: 'Ножка',
    emoji: '🍗',
    particleColor: 0xD4A574,
    particleType: 'feather'
  },
  wing: {
    label: 'Крылышко',
    emoji: '🍖',
    particleColor: 0xC4956A,
    particleType: 'feather'
  },
  burger: {
    label: 'Бургер',
    emoji: '🍔',
    particleColor: 0xF5DEB3,
    particleType: 'crumb'
  },
  fries: {
    label: 'Картофель фри',
    emoji: '🍟',
    particleColor: 0xFFD700,
    particleType: 'slice'
  },
  bucket: {
    label: 'Баскет',
    emoji: '🧺',
    particleColor: 0xE4002B,
    particleType: 'crumb'
  },
  ice_cream: {
    label: 'Мороженое',
    emoji: '🍦',
    particleColor: 0xFFC0CB,
    particleType: 'bubble'
  },
  donut: {
    label: 'Донат',
    emoji: '🍩',
    particleColor: 0xFF69B4,
    particleType: 'crumb'
  },
  cappuccino: {
    label: 'Капучино',
    emoji: '☕',
    particleColor: 0x8B4513,
    particleType: 'bubble'
  },
  obstacle: {
    label: 'Препятствие',
    emoji: '⬛',
    particleColor: 0x333333,
    particleType: 'crumb',
    isObstacle: true
  }
};

export const ITEM_TYPES: ItemType[] = ['drumstick', 'wing', 'burger', 'fries', 'bucket', 'ice_cream', 'donut', 'cappuccino'];

export const TUTORIAL_STEPS = [
  {
    title: "ПРИВЕТ, ШЕФ!",
    text: "Добро пожаловать на кухню ROSTIC'S! Мы подготовили свежие ингредиенты!",
    icon: "👨‍🍳"
  },
  {
    title: "3 В РЯД",
    text: "Собирай заказы, совмещая 3 и более предмета. Чем больше ряд, тем круче эффект!",
    icon: "🍟"
  },
  {
    title: "СПЕЦ-ЭФФЕКТЫ",
    text: "Каждый предмет имеет свои частицы: от перьев курочки до пузырьков колы!",
    icon: "✨"
  },
  {
    title: "СУПЕР-БОНУСЫ",
    text: "Складывай комбо, чтобы получить звание Шефа и собрать больше крылышек!",
    icon: "🚀"
  }
];
