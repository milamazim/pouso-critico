import { SCREEN_H, SCREEN_W } from '../data/physics';
import {
  activeDuration, cycleTime, isActive, isWarning, LASER_WIDTH, meteorPosition,
  type Geyser, type Hazard, type Laser, type Meteor,
} from '../sim/hazards';
import { PAD_HEIGHT, type Goal } from '../sim/level';

const DANGER = '#ff4d5e';
/** Duração do clarão no fim do trajeto do meteoro. */
const IMPACT = 0.25;

type Ctx = CanvasRenderingContext2D;

export function drawHazard(ctx: Ctx, h: Hazard, time: number, flashes: boolean): void {
  switch (h.type) {
    case 'meteor': return drawMeteor(ctx, h, time, flashes);
    case 'geyser': return drawGeyser(ctx, h, time);
    case 'laser': return drawLaser(ctx, h, time);
  }
}

function disc(ctx: Ctx, cx: number, cy: number, r: number): void {
  for (let dy = -r; dy < r; dy++) {
    const half = Math.round(Math.sqrt(r * r - (dy + 0.5) ** 2));
    ctx.fillRect(Math.round(cx) - half, Math.round(cy) + dy, half * 2, 1);
  }
}

function drawMeteor(ctx: Ctx, m: Meteor, time: number, flashes: boolean): void {
  const length = Math.hypot(m.to.x - m.from.x, m.to.y - m.from.y);
  const ux = (m.to.x - m.from.x) / length;
  const uy = (m.to.y - m.from.y) / length;
  const c = meteorPosition(m, time);

  if (c) {
    // Rastro: pedaços menores atrás da rocha.
    [['#ffb13b', 0.7, 1], ['#ff6b3b', 0.5, 1.7], ['#a33a2a', 0.3, 2.4]].forEach(([color, size, back]) => {
      ctx.fillStyle = color as string;
      const r = Math.max(1, Math.round(m.radius * (size as number)));
      disc(ctx, c.x - ux * m.radius * (back as number), c.y - uy * m.radius * (back as number), r);
    });
    // Rocha sombreada, com crateras que giram em quatro quadros.
    ctx.fillStyle = '#5e453c';
    disc(ctx, c.x, c.y, m.radius);
    ctx.fillStyle = '#8a6a5c';
    disc(ctx, c.x - 1, c.y - 1, m.radius - 1);
    ctx.fillStyle = '#a9887a';
    disc(ctx, c.x - 2, c.y - 2, Math.max(1, m.radius - 4));
    ctx.fillStyle = '#4a352e';
    const turn = Math.floor(time * 6) % 4;
    const [ox, oy] = [[2, 1], [-1, 2], [-3, 0], [0, -3]][turn] as [number, number];
    ctx.fillRect(Math.round(c.x) + ox, Math.round(c.y) + oy, 2, 2);
    ctx.fillRect(Math.round(c.x) - oy - 1, Math.round(c.y) + ox - 1, 2, 1);
    return;
  }

  const sinceImpact = cycleTime(m, time) - activeDuration(m);
  if (flashes && sinceImpact < IMPACT && time > sinceImpact) {
    ctx.fillStyle = '#ffb13b';
    disc(ctx, m.to.x, m.to.y, Math.max(1, Math.round(m.radius * (1 - sinceImpact / IMPACT))));
  }
  // Sem flashes, a seta de aviso fica acesa em vez de piscar.
  if (isWarning(m, time) && (!flashes || Math.floor(time * 8) % 2 === 0)) {
    drawArrow(ctx, clampTo(m.from.x, SCREEN_W), clampTo(m.from.y, SCREEN_H), ux, uy);
  }
}

const clampTo = (v: number, size: number): number => Math.round(Math.max(8, Math.min(size - 8, v)));

/** Seta vermelha no sentido do movimento, reduzido a um dos quatro lados. */
function drawArrow(ctx: Ctx, x: number, y: number, ux: number, uy: number): void {
  ctx.fillStyle = DANGER;
  const horizontal = Math.abs(ux) > Math.abs(uy);
  const sign = Math.sign(horizontal ? ux : uy);
  for (let i = 0; i < 6; i++) {
    const half = 6 - i;
    if (horizontal) ctx.fillRect(x + sign * i, y - half, 1, half * 2);
    else ctx.fillRect(x - half, y + sign * i, half * 2, 1);
  }
}

function drawGeyser(ctx: Ctx, g: Geyser, time: number): void {
  const left = Math.round(g.x - g.width / 2);
  ctx.fillStyle = '#2b1a1a';
  ctx.fillRect(left, g.y - 1, g.width, 3);

  if (isActive(g, time)) {
    ctx.fillStyle = 'rgb(190 225 255 / 22%)';
    ctx.fillRect(left, g.y - g.height, g.width, g.height);
    ctx.fillStyle = '#d6ecff';
    for (let i = 0; i < 18; i++) {
      const rise = (time * 150 + i * 47) % g.height;
      ctx.fillRect(left + ((i * 7) % g.width), Math.round(g.y - rise), 1, 5);
    }
  } else if (isWarning(g, time)) {
    ctx.fillStyle = '#d6ecff';
    for (let i = 0; i < 6; i++) {
      const rise = (time * 24 + i * 5) % 12;
      ctx.fillRect(left + ((i * 5 + 2) % g.width), Math.round(g.y - 2 - rise), 2, 2);
    }
  }
}

function drawLaser(ctx: Ctx, l: Laser, time: number): void {
  const horizontal = l.direction === 'horizontal';
  const bar = (start: number, length: number, inset: number): void => {
    if (horizontal) ctx.fillRect(l.x + start, l.y + inset, length, LASER_WIDTH - inset);
    else ctx.fillRect(l.x + inset, l.y + start, LASER_WIDTH - inset, length);
  };

  if (isActive(l, time)) {
    ctx.fillStyle = DANGER;
    bar(0, l.length, 0);
    ctx.fillStyle = '#ffd9dd';
    bar(0, l.length, 1);
  } else if (isWarning(l, time)) {
    ctx.fillStyle = DANGER;
    for (let i = 0; i < l.length; i += 6) bar(i, Math.min(2, l.length - i), 0);
  }

  // Emissores nas duas pontas, sempre visíveis.
  ctx.fillStyle = '#8d90a8';
  for (const end of [0, l.length]) {
    const x = horizontal ? l.x + end : l.x + LASER_WIDTH / 2;
    const y = horizontal ? l.y + LASER_WIDTH / 2 : l.y + end;
    ctx.fillRect(x - 3, y - 3, 6, 6);
  }
}

/** Trilho da plataforma móvel, com batentes nos limites do percurso. */
export function drawRail(ctx: Ctx, goal: Goal): void {
  if (!goal.motion) return;
  const left = Math.round(goal.x - goal.motion.amplitude);
  const right = Math.round(goal.x + goal.motion.amplitude + goal.width);
  const y = goal.y + PAD_HEIGHT;
  ctx.fillStyle = '#e8e2cf';
  for (let x = left; x < right; x += 6) ctx.fillRect(x, y, 3, 1);
  ctx.fillRect(left - 2, y - 2, 2, 4);
  ctx.fillRect(right, y - 2, 2, 4);
}
