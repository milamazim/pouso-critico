import './style.css';
import { DT } from './core/fixedStep';
import { startLoop } from './core/loop';
import { LEVELS, TEST_LEVELS } from './data/levels';
import { DEFAULT_PHYSICS, SCREEN_H, SCREEN_W, SHIP_SIZE } from './data/physics';
import { SHIPS } from './data/ships';
import { TuningPanel } from './debug/tuningPanel';
import { Keyboard } from './input/keyboard';
import { Hud } from './render/hud';
import { Particles } from './render/particles';
import { createBackdrop, CRYSTAL_COLOR, drawScene, FUEL_COLOR } from './render/scene';
import { fitStage } from './render/stage';
import { ResultScreen } from './screens/result';
import { Attempt, type SimEvent } from './sim/attempt';
import { recordLanding, type LevelRecord } from './sim/stars';
import type { ShipSpec } from './sim/types';

function el<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Elemento #${id} não encontrado`);
  return found as T;
}

function get2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  canvas.width = SCREEN_W;
  canvas.height = SCREEN_H;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Canvas 2D indisponível');
  return ctx;
}

const ctx = get2d(el<HTMLCanvasElement>('game'));

// Cópias editáveis: o painel nunca altera os valores padrão.
const physics = { ...DEFAULT_PHYSICS };
const ships: ShipSpec[] = SHIPS.map((s) => ({ ...s }));
let shipIndex = 0;
let paused = false;

const particles = new Particles();
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
/** Amplitude atual do tremor de tela, em px. */
let shake = 0;

const levels = [...LEVELS, ...TEST_LEVELS];
let levelIndex = 0;

/** Progresso da sessão, por ID de fase. O save em disco chega em M5. */
const records = new Map<string, LevelRecord>();

let sim = new Attempt(levels[0]!, ships[0]!, physics, onEvent);
let backdrop = createBackdrop(sim.mask, sim.level.world);
const hud = new Hud(el('stage'));
const result = new ResultScreen(el('stage'), restart);
const panel = new TuningPanel(el('panel'), {
  levels,
  ships,
  physics,
  onLevel: selectLevel,
  onShip: selectShip,
  onTank: restart,
  onRestore: restore,
});

const keyboard = new Keyboard((code) => {
  switch (code) {
    case 'KeyR':
      restart();
      break;
    case 'Enter':
      if (sim.phase === 'landed' && !paused) restart();
      break;
    case 'Escape':
    case 'KeyP':
      setPaused(!paused);
      break;
    case 'KeyT':
      panel.toggle();
      break;
    case 'Digit1':
    case 'Digit2':
    case 'Digit3':
      selectShip(Number(code.slice(-1)) - 1);
      break;
  }
});

function onEvent(event: SimEvent): void {
  const { x, y } = sim.ship;
  switch (event.type) {
    case 'crystal':
      particles.sparkle(event.x, event.y, CRYSTAL_COLOR);
      break;
    case 'fuel':
      particles.sparkle(event.x, event.y, FUEL_COLOR);
      break;
    case 'crash':
      particles.explode(x, y, event.vx, event.vy);
      if (!reducedMotion.matches) shake = 4;
      break;
    case 'landed': {
      particles.dust(x, y + SHIP_SIZE / 2);
      const update = recordLanding(records.get(sim.level.id), sim.level, event.result);
      records.set(sim.level.id, update.record);
      result.show(sim.level, event, event.result, update);
      break;
    }
  }
}

function restart(): void {
  particles.clear();
  shake = 0;
  result.hide();
  sim.reset();
}

function selectLevel(index: number): void {
  const level = levels[index];
  if (!level) return;
  levelIndex = index;
  sim = new Attempt(level, sim.spec, physics, onEvent);
  backdrop = createBackdrop(sim.mask, level.world);
  restart();
  panel.render(shipIndex, levelIndex);
}

function selectShip(index: number): void {
  const spec = ships[index];
  if (!spec) return;
  shipIndex = index;
  sim.spec = spec;
  sim.lastOutcome = undefined;
  restart();
  panel.render(shipIndex, levelIndex);
}

function restore(): void {
  Object.assign(physics, DEFAULT_PHYSICS);
  ships.forEach((ship, i) => Object.assign(ship, SHIPS[i]));
  selectShip(shipIndex);
}

function setPaused(value: boolean): void {
  paused = value;
  keyboard.clear();
}

window.addEventListener('blur', () => setPaused(true));
document.addEventListener('visibilitychange', () => {
  if (document.hidden) setPaused(true);
});

panel.render(shipIndex, levelIndex);
fitStage(el('stage'), el('viewport'));

startLoop({
  step: () => {
    sim.step(keyboard.sample());
    particles.step(DT);
    shake = Math.max(0, shake - 12 * DT);
  },
  render: (alpha) => {
    drawScene(ctx, backdrop, sim, particles, alpha, paused ? 0 : shake);
    hud.update(sim, records.get(sim.level.id), paused);
  },
  isPaused: () => paused,
});
