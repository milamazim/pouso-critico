import { describe, expect, it } from 'vitest';
import { DT } from '../src/core/fixedStep';
import { DEFAULT_PHYSICS, SHIP_SIZE } from '../src/data/physics';
import { SHIPS } from '../src/data/ships';
import { SHIP_ART } from '../src/data/shipArt';
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

  it.each(SHIPS.map((s) => [s.name, s] as const))('%s tem desenho dentro da área e pés na base', (_, ship) => {
    const { rects } = SHIP_ART[ship.id];
    for (const [, x, y, w, h] of rects) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(x + w).toBeLessThanOrEqual(SHIP_SIZE);
      expect(y + h).toBeLessThanOrEqual(SHIP_SIZE);
    }
    const feet = rects.filter(([, , y, , h]) => y + h === SHIP_SIZE);
    expect(feet).toHaveLength(2);
  });
});
