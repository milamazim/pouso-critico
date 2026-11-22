import type { Commands } from '../sim/types';
import { frequency, parseTune, TUNES, type Score, type Tune, type TuneId } from './tunes';

export const MAX_VOLUME = 10;

/** Antecedência com que as notas são agendadas, em segundos. */
const LOOKAHEAD = 0.15;
const TICK_MS = 40;
/** Silêncio praticamente inaudível; rampas exponenciais não aceitam zero. */
const FLOOR = 0.0001;

/** Volume percebido é quase quadrático. */
const gainOf = (volume: number): number => (Math.max(0, Math.min(MAX_VOLUME, volume)) / MAX_VOLUME) ** 2;

interface Engine {
  readonly gain: GainNode;
  on: boolean;
}

/** Nós criados só depois da primeira interação, como os navegadores exigem. */
interface Graph {
  readonly ctx: AudioContext;
  readonly music: GainNode;
  readonly duck: GainNode;
  readonly sfx: GainNode;
  readonly noise: AudioBuffer;
  readonly engines: Readonly<Record<keyof Commands, Engine>>;
}

export class GameAudio {
  private graph: Graph | undefined;
  /** Navegador sem Web Audio: o jogo segue mudo, sem novas tentativas. */
  private unavailable = false;
  private musicVolume = 6;
  private sfxVolume = 8;
  private ducked = false;

  private tuneId: TuneId | undefined;
  private tune: Tune | undefined;
  private score: Score | undefined;
  private step = 0;
  private nextTime = 0;
  private nextBeep = 0;

  /** Deve ser chamado dentro de um gesto do jogador; chamadas repetidas são inofensivas. */
  unlock(): void {
    if (this.unavailable) return;
    try {
      if (!this.graph) {
        this.graph = createGraph();
        this.applyVolumes();
        setInterval(() => this.schedule(), TICK_MS);
      }
      if (this.graph.ctx.state === 'suspended' && !document.hidden) settle(this.graph.ctx.resume());
    } catch (error) {
      this.unavailable = true;
      console.warn('Áudio indisponível', error);
    }
  }

  setVolumes(music: number, sfx: number): void {
    this.musicVolume = music;
    this.sfxVolume = sfx;
    this.applyVolumes();
  }

  /** Para tudo quando a página some e retoma quando volta. */
  setHidden(hidden: boolean): void {
    if (!this.graph) return;
    settle(hidden ? this.graph.ctx.suspend() : this.graph.ctx.resume());
  }

  /** Música mais baixa durante a pausa. */
  setDucked(ducked: boolean): void {
    if (this.ducked === ducked) return;
    this.ducked = ducked;
    this.applyVolumes();
  }

  play(id: TuneId): void {
    if (this.tuneId === id) return;
    this.tuneId = id;
    this.tune = TUNES[id];
    this.score = parseTune(this.tune);
    this.step = 0;
    this.nextTime = 0;
  }

  /** Liga e desliga os ruídos dos motores conforme o que está aceso. */
  engines(on: Readonly<Commands>): void {
    const g = this.graph;
    if (!g) return;
    for (const key of ['up', 'left', 'right'] as const) {
      const engine = g.engines[key];
      if (engine.on === on[key]) continue;
      engine.on = on[key];
      engine.gain.gain.setTargetAtTime(on[key] ? (key === 'up' ? 0.32 : 0.12) : 0, g.ctx.currentTime, on[key] ? 0.02 : 0.05);
    }
  }

  /** Bipe que acelera conforme o tanque esvazia; `ratio` é a fração restante do alerta. */
  lowFuel(active: boolean, ratio: number): void {
    const g = this.graph;
    if (!g || !active) return;
    const now = g.ctx.currentTime;
    if (now < this.nextBeep) return;
    this.nextBeep = now + 0.22 + 0.7 * Math.max(0, Math.min(1, ratio));
    this.tone('square', 880, now, 0.07, 0.1);
  }

  crystal(): void {
    this.sequence('square', [988, 1319], 0.07, 0.14, 0.16);
  }

  fuel(): void {
    this.sequence('triangle', [392, 523, 659], 0.06, 0.14, 0.35);
  }

  move(): void {
    this.sequence('square', [520], 0.04, 0.04, 0.06);
  }

  select(): void {
    this.sequence('square', [520, 780], 0.05, 0.06, 0.08);
  }

  explosion(): void {
    const g = this.graph;
    if (!g) return;
    const now = g.ctx.currentTime;
    const source = g.ctx.createBufferSource();
    source.buffer = g.noise;
    const filter = g.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2400, now);
    filter.frequency.exponentialRampToValueAtTime(90, now + 0.55);
    const gain = g.ctx.createGain();
    gain.gain.setValueAtTime(0.55, now);
    gain.gain.exponentialRampToValueAtTime(FLOOR, now + 0.6);
    source.connect(filter).connect(gain).connect(g.sfx);
    source.start(now);
    source.stop(now + 0.65);
    // Queda grave por baixo do ruído.
    const boom = this.tone('sine', 150, now, 0.4, 0.5);
    boom?.frequency.exponentialRampToValueAtTime(38, now + 0.4);
  }

  /** Arpejo de pouso, com um toque por estrela do voo. */
  landing(stars: number): void {
    const g = this.graph;
    if (!g) return;
    const now = g.ctx.currentTime;
    [392, 523, 659, 784].forEach((f, i) => this.tone('triangle', f, now + i * 0.08, 0.18, 0.4));
    for (let i = 0; i < stars; i++) this.tone('square', 1047 * [1, 1.25, 1.5][i]!, now + 0.45 + i * 0.16, 0.22, 0.14);
  }

  private sequence(wave: OscillatorType, notes: readonly number[], gap: number, length: number, volume: number): void {
    const g = this.graph;
    if (!g) return;
    notes.forEach((f, i) => this.tone(wave, f, g.ctx.currentTime + i * gap, length, volume));
  }

  private tone(
    wave: OscillatorType, hz: number, start: number, length: number, volume: number, out?: AudioNode,
  ): OscillatorNode | undefined {
    const g = this.graph;
    if (!g) return undefined;
    const osc = g.ctx.createOscillator();
    osc.type = wave;
    osc.frequency.setValueAtTime(hz, start);
    const gain = g.ctx.createGain();
    gain.gain.setValueAtTime(FLOOR, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(FLOOR, volume), start + 0.008);
    gain.gain.exponentialRampToValueAtTime(FLOOR, start + length);
    osc.connect(gain).connect(out ?? g.sfx);
    osc.start(start);
    osc.stop(start + length + 0.02);
    return osc;
  }

  private hit(start: number, kind: 'k' | 'h'): void {
    const g = this.graph;
    if (!g) return;
    if (kind === 'k') {
      this.tone('sine', 120, start, 0.12, 0.4, g.music)?.frequency.exponentialRampToValueAtTime(45, start + 0.1);
      return;
    }
    const source = g.ctx.createBufferSource();
    source.buffer = g.noise;
    const filter = g.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 6000;
    const gain = g.ctx.createGain();
    gain.gain.setValueAtTime(0.07, start);
    gain.gain.exponentialRampToValueAtTime(FLOOR, start + 0.05);
    source.connect(filter).connect(gain).connect(g.music);
    source.start(start);
    source.stop(start + 0.06);
  }

  /** Agenda as notas dos próximos instantes. */
  private schedule(): void {
    const { graph: g, tune, score } = this;
    if (!g || !tune || !score || g.ctx.state !== 'running') return;
    const now = g.ctx.currentTime;
    // Começo, ou atraso grande (aba em segundo plano): recomeça do agora.
    if (this.nextTime < now - 0.2) this.nextTime = now + 0.05;
    while (this.nextTime < now + LOOKAHEAD) {
      const at = this.nextTime;
      const i = this.step;
      const d = score.stepSeconds;
      const note = score.lead.get(i);
      if (note) this.tone(tune.leadWave, frequency(note.midi), at, d * note.steps * 0.95, 0.4 * tune.mix[0], g.music);
      const bass = score.bass.get(i);
      if (bass !== undefined) this.tone('triangle', frequency(bass), at, d * 0.9, 0.8 * tune.mix[2], g.music);
      score.arp[i]!.forEach((midi, k) => {
        this.tone('square', frequency(midi), at + (k * d) / 2, d * 0.4, 0.25 * tune.mix[1], g.music);
      });
      const drum = score.drums.get(i);
      if (drum) this.hit(at, drum);
      this.step = (i + 1) % score.length;
      this.nextTime += d;
    }
  }

  private applyVolumes(): void {
    const g = this.graph;
    if (!g) return;
    const now = g.ctx.currentTime;
    g.music.gain.setTargetAtTime(gainOf(this.musicVolume) * 0.7, now, 0.03);
    g.sfx.gain.setTargetAtTime(gainOf(this.sfxVolume), now, 0.03);
    g.duck.gain.setTargetAtTime(this.ducked ? 0.35 : 1, now, 0.08);
  }
}

/** Recusas são esperadas (sem gesto, página saindo) e resolvidas na próxima interação. */
function settle(promise: Promise<void>): void {
  promise.catch(() => {});
}

function createGraph(): Graph {
  const ctx = new AudioContext();
  // Evita distorção quando muitos sons coincidem.
  const limiter = ctx.createDynamicsCompressor();
  limiter.connect(ctx.destination);
  const duck = ctx.createGain();
  duck.connect(limiter);
  const music = ctx.createGain();
  music.connect(duck);
  const sfx = ctx.createGain();
  sfx.connect(limiter);

  const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

  const engine = (type: BiquadFilterType, hz: number, pan: number): Engine => {
    const source = ctx.createBufferSource();
    source.buffer = noise;
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = hz;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    const panner = ctx.createStereoPanner();
    panner.pan.value = pan;
    source.connect(filter).connect(gain).connect(panner).connect(sfx);
    source.start();
    return { gain, on: false };
  };
  return {
    ctx, music, duck, sfx, noise,
    engines: {
      up: engine('lowpass', 420, 0),
      // O jato sai do lado oposto ao movimento.
      left: engine('bandpass', 2200, 0.5),
      right: engine('bandpass', 2200, -0.5),
    },
  };
}
