/** Última forma de entrada usada; define as dicas e os controles na tela. */
export type Device = 'keyboard' | 'touch' | 'gamepad';

export interface Hints {
  /** Antes do voo. */
  readonly fly: string;
  /** Na tela de título. */
  readonly title: string;
  /** Sufixos dos botões; vazio se não houver atalho. */
  readonly next: string;
  readonly replay: string;
  readonly back: string;
  readonly ghost: string;
}

export const HINTS: Readonly<Record<Device, Hints>> = {
  keyboard: {
    fly: '↑ decola · ← → desviam',
    title: '↑ motor principal · ← → motores laterais · R reinicia · Esc pausa',
    next: ' (Enter)',
    replay: ' (R)',
    back: ' (Esc)',
    ghost: ' (G)',
  },
  touch: {
    fly: '▲ decola · ◀ ▶ desviam',
    title: '▲ motor principal · ◀ ▶ motores laterais',
    next: '',
    replay: '',
    back: '',
    ghost: '',
  },
  gamepad: {
    fly: 'A ou RT decola · direcional desvia',
    title: 'A ou RT motor principal · direcional motores laterais · Y reinicia · Start pausa',
    next: ' (A)',
    replay: ' (Y)',
    back: ' (B)',
    ghost: ' (Select)',
  },
};

let current: Device = 'keyboard';

export const currentDevice = (): Device => current;

/** Troca as dicas já visíveis sem recriar os botões, para não perder cliques em andamento. */
export function setDevice(device: Device): void {
  if (device === current) return;
  current = device;
  document.body.dataset.device = device;
  for (const el of document.querySelectorAll<HTMLElement>('[data-hint]')) {
    el.textContent = HINTS[device][el.dataset.hint as keyof Hints];
  }
}

/** Trecho de texto que acompanha a forma de entrada. */
export function makeHint(key: keyof Hints): HTMLElement {
  const el = document.createElement('span');
  el.dataset.hint = key;
  el.textContent = HINTS[current][key];
  return el;
}
