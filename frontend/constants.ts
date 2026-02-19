
import { ItemType } from './types';

export const GAME_URL = 'https://rosticslegends.ru/match3';

export const GRID_SIZE = 8;
export const TILE_SIZE = 64;
export const BOARD_PADDING = 20;

export const ROSTICS_RED = 0xED1C29;
export const ROSTICS_WHITE = 0xFFFFFF;
export const ROSTICS_BLACK = 0x000000;

export const ITEM_DATA: Record<ItemType, { label: string; emoji: string; particleColor: number; particleType: 'sparkle' | 'bubble' | 'crumb' | 'slice'; isObstacle?: boolean; isFigurine?: boolean }> = {
  drumstick: {
    label: 'Ножка',
    emoji: '🍗',
    particleColor: 0xD4A574,
    particleType: 'sparkle'
  },
  wing: {
    label: 'Крылышко',
    emoji: '🍖',
    particleColor: 0xC4956A,
    particleType: 'sparkle'
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
    particleColor: 0xED1C29,
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
  belka: {
    label: 'Белка',
    emoji: '🐕',
    particleColor: 0xD4A574,
    particleType: 'bubble',
    isFigurine: true
  },
  strelka: {
    label: 'Стрелка',
    emoji: '🐕',
    particleColor: 0xC0C0C0,
    particleType: 'bubble',
    isFigurine: true
  },
  sputnik: {
    label: 'Спутник',
    emoji: '🛰️',
    particleColor: 0x87CEEB,
    particleType: 'bubble',
    isFigurine: true
  },
  vostok: {
    label: 'Восток',
    emoji: '🚀',
    particleColor: 0xFF6347,
    particleType: 'bubble',
    isFigurine: true
  },
  spaceship: {
    label: 'Ракета',
    emoji: '🚀',
    particleColor: 0x4169E1,
    particleType: 'bubble',
    isFigurine: true
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

export const FIGURINE_TYPES: ItemType[] = ['belka', 'strelka', 'sputnik', 'vostok', 'spaceship'];

export const FIGURINE_SPAWN_CHANCE = 0.10; // 10% chance per tile to be a figurine (if none on field)

export const FIGURINE_INFO: Record<string, { name: string; description: string }> = {
  belka: {
    name: 'БЕЛКА',
    description: 'Легендарная собака-космонавт! В 1960 году вместе со Стрелкой совершила орбитальный полёт на корабле «Спутник-5» и благополучно вернулась на Землю.',
  },
  strelka: {
    name: 'СТРЕЛКА',
    description: 'Отважная напарница Белки! Вместе они стали первыми живыми существами, успешно вернувшимися из космического полёта. Настоящие космические герои!',
  },
  sputnik: {
    name: 'СПУТНИК',
    description: 'Первый в мире искусственный спутник Земли! Запущен 4 октября 1957 года. Его знаменитый «бип-бип» услышал весь мир.',
  },
  vostok: {
    name: 'ВОСТОК',
    description: 'Космический корабль, на котором 12 апреля 1961 года Юрий Гагарин совершил первый в истории пилотируемый полёт в космос. Поехали!',
  },
  spaceship: {
    name: 'РАКЕТА',
    description: 'Космическая ракета — символ мечты о звёздах! Каждый запуск открывает новые горизонты и приближает нас к тайнам Вселенной.',
  },
};

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
    text: "Каждый предмет имеет свои частицы: от хрустящих крошек до пузырьков капучино!",
    icon: "✨"
  },
  {
    title: "СУПЕР-БОНУСЫ",
    text: "Складывай комбо, получай звание Шефа и набирай максимум очков!",
    icon: "🚀"
  }
];
