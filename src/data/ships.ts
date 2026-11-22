import type { ShipSpec } from '../sim/types';

export const SHIPS: readonly Readonly<ShipSpec>[] = [
  {
    // Equilibrada: referência para as outras duas e para as metas das fases.
    id: 'vagalume', name: 'Vaga-lume', unlockStars: 0,
    mainThrust: 45, sideThrust: 22, tank: 100, mainBurn: 9, sideBurn: 3,
    landingVy: 20, landingVx: 10,
  },
  {
    // Pesada: precisa frear cedo, mas perdoa o toque.
    id: 'besouro', name: 'Besouro', unlockStars: 10,
    mainThrust: 32, sideThrust: 13, tank: 180, mainBurn: 9, sideBurn: 3,
    landingVy: 30, landingVx: 15,
  },
  {
    // Ágil: freia em cima da hora, mas exige um toque preciso.
    id: 'libelula', name: 'Libélula', unlockStars: 20,
    mainThrust: 75, sideThrust: 48, tank: 60, mainBurn: 10.5, sideBurn: 4.5,
    landingVy: 14, landingVx: 7,
  },
];
