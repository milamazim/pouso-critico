import { SHIP_SIZE } from '../data/physics';
import { SHIP_ART } from '../data/shipArt';
import type { ShipId } from './types';

/** Forma de colisão, em pixels locais (0–15), extraída do próprio desenho. */
export interface Hull {
  readonly pixels: readonly { readonly x: number; readonly y: number }[];
  /** Limite esquerdo (incluso) e direito (excluso) dos pés. */
  readonly feetLeft: number;
  readonly feetRight: number;
}

function buildHull(id: ShipId): Hull {
  const solid = new Set<number>();
  for (const [, x, y, w, h] of SHIP_ART[id].rects) {
    for (let j = y; j < y + h; j++) {
      for (let i = x; i < x + w; i++) solid.add(j * SHIP_SIZE + i);
    }
  }
  const pixels = [...solid].map((k) => ({ x: k % SHIP_SIZE, y: Math.floor(k / SHIP_SIZE) }));
  const feet = pixels.filter((p) => p.y === SHIP_SIZE - 1).map((p) => p.x);
  return { pixels, feetLeft: Math.min(...feet), feetRight: Math.max(...feet) + 1 };
}

export const HULLS: Readonly<Record<ShipId, Hull>> = {
  vagalume: buildHull('vagalume'),
  besouro: buildHull('besouro'),
  libelula: buildHull('libelula'),
};
