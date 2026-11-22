import type { Level } from './level';
import { countStars, type LevelRecord } from './stars';
import type { ShipSpec } from './types';

export type Records = ReadonlyMap<string, LevelRecord>;

/** Estrelas das fases da campanha; registros de outras fases não contam. */
export function totalStars(levels: readonly Level[], records: Records): number {
  return levels.reduce((sum, level) => {
    const record = records.get(level.id);
    return sum + (record ? countStars(record.stars) : 0);
  }, 0);
}

/** A primeira fase é livre; as demais exigem um pouso na anterior. */
export function isLevelUnlocked(levels: readonly Level[], records: Records, index: number): boolean {
  if (index === 0) return levels.length > 0;
  const previous = levels[index - 1];
  return previous !== undefined && levels[index] !== undefined && records.get(previous.id)?.stars.landing === true;
}

/** Fase em que o jogador deve continuar: a primeira liberada e ainda não concluída. */
export function nextLevelIndex(levels: readonly Level[], records: Records): number {
  const index = levels.findIndex((level) => records.get(level.id)?.stars.landing !== true);
  return index === -1 ? Math.max(0, levels.length - 1) : index;
}

export function isShipUnlocked(ship: Readonly<ShipSpec>, stars: number): boolean {
  return stars >= ship.unlockStars;
}
