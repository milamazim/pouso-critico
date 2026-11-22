import type { Level } from '../sim/level';
import { pts } from './points';

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
