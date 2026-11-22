import { SCREEN_H, SCREEN_W } from '../data/physics';

/**
 * Ajusta o palco ao espaço disponível, com escala inteira em pixels físicos
 * sempre que couber (fracionária só em telas menores que 480 × 270).
 */
export function fitStage(stage: HTMLElement, container: HTMLElement): void {
  const fit = (): void => {
    const dpr = window.devicePixelRatio || 1;
    const raw = Math.min(
      (container.clientWidth * dpr) / SCREEN_W,
      (container.clientHeight * dpr) / SCREEN_H,
    );
    const scale = (raw >= 1 ? Math.floor(raw) : raw) / dpr;
    stage.style.width = `${SCREEN_W * scale}px`;
    stage.style.height = `${SCREEN_H * scale}px`;
    stage.style.setProperty('--px', `${scale}px`);
  };
  new ResizeObserver(fit).observe(container);
  window.addEventListener('resize', fit);
  fit();
}
