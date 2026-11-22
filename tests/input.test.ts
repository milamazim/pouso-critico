import { beforeEach, describe, expect, it } from 'vitest';
import { GamepadInput, padActions, padCommands, type PadAction, type PadSnapshot } from '../src/input/gamepad';
import { chooseScale } from '../src/render/stage';
import { NO_COMMANDS } from '../src/sim/types';

function pad(opts: { buttons?: number[]; axes?: number[]; index?: number; trigger?: number } = {}): PadSnapshot {
  return {
    index: opts.index ?? 0,
    connected: true,
    axes: opts.axes ?? [0, 0],
    buttons: Array.from({ length: 16 }, (_, i) => {
      const pressed = opts.buttons?.includes(i) ?? false;
      return { pressed, value: i === 7 ? (opts.trigger ?? Number(pressed)) : Number(pressed) };
    }),
  };
}

describe('padCommands', () => {
  it.each([
    ['nada', {}, {}],
    ['A', { buttons: [0] }, { up: true }],
    ['RT pela metade', { trigger: 0.6 }, { up: true }],
    ['RT de leve', { trigger: 0.3 }, {}],
    ['direcional esquerdo', { buttons: [14] }, { left: true }],
    ['direcional direito', { buttons: [15] }, { right: true }],
    ['analógico na zona morta', { axes: [0.35, 0] }, {}],
    ['analógico à direita', { axes: [0.36, 0] }, { right: true }],
    ['analógico à esquerda', { axes: [-0.9, 0] }, { left: true }],
    ['analógico para cima não é motor', { axes: [0, -1] }, {}],
    ['A e esquerda juntos', { buttons: [0], axes: [-1, 0] }, { up: true, left: true }],
  ])('%s', (_, state, expected) => {
    expect(padCommands(pad(state))).toEqual({ ...NO_COMMANDS, ...expected });
  });

  it('suporta controles com poucos botões', () => {
    const tiny = { index: 0, connected: true, axes: [], buttons: [] };
    expect(padCommands(tiny)).toEqual(NO_COMMANDS);
    expect(padActions(tiny).size).toBe(0);
  });
});

describe('GamepadInput', () => {
  let pads: (PadSnapshot | null)[];
  let presses: PadAction[];
  let activity: number;
  let disconnects: number;
  let input: GamepadInput;

  beforeEach(() => {
    pads = [null];
    presses = [];
    activity = 0;
    disconnects = 0;
    input = new GamepadInput(() => pads, {
      press: (a) => presses.push(a),
      activity: () => { activity++; },
      disconnect: () => { disconnects++; },
    });
  });

  function poll(next: PadSnapshot | null): void {
    pads = [next];
    input.poll();
  }

  it('avisa cada botão uma vez, até ser solto', () => {
    poll(pad({ buttons: [0] }));
    poll(pad({ buttons: [0] }));
    expect(presses).toEqual(['a']);
    poll(pad());
    poll(pad({ buttons: [0] }));
    expect(presses).toEqual(['a', 'a']);
  });

  it('um controle parado não toma o lugar de outra entrada', () => {
    poll(pad());
    expect(activity).toBe(0);
    poll(pad({ axes: [0.1, 0.1] }));
    expect(activity).toBe(0);
    poll(pad({ buttons: [15] }));
    expect(activity).toBe(1);
  });

  it('após limpar, ignora o que estava pressionado até soltar', () => {
    poll(pad({ buttons: [0] }));
    expect(input.sample().up).toBe(true);
    input.clear();
    poll(pad({ buttons: [0] }));
    expect(input.sample()).toEqual(NO_COMMANDS);
    poll(pad());
    poll(pad({ buttons: [0] }));
    expect(input.sample().up).toBe(true);
  });

  it('desconectar solta os comandos e avisa uma vez', () => {
    poll(pad({ buttons: [0] }));
    poll(null);
    poll(null);
    expect(input.sample()).toEqual(NO_COMMANDS);
    expect(disconnects).toBe(1);
  });

  it('usa o controle com atividade mais recente', () => {
    pads = [pad({ index: 0 }), pad({ index: 1, buttons: [14] })];
    input.poll();
    expect(input.sample().left).toBe(true);
    pads = [pad({ index: 0, buttons: [15] }), pad({ index: 1 })];
    input.poll();
    expect(input.sample()).toEqual({ ...NO_COMMANDS, right: true });
  });
});

describe('chooseScale', () => {
  it.each([
    ['tela cheia 1080p', 1920, 1080, 4],
    ['janela 1080p', 1920, 950, 3],
    ['notebook', 1366, 650, 2],
    ['tamanho exato', 480, 270, 1],
  ])('%s usa escala inteira', (_, w, h, scale) => {
    expect(chooseScale(w, h)).toBe(scale);
  });

  it.each([
    ['janela estreita', 929, 917, 929 / 480],
    ['celular 667×375 em 2x', 1334, 750, 750 / 270],
    ['menor que a tela lógica', 400, 300, 400 / 480],
  ])('%s usa fração', (_, w, h, scale) => {
    expect(chooseScale(w, h)).toBeCloseTo(scale);
  });
});
