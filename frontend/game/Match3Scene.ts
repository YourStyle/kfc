
import Phaser from 'phaser';
import { GRID_SIZE, TILE_SIZE, ITEM_TYPES, ITEM_DATA } from '../constants';
import { GridPos } from '../types';
import { FXService } from './FXService';
import { GridManager } from './GridManager';
import { InputHandler } from './InputHandler';

export class Match3Scene extends Phaser.Scene {
  private fx!: FXService;
  private inputHandler!: InputHandler;
  // Инициализируем массив сразу, чтобы избежать "reading '0' of undefined"
  private grid: (Phaser.GameObjects.Container | null)[][] = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
  private isProcessing = false;
  private stats = { score: 0, moves: 30, wingsCollected: 0 };
  private hintTimer?: Phaser.Time.TimerEvent;
  private hintTweens: Phaser.Tweens.Tween[] = [];
  private readonly HINT_DELAY = 5000; // 5 секунд бездействия

  constructor() {
    super('Match3Scene');
  }

  preload() {
    // Загружаем ассеты из public/images
    const basePath = import.meta.env.BASE_URL || '/';
    ITEM_TYPES.forEach(type => {
      const path = `${basePath}images/${type}.png`;
      console.log(`Loading: item-${type} from ${path}`);
      this.load.image(`item-${type}`, path);
    });

    this.load.on('loaderror', (file: any) => {
      console.error('Load error:', file.key, file.src);
    });

    this.load.on('complete', () => {
      console.log('All assets loaded. Textures:', this.textures.getTextureKeys());
      // Устанавливаем линейную фильтрацию и CLAMP_TO_EDGE для избежания артефактов
      ITEM_TYPES.forEach(type => {
        const texture = this.textures.get(`item-${type}`);
        if (texture) {
          texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
          // CLAMP_TO_EDGE убирает артефакты на краях
          if (texture.setWrap) {
            texture.setWrap(Phaser.Textures.WrapMode.CLAMP_TO_EDGE);
          }
        }
      });
    });
  }

  private createFallbackTextures() {
    ITEM_TYPES.forEach(type => {
      const key = `item-${type}`;
      // Если текстура не загрузилась (не существует в кэше)
      if (!this.textures.exists(key)) {
        console.warn(`Создаю заглушку для ${key}`);
        const data = ITEM_DATA[type];
        const graphics = this.make.graphics({ x: 0, y: 0 });

        // Рисуем белый фон с легкой тенью
        graphics.fillStyle(0xffffff, 1);
        graphics.fillRoundedRect(0, 0, 64, 64, 12);
        graphics.lineStyle(2, 0xe0e0e0, 1);
        graphics.strokeRoundedRect(1, 1, 62, 62, 11);
        graphics.generateTexture(`${key}-bg`, 64, 64);

        // Создаем renderTexture вне видимой области
        const rt = this.make.renderTexture({ x: 0, y: 0, width: 64, height: 64 }, false);
        const bgImg = this.make.image({ x: 32, y: 32, key: `${key}-bg` }, false);
        const text = this.make.text({ x: 32, y: 32, text: data.emoji, style: { fontSize: '32px', resolution: 1 } }, false);
        text.setOrigin(0.5);

        rt.draw(bgImg);
        rt.draw(text);
        rt.saveTexture(key);

        // Очищаем все временные объекты
        bgImg.destroy();
        text.destroy();
        rt.destroy();
        graphics.destroy();
      }
    });
  }

  create() {
    // Сначала создаем запасные текстуры, если основные не загрузились
    this.createFallbackTextures();
    
    this.fx = new FXService(this);
    this.inputHandler = new InputHandler(this, (p1, p2) => this.handleSwipe(p1, p2));
    
    this.createBackground();
    this.initGrid();
    
    this.events.on('reset-game', () => this.resetGame());
    this.game.events.emit('assets-loaded');
  }

  private createBackground() {
    const { width, height } = this.scale;
    const size = GRID_SIZE * TILE_SIZE + 40;
    const graphics = this.add.graphics();
    graphics.fillStyle(0xffffff, 1).fillRoundedRect(width/2 - size/2, height/2 + 75 - size/2, size, size, 40);
    graphics.lineStyle(10, 0xE4002B, 1).strokeRoundedRect(width/2 - size/2, height/2 + 75 - size/2, size, size, 40);
  }

  private initGrid() {
    this.clearGrid();
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        this.spawnItem(r, c);
      }
    }
    
    // Убираем начальные совпадения без анимации
    while (GridManager.getMatches(this.grid).length > 0) {
      this.clearGrid();
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          this.spawnItem(r, c);
        }
      }
    }
    this.updateUI();
    this.startHintTimer();
  }

  private spawnItem(row: number, col: number) {
    const type = Phaser.Utils.Array.GetRandom(ITEM_TYPES);
    const container = this.add.container(this.getColX(col), this.getRowY(row));

    // Белый фон для элемента
    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 1);
    bg.fillRoundedRect(-TILE_SIZE/2 + 5, -TILE_SIZE/2 + 5, TILE_SIZE - 10, TILE_SIZE - 10, 12);
    bg.lineStyle(2, 0xf0f0f0, 1);
    bg.strokeRoundedRect(-TILE_SIZE/2 + 5, -TILE_SIZE/2 + 5, TILE_SIZE - 10, TILE_SIZE - 10, 12);

    // Используем ключ текстуры
    const img = this.add.image(0, 0, `item-${type}`).setDisplaySize(TILE_SIZE - 16, TILE_SIZE - 16);

    container.add([bg, img]);
    container.setData({ type, row, col, img }).setSize(TILE_SIZE, TILE_SIZE).setInteractive();

    container.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (!this.isProcessing) {
        // Берём актуальные координаты из data контейнера, а не из замыкания
        const currentRow = container.getData('row');
        const currentCol = container.getData('col');
        this.inputHandler.startDrag(p, { row: currentRow, col: currentCol });
      }
    });

    this.grid[row][col] = container;
    return container;
  }

  private async handleSwipe(p1: GridPos, p2: GridPos) {
    this.stopHint();
    this.isProcessing = true;
    await this.swap(p1, p2);

    if (GridManager.getMatches(this.grid).length > 0) {
      this.stats.moves--;
      this.updateUI();
      await this.processTurn();
    } else {
      await this.swap(p1, p2);
    }
    this.isProcessing = false;

    if (this.stats.moves <= 0) {
      this.game.events.emit('game-over');
    } else {
      this.startHintTimer();
    }
  }

  private async swap(p1: GridPos, p2: GridPos) {
    const i1 = this.grid[p1.row][p1.col]!;
    const i2 = this.grid[p2.row][p2.col]!;
    
    [this.grid[p1.row][p1.col], this.grid[p2.row][p2.col]] = [i2, i1];
    
    i1.setData('row', p2.row);
    i1.setData('col', p2.col);
    i2.setData('row', p1.row);
    i2.setData('col', p1.col);

    return new Promise<void>(res => {
      this.tweens.add({ targets: i1, x: this.getColX(p2.col), y: this.getRowY(p2.row), duration: 200 });
      this.tweens.add({ targets: i2, x: this.getColX(p1.col), y: this.getRowY(p1.row), duration: 200, onComplete: () => res() });
    });
  }

  private async processTurn() {
    let matches = GridManager.getMatches(this.grid);
    let combo = 0;

    while (matches.length > 0) {
      combo++;

      // Собираем все позиции для удаления, включая спецэффекты
      const toRemove = new Set<string>();
      const specialEffects: { type: 'row' | 'column' | 'all_type', value: number | string, x: number, y: number }[] = [];

      for (const match of matches) {
        // Добавляем базовые позиции
        match.positions.forEach(p => toRemove.add(`${p.row},${p.col}`));

        // Спецэффект для 5+ совпадений: удалить все элементы этого типа
        if (match.length >= 5) {
          const allOfType = GridManager.getAllOfType(this.grid, match.type);
          allOfType.forEach(p => toRemove.add(`${p.row},${p.col}`));
          const centerPos = match.positions[Math.floor(match.positions.length / 2)];
          specialEffects.push({
            type: 'all_type',
            value: match.type,
            x: this.getColX(centerPos.col),
            y: this.getRowY(centerPos.row)
          });
        }
        // Спецэффект для 4 совпадений: удалить весь ряд или колонку
        else if (match.length === 4) {
          if (match.direction === 'horizontal' && match.row !== undefined) {
            const rowPositions = GridManager.getRow(match.row);
            rowPositions.forEach(p => toRemove.add(`${p.row},${p.col}`));
            specialEffects.push({
              type: 'row',
              value: match.row,
              x: this.getColX(Math.floor(GRID_SIZE / 2)),
              y: this.getRowY(match.row)
            });
          } else if (match.direction === 'vertical' && match.col !== undefined) {
            const colPositions = GridManager.getColumn(match.col);
            colPositions.forEach(p => toRemove.add(`${p.row},${p.col}`));
            specialEffects.push({
              type: 'column',
              value: match.col,
              x: this.getColX(match.col),
              y: this.getRowY(Math.floor(GRID_SIZE / 2))
            });
          }
        }
      }

      const unique = Array.from(toRemove).map(s => {
        const [r, c] = s.split(',').map(Number);
        return { row: r, col: c };
      });

      // Показываем спецэффекты
      for (const effect of specialEffects) {
        this.fx.showSpecialEffect(effect.x, effect.y, effect.type);
      }

      // Двойное совпадение (2+ матча по 3 одновременно, без других спецэффектов)
      if (matches.length >= 2 && specialEffects.length === 0 && unique.length > 0) {
        const centerX = this.getColX(Math.floor(GRID_SIZE / 2));
        const centerY = this.getRowY(Math.floor(GRID_SIZE / 2));
        this.fx.showSpecialEffect(centerX, centerY, 'double');
      }

      if (combo > 1 && unique.length > 0) {
        this.fx.showCombo(this.getColX(unique[0].col), this.getRowY(unique[0].row), combo);
      }

      this.stats.score += unique.length * 10 * combo;

      unique.forEach(p => {
        const item = this.grid[p.row]?.[p.col];
        if (item) {
          const type = item.getData('type');
          if (type === 'chicken') {
            this.stats.wingsCollected++;
            this.fx.flyToBasket(item.x, item.y);
          }
          this.fx.emitDeath(item.x, item.y, type);
        }
      });

      this.updateUI();
      await this.removeItems(unique, specialEffects.length > 0);
      await this.applyGravity();
      matches = GridManager.getMatches(this.grid);
    }
  }

  private async removeItems(pos: GridPos[], isSpecialEffect = false) {
    if (isSpecialEffect) {
      // Каскадная плавная анимация для спецэффектов
      const centerRow = GRID_SIZE / 2;
      const centerCol = GRID_SIZE / 2;
      const sorted = [...pos].sort((a, b) => {
        const distA = Math.abs(a.row - centerRow) + Math.abs(a.col - centerCol);
        const distB = Math.abs(b.row - centerRow) + Math.abs(b.col - centerCol);
        return distA - distB;
      });

      await Promise.all(sorted.map((p, index) => {
        const item = this.grid[p.row][p.col];
        this.grid[p.row][p.col] = null;
        return new Promise<void>(res => {
          if (!item) return res();
          this.tweens.add({
            targets: item,
            scale: 1.15,
            duration: 80,
            delay: index * 25,
            ease: 'Back.easeOut',
            onComplete: () => {
              this.tweens.add({
                targets: item,
                scale: 0,
                alpha: 0,
                duration: 200,
                ease: 'Cubic.easeIn',
                onComplete: () => {
                  item.destroy();
                  res();
                }
              });
            }
          });
        });
      }));
    } else {
      // Быстрая анимация для обычных совпадений
      await Promise.all(pos.map(p => {
        const item = this.grid[p.row][p.col];
        this.grid[p.row][p.col] = null;
        return new Promise<void>(res => {
          if (!item) return res();
          this.tweens.add({
            targets: item,
            scale: 0,
            alpha: 0,
            duration: 200,
            onComplete: () => {
              item.destroy();
              res();
            }
          });
        });
      }));
    }
  }

  private async applyGravity() {
    const { drops, refills } = GridManager.getDropMap(this.grid);
    const promises: Promise<void>[] = [];

    drops.forEach(d => {
      this.grid[d.toRow][d.col] = d.item;
      this.grid[d.fromRow][d.col] = null;
      d.item.setData('row', d.toRow);
      promises.push(new Promise(res => {
        this.tweens.add({ 
          targets: d.item, 
          y: this.getRowY(d.toRow), 
          duration: 300, 
          ease: 'Bounce.easeOut', 
          onComplete: () => res() 
        });
      }));
    });

    refills.forEach(r => {
      const item = this.spawnItem(r.row, r.col);
      const targetY = this.getRowY(r.row);
      item.y = targetY - 400;
      promises.push(new Promise(res => {
        this.tweens.add({ 
          targets: item, 
          y: targetY, 
          duration: 400, 
          ease: 'Back.easeOut', 
          onComplete: () => res() 
        });
      }));
    });

    await Promise.all(promises);
  }

  private getColX(c: number) { return (this.scale.width - GRID_SIZE * TILE_SIZE) / 2 + TILE_SIZE / 2 + c * TILE_SIZE; }
  private getRowY(r: number) { return (this.scale.height - GRID_SIZE * TILE_SIZE) / 2 + TILE_SIZE / 2 + 75 + r * TILE_SIZE; }
  
  private clearGrid() { 
    for(let r=0; r<GRID_SIZE; r++) {
      for(let c=0; c<GRID_SIZE; c++) { 
        this.grid[r][c]?.destroy(); 
        this.grid[r][c] = null; 
      }
    }
  }
  
  private updateUI() { 
    this.game.events.emit('update-stats', { ...this.stats }); 
  }
  
  private resetGame() {
    this.stats = { score: 0, moves: 30, wingsCollected: 0 };
    this.isProcessing = false;
    this.stopHint();
    this.initGrid();
  }

  // Система подсказок
  private startHintTimer() {
    this.stopHint();
    this.hintTimer = this.time.delayedCall(this.HINT_DELAY, () => {
      this.showHint();
    });
  }

  private stopHint() {
    if (this.hintTimer) {
      this.hintTimer.destroy();
      this.hintTimer = undefined;
    }
    // Останавливаем анимации подсказки
    this.hintTweens.forEach(tween => tween.stop());
    this.hintTweens = [];
    // Сбрасываем размер элементов к оригинальному
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const item = this.grid[r]?.[c];
        if (item) {
          const img = item.getData('img') as Phaser.GameObjects.Image;
          if (img) img.setDisplaySize(TILE_SIZE - 16, TILE_SIZE - 16);
        }
      }
    }
  }

  private showHint() {
    const move = GridManager.findPossibleMove(this.grid);
    if (!move) return;

    const item1 = this.grid[move.from.row]?.[move.from.col];
    const item2 = this.grid[move.to.row]?.[move.to.col];

    if (!item1 || !item2) return;

    const img1 = item1.getData('img') as Phaser.GameObjects.Image;
    const img2 = item2.getData('img') as Phaser.GameObjects.Image;

    if (!img1 || !img2) return;

    const baseSize = TILE_SIZE - 16;
    const maxSize = baseSize * 1.15;

    // Плавная пульсирующая анимация для подсказки используя displayWidth/Height
    const createHintTween = (img: Phaser.GameObjects.Image) => {
      return this.tweens.add({
        targets: img,
        displayWidth: { from: baseSize, to: maxSize },
        displayHeight: { from: baseSize, to: maxSize },
        duration: 400,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    };

    this.hintTweens.push(createHintTween(img1));
    this.hintTweens.push(createHintTween(img2));
  }
}
