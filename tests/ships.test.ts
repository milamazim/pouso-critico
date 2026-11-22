import { describe, expect, it } from 'vitest';
import { DT } from '../src/core/fixedStep';
import { DEFAULT_PHYSICS, SHIP_SIZE } from '../src/data/physics';
import { SHIPS } from '../src/data/ships';
import { CRYSTAL_FRAMES, FUEL_CAN_SPRITE, SHIP_ART } from '../src/data/sprites';
import { HULLS } from '../src/sim/hull';
import { ITEM_SIZE } from '../src/sim/level';
import { stepShip } from '../src/sim/ship';
import { NO_COMMANDS, type ShipSpec, type ShipState } from '../src/sim/types';

/** Distância percorrida até anular uma queda de 60 px/s, medida na simulação. */
function brakingDistance(spec: Readonly<ShipSpec>): number {
  let s: ShipState = { x: 0, y: 0, vx: 0, vy: 60, fuel: spec.tank, engines: { ...NO_COMMANDS } };
  for (let i = 0; i < 600 && s.vy > 0; i++) {
    s = stepShip(s, { ...NO_COMMANDS, up: true }, spec, DEFAULT_PHYSICS, DT);
  }
  expect(s.vy).toBeLessThanOrEqual(0);
  return s.y;
}

describe('naves', () => {
  const [vagalume, besouro, libelula] = SHIPS.map(brakingDistance);

  it('têm distâncias de frenagem bem diferentes', () => {
    expect(vagalume).toBeGreaterThan(62);
    expect(vagalume).toBeLessThan(71);
    expect(besouro! / vagalume!).toBeGreaterThan(1.7);
    expect(vagalume! / libelula!).toBeGreaterThan(1.7);
  });

  it.each(SHIPS.map((s) => [s.name, s] as const))('%s tem sprite de 16 × 16 px com dois pés na base', (_, ship) => {
    const { rows, palette } = SHIP_ART[ship.id];
    expect(rows).toHaveLength(SHIP_SIZE);
    for (const row of rows) {
      expect(row).toHaveLength(SHIP_SIZE);
      for (const char of row) expect(char === '.' || palette[char] !== undefined, char).toBe(true);
    }
    expect(rows[SHIP_SIZE - 1]!.match(/[^.]+/g)).toHaveLength(2);
    // Simétrica: girar a nave não muda a colisão.
    for (const row of rows) {
      const solid = [...row].map((c) => c !== '.');
      expect(solid).toEqual([...solid].reverse());
    }
  });

  it('a largura dos pés é a esperada em cada nave', () => {
    expect([HULLS.vagalume.feetLeft, HULLS.vagalume.feetRight]).toEqual([1, 15]);
    expect([HULLS.besouro.feetLeft, HULLS.besouro.feetRight]).toEqual([0, 16]);
    expect([HULLS.libelula.feetLeft, HULLS.libelula.feetRight]).toEqual([3, 13]);
  });

  it('os bocais ficam fora do sprite ou na borda dele', () => {
    for (const { main, side } of Object.values(SHIP_ART)) {
      expect(main.x + main.w).toBeLessThanOrEqual(SHIP_SIZE);
      expect(side.left).toBeLessThan(side.right);
    }
  });

  it('itens cabem na área de coleta', () => {
    for (const sprite of [...CRYSTAL_FRAMES, FUEL_CAN_SPRITE]) {
      expect(sprite.rows.length).toBeLessThanOrEqual(ITEM_SIZE);
      for (const row of sprite.rows) {
        expect(row.length).toBe(sprite.rows[0]!.length);
        expect(row.length).toBeLessThanOrEqual(ITEM_SIZE);
        for (const char of row) expect(char === '.' || sprite.palette[char] !== undefined, char).toBe(true);
      }
    }
  });
});
