import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_PHYSICS, SHIP_SIZE } from '../src/data/physics';
import { SHIPS } from '../src/data/ships';
import { Attempt, type SimEvent } from '../src/sim/attempt';
import { FUEL_CAN, type Level } from '../src/sim/level';
import { NO_COMMANDS, type ShipState } from '../src/sim/types';

const HALF = SHIP_SIZE / 2;
const UP = { ...NO_COMMANDS, up: true };

const level: Level = {
  id: 'test', version: 1, name: 'Teste', world: 'plain', startFuelPct: 100, fuelGoalPct: 40,
  terrain: [],
  base: { x: 20, y: 230, width: 40 },
  goal: { x: 200, y: 230, width: 64 },
  crystals: [{ x: 100, y: 100 }, { x: 300, y: 100 }],
  fuelCans: [{ x: 100, y: 160 }],
  hazards: [],
};

describe('itens', () => {
  let events: SimEvent[];
  let sim: Attempt;

  beforeEach(() => {
    events = [];
    sim = new Attempt(level, { ...SHIPS[0]! }, { ...DEFAULT_PHYSICS }, (e) => events.push(e));
    sim.step(UP);
  });

  function moveTo(x: number, y: number, state: Partial<ShipState> = {}): void {
    sim.ship = { ...sim.ship, vx: 0, vy: 0, ...state, x, y };
    sim.step(NO_COMMANDS);
  }

  function land(state: Partial<ShipState> = {}): void {
    moveTo(232, level.goal.y - HALF - 0.01, { vy: 8, ...state });
    expect(sim.phase).toBe('landed');
  }

  it('coleta cada cristal uma única vez', () => {
    moveTo(100, 100);
    moveTo(100, 100);
    expect(sim.crystalCount).toBe(1);
    expect(events.filter((e) => e.type === 'crystal')).toHaveLength(1);
    moveTo(300, 100);
    expect(sim.crystalCount).toBe(2);
  });

  it('só coleta ao encostar na área da nave', () => {
    // Meia nave (8) + meio item (5) = 13 px de distância entre os centros.
    moveTo(86.9, 100);
    expect(sim.crystalCount).toBe(0);
    moveTo(87.1, 100);
    expect(sim.crystalCount).toBe(1);
  });

  it('galão soma 25 unidades', () => {
    moveTo(100, 160, { fuel: 30 });
    expect(sim.ship.fuel).toBe(30 + FUEL_CAN);
    moveTo(100, 160);
    expect(sim.ship.fuel).toBe(30 + FUEL_CAN);
  });

  it('galão não passa do tanque', () => {
    moveTo(100, 160, { fuel: 90 });
    expect(sim.ship.fuel).toBe(100);
  });

  it('galão religa os motores de uma nave sem combustível', () => {
    moveTo(100, 160, { fuel: 0 });
    sim.step(UP);
    expect(sim.ship.engines.up).toBe(true);
  });

  it('todos os itens voltam ao reiniciar', () => {
    moveTo(100, 100);
    moveTo(100, 160);
    sim.reset();
    expect(sim.crystalCount).toBe(0);
    expect(sim.isCrystalTaken(0)).toBe(false);
    expect(sim.isCanTaken(0)).toBe(false);
  });

  it('pouso com tudo dá três estrelas', () => {
    moveTo(100, 100);
    moveTo(300, 100);
    land({ fuel: 40 });
    expect(sim.lastOutcome).toMatchObject({
      type: 'landed',
      result: { crystals: 2, fuelPct: 40, stars: { landing: true, crystals: true, fuel: true } },
    });
  });

  it('pouso sem itens e com pouco combustível dá só a primeira estrela', () => {
    moveTo(100, 100);
    land({ fuel: 39.9 });
    expect(sim.lastOutcome).toMatchObject({
      result: { crystals: 1, stars: { landing: true, crystals: false, fuel: false } },
    });
  });

  it('o percentual usa o tanque da nave escolhida', () => {
    sim.spec = { ...SHIPS[1]! };
    land({ fuel: SHIPS[1]!.tank / 2 });
    expect(sim.lastOutcome).toMatchObject({ result: { fuelPct: 50 } });
  });

  it('registra o tempo exato do pouso', () => {
    for (let i = 0; i < 57; i++) moveTo(150, 50);
    land();
    // 1 passo de decolagem + 57 + 1 do pouso = 59 passos.
    expect(sim.lastOutcome).toMatchObject({ result: { timeMs: Math.round((59 * 1000) / 60) } });
  });

  it('destruição não dá resultado nem estrelas', () => {
    moveTo(100, 100);
    moveTo(-20, 100);
    expect(sim.lastOutcome).toMatchObject({ type: 'crash' });
    expect(events.some((e) => e.type === 'landed')).toBe(false);
  });
});
