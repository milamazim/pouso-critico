import type { Commands } from '../sim/types';

type Action = keyof Commands;

/** Folga, em px CSS, para o dedo que escapa um pouco do botão. */
const SLOP = 16;

/** Botões na tela, com multitoque e troca de botão ao deslizar o dedo. */
export class TouchControls {
  private readonly root = document.createElement('div');
  private readonly pads: { readonly el: HTMLElement; readonly action: Action }[] = [];
  /** Botão sob cada dedo; indefinido se o dedo saiu de todos. */
  private readonly pointers = new Map<number, Action | undefined>();
  /** Toques mais curtos que um passo ainda valem por um passo. */
  private readonly tapped = new Set<Action>();

  constructor(parent: HTMLElement, on: { pause: () => void; restart: () => void }) {
    this.root.className = 'touch';
    this.root.hidden = true;

    const left = this.group('touch-left');
    this.pad(left, 'left', '◀', 'Motor para a esquerda');
    this.pad(left, 'right', '▶', 'Motor para a direita');
    this.pad(this.group('touch-right'), 'up', '▲', 'Motor principal');

    const top = this.group('touch-top');
    this.icon(top, '↻', 'Reiniciar', on.restart);
    this.icon(top, '❚❚', 'Pausar', on.pause);
    parent.append(this.root);

    window.addEventListener('pointermove', (e) => {
      if (this.pointers.has(e.pointerId)) this.track(e);
    });
    for (const type of ['pointerup', 'pointercancel'] as const) {
      window.addEventListener(type, (e) => {
        if (this.pointers.delete(e.pointerId)) this.highlight();
      });
    }
  }

  set visible(value: boolean) {
    if (this.root.hidden === !value) return;
    this.root.hidden = !value;
    if (!value) this.clear();
  }

  sample(): Commands {
    const commands: Commands = { up: false, left: false, right: false };
    for (const action of this.tapped) commands[action] = true;
    for (const action of this.pointers.values()) if (action) commands[action] = true;
    this.tapped.clear();
    return commands;
  }

  clear(): void {
    this.pointers.clear();
    this.tapped.clear();
    this.highlight();
  }

  private track(e: PointerEvent): void {
    const action = this.hit(e.clientX, e.clientY);
    const before = this.pointers.get(e.pointerId);
    this.pointers.set(e.pointerId, action);
    if (action && action !== before) this.tapped.add(action);
    this.highlight();
  }

  /** Botão mais próximo do ponto, dentro da folga. */
  private hit(x: number, y: number): Action | undefined {
    let best: Action | undefined;
    let bestDistance = SLOP;
    for (const { el, action } of this.pads) {
      const r = el.getBoundingClientRect();
      const dx = Math.max(r.left - x, 0, x - r.right);
      const dy = Math.max(r.top - y, 0, y - r.bottom);
      const distance = Math.hypot(dx, dy);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = action;
      }
    }
    return best;
  }

  private highlight(): void {
    const active = new Set(this.pointers.values());
    for (const { el, action } of this.pads) el.classList.toggle('active', active.has(action));
  }

  private group(cls: string): HTMLElement {
    const el = document.createElement('div');
    el.className = cls;
    this.root.append(el);
    return el;
  }

  private pad(parent: HTMLElement, action: Action, text: string, label: string): void {
    const el = document.createElement('div');
    el.className = 'touch-pad';
    el.textContent = text;
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', label);
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.pointers.set(e.pointerId, undefined);
      this.track(e);
    });
    parent.append(el);
    this.pads.push({ el, action });
  }

  private icon(parent: HTMLElement, text: string, label: string, onClick: () => void): void {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'touch-icon';
    b.textContent = text;
    b.setAttribute('aria-label', label);
    b.addEventListener('click', () => {
      // Devolve o teclado para a nave.
      b.blur();
      onClick();
    });
    parent.append(b);
  }
}
