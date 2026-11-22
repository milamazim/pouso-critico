import { SHIPS } from '../data/ships';
import type { LevelRecord } from '../sim/stars';
import type { ShipId } from '../sim/types';

export const SAVE_KEY = 'pouso-critico-save';
/** Cópia de um save que não pôde ser lido, guardada antes de ser substituído. */
export const BACKUP_KEY = `${SAVE_KEY}-backup`;

const SCHEMA_VERSION = 1;

export interface SaveData {
  selectedShip: ShipId;
  /** Registros por ID de fase. As fases liberadas são deduzidas daqui. */
  levels: Map<string, LevelRecord>;
}

/** Parte do `localStorage` usada aqui; permite testar sem navegador. */
export type Store = Pick<Storage, 'getItem' | 'setItem'>;

export function emptySave(): SaveData {
  return { selectedShip: SHIPS[0]!.id, levels: new Map() };
}

type Json = Record<string, unknown>;

const isObject = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);

const numberIn = (v: unknown, min: number, max: number): number | undefined =>
  typeof v === 'number' && v >= min && v <= max ? v : undefined;

/** Aproveita o que for válido; um campo estragado não derruba os outros. */
function parseRecord(v: unknown): LevelRecord | undefined {
  if (!isObject(v) || !isObject(v.stars)) return undefined;
  const levelVersion = numberIn(v.levelVersion, 1, Number.MAX_SAFE_INTEGER);
  if (levelVersion === undefined) return undefined;
  const bestTimeMs = numberIn(v.bestTimeMs, 1, Number.MAX_SAFE_INTEGER);
  const bestFuelPct = numberIn(v.bestFuelPct, 0, 100);
  return {
    levelVersion,
    stars: {
      landing: v.stars.landing === true,
      crystals: v.stars.crystals === true,
      fuel: v.stars.fuel === true,
    },
    ...(bestTimeMs !== undefined && { bestTimeMs }),
    ...(bestFuelPct !== undefined && { bestFuelPct }),
  };
}

/** Devolve `undefined` se o texto não for um save legível desta versão. */
export function parseSave(text: string): SaveData | undefined {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return undefined;
  }
  if (!isObject(raw) || raw.schemaVersion !== SCHEMA_VERSION) return undefined;

  const save = emptySave();
  const ship = SHIPS.find((s) => s.id === raw.selectedShip);
  if (ship) save.selectedShip = ship.id;
  if (isObject(raw.levels)) {
    for (const [id, value] of Object.entries(raw.levels)) {
      const record = parseRecord(value);
      if (record) save.levels.set(id, record);
    }
  }
  return save;
}

export function serializeSave(save: SaveData): string {
  return JSON.stringify({
    schemaVersion: SCHEMA_VERSION,
    selectedShip: save.selectedShip,
    levels: Object.fromEntries(save.levels),
  });
}

/** Nunca lança: sem acesso ao armazenamento, o jogo segue em memória. */
export function loadSave(getStore: () => Store): SaveData {
  try {
    const store = getStore();
    const text = store.getItem(SAVE_KEY);
    if (text === null) return emptySave();
    const save = parseSave(text);
    if (save) return save;
    store.setItem(BACKUP_KEY, text);
  } catch {
    // Armazenamento bloqueado ou cheio.
  }
  return emptySave();
}

/** Devolve falso se não foi possível gravar. */
export function writeSave(getStore: () => Store, save: SaveData): boolean {
  try {
    getStore().setItem(SAVE_KEY, serializeSave(save));
    return true;
  } catch {
    return false;
  }
}
