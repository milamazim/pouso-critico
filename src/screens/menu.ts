import { makeHint, type Hints } from '../input/device';

/** Cria um elemento com classe e texto. */
export function make<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls = '',
  text = '',
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (text) el.textContent = text;
  return el;
}

export function makeButton(text: string, onClick: () => void, cls = '', hint?: keyof Hints): HTMLButtonElement {
  const b = make('button', cls, text);
  if (hint) b.append(makeHint(hint));
  b.type = 'button';
  b.addEventListener('click', onClick);
  return b;
}

export type Direction = 'up' | 'down' | 'left' | 'right';

const ARROWS: Readonly<Record<string, Direction>> = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
};

/** Camada única que cobre o palco e mostra um menu por vez, navegável por setas e gamepad. */
export class Menu {
  private readonly root = make('section', 'menu');
  private onBack: (() => void) | undefined;

  constructor(stage: HTMLElement, private readonly sound: { move: () => void; select: () => void }) {
    this.root.hidden = true;
    // Na captura, antes que o clique troque de tela.
    this.root.addEventListener('click', (e) => {
      if ((e.target as Element).closest('button')) this.sound.select();
    }, true);
    stage.append(this.root);
    window.addEventListener('keydown', (e) => this.onKey(e));
  }

  get isOpen(): boolean {
    return !this.root.hidden;
  }

  /** `focus` é o botão que recebe o foco; sem ele, o primeiro disponível. */
  show(content: readonly HTMLElement[], opts: { label: string; onBack?: () => void; focus?: HTMLElement }): void {
    this.root.setAttribute('aria-label', opts.label);
    this.root.replaceChildren(...content);
    this.root.hidden = false;
    this.onBack = opts.onBack;
    (opts.focus ?? this.buttons()[0])?.focus();
  }

  hide(): void {
    this.root.hidden = true;
    this.root.replaceChildren();
    this.onBack = undefined;
  }

  back(): void {
    this.onBack?.();
  }

  /** Aciona o botão em foco; sem foco, só o escolhe. */
  activate(): void {
    const focused = this.buttons().find((b) => b === document.activeElement);
    if (focused) focused.click();
    else this.buttons()[0]?.focus();
  }

  private buttons(): HTMLButtonElement[] {
    return [...this.root.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
  }

  private onKey(e: KeyboardEvent): void {
    if (this.root.hidden || e.ctrlKey || e.altKey || e.metaKey) return;
    // Controles fora do menu, como os do painel, cuidam das próprias teclas.
    const target = e.target as Node | null;
    if (target !== document.body && !this.root.contains(target)) return;

    const direction = ARROWS[e.code];
    if (e.code === 'Escape' && !e.repeat && this.onBack) {
      e.preventDefault();
      this.onBack();
    } else if (direction) {
      e.preventDefault();
      this.move(direction);
    } else if (e.repeat && (e.code === 'Space' || e.code === 'Enter')) {
      // Tecla que já vinha pressionada do voo não deve acionar um botão.
      e.preventDefault();
    }
  }

  /** Leva o foco ao botão mais próximo na direção dada. */
  move(direction: Direction): void {
    const buttons = this.buttons();
    const current = buttons.find((b) => b === document.activeElement);
    if (!current) {
      buttons[0]?.focus();
      return;
    }
    const from = center(current);
    let best: HTMLButtonElement | undefined;
    let bestScore = Infinity;
    for (const b of buttons) {
      if (b === current) continue;
      const to = center(b);
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const horizontal = direction === 'left' || direction === 'right';
      const sign = direction === 'left' || direction === 'up' ? -1 : 1;
      const along = (horizontal ? dx : dy) * sign;
      const across = Math.abs(horizontal ? dy : dx);
      if (along < 2) continue;
      // Andar de lado só vale dentro da mesma linha.
      if (horizontal && across > current.offsetHeight / 2) continue;
      const score = along + across * 2;
      if (score < bestScore) {
        bestScore = score;
        best = b;
      }
    }
    if (!best) return;
    best.focus();
    this.sound.move();
  }
}

function center(el: HTMLElement): { x: number; y: number } {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}
