import { fmt, fmtPct, fmtTime, starBox, starLine } from '../render/format';
import type { Level } from '../sim/level';
import { countStars, type LandingResult, type RecordUpdate } from '../sim/stars';
import { make, makeButton } from './menu';

export interface ResultInfo {
  readonly level: Level;
  readonly touch: { readonly vx: number; readonly vy: number };
  readonly result: LandingResult;
  /** Ausente em voos que não contam para o progresso. */
  readonly update?: RecordUpdate;
  /** Avisos extras: nave liberada, campanha concluída, falha ao salvar. */
  readonly notes: readonly string[];
  /** Ausente se não houver próxima fase. */
  readonly onNext?: () => void;
}

/**
 * Tela de resultado exibida após o pouso. Nenhum botão recebe o foco, porque
 * o jogador ainda pode estar segurando Espaço; Enter, R e Esc são tratados fora.
 */
export class ResultScreen {
  private readonly root = make('section', 'result');

  constructor(
    stage: HTMLElement,
    private readonly actions: { onReplay: () => void; onLevels: () => void },
  ) {
    this.root.setAttribute('aria-label', 'Resultado');
    this.root.setAttribute('aria-live', 'polite');
    this.root.hidden = true;
    stage.append(this.root);
  }

  show({ level, touch, result, update, notes, onNext }: ResultInfo): void {
    const { stars } = result;
    this.root.replaceChildren();

    this.line('h2', `Pouso concluído: ${level.name}`);
    // Só as conquistas deste voo: três estrelas exigem tudo na mesma jogada.
    const count = countStars(stars);
    this.line('p', starLine(count).join(''), 'stars').setAttribute('aria-label', `${count} de 3 estrelas`);
    if (update) {
      const best = countStars(update.record.stars);
      // No primeiro pouso não há marca anterior a superar.
      if (update.newStars && !update.firstLanding) this.line('p', 'NOVO RECORDE DE ESTRELAS', 'note');
      else if (best > count) this.line('p', `melhor voo: ${starLine(best).join('')}`, 'note');
    }

    this.goal('Pouso', stars.landing);
    this.goal(`Coleta: ${result.crystals}/${level.crystals.length}`, stars.crystals);
    this.goal(`Economia: ${fmtPct(result.fuelPct)} (meta ${level.fuelGoalPct}%)`, stars.fuel);

    let time = `Tempo ${fmtTime(result.timeMs)}`;
    let fuel = `Combustível ${fmtPct(result.fuelPct)}`;
    if (update) {
      const { bestTimeMs = result.timeMs, bestFuelPct = result.fuelPct } = update.record;
      time += ` · ${update.newTime ? 'NOVO RECORDE' : `recorde ${fmtTime(bestTimeMs)}`}`;
      fuel += ` · ${update.newFuel ? 'NOVO RECORDE' : `recorde ${fmtPct(bestFuelPct)}`}`;
    }
    this.line('p', time, 'gap');
    this.line('p', fuel);
    this.line('p', `Toque: VX ${fmt(Math.abs(touch.vx))} · VY ${fmt(touch.vy)}`);
    for (const note of notes) this.line('p', note, 'note');

    const row = make('div', 'row');
    if (onNext) row.append(makeButton('Próxima fase', onNext, '', 'next'));
    row.append(
      makeButton('Repetir', this.actions.onReplay, '', onNext ? 'replay' : 'next'),
      makeButton('Fases', this.actions.onLevels, '', 'back'),
    );
    this.root.append(row);
    this.root.hidden = false;
  }

  hide(): void {
    // Remover os botões devolve o foco, e com ele o teclado, para a página.
    this.root.hidden = true;
    this.root.replaceChildren();
  }

  private goal(text: string, earned: boolean): void {
    this.line('p', `${starBox(earned)} ${text}`, earned ? 'ok' : '');
  }

  private line(tag: 'h2' | 'p', text: string, cls = ''): HTMLElement {
    const el = make(tag, cls, text);
    this.root.append(el);
    return el;
  }
}
