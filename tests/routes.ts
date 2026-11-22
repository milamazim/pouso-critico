import { DEFAULT_PHYSICS } from '../src/data/physics';
import { Attempt } from '../src/sim/attempt';
import type { Level, Point } from '../src/sim/level';
import type { LandingResult } from '../src/sim/stars';
import type { ShipSpec } from '../src/sim/types';
import { fly, onPad } from './pilot';

type Pairs = readonly (readonly [number, number])[];

/** Depois de subir da base, pontos de passagem sem e com os cristais. */
const ROUTES: Readonly<Record<string, { direct: Pairs; crystals: Pairs }>> = {
  'plain-1': { direct: [[240, 122]], crystals: [[240, 120]] },
  'plain-2': { direct: [[250, 166]], crystals: [[160, 160], [300, 160]] },
  'plain-3': { direct: [[168, 126], [312, 118]], crystals: [[168, 126], [240, 156], [312, 114]] },
  'plain-4': { direct: [[160, 150], [280, 130]], crystals: [[110, 166], [160, 150], [220, 140], [280, 128], [320, 110]] },
  'crater-1': { direct: [[240, 140]], crystals: [[145, 148], [240, 134], [333, 146]] },
  'crater-2': { direct: [[240, 150]], crystals: [[165, 142], [240, 134], [315, 140]] },
  'crater-3': { direct: [[206, 136], [265, 118], [330, 136]], crystals: [[131, 146], [206, 136], [265, 164], [265, 122], [330, 136]] },
  'cave-1': { direct: [[240, 146]], crystals: [[120, 150], [200, 146], [280, 146]] },
  'cave-2': { direct: [[160, 144], [240, 150]], crystals: [[160, 142], [240, 150], [310, 150], [372, 142]] },
  'cave-3': { direct: [[160, 134], [240, 130]], crystals: [[122, 142], [160, 134], [196, 142], [264, 138], [316, 132], [350, 148], [420, 140]] },
};

export interface Flight {
  readonly result: LandingResult;
  readonly wait: number;
  readonly cruise: number;
}

/** Pousos obtidos variando a espera na base e a velocidade, calculados sob demanda. */
export function* flights(level: Level, ship: Readonly<ShipSpec>, kind: 'direct' | 'crystals'): Generator<Flight> {
  const pairs = ROUTES[level.id]?.[kind];
  if (!pairs) throw new Error(`Sem rota para ${level.id}`);
  const points: Point[] = pairs.map(([x, y]) => ({ x, y }));
  const climb = { x: onPad(level.base).x, y: points[0]!.y };
  const waits = level.hazards.length > 0 ? [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5] : [0];
  for (const wait of waits) {
    for (const cruise of [25, 30, 35, 40, 45, 50, 55, 60]) {
      const sim = new Attempt(level, { ...ship }, { ...DEFAULT_PHYSICS });
      fly(sim, [climb, ...points], cruise, wait);
      if (sim.lastOutcome?.type === 'landed') yield { result: sim.lastOutcome.result, wait, cruise };
    }
  }
}

/** Para no primeiro voo que atende à condição. */
export function canFly(
  level: Level,
  ship: Readonly<ShipSpec>,
  kind: 'direct' | 'crystals',
  accept: (result: LandingResult) => boolean,
): boolean {
  for (const flight of flights(level, ship, kind)) if (accept(flight.result)) return true;
  return false;
}
