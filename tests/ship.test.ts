import { describe, expect, it } from 'vitest';
import { DT } from '../src/core/fixedStep';
import { DEFAULT_PHYSICS } from '../src/data/physics';
import { SHIPS } from '../src/data/ships';
import { stepShip } from '../src/sim/ship';
import { NO_COMMANDS, type Commands, type ShipState } from '../src/sim/types';

const spec = SHIPS[0]!;
const base: ShipState = { x: 100, y: 100, vx: 0, vy: 0, fuel: 100, engines: { ...NO_COMMANDS } };

function step(commands: Partial<Commands> = {}, state: Partial<ShipState> = {}): ShipState {
  return stepShip({ ...base, ...state }, { ...NO_COMMANDS, ...commands }, spec, DEFAULT_PHYSICS, DT);
}

describe('stepShip', () => {
  it('cai com a gravidade e usa Euler semi-implícito', () => {
    const s = step();
    expect(s.vy).toBeCloseTo(18 * DT);
    expect(s.y).toBeCloseTo(100 + 18 * DT * DT, 8);
    expect(s.fuel).toBe(100);
  });

  it.each([
    [{ up: true }, 0, 18 - 45, 9],
    [{ right: true }, 22, 18, 3],
    [{ left: true }, -22, 18, 3],
    [{ left: true, right: true }, 0, 18, 6],
    [{ up: true, right: true }, 22, 18 - 45, 12],
  ])('aplica empuxo e consumo: %o', (commands, ax, ay, burn) => {
    const s = step(commands);
    expect(s.vx).toBeCloseTo(ax * DT);
    expect(s.vy).toBeCloseTo(ay * DT);
    expect(100 - s.fuel).toBeCloseTo(burn * DT);
  });

  it('mantém a velocidade horizontal sem comando (inércia)', () => {
    expect(step({}, { vx: 30 }).vx).toBe(30);
  });

  it('limita a velocidade nos dois eixos', () => {
    expect(step({ right: true }, { vx: 140, vy: 140 })).toMatchObject({ vx: 140, vy: 140 });
    expect(step({ left: true, up: true }, { vx: -140, vy: -140 })).toMatchObject({ vx: -140, vy: -140 });
  });

  it('nunca fica com combustível negativo e apaga os motores no vazio', () => {
    expect(step({ up: true }, { fuel: 0.01 }).fuel).toBe(0);
    const s = step({ up: true, right: true }, { fuel: 0 });
    expect(s.engines).toEqual(NO_COMMANDS);
    expect(s.vx).toBe(0);
    expect(s.vy).toBeGreaterThan(0);
  });

  it('não altera o estado recebido', () => {
    const frozen = Object.freeze({ ...base });
    stepShip(frozen, { up: true, left: true, right: false }, spec, DEFAULT_PHYSICS, DT);
    expect(frozen).toEqual(base);
  });

  it('todas as naves vencem a gravidade', () => {
    for (const ship of SHIPS) expect(ship.mainThrust).toBeGreaterThan(DEFAULT_PHYSICS.gravity);
  });
});
