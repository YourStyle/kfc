
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
    const g = this.scene.make.graphics({ x: 0, y: 0 });

    // Перо для курицы (эллипс с хвостиком)
    g.fillStyle(0xffffff);
    g.fillEllipse(10, 5, 16, 8);
    g.fillTriangle(0, 5, 4, 3, 4, 7);
    g.generateTexture('p-feather', 20, 10);

    // Крошка для бургера (круглая)
    g.clear().fillStyle(0xF5DEB3);
    g.fillCircle(5, 5, 5);
    g.generateTexture('p-crumb', 10, 10);

    // Листик салата для бургера
    g.clear().fillStyle(0x4CAF50);
    g.fillEllipse(8, 5, 14, 8);
    g.generateTexture('p-lettuce', 16, 10);

    // Кунжут для бургера
    g.clear().fillStyle(0xFFF8DC);
    g.fillEllipse(4, 3, 6, 4);
    g.generateTexture('p-sesame', 8, 6);

    // Палочка фри (прямоугольник со скруглением)
    g.clear().fillStyle(0xFFD700);
    g.fillRect(1, 0, 4, 12);
    g.generateTexture('p-fry', 6, 12);

    // Пузырёк для колы (контур)
    g.clear().lineStyle(2, 0xffffff, 0.9);
    g.strokeCircle(6, 6, 5);
    g.generateTexture('p-bubble', 12, 12);

    // Капля колы
    g.clear().fillStyle(0x3E2723);
    g.fillCircle(5, 6, 4);
    g.fillTriangle(5, 0, 2, 5, 8, 5);
    g.generateTexture('p-drop', 10, 10);

    // Ромб для баскета
    g.clear().fillStyle(0xE4002B);
    g.fillTriangle(7, 0, 14, 7, 7, 14);
    g.fillTriangle(7, 0, 0, 7, 7, 14);
    g.generateTexture('p-diamond', 14, 14);

    g.destroy();
  }

  private createParticleSystems() {
    // Курица - белые перья, плавно парят
    this.particleEmitters['chicken'] = this.scene.add.particles(0, 0, 'p-feather', {
      speed: { min: 40, max: 120 },
      scale: { start: 1, end: 0.3 },
      alpha: { start: 1, end: 0 },
      lifespan: 1400,
      gravityY: 80,
      rotate: { min: -180, max: 180 },
      tint: [0xFFFFFF, 0xFFF5E6, 0xD2B48C],
      emitting: false
    }).setDepth(500);

    // Бургер - крошки (создаём 3 эмиттера для разных частиц)
    this.particleEmitters['burger'] = this.scene.add.particles(0, 0, 'p-crumb', {
      speed: { min: 80, max: 200 },
      scale: { start: 0.8, end: 0.2 },
      alpha: { start: 1, end: 0 },
      lifespan: 800,
      gravityY: 450,
      rotate: { min: 0, max: 360 },
      tint: [0xF5DEB3, 0xDEB887],
      emitting: false
    }).setDepth(500);

    this.particleEmitters['burger-lettuce'] = this.scene.add.particles(0, 0, 'p-lettuce', {
      speed: { min: 60, max: 150 },
      scale: { start: 0.7, end: 0.2 },
      alpha: { start: 1, end: 0 },
      lifespan: 1000,
      gravityY: 200,
      rotate: { min: -90, max: 90 },
      emitting: false
    }).setDepth(500);

    this.particleEmitters['burger-sesame'] = this.scene.add.particles(0, 0, 'p-sesame', {
      speed: { min: 100, max: 250 },
      scale: { start: 1, end: 0.3 },
      alpha: { start: 1, end: 0 },
      lifespan: 700,
      gravityY: 500,
      emitting: false
    }).setDepth(500);

    // Картошка фри - золотистые палочки
    this.particleEmitters['fries'] = this.scene.add.particles(0, 0, 'p-fry', {
      speed: { min: 100, max: 220 },
      scale: { start: 1, end: 0.3 },
      alpha: { start: 1, end: 0 },
      lifespan: 900,
      gravityY: 400,
      rotate: { min: -60, max: 60 },
      tint: [0xFFD700, 0xFFA500],
      emitting: false
    }).setDepth(500);

    // Кола - пузырьки вверх + капли вниз
    this.particleEmitters['cola'] = this.scene.add.particles(0, 0, 'p-bubble', {
      speed: { min: 50, max: 150 },
      scale: { start: 0.7, end: 0.1 },
      alpha: { start: 0.8, end: 0 },
      lifespan: 1200,
      gravityY: -120,
      emitting: false
    }).setDepth(500);

    this.particleEmitters['cola-drops'] = this.scene.add.particles(0, 0, 'p-drop', {
      speed: { min: 80, max: 180 },
      scale: { start: 0.8, end: 0.2 },
      alpha: { start: 1, end: 0 },
      lifespan: 800,
      gravityY: 400,
      emitting: false
    }).setDepth(500);

    // Баскет - красные ромбы
    this.particleEmitters['bucket'] = this.scene.add.particles(0, 0, 'p-diamond', {
      speed: { min: 100, max: 250 },
      scale: { start: 0.8, end: 0.1 },
      alpha: { start: 1, end: 0 },
      lifespan: 900,
      gravityY: 350,
      rotate: { min: 0, max: 360 },
      tint: [0xE4002B, 0xFFFFFF],
      emitting: false
    }).setDepth(500);
  }

  public emitDeath(x: number, y: number, type: ItemType) {
    // Основной эмиттер (уменьшено для производительности)
    this.particleEmitters[type]?.emitParticleAt(x, y, 4);

    // Дополнительные эмиттеры для сложных эффектов
    if (type === 'burger') {
      this.particleEmitters['burger-lettuce']?.emitParticleAt(x, y, 2);
      this.particleEmitters['burger-sesame']?.emitParticleAt(x, y, 2);
    } else if (type === 'cola') {
      this.particleEmitters['cola-drops']?.emitParticleAt(x, y, 2);
    }
  }

  public showCombo(x: number, y: number, combo: number) {
    const texts = ["ХРУСТЬ!", "ВКУСНО!", "СОЧНО!", "КОМБО!", "ШЕФ!"];
    const label = this.scene.add.text(x, y, texts[Math.min(combo - 2, 4)], {
      fontSize: '56px', fontFamily: 'Oswald', fontStyle: '900', color: '#E4002B', stroke: '#fff', strokeThickness: 10, resolution: 1
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
      onComplete: () => {
        flyer.destroy();
        // Сообщаем UI о попадании в корзину для анимации
        this.scene.game.events.emit('basket-hit');
      }
    });
  }

  public showSpecialEffect(x: number, y: number, effectType: 'row' | 'column' | 'all_type' | 'double') {
    const { width, height } = this.scene.scale;

    // Смещаем надпись к центру если она близко к краю
    const paddingX = 100;
    const paddingTop = 200; // Не попадать под UI сверху
    const paddingBottom = 80;

    let adjustedX = x;
    let adjustedY = y;

    if (x < paddingX) adjustedX = paddingX;
    if (x > width - paddingX) adjustedX = width - paddingX;
    if (y < paddingTop) adjustedY = paddingTop;
    if (y > height - paddingBottom) adjustedY = height - paddingBottom;

    // Тексты связанные с едой
    const texts: Record<string, string[]> = {
      'row': ['ХРУСТЬ!', 'СОЧНО!', 'ГОРЯЧО!'],
      'column': ['ВКУСНОТА!', 'ОБЪЕДЕНИЕ!', 'СМАЧНО!'],
      'all_type': ['МЕГА-ЗАКАЗ!', 'ШЕФ-КОМБО!', 'БОМБА!'],
      'double': ['ДВОЙНАЯ!', 'ДВА В ОДНОМ!', 'ДАБЛ!']
    };

    const textOptions = texts[effectType];
    const text = textOptions[Math.floor(Math.random() * textOptions.length)];

    const label = this.scene.add.text(adjustedX, adjustedY, text, {
      fontSize: '42px',
      fontFamily: 'Oswald',
      fontStyle: '900',
      color: '#ffffff',
      stroke: '#E4002B',
      strokeThickness: 8,
      resolution: 1
    }).setOrigin(0.5).setDepth(1500).setScale(0).setAlpha(0);

    this.scene.tweens.add({
      targets: label,
      scale: 1.2,
      alpha: 1,
      duration: 400,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.scene.tweens.add({
          targets: label,
          scale: 0.8,
          alpha: 0,
          y: adjustedY - 40,
          duration: 500,
          delay: 400,
          ease: 'Cubic.easeIn',
          onComplete: () => label.destroy()
        });
      }
    });

    // Вспышка красно-белая
    const flash = this.scene.add.graphics();
    flash.fillStyle(0xE4002B, 0.4);
    flash.fillCircle(adjustedX, adjustedY, 80);
    flash.setDepth(1400);

    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 2.5,
      duration: 500,
      ease: 'Cubic.easeOut',
      onComplete: () => flash.destroy()
    });
  }
}
