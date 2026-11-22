import { makeHint } from '../input/device';
import { SHIP_SIZE } from '../data/physics';
import { SHIP_ART } from '../data/shipArt';
import { fmtTime } from '../render/format';
import { isLevelUnlocked, isShipUnlocked, nextLevelIndex, totalStars, type Records } from '../sim/campaign';
import type { Level } from '../sim/level';
import { NO_STARS, type Stars } from '../sim/stars';
import type { ShipId, ShipSpec } from '../sim/types';
import { make, makeButton, type Menu } from './menu';

export function showTitle(menu: Menu, opts: { stars: number; maxStars: number; onPlay: () => void }): void {
  const controls = make('p', 'hint');
  controls.append(makeHint('title'));
  menu.show(
    [
      make('h1', '', 'POUSO CRÍTICO'),
      make('p', '', 'Decole, desvie e pouse com suavidade.'),
      makeButton('Jogar', opts.onPlay, 'big'),
      make('p', 'hint', `★ ${opts.stars}/${opts.maxStars}`),
      controls,
    ],
    { label: 'Título' },
  );
}

/** Três marcas, com texto equivalente para leitores de tela. */
function starRow(stars: Stars): HTMLElement {
  const row = make('span', 'star-row');
  const names = { landing: 'pouso', crystals: 'coleta', fuel: 'economia' } as const;
  const earned: string[] = [];
  for (const key of ['landing', 'crystals', 'fuel'] as const) {
    row.append(make('span', stars[key] ? 'on' : 'off', stars[key] ? '★' : '·'));
    if (stars[key]) earned.push(names[key]);
  }
  row.setAttribute('role', 'img');
  row.setAttribute('aria-label', earned.length > 0 ? `Estrelas: ${earned.join(', ')}` : 'Sem estrelas');
  return row;
}

export function showLevels(
  menu: Menu,
  opts: {
    levels: readonly Level[];
    records: Records;
    onPick: (index: number) => void;
    onBack: () => void;
    onErase: () => void;
  },
): void {
  const { levels, records } = opts;
  const grid = make('div', 'levels');
  const buttons = levels.map((level, i) => {
    const unlocked = isLevelUnlocked(levels, records, i);
    const record = records.get(level.id);
    const b = makeButton('', () => opts.onPick(i), `card world-${level.world}`);
    b.disabled = !unlocked;
    b.append(make('span', 'number', String(i + 1)), make('span', 'name', level.name));
    if (unlocked) {
      b.append(starRow(record?.stars ?? NO_STARS));
      // Recorde de outra versão da fase não vale mais.
      const time = record?.levelVersion === level.version ? record.bestTimeMs : undefined;
      b.append(make('span', 'time', time === undefined ? '–' : fmtTime(time)));
    } else {
      b.append(make('span', 'time', 'bloqueada'));
    }
    grid.append(b);
    return b;
  });

  const erase = makeButton('Apagar progresso', () => {
    if (erase.dataset.armed) {
      opts.onErase();
      return;
    }
    erase.dataset.armed = 'true';
    erase.textContent = 'Apagar tudo mesmo?';
  });
  erase.addEventListener('blur', () => {
    delete erase.dataset.armed;
    erase.textContent = 'Apagar progresso';
  });

  const footer = make('div', 'row');
  footer.append(makeButton('Voltar', opts.onBack, '', 'back'), erase);
  menu.show(
    [make('h2', '', `Fases   ★ ${totalStars(levels, records)}/${levels.length * 3}`), grid, footer],
    { label: 'Seleção de fase', onBack: opts.onBack, focus: buttons[nextLevelIndex(levels, records)] },
  );
}

function shipPicture(id: ShipId): HTMLCanvasElement {
  const canvas = make('canvas', 'ship-picture');
  canvas.width = SHIP_SIZE;
  canvas.height = SHIP_SIZE;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    for (const [color, x, y, w, h] of SHIP_ART[id].rects) {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);
    }
  }
  return canvas;
}

const BARS: readonly { label: string; value: (s: Readonly<ShipSpec>) => number }[] = [
  { label: 'Motor', value: (s) => s.mainThrust },
  { label: 'Lateral', value: (s) => s.sideThrust },
  { label: 'Tanque', value: (s) => s.tank },
  { label: 'Tolerância', value: (s) => s.landingVy },
];

const PROFILES: Readonly<Record<ShipId, string>> = {
  vagalume: 'Equilibrada',
  besouro: 'Pesada e tolerante',
  libelula: 'Ágil e exigente',
};

export function showShips(
  menu: Menu,
  opts: {
    ships: readonly Readonly<ShipSpec>[];
    selected: ShipId;
    stars: number;
    levelName: string;
    onPick: (id: ShipId) => void;
    onBack: () => void;
  },
): void {
  const row = make('div', 'ships');
  let focus: HTMLElement | undefined;
  for (const ship of opts.ships) {
    const unlocked = isShipUnlocked(ship, opts.stars);
    const b = makeButton('', () => opts.onPick(ship.id), 'card');
    b.disabled = !unlocked;
    b.append(shipPicture(ship.id), make('span', 'name', ship.name), make('span', 'time', PROFILES[ship.id]));
    for (const bar of BARS) {
      const max = Math.max(...opts.ships.map(bar.value));
      const line = make('span', 'bar');
      const fill = make('span', 'fill');
      fill.style.width = `${(bar.value(ship) / max) * 100}%`;
      const track = make('span', 'track');
      track.append(fill);
      line.append(make('span', '', bar.label), track);
      b.append(line);
    }
    if (!unlocked) b.append(make('span', 'time', `bloqueada: ★ ${opts.stars}/${ship.unlockStars}`));
    if (unlocked && ship.id === opts.selected) focus = b;
    row.append(b);
  }
  const footer = make('div', 'row');
  footer.append(makeButton('Voltar', opts.onBack, '', 'back'));
  menu.show([make('h2', '', `${opts.levelName}: escolha a nave`), row, footer], {
    label: 'Seleção de nave',
    onBack: opts.onBack,
    ...(focus && { focus }),
  });
}

export function showPause(
  menu: Menu,
  opts: {
    ghost: boolean;
    onResume: () => void;
    onRestart: () => void;
    /** Devolve o novo estado. */
    onGhost: () => boolean;
    onLevels: () => void;
  },
): void {
  const label = make('span');
  const setLabel = (on: boolean): void => { label.textContent = `Fantasma: ${on ? 'ligado' : 'desligado'}`; };
  setLabel(opts.ghost);
  const ghost = makeButton('', () => setLabel(opts.onGhost()), 'big');
  ghost.append(label);
  menu.show(
    [
      make('h2', '', 'Pausado'),
      makeButton('Continuar', opts.onResume, 'big', 'back'),
      makeButton('Reiniciar', opts.onRestart, 'big'),
      ghost,
      makeButton('Escolher fase', opts.onLevels, 'big'),
    ],
    { label: 'Pausa', onBack: opts.onResume },
  );
}
