import { DT } from '../core/fixedStep';
import { SCREEN_H, SCREEN_W, SHIP_SIZE } from '../data/physics';
import { SHIP_ART, type ShipArt } from '../data/shipArt';
import type { Attempt } from '../sim/attempt';
import type { GhostPlayer } from '../sim/ghost';
import { goalAt } from '../sim/hazards';
import { PAD_HEIGHT, type Pad, type Point, type WorldId } from '../sim/level';
import type { TerrainMask } from '../sim/terrain';
import type { Commands } from '../sim/types';
import { drawHazard, drawRail } from './hazards';
import type { Particles } from './particles';

const HALF = SHIP_SIZE / 2;

export const CRYSTAL_COLOR = '#4fe3f2';
export const FUEL_COLOR = '#ffd54a';

interface Palette {
  readonly sky: string;
  readonly edge: string;
  readonly ground: string;
  readonly speck: string;
}

const PALETTES: Readonly<Record<WorldId, Palette>> = {
  plain: { sky: '#0d1026', edge: '#b9b4a3', ground: '#5b5f73', speck: '#4d5164' },
  crater: { sky: '#220c1a', edge: '#e0874a', ground: '#7a3527', speck: '#672b20' },
  cave: { sky: '#06202b', edge: '#8fe3ea', ground: '#2f5873', speck: '#284b63' },
};

// Gerador congruente linear: estrelas e textura são sempre as mesmas.
function createRandom(seed: number): () => number {
  let state = seed;
  return () => (state = (state * 16807) % 2147483647) / 2147483647;
}

/** Céu e terreno não mudam durante a fase, então são desenhados uma única vez. */
export function createBackdrop(mask: TerrainMask, world: WorldId): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = SCREEN_W;
  canvas.height = SCREEN_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D indisponível');

  const palette = PALETTES[world];
  ctx.fillStyle = palette.sky;
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);

  const stars = createRandom(7);
  for (let i = 0; i < 70; i++) {
    const x = Math.floor(stars() * SCREEN_W);
    const y = Math.floor(stars() * SCREEN_H);
    ctx.fillStyle = stars() > 0.7 ? '#aab3d6' : '#444c74';
    ctx.fillRect(x, y, 1, 1);
  }

  const texture = createRandom(31);
  for (let y = 0; y < SCREEN_H; y++) {
    for (let x = 0; x < SCREEN_W; x++) {
      if (!mask.isSolid(x, y)) continue;
      // A borda clara acompanha todo contorno visível, mas não as bordas da tela.
      const edge =
        (y > 0 && !mask.isSolid(x, y - 1)) ||
        (y < SCREEN_H - 1 && !mask.isSolid(x, y + 1)) ||
        (x > 0 && !mask.isSolid(x - 1, y)) ||
        (x < SCREEN_W - 1 && !mask.isSolid(x + 1, y));
      ctx.fillStyle = edge ? palette.edge : texture() > 0.92 ? palette.speck : palette.ground;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return canvas;
}

/** Desenho provisório com formas simples; os sprites chegam em M8. */
export function drawScene(
  ctx: CanvasRenderingContext2D,
  backdrop: HTMLCanvasElement,
  sim: Attempt,
  particles: Particles,
  alpha: number,
  shake: number,
  ghost?: GhostPlayer,
): void {
  const offset = (): number => Math.round((Math.random() * 2 - 1) * shake);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(backdrop, 0, 0);
  if (shake > 0) {
    ctx.setTransform(1, 0, 0, 1, offset(), offset());
    ctx.drawImage(backdrop, 0, 0);
  }

  const landed = sim.phase === 'landed';
  drawPad(ctx, sim.level.base, '#5aa9e6');
  // Perigos usam o mesmo instante interpolado da nave.
  const time = sim.phase === 'flying' ? Math.max(0, sim.time - (1 - alpha) * DT) : sim.time;
  const goal = goalAt(sim.level.goal, time);
  drawRail(ctx, sim.level.goal);
  drawPad(ctx, { ...goal, x: Math.round(goal.x) }, landed ? '#6fe08a' : '#ffd54a');
  if (!landed) drawGoalMarker(ctx, goal);
  for (const h of sim.level.hazards) drawHazard(ctx, h, time);
  sim.level.crystals.forEach((p, i) => { if (!sim.isCrystalTaken(i)) drawCrystal(ctx, p); });
  sim.level.fuelCans.forEach((p, i) => { if (!sim.isCanTaken(i)) drawFuelCan(ctx, p); });

  if (ghost && sim.phase !== 'landed') drawGhost(ctx, ghost, time, sim.phase === 'ready');
  if (sim.phase !== 'crashed') {
    const a = sim.previous;
    const b = sim.ship;
    const x = Math.round(a.x + (b.x - a.x) * alpha);
    const y = Math.round(a.y + (b.y - a.y) * alpha);
    drawShip(ctx, SHIP_ART[sim.spec.id], x - HALF, y - HALF, b.engines, Math.floor(sim.time * 30) % 2);
  }
  particles.draw(ctx);
}

/** Tempo em que o fantasma continua visível depois de pousar. */
const GHOST_LINGER = 0.5;

/** Translúcido e sem colisão; na partida fica escondido atrás da nave. */
function drawGhost(ctx: CanvasRenderingContext2D, ghost: GhostPlayer, time: number, ready: boolean): void {
  if (ready || time > ghost.timeMs / 1000 + GHOST_LINGER) return;
  const { x, y, engines } = ghost.at(time);
  ctx.globalAlpha = 0.35;
  drawShip(ctx, SHIP_ART[ghost.ship], Math.round(x) - HALF, Math.round(y) - HALF, engines, Math.floor(time * 30) % 2);
  ctx.globalAlpha = 1;
}

function drawPad(ctx: CanvasRenderingContext2D, pad: Pad, light: string): void {
  ctx.fillStyle = '#d9dcec';
  ctx.fillRect(pad.x, pad.y, pad.width, PAD_HEIGHT);
  ctx.fillStyle = '#6a7090';
  ctx.fillRect(pad.x, pad.y + 2, pad.width, PAD_HEIGHT - 2);
  ctx.fillStyle = light;
  for (let x = 0; x + 4 <= pad.width; x += 12) ctx.fillRect(pad.x + x, pad.y, 4, 2);
}

/** Seta sobre a base de destino; é só um aviso e não colide. */
function drawGoalMarker(ctx: CanvasRenderingContext2D, pad: Pad): void {
  const x = Math.round(pad.x + pad.width / 2);
  const y = pad.y - 34 + (Math.floor(performance.now() / 400) % 2) * 2;
  ctx.fillStyle = '#ffd54a';
  for (let i = 0; i < 5; i++) ctx.fillRect(x - 5 + i, y + i, 10 - i * 2, 1);
}

/** Losango ciano pulsante. */
function drawCrystal(ctx: CanvasRenderingContext2D, { x, y }: Point): void {
  const r = 4 + (Math.floor(performance.now() / 300) % 2);
  ctx.fillStyle = CRYSTAL_COLOR;
  for (let i = -r; i <= r; i++) {
    const w = r - Math.abs(i);
    ctx.fillRect(x - w, y + i, w * 2 + 1, 1);
  }
  ctx.fillStyle = '#e8fbff';
  ctx.fillRect(x - 1, y - 2, 1, 3);
}

/** Galão amarelo com faixa. */
function drawFuelCan(ctx: CanvasRenderingContext2D, { x, y }: Point): void {
  ctx.fillStyle = FUEL_COLOR;
  ctx.fillRect(x - 4, y - 3, 8, 8);
  ctx.fillRect(x - 4, y - 5, 4, 1);
  ctx.fillRect(x + 1, y - 5, 2, 2);
  ctx.fillRect(x - 4, y - 5, 1, 2);
  ctx.fillStyle = '#b23a2e';
  ctx.fillRect(x - 4, y, 8, 2);
}

/** `left` e `top` são o canto superior esquerdo da nave; `flicker` alterna entre 0 e 1. */
function drawShip(
  ctx: CanvasRenderingContext2D,
  art: ShipArt,
  left: number,
  top: number,
  engines: Commands,
  flicker: number,
): void {
  const { main, side } = art;

  // Chamas: cada uma sai do lado oposto ao movimento.
  ctx.fillStyle = art.flame;
  const sideLength = side.length + flicker * 2;
  if (engines.up) ctx.fillRect(left + main.x, top + main.y, main.w, main.length + flicker * 3);
  if (engines.right) ctx.fillRect(left + side.left - sideLength, top + side.y, sideLength, 2);
  if (engines.left) ctx.fillRect(left + side.right, top + side.y, sideLength, 2);

  for (const [color, x, y, w, h] of art.rects) {
    ctx.fillStyle = color;
    ctx.fillRect(left + x, top + y, w, h);
  }
}
