import type { Point } from './level';

/** Máscara de pixels sólidos. A mesma máscara serve à colisão e ao desenho. */
export class TerrainMask {
  readonly data: Uint8Array;

  constructor(readonly width: number, readonly height: number, polygons: readonly (readonly Point[])[]) {
    this.data = new Uint8Array(width * height);
    for (const polygon of polygons) this.fill(polygon);
  }

  /** Fora da tela não há terreno. */
  isSolid(x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return false;
    return this.data[y * this.width + x] === 1;
  }

  /** Preenche por linhas de varredura, testando o centro de cada pixel. */
  private fill(polygon: readonly Point[]): void {
    for (let row = 0; row < this.height; row++) {
      const y = row + 0.5;
      const crossings: number[] = [];
      polygon.forEach((a, i) => {
        const b = polygon[(i + 1) % polygon.length]!;
        if (a.y <= y !== b.y <= y) crossings.push(a.x + ((y - a.y) / (b.y - a.y)) * (b.x - a.x));
      });
      crossings.sort((m, n) => m - n);
      for (let i = 0; i + 1 < crossings.length; i += 2) {
        const from = Math.max(0, Math.ceil(crossings[i]! - 0.5));
        const to = Math.min(this.width, Math.ceil(crossings[i + 1]! - 0.5));
        if (to > from) this.data.fill(1, row * this.width + from, row * this.width + to);
      }
    }
  }
}
