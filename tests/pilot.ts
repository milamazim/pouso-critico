import { SHIP_SIZE } from '../src/data/physics';
import type { Attempt } from '../src/sim/attempt';
import { goalVelocity } from '../src/sim/hazards';
import type { Pad, Point } from '../src/sim/level';

const HALF = SHIP_SIZE / 2;
const clamp = (v: number, limit: number): number => Math.max(-limit, Math.min(limit, v));

/** Posição da nave apoiada no centro da base. */
export const onPad = (pad: Pad): Point => ({ x: pad.x + pad.width / 2, y: pad.y - HALF });

/**
 * Piloto cauteloso: passa por cada ponto da rota, quase para sobre o destino
 * (acompanhando-o, se for móvel) e só então desce. Não enxerga os perigos.
 * Serve para provar que a fase pode ser concluída.
 */
export function fly(sim: Attempt, route: readonly Point[], cruise: number, waitSeconds = 0): void {
  const { spec, physics, level } = sim;
  const brakeX = spec.sideThrust * 0.6;
  const brakeY = (spec.mainThrust - physics.gravity) * 0.6;
  const lastY = route[route.length - 1]?.y ?? level.goal.y - HALF;
  // Depois da rota vêm duas etapas: alinhar sobre o destino e descer.
  const stages = route.length + 2;
  let index = 0;

  sim.step({ up: true, left: false, right: false });
  // Espera apoiado na base, com o relógio dos perigos já andando.
  for (let i = 0; i < waitSeconds * 60; i++) sim.step({ up: false, left: false, right: false });
  for (let i = 0; i < 60 * 60 && sim.phase === 'flying'; i++) {
    const { x, y, vx, vy } = sim.ship;
    const goal = onPad(sim.goalPad);
    const descending = index === stages - 1;
    const aligning = index === stages - 2;
    const target = route[index] ?? (aligning ? { x: goal.x, y: lastY } : goal);
    const goalVx = aligning || descending ? goalVelocity(level.goal, sim.time) : 0;
    const dx = target.x - x;
    const dy = target.y - y;

    if (!descending && Math.abs(dx) < 4 && Math.abs(dy) < 10 && (!aligning || Math.abs(vx - goalVx) < 4)) {
      index++;
      continue;
    }
    // Enquanto há pontos à frente na mesma direção, não precisa parar neles.
    const passing = index > 0 && !aligning && !descending;
    const wantX = goalVx + clamp(Math.sign(dx) * (passing ? cruise : Math.sqrt(2 * brakeX * Math.abs(dx))), cruise);
    let wantY: number;
    if (descending) wantY = Math.max(spec.landingVy * 0.6, Math.min(60, Math.sqrt(2 * brakeY * Math.max(dy - 4, 0))));
    else if (dy > 0) wantY = Math.min(20, dy * 1.5);
    else wantY = -Math.min(40, Math.sqrt(2 * physics.gravity * -dy));
    sim.step({ up: vy > wantY, left: vx > wantX + 1.5, right: vx < wantX - 1.5 });
  }
}
