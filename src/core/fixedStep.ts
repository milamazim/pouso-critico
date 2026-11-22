/** Passo fixo da simulação, em segundos. */
export const DT = 1 / 60;

/** Atraso máximo aceito por quadro; evita a "espiral da morte" após travadas. */
export const MAX_FRAME_DELAY = 0.25;

// Tolerância para que somas de ponto flutuante (ex.: 2 × 1/120) completem um passo.
const EPSILON = 1e-9;

/**
 * Acumulador de tempo: converte quadros de duração variável em passos fixos.
 * Não conhece relógio nem DOM, por isso pode ser testado diretamente.
 */
export class FixedStep {
  private accumulator = 0;

  constructor(private readonly step: () => void) {}

  /** Consome o tempo do quadro e devolve a fração (0–1) do próximo passo. */
  advance(frameSeconds: number): number {
    this.accumulator += Math.min(Math.max(frameSeconds, 0), MAX_FRAME_DELAY);
    while (this.accumulator >= DT - EPSILON) {
      this.accumulator -= DT;
      this.step();
    }
    return Math.max(this.accumulator, 0) / DT;
  }

  reset(): void {
    this.accumulator = 0;
  }
}
