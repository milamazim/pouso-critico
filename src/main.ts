import './style.css';
import { DT } from './core/fixedStep';
import { startLoop } from './core/loop';
import { LEVELS } from './data/levels';
import { DEFAULT_PHYSICS, SCREEN_H, SCREEN_W, SHIP_SIZE } from './data/physics';
import { SHIPS } from './data/ships';
import { TEST_LEVELS } from './data/testLevels';
import { TuningPanel } from './debug/tuningPanel';
import { Keyboard } from './input/keyboard';
import { Hud } from './render/hud';
import { Particles } from './render/particles';
import { createBackdrop, CRYSTAL_COLOR, drawScene, FUEL_COLOR } from './render/scene';
import { fitStage } from './render/stage';
import { Menu } from './screens/menu';
import { ResultScreen } from './screens/result';
import { showLevels, showPause, showShips, showTitle } from './screens/screens';
import { Attempt, type SimEvent } from './sim/attempt';
import { isLevelUnlocked, isShipUnlocked, totalStars } from './sim/campaign';
import { recordLanding, type LandingResult, type RecordUpdate } from './sim/stars';
import type { ShipSpec } from './sim/types';
import { emptySave, loadSave, writeSave } from './storage/save';

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
const getStore = (): Storage => window.localStorage;
let save = loadSave(getStore);

// Cópias editáveis: o painel nunca altera os valores padrão.
const physics = { ...DEFAULT_PHYSICS };
const ships: ShipSpec[] = SHIPS.map((s) => ({ ...s }));
let shipIndex = Math.max(0, ships.findIndex((s) => s.id === save.selectedShip));

/** A campanha vem primeiro; o índice nela é o mesmo em `LEVELS`. */
const levels = [...LEVELS, ...TEST_LEVELS];
let levelIndex = 0;

/** Só em `game` a simulação avança. */
let screen: 'title' | 'levels' | 'ships' | 'game' | 'pause' = 'title';
/** Valores foram alterados no painel durante este voo. */
let tuned = false;

const particles = new Particles();
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
/** Amplitude atual do tremor de tela, em px. */
let shake = 0;

let sim = new Attempt(levels[0]!, ships[shipIndex]!, physics, onEvent);
let backdrop = createBackdrop(sim.mask, sim.level.world);
const hud = new Hud(el('stage'));
const result = new ResultScreen(el('stage'), { onReplay: restart, onLevels: openLevels });
// Antes do teclado do jogo, para poder consumir as teclas do menu aberto.
const menu = new Menu(el('stage'));
const panel = new TuningPanel(el('panel'), {
  levels,
  ships,
  physics,
  onLevel: (index) => play(index, shipIndex),
  onShip: (index) => play(levelIndex, index),
  onChange: () => { tuned = true; },
  onTank: restart,
  onRestore: restore,
});

const keyboard = new Keyboard((code) => {
  if (screen !== 'game') return;
  const landed = sim.phase === 'landed';
  switch (code) {
    case 'KeyR':
      restart();
      break;
    case 'Enter':
      if (landed) (nextLevel() ?? restart)();
      break;
    case 'Escape':
      if (landed) openLevels();
      else openPause();
      break;
    case 'KeyP':
      if (!landed) openPause();
      break;
    case 'KeyT':
      panel.toggle();
      break;
  }
});

// ---------------------------------------------------------------- telas

function openTitle(): void {
  screen = 'title';
  showTitle(menu, {
    stars: totalStars(LEVELS, save.levels),
    maxStars: LEVELS.length * 3,
    onPlay: openLevels,
  });
}

function openLevels(): void {
  screen = 'levels';
  result.hide();
  showLevels(menu, {
    levels: LEVELS,
    records: save.levels,
    onPick: openShips,
    onBack: openTitle,
    onErase: () => {
      save = emptySave();
      shipIndex = 0;
      writeSave(getStore, save);
      openLevels();
    },
  });
}

function openShips(index: number): void {
  screen = 'ships';
  showShips(menu, {
    ships: SHIPS,
    selected: save.selectedShip,
    stars: totalStars(LEVELS, save.levels),
    levelName: LEVELS[index]?.name ?? '',
    onPick: (id) => {
      save.selectedShip = id;
      writeSave(getStore, save);
      play(index, SHIPS.findIndex((s) => s.id === id));
    },
    onBack: openLevels,
  });
}

function openPause(): void {
  screen = 'pause';
  showPause(menu, {
    onResume: resume,
    onRestart: () => {
      resume();
      restart();
    },
    onLevels: openLevels,
  });
}

function resume(): void {
  menu.hide();
  keyboard.clear();
  screen = 'game';
}

// ---------------------------------------------------------------- jogo

function play(newLevel: number, newShip: number): void {
  const level = levels[newLevel];
  const spec = ships[newShip];
  if (!level || !spec) return;
  levelIndex = newLevel;
  shipIndex = newShip;
  sim = new Attempt(level, spec, physics, onEvent);
  backdrop = createBackdrop(sim.mask, level.world);
  panel.render(shipIndex, levelIndex);
  resume();
  restart();
}

function restart(): void {
  particles.clear();
  shake = 0;
  tuned = !hasDefaultValues();
  result.hide();
  sim.reset();
}

function restore(): void {
  Object.assign(physics, DEFAULT_PHYSICS);
  ships.forEach((ship, i) => Object.assign(ship, SHIPS[i]));
  play(levelIndex, shipIndex);
}

function hasDefaultValues(): boolean {
  return (
    JSON.stringify(physics) === JSON.stringify(DEFAULT_PHYSICS) &&
    JSON.stringify(ships) === JSON.stringify(SHIPS)
  );
}

/** Só contam voos da campanha, com fase e nave liberadas e valores padrão. */
function flightCounts(): boolean {
  return (
    !tuned &&
    levelIndex < LEVELS.length &&
    isLevelUnlocked(LEVELS, save.levels, levelIndex) &&
    isShipUnlocked(sim.spec, totalStars(LEVELS, save.levels))
  );
}

/** Ação que abre a próxima fase, se houver uma liberada. */
function nextLevel(): (() => void) | undefined {
  const next = levelIndex + 1;
  if (next >= LEVELS.length || !isLevelUnlocked(LEVELS, save.levels, next)) return undefined;
  return () => play(next, shipIndex);
}

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
    case 'landed':
      particles.dust(x, y + SHIP_SIZE / 2);
      showResult(event, event.result);
      break;
  }
}

function showResult(touch: { vx: number; vy: number }, landing: LandingResult): void {
  const notes: string[] = [];
  let update: RecordUpdate | undefined;

  if (flightCounts()) {
    const before = totalStars(LEVELS, save.levels);
    update = recordLanding(save.levels.get(sim.level.id), sim.level, landing);
    save.levels.set(sim.level.id, update.record);
    const after = totalStars(LEVELS, save.levels);

    for (const ship of SHIPS) {
      if (!isShipUnlocked(ship, before) && isShipUnlocked(ship, after)) notes.push(`Nave liberada: ${ship.name}!`);
    }
    if (levelIndex === LEVELS.length - 1 && update.newStars.landing) notes.push('Campanha concluída!');
    if (!writeSave(getStore, save)) notes.push('Não foi possível salvar: o progresso vale só até fechar a página.');
  } else {
    notes.push('Voo de teste: não conta para o progresso.');
  }

  const onNext = nextLevel();
  result.show({
    level: sim.level, touch, result: landing, notes,
    ...(update && { update }),
    ...(onNext && { onNext }),
  });
}

// ---------------------------------------------------------------- início

function onLeave(): void {
  keyboard.clear();
  if (screen === 'game' && sim.phase === 'flying') openPause();
}

window.addEventListener('blur', onLeave);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) onLeave();
});

panel.render(shipIndex, levelIndex);
fitStage(el('stage'), el('viewport'));
openTitle();

startLoop({
  step: () => {
    sim.step(keyboard.sample());
    particles.step(DT);
    shake = Math.max(0, shake - 12 * DT);
  },
  render: (alpha) => {
    drawScene(ctx, backdrop, sim, particles, alpha, screen === 'game' ? shake : 0);
    hud.update(sim, save.levels.get(sim.level.id));
  },
  isPaused: () => screen !== 'game',
});
