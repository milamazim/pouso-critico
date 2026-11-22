import { DT } from '../core/fixedStep';
import { SCREEN_H, SCREEN_W, SHIP_SIZE } from '../data/physics';
import { geyserAcceleration, goalAt, goalVelocity, hitsPixel, isActive } from './hazards';
import { HULLS } from './hull';
import { FUEL_CAN, ITEM_SIZE, PAD_HEIGHT, type Level, type Pad, type Point } from './level';
import { stepShip } from './ship';
import { evaluateStars, type LandingResult } from './stars';
import { TerrainMask } from './terrain';
import { NO_COMMANDS, type Commands, type PhysicsConfig, type ShipSpec, type ShipState } from './types';

const HALF = SHIP_SIZE / 2;
/** Distância além das bordas laterais e inferior que encerra a tentativa. */
const OUT_MARGIN = 16;
/** Duração da explosão antes do reinício automático: 0,4 s. */
export const CRASH_STEPS = 24;

export type Phase = 'ready' | 'flying' | 'crashed' | 'landed';

/**
 * `speed`: pés na plataforma, rápido demais. `edge`: plataforma tocada fora da área de pouso.
 * `empty`: parada na base de partida sem combustível; reinicia sem explodir.
 */
export type CrashReason = 'terrain' | 'speed' | 'edge' | 'bounds' | 'empty' | 'meteor' | 'laser';

export type Outcome =
  | { readonly type: 'crash'; readonly reason: CrashReason; readonly vx: number; readonly vy: number }
  | { readonly type: 'landed'; readonly vx: number; readonly vy: number; readonly result: LandingResult };

/** Áudio, partículas e telas reagem a estes eventos. */
export type SimEvent = Outcome | { readonly type: 'crystal' | 'fuel'; readonly x: number; readonly y: number };

/** Distância entre centros, por eixo, em que a nave alcança um item. */
const REACH = HALF + ITEM_SIZE / 2;

function insidePad(pad: Pad, x: number, y: number): boolean {
  return x >= pad.x && x < pad.x + pad.width && y >= pad.y && y < pad.y + PAD_HEIGHT;
}

/** Uma fase em jogo: decolagem, voo, pouso, destruição e reinício. Não conhece DOM nem canvas. */
export class Attempt {
  phase: Phase = 'ready';
  ship: ShipState;
  /** Estado do passo anterior, usado na interpolação do desenho. */
  previous: ShipState;
  /** Último resultado; permanece após o reinício para explicar a falha. */
  lastOutcome: Outcome | undefined;
  readonly mask: TerrainMask;

  private readonly crystalsTaken = new Set<number>();
  private readonly cansTaken = new Set<number>();
  private steps = 0;
  private crashSteps = 0;
  private waitRelease = false;

  constructor(
    readonly level: Level,
    public spec: ShipSpec,
    public physics: PhysicsConfig,
    private readonly onEvent: (event: SimEvent) => void = () => {},
  ) {
    this.mask = new TerrainMask(SCREEN_W, SCREEN_H, level.terrain);
    this.ship = this.spawn();
    this.previous = this.ship;
  }

  /** Segundos de voo. */
  get time(): number {
    return this.steps * DT;
  }

  /** Percentual exato do tanque. */
  get fuelPct(): number {
    return (this.ship.fuel / this.spec.tank) * 100;
  }

  /** Base de destino no instante atual. */
  get goalPad(): Pad {
    return goalAt(this.level.goal, this.time);
  }

  /** Velocidade horizontal em relação à base de destino; zero fora do voo. */
  get relativeVx(): number {
    return this.phase === 'flying' ? this.ship.vx - goalVelocity(this.level.goal, this.time) : 0;
  }

  get crystalCount(): number {
    return this.crystalsTaken.size;
  }

  isCrystalTaken(index: number): boolean {
    return this.crystalsTaken.has(index);
  }

  isCanTaken(index: number): boolean {
    return this.cansTaken.has(index);
  }

  reset(): void {
    this.crystalsTaken.clear();
    this.cansTaken.clear();
    this.phase = 'ready';
    this.ship = this.spawn();
    this.previous = this.ship;
    this.steps = 0;
    this.crashSteps = 0;
    // Teclas ainda pressionadas não devem iniciar a nova tentativa.
    this.waitRelease = true;
  }

  step(commands: Readonly<Commands>): void {
    if (this.phase === 'landed') return;
    if (this.phase === 'crashed') {
      if (++this.crashSteps >= CRASH_STEPS) this.reset();
      return;
    }
    if (this.phase === 'ready') {
      // Só o motor principal tira a nave da base.
      if (!commands.up) this.waitRelease = false;
      if (!commands.up || this.waitRelease) return;
      this.phase = 'flying';
      this.lastOutcome = undefined;
    }

    const before = this.ship;
    this.steps++;
    const push = geyserAcceleration(this.level.hazards, this.time, before.x, before.y);
    const ship = stepShip(before, commands, this.spec, this.physics, DT, { ax: 0, ay: push });

    // Teto invisível.
    if (ship.y < HALF) {
      ship.y = HALF;
      ship.vy = Math.max(0, ship.vy);
    }

    this.previous = before;
    this.ship = ship;
    this.collect(ship);
    this.resolve(before, ship);
  }

  private collect(ship: ShipState): void {
    const take = (type: 'crystal' | 'fuel', items: readonly Point[], taken: Set<number>): void => {
      items.forEach(({ x, y }, i) => {
        if (taken.has(i) || Math.abs(ship.x - x) >= REACH || Math.abs(ship.y - y) >= REACH) return;
        taken.add(i);
        if (type === 'fuel') ship.fuel = Math.min(this.spec.tank, ship.fuel + FUEL_CAN);
        this.onEvent({ type, x, y });
      });
    };
    take('crystal', this.level.crystals, this.crystalsTaken);
    take('fuel', this.level.fuelCans, this.cansTaken);
  }

  /** Perigos, bases, terreno e limites, nesta ordem. Só um resultado encerra a tentativa. */
  private resolve(before: Readonly<ShipState>, ship: ShipState): void {
    const { base, hazards } = this.level;
    const left = Math.round(ship.x) - HALF;
    const top = Math.round(ship.y) - HALF;
    const { pixels } = HULLS[this.spec.id];

    for (const h of hazards) {
      if (h.type === 'geyser' || !isActive(h, this.time)) continue;
      if (pixels.some((p) => hitsPixel(h, this.time, left + p.x, top + p.y))) {
        this.crash(h.type);
        return;
      }
    }

    const goal = this.goalPad;
    for (const pad of [goal, base]) {
      if (!this.feetTouch(pad, before, ship)) continue;
      ship.y = pad.y - HALF;
      // A tolerância vale em relação à plataforma, que pode estar em movimento.
      const vx = pad === goal ? this.relativeVx : ship.vx;
      const soft = ship.vy <= this.spec.landingVy && Math.abs(vx) <= this.spec.landingVx;
      if (!soft) this.crash('speed', vx);
      else if (pad === goal) this.land(vx);
      else this.rest(ship);
      return;
    }

    const goalPixels = { ...goal, x: Math.round(goal.x) };
    let onTerrain = false;
    for (const p of pixels) {
      const x = left + p.x;
      const y = top + p.y;
      if (insidePad(base, x, y) || insidePad(goalPixels, x, y)) {
        this.crash('edge');
        return;
      }
      onTerrain ||= this.mask.isSolid(x, y);
    }

    if (onTerrain) this.crash('terrain');
    else if (ship.x < -OUT_MARGIN || ship.x > SCREEN_W + OUT_MARGIN || ship.y > SCREEN_H + OUT_MARGIN) {
      this.crash('bounds');
    }
  }

  /** Os dois pés cruzaram o topo da plataforma, descendo, neste passo. */
  private feetTouch(pad: Pad, before: Readonly<ShipState>, ship: Readonly<ShipState>): boolean {
    const { feetLeft, feetRight } = HULLS[this.spec.id];
    const left = ship.x - HALF;
    return (
      ship.vy > 0 &&
      before.y + HALF <= pad.y &&
      ship.y + HALF >= pad.y &&
      left + feetLeft >= pad.x &&
      left + feetRight <= pad.x + pad.width
    );
  }

  /** Apoiada na base de partida: os pés seguram a nave e a tentativa continua. */
  private rest(ship: ShipState): void {
    ship.x = this.previous.x;
    ship.vx = 0;
    ship.vy = 0;
    if (ship.fuel > 0) return;
    // Sem combustível na base não há como continuar.
    this.reset();
    this.lastOutcome = { type: 'crash', reason: 'empty', vx: 0, vy: 0 };
  }

  private land(vx: number): void {
    const { vy } = this.ship;
    const crystals = this.crystalCount;
    const { fuelPct } = this;
    this.finish('landed', {
      type: 'landed', vx, vy,
      result: {
        stars: evaluateStars(this.level, crystals, fuelPct),
        timeMs: Math.round(this.time * 1000),
        fuelPct,
        crystals,
      },
    });
  }

  private crash(reason: CrashReason, vx = this.ship.vx): void {
    const { vy } = this.ship;
    this.finish('crashed', { type: 'crash', reason, vx, vy });
  }

  private finish(phase: Phase, outcome: Outcome): void {
    this.phase = phase;
    this.ship = { ...this.ship, vx: 0, vy: 0, engines: { ...NO_COMMANDS } };
    this.previous = this.ship;
    this.lastOutcome = outcome;
    this.onEvent(outcome);
  }

  private spawn(): ShipState {
    const { base, startFuelPct } = this.level;
    return {
      x: base.x + base.width / 2, y: base.y - HALF, vx: 0, vy: 0,
      fuel: (this.spec.tank * startFuelPct) / 100,
      engines: { ...NO_COMMANDS },
    };
  }
}
