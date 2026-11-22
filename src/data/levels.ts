import type { Level } from '../sim/level';
import { pts } from './points';

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
