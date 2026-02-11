import { Container, Graphics } from 'pixi.js';
import { ItemType } from '../types';

interface Particle {
  graphics: Graphics;
  vx: number;
  vy: number;
  gravity: number;
  life: number;
  maxLife: number;
  rotationSpeed: number;
  scaleDecay: number;
}

export class ParticleSystem {
  private container: Container;
  private particles: Particle[] = [];
  private running = true;

  constructor(container: Container) {
    this.container = container;
    this.update();
  }

  public emit(x: number, y: number, type: ItemType) {
    switch (type) {
      case 'drumstick':
        this.emitFeathers(x, y);
        break;
      case 'wing':
        this.emitWingFeathers(x, y);
        break;
      case 'burger':
        this.emitBurgerParts(x, y);
        break;
      case 'fries':
        this.emitFries(x, y);
        break;
      case 'bucket':
        this.emitStars(x, y);
        break;
      case 'ice_cream':
        this.emitIceCream(x, y);
        break;
      case 'donut':
        this.emitSprinkles(x, y);
        break;
      case 'cappuccino':
        this.emitSteam(x, y);
        break;
      default:
        this.emitGeneric(x, y, 0xE4002B);
    }
  }

  // Ножка — золотисто-коричневые перья
  private emitFeathers(x: number, y: number) {
    const featherColors = [0xD4A574, 0xC4956A, 0xE8C89E, 0xB8865A]; // Оттенки курочки
    for (let i = 0; i < 6; i++) {
      const g = new Graphics();
      const color = featherColors[Math.floor(Math.random() * featherColors.length)];
      // Рисуем перо (эллипс с хвостиком)
      g.ellipse(0, 0, 12, 5);
      g.fill({ color });
      g.moveTo(-12, 0);
      g.lineTo(-18, 0);
      g.stroke({ color, width: 2 });

      g.x = x;
      g.y = y;
      g.rotation = Math.random() * Math.PI * 2;
      this.container.addChild(g);

      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 60;

      this.particles.push({
        graphics: g,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 100,
        gravity: 60,
        life: 1,
        maxLife: 1.2 + Math.random() * 0.4,
        rotationSpeed: (Math.random() - 0.5) * 4,
        scaleDecay: 0.3
      });
    }
  }

  // Бургер - крошки, салат, кунжут
  private emitBurgerParts(x: number, y: number) {
    // Крошки булки
    for (let i = 0; i < 5; i++) {
      const g = new Graphics();
      g.circle(0, 0, 3 + Math.random() * 3);
      g.fill({ color: 0xDEB887 }); // Цвет булки

      g.x = x;
      g.y = y;
      this.container.addChild(g);

      const angle = Math.random() * Math.PI * 2;
      const speed = 120 + Math.random() * 80;

      this.particles.push({
        graphics: g,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 80,
        gravity: 400,
        life: 1,
        maxLife: 0.6 + Math.random() * 0.3,
        rotationSpeed: 0,
        scaleDecay: 0.5
      });
    }

    // Листья салата
    for (let i = 0; i < 3; i++) {
      const g = new Graphics();
      g.ellipse(0, 0, 10, 6);
      g.fill({ color: 0x4CAF50 }); // Зелёный

      g.x = x;
      g.y = y;
      g.rotation = Math.random() * Math.PI;
      this.container.addChild(g);

      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 60;

      this.particles.push({
        graphics: g,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 60,
        gravity: 150,
        life: 1,
        maxLife: 0.8 + Math.random() * 0.4,
        rotationSpeed: (Math.random() - 0.5) * 6,
        scaleDecay: 0.3
      });
    }

    // Кунжут
    for (let i = 0; i < 4; i++) {
      const g = new Graphics();
      g.ellipse(0, 0, 4, 2);
      g.fill({ color: 0xFFF8DC }); // Кремовый

      g.x = x;
      g.y = y;
      g.rotation = Math.random() * Math.PI;
      this.container.addChild(g);

      const angle = Math.random() * Math.PI * 2;
      const speed = 150 + Math.random() * 100;

      this.particles.push({
        graphics: g,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 120,
        gravity: 500,
        life: 1,
        maxLife: 0.5 + Math.random() * 0.3,
        rotationSpeed: (Math.random() - 0.5) * 10,
        scaleDecay: 0.4
      });
    }
  }

  // Картошка фри - золотистые палочки
  private emitFries(x: number, y: number) {
    for (let i = 0; i < 6; i++) {
      const g = new Graphics();
      // Палочка фри
      g.roundRect(-3, -10, 6, 20, 2);
      g.fill({ color: 0xFFD700 }); // Золотистый
      g.stroke({ color: 0xFFA500, width: 1 }); // Оранжевая обводка

      g.x = x;
      g.y = y;
      g.rotation = Math.random() * Math.PI;
      this.container.addChild(g);

      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
      const speed = 100 + Math.random() * 80;

      this.particles.push({
        graphics: g,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 50,
        gravity: 350,
        life: 1,
        maxLife: 0.7 + Math.random() * 0.3,
        rotationSpeed: (Math.random() - 0.5) * 8,
        scaleDecay: 0.4
      });
    }
  }

  // Баскет — красные звёзды/искры
  private emitStars(x: number, y: number) {
    for (let i = 0; i < 8; i++) {
      const g = new Graphics();
      // Звезда
      const spikes = 4;
      const outerRadius = 8;
      const innerRadius = 4;

      g.moveTo(0, -outerRadius);
      for (let j = 0; j < spikes * 2; j++) {
        const radius = j % 2 === 0 ? outerRadius : innerRadius;
        const angle = (j * Math.PI) / spikes - Math.PI / 2;
        g.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
      }
      g.closePath();
      g.fill({ color: i % 2 === 0 ? 0xE4002B : 0xFFD700 }); // Красный и золотой

      g.x = x;
      g.y = y;
      g.rotation = Math.random() * Math.PI;
      this.container.addChild(g);

      const angle = Math.random() * Math.PI * 2;
      const speed = 120 + Math.random() * 80;

      this.particles.push({
        graphics: g,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 100,
        gravity: 250,
        life: 1,
        maxLife: 0.8 + Math.random() * 0.4,
        rotationSpeed: (Math.random() - 0.5) * 12,
        scaleDecay: 0.3
      });
    }
  }

  // Крылышко — лёгкие золотые пёрышки (более мелкие, чем у ножки)
  private emitWingFeathers(x: number, y: number) {
    const colors = [0xE8C89E, 0xDEB887, 0xD2B48C, 0xC4956A];
    for (let i = 0; i < 8; i++) {
      const g = new Graphics();
      const color = colors[Math.floor(Math.random() * colors.length)];
      g.ellipse(0, 0, 8, 3);
      g.fill({ color });

      g.x = x;
      g.y = y;
      g.rotation = Math.random() * Math.PI * 2;
      this.container.addChild(g);

      const angle = Math.random() * Math.PI * 2;
      const speed = 100 + Math.random() * 80;

      this.particles.push({
        graphics: g,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 120,
        gravity: 40,
        life: 1,
        maxLife: 1.4 + Math.random() * 0.4,
        rotationSpeed: (Math.random() - 0.5) * 6,
        scaleDecay: 0.3
      });
    }
  }

  // Мороженое — холодные капли и снежинки
  private emitIceCream(x: number, y: number) {
    const colors = [0xFFC0CB, 0xFFFFFF, 0xADD8E6, 0xFFF0F5];
    for (let i = 0; i < 7; i++) {
      const g = new Graphics();
      const color = colors[Math.floor(Math.random() * colors.length)];
      const size = 3 + Math.random() * 4;
      g.circle(0, 0, size);
      g.fill({ color, alpha: 0.9 });

      g.x = x + (Math.random() - 0.5) * 20;
      g.y = y;
      this.container.addChild(g);

      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 60;

      this.particles.push({
        graphics: g,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 80,
        gravity: 120,
        life: 1,
        maxLife: 1 + Math.random() * 0.5,
        rotationSpeed: 0,
        scaleDecay: 0.3
      });
    }
  }

  // Донат — цветные посыпки (sprinkles)
  private emitSprinkles(x: number, y: number) {
    const sprinkleColors = [0xFF69B4, 0xFF1493, 0xFFD700, 0x00CED1, 0xFF6347, 0x7B68EE];
    for (let i = 0; i < 10; i++) {
      const g = new Graphics();
      const color = sprinkleColors[Math.floor(Math.random() * sprinkleColors.length)];
      g.roundRect(-2, -5, 4, 10, 2);
      g.fill({ color });

      g.x = x;
      g.y = y;
      g.rotation = Math.random() * Math.PI;
      this.container.addChild(g);

      const angle = Math.random() * Math.PI * 2;
      const speed = 130 + Math.random() * 80;

      this.particles.push({
        graphics: g,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 100,
        gravity: 400,
        life: 1,
        maxLife: 0.7 + Math.random() * 0.3,
        rotationSpeed: (Math.random() - 0.5) * 12,
        scaleDecay: 0.4
      });
    }
  }

  // Капучино — пар и кофейные капли
  private emitSteam(x: number, y: number) {
    // Пар (вверх)
    for (let i = 0; i < 5; i++) {
      const g = new Graphics();
      const size = 6 + Math.random() * 6;
      g.circle(0, 0, size);
      g.fill({ color: 0xffffff, alpha: 0.4 });

      g.x = x + (Math.random() - 0.5) * 20;
      g.y = y;
      this.container.addChild(g);

      this.particles.push({
        graphics: g,
        vx: (Math.random() - 0.5) * 30,
        vy: -60 - Math.random() * 60,
        gravity: -20,
        life: 1,
        maxLife: 1.2 + Math.random() * 0.5,
        rotationSpeed: 0,
        scaleDecay: 0.2
      });
    }
    // Кофейные капли
    for (let i = 0; i < 4; i++) {
      const g = new Graphics();
      g.circle(0, 0, 3 + Math.random() * 3);
      g.fill({ color: 0x8B4513 });

      g.x = x;
      g.y = y;
      this.container.addChild(g);

      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 60;

      this.particles.push({
        graphics: g,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 50,
        gravity: 350,
        life: 1,
        maxLife: 0.6 + Math.random() * 0.3,
        rotationSpeed: 0,
        scaleDecay: 0.5
      });
    }
  }

  private emitGeneric(x: number, y: number, color: number) {
    for (let i = 0; i < 6; i++) {
      const g = new Graphics();
      g.circle(0, 0, 5);
      g.fill({ color });

      g.x = x;
      g.y = y;
      this.container.addChild(g);

      const angle = Math.random() * Math.PI * 2;
      const speed = 100 + Math.random() * 80;

      this.particles.push({
        graphics: g,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 80,
        gravity: 300,
        life: 1,
        maxLife: 0.7,
        rotationSpeed: 0,
        scaleDecay: 0.5
      });
    }
  }

  private update = () => {
    if (!this.running) return;

    const dt = 1 / 60;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      // Физика
      p.vy += p.gravity * dt;
      p.graphics.x += p.vx * dt;
      p.graphics.y += p.vy * dt;
      p.graphics.rotation += p.rotationSpeed * dt;

      // Жизнь
      p.life -= dt / p.maxLife;

      // Затухание
      p.graphics.alpha = Math.max(0, p.life);
      const scale = p.scaleDecay + (1 - p.scaleDecay) * p.life;
      p.graphics.scale.set(scale);

      // Удаляем мёртвые частицы
      if (p.life <= 0) {
        this.container.removeChild(p.graphics);
        p.graphics.destroy();
        this.particles.splice(i, 1);
      }
    }

    requestAnimationFrame(this.update);
  };

  public destroy() {
    this.running = false;
    this.particles.forEach(p => {
      this.container.removeChild(p.graphics);
      p.graphics.destroy();
    });
    this.particles = [];
  }
}
