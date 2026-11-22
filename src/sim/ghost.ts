import { DT } from '../core/fixedStep';
import type { Commands, ShipId, ShipState } from './types';

/** Gravação de um pouso, pronta para o save. */
export interface Ghost {
  readonly ship: ShipId;
  readonly timeMs: number;
  /** Amostras em Base64; veja `GhostRecorder`. */
  readonly samples: string;
}

/** Uma amostra a cada 3 passos: 20 por segundo. */
export const SAMPLE_STEPS = 3;
const SAMPLE_SECONDS = SAMPLE_STEPS * DT;
/** Voos mais longos registram o tempo, mas não o fantasma. */
export const MAX_GHOST_SECONDS = 120;
const MAX_SAMPLES = Math.round(MAX_GHOST_SECONDS / SAMPLE_SECONDS) + 1;

/** X e Y em 1/16 px (2 bytes cada) e um byte com os motores. */
const BYTES = 5;
const SCALE = 16;

type Frame = Pick<ShipState, 'x' | 'y' | 'engines'>;

/**
 * Grava posições, e não comandos: o replay continua certo mesmo que a física
 * seja ajustada. A última amostra é o instante exato do pouso; as demais ficam
 * em múltiplos de `SAMPLE_STEPS`.
 */
export class GhostRecorder {
  private bytes: number[] = [];

  clear(): void {
    this.bytes = [];
  }

  add({ x, y, engines }: Readonly<Frame>): void {
    if (this.bytes.length > MAX_SAMPLES * BYTES) return;
    for (const v of [x, y]) {
      const n = Math.max(0, Math.min(0xffff, Math.round(v * SCALE)));
      this.bytes.push(n & 0xff, n >> 8);
    }
    this.bytes.push(Number(engines.up) | (Number(engines.left) << 1) | (Number(engines.right) << 2));
  }

  /** Indefinido se o voo foi longo demais. */
  finish(ship: ShipId, timeMs: number): Ghost | undefined {
    if (timeMs > MAX_GHOST_SECONDS * 1000 || this.bytes.length > MAX_SAMPLES * BYTES) return undefined;
    return { ship, timeMs, samples: btoa(String.fromCharCode(...this.bytes)) };
  }
}

/** Reproduz uma gravação, interpolando entre as amostras. */
export class GhostPlayer {
  private constructor(
    readonly ship: ShipId,
    readonly timeMs: number,
    private readonly bytes: Uint8Array,
  ) {}

  /** Indefinido se a gravação estiver corrompida. */
  static from(ghost: Ghost): GhostPlayer | undefined {
    let text: string;
    try {
      text = atob(ghost.samples);
    } catch {
      return undefined;
    }
    const bytes = Uint8Array.from(text, (c) => c.charCodeAt(0));
    const count = bytes.length / BYTES;
    // Amostras nos múltiplos do intervalo, mais a do pouso.
    const steps = Math.round(ghost.timeMs / 1000 / DT);
    const expected = Math.floor((steps - 1) / SAMPLE_STEPS) + 2;
    if (steps < 1 || count !== expected || count > MAX_SAMPLES) return undefined;
    return new GhostPlayer(ghost.ship, ghost.timeMs, bytes);
  }

  /** Estado no instante dado; depois do fim, parado onde pousou. */
  at(seconds: number): Frame {
    const last = this.bytes.length / BYTES - 1;
    const end = this.timeMs / 1000;
    const t = Math.max(0, Math.min(end, seconds));
    const i = Math.min(Math.floor(t / SAMPLE_SECONDS), last - 1);
    const t0 = i * SAMPLE_SECONDS;
    const t1 = Math.min((i + 1) * SAMPLE_SECONDS, end);
    const k = t1 > t0 ? Math.min(1, (t - t0) / (t1 - t0)) : 1;
    const a = this.frame(i);
    const b = this.frame(i + 1);
    return {
      x: a.x + (b.x - a.x) * k,
      y: a.y + (b.y - a.y) * k,
      engines: t >= end ? b.engines : a.engines,
    };
  }

  private frame(index: number): Frame {
    const o = index * BYTES;
    const read = (at: number): number => ((this.bytes[at] ?? 0) | ((this.bytes[at + 1] ?? 0) << 8)) / SCALE;
    const bits = this.bytes[o + 4] ?? 0;
    const engines: Commands = { up: (bits & 1) !== 0, left: (bits & 2) !== 0, right: (bits & 4) !== 0 };
    return { x: read(o), y: read(o + 2), engines };
  }
}
