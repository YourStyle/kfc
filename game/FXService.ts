
import Phaser from 'phaser';
import { ITEM_DATA, ITEM_TYPES, TILE_SIZE } from '../constants';
import { ItemType } from '../types';

export class FXService {
  private scene: Phaser.Scene;
  private particleEmitters: Record<string, Phaser.GameObjects.Particles.ParticleEmitter> = {};

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.createParticleTextures();
    this.createParticleSystems();
  }

  private createParticleTextures() {
    const graphics = this.scene.make.graphics({ x: 0, y: 0 });
    graphics.fillStyle(0xffffff).fillCircle(4, 4, 4).generateTexture('p-dot', 8, 8);
    graphics.clear().fillStyle(0xffffff).fillEllipse(4, 2, 8, 3).generateTexture('p-feather', 8, 4);
    graphics.clear().lineStyle(1, 0xffffff).strokeCircle(4, 4, 3).generateTexture('p-bubble', 8, 8);
    graphics.clear().fillStyle(0xffffff).fillRect(2, 0, 4, 8).generateTexture('p-slice', 8, 8);
    graphics.destroy();
  }

  private createParticleSystems() {
    ITEM_TYPES.forEach(type => {
      const data = ITEM_DATA[type];
      const tex = data.particleType === 'feather' ? 'p-feather' : 
                  data.particleType === 'bubble' ? 'p-bubble' : 
                  data.particleType === 'slice' ? 'p-slice' : 'p-dot';

      this.particleEmitters[type] = this.scene.add.particles(0, 0, tex, {
        speed: { min: 80, max: 250 },
        scale: { start: 1, end: 0 },
        alpha: { start: 1, end: 0 },
        lifespan: 1000,
        gravityY: 500,
        emitting: false,
        tint: data.particleColor
      }).setDepth(500);
    });
  }

  public emitDeath(x: number, y: number, type: ItemType) {
    this.particleEmitters[type]?.emitParticleAt(x, y, 12);
  }

  public showCombo(x: number, y: number, combo: number) {
    const texts = ["ХРУСТЬ!", "ВКУСНО!", "СОЧНО!", "КОМБО!", "ШЕФ!"];
    const label = this.scene.add.text(x, y, texts[Math.min(combo - 2, 4)], {
      fontSize: '56px', fontFamily: 'Oswald', fontStyle: '900', color: '#E4002B', stroke: '#fff', strokeThickness: 10
    }).setOrigin(0.5).setDepth(1000).setScale(0.5).setAlpha(0);

    this.scene.tweens.add({
      targets: label, y: y - 80, alpha: 1, scale: 1.1, duration: 400, ease: 'Back.easeOut',
      onComplete: () => this.scene.tweens.add({
        targets: label, alpha: 0, y: y - 120, duration: 300, delay: 500, onComplete: () => label.destroy()
      })
    });
  }

  public flyToBasket(startX: number, startY: number) {
    // Координаты корзины в UI (левый верхний угол Stats Bar)
    const targetX = 120;
    const targetY = 140;

    const flyer = this.scene.add.image(startX, startY, 'item-chicken')
      .setDisplaySize(TILE_SIZE * 0.7, TILE_SIZE * 0.7)
      .setDepth(2000);

    this.scene.tweens.add({
      targets: flyer,
      x: targetX, y: targetY,
      scale: 0.2, alpha: 0.2, rotation: 5,
      duration: 800, ease: 'Cubic.easeOut',
      onComplete: () => flyer.destroy()
    });
  }
}
