
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

  constructor() {
    super('Match3Scene');
  }

  preload() {
    // Используем прямой путь к папке images
    this.load.setPath('images/');
    
    // Пытаемся загрузить ассеты
    ITEM_TYPES.forEach(type => {
      this.load.image(`item-${type}`, `${type}.png`);
    });

    this.load.on('loaderror', (file: any) => {
      console.error('Не удалось загрузить:', file.key, 'по пути:', file.src);
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
        
        // Рисуем фон
        graphics.fillStyle(data.particleColor, 1);
        graphics.fillRoundedRect(0, 0, 64, 64, 12);
        graphics.lineStyle(4, 0xffffff, 0.5);
        graphics.strokeRoundedRect(2, 2, 60, 60, 10);
        graphics.generateTexture(`${key}-bg`, 64, 64);
        
        const rt = this.add.renderTexture(0, 0, 64, 64);
        rt.draw(this.add.image(32, 32, `${key}-bg`));
        rt.draw(this.add.text(32, 32, data.emoji, { fontSize: '32px' }).setOrigin(0.5));
        rt.saveTexture(key);
        
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
  }

  private spawnItem(row: number, col: number) {
    const type = Phaser.Utils.Array.GetRandom(ITEM_TYPES);
    const container = this.add.container(this.getColX(col), this.getRowY(row));
    
    // Используем ключ текстуры, который либо загрузился, либо создался как fallback
    const img = this.add.image(0, 0, `item-${type}`).setDisplaySize(TILE_SIZE - 10, TILE_SIZE - 10);
    
    container.add(img);
    container.setData({ type, row, col }).setSize(TILE_SIZE, TILE_SIZE).setInteractive();
    
    container.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (!this.isProcessing) {
        this.inputHandler.startDrag(p, { row, col });
        this.tweens.add({ targets: container, scale: 1.1, duration: 100 });
      }
    });
    
    this.grid[row][col] = container;
    return container;
  }

  private async handleSwipe(p1: GridPos, p2: GridPos) {
    const i1 = this.grid[p1.row][p1.col];
    if (i1) this.tweens.add({ targets: i1, scale: 1, duration: 100 });
    
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
    }
  }

  private async swap(p1: GridPos, p2: GridPos) {
    const i1 = this.grid[p1.row][p1.col]!;
    const i2 = this.grid[p2.row][p2.col]!;
    
    [this.grid[p1.row][p1.col], this.grid[p2.row][p2.col]] = [i2, i1];
    
    i1.setData({ row: p2.row, col: p2.col });
    i2.setData({ row: p1.row, col: p1.col });

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
      const unique = Array.from(new Set(matches.flatMap(m => m.positions).map(p => `${p.row},${p.col}`)))
        .map(s => { 
          const [r, c] = s.split(',').map(Number); 
          return { row: r, col: c }; 
        });

      // Защита от пустого массива unique
      if (combo > 1 && unique.length > 0) {
        this.fx.showCombo(this.getColX(unique[0].col), this.getRowY(unique[0].row), combo);
      }
      
      this.stats.score += unique.length * 10 * combo;
      
      unique.forEach(p => {
        const item = this.grid[p.row][p.col];
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
      await this.removeItems(unique);
      await this.applyGravity();
      matches = GridManager.getMatches(this.grid);
    }
  }

  private async removeItems(pos: GridPos[]) {
    await Promise.all(pos.map(p => {
      const item = this.grid[p.row][p.col];
      this.grid[p.row][p.col] = null;
      return new Promise<void>(res => {
        if (!item) return res();
        this.tweens.add({ targets: item, scale: 0, alpha: 0, duration: 200, onComplete: () => { 
          item.destroy(); 
          res(); 
        }});
      });
    }));
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
    this.initGrid(); 
  }
}
