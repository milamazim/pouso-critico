import { describe, expect, it } from 'vitest';
import { LEVELS } from '../src/data/levels';
import { SHIPS } from '../src/data/ships';
import { isLevelUnlocked, isShipUnlocked, nextLevelIndex, totalStars } from '../src/sim/campaign';
import type { Level } from '../src/sim/level';
import type { LevelRecord } from '../src/sim/stars';
import {
  BACKUP_KEY, emptySave, eraseProgress, loadSave, parseSave, SAVE_KEY, serializeSave, writeSave, type Store,
} from '../src/storage/save';

const record: LevelRecord = {
  levelVersion: 1, stars: { landing: true, crystals: false, fuel: true }, bestTimeMs: 12345, bestFuelPct: 40.5,
};

function memoryStore(initial: Record<string, string> = {}): Store & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial));
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => { data.set(k, v); } };
}

describe('save', () => {
  it('grava e lê de volta', () => {
    const store = memoryStore();
    const save = emptySave();
    save.selectedShip = 'libelula';
    save.levels.set('plain-1', record);
    expect(writeSave(() => store, save)).toBe(true);
    expect(loadSave(() => store)).toEqual(save);
  });

  it('sem save, começa do zero', () => {
    expect(loadSave(() => memoryStore())).toEqual(emptySave());
  });

  it.each([
    ['texto inválido', '{"schemaVersion":1,'],
    ['tipo errado', '[]'],
    ['nulo', 'null'],
    ['versão desconhecida', '{"schemaVersion":99,"levels":{}}'],
  ])('%s: começa do zero e guarda uma cópia', (_, text) => {
    const store = memoryStore({ [SAVE_KEY]: text });
    expect(loadSave(() => store)).toEqual(emptySave());
    expect(store.data.get(BACKUP_KEY)).toBe(text);
  });

  it('campos estragados não derrubam os outros', () => {
    const save = parseSave(JSON.stringify({
      schemaVersion: 1,
      selectedShip: 'inexistente',
      levels: {
        boa: record,
        nula: null,
        semEstrelas: { levelVersion: 1 },
        semVersao: { stars: {} },
        numeros: { levelVersion: 1, stars: { landing: 1, crystals: true }, bestTimeMs: -5, bestFuelPct: 'x' },
      },
    }));
    expect(save?.selectedShip).toBe('vagalume');
    expect([...save!.levels.keys()]).toEqual(['boa', 'numeros']);
    expect(save!.levels.get('boa')).toEqual(record);
    expect(save!.levels.get('numeros')).toEqual({
      levelVersion: 1, stars: { landing: false, crystals: true, fuel: false },
    });
  });

  it('armazenamento bloqueado não lança erro', () => {
    const blocked = (): Store => { throw new Error('bloqueado'); };
    expect(loadSave(blocked)).toEqual(emptySave());
    expect(writeSave(blocked, emptySave())).toBe(false);
  });

  it('volumes fora da faixa voltam ao padrão, e saves antigos os recebem', () => {
    const parse = (extra: object) => parseSave(JSON.stringify({ schemaVersion: 1, levels: {}, ...extra }))!;
    expect(parse({})).toMatchObject({ music: 6, sfx: 8 });
    expect(parse({ music: 0, sfx: 10 })).toMatchObject({ music: 0, sfx: 10 });
    expect(parse({ music: 99, sfx: 'alto' })).toMatchObject({ music: 6, sfx: 8 });
  });

  it('apagar o progresso preserva as opções', () => {
    const save = { ...emptySave(), music: 1, sfx: 2, showGhost: false, selectedShip: 'besouro' as const };
    save.levels.set('plain-1', record);
    expect(eraseProgress(save)).toEqual({ ...emptySave(), music: 1, sfx: 2, showGhost: false });
  });

  it('tremor e flashes só ficam definidos quando o jogador escolhe', () => {
    const parse = (extra: object) => parseSave(JSON.stringify({ schemaVersion: 1, levels: {}, ...extra }))!;
    expect(parse({}).shake).toBeUndefined();
    expect(parse({ shake: 'sim', flashes: 1 })).not.toHaveProperty('flashes');
    expect(parse({ shake: false, flashes: true })).toMatchObject({ shake: false, flashes: true });
    const chosen = { ...emptySave(), shake: false, flashes: false };
    expect(parseSave(serializeSave(chosen))).toEqual(chosen);
    expect(eraseProgress(chosen)).toEqual(chosen);
  });

  it('registra a versão do formato', () => {
    expect(JSON.parse(serializeSave(emptySave()))).toMatchObject({ schemaVersion: 1 });
  });
});

describe('campanha', () => {
  const levels: Level[] = ['a', 'b', 'c'].map((id) => ({ ...LEVELS[0]!, id }));
  const noLanding: LevelRecord = { ...record, stars: { landing: false, crystals: false, fuel: false } };

  it('libera em ordem, conforme os pousos', () => {
    const records = new Map([['a', record]]);
    expect([0, 1, 2, 3].map((i) => isLevelUnlocked(levels, records, i))).toEqual([true, true, false, false]);
    expect(isLevelUnlocked(levels, new Map([['a', noLanding]]), 1)).toBe(false);
  });

  it('indica onde continuar', () => {
    expect(nextLevelIndex(levels, new Map())).toBe(0);
    expect(nextLevelIndex(levels, new Map([['a', record]]))).toBe(1);
    expect(nextLevelIndex(levels, new Map(levels.map((l) => [l.id, record])))).toBe(2);
  });

  it('soma só as estrelas da campanha', () => {
    expect(totalStars(levels, new Map([['a', record], ['b', record], ['test-x', record]]))).toBe(4);
  });

  it('naves abrem com 0, 10 e 20 estrelas', () => {
    expect(SHIPS.map((s) => s.unlockStars)).toEqual([0, 10, 20]);
    expect(SHIPS.map((s) => isShipUnlocked(s, 10))).toEqual([true, true, false]);
    expect(isShipUnlocked(SHIPS[1]!, 9)).toBe(false);
  });
});
