import { NO_COMMANDS, type Commands } from '../sim/types';

/** Parte do `Gamepad` do navegador usada aqui. */
export interface PadSnapshot {
  readonly index: number;
  readonly connected: boolean;
  readonly axes: readonly number[];
  readonly buttons: readonly { readonly pressed: boolean; readonly value: number }[];
}

export type PadAction = 'a' | 'b' | 'y' | 'start' | 'up' | 'down' | 'left' | 'right';

export const DEAD_ZONE = 0.35;

// Índices do mapeamento padrão da Gamepad API.
const A = 0;
const B = 1;
const Y = 3;
const RT = 7;
const START = 9;
const DPAD = { up: 12, down: 13, left: 14, right: 15 } as const;

const isDown = (pad: PadSnapshot, index: number): boolean => {
  const b = pad.buttons[index];
  return b !== undefined && (b.pressed || b.value > 0.5);
};

/** Comandos de voo; entradas analógicas viram digitais. */
export function padCommands(pad: PadSnapshot): Commands {
  const x = pad.axes[0] ?? 0;
  return {
    up: isDown(pad, A) || isDown(pad, RT),
    left: isDown(pad, DPAD.left) || x < -DEAD_ZONE,
    right: isDown(pad, DPAD.right) || x > DEAD_ZONE,
  };
}

/** Ações de menu pressionadas neste instante. */
export function padActions(pad: PadSnapshot): Set<PadAction> {
  const x = pad.axes[0] ?? 0;
  const y = pad.axes[1] ?? 0;
  const down: [PadAction, boolean][] = [
    ['a', isDown(pad, A)],
    ['b', isDown(pad, B)],
    ['y', isDown(pad, Y)],
    ['start', isDown(pad, START)],
    ['up', isDown(pad, DPAD.up) || y < -DEAD_ZONE],
    ['down', isDown(pad, DPAD.down) || y > DEAD_ZONE],
    ['left', isDown(pad, DPAD.left) || x < -DEAD_ZONE],
    ['right', isDown(pad, DPAD.right) || x > DEAD_ZONE],
  ];
  return new Set(down.filter(([, on]) => on).map(([action]) => action));
}

/** Lê o controle a cada quadro. Vale o último controle que teve atividade. */
export class GamepadInput {
  private commands: Commands = { ...NO_COMMANDS };
  private previous = new Set<PadAction>();
  private active: number | undefined;
  /** Botões que vinham de um menu não pilotam a nave até serem soltos. */
  private waitNeutral = false;

  constructor(
    private readonly read: () => readonly (PadSnapshot | null)[],
    private readonly on: {
      press: (action: PadAction) => void;
      activity: () => void;
      disconnect: () => void;
    },
  ) {}

  poll(): void {
    const pads = this.read().filter((p): p is PadSnapshot => p !== null && p.connected);
    if (this.active !== undefined && !pads.some((p) => p.index === this.active)) {
      this.active = undefined;
      this.commands = { ...NO_COMMANDS };
      this.previous.clear();
      this.on.disconnect();
      return;
    }

    const busy = pads.find((p) => isBusy(p));
    if (busy) {
      if (busy.index !== this.active) this.previous.clear();
      this.active = busy.index;
      this.on.activity();
    }
    const pad = pads.find((p) => p.index === this.active);
    if (!pad) return;

    const actions = padActions(pad);
    const commands = padCommands(pad);
    const neutral = !commands.up && !commands.left && !commands.right;
    if (neutral) this.waitNeutral = false;
    this.commands = this.waitNeutral ? { ...NO_COMMANDS } : commands;

    const fresh = [...actions].filter((a) => !this.previous.has(a));
    this.previous = actions;
    for (const action of fresh) this.on.press(action);
  }

  sample(): Commands {
    return { ...this.commands };
  }

  clear(): void {
    this.commands = { ...NO_COMMANDS };
    this.waitNeutral = true;
  }
}

function isBusy(pad: PadSnapshot): boolean {
  const { up, left, right } = padCommands(pad);
  return up || left || right || padActions(pad).size > 0;
}
