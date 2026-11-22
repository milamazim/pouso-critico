import { describe, expect, it } from 'vitest';
import { frequency, noteNumber, parseTune, STEPS_PER_BAR, TUNES, type TuneId } from '../src/audio/tunes';

const IDS = Object.keys(TUNES) as TuneId[];

describe('notas', () => {
  it('seguem a afinação padrão', () => {
    expect(noteNumber('A4')).toBe(69);
    expect(noteNumber('C4')).toBe(60);
    expect(noteNumber('F#5')).toBe(78);
    expect(frequency(69)).toBe(440);
    expect(frequency(81)).toBeCloseTo(880);
  });

  it('recusam nomes inválidos', () => {
    expect(() => noteNumber('H4')).toThrow();
    expect(() => noteNumber('A')).toThrow();
  });
});

describe.each(IDS)('música %s', (id) => {
  const tune = TUNES[id];
  const score = parseTune(tune);

  it('tem compassos completos e pelo menos 8 deles', () => {
    expect(score.length % STEPS_PER_BAR).toBe(0);
    expect(score.length / STEPS_PER_BAR).toBeGreaterThanOrEqual(8);
    expect(score.arp).toHaveLength(score.length);
  });

  it('tem melodia, baixo e percussão', () => {
    expect(score.lead.size).toBeGreaterThan(score.length / 8);
    expect(score.bass.size).toBeGreaterThan(0);
    expect(score.drums.size).toBeGreaterThan(0);
  });

  it('nenhuma nota passa do fim nem invade a seguinte', () => {
    const starts = [...score.lead.keys()].sort((a, b) => a - b);
    starts.forEach((start, i) => {
      const end = start + score.lead.get(start)!.steps;
      expect(end).toBeLessThanOrEqual(starts[i + 1] ?? score.length);
    });
  });

  it('fica em uma faixa audível e confortável', () => {
    for (const { midi } of score.lead.values()) {
      expect(midi).toBeGreaterThanOrEqual(noteNumber('E4'));
      expect(midi).toBeLessThanOrEqual(noteNumber('C6'));
    }
    for (const midi of score.bass.values()) expect(frequency(midi)).toBeGreaterThan(55);
  });

  it('dura um tempo razoável antes de repetir', () => {
    const seconds = score.length * score.stepSeconds;
    expect(seconds).toBeGreaterThan(15);
    expect(seconds).toBeLessThan(60);
  });
});

it('cada mundo tem sua própria música', () => {
  expect(new Set(IDS.map((id) => TUNES[id].lead)).size).toBe(IDS.length);
});

it('notação errada é recusada', () => {
  expect(() => parseTune({ ...TUNES.menu, lead: 'A4 .' })).toThrow();
  expect(() => parseTune({ ...TUNES.menu, chords: 'Xm' })).toThrow();
  expect(() => parseTune({ ...TUNES.menu, bass: '0 .' })).toThrow();
});
