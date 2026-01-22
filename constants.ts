
import { ItemType } from './types';

export const GRID_SIZE = 8;
export const TILE_SIZE = 64;
export const BOARD_PADDING = 20;

export const KFC_RED = 0xE4002B;
export const KFC_WHITE = 0xFFFFFF;
export const KFC_BLACK = 0x000000;

export const ITEM_DATA: Record<ItemType, { label: string; emoji: string; particleColor: number; particleType: 'feather' | 'bubble' | 'crumb' | 'slice' }> = {
  chicken: { 
    label: 'Курочка', 
    emoji: '🍗', 
    particleColor: 0xffffff,
    particleType: 'feather'
  },
  burger: { 
    label: 'Бургер', 
    emoji: '🍔', 
    particleColor: 0xF5DEB3,
    particleType: 'crumb'
  },
  fries: { 
    label: 'Картошка', 
    emoji: '🍟', 
    particleColor: 0xFFD700,
    particleType: 'slice'
  },
  cola: { 
    label: 'Кола', 
    emoji: '🥤', 
    particleColor: 0xADD8E6,
    particleType: 'bubble'
  },
  bucket: { 
    label: 'Баскет', 
    emoji: '🧺', 
    particleColor: 0xE4002B,
    particleType: 'crumb'
  },
  // Cookie удален для соответствия предоставленным ассетам
  cookie: { 
    label: 'Печенье', 
    emoji: '🍪', 
    particleColor: 0x5C4033,
    particleType: 'crumb'
  }
};

// Используем только те предметы, для которых есть картинки
export const ITEM_TYPES: ItemType[] = ['chicken', 'burger', 'fries', 'cola', 'bucket'];

export const TUTORIAL_STEPS = [
  {
    title: "ПРИВЕТ, ШЕФ!",
    text: "Добро пожаловать на обновленную кухню KFC. Мы подготовили свежие ингредиенты!",
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
