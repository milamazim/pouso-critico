interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Segundos restantes. */
  life: number;
  size: number;
  color: string;
}

const EXPLOSION_COLORS = ['#fff4c2', '#ffb13b', '#ff6b3b', '#8d90a8'];
const SOFT_EXPLOSION_COLORS = ['#b5532f', '#83392a', '#8d90a8'];
const DUST_COLORS = ['#b9b4a3', '#8a8778'];

const pick = (colors: readonly string[]): string => colors[Math.floor(Math.random() * colors.length)]!;

/** Efeitos visuais; não influenciam a simulação. */
export class Particles {
  private items: Particle[] = [];

  explode(x: number, y: number, vx: number, vy: number, flashes: boolean): void {
    for (let i = 0; i < 48; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 15 + Math.random() * 95;
      this.items.push({
        x, y,
        vx: Math.cos(angle) * speed + vx * 0.3,
        vy: Math.sin(angle) * speed - Math.abs(vy) * 0.2,
        life: 0.2 + Math.random() * 0.2,
        size: 1 + Math.floor(Math.random() * 3),
        color: pick(flashes ? EXPLOSION_COLORS : SOFT_EXPLOSION_COLORS),
      });
    }
  }

  dust(x: number, y: number): void {
    for (let i = 0; i < 20; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      this.items.push({
        x: x + side * 4, y,
        vx: side * (10 + Math.random() * 40),
        vy: -Math.random() * 14,
        life: 0.2 + Math.random() * 0.4,
        size: 1 + Math.floor(Math.random() * 2),
        color: pick(DUST_COLORS),
      });
    }
  }

  sparkle(x: number, y: number, color: string): void {
    for (let i = 0; i < 14; i++) {
      const angle = (i / 14) * Math.PI * 2;
      const speed = 25 + Math.random() * 25;
      this.items.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.2 + Math.random() * 0.2,
        size: 1,
        color,
      });
    }
  }

  step(dt: number): void {
    for (const p of this.items) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    }
    this.items = this.items.filter((p) => p.life > 0);
  }

  clear(): void {
    this.items = [];
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.items) {
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }
  }
}
