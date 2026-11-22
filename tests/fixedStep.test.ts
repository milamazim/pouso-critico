import { describe, expect, it } from 'vitest';
import { DT, FixedStep, MAX_FRAME_DELAY } from '../src/core/fixedStep';
import { LEVELS } from '../src/data/levels';
import { DEFAULT_PHYSICS } from '../src/data/physics';
import { SHIPS } from '../src/data/ships';
import { Attempt } from '../src/sim/attempt';

/** Voa 3 s de tempo real a uma taxa de quadros, com comandos definidos por passo. */
function fly(fps: number) {
  const sim = new Attempt(LEVELS[0]!, { ...SHIPS[0]! }, { ...DEFAULT_PHYSICS });
  let steps = 0;
  const loop = new FixedStep(() => {
    sim.step({ up: steps % 50 < 26, left: false, right: steps % 90 < 15 });
    steps++;
  });
  for (let i = 0; i < fps * 3; i++) loop.advance(1 / fps);
  return { steps, phase: sim.phase, ship: sim.ship };
}

describe('FixedStep', () => {
  const reference = fly(60);

  it('executa 60 passos por segundo', () => {
    expect(reference.steps).toBe(180);
    expect(reference.phase).toBe('flying');
  });

  it.each([30, 120, 144, 240])('dá o mesmo resultado a 60 e %i Hz', (fps) => {
    expect(fly(fps)).toEqual(reference);
  });

  it('limita o atraso por quadro', () => {
    let steps = 0;
    new FixedStep(() => { steps++; }).advance(10);
    expect(steps).toBe(Math.round(MAX_FRAME_DELAY / DT));
  });

  it('devolve a fração do próximo passo', () => {
    const loop = new FixedStep(() => {});
    expect(loop.advance(DT * 1.5)).toBeCloseTo(0.5);
    loop.reset();
    expect(loop.advance(0)).toBe(0);
  });
});
