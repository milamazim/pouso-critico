import { DT } from '../core/fixedStep';
import { SHIP_SIZE } from '../data/physics';
import { CRYSTAL_FRAMES, FUEL_CAN_SPRITE, SHIP_ART, type ShipArt, type Sprite } from '../data/sprites';
import type { Attempt } from '../sim/attempt';
import type { GhostPlayer } from '../sim/ghost';
import { goalAt } from '../sim/hazards';
import { PAD_HEIGHT, type Pad, type Point } from '../sim/level';
import type { Commands } from '../sim/types';
import { drawHazard, drawRail } from './hazards';
import type { Particles } from './particles';
import { spriteCanvas } from './sprites';

type Ctx = CanvasRenderingContext2D;

const HALF = SHIP_SIZE / 2;
/** Tempo em que o fantasma continua visível depois de pousar. */
const GHOST_LINGER = 0.5;

/** Quadro atual de uma animação contínua. */
const frameAt = (ms: number, count: number): number => Math.floor(performance.now() / ms) % count;

export interface View {
  /** Fração até o próximo passo, para interpolar. */
  readonly alpha: number;
  /** Amplitude do tremor, em px. */
  readonly shake: number;
  /** Desligados, nada pisca nem explode em claro. */
  readonly flashes: boolean;
  readonly ghost?: GhostPlayer | undefined;
}

export function drawScene(
  ctx: Ctx,
  backdrop: HTMLCanvasElement,
  sim: Attempt,
  particles: Particles,
  view: View,
): void {
  const { alpha, shake, flashes, ghost } = view;
  const offset = (): number => Math.round((Math.random() * 2 - 1) * shake);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(backdrop, 0, 0);
  if (shake > 0) {
    ctx.setTransform(1, 0, 0, 1, offset(), offset());
    ctx.drawImage(backdrop, 0, 0);
  }

  const landed = sim.phase === 'landed';
  drawPad(ctx, sim.level.base, '#5aa9e6', '#2c5f8c', flashes);
  // Perigos usam o mesmo instante interpolado da nave.
  const time = sim.phase === 'flying' ? Math.max(0, sim.time - (1 - alpha) * DT) : sim.time;
  const goal = goalAt(sim.level.goal, time);
  drawRail(ctx, sim.level.goal);
  drawPad(ctx, { ...goal, x: Math.round(goal.x) }, landed ? '#6fe08a' : '#ffd54a', landed ? '#2f7a46' : '#8a6a1c', flashes);
  if (!landed) drawGoalMarker(ctx, goal);
  for (const h of sim.level.hazards) drawHazard(ctx, h, time, flashes);

  // Vaivém: 0, 1, 2, 1.
  const spin = [0, 1, 2, 1][frameAt(160, 4)]!;
  sim.level.crystals.forEach((p, i) => { if (!sim.isCrystalTaken(i)) drawSprite(ctx, CRYSTAL_FRAMES[spin]!, p); });
  const bob = frameAt(400, 2);
  sim.level.fuelCans.forEach((p, i) => {
    if (!sim.isCanTaken(i)) drawSprite(ctx, FUEL_CAN_SPRITE, { x: p.x, y: p.y - bob });
  });

  if (ghost && !landed) drawGhost(ctx, ghost, time, sim.phase === 'ready');
  if (sim.phase !== 'crashed') {
    const a = sim.previous;
    const b = sim.ship;
    const x = Math.round(a.x + (b.x - a.x) * alpha);
    const y = Math.round(a.y + (b.y - a.y) * alpha);
    drawShip(ctx, SHIP_ART[sim.spec.id], x - HALF, y - HALF, b.engines, sim.time);
  }
  particles.draw(ctx);
}

/** Desenha o sprite centralizado no ponto. */
function drawSprite(ctx: Ctx, sprite: Sprite, { x, y }: Point): void {
  const canvas = spriteCanvas(sprite);
  ctx.drawImage(canvas, Math.round(x - canvas.width / 2), Math.round(y - canvas.height / 2));
}

/** Translúcido e sem colisão; na partida fica escondido atrás da nave. */
function drawGhost(ctx: Ctx, ghost: GhostPlayer, time: number, ready: boolean): void {
  if (ready || time > ghost.timeMs / 1000 + GHOST_LINGER) return;
  const { x, y, engines } = ghost.at(time);
  ctx.globalAlpha = 0.4;
  drawShip(ctx, SHIP_ART[ghost.ship], Math.round(x) - HALF, Math.round(y) - HALF, engines, time);
  ctx.globalAlpha = 1;
}

/** Plataforma metálica com luzes que correm de uma ponta à outra. */
function drawPad(ctx: Ctx, pad: Pad, light: string, dim: string, flashes: boolean): void {
  const { x, y, width } = pad;
  ctx.fillStyle = '#e6e8f4';
  ctx.fillRect(x, y, width, 1);
  ctx.fillStyle = '#b3b7cf';
  ctx.fillRect(x, y + 1, width, 1);
  ctx.fillStyle = '#6a7090';
  ctx.fillRect(x, y + 2, width, PAD_HEIGHT - 2);
  ctx.fillStyle = '#42486a';
  for (let i = 3; i < width; i += 6) ctx.fillRect(x + i, y + 2, 1, PAD_HEIGHT - 2);
  const lights = Math.floor(width / 12);
  const lit = frameAt(180, lights + 2);
  for (let i = 0; i < lights; i++) {
    ctx.fillStyle = !flashes || i === lit || i === lit - 1 ? light : dim;
    ctx.fillRect(x + i * 12 + 4, y, 4, 2);
  }
  ctx.fillStyle = light;
  ctx.fillRect(x, y, 2, 2);
  ctx.fillRect(x + width - 2, y, 2, 2);
}

/** Seta sobre a base de destino; é só um aviso e não colide. */
function drawGoalMarker(ctx: Ctx, pad: Pad): void {
  const x = Math.round(pad.x + pad.width / 2);
  const y = pad.y - 34 + frameAt(400, 2) * 2;
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = '#8a6a1c';
    ctx.fillRect(x - 5 + i, y + i + 1, 10 - i * 2, 1);
    ctx.fillStyle = '#ffd54a';
    ctx.fillRect(x - 5 + i, y + i, 10 - i * 2, 1);
  }
}

/** Comprimento extra da chama em cada quadro. */
const FLICKER = [0, 2, 1, 3];

/** `left` e `top` são o canto superior esquerdo da nave. */
function drawShip(ctx: Ctx, art: ShipArt, left: number, top: number, engines: Commands, time: number): void {
  const { main, side } = art;
  const extra = FLICKER[Math.floor(time * 24) % FLICKER.length]!;

  // Chamas: cada uma sai do lado oposto ao movimento.
  if (engines.up) {
    const length = main.length + extra;
    for (let i = 0; i < length; i++) {
      const inset = Math.floor((i / length) * (main.w / 2));
      ctx.fillStyle = art.flame[0];
      ctx.fillRect(left + main.x + inset, top + main.y + i, main.w - inset * 2, 1);
      const core = main.w - inset * 2 - 2;
      if (core <= 0 || i > length * 0.6) continue;
      ctx.fillStyle = art.flame[1];
      ctx.fillRect(left + main.x + inset + 1, top + main.y + i, core, 1);
    }
    if (main.w <= 2) {
      ctx.fillStyle = art.flame[1];
      ctx.fillRect(left + main.x, top + main.y, main.w, Math.ceil(length * 0.4));
    }
  }
  const sideLength = side.length + (extra >> 1);
  const jet = (x: number, direction: 1 | -1): void => {
    for (let i = 0; i < sideLength; i++) {
      ctx.fillStyle = art.flame[i < sideLength / 2 ? 1 : 0];
      const thick = i < sideLength - 2 ? 2 : 1;
      ctx.fillRect(x + direction * i - (direction < 0 ? 1 : 0), top + side.y, 1, thick);
    }
  };
  if (engines.right) jet(left + side.left, -1);
  if (engines.left) jet(left + side.right, 1);

  ctx.drawImage(spriteCanvas(art), left, top);
}
