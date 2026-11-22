import type { PhysicsConfig } from '../sim/types';

export const SCREEN_W = 480;
export const SCREEN_H = 270;
export const SHIP_SIZE = 16;

/** A partir desta fração do tanque, o alerta de combustível é exibido. */
export const LOW_FUEL = 0.2;

export const DEFAULT_PHYSICS: Readonly<PhysicsConfig> = { gravity: 18, maxSpeed: 140 };
