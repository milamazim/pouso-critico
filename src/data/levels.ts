import type { Level, Point } from '../sim/level';

/** Converte pares [x, y] em pontos. */
const pts = (...pairs: readonly (readonly [number, number])[]): Point[] =>
  pairs.map(([x, y]) => ({ x, y }));

export const LEVELS: readonly Level[] = [
  {
    id: 'plain-1',
    version: 1,
    name: 'Primeiro Toque',
    world: 'plain',
    startFuelPct: 100,
    fuelGoalPct: 25,
    terrain: [
      pts(
        [0, 270], [0, 196], [40, 204], [80, 222], [140, 222], [164, 208], [188, 182],
        [208, 172], [226, 154], [240, 146], [256, 160], [276, 170], [300, 200], [334, 222],
        [406, 222], [430, 196], [456, 204], [480, 182], [480, 270],
      ),
    ],
    base: { x: 92, y: 220, width: 40 },
    goal: { x: 346, y: 220, width: 48 },
    // No caminho natural, logo acima do morro.
    crystals: pts([240, 118]),
    fuelCans: [],
    hazards: [],
  },
];

/** Morro baixo entre duas áreas planas, usado nas fases de teste. */
const HILL = pts(
  [0, 270], [0, 222], [140, 222], [190, 190], [240, 180], [290, 190], [340, 222],
  [480, 222], [480, 270],
);

/** Fases de desenvolvimento, abertas pelo painel; não fazem parte da campanha. */
export const TEST_LEVELS: readonly Level[] = [
  {
    id: 'test-items',
    version: 1,
    name: 'Teste: itens',
    world: 'plain',
    startFuelPct: 50,
    fuelGoalPct: 40,
    terrain: [HILL],
    base: { x: 60, y: 220, width: 48 },
    goal: { x: 372, y: 220, width: 48 },
    crystals: pts([160, 130], [240, 80], [320, 130]),
    fuelCans: pts([84, 170], [240, 140]),
    hazards: [],
  },
  {
    id: 'test-meteors',
    version: 1,
    name: 'Teste: meteoros',
    world: 'crater',
    startFuelPct: 100,
    fuelGoalPct: 25,
    terrain: [HILL],
    base: { x: 60, y: 220, width: 48 },
    goal: { x: 372, y: 220, width: 48 },
    crystals: pts([240, 120]),
    fuelCans: [],
    hazards: [
      { type: 'meteor', from: { x: 200, y: -12 }, to: { x: 170, y: 203 }, radius: 7, speed: 90, period: 4, phase: 0 },
      { type: 'meteor', from: { x: 492, y: 60 }, to: { x: 290, y: 190 }, radius: 7, speed: 90, period: 4, phase: 2 },
    ],
  },
  {
    id: 'test-geysers',
    version: 1,
    name: 'Teste: gêiseres',
    world: 'crater',
    startFuelPct: 100,
    fuelGoalPct: 25,
    terrain: [HILL],
    base: { x: 60, y: 220, width: 48 },
    goal: { x: 372, y: 220, width: 48 },
    crystals: pts([240, 120]),
    fuelCans: [],
    hazards: [
      { type: 'geyser', x: 160, y: 209, width: 24, height: 130, on: 1.5, period: 4, phase: 0 },
      { type: 'geyser', x: 320, y: 209, width: 24, height: 130, on: 1.5, period: 4, phase: 2 },
    ],
  },
  {
    id: 'test-lasers',
    version: 1,
    name: 'Teste: lasers',
    world: 'cave',
    startFuelPct: 100,
    fuelGoalPct: 25,
    terrain: [HILL, pts([120, 0], [360, 0], [350, 90], [130, 90])],
    base: { x: 60, y: 220, width: 48 },
    goal: { x: 372, y: 220, width: 48 },
    crystals: pts([240, 135]),
    fuelCans: [],
    hazards: [
      { type: 'laser', x: 179, y: 90, length: 107, direction: 'vertical', on: 1.5, period: 3.5, phase: 0 },
      { type: 'laser', x: 300, y: 90, length: 107, direction: 'vertical', on: 1.5, period: 3.5, phase: 1.75 },
    ],
  },
  {
    id: 'test-moving-goal',
    version: 1,
    name: 'Teste: base móvel',
    world: 'cave',
    startFuelPct: 100,
    fuelGoalPct: 20,
    terrain: [HILL],
    base: { x: 60, y: 220, width: 48 },
    goal: { x: 380, y: 220, width: 48, motion: { amplitude: 30, period: 10, phase: 0 } },
    crystals: pts([240, 120]),
    fuelCans: [],
    hazards: [],
  },
];
