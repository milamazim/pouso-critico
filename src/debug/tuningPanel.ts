import type { Level } from '../sim/level';
import type { PhysicsConfig, ShipSpec } from '../sim/types';

type NumericKey<T> = { [K in keyof T]: T[K] extends number ? K : never }[keyof T];

interface Field<K> {
  key: K;
  label: string;
  min: number;
  max: number;
  step: number;
}

const PHYSICS_FIELDS: readonly Field<NumericKey<PhysicsConfig>>[] = [
  { key: 'gravity', label: 'Gravidade', min: 2, max: 60, step: 1 },
  { key: 'maxSpeed', label: 'Velocidade máxima', min: 40, max: 140, step: 5 },
];

const SHIP_FIELDS: readonly Field<NumericKey<ShipSpec>>[] = [
  { key: 'mainThrust', label: 'Empuxo principal', min: 5, max: 120, step: 1 },
  { key: 'sideThrust', label: 'Empuxo lateral', min: 5, max: 80, step: 1 },
  { key: 'tank', label: 'Tanque', min: 20, max: 300, step: 5 },
  { key: 'mainBurn', label: 'Consumo principal', min: 0, max: 40, step: 0.5 },
  { key: 'sideBurn', label: 'Consumo lateral', min: 0, max: 20, step: 0.5 },
  { key: 'landingVy', label: 'Tolerância VY', min: 4, max: 60, step: 1 },
  { key: 'landingVx', label: 'Tolerância VX', min: 2, max: 40, step: 1 },
];

interface Options {
  levels: readonly Level[];
  ships: readonly ShipSpec[];
  physics: PhysicsConfig;
  onLevel: (index: number) => void;
  onShip: (index: number) => void;
  onChange: () => void;
  onTank: () => void;
  onRestore: () => void;
}

/** Painel que altera os objetos recebidos em tempo real. */
export class TuningPanel {
  constructor(private readonly root: HTMLElement, private readonly opts: Options) {}

  render(shipIndex: number, levelIndex: number): void {
    const { levels, ships, physics } = this.opts;
    const spec = ships[shipIndex];
    if (!spec) return;
    this.root.replaceChildren();

    const levelTabs = this.add('div', 'tabs');
    levels.forEach((level, i) => {
      const b = this.button(levelTabs, level.name, () => this.opts.onLevel(i));
      b.setAttribute('aria-pressed', String(i === levelIndex));
    });

    const tabs = this.add('div', 'tabs');
    ships.forEach((ship, i) => {
      const b = this.button(tabs, `${i + 1} ${ship.name}`, () => this.opts.onShip(i));
      b.setAttribute('aria-pressed', String(i === shipIndex));
    });

    this.add('h2', '', 'Mundo');
    for (const f of PHYSICS_FIELDS) {
      this.slider(f, physics[f.key], (v) => {
        physics[f.key] = v;
        this.opts.onChange();
      });
    }
    this.add('h2', '', 'Nave');
    for (const f of SHIP_FIELDS) {
      this.slider(f, spec[f.key], (v) => {
        spec[f.key] = v;
        this.opts.onChange();
        if (f.key === 'tank') this.opts.onTank();
      });
    }

    const actions = this.add('div', 'tabs');
    this.button(actions, 'Restaurar', () => this.opts.onRestore());
    const copy = this.button(actions, 'Copiar valores', () => {
      navigator.clipboard.writeText(JSON.stringify({ physics, ships }, null, 2)).then(
        () => { copy.textContent = 'Copiado'; },
        () => { copy.textContent = 'Falha ao copiar'; },
      );
    });

    this.add(
      'p',
      'help',
      'Setas ou WASD voam; Espaço sobe. R reinicia, Esc pausa e T mostra ou esconde o painel. Mudar o tanque reinicia o voo. Voos com valores alterados não contam para o progresso.',
    );
  }

  toggle(): void {
    this.root.hidden = !this.root.hidden;
  }

  private slider(f: Field<string>, initial: number, onChange: (v: number) => void): void {
    const label = this.add('label', '');
    const value = document.createElement('output');
    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(f.min);
    input.max = String(f.max);
    input.step = String(f.step);
    input.value = String(initial);
    value.textContent = input.value;
    input.addEventListener('input', () => {
      onChange(input.valueAsNumber);
      value.textContent = input.value;
    });
    // Com o mouse, devolve o teclado para a nave ao soltar.
    input.addEventListener('pointerup', () => input.blur());
    label.append(f.label, value, input);
  }

  private button(parent: HTMLElement, text: string, onClick: () => void): HTMLButtonElement {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = text;
    b.addEventListener('click', () => {
      onClick();
      b.blur();
    });
    parent.append(b);
    return b;
  }

  private add(tag: string, cls: string, text = ''): HTMLElement {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    el.textContent = text;
    this.root.append(el);
    return el;
  }
}
