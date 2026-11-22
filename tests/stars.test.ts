import { describe, expect, it } from 'vitest';
import { LEVELS } from '../src/data/levels';
import { fmtPct, starLine } from '../src/render/format';
import type { Level } from '../src/sim/level';
import { countStars, evaluateStars, recordLanding, type LandingResult, type LevelRecord } from '../src/sim/stars';

const level: Level = {
  ...LEVELS[0]!, version: 2, fuelGoalPct: 40,
  crystals: [{ x: 1, y: 1 }, { x: 2, y: 2 }],
};

function landing(crystals: number, fuelPct: number, timeMs = 10000): LandingResult {
  return { stars: evaluateStars(level, crystals, fuelPct), timeMs, fuelPct, crystals };
}

describe('evaluateStars', () => {
  it.each([
    [0, 10, { landing: true, crystals: false, fuel: false }],
    [1, 39.99, { landing: true, crystals: false, fuel: false }],
    [2, 10, { landing: true, crystals: true, fuel: false }],
    [0, 40, { landing: true, crystals: false, fuel: true }],
    [2, 100, { landing: true, crystals: true, fuel: true }],
  ])('%i cristais e %f%% de combustível', (crystals, fuel, stars) => {
    expect(evaluateStars(level, crystals, fuel)).toEqual(stars);
  });
});

describe('recordLanding', () => {
  it('acumula estrelas de tentativas diferentes', () => {
    const first = recordLanding(undefined, level, landing(2, 10));
    expect(first.newStars).toEqual({ landing: true, crystals: true, fuel: false });
    const second = recordLanding(first.record, level, landing(0, 50));
    expect(second.newStars).toEqual({ landing: false, crystals: false, fuel: true });
    expect(countStars(second.record.stars)).toBe(3);
  });

  it('nunca perde estrela em um voo pior', () => {
    const full = recordLanding(undefined, level, landing(2, 80)).record;
    expect(countStars(recordLanding(full, level, landing(0, 1)).record.stars)).toBe(3);
  });

  it('guarda o menor tempo e o maior combustível, separadamente', () => {
    const a = recordLanding(undefined, level, landing(0, 30, 12000));
    expect(a).toMatchObject({ newTime: false, newFuel: false });
    const b = recordLanding(a.record, level, landing(0, 20, 9000));
    expect(b).toMatchObject({ newTime: true, newFuel: false, record: { bestTimeMs: 9000, bestFuelPct: 30 } });
    const c = recordLanding(b.record, level, landing(0, 35, 9000));
    expect(c).toMatchObject({ newTime: false, newFuel: true, record: { bestTimeMs: 9000, bestFuelPct: 35 } });
  });

  it('nova versão da fase zera recordes e preserva estrelas', () => {
    const old: LevelRecord = {
      levelVersion: 1, stars: { landing: true, crystals: true, fuel: false }, bestTimeMs: 1, bestFuelPct: 99,
    };
    const update = recordLanding(old, level, landing(0, 20, 15000));
    expect(update).toMatchObject({ newTime: false, newFuel: false });
    expect(update.record).toEqual({
      levelVersion: 2, stars: { landing: true, crystals: true, fuel: false }, bestTimeMs: 15000, bestFuelPct: 20,
    });
  });
});

describe('starLine', () => {
  it.each([[0, '☆☆☆'], [1, '★☆☆'], [2, '★★☆'], [3, '★★★']])('%i estrelas ficam em sequência', (n, text) => {
    expect(starLine(n).join('')).toBe(text);
  });

  it('pouso e economia sem a coleta não deixam buraco no meio', () => {
    expect(starLine(countStars({ landing: true, crystals: false, fuel: true })).join('')).toBe('★★☆');
  });
});

describe('fmtPct', () => {
  it.each([[0, '0%'], [0.2, '1%'], [24.99, '24%'], [25, '25%'], [100, '100%']])('%f vira %s', (v, text) => {
    expect(fmtPct(v)).toBe(text);
  });
});
