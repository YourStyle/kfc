import { Application, Container, Sprite, Graphics, Texture, Assets, Text, TextStyle } from 'pixi.js';
import gsap from 'gsap';
import { ITEM_TYPES, ITEM_DATA, FIGURINE_TYPES, FIGURINE_SPAWN_CHANCE } from '../constants';
import { ItemType, GridPos } from '../types';
import { ParticleSystem } from './PixiParticles';

interface TileData {
  type: ItemType;
  sprite: Sprite;
  container: Container;
  row: number;
  col: number;
}

interface LevelConfig {
  gridWidth: number;
  gridHeight: number;
  maxMoves: number;
  itemTypes: string[];
  targets: {
    collect?: Record<string, number>;
    combos?: Record<string, number>;
    min_score?: number;
  };
  obstacles?: { row: number; col: number }[];
}

export class PixiGame {
  private app: Application;
  private gridContainer: Container;
  private uiContainer: Container;
  private particleContainer: Container;
  private grid: (TileData | null)[][] = [];
  private isProcessing = false;
  private stats = {
    score: 0,
    moves: 30,
    collected: { drumstick: 0, wing: 0, burger: 0, fries: 0, bucket: 0, ice_cream: 0, donut: 0, cappuccino: 0, belka: 0, strelka: 0, sputnik: 0, vostok: 0, spaceship: 0 }
  };
  private dragStart: GridPos | null = null;
  private particles: ParticleSystem;
  private textures: Record<string, Texture> = {};
  private scale = 1;
  private gridSize = 8; // Dynamic grid size (7 for mobile, 8 for desktop)
  private tileSize = 64; // Tile size always 64
  private spriteSize = 48; // Sprite size inside tile (smaller on mobile)
  private hintTimeout: ReturnType<typeof setTimeout> | null = null;
  private hintTweens: gsap.core.Tween[] = [];
  private onStatsUpdate: (stats: typeof this.stats) => void;
  private onGameOver: (finalStats: { score: number; moves: number; collected: Record<string, number> }) => void;
  private onAssetsLoaded: () => void;
  private onBasketHit: () => void;
  private onFigurineAppeared: (type: string) => void;
  private levelConfig?: LevelConfig;
  private activeItemTypes: ItemType[] = ITEM_TYPES;

  constructor(
    container: HTMLElement,
    onStatsUpdate: (stats: typeof PixiGame.prototype.stats) => void,
    onGameOver: (finalStats: { score: number; moves: number; collected: Record<string, number> }) => void,
    onAssetsLoaded: () => void,
    onBasketHit: () => void,
    onFigurineAppeared: (type: string) => void,
    levelConfig?: LevelConfig
  ) {
    this.onStatsUpdate = onStatsUpdate;
    this.onGameOver = onGameOver;
    this.onAssetsLoaded = onAssetsLoaded;
    this.onBasketHit = onBasketHit;
    this.onFigurineAppeared = onFigurineAppeared;
    this.levelConfig = levelConfig;

    // Apply level config if provided
    if (levelConfig) {
      this.stats.moves = levelConfig.maxMoves;
      // Filter item types to only use those available in the level
      this.activeItemTypes = levelConfig.itemTypes.filter(
        (type): type is ItemType => ITEM_TYPES.includes(type as ItemType)
      ) as ItemType[];
      if (this.activeItemTypes.length === 0) {
        this.activeItemTypes = ITEM_TYPES;
      }
    }

    this.app = new Application();
    this.gridContainer = new Container();
    this.uiContainer = new Container();
    this.particleContainer = new Container();
    this.particles = new ParticleSystem(this.particleContainer);

    this.init(container);
  }

  private async init(container: HTMLElement) {
    // Preload brand fonts for Canvas 2D rendering (PixiJS Text)
    await document.fonts.ready;

    // Определяем мобильное устройство
    const isMobile = window.innerWidth <= 600;

    // Use level config for grid size if provided, otherwise default to 7x7
    if (this.levelConfig) {
      this.gridSize = Math.max(this.levelConfig.gridWidth, this.levelConfig.gridHeight);
    } else {
      this.gridSize = 7; // Default grid size per requirements
    }

    this.tileSize = isMobile ? 48 : 64; // Меньшие тайлы на мобильных
    this.spriteSize = isMobile ? 36 : 48; // Размер спрайта внутри тайла

    // Фиксированный размер канваса
    const canvasWidth = Math.min(600, window.innerWidth);
    const canvasHeight = Math.min(800, window.innerHeight);
    this.scale = 1; // Не масштабируем stage

    await this.app.init({
      width: canvasWidth,
      height: canvasHeight,
      backgroundAlpha: 0, // Transparent background
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
    });

    container.appendChild(this.app.canvas);

    // Загружаем текстуры
    await this.loadAssets();

    // Настраиваем контейнеры
    this.app.stage.addChild(this.gridContainer);
    this.app.stage.addChild(this.particleContainer);
    this.app.stage.addChild(this.uiContainer);

    // Центрируем поле с учётом UI сверху и снизу
    const gridWidth = this.gridSize * this.tileSize;
    const gridHeight = this.gridSize * this.tileSize;
    // Считаем кол-во целей чтобы сдвинуть сетку если целей на 2 строки
    const targetCount = (this.levelConfig?.targets?.collect ? Object.keys(this.levelConfig.targets.collect).length : 0)
      + (this.levelConfig?.targets?.min_score ? 1 : 0);
    const extraOffset = targetCount > 3 ? 30 : 0;
    const topOffset = (isMobile ? 140 : 120) + extraOffset;
    const availableHeight = canvasHeight - topOffset - 50; // 50px для нижнего UI

    this.gridContainer.x = (canvasWidth - gridWidth) / 2;
    this.gridContainer.y = topOffset + Math.max(0, (availableHeight - gridHeight) / 2);

    // Рисуем фон поля
    this.drawBoardBackground();

    // Создаём сетку с валидацией (гарантируем наличие ходов)
    await this.createValidGrid();

    // Настраиваем ввод
    this.setupInput();

    // Запускаем таймер подсказки
    this.startHintTimer();

    this.onAssetsLoaded();
    this.onStatsUpdate({ ...this.stats });
  }

  private async loadAssets() {
    const basePath = import.meta.env.BASE_URL || '/';

    for (const type of [...ITEM_TYPES, ...FIGURINE_TYPES]) {
      try {
        const path = `${basePath}images/${type}.png`;
        this.textures[type] = await Assets.load(path);
      } catch {
        // Fallback: generate texture from emoji for items without PNG
        this.textures[type] = this.createEmojiTexture(ITEM_DATA[type].emoji);
      }
    }
  }

  private createEmojiTexture(emoji: string): Texture {
    const canvas = document.createElement('canvas');
    const size = 128;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.font = `${Math.floor(size * 0.75)}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, size / 2, size / 2);
    return Texture.from(canvas);
  }

  // Helper to draw asymmetric rounded rectangle (sci-fi style: small-big-small-big corners)
  private drawSciFiRect(g: Graphics, x: number, y: number, w: number, h: number, r1: number, r2: number) {
    // r1 = small radius (top-left, bottom-right), r2 = big radius (top-right, bottom-left)
    g.moveTo(x + r1, y);
    g.lineTo(x + w - r2, y);
    g.quadraticCurveTo(x + w, y, x + w, y + r2);
    g.lineTo(x + w, y + h - r1);
    g.quadraticCurveTo(x + w, y + h, x + w - r1, y + h);
    g.lineTo(x + r2, y + h);
    g.quadraticCurveTo(x, y + h, x, y + h - r2);
    g.lineTo(x, y + r1);
    g.quadraticCurveTo(x, y, x + r1, y);
    g.closePath();
  }

  private drawBoardBackground() {
    const bg = new Graphics();
    const padding = 16;
    const size = this.gridSize * this.tileSize + padding * 2;

    // Outer board frame
    this.drawSciFiRect(bg, -padding, -padding, size, size, 8, 24);
    bg.fill({ color: 0x1a1a1a, alpha: 0.85 });
    bg.stroke({ color: 0x3a3a3a, width: 2 });

    this.gridContainer.addChild(bg);

    // Draw individual cell backgrounds with dark theme and sci-fi corners
    const cellBg = new Graphics();
    const cellPadding = 2;
    const cellSize = this.tileSize - cellPadding * 2;

    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        const x = col * this.tileSize + cellPadding;
        const y = row * this.tileSize + cellPadding;

        // Alternate colors for subtle checkerboard pattern - brand dark theme
        const isLight = (row + col) % 2 === 0;
        const cellColor = isLight ? 0x252525 : 0x1e1e1e;

        this.drawSciFiRect(cellBg, x, y, cellSize, cellSize, 4, 10);
        cellBg.fill({ color: cellColor, alpha: 0.7 });
      }
    }

    this.gridContainer.addChild(cellBg);
  }

  // Создаёт сетку с гарантией наличия валидных ходов
  private async createValidGrid(): Promise<void> {
    const maxAttempts = 10;
    let attempts = 0;

    do {
      // Очищаем предыдущую сетку если была
      if (this.grid.length > 0) {
        for (let row = 0; row < this.gridSize; row++) {
          for (let col = 0; col < this.gridSize; col++) {
            const tile = this.grid[row]?.[col];
            if (tile) {
              gsap.killTweensOf(tile.sprite);
              gsap.killTweensOf(tile.container);
              this.gridContainer.removeChild(tile.container);
            }
          }
        }
      }

      this.createGrid();
      attempts++;

      // Ждём завершения анимации появления
      await this.delay(this.gridSize * this.gridSize * 20 + 300);

    } while (!this.findValidMove() && attempts < maxAttempts);
  }

  private createGrid() {
    this.grid = [];

    for (let row = 0; row < this.gridSize; row++) {
      this.grid[row] = [];
      for (let col = 0; col < this.gridSize; col++) {
        // Check if this position should be an obstacle
        const isObstaclePos = this.isObstaclePosition(row, col);
        const type = isObstaclePos ? 'obstacle' : this.getRandomType(row, col);
        const tile = this.createTile(type, row, col);
        this.grid[row][col] = tile;

        // Анимация появления
        tile.container.scale.set(0);
        gsap.to(tile.container.scale, {
          x: 1,
          y: 1,
          duration: 0.3,
          delay: (row * this.gridSize + col) * 0.02,
          ease: 'back.out(1.7)',
          onComplete: () => {
            // Запускаем floating анимацию после появления (не для препятствий)
            if (!isObstaclePos) {
              this.startFloatingAnimation(tile);
            }
          }
        });
      }
    }
  }

  private getRandomType(row: number, col: number): ItemType {
    // Попробуем спавнить фигурку
    const figurine = this.trySpawnFigurine();
    if (figurine) return figurine;

    const available = [...this.activeItemTypes];

    // Избегаем начальных совпадений
    const toRemove: ItemType[] = [];

    if (col >= 2) {
      const left1 = this.grid[row]?.[col - 1]?.type;
      const left2 = this.grid[row]?.[col - 2]?.type;
      if (left1 && left1 === left2 && !this.isFigurine(left1)) toRemove.push(left1);
    }

    if (row >= 2) {
      const up1 = this.grid[row - 1]?.[col]?.type;
      const up2 = this.grid[row - 2]?.[col]?.type;
      if (up1 && up1 === up2 && !this.isFigurine(up1)) toRemove.push(up1);
    }

    const filtered = available.filter(t => !toRemove.includes(t));
    const pool = filtered.length > 0 ? filtered : available;

    return pool[Math.floor(Math.random() * pool.length)];
  }

  // Умный выбор типа для заполнения пустот - уменьшает вероятность каскадов
  private getSmartRandomType(row: number, col: number): ItemType {
    // Попробуем спавнить фигурку
    const figurine = this.trySpawnFigurine();
    if (figurine) return figurine;

    // 25% шанс полностью случайного выбора (разрешаем некоторые каскады)
    if (Math.random() < 0.25) {
      return this.activeItemTypes[Math.floor(Math.random() * this.activeItemTypes.length)];
    }

    const available = [...this.activeItemTypes];
    const toAvoid: ItemType[] = [];

    // Проверяем горизонтальные совпадения (слева)
    if (col >= 2) {
      const left1 = this.grid[row]?.[col - 1]?.type;
      const left2 = this.grid[row]?.[col - 2]?.type;
      if (left1 && left1 === left2) toAvoid.push(left1);
    }

    // Проверяем горизонтальные совпадения (справа)
    if (col <= this.gridSize - 3) {
      const right1 = this.grid[row]?.[col + 1]?.type;
      const right2 = this.grid[row]?.[col + 2]?.type;
      if (right1 && right1 === right2) toAvoid.push(right1);
    }

    // Проверяем совпадения посередине (слева и справа)
    if (col >= 1 && col <= this.gridSize - 2) {
      const left = this.grid[row]?.[col - 1]?.type;
      const right = this.grid[row]?.[col + 1]?.type;
      if (left && left === right) toAvoid.push(left);
    }

    // Проверяем вертикальные совпадения (сверху)
    if (row >= 2) {
      const up1 = this.grid[row - 1]?.[col]?.type;
      const up2 = this.grid[row - 2]?.[col]?.type;
      if (up1 && up1 === up2) toAvoid.push(up1);
    }

    // Проверяем вертикальные совпадения (снизу)
    if (row <= this.gridSize - 3) {
      const down1 = this.grid[row + 1]?.[col]?.type;
      const down2 = this.grid[row + 2]?.[col]?.type;
      if (down1 && down1 === down2) toAvoid.push(down1);
    }

    // Проверяем совпадения посередине (сверху и снизу)
    if (row >= 1 && row <= this.gridSize - 2) {
      const up = this.grid[row - 1]?.[col]?.type;
      const down = this.grid[row + 1]?.[col]?.type;
      if (up && up === down) toAvoid.push(up);
    }

    // Убираем дубликаты
    const uniqueToAvoid = [...new Set(toAvoid)];
    const filtered = available.filter(t => !uniqueToAvoid.includes(t));
    const pool = filtered.length > 0 ? filtered : available;

    return pool[Math.floor(Math.random() * pool.length)];
  }

  private createTile(type: ItemType, row: number, col: number): TileData {
    const container = new Container();
    container.x = col * this.tileSize + this.tileSize / 2;
    container.y = row * this.tileSize + this.tileSize / 2;

    const isObstacle = type === 'obstacle';
    const isFigurineType = this.isFigurine(type);

    // Фон тайла с sci-fi углами
    const bg = new Graphics();
    const tileOffset = 4;
    const tileBgSize = this.tileSize - 8;
    this.drawSciFiRect(bg, -this.tileSize / 2 + tileOffset, -this.tileSize / 2 + tileOffset, tileBgSize, tileBgSize, 4, 12);
    if (isObstacle) {
      // Тёмный фон для препятствий
      bg.fill({ color: 0x1a1a1a, alpha: 0.9 });
      bg.stroke({ color: 0x555555, width: 2 });
    } else if (isFigurineType) {
      // Красный фон для фигурок (бренд)
      bg.fill({ color: 0x2a1a1a, alpha: 0.8 });
      bg.stroke({ color: 0xED1C29, width: 2 });
    } else {
      // Прозрачный фон с лёгкой рамкой для обычных тайлов
      bg.fill({ color: 0x000000, alpha: 0 });
      bg.stroke({ color: 0x444444, width: 1.5, alpha: 0.5 });
    }
    container.addChild(bg);

    // Свечение для фигурок
    if (isFigurineType) {
      const glow = new Graphics();
      glow.circle(0, 0, this.spriteSize * 0.6);
      glow.fill({ color: 0xED1C29, alpha: 0.15 });
      container.addChild(glow);

      // Notify about figurine appearance
      setTimeout(() => this.onFigurineAppeared(type), 0);
    }

    // Спрайт (только для обычных тайлов)
    let sprite: Sprite;
    if (isObstacle) {
      // Космический астероид / кристалл
      sprite = new Sprite();
      sprite.anchor.set(0.5);

      const size = this.spriteSize * 0.85;
      const asteroidGraphic = new Graphics();

      // Внешнее свечение (glow effect)
      asteroidGraphic.circle(0, 0, size * 0.55);
      asteroidGraphic.fill({ color: 0x666666, alpha: 0.15 });

      // Основная форма астероида (многоугольник)
      const points = [
        { x: 0, y: -size * 0.45 },           // top
        { x: size * 0.35, y: -size * 0.25 }, // top-right
        { x: size * 0.45, y: size * 0.1 },   // right
        { x: size * 0.25, y: size * 0.4 },   // bottom-right
        { x: -size * 0.2, y: size * 0.45 },  // bottom
        { x: -size * 0.45, y: size * 0.15 }, // left
        { x: -size * 0.35, y: -size * 0.3 }, // top-left
      ];

      // Тёмная основа астероида
      asteroidGraphic.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        asteroidGraphic.lineTo(points[i].x, points[i].y);
      }
      asteroidGraphic.closePath();
      asteroidGraphic.fill({ color: 0x2a2a2a });
      asteroidGraphic.stroke({ color: 0x555555, width: 2 });

      // Светящиеся грани
      asteroidGraphic.moveTo(points[0].x, points[0].y);
      asteroidGraphic.lineTo(0, 0);
      asteroidGraphic.lineTo(points[1].x, points[1].y);
      asteroidGraphic.closePath();
      asteroidGraphic.fill({ color: 0xED1C29, alpha: 0.25 });

      asteroidGraphic.moveTo(points[2].x, points[2].y);
      asteroidGraphic.lineTo(0, 0);
      asteroidGraphic.lineTo(points[3].x, points[3].y);
      asteroidGraphic.closePath();
      asteroidGraphic.fill({ color: 0xF4A698, alpha: 0.2 });

      // Центральное ядро
      asteroidGraphic.circle(0, 0, size * 0.12);
      asteroidGraphic.fill({ color: 0xED1C29, alpha: 0.6 });

      // Маленькие "звёздочки" на поверхности
      asteroidGraphic.circle(-size * 0.15, -size * 0.2, 2);
      asteroidGraphic.fill({ color: 0xffffff, alpha: 0.9 });
      asteroidGraphic.circle(size * 0.2, size * 0.15, 1.5);
      asteroidGraphic.fill({ color: 0xffffff, alpha: 0.7 });
      asteroidGraphic.circle(-size * 0.25, size * 0.1, 1);
      asteroidGraphic.fill({ color: 0xffffff, alpha: 0.6 });

      container.addChild(asteroidGraphic);
    } else {
      sprite = new Sprite(this.textures[type]);
      sprite.anchor.set(0.5);
      sprite.width = this.spriteSize;
      sprite.height = this.spriteSize;
      container.addChild(sprite);
    }

    // Интерактивность (не для препятствий; фигурки интерактивны - их можно менять)
    if (!isObstacle) {
      container.eventMode = 'static';
      container.cursor = 'pointer';
    } else {
      container.eventMode = 'none';
    }

    this.gridContainer.addChild(container);

    return { type, sprite, container, row, col };
  }

  private startFloatingAnimation(tile: TileData) {
    const delay = Math.random() * 2;
    const duration = 2 + Math.random();

    gsap.to(tile.sprite, {
      y: -3,
      duration,
      delay,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut'
    });
  }

  private setupInput() {
    this.gridContainer.eventMode = 'static';

    this.gridContainer.on('pointerdown', (e) => {
      if (this.isProcessing) return;

      const pos = this.getGridPos(e.globalX, e.globalY);
      if (pos && this.isValidPos(pos)) {
        this.dragStart = pos;
      }
    });

    this.gridContainer.on('pointerup', (e) => {
      if (!this.dragStart || this.isProcessing) return;

      const pos = this.getGridPos(e.globalX, e.globalY);
      if (pos && this.isValidPos(pos)) {
        const dx = pos.col - this.dragStart.col;
        const dy = pos.row - this.dragStart.row;

        if (Math.abs(dx) + Math.abs(dy) === 1) {
          this.trySwap(this.dragStart, pos);
        } else if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1 && (dx !== 0 || dy !== 0)) {
          // Свайп в пределах одной клетки
          const target = {
            row: this.dragStart.row + Math.sign(dy),
            col: this.dragStart.col + Math.sign(dx)
          };
          if (this.isValidPos(target)) {
            this.trySwap(this.dragStart, target);
          }
        }
      }

      this.dragStart = null;
    });

    this.gridContainer.on('pointermove', (e) => {
      if (!this.dragStart || this.isProcessing) return;

      const pos = this.getGridPos(e.globalX, e.globalY);
      if (pos && this.isValidPos(pos)) {
        const dx = pos.col - this.dragStart.col;
        const dy = pos.row - this.dragStart.row;

        // Если свайпнули на соседнюю клетку
        if (Math.abs(dx) + Math.abs(dy) === 1) {
          this.trySwap(this.dragStart, pos);
          this.dragStart = null;
        }
      }
    });
  }

  private getGridPos(globalX: number, globalY: number): GridPos | null {
    const localX = globalX - this.gridContainer.x;
    const localY = globalY - this.gridContainer.y;
    const col = Math.floor(localX / this.tileSize);
    const row = Math.floor(localY / this.tileSize);
    return { row, col };
  }

  private isValidPos(pos: GridPos): boolean {
    return pos.row >= 0 && pos.row < this.gridSize && pos.col >= 0 && pos.col < this.gridSize;
  }

  private isObstacle(row: number, col: number): boolean {
    const tile = this.grid[row]?.[col];
    return tile?.type === 'obstacle';
  }

  private isObstaclePosition(row: number, col: number): boolean {
    if (!this.levelConfig?.obstacles) return false;
    return this.levelConfig.obstacles.some(o => o.row === row && o.col === col);
  }

  private isFigurine(type: ItemType): boolean {
    return FIGURINE_TYPES.includes(type);
  }

  private countFigurinesOnField(): number {
    let count = 0;
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        const tile = this.grid[row]?.[col];
        if (tile && this.isFigurine(tile.type)) {
          count++;
        }
      }
    }
    return count;
  }

  private trySpawnFigurine(): ItemType | null {
    if (this.countFigurinesOnField() >= 1) return null;
    if (Math.random() >= FIGURINE_SPAWN_CHANCE) return null;
    return FIGURINE_TYPES[Math.floor(Math.random() * FIGURINE_TYPES.length)];
  }

  private async trySwap(from: GridPos, to: GridPos) {
    this.isProcessing = true;
    this.clearHint();

    const tile1 = this.grid[from.row][from.col];
    const tile2 = this.grid[to.row][to.col];

    // Prevent swapping obstacles
    if (!tile1 || !tile2 || tile1.type === 'obstacle' || tile2.type === 'obstacle') {
      this.isProcessing = false;
      this.startHintTimer();
      return;
    }

    // Анимация свапа
    await this.animateSwap(tile1, tile2);

    // Меняем в массиве
    this.grid[from.row][from.col] = tile2;
    this.grid[to.row][to.col] = tile1;
    tile1.row = to.row;
    tile1.col = to.col;
    tile2.row = from.row;
    tile2.col = from.col;

    // Проверяем совпадения
    const matches = this.findMatches();

    if (matches.length > 0) {
      this.stats.moves--;
      this.onStatsUpdate({ ...this.stats });
      await this.processMatches(matches);
    } else {
      // Возвращаем назад
      await this.animateSwap(tile1, tile2);
      this.grid[from.row][from.col] = tile1;
      this.grid[to.row][to.col] = tile2;
      tile1.row = from.row;
      tile1.col = from.col;
      tile2.row = to.row;
      tile2.col = to.col;
    }

    if (this.stats.moves <= 0) {
      this.vibrate([40, 30, 40, 30, 60]);
      this.onGameOver({ ...this.stats });
    }

    this.isProcessing = false;
    this.startHintTimer();
  }

  private animateSwap(tile1: TileData, tile2: TileData): Promise<void> {
    return new Promise((resolve) => {
      const x1 = tile1.container.x;
      const y1 = tile1.container.y;
      const x2 = tile2.container.x;
      const y2 = tile2.container.y;

      gsap.to(tile1.container, { x: x2, y: y2, duration: 0.2, ease: 'power2.out' });
      gsap.to(tile2.container, { x: x1, y: y1, duration: 0.2, ease: 'power2.out', onComplete: resolve });
    });
  }

  private findMatches(): GridPos[][] {
    const matches: GridPos[][] = [];
    const visited = new Set<string>();

    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        const tile = this.grid[row][col];
        // Skip empty cells, obstacles, and figurines (figurines don't match)
        if (!tile || tile.type === 'obstacle' || this.isFigurine(tile.type)) continue;

        // Горизонтальная проверка
        if (col <= this.gridSize - 3) {
          const match: GridPos[] = [{ row, col }];
          for (let c = col + 1; c < this.gridSize; c++) {
            const nextTile = this.grid[row][c];
            if (nextTile && nextTile.type !== 'obstacle' && !this.isFigurine(nextTile.type) && nextTile.type === tile.type) {
              match.push({ row, col: c });
            } else break;
          }
          if (match.length >= 3) {
            const key = match.map(p => `${p.row},${p.col}`).join('|');
            if (!visited.has(key)) {
              visited.add(key);
              matches.push(match);
            }
          }
        }

        // Вертикальная проверка
        if (row <= this.gridSize - 3) {
          const match: GridPos[] = [{ row, col }];
          for (let r = row + 1; r < this.gridSize; r++) {
            const nextTile = this.grid[r][col];
            if (nextTile && nextTile.type !== 'obstacle' && !this.isFigurine(nextTile.type) && nextTile.type === tile.type) {
              match.push({ row: r, col });
            } else break;
          }
          if (match.length >= 3) {
            const key = match.map(p => `${p.row},${p.col}`).join('|');
            if (!visited.has(key)) {
              visited.add(key);
              matches.push(match);
            }
          }
        }
      }
    }

    return matches;
  }

  private async processMatches(matches: GridPos[][]) {
    let combo = 0;

    while (matches.length > 0) {
      combo++;

      // Собираем все позиции матчей для проверки смежных фигурок
      const allMatchedPositions = new Set<string>();
      for (const match of matches) {
        for (const pos of match) {
          allMatchedPositions.add(`${pos.row},${pos.col}`);
        }
      }

      // Удаляем совпадения
      for (const match of matches) {
        const points = match.length * 10 * combo;
        this.stats.score += points;

        // Центр матча для эффектов
        const centerIdx = Math.floor(match.length / 2);
        const centerTile = this.grid[match[centerIdx].row][match[centerIdx].col];

        // Специальные эффекты для 4+ в ряд
        if (match.length >= 4 && centerTile) {
          const centerX = this.gridContainer.x + centerTile.container.x;
          const centerY = this.gridContainer.y + centerTile.container.y;
          if (match.length === 4) {
            this.showSpecialEffect(centerX, centerY, 'ХРУСТЯЩЕ!', 0xF4A698);
          } else if (match.length >= 5) {
            this.showSpecialEffect(centerX, centerY, 'ГОРЯЧО!', 0xED1C29);
          }
        }

        for (const pos of match) {
          const tile = this.grid[pos.row][pos.col];
          if (tile) {
            // Координаты в системе stage
            const stageX = this.gridContainer.x + tile.container.x;
            const stageY = this.gridContainer.y + tile.container.y;
            this.particles.emit(stageX, stageY, tile.type);
            if (match.length >= 4) {
              this.particles.emit(stageX, stageY, tile.type); // Двойные частицы
            }

            // Собираем все типы предметов
            if (tile.type !== 'obstacle') {
              this.collectItem(stageX, stageY, tile.type);
            }

            // Анимация исчезновения
            gsap.to(tile.container.scale, {
              x: 0,
              y: 0,
              duration: 0.2,
              ease: 'back.in(2)',
              onComplete: () => {
                this.gridContainer.removeChild(tile.container);
              }
            });

            this.grid[pos.row][pos.col] = null;
          }
        }
      }

      // Проверяем фигурки, смежные с удалёнными тайлами — собираем их
      const adjacentDirs = [{ dr: -1, dc: 0 }, { dr: 1, dc: 0 }, { dr: 0, dc: -1 }, { dr: 0, dc: 1 }];
      const figurinesToCollect = new Set<string>();
      for (const key of allMatchedPositions) {
        const [r, c] = key.split(',').map(Number);
        for (const { dr, dc } of adjacentDirs) {
          const nr = r + dr, nc = c + dc;
          const fKey = `${nr},${nc}`;
          if (nr >= 0 && nr < this.gridSize && nc >= 0 && nc < this.gridSize && !allMatchedPositions.has(fKey)) {
            const tile = this.grid[nr]?.[nc];
            if (tile && this.isFigurine(tile.type)) {
              figurinesToCollect.add(fKey);
            }
          }
        }
      }

      for (const fKey of figurinesToCollect) {
        const [r, c] = fKey.split(',').map(Number);
        const tile = this.grid[r][c];
        if (tile) {
          const stageX = this.gridContainer.x + tile.container.x;
          const stageY = this.gridContainer.y + tile.container.y;

          this.stats.score += 50;
          this.particles.emit(stageX, stageY, tile.type);
          this.particles.emit(stageX, stageY, tile.type);
          this.collectItem(stageX, stageY, tile.type);
          this.showSpecialEffect(stageX, stageY, 'БОНУС!', 0xED1C29);

          gsap.to(tile.container.scale, {
            x: 0, y: 0, duration: 0.3, ease: 'back.in(2)',
            onComplete: () => this.gridContainer.removeChild(tile.container)
          });

          this.grid[r][c] = null;
        }
      }

      // Показываем комбо
      if (combo >= 2) {
        this.showComboText(combo);
        // Haptic feedback для комбо
        this.vibrate(combo >= 3 ? [30, 20, 30] : [20]);
      } else if (matches.some(m => m.length >= 4)) {
        // Haptic для длинных матчей
        this.vibrate([15, 10, 15]);
      }

      this.onStatsUpdate({ ...this.stats });

      await this.delay(250);

      // Цикл заполнения пустот
      let hasMovement = true;
      while (hasMovement) {
        hasMovement = false;

        // 1. Падение вниз
        const dropped = await this.dropTiles();
        if (dropped) hasMovement = true;

        // 2. Горизонтальный каскад (внутри уже есть цикл с падениями)
        const pulled = await this.horizontalPull();
        if (pulled) hasMovement = true;

        // 3. Спавн новых тайлов сверху
        const filled = await this.fillFromTop();
        if (filled) hasMovement = true;
      }

      // Ищем новые совпадения
      matches = this.findMatches();
    }

    // Проверяем, есть ли доступные ходы
    if (!this.findValidMove()) {
      await this.performGeneralCleanup();
    }
  }

  // "Генеральная уборка" - удаляем все элементы и создаём новые
  private async performGeneralCleanup(): Promise<void> {
    // Центр игрового поля
    const fieldCenterX = this.gridContainer.x + (this.gridSize * this.tileSize) / 2;
    const fieldCenterY = this.gridContainer.y + (this.gridSize * this.tileSize) / 2;

    // Показываем текст по центру поля (медленная анимация)
    this.showSpecialEffect(
      fieldCenterX,
      fieldCenterY,
      'ГЕНЕРАЛЬНАЯ УБОРКА!',
      0xED1C29,
      true  // slow mode
    );

    await this.delay(1500); // Ждём пока надпись покажется

    // Удаляем все не-препятствия с анимацией
    const removeAnimations: Promise<void>[] = [];

    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        const tile = this.grid[row][col];
        if (tile && tile.type !== 'obstacle') {
          const delay = (row + col) * 0.03; // Волновой эффект

          removeAnimations.push(
            new Promise((resolve) => {
              gsap.to(tile.container, {
                alpha: 0,
                rotation: Math.PI,
                scale: 0,
                duration: 0.3,
                delay,
                ease: 'back.in(2)',
                onComplete: () => {
                  this.gridContainer.removeChild(tile.container);
                  resolve();
                }
              });
            })
          );

          this.grid[row][col] = null;
        }
      }
    }

    await Promise.all(removeAnimations);
    await this.delay(200);

    // Заполняем поле новыми элементами (убедимся что есть ходы)
    await this.refillBoardWithValidMoves();
  }

  // Заполняем поле новыми элементами, гарантируя наличие ходов
  private async refillBoardWithValidMoves(): Promise<void> {
    let attempts = 0;
    const maxAttempts = 10;

    do {
      // Заполняем пустые ячейки
      const animations: Promise<void>[] = [];

      for (let col = 0; col < this.gridSize; col++) {
        let emptyCount = 0;

        for (let row = 0; row < this.gridSize; row++) {
          if (!this.grid[row][col]) {
            emptyCount++;
            const type = this.getSmartRandomType(row, col);
            const tile = this.createTile(type, row, col);
            this.grid[row][col] = tile;

            const startY = -this.tileSize * emptyCount;
            tile.container.y = startY;
            tile.container.alpha = 0;

            const targetY = row * this.tileSize + this.tileSize / 2;
            const delay = col * 0.05 + emptyCount * 0.03;

            animations.push(
              new Promise((resolve) => {
                gsap.to(tile.container, { alpha: 1, duration: 0.1, delay });
                gsap.to(tile.container, {
                  y: targetY,
                  duration: 0.25,
                  delay,
                  ease: 'bounce.out',
                  onComplete: () => {
                    this.startFloatingAnimation(tile);
                    resolve();
                  }
                });
              })
            );
          }
        }
      }

      await Promise.all(animations);
      attempts++;

      // Проверяем на совпадения и убираем их
      let matches = this.findMatches();
      while (matches.length > 0) {
        // Тихо убираем совпадения без анимации и очков
        for (const match of matches) {
          for (const pos of match) {
            const tile = this.grid[pos.row][pos.col];
            if (tile && tile.type !== 'obstacle') {
              this.gridContainer.removeChild(tile.container);
              this.grid[pos.row][pos.col] = null;
            }
          }
        }
        // Заполняем снова (включая ячейки под препятствиями)
        await this.dropTiles();
        await this.horizontalPull();
        await this.fillFromTop();
        matches = this.findMatches();
      }

      // После основного заполнения - убедимся что нет пустот под препятствиями
      let hasEmpty = true;
      while (hasEmpty) {
        hasEmpty = false;
        await this.dropTiles();
        const pulled = await this.horizontalPull();
        const filled = await this.fillFromTop();
        if (pulled || filled) hasEmpty = true;
      }

    } while (!this.findValidMove() && attempts < maxAttempts);
  }

  private showComboText(combo: number) {
    const texts = ['', '', 'ВКУСНО!', 'СОЧНО!', 'КОМБО!', 'ШЕФ!'];
    const text = texts[Math.min(combo, 5)];

    const style = new TextStyle({
      fontFamily: 'RosticsCeraCondensed, sans-serif',
      fontSize: 48,
      fontWeight: 'bold',
      fill: '#ED1C29',
      stroke: { color: '#ffffff', width: 6 },
    });

    const label = new Text({ text, style });
    label.anchor.set(0.5);
    label.x = this.gridContainer.x + (this.gridSize * this.tileSize) / 2;
    label.y = this.gridContainer.y + (this.gridSize * this.tileSize) / 2;
    label.scale.set(0);

    this.uiContainer.addChild(label);

    gsap.to(label.scale, {
      x: 1.2,
      y: 1.2,
      duration: 0.3,
      ease: 'back.out(2)',
      onComplete: () => {
        gsap.to(label, {
          alpha: 0,
          y: label.y - 50,
          duration: 0.4,
          delay: 0.3,
          onComplete: () => this.uiContainer.removeChild(label)
        });
      }
    });
  }

  private showSpecialEffect(x: number, y: number, text: string, color: number, slow = false) {
    // Вспышка
    const flash = new Graphics();
    flash.circle(0, 0, slow ? 80 : 50);
    flash.fill({ color, alpha: 0.5 });
    flash.x = x;
    flash.y = y;
    this.app.stage.addChild(flash);

    gsap.to(flash, {
      alpha: 0,
      width: slow ? 300 : 200,
      height: slow ? 300 : 200,
      duration: slow ? 0.8 : 0.4,
      ease: 'power2.out',
      onComplete: () => {
        this.app.stage.removeChild(flash);
        flash.destroy();
      }
    });

    // Текст
    const style = new TextStyle({
      fontFamily: 'RosticsCeraCondensed, sans-serif',
      fontSize: slow ? 36 : 42, // Чуть меньше чтобы влезло
      fontWeight: 'bold',
      fill: '#ffffff',
      stroke: { color: '#151515', width: 6 },
    });

    const label = new Text({ text, style });
    label.anchor.set(0.5);
    label.x = x;
    label.y = y;
    label.scale.set(0);
    this.app.stage.addChild(label);

    const scaleDuration = slow ? 0.5 : 0.3;
    const holdDelay = slow ? 0.8 : 0.3;
    const fadeOutDuration = slow ? 0.6 : 0.4;

    gsap.to(label.scale, {
      x: 1.3,
      y: 1.3,
      duration: scaleDuration,
      ease: 'back.out(2)',
      onComplete: () => {
        gsap.to(label, {
          alpha: 0,
          y: label.y - 40,
          duration: fadeOutDuration,
          delay: holdDelay,
          onComplete: () => {
            this.app.stage.removeChild(label);
            label.destroy();
          }
        });
      }
    });
  }

  private collectItem(startX: number, startY: number, itemType: string) {
    // Сразу увеличиваем счётчик (до анимации, чтобы данные были актуальны при game over)
    if (this.stats.collected[itemType] !== undefined) {
      this.stats.collected[itemType]++;
    }
    this.onStatsUpdate({ ...this.stats });

    // Создаём летящий предмет для визуального эффекта
    const texture = this.textures[itemType] || this.textures['drumstick'];
    const flyer = new Sprite(texture);
    flyer.anchor.set(0.5);
    flyer.width = this.tileSize * 0.6;
    flyer.height = this.tileSize * 0.6;
    flyer.x = startX;
    flyer.y = startY;
    this.app.stage.addChild(flyer);

    // Целевая позиция - баскет в UI (примерно слева вверху)
    const targetX = 80;
    const targetY = 90;

    gsap.to(flyer, {
      x: targetX,
      y: targetY,
      width: this.tileSize * 0.2,
      height: this.tileSize * 0.2,
      rotation: Math.PI * 2,
      duration: 0.6,
      ease: 'power2.in',
      onComplete: () => {
        this.app.stage.removeChild(flyer);
        flyer.destroy();
        this.onBasketHit();
      }
    });
  }

  private async dropTiles(): Promise<boolean> {
    const animations: Promise<void>[] = [];
    let hasMoved = false;

    for (let col = 0; col < this.gridSize; col++) {
      // Find all obstacles in this column
      const obstacleRows: number[] = [];
      for (let row = 0; row < this.gridSize; row++) {
        if (this.grid[row][col]?.type === 'obstacle') {
          obstacleRows.push(row);
        }
      }

      // Process each segment between obstacles
      let segmentBottom = this.gridSize - 1;
      const segments: { top: number; bottom: number }[] = [];

      // Add segments from bottom to top
      for (let i = obstacleRows.length - 1; i >= 0; i--) {
        const obstacleRow = obstacleRows[i];
        if (obstacleRow < segmentBottom) {
          segments.push({ top: obstacleRow + 1, bottom: segmentBottom });
        }
        segmentBottom = obstacleRow - 1;
      }
      // Add top segment
      if (segmentBottom >= 0) {
        segments.push({ top: 0, bottom: segmentBottom });
      }

      // Drop tiles within each segment
      for (const segment of segments) {
        let emptyRow = segment.bottom;

        for (let row = segment.bottom; row >= segment.top; row--) {
          const tile = this.grid[row][col];
          if (tile && tile.type !== 'obstacle') {
            if (row !== emptyRow) {
              hasMoved = true;
              const dropDistance = emptyRow - row;
              this.grid[emptyRow][col] = tile;
              this.grid[row][col] = null;
              tile.row = emptyRow;

              const targetY = emptyRow * this.tileSize + this.tileSize / 2;
              const duration = 0.15 + dropDistance * 0.05;

              animations.push(
                new Promise((resolve) => {
                  gsap.to(tile.container, {
                    y: targetY,
                    duration,
                    ease: 'power2.in',
                    onComplete: () => {
                      gsap.to(tile.container, {
                        y: targetY - 4,
                        duration: 0.08,
                        ease: 'power1.out',
                        onComplete: () => {
                          gsap.to(tile.container, {
                            y: targetY,
                            duration: 0.08,
                            ease: 'power1.in',
                            onComplete: resolve
                          });
                        }
                      });
                    }
                  });
                })
              );
            }
            emptyRow--;
          }
        }
      }
    }

    await Promise.all(animations);
    return hasMoved;
  }

  // Проверяет, заблокирована ли ячейка препятствием сверху
  private isBlockedFromTop(row: number, col: number): boolean {
    for (let r = 0; r < row; r++) {
      if (this.grid[r][col]?.type === 'obstacle') {
        return true;
      }
    }
    return false;
  }

  // Проверяет, есть ли пустота ВЫШЕ данной строки в колонке (до препятствия или верха)
  private hasEmptyAbove(row: number, col: number): boolean {
    for (let r = row - 1; r >= 0; r--) {
      const cell = this.grid[r][col];
      if (cell?.type === 'obstacle') return false; // Упёрлись в препятствие
      if (!cell) return true; // Нашли пустоту
    }
    return false;
  }

  // Проверяет, может ли тайл быть источником для горизонтального перемещения
  private canBeHorizontalSource(row: number, col: number): boolean {
    const cell = this.grid[row][col];
    return cell !== null && cell.type !== 'obstacle';
  }

  // Находит ближайшую колонку с тайлом, который можно сдвинуть к целевой позиции
  // Возвращает колонку источника или -1 если не найдено
  private findHorizontalSource(row: number, targetCol: number): number {
    // Ищем слева - идём до края или до препятствия
    for (let col = targetCol - 1; col >= 0; col--) {
      const cell = this.grid[row][col];
      if (cell?.type === 'obstacle') break; // Стена - дальше не ищем
      if (cell && !this.isBlockedFromTop(row, col)) {
        return col; // Нашли тайл в незаблокированной колонке
      }
    }

    // Ищем справа
    for (let col = targetCol + 1; col < this.gridSize; col++) {
      const cell = this.grid[row][col];
      if (cell?.type === 'obstacle') break;
      if (cell && !this.isBlockedFromTop(row, col)) {
        return col;
      }
    }

    return -1;
  }

  // Горизонтальное перетекание - каскадное заполнение пустот под препятствиями
  private async horizontalPull(): Promise<boolean> {
    let totalMoved = false;
    let iterationMoved = true;

    // Повторяем пока есть движение (каскад)
    while (iterationMoved) {
      iterationMoved = false;
      const animations: Promise<void>[] = [];

      // Проходим снизу вверх, слева направо
      for (let row = this.gridSize - 1; row >= 0; row--) {
        for (let col = 0; col < this.gridSize; col++) {
          // Ищем пустую ячейку, которая заблокирована сверху
          if (!this.grid[row][col] && this.isBlockedFromTop(row, col)) {
            // Сначала пробуем соседние ячейки (быстрее)
            let sourceCol = -1;
            if (col > 0 && this.canBeHorizontalSource(row, col - 1)) {
              sourceCol = col - 1;
            } else if (col < this.gridSize - 1 && this.canBeHorizontalSource(row, col + 1)) {
              sourceCol = col + 1;
            }

            // Если соседи пустые/заблокированы, ищем дальше - ближайшую незаблокированную колонку
            if (sourceCol === -1) {
              sourceCol = this.findHorizontalSource(row, col);
            }

            if (sourceCol !== -1) {
              iterationMoved = true;
              totalMoved = true;

              const tile = this.grid[row][sourceCol]!;
              this.grid[row][col] = tile;
              this.grid[row][sourceCol] = null;
              tile.col = col;

              const targetX = col * this.tileSize + this.tileSize / 2;

              animations.push(
                new Promise((resolve) => {
                  gsap.to(tile.container, {
                    x: targetX,
                    duration: 0.12,
                    ease: 'power2.out',
                    onComplete: resolve
                  });
                })
              );
            }
          }
        }
      }

      // Ждём завершения анимаций этой итерации
      if (animations.length > 0) {
        await Promise.all(animations);
      }

      // После горизонтального сдвига:
      // 1. Падение вниз в исходных колонках
      // 2. Заполнение новыми тайлами сверху (чтобы было что тянуть дальше)
      if (iterationMoved) {
        await this.dropTiles();
        await this.fillFromTop();
      }
    }

    return totalMoved;
  }

  // Заполнение ТОЛЬКО сверху (row 0)
  private async fillFromTop(): Promise<boolean> {
    const animations: Promise<void>[] = [];
    let hasFilled = false;

    for (let col = 0; col < this.gridSize; col++) {
      // Проверяем, что колонка не начинается с препятствия
      if (this.grid[0][col]?.type === 'obstacle') continue;

      // Считаем пустые ячейки сверху (до первого препятствия или тайла)
      let emptyCount = 0;
      for (let row = 0; row < this.gridSize; row++) {
        if (this.grid[row][col]?.type === 'obstacle') break;
        if (!this.grid[row][col]) emptyCount++;
        else break; // Встретили тайл - дальше уже заполнено после dropTiles
      }

      if (emptyCount === 0) continue;

      // Создаём новые тайлы для пустых верхних ячеек
      for (let i = 0; i < emptyCount; i++) {
        const row = emptyCount - 1 - i; // Заполняем снизу вверх в пустом сегменте
        if (this.grid[row][col]) continue; // Уже есть тайл

        hasFilled = true;
        const type = this.getSmartRandomType(row, col);
        const tile = this.createTile(type, row, col);
        this.grid[row][col] = tile;

        // Стартовая позиция над экраном
        const startY = -this.tileSize * (i + 1);
        tile.container.y = startY;
        tile.container.alpha = 0;

        const targetY = row * this.tileSize + this.tileSize / 2;
        const duration = 0.2 + (row + 1) * 0.04;

        animations.push(
          new Promise((resolve) => {
            gsap.to(tile.container, {
              alpha: 1,
              duration: 0.1,
            });

            gsap.to(tile.container, {
              y: targetY,
              duration,
              ease: 'power2.in',
              onComplete: () => {
                gsap.to(tile.container, {
                  y: targetY - 3,
                  duration: 0.06,
                  ease: 'power1.out',
                  onComplete: () => {
                    gsap.to(tile.container, {
                      y: targetY,
                      duration: 0.06,
                      ease: 'power1.in',
                      onComplete: () => {
                        this.startFloatingAnimation(tile);
                        resolve();
                      }
                    });
                  }
                });
              }
            });
          })
        );
      }
    }

    await Promise.all(animations);
    return hasFilled;
  }

  private vibrate(pattern: number | number[]) {
    try {
      navigator?.vibrate?.(pattern);
    } catch {
      // Vibration API not available
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private startHintTimer() {
    this.clearHint();
    this.hintTimeout = setTimeout(() => {
      if (!this.isProcessing) {
        this.showHint();
      }
    }, 5000); // Показать подсказку через 5 секунд бездействия
  }

  private clearHint() {
    if (this.hintTimeout) {
      clearTimeout(this.hintTimeout);
      this.hintTimeout = null;
    }
    // Останавливаем анимации подсказки
    this.hintTweens.forEach(tween => tween.kill());
    this.hintTweens = [];
    // Сбрасываем scale контейнеров
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        const tile = this.grid[row]?.[col];
        if (tile) {
          tile.container.scale.set(1);
        }
      }
    }
  }

  private findValidMove(): { from: GridPos; to: GridPos } | null {
    const directions = [
      { dr: 0, dc: 1 },  // вправо
      { dr: 1, dc: 0 },  // вниз
    ];

    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        for (const { dr, dc } of directions) {
          const newRow = row + dr;
          const newCol = col + dc;

          if (newRow < this.gridSize && newCol < this.gridSize) {
            const tile1 = this.grid[row][col];
            const tile2 = this.grid[newRow][newCol];

            // Skip if either tile is an obstacle or null
            if (!tile1 || !tile2 || tile1.type === 'obstacle' || tile2.type === 'obstacle') {
              continue;
            }

            // Временно меняем местами
            this.grid[row][col] = tile2;
            this.grid[newRow][newCol] = tile1;

            const hasMatch = this.checkForMatchAt(row, col) || this.checkForMatchAt(newRow, newCol);

            // Возвращаем обратно
            this.grid[row][col] = tile1;
            this.grid[newRow][newCol] = tile2;

            if (hasMatch) {
              return { from: { row, col }, to: { row: newRow, col: newCol } };
            }
          }
        }
      }
    }
    return null;
  }

  private checkForMatchAt(row: number, col: number): boolean {
    const tile = this.grid[row][col];
    if (!tile || tile.type === 'obstacle' || this.isFigurine(tile.type)) return false;

    // Горизонтальная проверка
    let hCount = 1;
    for (let c = col - 1; c >= 0; c--) {
      const t = this.grid[row][c];
      if (t && t.type !== 'obstacle' && !this.isFigurine(t.type) && t.type === tile.type) hCount++;
      else break;
    }
    for (let c = col + 1; c < this.gridSize; c++) {
      const t = this.grid[row][c];
      if (t && t.type !== 'obstacle' && !this.isFigurine(t.type) && t.type === tile.type) hCount++;
      else break;
    }
    if (hCount >= 3) return true;

    // Вертикальная проверка
    let vCount = 1;
    for (let r = row - 1; r >= 0; r--) {
      const t = this.grid[r][col];
      if (t && t.type !== 'obstacle' && !this.isFigurine(t.type) && t.type === tile.type) vCount++;
      else break;
    }
    for (let r = row + 1; r < this.gridSize; r++) {
      const t = this.grid[r][col];
      if (t && t.type !== 'obstacle' && !this.isFigurine(t.type) && t.type === tile.type) vCount++;
      else break;
    }
    if (vCount >= 3) return true;

    return false;
  }

  private showHint() {
    const move = this.findValidMove();
    if (!move) return;

    const tile1 = this.grid[move.from.row][move.from.col];
    const tile2 = this.grid[move.to.row][move.to.col];

    if (tile1 && tile2) {
      // Пульсирующая анимация для подсказки - анимируем контейнер, не спрайт
      const baseScale1 = tile1.container.scale.x;
      const baseScale2 = tile2.container.scale.x;

      const tween1 = gsap.to(tile1.container.scale, {
        x: baseScale1 * 1.1,
        y: baseScale1 * 1.1,
        duration: 0.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
      });
      const tween2 = gsap.to(tile2.container.scale, {
        x: baseScale2 * 1.1,
        y: baseScale2 * 1.1,
        duration: 0.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
      });
      this.hintTweens.push(tween1, tween2);
    }
  }

  public async reset() {
    this.clearHint();

    // Удаляем все тайлы
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        const tile = this.grid[row]?.[col];
        if (tile) {
          gsap.killTweensOf(tile.sprite);
          gsap.killTweensOf(tile.sprite.scale);
          gsap.killTweensOf(tile.container);
          this.gridContainer.removeChild(tile.container);
        }
      }
    }
    this.grid = [];

    // Сбрасываем статистику
    const maxMoves = this.levelConfig?.maxMoves || 30;
    this.stats = {
      score: 0,
      moves: maxMoves,
      collected: { drumstick: 0, wing: 0, burger: 0, fries: 0, bucket: 0, ice_cream: 0, donut: 0, cappuccino: 0, belka: 0, strelka: 0, sputnik: 0, vostok: 0, spaceship: 0 }
    };
    this.onStatsUpdate({ ...this.stats });

    // Создаём новую сетку с валидацией
    await this.createValidGrid();

    // Перезапускаем таймер подсказки
    this.startHintTimer();
  }

  public destroy() {
    this.clearHint();
    this.isProcessing = true; // Prevent any new animations

    // Kill all tweens on all tiles explicitly
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        const tile = this.grid[row]?.[col];
        if (tile) {
          gsap.killTweensOf(tile.sprite);
          gsap.killTweensOf(tile.sprite.scale);
          gsap.killTweensOf(tile.container);
          gsap.killTweensOf(tile.container.scale);
        }
      }
    }

    // Kill any remaining global tweens
    gsap.killTweensOf(this.gridContainer);
    gsap.killTweensOf(this.uiContainer);
    gsap.killTweensOf(this.particleContainer);

    // Destroy particles
    this.particles.destroy();

    // Clear grid reference
    this.grid = [];

    // Destroy the app
    this.app.destroy(true, { children: true });
  }
}
