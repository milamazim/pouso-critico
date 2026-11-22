import { beforeEach, describe, expect, it } from 'vitest';
import { DT } from '../src/core/fixedStep';
import { DEFAULT_PHYSICS, SHIP_SIZE } from '../src/data/physics';
import { SHIPS } from '../src/data/ships';
import { Attempt, type SimEvent } from '../src/sim/attempt';
import {
  geyserAcceleration, GEYSER_PUSH, goalAt, goalVelocity, hitsPixel, isActive, isWarning, meteorPosition,
  type Geyser, type Hazard, type Laser, type Meteor,
} from '../src/sim/hazards';
import type { Goal, Level } from '../src/sim/level';
import { NO_COMMANDS, type ShipState } from '../src/sim/types';

const HALF = SHIP_SIZE / 2;
const UP = { ...NO_COMMANDS, up: true };

const meteor: Meteor = {
  type: 'meteor', from: { x: 0, y: 100 }, to: { x: 200, y: 100 }, radius: 6, speed: 100, period: 4, phase: 0,
};
const geyser: Geyser = { type: 'geyser', x: 100, y: 200, width: 20, height: 100, on: 1, period: 3, phase: 0 };
const laser: Laser = {
  type: 'laser', x: 100, y: 50, length: 80, direction: 'vertical', on: 1, period: 3, phase: 0,
};
const moving: Goal = { x: 200, y: 230, width: 64, motion: { amplitude: 30, period: 10, phase: 0 } };

describe('ciclos', () => {
  // [perigo, ativo até, aviso desde, período]
  it.each<[string, Hazard, number, number, number]>([
    ['meteoro', meteor, 2, 3.4, 4],
    ['gêiser', geyser, 1, 2.4, 3],
    ['laser', laser, 1, 2.6, 3],
  ])('%s: início, meio, aviso e virada', (_, h, activeUntil, warnFrom, period) => {
    expect(isActive(h, 0)).toBe(true);
    expect(isActive(h, activeUntil - 0.01)).toBe(true);
    expect(isActive(h, activeUntil + 0.01)).toBe(false);
    expect(isWarning(h, warnFrom - 0.01)).toBe(false);
    expect(isWarning(h, warnFrom + 0.01)).toBe(true);
    expect(isWarning(h, period - 0.01)).toBe(true);
    expect(isActive(h, period + 0.01)).toBe(true);
    expect(isWarning(h, period + 0.01)).toBe(false);
  });

  it('a fase adianta o ciclo', () => {
    expect(isActive({ ...laser, phase: 1.5 }, 0)).toBe(false);
    expect(isActive({ ...laser, phase: 1.5 }, 1.6)).toBe(true);
  });
});

describe('meteoro', () => {
  it('percorre a reta e reaparece no início', () => {
    expect(meteorPosition(meteor, 0)).toEqual({ x: 0, y: 100 });
    expect(meteorPosition(meteor, 1)).toEqual({ x: 100, y: 100 });
    expect(meteorPosition(meteor, 3)).toBeUndefined();
    expect(meteorPosition(meteor, 5)).toEqual({ x: 100, y: 100 });
  });

  it('atinge apenas o próprio círculo', () => {
    expect(hitsPixel(meteor, 1, 100, 100)).toBe(true);
    expect(hitsPixel(meteor, 1, 107, 100)).toBe(false);
    expect(hitsPixel(meteor, 3, 100, 100)).toBe(false);
  });
});

describe('laser', () => {
  it('atinge só a barreira, e só ligado', () => {
    expect(hitsPixel(laser, 0.5, 100, 90)).toBe(true);
    expect(hitsPixel(laser, 0.5, 99, 90)).toBe(false);
    expect(hitsPixel(laser, 0.5, 102, 90)).toBe(false);
    expect(hitsPixel(laser, 0.5, 100, 130)).toBe(false);
    expect(hitsPixel(laser, 2.9, 100, 90)).toBe(false);
  });

  it('também funciona na horizontal', () => {
    const h: Laser = { ...laser, direction: 'horizontal' };
    expect(hitsPixel(h, 0.5, 150, 51)).toBe(true);
    expect(hitsPixel(h, 0.5, 150, 52)).toBe(false);
  });
});

describe('gêiser', () => {
  it('empurra para cima só dentro da coluna e só ligado', () => {
    expect(geyserAcceleration([geyser], 0.5, 100, 150)).toBe(-GEYSER_PUSH);
    expect(geyserAcceleration([geyser], 0.5, 111, 150)).toBe(0);
    expect(geyserAcceleration([geyser], 0.5, 100, 99)).toBe(0);
    expect(geyserAcceleration([geyser], 0.5, 100, 201)).toBe(0);
    expect(geyserAcceleration([geyser], 1.5, 100, 150)).toBe(0);
  });

  it('nunca destrói', () => {
    expect(hitsPixel(geyser, 0.5, 100, 150)).toBe(false);
  });
});

describe('base móvel', () => {
  it('oscila em senoide', () => {
    expect(goalAt(moving, 0).x).toBeCloseTo(200);
    expect(goalAt(moving, 2.5).x).toBeCloseTo(230);
    expect(goalAt(moving, 5).x).toBeCloseTo(200);
    expect(goalAt(moving, 7.5).x).toBeCloseTo(170);
  });

  it('a velocidade é a derivada da posição', () => {
    for (let t = 0; t < 10; t += 0.7) {
      const e = 1e-4;
      const slope = (goalAt(moving, t + e).x - goalAt(moving, t - e).x) / (2 * e);
      expect(goalVelocity(moving, t)).toBeCloseTo(slope, 3);
    }
  });

  it('base fixa não se move', () => {
    const fixed: Goal = { x: 200, y: 230, width: 64 };
    expect(goalAt(fixed, 3)).toEqual(fixed);
    expect(goalVelocity(fixed, 3)).toBe(0);
  });
});

describe('perigos em jogo', () => {
  const level: Level = {
    id: 'test', version: 1, name: 'Teste', world: 'plain', startFuelPct: 100, fuelGoalPct: 40,
    terrain: [], base: { x: 20, y: 230, width: 40 }, goal: { x: 200, y: 230, width: 64 },
    crystals: [], fuelCans: [], hazards: [],
  };
  let events: SimEvent[];

  beforeEach(() => { events = []; });

  function start(changes: Partial<Level>): Attempt {
    const sim = new Attempt({ ...level, ...changes }, { ...SHIPS[0]! }, { ...DEFAULT_PHYSICS }, (e) => events.push(e));
    sim.step(UP);
    return sim;
  }

  function moveTo(sim: Attempt, state: Partial<ShipState>): void {
    sim.ship = { ...sim.ship, vx: 0, vy: 0, ...state };
    sim.step(NO_COMMANDS);
  }

  it.each<[string, Hazard]>([['meteor', { ...meteor, phase: 1 }], ['laser', laser]])('%s destrói a nave', (reason, h) => {
    const sim = start({ hazards: [h] });
    moveTo(sim, { x: 101, y: 100 });
    expect(events).toMatchObject([{ type: 'crash', reason }]);
  });

  it('ficam congelados até a decolagem', () => {
    const sim = new Attempt({ ...level, hazards: [meteor] }, { ...SHIPS[0]! }, { ...DEFAULT_PHYSICS });
    for (let i = 0; i < 100; i++) sim.step(NO_COMMANDS);
    expect(sim.time).toBe(0);
  });

  it('o perigo vence o pouso no mesmo passo', () => {
    const sim = start({ hazards: [{ ...laser, x: 230, y: 200, length: 25, on: 2.5 }] });
    moveTo(sim, { x: 232, y: 230 - HALF - 0.01, vy: 5 });
    expect(events).toMatchObject([{ type: 'crash', reason: 'laser' }]);
  });

  it('gêiser acelera a nave', () => {
    const sim = start({ hazards: [geyser] });
    moveTo(sim, { x: 100, y: 150 });
    expect(sim.ship.vy).toBeCloseTo((DEFAULT_PHYSICS.gravity - GEYSER_PUSH) * DT);
    expect(sim.phase).toBe('flying');
  });

  describe('pouso na base móvel', () => {
    // Em t ≈ 0, a base se move a 2π·30/10 ≈ 18,8 px/s para a direita.
    function touch(vx: number): Attempt {
      const sim = start({ goal: moving });
      moveTo(sim, { x: 232, y: 230 - HALF - 0.01, vx, vy: 5 });
      return sim;
    }

    it('aceita quem acompanha a base', () => {
      const sim = touch(18.8);
      expect(sim.phase).toBe('landed');
      expect(Math.abs(sim.lastOutcome!.vx)).toBeLessThan(0.2);
    });

    it('rejeita quem está parado em relação ao chão', () => {
      touch(0);
      expect(events).toMatchObject([{ type: 'crash', reason: 'speed' }]);
      expect(events[0]).toHaveProperty('vx', expect.closeTo(-18.8, 0));
    });

    it('os pés são comparados com a posição atual da base', () => {
      const sim = start({ goal: moving });
      while (sim.time < 2.5) moveTo(sim, { x: 400, y: 50 });
      // A base está em 230–294; em 215 a nave estaria sobre a posição original.
      moveTo(sim, { x: 215, y: 230 - HALF - 0.01, vy: 5 });
      expect(sim.phase).toBe('flying');
      sim.ship = { ...sim.ship, x: 262, y: 230 - HALF - 0.01, vx: 0, vy: 5 };
      sim.step(NO_COMMANDS);
      expect(sim.phase).toBe('landed');
    });
  });
});
