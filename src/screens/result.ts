import { fmt, fmtPct, fmtTime, star, starBox } from '../render/format';
import type { Level } from '../sim/level';
import { countStars, type LandingResult, type RecordUpdate } from '../sim/stars';

/** Tela de resultado exibida após o pouso. */
export class ResultScreen {
  private readonly root: HTMLElement;

  constructor(stage: HTMLElement, private readonly onReplay: () => void) {
    this.root = document.createElement('section');
    this.root.className = 'result';
    this.root.setAttribute('aria-label', 'Resultado');
    this.root.setAttribute('aria-live', 'polite');
    this.root.hidden = true;
    stage.append(this.root);
  }

  show(level: Level, touch: { vx: number; vy: number }, result: LandingResult, update: RecordUpdate): void {
    const { stars } = result;
    const total = level.crystals.length;
    this.root.replaceChildren();

    this.line('h2', `Pouso concluído: ${level.name}`);
    this.line('p', star(stars.landing) + star(stars.crystals) + star(stars.fuel), 'stars')
      .setAttribute('aria-label', `${countStars(stars)} de 3 estrelas neste voo`);

    this.goal('Pouso', stars.landing, update.newStars.landing, update.record.stars.landing);
    this.goal(
      `Coleta: ${result.crystals}/${total}`,
      stars.crystals, update.newStars.crystals, update.record.stars.crystals,
    );
    this.goal(
      `Economia: ${fmtPct(result.fuelPct)} (meta ${level.fuelGoalPct}%)`,
      stars.fuel, update.newStars.fuel, update.record.stars.fuel,
    );

    const { bestTimeMs = result.timeMs, bestFuelPct = result.fuelPct } = update.record;
    this.line('p', `Tempo ${fmtTime(result.timeMs)} · ${update.newTime ? 'NOVO RECORDE' : `recorde ${fmtTime(bestTimeMs)}`}`, 'gap');
    this.line('p', `Combustível ${fmtPct(result.fuelPct)} · ${update.newFuel ? 'NOVO RECORDE' : `recorde ${fmtPct(bestFuelPct)}`}`);
    this.line('p', `Toque: VX ${fmt(Math.abs(touch.vx))} · VY ${fmt(touch.vy)}`);

    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Jogar de novo (Enter)';
    button.addEventListener('click', () => {
      // Devolve o teclado para a nave.
      button.blur();
      this.onReplay();
    });
    this.root.append(button);
    this.root.hidden = false;
  }

  hide(): void {
    this.root.hidden = true;
  }

  private goal(text: string, earned: boolean, isNew: boolean, owned: boolean): void {
    let note = '';
    if (isNew) note = ' · nova!';
    else if (!earned && owned) note = ' · já conquistada antes';
    this.line('p', `${starBox(earned)} ${text}${note}`, earned ? 'ok' : '');
  }

  private line(tag: string, text: string, cls = ''): HTMLElement {
    const el = document.createElement(tag);
    el.textContent = text;
    if (cls) el.className = cls;
    this.root.append(el);
    return el;
  }
}
