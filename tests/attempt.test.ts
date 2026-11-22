import { beforeEach, describe, expect, it } from 'vitest';
import { DT } from '../src/core/fixedStep';
import { DEFAULT_PHYSICS, SHIP_SIZE } from '../src/data/physics';
import { SHIPS } from '../src/data/ships';
import { Attempt, CRASH_STEPS, type SimEvent } from '../src/sim/attempt';
import type { Level } from '../src/sim/level';
import { NO_COMMANDS, type ShipState } from '../src/sim/types';

const HALF = SHIP_SIZE / 2;
const UP = { ...NO_COMMANDS, up: true };
const RIGHT = { ...NO_COMMANDS, right: true };
const GRAVITY_STEP = DEFAULT_PHYSICS.gravity * DT;

const level: Level = {
  id: 'test', version: 1, name: 'Teste', world: 'plain',
  startFuelPct: 100, fuelGoalPct: 40,
  terrain: [[{ x: 0, y: 240 }, { x: 300, y: 240 }, { x: 300, y: 270 }, { x: 0, y: 270 }]],
  base: { x: 20, y: 230, width: 40 },
  goal: { x: 200, y: 230, width: 64 },
  crystals: [], fuelCans: [], hazards: [],
};

function repeat(n: number, fn: () => void): void {
  for (let i = 0; i < n; i++) fn();
}

describe('Attempt', () => {
  let outcomes: SimEvent[];
  let sim: Attempt;

  beforeEach(() => {
    outcomes = [];
    sim = new Attempt(level, { ...SHIPS[0]! }, { ...DEFAULT_PHYSICS }, (o) => outcomes.push(o));
  });

  /** Inicia o voo e coloca a nave em um estado específico. */
  function place(state: Partial<ShipState>): void {
    sim.step(UP);
    sim.ship = { ...sim.ship, vx: 0, vy: 0, ...state };
  }

  /** Toca a plataforma com a velocidade vertical exata, já descontada a gravidade do passo. */
  function touch(vy: number, vx = 0, x = 232): void {
    place({ x, y: level.goal.y - HALF - 0.01, vx, vy: vy - GRAVITY_STEP });
    sim.step(NO_COMMANDS);
  }

  describe('início e reinício', () => {
    it('fica apoiado na base até acionar o motor principal', () => {
      repeat(30, () => sim.step(NO_COMMANDS));
      repeat(30, () => sim.step(RIGHT));
      expect(sim.phase).toBe('ready');
      expect(sim.time).toBe(0);
      sim.step(UP);
      expect(sim.phase).toBe('flying');
      expect(sim.time).toBeCloseTo(DT);
    });

    it('após reiniciar, exige soltar a tecla', () => {
      sim.step(UP);
      sim.reset();
      sim.step(UP);
      expect(sim.phase).toBe('ready');
      sim.step(NO_COMMANDS);
      sim.step(UP);
      expect(sim.phase).toBe('flying');
    });

    it('reinicia sozinho em menos de 0,5 s e restaura tudo', () => {
      place({ x: 100, y: 239 });
      sim.step(NO_COMMANDS);
      expect(sim.phase).toBe('crashed');
      let steps = 0;
      while (sim.phase === 'crashed') {
        sim.step(NO_COMMANDS);
        steps++;
      }
      expect(steps).toBe(CRASH_STEPS);
      expect(steps * DT).toBeLessThan(0.5);
      expect(sim.ship).toMatchObject({ x: 40, y: 222, vx: 0, vy: 0, fuel: 100 });
      expect(sim.time).toBe(0);
    });

    it('mantém o motivo da falha até o próximo voo', () => {
      place({ x: 100, y: 239 });
      repeat(CRASH_STEPS + 2, () => sim.step(NO_COMMANDS));
      expect(sim.phase).toBe('ready');
      expect(sim.lastOutcome).toMatchObject({ type: 'crash', reason: 'terrain' });
      sim.step(UP);
      expect(sim.lastOutcome).toBeUndefined();
    });

    it('usa o percentual inicial de combustível da fase', () => {
      const half = new Attempt({ ...level, startFuelPct: 50 }, { ...SHIPS[1]! }, { ...DEFAULT_PHYSICS });
      expect(half.ship.fuel).toBe(SHIPS[1]!.tank / 2);
    });
  });

  describe('pouso', () => {
    it.each([
      ['bem abaixo do limite', 5, 0, 'landed'],
      ['logo abaixo do limite vertical', 19.99, 0, 'landed'],
      ['logo acima do limite vertical', 20.01, 0, 'crashed'],
      ['no limite horizontal direito', 5, 10, 'landed'],
      ['no limite horizontal esquerdo', 5, -10, 'landed'],
      ['acima do limite horizontal direito', 5, 10.01, 'crashed'],
      ['acima do limite horizontal esquerdo', 5, -10.01, 'crashed'],
    ])('%s', (_, vy, vx, phase) => {
      touch(vy, vx);
      expect(sim.phase).toBe(phase);
      expect(outcomes).toHaveLength(1);
      if (phase === 'crashed') expect(outcomes[0]).toMatchObject({ reason: 'speed' });
    });

    it('aceita exatamente a tolerância vertical', () => {
      const physics = { gravity: 0, maxSpeed: 140 };
      sim = new Attempt(level, { ...SHIPS[0]! }, physics, (o) => outcomes.push(o));
      place({ x: 232, y: level.goal.y - HALF - 0.01, vy: 20 });
      sim.step(NO_COMMANDS);
      expect(sim.phase).toBe('landed');
    });

    it('respeita a tolerância de cada nave', () => {
      sim.spec = { ...SHIPS[2]! };
      touch(16);
      expect(sim.phase).toBe('crashed');
      sim.reset();
      sim.step(NO_COMMANDS);
      sim.spec = { ...SHIPS[1]! };
      touch(25);
      expect(sim.phase).toBe('landed');
    });

    it('apoia a nave no topo e congela tempo e combustível', () => {
      touch(10);
      expect(sim.ship.y).toBe(level.goal.y - HALF);
      const { time, ship } = sim;
      repeat(120, () => sim.step(UP));
      expect(sim.phase).toBe('landed');
      expect(sim.time).toBe(time);
      expect(sim.ship).toEqual(ship);
      expect(outcomes).toHaveLength(1);
    });

    // Os pés da Vaga-lume vão de 1 a 15 px dentro da área de 16 px.
    it.each([
      ['pé esquerdo no limite', 207, 'landed'],
      ['pé direito no limite', 257, 'landed'],
      ['pé esquerdo fora', 206.5, 'crashed'],
      ['pé direito fora', 257.5, 'crashed'],
    ])('%s', (_, x, phase) => {
      touch(10, 0, x);
      repeat(20, () => { if (sim.phase === 'flying') sim.step(NO_COMMANDS); });
      expect(sim.phase).toBe(phase);
      if (phase === 'crashed') expect(outcomes).toMatchObject([{ reason: 'edge' }]);
    });

    it('não conta como pouso tocar a plataforma por baixo', () => {
      const floating: Level = { ...level, terrain: [], goal: { x: 200, y: 150, width: 64 } };
      sim = new Attempt(floating, { ...SHIPS[0]! }, { ...DEFAULT_PHYSICS }, (o) => outcomes.push(o));
      place({ x: 232, y: 165, vy: -15 });
      repeat(30, () => { if (sim.phase === 'flying') sim.step(UP); });
      expect(outcomes).toMatchObject([{ type: 'crash', reason: 'edge' }]);
    });
  });

  describe('base de partida', () => {
    it('apoia a nave de novo sem concluir a fase e permite decolar', () => {
      sim.step(UP);
      repeat(60, () => sim.step(NO_COMMANDS));
      expect(sim.phase).toBe('flying');
      expect(sim.ship).toMatchObject({ x: 40, y: 222, vx: 0, vy: 0 });
      repeat(60, () => sim.step(UP));
      expect(sim.ship.y).toBeLessThan(215);
      expect(outcomes).toHaveLength(0);
    });

    it('os motores laterais não arrastam a nave apoiada', () => {
      sim.step(UP);
      repeat(60, () => sim.step(NO_COMMANDS));
      repeat(300, () => sim.step(RIGHT));
      expect(sim.ship.x).toBe(40);
      expect(sim.phase).toBe('flying');
    });

    it('destrói a nave que volta rápido demais', () => {
      place({ x: 40, y: 150, vy: 60 });
      repeat(120, () => { if (sim.phase === 'flying') sim.step(NO_COMMANDS); });
      expect(outcomes).toMatchObject([{ type: 'crash', reason: 'speed' }]);
    });

    it('reinicia se a nave ficar nela sem combustível', () => {
      place({ fuel: 0 });
      repeat(30, () => sim.step(NO_COMMANDS));
      expect(sim.phase).toBe('ready');
      expect(sim.ship.fuel).toBe(100);
      expect(sim.lastOutcome).toMatchObject({ reason: 'empty' });
    });
  });

  describe('destruição', () => {
    it('bate no terreno mesmo devagar', () => {
      place({ x: 100, y: 231.9, vy: 1 });
      repeat(30, () => { if (sim.phase === 'flying') sim.step(NO_COMMANDS); });
      expect(outcomes).toMatchObject([{ type: 'crash', reason: 'terrain' }]);
    });

    it('não atravessa terreno nem plataforma na velocidade máxima', () => {
      for (let x = 60; x <= 280; x += 1) {
        sim.reset();
        sim.step(NO_COMMANDS);
        place({ x, y: 100, vy: 140 });
        repeat(120, () => { if (sim.phase === 'flying') sim.step(NO_COMMANDS); });
        expect(sim.phase).toBe('crashed');
        expect(sim.ship.y).toBeLessThan(240);
      }
    });

    it.each([
      ['esquerda', { x: -15, y: 100, vx: -140 }],
      ['direita', { x: 495, y: 100, vx: 140 }],
      ['baixo', { x: 400, y: 285, vy: 140 }],
    ])('sai da área pela %s', (_, state) => {
      place(state);
      sim.step(NO_COMMANDS);
      expect(outcomes).toMatchObject([{ type: 'crash', reason: 'bounds' }]);
    });

    it('para no teto invisível sem destruir a nave', () => {
      repeat(400, () => sim.step(UP));
      expect(sim.ship.y).toBe(HALF);
      expect(sim.ship.vy).toBe(0);
      expect(sim.phase).toBe('flying');
    });

    it('sem combustível, segue caindo até o resultado', () => {
      place({ x: 120, y: 100, fuel: 0 });
      repeat(600, () => { if (sim.phase === 'flying') sim.step(UP); });
      expect(sim.phase).toBe('crashed');
    });
  });

  it('a mesma sequência de comandos dá o mesmo resultado', () => {
    const run = (): ShipState => {
      const s = new Attempt(level, { ...SHIPS[0]! }, { ...DEFAULT_PHYSICS });
      for (let i = 0; i < 200; i++) s.step(i % 3 === 0 ? RIGHT : UP);
      return s.ship;
    };
    expect(run()).toEqual(run());
  });
});
