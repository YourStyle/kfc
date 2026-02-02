
import Phaser from 'phaser';
import { TILE_SIZE, GRID_SIZE } from '../constants';
import { GridPos } from '../types';

export class InputHandler {
  private scene: Phaser.Scene;
  private dragStartX = 0;
  private dragStartY = 0;
  private isDragging = false;
  private draggingItemPos: GridPos | null = null;
  private onSwipeCallback: (p1: GridPos, p2: GridPos) => void;

  constructor(scene: Phaser.Scene, onSwipe: (p1: GridPos, p2: GridPos) => void) {
    this.scene = scene;
    this.onSwipeCallback = onSwipe;
    this.setupListeners();
  }

  private setupListeners() {
    this.scene.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.isDragging || !this.draggingItemPos) return;

      const dx = p.x - this.dragStartX;
      const dy = p.y - this.dragStartY;
      const threshold = TILE_SIZE * 0.4;

      if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
        let { row, col } = this.draggingItemPos;
        if (Math.abs(dx) > Math.abs(dy)) {
          col += dx > 0 ? 1 : -1;
        } else {
          row += dy > 0 ? 1 : -1;
        }

        if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
          this.onSwipeCallback(this.draggingItemPos, { row, col });
        }
        this.isDragging = false;
        this.draggingItemPos = null;
      }
    });

    this.scene.input.on('pointerup', () => {
      this.isDragging = false;
      this.draggingItemPos = null;
    });
  }

  public startDrag(pointer: Phaser.Input.Pointer, pos: GridPos) {
    this.isDragging = true;
    this.dragStartX = pointer.x;
    this.dragStartY = pointer.y;
    this.draggingItemPos = pos;
  }
}
