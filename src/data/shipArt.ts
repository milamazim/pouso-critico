import type { ShipId } from '../sim/types';

/** Retângulo em pixels locais (0–15): cor, x, y, largura, altura. */
export type Rect = readonly [color: string, x: number, y: number, w: number, h: number];

export interface ShipArt {
  readonly rects: readonly Rect[];
  /** Bocal principal: a chama desce a partir de `y`. */
  readonly main: { readonly x: number; readonly y: number; readonly w: number; readonly length: number };
  /** Bocais laterais: a chama esquerda termina em `left`; a direita começa em `right`. */
  readonly side: { readonly left: number; readonly right: number; readonly y: number; readonly length: number };
  readonly flame: string;
}

/** Desenhos provisórios, dentro de 16 × 16 px e com os pés na última linha. */
export const SHIP_ART: Readonly<Record<ShipId, ShipArt>> = {
  // Cápsula creme com cabine ciano.
  vagalume: {
    rects: [
      ['#e8e2cf', 5, 1, 6, 2],
      ['#e8e2cf', 3, 3, 10, 8],
      ['#b9b09a', 3, 10, 10, 1],
      ['#3fb6c9', 5, 4, 6, 4],
      ['#c9f2f7', 6, 5, 2, 1],
      ['#8d90a8', 6, 11, 4, 2],
      ['#8d90a8', 2, 11, 2, 4],
      ['#8d90a8', 12, 11, 2, 4],
      ['#8d90a8', 1, 15, 4, 1],
      ['#8d90a8', 11, 15, 4, 1],
    ],
    main: { x: 6, y: 13, w: 4, length: 6 },
    side: { left: 3, right: 13, y: 6, length: 4 },
    flame: '#ffb13b',
  },
  // Casco largo e baixo, com pernas grossas.
  besouro: {
    rects: [
      ['#3f7d4f', 4, 5, 8, 1],
      ['#3f7d4f', 2, 6, 12, 1],
      ['#2f6340', 0, 7, 16, 4],
      ['#3f7d4f', 1, 7, 6, 2],
      ['#3f7d4f', 9, 7, 6, 2],
      ['#1c3d28', 7, 5, 2, 6],
      ['#f2cf63', 5, 8, 2, 2],
      ['#f2cf63', 9, 8, 2, 2],
      ['#8a7a55', 5, 11, 6, 2],
      ['#8a7a55', 1, 11, 3, 4],
      ['#8a7a55', 12, 11, 3, 4],
      ['#8a7a55', 0, 15, 5, 1],
      ['#8a7a55', 11, 15, 5, 1],
    ],
    main: { x: 5, y: 13, w: 6, length: 4 },
    side: { left: 0, right: 16, y: 9, length: 3 },
    flame: '#ff8a3b',
  },
  // Corpo fino e alto, com asas laterais.
  libelula: {
    rects: [
      ['#d7b8ff', 7, 0, 2, 2],
      ['#b58be8', 6, 2, 4, 9],
      ['#7ff0e0', 7, 3, 2, 3],
      ['#e9dcff', 1, 5, 5, 1],
      ['#e9dcff', 10, 5, 5, 1],
      ['#9a86c9', 2, 7, 4, 1],
      ['#9a86c9', 10, 7, 4, 1],
      ['#6f5a9c', 7, 11, 2, 2],
      ['#6f5a9c', 5, 11, 1, 2],
      ['#6f5a9c', 10, 11, 1, 2],
      ['#6f5a9c', 4, 13, 1, 2],
      ['#6f5a9c', 11, 13, 1, 2],
      ['#6f5a9c', 3, 15, 2, 1],
      ['#6f5a9c', 11, 15, 2, 1],
    ],
    main: { x: 7, y: 13, w: 2, length: 9 },
    side: { left: 1, right: 15, y: 5, length: 6 },
    flame: '#7fd8ff',
  },
};
