import type { Goal, Pad, Point } from './level';

/** Repetição de um perigo, em segundos. A fase adianta o ciclo no instante zero. */
interface Cycle {
  readonly period: number;
  readonly phase: number;
}

/** Percorre uma reta e reaparece no início. Destrói a nave. */
export interface Meteor extends Cycle {
  readonly type: 'meteor';
  readonly from: Point;
  readonly to: Point;
  readonly radius: number;
  /** px/s */
  readonly speed: number;
}

/** Coluna que empurra a nave para cima; não destrói. */
export interface Geyser extends Cycle {
  readonly type: 'geyser';
  /** Centro da boca. */
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  /** Segundos ligado por ciclo. */
  readonly on: number;
}

/** Barreira que liga e desliga. Destrói a nave quando ligada. */
export interface Laser extends Cycle {
  readonly type: 'laser';
  readonly x: number;
  readonly y: number;
  readonly length: number;
  readonly direction: 'horizontal' | 'vertical';
  /** Segundos ligado por ciclo. */
  readonly on: number;
}

export type Hazard = Meteor | Geyser | Laser;

/** Aceleração do gêiser, em px/s². */
export const GEYSER_PUSH = 60;
/** Espessura do laser, em px. */
export const LASER_WIDTH = 2;
/** Antecedência do aviso de cada perigo, em segundos. */
export const WARNING: Readonly<Record<Hazard['type'], number>> = { meteor: 0.6, geyser: 0.6, laser: 0.4 };

/** Segundos decorridos no ciclo atual. */
export function cycleTime(h: Cycle, time: number): number {
  return (time + h.phase) % h.period;
}

/** Segundos em que o perigo fica ativo a cada ciclo. */
export function activeDuration(h: Hazard): number {
  if (h.type !== 'meteor') return h.on;
  return Math.hypot(h.to.x - h.from.x, h.to.y - h.from.y) / h.speed;
}

export function isActive(h: Hazard, time: number): boolean {
  return cycleTime(h, time) < activeDuration(h);
}

/** O perigo vai se ativar em instantes. */
export function isWarning(h: Hazard, time: number): boolean {
  return !isActive(h, time) && cycleTime(h, time) >= h.period - WARNING[h.type];
}

/** Centro do meteoro, ou indefinido enquanto ele não está em voo. */
export function meteorPosition(m: Meteor, time: number): Point | undefined {
  if (!isActive(m, time)) return undefined;
  const k = cycleTime(m, time) / activeDuration(m);
  return { x: m.from.x + (m.to.x - m.from.x) * k, y: m.from.y + (m.to.y - m.from.y) * k };
}

/** Aceleração vertical somada de todos os gêiseres sobre um ponto (negativa = para cima). */
export function geyserAcceleration(hazards: readonly Hazard[], time: number, x: number, y: number): number {
  let ay = 0;
  for (const h of hazards) {
    if (h.type !== 'geyser' || !isActive(h, time)) continue;
    if (Math.abs(x - h.x) <= h.width / 2 && y <= h.y && y >= h.y - h.height) ay -= GEYSER_PUSH;
  }
  return ay;
}

/** O perigo destrói quem ocupa este pixel? */
export function hitsPixel(h: Hazard, time: number, x: number, y: number): boolean {
  switch (h.type) {
    case 'geyser':
      return false;
    case 'meteor': {
      const c = meteorPosition(h, time);
      return c !== undefined && Math.hypot(x + 0.5 - c.x, y + 0.5 - c.y) < h.radius;
    }
    case 'laser': {
      if (!isActive(h, time)) return false;
      const w = h.direction === 'horizontal' ? h.length : LASER_WIDTH;
      const t = h.direction === 'horizontal' ? LASER_WIDTH : h.length;
      return x >= h.x && x < h.x + w && y >= h.y && y < h.y + t;
    }
  }
}

/** Base de destino no instante dado; só se desloca na horizontal. */
export function goalAt(goal: Goal, time: number): Pad {
  const { x, y, width, motion } = goal;
  if (!motion) return { x, y, width };
  const angle = (2 * Math.PI * (time + motion.phase)) / motion.period;
  return { x: x + motion.amplitude * Math.sin(angle), y, width };
}

/** Velocidade horizontal da base de destino, em px/s. */
export function goalVelocity(goal: Goal, time: number): number {
  const { motion } = goal;
  if (!motion) return 0;
  const w = (2 * Math.PI) / motion.period;
  return motion.amplitude * w * Math.cos(w * (time + motion.phase));
}
