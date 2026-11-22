import type { Sprite } from '../data/sprites';

const cache = new Map<Sprite, HTMLCanvasElement>();

/** Converte a matriz em canvas na primeira vez e a reaproveita depois. */
export function spriteCanvas(sprite: Sprite): HTMLCanvasElement {
  const cached = cache.get(sprite);
  if (cached) return cached;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(...sprite.rows.map((r) => r.length));
  canvas.height = sprite.rows.length;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    sprite.rows.forEach((row, y) => {
      [...row].forEach((char, x) => {
        const color = sprite.palette[char];
        if (!color) return;
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 1, 1);
      });
    });
  }
  cache.set(sprite, canvas);
  return canvas;
}
