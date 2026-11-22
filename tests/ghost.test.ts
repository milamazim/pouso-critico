import { describe, expect, it } from 'vitest';
import { DT } from '../src/core/fixedStep';
import { LEVELS } from '../src/data/levels';
import { DEFAULT_PHYSICS } from '../src/data/physics';
import { SHIPS } from '../src/data/ships';
import { Attempt } from '../src/sim/attempt';
import { GhostPlayer, GhostRecorder, MAX_GHOST_SECONDS, SAMPLE_STEPS, type Ghost } from '../src/sim/ghost';
import { recordLanding, type LandingResult } from '../src/sim/stars';
import { NO_COMMANDS, type ShipState } from '../src/sim/types';
import { emptySave, parseSave, serializeSave } from '../src/storage/save';
import { fly } from './pilot';

const level = LEVELS[0]!;

/** Voa a fase 1 guardando a posição real de cada passo. */
function recordFlight(): { sim: Attempt; path: Map<number, ShipState>; ghost: Ghost } {
  const sim = new Attempt(level, { ...SHIPS[1]! }, { ...DEFAULT_PHYSICS });
  const path = new Map<number, ShipState>([[0, sim.ship]]);
  const step = sim.step.bind(sim);
  sim.step = (commands) => {
    step(commands);
    path.set(Math.round(sim.time / DT), sim.ship);
  };
  fly(sim, [{ x: 112, y: 120 }, { x: 240, y: 120 }], 45);
  expect(sim.phase).toBe('landed');
  return { sim, path, ghost: sim.recording()! };
}

describe('gravação e reprodução', () => {
  const { sim, path, ghost } = recordFlight();
  const player = GhostPlayer.from(ghost)!;

  it('guarda nave e tempo', () => {
    expect(ghost.ship).toBe('besouro');
    expect(ghost.timeMs).toBe(Math.round(sim.time * 1000));
  });

  it('acompanha o voo real em todos os passos, com erro menor que 1 px', () => {
    expect(path.size).toBeGreaterThan(600);
    for (const [n, s] of path) {
      const g = player.at(n * DT);
      expect(Math.abs(g.x - s.x)).toBeLessThan(1);
      expect(Math.abs(g.y - s.y)).toBeLessThan(1);
    }
  });

  it('é exata nas amostras, a menos do arredondamento', () => {
    for (const [n, s] of path) {
      if (n % SAMPLE_STEPS !== 0) continue;
      expect(Math.abs(player.at(n * DT).x - s.x)).toBeLessThan(0.1);
    }
  });

  it('termina pousada e fica lá', () => {
    for (const t of [sim.time, sim.time + 10]) {
      expect(player.at(t).x).toBeCloseTo(sim.ship.x, 1);
      expect(player.at(t).y).toBeCloseTo(sim.ship.y, 1);
      expect(player.at(t).engines).toEqual(NO_COMMANDS);
    }
  });

  it('grava os motores', () => {
    const up = [...path.keys()].filter((n) => player.at(n * DT).engines.up).length;
    const right = [...path.keys()].filter((n) => player.at(n * DT).engines.right).length;
    expect(up).toBeGreaterThan(50);
    expect(right).toBeGreaterThan(10);
  });

  it('antes do início, fica na partida', () => {
    expect(player.at(-1)).toMatchObject({ x: 112, y: 212 });
  });

  it('não mistura tentativas', () => {
    const s = new Attempt(level, { ...SHIPS[0]! }, { ...DEFAULT_PHYSICS });
    for (let i = 0; i < 200; i++) s.step({ ...NO_COMMANDS, up: i % 2 === 0 });
    s.reset();
    s.step(NO_COMMANDS);
    fly(s, [{ x: 112, y: 120 }, { x: 240, y: 120 }], 45);
    expect(s.phase).toBe('landed');
    expect(GhostPlayer.from(s.recording()!)).toBeDefined();
  });

  it('já está completa dentro do evento de pouso, quando o jogo a salva', () => {
    let inEvent: Ghost | undefined;
    const s: Attempt = new Attempt(level, { ...SHIPS[0]! }, { ...DEFAULT_PHYSICS }, (e) => {
      if (e.type === 'landed') inEvent = s.recording();
    });
    fly(s, [{ x: 112, y: 120 }, { x: 240, y: 120 }], 45);
    expect(inEvent).toBeDefined();
    expect(GhostPlayer.from(inEvent!)).toBeDefined();
    expect(s.recording()).toEqual(inEvent);
  });

  it('só existe depois do pouso', () => {
    const s = new Attempt(level, { ...SHIPS[0]! }, { ...DEFAULT_PHYSICS });
    expect(s.recording()).toBeUndefined();
    s.step({ ...NO_COMMANDS, up: true });
    expect(s.recording()).toBeUndefined();
  });
});

describe('limites', () => {
  function record(steps: number): Ghost | undefined {
    const r = new GhostRecorder();
    const frame = { x: 479.9, y: 10, engines: { up: true, left: false, right: true } };
    for (let n = 0; n < steps; n += SAMPLE_STEPS) r.add(frame);
    r.add(frame);
    return r.finish('vagalume', Math.round((steps / 60) * 1000));
  }

  it.each([1, 2, 3, 4, 5, 6, 59, 60, 61])('voo de %i passos pode ser reproduzido', (steps) => {
    expect(GhostPlayer.from(record(steps)!)).toBeDefined();
  });

  it('aceita até 120 s e recusa acima', () => {
    const ghost = record(MAX_GHOST_SECONDS * 60);
    expect(GhostPlayer.from(ghost!)).toBeDefined();
    // Base64 de 2401 amostras de 5 bytes: cerca de 16 KB.
    expect(ghost!.samples.length).toBeLessThan(17000);
    expect(record(MAX_GHOST_SECONDS * 60 + 1)).toBeUndefined();
    expect(record(MAX_GHOST_SECONDS * 600)).toBeUndefined();
  });

  it.each([
    ['Base64 inválido', { samples: '***' }],
    ['vazia', { samples: '' }],
    ['tempo que não combina', { timeMs: 5000 }],
    ['tempo zero', { timeMs: 0 }],
  ])('recusa gravação corrompida: %s', (_, change) => {
    expect(GhostPlayer.from({ ...record(60)!, ...change })).toBeUndefined();
  });
});

describe('fantasma no registro da fase', () => {
  const result = (timeMs: number): LandingResult => ({
    stars: { landing: true, crystals: false, fuel: false }, timeMs, fuelPct: 10, crystals: 0,
  });
  const ghost = (timeMs: number): Ghost => ({ ship: 'vagalume', timeMs, samples: `g${timeMs}` });

  it('fica com o pouso mais rápido', () => {
    let record = recordLanding(undefined, level, result(9000), ghost(9000)).record;
    expect(record.ghost?.timeMs).toBe(9000);
    record = recordLanding(record, level, result(9500), ghost(9500)).record;
    expect(record.ghost?.timeMs).toBe(9000);
    record = recordLanding(record, level, result(8000), ghost(8000)).record;
    expect(record.ghost?.timeMs).toBe(8000);
  });

  it('recordes anteriores ao fantasma ganham um no próximo pouso', () => {
    const old = recordLanding(undefined, level, result(9000)).record;
    expect(old.ghost).toBeUndefined();
    const next = recordLanding(old, level, result(12000), ghost(12000)).record;
    expect(next.bestTimeMs).toBe(9000);
    expect(next.ghost?.timeMs).toBe(12000);
  });

  it('nova versão da fase descarta o fantasma', () => {
    const old = recordLanding(undefined, level, result(5000), ghost(5000)).record;
    const next = recordLanding(old, { ...level, version: level.version + 1 }, result(9000), ghost(9000)).record;
    expect(next.ghost?.timeMs).toBe(9000);
  });
});

describe('fantasma no save', () => {
  const { sim, ghost } = recordFlight();
  const save = emptySave();
  const outcome = sim.lastOutcome;
  if (outcome?.type !== 'landed') throw new Error('deveria ter pousado');
  save.levels.set(level.id, recordLanding(undefined, level, outcome.result, ghost).record);
  save.showGhost = false;

  it('sobrevive à gravação e à leitura', () => {
    expect(parseSave(serializeSave(save))).toEqual(save);
  });

  it('saves antigos, sem opções nem fantasma, continuam válidos', () => {
    const raw = JSON.parse(serializeSave(save));
    delete raw.showGhost;
    delete raw.levels[level.id].ghost;
    const parsed = parseSave(JSON.stringify(raw))!;
    expect(parsed.showGhost).toBe(true);
    expect(parsed.levels.get(level.id)?.bestTimeMs).toBe(ghost.timeMs);
    expect(parsed.levels.get(level.id)?.ghost).toBeUndefined();
  });

  it.each([
    ['nave desconhecida', { ship: 'x' }],
    ['amostras que não são texto', { samples: 5 }],
    ['amostras cortadas', { samples: ghost.samples.slice(0, 100) }],
    ['tempo inválido', { timeMs: 'x' }],
  ])('%s: descarta só o fantasma', (_, change) => {
    const raw = JSON.parse(serializeSave(save));
    Object.assign(raw.levels[level.id].ghost, change);
    const record = parseSave(JSON.stringify(raw))!.levels.get(level.id);
    expect(record?.bestTimeMs).toBe(ghost.timeMs);
    expect(record?.ghost).toBeUndefined();
  });
});
