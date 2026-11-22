export interface Commands {
  up: boolean;
  left: boolean;
  right: boolean;
}

export const NO_COMMANDS: Readonly<Commands> = { up: false, left: false, right: false };

export interface PhysicsConfig {
  /** px/s² */
  gravity: number;
  /** px/s, por eixo */
  maxSpeed: number;
}

export type ShipId = 'vagalume' | 'besouro' | 'libelula';

export interface ShipSpec {
  id: ShipId;
  name: string;
  /** Estrelas da campanha necessárias para liberar. */
  unlockStars: number;
  /** px/s² */
  mainThrust: number;
  /** px/s² */
  sideThrust: number;
  /** unidades */
  tank: number;
  /** unidades/s */
  mainBurn: number;
  /** unidades/s, por motor lateral */
  sideBurn: number;
  /** px/s */
  landingVy: number;
  /** px/s */
  landingVx: number;
}

/** Posição é o centro da nave; Y cresce para baixo. */
export interface ShipState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  fuel: number;
  /** Motores acesos no último passo, nomeados pela direção em que empurram a nave. */
  engines: Commands;
}
