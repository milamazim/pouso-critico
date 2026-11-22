import type { Point } from '../sim/level';

/** Converte pares [x, y] em pontos. */
export const pts = (...pairs: readonly (readonly [number, number])[]): Point[] =>
  pairs.map(([x, y]) => ({ x, y }));
