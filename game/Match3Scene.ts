
import Phaser from 'phaser';
import { GRID_SIZE, TILE_SIZE, ITEM_TYPES, ITEM_DATA } from '../constants';
import { GridPos } from '../types';

export class Match3Scene extends Phaser.Scene {
  // Explicitly declare Phaser Scene properties to fix TypeScript errors when using default import
  public add!: Phaser.GameObjects.GameObjectFactory;
  public tweens!: Phaser.Tweens.TweenManager;
  public cameras!: Phaser.Cameras.Scene2D.CameraManager;
  public scale!: Phaser.Scale.ScaleManager;
  public events!: Phaser.Events.EventEmitter;
  public game!: Phaser.Game;

  private grid: (Phaser.GameObjects.Container | null)[][] = [];
  private selectedItem: GridPos | null = null;
  private isProcessing: boolean = false;
  private score: number = 0;
  private moves: number = 30;

  constructor() {
    super('Match3Scene');
  }

  create() {
    this.cameras.main.setBackgroundColor('#1a1a1a');
    this.createBackground();
    this.initGrid();
    
    this.events.on('reset-game', () => this.resetGame());
  }

  private createBackground() {
    const { width, height } = this.scale;
    
    const stripeWidth = 40;
    for (let i = 0; i < width; i += stripeWidth * 2) {
      this.add.rectangle(i + stripeWidth/2, height/2, stripeWidth, height, 0xE4002B, 0.1);
    }

    const boardBgWidth = GRID_SIZE * TILE_SIZE + 20;
    const boardBgHeight = GRID_SIZE * TILE_SIZE + 20;
    const boardX = width / 2;
    const boardY = height / 2 + 30;

    this.add.rectangle(boardX, boardY, boardBgWidth, boardBgHeight, 0x333333, 0.8)
      .setStrokeStyle(4, 0xE4002B);
  }

  private initGrid() {
    for (let r = 0; r < GRID_SIZE; r++) {
      this.grid[r] = [];
      for (let c = 0; c < GRID_SIZE; c++) {
        this.spawnItem(r, c);
      }
    }

    while (this.findAllMatches().length > 0) {
      this.clearBoardInstant();
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          this.spawnItem(r, c);
        }
      }
    }
  }

  private clearBoardInstant() {
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (this.grid[r][c]) {
          this.grid[r][c]?.destroy();
          this.grid[r][c] = null;
        }
      }
    }
  }

  private spawnItem(row: number, col: number) {
    const type = Phaser.Utils.Array.GetRandom(ITEM_TYPES);
    const x = this.getColX(col);
    const y = this.getRowY(row);

    const container = this.add.container(x, y);
    const bg = this.add.circle(0, 0, 28, 0xffffff, 0.05);
    const emoji = this.add.text(0, 0, ITEM_DATA[type].emoji, {
      fontSize: '40px',
    }).setOrigin(0.5);

    container.add([bg, emoji]);
    container.setData('type', type);
    container.setData('row', row);
    container.setData('col', col);

    container.setSize(TILE_SIZE, TILE_SIZE);
    container.setInteractive();

    container.on('pointerdown', () => this.handleItemClick(row, col));

    this.grid[row][col] = container;
    
    container.setScale(0);
    this.tweens.add({
      targets: container,
      scale: 1,
      duration: 300,
      ease: 'Back.easeOut'
    });
  }

  private getColX(col: number) {
    const boardWidth = GRID_SIZE * TILE_SIZE;
    const startX = (this.scale.width - boardWidth) / 2 + TILE_SIZE / 2;
    return startX + col * TILE_SIZE;
  }

  private getRowY(row: number) {
    const boardHeight = GRID_SIZE * TILE_SIZE;
    const startY = (this.scale.height - boardHeight) / 2 + TILE_SIZE / 2 + 30;
    return startY + row * TILE_SIZE;
  }

  private async handleItemClick(row: number, col: number) {
    if (this.isProcessing || this.moves <= 0) return;

    if (!this.selectedItem) {
      this.selectedItem = { row, col };
      this.grid[row][col]?.setScale(1.2);
    } else {
      const first = this.selectedItem;
      const second = { row, col };
      
      this.grid[first.row][first.col]?.setScale(1.0);

      if (this.isAdjacent(first, second)) {
        await this.swapItems(first, second);
        const matches = this.findAllMatches();
        
        if (matches.length > 0) {
          this.moves--;
          this.updateReactUI();
          await this.processMatches();
        } else {
          await this.swapItems(first, second);
        }
      }
      this.selectedItem = null;
    }
  }

  private isAdjacent(pos1: GridPos, pos2: GridPos) {
    const rowDiff = Math.abs(pos1.row - pos2.row);
    const colDiff = Math.abs(pos1.col - pos2.col);
    return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
  }

  private async swapItems(pos1: GridPos, pos2: GridPos) {
    this.isProcessing = true;
    const item1 = this.grid[pos1.row][pos1.col]!;
    const item2 = this.grid[pos2.row][pos2.col]!;

    this.grid[pos1.row][pos1.col] = item2;
    this.grid[pos2.row][pos2.col] = item1;

    item1.setData('row', pos2.row);
    item1.setData('col', pos2.col);
    item2.setData('row', pos1.row);
    item2.setData('col', pos1.col);

    return new Promise<void>((resolve) => {
      this.tweens.add({
        targets: item1,
        x: this.getColX(pos2.col),
        y: this.getRowY(pos2.row),
        duration: 300,
        ease: 'Cubic.easeInOut'
      });
      this.tweens.add({
        targets: item2,
        x: this.getColX(pos1.col),
        y: this.getRowY(pos1.row),
        duration: 300,
        ease: 'Cubic.easeInOut',
        onComplete: () => {
          this.isProcessing = false;
          resolve();
        }
      });
    });
  }

  private findAllMatches(): GridPos[] {
    const matchPositions: Set<string> = new Set();

    for (let r = 0; r < GRID_SIZE; r++) {
      let count = 1;
      for (let c = 1; c < GRID_SIZE; c++) {
        if (this.grid[r][c]?.getData('type') === this.grid[r][c - 1]?.getData('type')) {
          count++;
        } else {
          if (count >= 3) {
            for (let i = 0; i < count; i++) matchPositions.add(`${r},${c - 1 - i}`);
          }
          count = 1;
        }
      }
      if (count >= 3) {
        for (let i = 0; i < count; i++) matchPositions.add(`${r},${GRID_SIZE - 1 - i}`);
      }
    }

    for (let c = 0; c < GRID_SIZE; c++) {
      let count = 1;
      for (let r = 1; r < GRID_SIZE; r++) {
        if (this.grid[r][c]?.getData('type') === this.grid[r - 1][c]?.getData('type')) {
          count++;
        } else {
          if (count >= 3) {
            for (let i = 0; i < count; i++) matchPositions.add(`${r - 1 - i},${c}`);
          }
          count = 1;
        }
      }
      if (count >= 3) {
        for (let i = 0; i < count; i++) matchPositions.add(`${GRID_SIZE - 1 - i},${c}`);
      }
    }

    return Array.from(matchPositions).map(s => {
      const [r, c] = s.split(',').map(Number);
      return { row: r, col: c };
    });
  }

  private async processMatches() {
    this.isProcessing = true;
    let matches = this.findAllMatches();

    while (matches.length > 0) {
      this.score += matches.length * 10;
      this.updateReactUI();

      await Promise.all(matches.map(pos => {
        const item = this.grid[pos.row][pos.col];
        if (!item) return Promise.resolve();
        
        return new Promise<void>((resolve) => {
          this.tweens.add({
            targets: item,
            scale: 0,
            alpha: 0,
            duration: 300,
            onComplete: () => {
              item.destroy();
              this.grid[pos.row][pos.col] = null;
              resolve();
            }
          });
        });
      }));

      await this.dropItems();
      await this.refillBoard();
      matches = this.findAllMatches();
    }

    this.isProcessing = false;
    if (this.moves <= 0) {
        this.game.events.emit('game-over', this.score);
    }
  }

  private async dropItems() {
    const dropPromises: Promise<void>[] = [];
    for (let c = 0; c < GRID_SIZE; c++) {
      let emptySlots = 0;
      for (let r = GRID_SIZE - 1; r >= 0; r--) {
        if (this.grid[r][c] === null) {
          emptySlots++;
        } else if (emptySlots > 0) {
          const item = this.grid[r][c]!;
          const newRow = r + emptySlots;
          this.grid[newRow][c] = item;
          this.grid[r][c] = null;
          item.setData('row', newRow);
          
          dropPromises.push(new Promise<void>((resolve) => {
            this.tweens.add({
              targets: item,
              y: this.getRowY(newRow),
              duration: 200,
              ease: 'Bounce.easeOut',
              onComplete: () => resolve()
            });
          }));
        }
      }
    }
    await Promise.all(dropPromises);
  }

  private async refillBoard() {
    const refillPromises: Promise<void>[] = [];
    for (let c = 0; c < GRID_SIZE; c++) {
      for (let r = 0; r < GRID_SIZE; r++) {
        if (this.grid[r][c] === null) {
          const type = Phaser.Utils.Array.GetRandom(ITEM_TYPES);
          const x = this.getColX(c);
          const y = this.getRowY(r);
          
          const container = this.add.container(x, y - 500); 
          const bg = this.add.circle(0, 0, 28, 0xffffff, 0.05);
          const emoji = this.add.text(0, 0, ITEM_DATA[type].emoji, {
            fontSize: '40px',
          }).setOrigin(0.5);

          container.add([bg, emoji]);
          container.setData('type', type);
          container.setData('row', r);
          container.setData('col', c);
          container.setSize(TILE_SIZE, TILE_SIZE);
          container.setInteractive();
          container.on('pointerdown', () => this.handleItemClick(r, c));

          this.grid[r][c] = container;

          refillPromises.push(new Promise<void>((resolve) => {
            this.tweens.add({
              targets: container,
              y: this.getRowY(r),
              duration: 400,
              ease: 'Back.easeOut',
              onComplete: () => resolve()
            });
          }));
        }
      }
    }
    await Promise.all(refillPromises);
  }

  private updateReactUI() {
    this.game.events.emit('update-stats', { score: this.score, moves: this.moves });
  }

  private resetGame() {
    this.score = 0;
    this.moves = 30;
    this.isProcessing = false;
    this.clearBoardInstant();
    this.initGrid();
    this.updateReactUI();
  }
}
