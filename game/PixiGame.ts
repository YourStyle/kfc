import { Application, Container, Sprite, Graphics, Texture, Assets, Text, TextStyle } from 'pixi.js';
import gsap from 'gsap';
import { TILE_SIZE, ITEM_TYPES, ITEM_DATA } from '../constants';
import { ItemType, GridPos } from '../types';
import { ParticleSystem } from './PixiParticles';

interface TileData {
  type: ItemType;
  sprite: Sprite;
  container: Container;
  row: number;
  col: number;
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
  private hintTimeout: ReturnType<typeof setTimeout> | null = null;
  private hintTweens: gsap.core.Tween[] = [];
  private onStatsUpdate: (stats: typeof this.stats) => void;
  private onGameOver: () => void;
  private onAssetsLoaded: () => void;
  private onBasketHit: () => void;

  constructor(
    container: HTMLElement,
    onStatsUpdate: (stats: typeof PixiGame.prototype.stats) => void,
    onGameOver: () => void,
    onAssetsLoaded: () => void,
    onBasketHit: () => void
  ) {
    this.onStatsUpdate = onStatsUpdate;
    this.onGameOver = onGameOver;
    this.onAssetsLoaded = onAssetsLoaded;
    this.onBasketHit = onBasketHit;

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
    this.gridSize = isMobile ? 7 : 8;

    // Адаптивный размер под экран
    const maxWidth = Math.min(600, window.innerWidth);
    const maxHeight = Math.min(800, window.innerHeight);
    this.scale = Math.min(maxWidth / 600, maxHeight / 800);
    const width = 600 * this.scale;
    const height = 800 * this.scale;

    await this.app.init({
      width,
      height,
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

    // Масштабируем всё под размер экрана
    this.app.stage.scale.set(this.scale);

    // Центрируем поле с учётом UI сверху и снизу
    const gridWidth = this.gridSize * TILE_SIZE;
    const gridHeight = this.gridSize * TILE_SIZE;
    const topOffset = isMobile ? 130 : 100; // Больше отступ сверху на мобильных для UI
    const availableHeight = 800 - topOffset - 60; // 60px для нижнего UI

    this.gridContainer.x = (600 - gridWidth) / 2;
    this.gridContainer.y = topOffset + (availableHeight - gridHeight) / 2;

    // Рисуем фон поля
    this.drawBoardBackground();

    // Создаём сетку
    this.createGrid();

    // Настраиваем ввод
    this.setupInput();

    // Запускаем таймер подсказки
    this.startHintTimer();

    this.onAssetsLoaded();
    this.onStatsUpdate(this.stats);
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
    const padding = 20;
    const size = this.gridSize * TILE_SIZE + padding * 2;

    bg.roundRect(-padding, -padding, size, size, 24);
    bg.fill({ color: 0xffffff, alpha: 0.9 });
    bg.stroke({ color: 0xe0e0e0, width: 2 });

    this.gridContainer.addChild(bg);
  }

  private createGrid() {
    this.grid = [];

    for (let row = 0; row < this.gridSize; row++) {
      this.grid[row] = [];
      for (let col = 0; col < this.gridSize; col++) {
        const type = this.getRandomType(row, col);
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
            // Запускаем floating анимацию после появления
            this.startFloatingAnimation(tile);
          }
        });
      }
    }
  }

  private getRandomType(row: number, col: number): ItemType {
    const available = [...ITEM_TYPES];

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

  private createTile(type: ItemType, row: number, col: number): TileData {
    const container = new Container();
    container.x = col * TILE_SIZE + TILE_SIZE / 2;
    container.y = row * TILE_SIZE + TILE_SIZE / 2;

    // Фон тайла
    const bg = new Graphics();
    bg.roundRect(-TILE_SIZE / 2 + 4, -TILE_SIZE / 2 + 4, TILE_SIZE - 8, TILE_SIZE - 8, 12);
    bg.fill({ color: 0xffffff });
    bg.stroke({ color: 0xf0f0f0, width: 2 });
    container.addChild(bg);

    // Спрайт
    const sprite = new Sprite(this.textures[type]);
    sprite.anchor.set(0.5);
    sprite.width = TILE_SIZE - 16;
    sprite.height = TILE_SIZE - 16;
    container.addChild(sprite);

    // Интерактивность
    container.eventMode = 'static';
    container.cursor = 'pointer';

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
    // Учитываем масштаб при конвертации координат
    const scaledX = globalX / this.scale;
    const scaledY = globalY / this.scale;
    const localX = scaledX - this.gridContainer.x;
    const localY = scaledY - this.gridContainer.y;
    const col = Math.floor(localX / TILE_SIZE);
    const row = Math.floor(localY / TILE_SIZE);
    return { row, col };
  }

  private isValidPos(pos: GridPos): boolean {
    return pos.row >= 0 && pos.row < this.gridSize && pos.col >= 0 && pos.col < this.gridSize;
  }

  private async trySwap(from: GridPos, to: GridPos) {
    this.isProcessing = true;
    this.clearHint();

    const tile1 = this.grid[from.row][from.col];
    const tile2 = this.grid[to.row][to.col];

    if (!tile1 || !tile2) {
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
      this.onStatsUpdate(this.stats);
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
        if (!tile) continue;

        // Горизонтальная проверка
        if (col <= this.gridSize - 3) {
          const match: GridPos[] = [{ row, col }];
          for (let c = col + 1; c < this.gridSize; c++) {
            if (this.grid[row][c]?.type === tile.type) {
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
            if (this.grid[r][col]?.type === tile.type) {
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
          const centerPos = this.gridContainer.toGlobal(centerTile.container.position);
          if (match.length === 4) {
            this.showSpecialEffect(centerPos.x, centerPos.y, 'ХРУСТЯЩЕ!', 0xFFD700);
          } else if (match.length >= 5) {
            this.showSpecialEffect(centerPos.x, centerPos.y, 'ГОРЯЧО!', 0xE4002B);
          }
        }

        for (const pos of match) {
          const tile = this.grid[pos.row][pos.col];
          if (tile) {
            // Частицы (координаты в локальной системе stage, учитываем позицию gridContainer)
            const localX = this.gridContainer.x + tile.container.x;
            const localY = this.gridContainer.y + tile.container.y;
            this.particles.emit(localX, localY, tile.type);
            if (match.length >= 4) {
              this.particles.emit(localX, localY, tile.type); // Двойные частицы
            }

            // Если это курица - запускаем анимацию полёта к баскету
            if (tile.type === 'chicken') {
              const worldPos = this.gridContainer.toGlobal(tile.container.position);
              this.flyToBasket(worldPos.x, worldPos.y);
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

      this.onStatsUpdate(this.stats);

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
    // Конвертируем координаты с учётом масштаба (x и y приходят в глобальных координатах)
    const localX = x / this.scale;
    const localY = y / this.scale;

    // Вспышка
    const flash = new Graphics();
    flash.circle(0, 0, 60);
    flash.fill({ color, alpha: 0.5 });
    flash.x = localX;
    flash.y = localY;
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
    label.x = localX;
    label.y = localY;
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
    // Конвертируем координаты с учётом масштаба
    const localStartX = startX / this.scale;
    const localStartY = startY / this.scale;

    // Создаём летящую курочку
    const flyer = new Sprite(this.textures['chicken']);
    flyer.anchor.set(0.5);
    flyer.width = TILE_SIZE * 0.6;
    flyer.height = TILE_SIZE * 0.6;
    flyer.x = localStartX;
    flyer.y = localStartY;
    this.app.stage.addChild(flyer);

    // Целевая позиция - баскет в UI (примерно слева вверху)
    const targetX = 80;
    const targetY = 90;

    gsap.to(flyer, {
      x: targetX,
      y: targetY,
      width: TILE_SIZE * 0.2,
      height: TILE_SIZE * 0.2,
      rotation: Math.PI * 2,
      duration: 0.6,
      ease: 'power2.in',
      onComplete: () => {
        this.app.stage.removeChild(flyer);
        flyer.destroy();
        // Увеличиваем счётчик и вызываем callback
        this.stats.wingsCollected++;
        this.onStatsUpdate(this.stats);
        this.onBasketHit();
      }
    });
  }

  private async dropTiles(): Promise<void> {
    const animations: Promise<void>[] = [];

    for (let col = 0; col < this.gridSize; col++) {
      let emptyRow = this.gridSize - 1;

      for (let row = this.gridSize - 1; row >= 0; row--) {
        const tile = this.grid[row][col];
        if (tile) {
          if (row !== emptyRow) {
            this.grid[emptyRow][col] = tile;
            this.grid[row][col] = null;
            tile.row = emptyRow;

            const targetY = emptyRow * TILE_SIZE + TILE_SIZE / 2;
            animations.push(
              new Promise((resolve) => {
                gsap.to(tile.container, {
                  y: targetY,
                  duration: 0.3,
                  ease: 'bounce.out',
                  onComplete: resolve
                });
              })
            );
          }
          emptyRow--;
        }
      }
    }

    await Promise.all(animations);
  }

  private async fillEmptySpaces(): Promise<void> {
    const animations: Promise<void>[] = [];

    for (let col = 0; col < this.gridSize; col++) {
      let emptyCount = 0;

      for (let row = 0; row < this.gridSize; row++) {
        if (!this.grid[row][col]) {
          emptyCount++;

          const type = ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)];
          const tile = this.createTile(type, row, col);
          this.grid[row][col] = tile;

          // Начинаем сверху
          tile.container.y = -TILE_SIZE * emptyCount;

          const targetY = row * TILE_SIZE + TILE_SIZE / 2;
          animations.push(
            new Promise((resolve) => {
              gsap.to(tile.container, {
                y: targetY,
                duration: 0.4,
                ease: 'bounce.out',
                delay: emptyCount * 0.05,
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
    // Сбрасываем scale всех тайлов
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        const tile = this.grid[row]?.[col];
        if (tile) {
          tile.sprite.scale.set(1);
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
            // Временно меняем местами
            const tile1 = this.grid[row][col];
            const tile2 = this.grid[newRow][newCol];

            if (tile1 && tile2) {
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
    }
    return null;
  }

  private checkForMatchAt(row: number, col: number): boolean {
    const tile = this.grid[row][col];
    if (!tile) return false;

    // Горизонтальная проверка
    let hCount = 1;
    for (let c = col - 1; c >= 0 && this.grid[row][c]?.type === tile.type; c--) hCount++;
    for (let c = col + 1; c < this.gridSize && this.grid[row][c]?.type === tile.type; c++) hCount++;
    if (hCount >= 3) return true;

    // Вертикальная проверка
    let vCount = 1;
    for (let r = row - 1; r >= 0 && this.grid[r][col]?.type === tile.type; r--) vCount++;
    for (let r = row + 1; r < this.gridSize && this.grid[r][col]?.type === tile.type; r++) vCount++;
    if (vCount >= 3) return true;

    return false;
  }

  private showHint() {
    const move = this.findValidMove();
    if (!move) return;

    const tile1 = this.grid[move.from.row][move.from.col];
    const tile2 = this.grid[move.to.row][move.to.col];

    if (tile1 && tile2) {
      // Пульсирующая анимация для подсказки
      const tween1 = gsap.to(tile1.sprite.scale, {
        x: 1.2,
        y: 1.2,
        duration: 0.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
      });
      const tween2 = gsap.to(tile2.sprite.scale, {
        x: 1.2,
        y: 1.2,
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
    this.stats = { score: 0, moves: 30, wingsCollected: 0 };
    this.onStatsUpdate(this.stats);

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
