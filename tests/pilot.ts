import { SHIP_SIZE } from '../src/data/physics';
import type { Attempt } from '../src/sim/attempt';
import { goalVelocity } from '../src/sim/hazards';
import type { Pad, Point } from '../src/sim/level';
import { NO_COMMANDS, type Commands } from '../src/sim/types';

const HALF = SHIP_SIZE / 2;
const clamp = (v: number, limit: number): number => Math.max(-limit, Math.min(limit, v));

/** Posição da nave apoiada no centro da base. */
export const onPad = (pad: Pad): Point => ({ x: pad.x + pad.width / 2, y: pad.y - HALF });

/**
 * Piloto cauteloso: passa por cada ponto da rota, quase para sobre o destino
 * (acompanhando-o, se for móvel) e só então desce. Não enxerga os perigos.
 * Serve para provar que a fase pode ser concluída. A função devolvida decide
 * os comandos a partir do estado atual da simulação.
 */
export function createPilot(
  sim: Attempt,
  route: readonly Point[],
  cruise: number,
  waitSeconds = 0,
): () => Commands {
  const { spec, physics, level } = sim;
  const brakeX = spec.sideThrust * 0.6;
  const brakeY = (spec.mainThrust - physics.gravity) * 0.6;
  const lastY = route[route.length - 1]?.y ?? level.goal.y - HALF;
  // Depois da rota vêm duas etapas: alinhar sobre o destino e descer.
  const stages = route.length + 2;
  let index = 0;

  return () => {
    if (sim.phase === 'ready') return { ...NO_COMMANDS, up: true };
    // Espera apoiado na base, com o relógio dos perigos já andando.
    if (sim.time < waitSeconds) return { ...NO_COMMANDS };

    const { x, y, vx, vy } = sim.ship;
    const goal = onPad(sim.goalPad);
    for (;;) {
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
      let speedX = Math.min(cruise, Math.sqrt(2 * brakeX * Math.abs(dx)));
      if (index > 0 && !aligning && !descending) {
        // Ponto de passagem: só reduz se ainda faltar subir ou descer bastante.
        const climb = Math.abs(dy) - 8;
        if (climb <= 0) speedX = cruise;
        else speedX = Math.min(speedX, Math.max(8, Math.abs(dx) / (climb / 18)));
      }
      const wantX = goalVx + clamp(Math.sign(dx) * speedX, cruise);
      let wantY: number;
      if (descending) wantY = Math.max(spec.landingVy * 0.6, Math.min(60, Math.sqrt(2 * brakeY * Math.max(dy - 4, 0))));
      else if (dy > 0) wantY = Math.min(20, dy * 1.5);
      else wantY = -Math.min(40, Math.sqrt(2 * physics.gravity * -dy));
      return { up: vy > wantY, left: vx > wantX + 1.5, right: vx < wantX - 1.5 };
    }
  };
}

/** Voa até o resultado, sem tela. */
export function fly(sim: Attempt, route: readonly Point[], cruise: number, waitSeconds = 0): void {
  const pilot = createPilot(sim, route, cruise, waitSeconds);
  sim.step(pilot());
  for (let i = 0; i < 60 * 70 && sim.phase === 'flying'; i++) sim.step(pilot());
}
