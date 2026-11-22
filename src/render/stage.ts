import { SCREEN_H, SCREEN_W } from '../data/physics';

/** Abaixo deste aproveitamento, a escala inteira desperdiça tela demais. */
const MIN_USE = 0.75;

/**
 * Escala em pixels físicos. Prefere um número inteiro, que deixa os pixels
 * uniformes, e aceita fração quando o inteiro deixaria o jogo pequeno demais.
 */
export function chooseScale(width: number, height: number): number {
  const raw = Math.min(width / SCREEN_W, height / SCREEN_H);
  const whole = Math.floor(raw);
  return whole / raw >= MIN_USE ? whole : raw;
}

/** Lado de um pixel da fonte, em pixels físicos inteiros e nunca menor que 1 px CSS. */
export function fontPixel(scale: number, dpr: number): number {
  return Math.max(Math.round(dpr), Math.round(scale * 0.8));
}

/** Ajusta o palco ao espaço disponível. */
export function fitStage(stage: HTMLElement, container: HTMLElement): void {
  const fit = (): void => {
    if (container.clientWidth === 0 || container.clientHeight === 0) return;
    const dpr = window.devicePixelRatio || 1;
    const scale = chooseScale(container.clientWidth * dpr, container.clientHeight * dpr) / dpr;
    stage.style.width = `${SCREEN_W * scale}px`;
    stage.style.height = `${SCREEN_H * scale}px`;
    stage.style.setProperty('--px', `${scale}px`);
    stage.style.setProperty('--fp', `${fontPixel(scale * dpr, dpr) / dpr}px`);
  };
  new ResizeObserver(fit).observe(container);
  window.addEventListener('resize', fit);
  fit();
}
