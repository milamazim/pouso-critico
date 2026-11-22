import { LOW_FUEL } from '../data/physics';
import type { Attempt, Outcome } from '../sim/attempt';
import type { LevelRecord } from '../sim/stars';
import type { ShipSpec } from '../sim/types';
import { fmt, fmtPct, starBox } from './format';

function set(el: HTMLElement, text: string, cls: string): void {
  if (el.textContent !== text) el.textContent = text;
  if (el.className !== cls) el.className = cls;
}

function setSpeed(el: HTMLElement, label: string, v: number, ok: boolean): void {
  set(el, `${label} ${fmt(v)}${ok ? '' : ' !'}`, ok ? 'ok' : 'bad');
}

/** Explica a última falha; vazio se não houve. */
function crashText(outcome: Outcome | undefined, spec: ShipSpec): string {
  if (outcome?.type !== 'crash') return '';
  switch (outcome.reason) {
    case 'terrain':
      return 'Bateu no terreno';
    case 'edge':
      return 'Tocou a plataforma fora da área de pouso';
    case 'bounds':
      return 'Saiu da área da fase';
    case 'meteor':
      return 'Atingido por um meteoro';
    case 'laser':
      return 'Atingido por um laser';
    case 'empty':
      return 'Sem combustível para decolar';
    case 'speed': {
      const parts: string[] = [];
      if (outcome.vy > spec.landingVy) parts.push(`VY ${fmt(outcome.vy)} (máx. ${fmt(spec.landingVy)})`);
      const vx = Math.abs(outcome.vx);
      if (vx > spec.landingVx) parts.push(`VX ${fmt(vx)} (máx. ${fmt(spec.landingVx)})`);
      return `Rápido demais: ${parts.join(' e ')}`;
    }
  }
}

/** HUD provisório em DOM; a fonte bitmap chega em M8. */
export class Hud {
  private readonly fuel: HTMLElement;
  private readonly vx: HTMLElement;
  private readonly vy: HTMLElement;
  private readonly crystals: HTMLElement;
  private readonly time: HTMLElement;
  private readonly message: HTMLElement;

  constructor(stage: HTMLElement) {
    const bar = document.createElement('div');
    bar.className = 'hud';
    const cell = (): HTMLElement => bar.appendChild(document.createElement('span'));
    this.fuel = cell();
    this.vx = cell();
    this.vy = cell();
    this.crystals = cell();
    this.time = cell();
    this.message = document.createElement('div');
    stage.append(bar, this.message);
  }

  update(sim: Attempt, record: LevelRecord | undefined, paused: boolean): void {
    const { ship, spec, level } = sim;
    const low = ship.fuel / spec.tank <= LOW_FUEL;
    // A estrela some quando o combustível cai abaixo da meta de economia.
    const mark = (sim.fuelPct >= level.fuelGoalPct ? ' ★' : '') + (low ? ' !' : '');
    const total = level.crystals.length;
    const all = sim.crystalCount === total;

    set(this.fuel, `COMB ${fmtPct(sim.fuelPct)}${mark}`, low ? 'bad' : '');
    // Com destino móvel, o que vale para o pouso é a velocidade em relação a ele.
    const vx = sim.relativeVx;
    setSpeed(this.vx, level.goal.motion ? 'VX rel' : 'VX', vx, Math.abs(vx) <= spec.landingVx);
    setSpeed(this.vy, 'VY', ship.vy, ship.vy <= spec.landingVy);
    set(this.crystals, `◆ ${sim.crystalCount}/${total}${all ? ' ★' : ''}`, all ? 'ok' : '');
    set(this.time, `T ${fmt(sim.time)}`, '');
    set(this.message, this.text(sim, record, paused), 'message');
  }

  private text(sim: Attempt, record: LevelRecord | undefined, paused: boolean): string {
    if (paused) return 'PAUSADO\nEsc para continuar';
    const { lastOutcome, spec, level } = sim;
    const failure = crashText(lastOutcome, spec);
    switch (sim.phase) {
      case 'ready': {
        const stars = record?.stars;
        const n = level.crystals.length;
        const start = [
          `${level.name} · ${spec.name}`,
          '↑ decola · ← → desviam · pouse na base amarela',
          `${starBox(stars?.landing)} pousar  ${starBox(stars?.crystals)} ${n} ${n === 1 ? 'cristal' : 'cristais'}  ` +
            `${starBox(stars?.fuel)} ${level.fuelGoalPct}% de combustível`,
        ].join('\n');
        return failure ? `${failure}\n\n${start}` : start;
      }
      case 'crashed':
        return failure;
      case 'flying':
      case 'landed':
        return '';
    }
  }
}
