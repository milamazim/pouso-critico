import { describe, expect, it } from 'vitest';
import { LEVELS, TEST_LEVELS } from '../src/data/levels';
import { DEFAULT_PHYSICS, SCREEN_H, SCREEN_W, SHIP_SIZE } from '../src/data/physics';
import { SHIPS } from '../src/data/ships';
import { Attempt } from '../src/sim/attempt';
import { activeDuration, hitsPixel, WARNING } from '../src/sim/hazards';
import { ITEM_SIZE, MAX_GOAL_SPEED, PAD_HEIGHT, type Level, type Point } from '../src/sim/level';
import { TerrainMask } from '../src/sim/terrain';
import { fly, onPad } from './pilot';

const HALF = SHIP_SIZE / 2;
const ALL = [...LEVELS, ...TEST_LEVELS];

/** A área inteira de 16 × 16 px está livre de terreno. */
function isFree(mask: TerrainMask, cx: number, cy: number): boolean {
  for (let y = cy - HALF; y < cy + HALF; y++) {
    for (let x = cx - HALF; x < cx + HALF; x++) if (mask.isSolid(x, y)) return false;
  }
  return true;
}

/** Busca em largura: todas as posições que a área inteira da nave alcança desde a partida. */
function reachable(level: Level, mask: TerrainMask): Point[] {
  const from = onPad(level.base);
  const seen = new Set<number>([from.y * SCREEN_W + from.x]);
  const queue = [from];
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i]!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const n = { x: p.x + dx, y: p.y + dy };
      const key = n.y * SCREEN_W + n.x;
      if (n.x < HALF || n.x > SCREEN_W - HALF || n.y < HALF || n.y > SCREEN_H - HALF) continue;
      if (seen.has(key) || !isFree(mask, n.x, n.y)) continue;
      seen.add(key);
      queue.push(n);
    }
  }
  return queue;
}

describe('fases', () => {
  it('têm IDs únicos', () => {
    expect(new Set(ALL.map((l) => l.id)).size).toBe(ALL.length);
  });

  describe.each(ALL.map((l) => [l.name, l] as const))('%s', (_, level) => {
    const mask = new TerrainMask(SCREEN_W, SCREEN_H, level.terrain);
    const { base, goal } = level;

    it('tem duas bases válidas e separadas', () => {
      expect(level.startFuelPct).toBeGreaterThan(0);
      expect(level.startFuelPct).toBeLessThanOrEqual(100);
      // Uma base móvel precisa caber e estar livre em todo o percurso.
      const a = goal.motion?.amplitude ?? 0;
      const sweep = { x: goal.x - a, y: goal.y, width: goal.width + 2 * a };
      expect(base.x + base.width <= sweep.x || sweep.x + sweep.width <= base.x).toBe(true);
      if (goal.motion) expect((2 * Math.PI * a) / goal.motion.period).toBeLessThanOrEqual(MAX_GOAL_SPEED);

      for (const pad of [base, sweep]) {
        expect(pad.x).toBeGreaterThanOrEqual(0);
        expect(pad.x + pad.width).toBeLessThanOrEqual(SCREEN_W);
        expect(pad.y + PAD_HEIGHT).toBeLessThanOrEqual(SCREEN_H);
        expect(pad.width).toBeGreaterThan(SHIP_SIZE);
        expect(onPad(pad).x % 1).toBe(0);
        for (let y = pad.y - SHIP_SIZE; y < pad.y; y++) {
          for (let x = pad.x; x < pad.x + pad.width; x++) expect(mask.isSolid(x, y)).toBe(false);
        }
      }
    });

    const area = reachable(level, mask);

    it('tem rota livre entre as bases', () => {
      const to = onPad(goal);
      expect(area.some((p) => p.x === to.x && p.y === to.y)).toBe(true);
    });

    it('tem de 1 a 5 cristais e meta de economia válida', () => {
      expect(level.crystals.length).toBeGreaterThanOrEqual(1);
      expect(level.crystals.length).toBeLessThanOrEqual(5);
      expect(level.fuelGoalPct).toBeGreaterThan(0);
      expect(level.fuelGoalPct).toBeLessThan(100);
    });

    it('tem todos os itens livres e alcançáveis', () => {
      const half = ITEM_SIZE / 2;
      for (const item of [...level.crystals, ...level.fuelCans]) {
        for (let y = item.y - half; y < item.y + half; y++) {
          for (let x = item.x - half; x < item.x + half; x++) {
            expect(x >= 0 && x < SCREEN_W && y >= 0 && y < SCREEN_H).toBe(true);
            expect(mask.isSolid(x, y)).toBe(false);
          }
        }
        expect(area.some((p) => Math.abs(p.x - item.x) < HALF + half && Math.abs(p.y - item.y) < HALF + half)).toBe(true);
      }
    });

    it('tem perigos com aviso e pausa suficientes', () => {
      for (const h of level.hazards) {
        expect(h.phase).toBeGreaterThanOrEqual(0);
        expect(h.period).toBeGreaterThanOrEqual(activeDuration(h) + WARNING[h.type]);
      }
    });

    it('nenhum perigo atinge a nave parada na partida', () => {
      const p = onPad(base);
      for (const h of level.hazards) {
        for (let time = 0; time <= h.period; time += 1 / 30) {
          for (let y = p.y - HALF; y < p.y + HALF; y++) {
            for (let x = p.x - HALF; x < p.x + HALF; x++) {
              if (hitsPixel(h, time, x, y)) expect.fail(`${h.type} atinge a partida em ${time.toFixed(2)} s`);
            }
          }
        }
      }
    });

    it('exige desviar do cenário', () => {
      const a = onPad(base);
      const b = onPad(goal);
      const blocked = Array.from({ length: 201 }, (_, i) => i / 200).some(
        (t) => !isFree(mask, Math.round(a.x + (b.x - a.x) * t), Math.round(a.y + (b.y - a.y) * t)),
      );
      expect(blocked).toBe(true);
    });
  });

  describe.each(TEST_LEVELS.map((l) => [l.name, l] as const))('%s', (_, level) => {
    // O piloto não vê os perigos: basta que alguma combinação de espera e velocidade funcione.
    it.each(SHIPS.map((s) => [s.name, s] as const))('pode ser concluída com %s', (_ship, ship) => {
      const landed = [0, 1, 2, 3].some((wait) =>
        [30, 35, 40, 45, 50, 55, 60].some((cruise) => {
          const sim = new Attempt(level, { ...ship }, { ...DEFAULT_PHYSICS });
          fly(sim, [{ x: onPad(level.base).x, y: 125 }, { x: 240, y: 125 }], cruise, wait);
          return sim.phase === 'landed';
        }),
      );
      expect(landed).toBe(true);
    });
  });

  it.each(SHIPS.map((s) => [s.name, s] as const))('a fase 1 dá três estrelas com %s', (_, ship) => {
    const sim = new Attempt(LEVELS[0]!, { ...ship }, { ...DEFAULT_PHYSICS });
    fly(sim, [{ x: 112, y: 118 }, { x: 240, y: 118 }], 45);
    expect(sim.phase).toBe('landed');
    // Este piloto é lento e cauteloso, então a meta fica ao alcance de quem está aprendendo.
    expect(sim.lastOutcome).toMatchObject({ result: { stars: { landing: true, crystals: true, fuel: true } } });
  });
});
