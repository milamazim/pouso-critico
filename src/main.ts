import './style.css';
import { DT } from './core/fixedStep';
import { startLoop } from './core/loop';
import { LEVELS } from './data/levels';
import { DEFAULT_PHYSICS, SCREEN_H, SCREEN_W, SHIP_SIZE } from './data/physics';
import { SHIPS } from './data/ships';
import { TEST_LEVELS } from './data/testLevels';
import { TuningPanel } from './debug/tuningPanel';
import { currentDevice, setDevice } from './input/device';
import { GamepadInput, type PadAction } from './input/gamepad';
import { Keyboard } from './input/keyboard';
import { TouchControls } from './input/touch';
import { Hud } from './render/hud';
import { fmtTime } from './render/format';
import { Particles } from './render/particles';
import { createBackdrop, CRYSTAL_COLOR, drawScene, FUEL_COLOR } from './render/scene';
import { fitStage } from './render/stage';
import { Menu } from './screens/menu';
import { ResultScreen } from './screens/result';
import { showLevels, showPause, showShips, showTitle } from './screens/screens';
import { Attempt, type SimEvent } from './sim/attempt';
import { isLevelUnlocked, isShipUnlocked, totalStars } from './sim/campaign';
import { GhostPlayer } from './sim/ghost';
import { recordLanding, type LandingResult, type RecordUpdate } from './sim/stars';
import type { Commands, ShipSpec } from './sim/types';
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
/** Tempo em que o gamepad não sai da tela de resultado, em ms. */
const RESULT_GUARD = 600;
let resultShownAt = 0;

/** Valores foram alterados no painel durante este voo. */
let tuned = false;

const particles = new Particles();
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
/** Amplitude atual do tremor de tela, em px. */
let shake = 0;

let sim = new Attempt(levels[0]!, ships[shipIndex]!, physics, onEvent);
/** Melhor pouso gravado da fase atual. */
let ghost: GhostPlayer | undefined;
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
    case 'KeyG':
      toggleGhost();
      break;
    case 'KeyT':
      panel.toggle();
      break;
  }
});

const touch = new TouchControls(el('viewport'), { pause: openPause, restart });

const gamepad = new GamepadInput(readGamepads, {
  press: onPadPress,
  activity: () => setDevice('gamepad'),
  disconnect: onLeave,
});

function readGamepads(): readonly (Gamepad | null)[] {
  try {
    return navigator.getGamepads();
  } catch {
    // Bloqueado pela página que hospeda o jogo.
    return [];
  }
}

function onPadPress(action: PadAction): void {
  if (rotated()) return;
  if (menu.isOpen) {
    if (action === 'a') menu.activate();
    else if (action === 'b' || (action === 'start' && screen === 'pause')) menu.back();
    else if (action === 'up' || action === 'down' || action === 'left' || action === 'right') menu.move(action);
    return;
  }
  if (sim.phase !== 'landed') {
    if (action === 'y') restart();
    else if (action === 'start') openPause();
    else if (action === 'select') toggleGhost();
    return;
  }
  // O mesmo A do motor não pode pular o resultado logo após o toque.
  if (performance.now() - resultShownAt < RESULT_GUARD) return;
  if (action === 'a') (nextLevel() ?? restart)();
  else if (action === 'y') restart();
  else if (action === 'b' || action === 'start') openLevels();
}

/** Todas as entradas valem ao mesmo tempo. */
function sampleCommands(): Commands {
  const all = [keyboard.sample(), touch.sample(), gamepad.sample()];
  return {
    up: all.some((c) => c.up),
    left: all.some((c) => c.left),
    right: all.some((c) => c.right),
  };
}

function clearInput(): void {
  keyboard.clear();
  touch.clear();
  gamepad.clear();
}

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
    ghost: save.showGhost,
    onGhost: toggleGhost,
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
  clearInput();
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
  loadGhost();
}

function loadGhost(): void {
  const record = save.levels.get(sim.level.id);
  // Gravação de outra versão da fase não vale mais.
  const recorded = record?.levelVersion === sim.level.version ? record.ghost : undefined;
  ghost = recorded && GhostPlayer.from(recorded);
}

function ghostText(): string {
  if (!ghost) return '';
  if (!save.showGhost) return 'fantasma desligado';
  const { ship, timeMs } = ghost;
  return `fantasma: ${SHIPS.find((s) => s.id === ship)?.name ?? ship} ${fmtTime(timeMs)}`;
}

function toggleGhost(): boolean {
  save.showGhost = !save.showGhost;
  writeSave(getStore, save);
  return save.showGhost;
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
    update = recordLanding(save.levels.get(sim.level.id), sim.level, landing, sim.recording());
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

  resultShownAt = performance.now();
  const onNext = nextLevel();
  result.show({
    level: sim.level, touch, result: landing, notes,
    ...(update && { update }),
    ...(onNext && { onNext }),
  });
}

// ---------------------------------------------------------------- início

function onLeave(): void {
  clearInput();
  if (screen === 'game' && sim.phase === 'flying') openPause();
}

window.addEventListener('blur', onLeave);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) onLeave();
});

// No celular o jogo é horizontal: na vertical, pausa e pede para girar.
const portrait = window.matchMedia('(orientation: portrait)');
const rotateNotice = el('rotate');

function rotated(): boolean {
  return currentDevice() === 'touch' && portrait.matches;
}

portrait.addEventListener('change', () => {
  if (rotated()) onLeave();
});

window.addEventListener('keydown', () => setDevice('keyboard'), true);
window.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'touch') setDevice('touch');
}, true);
if (window.matchMedia('(pointer: coarse)').matches) setDevice('touch');

panel.render(shipIndex, levelIndex);
fitStage(el('stage'), el('viewport'));
openTitle();

startLoop({
  frame: () => {
    gamepad.poll();
    rotateNotice.hidden = !rotated();
    touch.visible = screen === 'game' && sim.phase !== 'landed' && currentDevice() === 'touch' && !rotated();
  },
  step: () => {
    sim.step(sampleCommands());
    particles.step(DT);
    shake = Math.max(0, shake - 12 * DT);
  },
  render: (alpha) => {
    drawScene(ctx, backdrop, sim, particles, alpha, screen === 'game' ? shake : 0, save.showGhost ? ghost : undefined);
    hud.update(sim, save.levels.get(sim.level.id), ghostText());
  },
  isPaused: () => screen !== 'game' || rotated(),
});
