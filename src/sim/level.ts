import type { Hazard } from './hazards';

export interface Point {
  readonly x: number;
  readonly y: number;
}

export type WorldId = 'plain' | 'crater' | 'cave';

export interface Pad {
  readonly x: number;
  /** Topo da plataforma, onde os pés encostam. */
  readonly y: number;
  readonly width: number;
}

/** Oscilação horizontal em senoide. */
export interface PadMotion {
  /** px para cada lado */
  readonly amplitude: number;
  /** s */
  readonly period: number;
  /** s */
  readonly phase: number;
}

export interface Goal extends Pad {
  readonly motion?: PadMotion;
}

/** Velocidade máxima de uma base móvel, em px/s. */
export const MAX_GOAL_SPEED = 20;

/** Espessura da plataforma, em px. */
export const PAD_HEIGHT = 4;

/** Lado da área de coleta de um item, em px. */
export const ITEM_SIZE = 10;
/** Unidades de combustível de um galão. */
export const FUEL_CAN = 25;

export interface Level {
  readonly id: string;
  /** Muda quando a fase muda a ponto de invalidar tempos e fantasmas. */
  readonly version: number;
  readonly name: string;
  readonly world: WorldId;
  /** Base de partida: a nave começa apoiada no centro dela. */
  readonly base: Pad;
  readonly startFuelPct: number;
  /** Combustível restante mínimo para a estrela de economia. */
  readonly fuelGoalPct: number;
  /** Polígonos sólidos. */
  readonly terrain: readonly (readonly Point[])[];
  /** Base de destino: pousar nela conclui a fase. */
  readonly goal: Goal;
  /** Centros dos cristais. */
  readonly crystals: readonly Point[];
  /** Centros dos galões de combustível. */
  readonly fuelCans: readonly Point[];
  readonly hazards: readonly Hazard[];
}
