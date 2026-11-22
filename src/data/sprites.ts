import type { ShipId } from '../sim/types';

/** Matriz de texto: um caractere por pixel; ponto é transparente. */
export interface Sprite {
  readonly palette: Readonly<Record<string, string>>;
  readonly rows: readonly string[];
}

export interface ShipArt extends Sprite {
  /** Bocal principal: a chama desce a partir de `y`. */
  readonly main: { readonly x: number; readonly y: number; readonly w: number; readonly length: number };
  /** Bocais laterais: a chama esquerda termina em `left`; a direita começa em `right`. */
  readonly side: { readonly left: number; readonly right: number; readonly y: number; readonly length: number };
  /** Cores da chama, da borda para o centro. */
  readonly flame: readonly [outer: string, inner: string];
}

/**
 * Naves de 16 × 16 px, com os pés na última linha. Os pixels opacos também são
 * a forma de colisão.
 */
export const SHIP_ART: Readonly<Record<ShipId, ShipArt>> = {
  // Cápsula creme com cabine ciano.
  vagalume: {
    palette: {
      w: '#f4eeda', c: '#cfc4a6', d: '#9c9079', b: '#3fb6c9', l: '#c9f2f7', k: '#1f6f86',
      g: '#a3a6bd', h: '#62657f', y: '#ffd54a',
    },
    rows: [
      '.......yy.......',
      '.....wwwwww.....',
      '....wwwwwwcc....',
      '...wwwwwwwwcc...',
      '...wkkkkkkkkc...',
      '...wkblbbbbkc...',
      '..ywkblbbbbkcy..',
      '...wkbbbbbbkc...',
      '...wkkkkkkkkc...',
      '...wwwwwwwccd...',
      '...dccccccddd...',
      '..gg.hggggh.gg..',
      '..gh..hggh..hg..',
      '.gg....hh....gg.',
      '.gh..........hg.',
      '.gggg......gggg.',
    ],
    main: { x: 6, y: 14, w: 4, length: 6 },
    side: { left: 2, right: 14, y: 6, length: 4 },
    flame: ['#ff9a2e', '#fff0a8'],
  },
  // Casco largo e baixo, com antenas e pernas grossas.
  besouro: {
    palette: {
      G: '#3f8f57', D: '#276240', L: '#7ccb8b', E: '#173a28', Y: '#f2cf63', O: '#b9913a',
      T: '#a08f66', S: '#62563a',
    },
    rows: [
      '................',
      '................',
      '....E......E....',
      '.....E....E.....',
      '.....GGEEGG.....',
      '...LLGGEEGGGG...',
      '..LLGGGEEGGGGD..',
      '.LLGGGGEEGGGGDD.',
      'LLGGYYGEEGYYGGDD',
      'LGGGYOGEEGYOGDDD',
      'DDGGGGGEEGGGDDDD',
      '.TTDDDDEEDDDDTT.',
      '.TTS.SSTTSS.STT.',
      '.TT...STTS...TT.',
      '.TS....SS....ST.',
      'TTTTT......TTTTT',
    ],
    main: { x: 5, y: 15, w: 6, length: 4 },
    side: { left: 0, right: 16, y: 9, length: 3 },
    flame: ['#ff6b3b', '#ffd27a'],
  },
  // Corpo fino e alto, com asas laterais.
  libelula: {
    palette: {
      P: '#b58be8', Q: '#e0c8ff', R: '#7d5bb5', C: '#7ff0e0', W: '#efe6ff', V: '#9a86c9', M: '#7a67a8',
    },
    rows: [
      '.......QQ.......',
      '......QQPP......',
      '......QCCP......',
      '.WW...QCCP...WW.',
      '.WVWW.QCCP.WWVW.',
      '..WVVWQPPPWVVW..',
      '....WWQPPRWW....',
      '..VVVVQPPRVVVV..',
      '...VV.QPPR.VV...',
      '......QPPR......',
      '......QPRR......',
      '.....MQPRRM.....',
      '.....M.MM.M.....',
      '....M..MM..M....',
      '....M......M....',
      '...MM......MM...',
    ],
    main: { x: 7, y: 14, w: 2, length: 9 },
    side: { left: 1, right: 15, y: 4, length: 6 },
    flame: ['#4fa8ff', '#e6fbff'],
  },
};

const CRYSTAL_PALETTE = { w: '#e8fbff', c: '#4fe3f2', b: '#25a9c9', d: '#14708f' };

/** Cristal girando; os quadros se repetem em vaivém. */
export const CRYSTAL_FRAMES: readonly Sprite[] = [
  {
    palette: CRYSTAL_PALETTE,
    rows: [
      '....w....', '...wwc...', '..wwwcc..', '.wwwwccc.', 'bbbbbdddd', '.bbbbddd.', '..bbbdd..', '...bbd...', '....b....',
    ],
  },
  {
    palette: CRYSTAL_PALETTE,
    rows: [
      '....w....', '....wc...', '...wwc...', '..wwwcc..', '..bbbdd..', '..bbbdd..', '...bbd...', '....bd...', '....b....',
    ],
  },
  {
    palette: CRYSTAL_PALETTE,
    rows: [
      '....w....', '....w....', '....wc...', '...wwc...', '...bbd...', '...bbd...', '....bd...', '....b....', '....b....',
    ],
  },
];

/** Galão amarelo com faixa. */
export const FUEL_CAN_SPRITE: Sprite = {
  palette: { y: '#ffd54a', o: '#c9922a', l: '#fff0a8', r: '#c8402f', d: '#8c2a20' },
  rows: [
    '..yyy.oo..',
    '.y..yyooo.',
    '.yllyyyyo.',
    'ylyyyyyyoo',
    'ylyyyyyyoo',
    'rrrrrrrrdd',
    'rrrrrrrrdd',
    'ylyyyyyyoo',
    'yyyyyyyyoo',
    '.oooooooo.',
  ],
};

export const CRYSTAL_COLOR = '#4fe3f2';
export const FUEL_COLOR = '#ffd54a';
