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
  {
    id: 'plain-2',
    version: 1,
    name: 'De Lado',
    world: 'plain',
    startFuelPct: 100,
    fuelGoalPct: 25,
    // Colinas baixas e travessia longa: o desafio é frear de lado.
    terrain: [
      pts(
        [0, 270], [0, 214], [24, 222], [96, 222], [130, 206], [170, 194], [210, 200],
        [250, 186], [300, 196], [340, 208], [366, 222], [456, 222], [480, 206], [480, 270],
      ),
    ],
    base: { x: 40, y: 220, width: 40 },
    goal: { x: 388, y: 220, width: 48 },
    crystals: pts([160, 160], [300, 160]),
    fuelCans: [],
    hazards: [],
  },
  {
    id: 'plain-3',
    version: 1,
    name: 'Entre Picos',
    world: 'plain',
    startFuelPct: 100,
    fuelGoalPct: 20,
    terrain: [
      pts(
        [0, 270], [0, 206], [24, 222], [96, 222], [130, 190], [168, 150], [206, 190],
        [240, 204], [280, 184], [312, 140], [344, 180], [372, 214], [384, 222], [436, 222],
        [452, 190], [480, 150], [480, 270],
      ),
    ],
    base: { x: 40, y: 220, width: 40 },
    goal: { x: 392, y: 220, width: 36 },
    crystals: pts([168, 124], [240, 160], [312, 112]),
    fuelCans: [],
    hazards: [],
  },
  {
    id: 'plain-4',
    version: 1,
    name: 'Tanque Raso',
    world: 'plain',
    startFuelPct: 50,
    fuelGoalPct: 30,
    // Destino no alto; os galões ficam na subida.
    terrain: [
      pts(
        [0, 270], [0, 220], [30, 232], [100, 232], [124, 212], [160, 200], [200, 206],
        [236, 184], [280, 190], [320, 162], [340, 152], [420, 152], [440, 130], [480, 118],
        [480, 270],
      ),
    ],
    base: { x: 46, y: 230, width: 40 },
    goal: { x: 352, y: 150, width: 44 },
    crystals: pts([110, 170], [220, 140], [320, 108]),
    fuelCans: pts([160, 150], [280, 128]),
    hazards: [],
  },
  {
    id: 'crater-1',
    version: 1,
    name: 'Sopro',
    world: 'crater',
    startFuelPct: 100,
    fuelGoalPct: 30,
    // Gêiseres no fundo plano, dos dois lados do morro.
    terrain: [
      pts(
        [0, 270], [0, 200], [30, 222], [100, 222], [120, 228], [170, 228], [190, 200],
        [240, 172], [290, 200], [310, 228], [356, 228], [372, 222], [440, 222], [460, 196],
        [480, 180], [480, 270],
      ),
    ],
    base: { x: 44, y: 220, width: 40 },
    goal: { x: 384, y: 220, width: 44 },
    crystals: pts([145, 150], [240, 130], [333, 150]),
    fuelCans: [],
    hazards: [
      { type: 'geyser', x: 145, y: 228, width: 28, height: 110, on: 1.5, period: 4.5, phase: 0 },
      { type: 'geyser', x: 333, y: 228, width: 28, height: 110, on: 1.5, period: 4.5, phase: 2 },
    ],
  },
  {
    id: 'crater-2',
    version: 1,
    name: 'Chuva de Pedra',
    world: 'crater',
    startFuelPct: 100,
    fuelGoalPct: 25,
    terrain: [
      pts(
        [0, 270], [0, 210], [26, 222], [100, 222], [140, 200], [190, 180], [240, 190],
        [290, 178], [340, 200], [372, 222], [440, 222], [480, 196], [480, 270],
      ),
    ],
    base: { x: 44, y: 220, width: 40 },
    goal: { x: 384, y: 220, width: 44 },
    crystals: pts([165, 140], [240, 130], [315, 140]),
    fuelCans: [],
    hazards: [
      { type: 'meteor', from: { x: 150, y: -12 }, to: { x: 172, y: 187 }, radius: 7, speed: 80, period: 5, phase: 0 },
      { type: 'meteor', from: { x: 262, y: -12 }, to: { x: 240, y: 190 }, radius: 7, speed: 80, period: 5, phase: 1.7 },
      { type: 'meteor', from: { x: 372, y: -12 }, to: { x: 328, y: 195 }, radius: 7, speed: 80, period: 5, phase: 3.4 },
    ],
  },
  {
    id: 'crater-3',
    version: 1,
    name: 'Panela de Pressão',
    world: 'crater',
    startFuelPct: 95,
    fuelGoalPct: 30,
    // Dois picos com um cânion entre eles; um cristal fica lá dentro.
    terrain: [
      pts(
        [0, 270], [0, 196], [28, 222], [96, 222], [112, 228], [150, 228], [170, 196],
        [206, 168], [232, 196], [246, 228], [284, 228], [300, 196], [330, 168], [362, 204],
        [380, 222], [444, 222], [480, 190], [480, 270],
      ),
    ],
    base: { x: 40, y: 220, width: 40 },
    goal: { x: 390, y: 220, width: 44 },
    crystals: pts([131, 150], [206, 136], [265, 170], [330, 136]),
    fuelCans: pts([265, 116]),
    hazards: [
      { type: 'geyser', x: 131, y: 228, width: 28, height: 100, on: 1.4, period: 4.5, phase: 0 },
      { type: 'geyser', x: 265, y: 228, width: 30, height: 100, on: 1.4, period: 4.5, phase: 2.2 },
      { type: 'meteor', from: { x: 250, y: -12 }, to: { x: 206, y: 168 }, radius: 7, speed: 85, period: 5, phase: 1 },
      { type: 'meteor', from: { x: 380, y: -12 }, to: { x: 330, y: 168 }, radius: 7, speed: 85, period: 5, phase: 3.5 },
    ],
  },
  {
    id: 'cave-1',
    version: 1,
    name: 'Compasso',
    world: 'cave',
    startFuelPct: 100,
    fuelGoalPct: 25,
    // Corredor entre teto e chão, com três lasers em ritmo.
    terrain: [
      pts(
        [0, 270], [0, 204], [20, 222], [96, 222], [130, 204], [180, 196], [240, 200],
        [300, 196], [350, 204], [384, 222], [460, 222], [480, 200], [480, 270],
      ),
      pts([110, 0], [370, 0], [356, 64], [300, 88], [240, 96], [180, 88], [124, 64]),
    ],
    base: { x: 36, y: 220, width: 40 },
    goal: { x: 400, y: 220, width: 44 },
    crystals: pts([120, 150], [200, 146], [280, 146]),
    fuelCans: [],
    hazards: [
      { type: 'laser', x: 159, y: 79, length: 120, direction: 'vertical', on: 1.2, period: 4, phase: 0 },
      { type: 'laser', x: 239, y: 96, length: 104, direction: 'vertical', on: 1.2, period: 4, phase: 2.7 },
      { type: 'laser', x: 319, y: 79, length: 120, direction: 'vertical', on: 1.2, period: 4, phase: 1.3 },
    ],
  },
  {
    id: 'cave-2',
    version: 1,
    name: 'Alvo Inquieto',
    world: 'cave',
    startFuelPct: 100,
    fuelGoalPct: 25,
    terrain: [
      pts(
        [0, 270], [0, 204], [20, 222], [92, 222], [120, 196], [160, 174], [200, 194],
        [236, 208], [270, 202], [300, 222], [480, 222], [480, 270],
      ),
      // Estalactite.
      pts([196, 0], [280, 0], [262, 64], [240, 106], [218, 64]),
    ],
    base: { x: 36, y: 220, width: 40 },
    goal: { x: 360, y: 220, width: 48, motion: { amplitude: 36, period: 12, phase: 0 } },
    crystals: pts([160, 142], [240, 150], [310, 150], [384, 140]),
    fuelCans: [],
    hazards: [],
  },
  {
    id: 'cave-3',
    version: 1,
    name: 'Pouso Crítico',
    world: 'cave',
    startFuelPct: 80,
    fuelGoalPct: 25,
    terrain: [
      pts(
        [0, 270], [0, 204], [20, 222], [88, 222], [104, 228], [140, 228], [160, 200],
        [196, 180], [232, 194], [262, 188], [296, 222], [480, 222], [480, 270],
      ),
      pts([170, 0], [300, 0], [288, 54], [240, 76], [186, 54]),
    ],
    base: { x: 36, y: 220, width: 40 },
    goal: { x: 370, y: 220, width: 48, motion: { amplitude: 30, period: 11, phase: 0 } },
    crystals: pts([122, 146], [196, 144], [264, 140], [316, 130], [420, 140]),
    fuelCans: pts([160, 130], [350, 150]),
    hazards: [
      { type: 'geyser', x: 122, y: 228, width: 28, height: 100, on: 1.4, period: 4.5, phase: 0 },
      { type: 'laser', x: 233, y: 74, length: 120, direction: 'vertical', on: 1.2, period: 4, phase: 1 },
      { type: 'meteor', from: { x: 470, y: -12 }, to: { x: 310, y: 222 }, radius: 7, speed: 80, period: 6, phase: 0 },
    ],
  },
];
