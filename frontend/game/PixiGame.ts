import { Application, Container, Sprite, Graphics, Texture, Assets, Text, TextStyle } from 'pixi.js';
import gsap from 'gsap';
import { ITEM_TYPES, ITEM_DATA } from '../constants';
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
  private stats = { score: 0, moves: 30, wingsCollected: 0 };
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
  private onGameOver: () => void;
  private onAssetsLoaded: () => void;
  private onBasketHit: () => void;
  private levelConfig?: LevelConfig;
  private activeItemTypes: ItemType[] = ITEM_TYPES;

  constructor(
    container: HTMLElement,
    onStatsUpdate: (stats: typeof PixiGame.prototype.stats) => void,
    onGameOver: () => void,
    onAssetsLoaded: () => void,
    onBasketHit: () => void,
    levelConfig?: LevelConfig
  ) {
    this.onStatsUpdate = onStatsUpdate;
    this.onGameOver = onGameOver;
    this.onAssetsLoaded = onAssetsLoaded;
    this.onBasketHit = onBasketHit;
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
      backgroundColor: 0xf8f9fa,
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
    const topOffset = isMobile ? 140 : 120; // Отступ сверху для UI
    const availableHeight = canvasHeight - topOffset - 50; // 50px для нижнего UI

    this.gridContainer.x = (canvasWidth - gridWidth) / 2;
    this.gridContainer.y = topOffset + Math.max(0, (availableHeight - gridHeight) / 2);

    // Рисуем фон поля
    this.drawBoardBackground();

    // Создаём сетку
    this.createGrid();

    // Настраиваем ввод
    this.setupInput();

    // Запускаем таймер подсказки
    this.startHintTimer();

    this.onAssetsLoaded();
    this.onStatsUpdate({ ...this.stats });
  }

  private async loadAssets() {
    const basePath = import.meta.env.BASE_URL || '/';

    for (const type of ITEM_TYPES) {
      const path = `${basePath}images/${type}.png`;
      this.textures[type] = await Assets.load(path);
    }
  }

  private drawBoardBackground() {
    const bg = new Graphics();
    const padding = 16;
    const size = this.gridSize * this.tileSize + padding * 2;

    // Outer board frame with warm color
    bg.roundRect(-padding, -padding, size, size, 24);
    bg.fill({ color: 0xD4A574, alpha: 1 }); // Warm light brown
    bg.stroke({ color: 0xC4956A, width: 3 });

    this.gridContainer.addChild(bg);

    // Draw individual cell backgrounds
    const cellBg = new Graphics();
    const cellPadding = 2;
    const cellSize = this.tileSize - cellPadding * 2;

    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        const x = col * this.tileSize + cellPadding;
        const y = row * this.tileSize + cellPadding;

        // Alternate colors for checkerboard pattern
        const isLight = (row + col) % 2 === 0;
        const cellColor = isLight ? 0xF5E6D3 : 0xEDD9C4; // Light beige tones

        cellBg.roundRect(x, y, cellSize, cellSize, 8);
        cellBg.fill({ color: cellColor, alpha: 1 });
      }
    }

    this.gridContainer.addChild(cellBg);
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
    const available = [...this.activeItemTypes];

    // Избегаем начальных совпадений
    const toRemove: ItemType[] = [];

    if (col >= 2) {
      const left1 = this.grid[row]?.[col - 1]?.type;
      const left2 = this.grid[row]?.[col - 2]?.type;
      if (left1 && left1 === left2) toRemove.push(left1);
    }

    if (row >= 2) {
      const up1 = this.grid[row - 1]?.[col]?.type;
      const up2 = this.grid[row - 2]?.[col]?.type;
      if (up1 && up1 === up2) toRemove.push(up1);
    }

    const filtered = available.filter(t => !toRemove.includes(t));
    const pool = filtered.length > 0 ? filtered : available;

    return pool[Math.floor(Math.random() * pool.length)];
  }

  // Умный выбор типа для заполнения пустот - уменьшает вероятность каскадов
  private getSmartRandomType(row: number, col: number): ItemType {
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

    // Фон тайла
    const bg = new Graphics();
    bg.roundRect(-this.tileSize / 2 + 4, -this.tileSize / 2 + 4, this.tileSize - 8, this.tileSize - 8, 12);
    if (isObstacle) {
      // Темный фон для препятствий
      bg.fill({ color: 0x4a5568 });
      bg.stroke({ color: 0x2d3748, width: 3 });
    } else {
      bg.fill({ color: 0xffffff });
      bg.stroke({ color: 0xf0f0f0, width: 2 });
    }
    container.addChild(bg);

    // Спрайт (только для обычных тайлов)
    let sprite: Sprite;
    if (isObstacle) {
      // Для препятствий создаем графику коробки
      sprite = new Sprite();
      sprite.anchor.set(0.5);

      const boxSize = this.spriteSize * 0.8;
      const boxGraphic = new Graphics();

      // Основа коробки (коричневая)
      boxGraphic.roundRect(-boxSize/2, -boxSize/2, boxSize, boxSize, 6);
      boxGraphic.fill({ color: 0x8B4513 });
      boxGraphic.stroke({ color: 0x5D3A1A, width: 2 });

      // Крышка коробки
      boxGraphic.rect(-boxSize/2, -boxSize/2, boxSize, boxSize * 0.25);
      boxGraphic.fill({ color: 0xA0522D });
      boxGraphic.stroke({ color: 0x5D3A1A, width: 1 });

      // Лента по центру (вертикальная)
      boxGraphic.rect(-boxSize * 0.1, -boxSize/2, boxSize * 0.2, boxSize);
      boxGraphic.fill({ color: 0xDAA520 });

      // Лента (горизонтальная)
      boxGraphic.rect(-boxSize/2, -boxSize * 0.1, boxSize, boxSize * 0.2);
      boxGraphic.fill({ color: 0xDAA520 });

      // Бантик в центре
      boxGraphic.circle(0, 0, boxSize * 0.12);
      boxGraphic.fill({ color: 0xFFD700 });

      container.addChild(boxGraphic);
    } else {
      sprite = new Sprite(this.textures[type]);
      sprite.anchor.set(0.5);
      sprite.width = this.spriteSize;
      sprite.height = this.spriteSize;
      container.addChild(sprite);
    }

    // Интерактивность (не для препятствий)
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
      this.onGameOver();
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
        // Skip empty cells and obstacles
        if (!tile || tile.type === 'obstacle') continue;

        // Горизонтальная проверка
        if (col <= this.gridSize - 3) {
          const match: GridPos[] = [{ row, col }];
          for (let c = col + 1; c < this.gridSize; c++) {
            const nextTile = this.grid[row][c];
            if (nextTile && nextTile.type !== 'obstacle' && nextTile.type === tile.type) {
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
            if (nextTile && nextTile.type !== 'obstacle' && nextTile.type === tile.type) {
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
            this.showSpecialEffect(centerX, centerY, 'ХРУСТЯЩЕ!', 0xFFD700);
          } else if (match.length >= 5) {
            this.showSpecialEffect(centerX, centerY, 'ГОРЯЧО!', 0xE4002B);
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

            // Если это курица - запускаем анимацию полёта к баскету
            if (tile.type === 'chicken') {
              this.flyToBasket(stageX, stageY);
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

      // Показываем комбо
      if (combo >= 2) {
        this.showComboText(combo);
      }

      this.onStatsUpdate({ ...this.stats });

      await this.delay(250);

      // Падение элементов
      await this.dropTiles();

      // Заполняем пустоты
      await this.fillEmptySpaces();

      // Ищем новые совпадения
      matches = this.findMatches();
    }
  }

  private showComboText(combo: number) {
    const texts = ['', '', 'ВКУСНО!', 'СОЧНО!', 'КОМБО!', 'ШЕФ!'];
    const text = texts[Math.min(combo, 5)];

    const style = new TextStyle({
      fontFamily: 'Oswald, sans-serif',
      fontSize: 48,
      fontWeight: 'bold',
      fill: '#E4002B',
      stroke: { color: '#ffffff', width: 6 },
    });

    const label = new Text({ text, style });
    label.anchor.set(0.5);
    label.x = 300;
    label.y = 400;
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

  private showSpecialEffect(x: number, y: number, text: string, color: number) {
    // Вспышка
    const flash = new Graphics();
    flash.circle(0, 0, 50);
    flash.fill({ color, alpha: 0.5 });
    flash.x = x;
    flash.y = y;
    this.app.stage.addChild(flash);

    gsap.to(flash, {
      alpha: 0,
      width: 200,
      height: 200,
      duration: 0.4,
      ease: 'power2.out',
      onComplete: () => {
        this.app.stage.removeChild(flash);
        flash.destroy();
      }
    });

    // Текст
    const style = new TextStyle({
      fontFamily: 'Oswald, sans-serif',
      fontSize: 42,
      fontWeight: 'bold',
      fill: '#ffffff',
      stroke: { color: color === 0xFFD700 ? '#B8860B' : '#8B0000', width: 6 },
    });

    const label = new Text({ text, style });
    label.anchor.set(0.5);
    label.x = x;
    label.y = y;
    label.scale.set(0);
    this.app.stage.addChild(label);

    gsap.to(label.scale, {
      x: 1.3,
      y: 1.3,
      duration: 0.3,
      ease: 'back.out(2)',
      onComplete: () => {
        gsap.to(label, {
          alpha: 0,
          y: label.y - 40,
          duration: 0.4,
          delay: 0.3,
          onComplete: () => {
            this.app.stage.removeChild(label);
            label.destroy();
          }
        });
      }
    });
  }

  private flyToBasket(startX: number, startY: number) {
    // Создаём летящую курочку
    const flyer = new Sprite(this.textures['chicken']);
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
        // Увеличиваем счётчик и вызываем callback
        this.stats.wingsCollected++;
        this.onStatsUpdate({ ...this.stats });
        this.onBasketHit();
      }
    });
  }

  private async dropTiles(): Promise<void> {
    const animations: Promise<void>[] = [];

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
        let dropIndex = 0;

        for (let row = segment.bottom; row >= segment.top; row--) {
          const tile = this.grid[row][col];
          if (tile && tile.type !== 'obstacle') {
            if (row !== emptyRow) {
              const dropDistance = emptyRow - row;
              this.grid[emptyRow][col] = tile;
              this.grid[row][col] = null;
              tile.row = emptyRow;

              const targetY = emptyRow * this.tileSize + this.tileSize / 2;
              const delay = dropIndex * 0.03;
              const duration = 0.15 + dropDistance * 0.05;

              animations.push(
                new Promise((resolve) => {
                  gsap.to(tile.container, {
                    y: targetY,
                    duration,
                    delay,
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
              dropIndex++;
            }
            emptyRow--;
          }
        }
      }
    }

    await Promise.all(animations);
  }

  private async fillEmptySpaces(): Promise<void> {
    const animations: Promise<void>[] = [];

    for (let col = 0; col < this.gridSize; col++) {
      // Find obstacles and create segments
      const obstacleRows: number[] = [];
      for (let row = 0; row < this.gridSize; row++) {
        if (this.grid[row][col]?.type === 'obstacle') {
          obstacleRows.push(row);
        }
      }

      // Only fill from top of grid down to first obstacle (or bottom if no obstacles)
      const firstObstacle = obstacleRows.length > 0 ? Math.min(...obstacleRows) : this.gridSize;

      let emptyCount = 0;
      const emptyPositions: { row: number; count: number }[] = [];

      // Find empty positions only above obstacles (new items fall from top)
      for (let row = 0; row < firstObstacle; row++) {
        if (!this.grid[row][col]) {
          emptyCount++;
          emptyPositions.push({ row, count: emptyCount });
        }
      }

      // Create and animate new tiles
      for (const { row, count } of emptyPositions) {
        const type = this.getSmartRandomType(row, col);
        const tile = this.createTile(type, row, col);
        this.grid[row][col] = tile;

        // Start from above the grid
        const startY = -this.tileSize * (emptyPositions.length - count + 1);
        tile.container.y = startY;
        tile.container.alpha = 0;

        const targetY = row * this.tileSize + this.tileSize / 2;
        const dropDistance = (targetY - startY) / this.tileSize;
        const duration = 0.2 + dropDistance * 0.04;
        const delay = count * 0.04;

        animations.push(
          new Promise((resolve) => {
            gsap.to(tile.container, {
              alpha: 1,
              duration: 0.1,
              delay
            });

            gsap.to(tile.container, {
              y: targetY,
              duration,
              delay,
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
    if (!tile || tile.type === 'obstacle') return false;

    // Горизонтальная проверка
    let hCount = 1;
    for (let c = col - 1; c >= 0; c--) {
      const t = this.grid[row][c];
      if (t && t.type !== 'obstacle' && t.type === tile.type) hCount++;
      else break;
    }
    for (let c = col + 1; c < this.gridSize; c++) {
      const t = this.grid[row][c];
      if (t && t.type !== 'obstacle' && t.type === tile.type) hCount++;
      else break;
    }
    if (hCount >= 3) return true;

    // Вертикальная проверка
    let vCount = 1;
    for (let r = row - 1; r >= 0; r--) {
      const t = this.grid[r][col];
      if (t && t.type !== 'obstacle' && t.type === tile.type) vCount++;
      else break;
    }
    for (let r = row + 1; r < this.gridSize; r++) {
      const t = this.grid[r][col];
      if (t && t.type !== 'obstacle' && t.type === tile.type) vCount++;
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

  public reset() {
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

    // Сбрасываем статистику
    const maxMoves = this.levelConfig?.maxMoves || 30;
    this.stats = { score: 0, moves: maxMoves, wingsCollected: 0 };
    this.onStatsUpdate({ ...this.stats });

    // Создаём новую сетку
    this.createGrid();

    // Перезапускаем таймер подсказки
    this.startHintTimer();
  }

  public destroy() {
    this.clearHint();
    gsap.killTweensOf('*');
    this.app.destroy(true, { children: true });
  }
}
