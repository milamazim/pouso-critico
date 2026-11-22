import type { Commands } from '../sim/types';

type Action = keyof Commands;

const FLIGHT_KEYS: Readonly<Record<string, Action>> = {
  ArrowUp: 'up', KeyW: 'up', Space: 'up',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
};

export class Keyboard {
  private readonly held = new Set<string>();
  /** Toques mais curtos que um passo ainda valem por um passo. */
  private readonly tapped = new Set<Action>();

  constructor(private readonly onKey: (code: string) => void) {
    window.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      // Ajustar um controle do painel não pode pilotar a nave.
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLButtonElement) return;
      const action = FLIGHT_KEYS[e.code];
      if (action) {
        e.preventDefault();
        if (!e.repeat) {
          this.tapped.add(action);
          this.held.add(e.code);
        }
      } else if (!e.repeat) {
        this.onKey(e.code);
      }
    });
    // Soltar sempre conta, mesmo com o foco em outro elemento.
    window.addEventListener('keyup', (e) => this.held.delete(e.code));
  }

  sample(): Commands {
    const commands: Commands = { up: false, left: false, right: false };
    for (const action of this.tapped) commands[action] = true;
    for (const code of this.held) {
      const action = FLIGHT_KEYS[code];
      if (action) commands[action] = true;
    }
    this.tapped.clear();
    return commands;
  }

  clear(): void {
    this.held.clear();
    this.tapped.clear();
  }
}
