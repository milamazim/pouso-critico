import { FixedStep } from './fixedStep';

/** Liga o passo fixo ao requestAnimationFrame. */
export function startLoop(opts: {
  step: () => void;
  render: (alpha: number) => void;
  isPaused: () => boolean;
}): void {
  const fixed = new FixedStep(opts.step);
  let last: number | undefined;

  const frame = (now: number): void => {
    if (opts.isPaused()) {
      // O tempo parado não pode virar passos ao retomar.
      fixed.reset();
      opts.render(1);
    } else {
      opts.render(fixed.advance(last === undefined ? 0 : (now - last) / 1000));
    }
    last = now;
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
