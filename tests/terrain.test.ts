import { describe, expect, it } from 'vitest';
import { TerrainMask } from '../src/sim/terrain';

const square = [{ x: 2, y: 3 }, { x: 6, y: 3 }, { x: 6, y: 7 }, { x: 2, y: 7 }];

describe('TerrainMask', () => {
  it('preenche exatamente os pixels do polígono', () => {
    const mask = new TerrainMask(10, 10, [square]);
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        expect(mask.isSolid(x, y)).toBe(x >= 2 && x < 6 && y >= 3 && y < 7);
      }
    }
  });

  it('aceita o polígono nos dois sentidos e partes fora da tela', () => {
    const reversed = new TerrainMask(10, 10, [[...square].reverse()]);
    expect(reversed.data).toEqual(new TerrainMask(10, 10, [square]).data);
    const big = new TerrainMask(4, 4, [[{ x: -9, y: -9 }, { x: 9, y: -9 }, { x: 9, y: 9 }, { x: -9, y: 9 }]]);
    expect(big.data.every((v) => v === 1)).toBe(true);
  });

  it('preenche formas côncavas sem tapar o vão', () => {
    const u = [
      { x: 0, y: 0 }, { x: 3, y: 0 }, { x: 3, y: 6 }, { x: 7, y: 6 },
      { x: 7, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 },
    ];
    const mask = new TerrainMask(10, 10, [u]);
    expect(mask.isSolid(1, 2)).toBe(true);
    expect(mask.isSolid(5, 2)).toBe(false);
    expect(mask.isSolid(8, 2)).toBe(true);
    expect(mask.isSolid(5, 8)).toBe(true);
  });

  it('considera vazio tudo que está fora da tela', () => {
    const mask = new TerrainMask(4, 4, [[{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 4 }, { x: 0, y: 4 }]]);
    for (const [x, y] of [[-1, 0], [4, 0], [0, -1], [0, 4]] as const) expect(mask.isSolid(x, y)).toBe(false);
  });
});
