import type { Level } from './level';

export interface Stars {
  readonly landing: boolean;
  readonly crystals: boolean;
  readonly fuel: boolean;
}

export const NO_STARS: Stars = { landing: false, crystals: false, fuel: false };

/** Resultado de um pouso na base de destino. */
export interface LandingResult {
  readonly stars: Stars;
  readonly timeMs: number;
  /** Percentual exato do tanque, sem arredondar. */
  readonly fuelPct: number;
  readonly crystals: number;
}

/** Só deve ser chamado para pousos bem-sucedidos. */
export function evaluateStars(level: Level, crystals: number, fuelPct: number): Stars {
  return {
    landing: true,
    crystals: crystals >= level.crystals.length,
    fuel: fuelPct >= level.fuelGoalPct,
  };
}

export interface LevelRecord {
  readonly levelVersion: number;
  /** Conquistas acumuladas, que podem vir de tentativas diferentes. */
  readonly stars: Stars;
  readonly bestTimeMs?: number;
  readonly bestFuelPct?: number;
}

export interface RecordUpdate {
  readonly record: LevelRecord;
  /** Estrelas conquistadas pela primeira vez neste pouso. */
  readonly newStars: Stars;
  /** Superou um tempo anterior. */
  readonly newTime: boolean;
  /** Superou um combustível restante anterior. */
  readonly newFuel: boolean;
}

/** Combina um pouso com o registro da fase. Função pura. */
export function recordLanding(
  previous: LevelRecord | undefined,
  level: Level,
  result: LandingResult,
): RecordUpdate {
  const had = previous?.stars ?? NO_STARS;
  // Uma nova versão da fase invalida tempo e combustível, mas preserva as estrelas.
  const same = previous?.levelVersion === level.version ? previous : undefined;
  const oldTime = same?.bestTimeMs;
  const oldFuel = same?.bestFuelPct;

  return {
    record: {
      levelVersion: level.version,
      stars: {
        landing: had.landing || result.stars.landing,
        crystals: had.crystals || result.stars.crystals,
        fuel: had.fuel || result.stars.fuel,
      },
      bestTimeMs: Math.min(oldTime ?? Infinity, result.timeMs),
      bestFuelPct: Math.max(oldFuel ?? 0, result.fuelPct),
    },
    newStars: {
      landing: result.stars.landing && !had.landing,
      crystals: result.stars.crystals && !had.crystals,
      fuel: result.stars.fuel && !had.fuel,
    },
    newTime: oldTime !== undefined && result.timeMs < oldTime,
    newFuel: oldFuel !== undefined && result.fuelPct > oldFuel,
  };
}

export function countStars(stars: Stars): number {
  return Number(stars.landing) + Number(stars.crystals) + Number(stars.fuel);
}
