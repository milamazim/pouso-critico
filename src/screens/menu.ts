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

export function makeButton(text: string, onClick: () => void, cls = ''): HTMLButtonElement {
  const b = make('button', cls, text);
  b.type = 'button';
  b.addEventListener('click', onClick);
  return b;
}

type Arrow = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight';
const ARROWS: readonly string[] = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

/** Camada única que cobre o palco e mostra um menu por vez, navegável por setas. */
export class Menu {
  private readonly root = make('section', 'menu');
  private onBack: (() => void) | undefined;

  constructor(stage: HTMLElement) {
    this.root.hidden = true;
    stage.append(this.root);
    window.addEventListener('keydown', (e) => this.onKey(e));
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

  private buttons(): HTMLButtonElement[] {
    return [...this.root.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
  }

  private onKey(e: KeyboardEvent): void {
    if (this.root.hidden || e.ctrlKey || e.altKey || e.metaKey) return;
    // Controles fora do menu, como os do painel, cuidam das próprias teclas.
    const target = e.target as Node | null;
    if (target !== document.body && !this.root.contains(target)) return;

    if (e.code === 'Escape' && !e.repeat && this.onBack) {
      e.preventDefault();
      this.onBack();
    } else if (ARROWS.includes(e.code)) {
      e.preventDefault();
      this.move(e.code as Arrow);
    } else if (e.repeat && (e.code === 'Space' || e.code === 'Enter')) {
      // Tecla que já vinha pressionada do voo não deve acionar um botão.
      e.preventDefault();
    }
  }

  /** Leva o foco ao botão mais próximo na direção da seta. */
  private move(arrow: Arrow): void {
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
      const horizontal = arrow === 'ArrowLeft' || arrow === 'ArrowRight';
      const sign = arrow === 'ArrowLeft' || arrow === 'ArrowUp' ? -1 : 1;
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
    best?.focus();
  }
}

function center(el: HTMLElement): { x: number; y: number } {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}
