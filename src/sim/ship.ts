import { NO_COMMANDS, type Commands, type PhysicsConfig, type ShipSpec, type ShipState } from './types';

const clamp = (v: number, limit: number): number => Math.max(-limit, Math.min(limit, v));

/** Avança a nave em um passo. Função pura: não altera o estado recebido. */
export function stepShip(
  s: Readonly<ShipState>,
  commands: Readonly<Commands>,
  spec: Readonly<ShipSpec>,
  physics: Readonly<PhysicsConfig>,
  dt: number,
  external: { readonly ax: number; readonly ay: number } = { ax: 0, ay: 0 },
): ShipState {
  const engines: Commands = s.fuel > 0 ? { ...commands } : { ...NO_COMMANDS };
  const up = Number(engines.up);
  const left = Number(engines.left);
  const right = Number(engines.right);

  const burn = up * spec.mainBurn + (left + right) * spec.sideBurn;
  const ax = (right - left) * spec.sideThrust + external.ax;
  const ay = physics.gravity - up * spec.mainThrust + external.ay;

  // Euler semi-implícito: a nova velocidade já vale para a posição.
  const vx = clamp(s.vx + ax * dt, physics.maxSpeed);
  const vy = clamp(s.vy + ay * dt, physics.maxSpeed);

  return {
    x: s.x + vx * dt,
    y: s.y + vy * dt,
    vx,
    vy,
    fuel: Math.max(0, s.fuel - burn * dt),
    engines,
  };
}
