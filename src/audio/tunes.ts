/** Músicas originais, em notação textual. Cada compasso tem 8 colcheias. */
export interface Tune {
  readonly bpm: number;
  /** Nota (`A4`, `F#5`), `-` prolonga, `.` é pausa. */
  readonly lead: string;
  /** Um acorde por compasso: fundamental e qualidade (`Am`, `F`). */
  readonly chords: string;
  /** Passos do baixo no compasso: número é o intervalo em semitons; `.` é pausa. */
  readonly bass: string;
  /** Passos de percussão no compasso: `k` bumbo, `h` chimbal, `.` pausa. */
  readonly drums: string;
  readonly leadWave: OscillatorType;
  /** Volumes relativos de melodia, arpejo e baixo. */
  readonly mix: readonly [lead: number, arp: number, bass: number];
}

export type TuneId = 'menu' | 'plain' | 'crater' | 'cave';

export const TUNES: Readonly<Record<TuneId, Tune>> = {
  // Calmo e convidativo.
  menu: {
    bpm: 92,
    lead: `
      E5 - . C5 D5 - . .  | C5 - A4 - . . G4 .  | A4 - C5 - E5 - D5 C5 | D5 - - - B4 - . .
      E5 - . G5 A5 - . .  | G5 - E5 - . . D5 .  | C5 - D5 - E5 - C5 A4 | A4 - - - . . . .`,
    chords: 'Am F C G Am C F Am',
    bass: '0 . . 0 7 . 0 .',
    drums: 'k . h . k . h .',
    leadWave: 'triangle',
    mix: [0.5, 0.16, 0.45],
  },
  // Curioso, com passos largos.
  plain: {
    bpm: 108,
    lead: `
      G4 . C5 . D5 - E5 . | . E5 D5 . C5 - . .  | A4 . D5 . F#5 - E5 . | . D5 - . B4 - . .
      G4 . C5 . E5 - G5 . | . F#5 E5 . D5 - . . | C5 . B4 . A4 . C5 .  | D5 - - - . . G4 .
      E5 - . E5 G5 . E5 . | D5 - . D5 F#5 . D5 . | C5 . E5 . G5 - E5 C5 | D5 - - . B4 . . .
      E5 - . E5 A5 . G5 . | F#5 - . D5 A5 . F#5 . | G5 . E5 . C5 . D5 .  | C5 - - - . . . .`,
    chords: 'C C D G C D Am D C D C G Am D C C',
    bass: '0 . 0 . 7 . 5 .',
    drums: 'k . h h k . h .',
    leadWave: 'square',
    mix: [0.2, 0.12, 0.45],
  },
  // Tenso, com baixo insistente.
  crater: {
    bpm: 126,
    lead: `
      D5 . . D5 D#5 . D5 . | C5 . A4 . . . . .   | D5 . . F5 G5 . F5 . | D#5 . D5 . . . C5 .
      D5 . . D5 A5 . G5 .  | F5 . D5 . . . F5 .  | G5 . F5 . D#5 . D5 . | D5 - - - . . . .
      A4 . C5 . D5 . F5 .  | G5 - . F5 D5 . . .  | A#4 . D5 . F5 . A5 . | G5 - . F5 D#5 . . .
      A5 . G5 . F5 . D5 .  | F5 . D5 . C5 . A4 . | A#4 . C5 . D5 . D#5 . | D5 - - - . . . .`,
    chords: 'Dm Dm Gm D# Dm Dm D# Dm Dm Gm A# D# Dm F A# Dm',
    bass: '0 0 . 0 0 . 3 1',
    drums: 'k . h k k . h h',
    leadWave: 'square',
    mix: [0.18, 0.1, 0.5],
  },
  // Espaçado e frio.
  cave: {
    bpm: 84,
    lead: `
      B4 - - - E5 - - .   | F#5 - - - . . G5 .  | E5 - - - D5 - . .   | B4 - - - . . . .
      G4 - - - B4 - - .   | C5 - - - . . D5 .   | B4 - - - A4 - . .   | E4 - - - . . . .
      E5 - . . G5 - . .   | F#5 - . . D5 - . .  | E5 - . . C5 - . .   | B4 - - - . . . .
      C5 - . . E5 - . .   | D5 - . . B4 - . .   | A4 - . . F#4 - . .  | E4 - - - - - . .`,
    chords: 'Em Bm C Bm Em C Am Em Em D C Bm C G Bm Em',
    bass: '0 . . . 7 . . .',
    drums: 'k . . . h . . .',
    leadWave: 'triangle',
    mix: [0.5, 0.2, 0.4],
  },
};

export const STEPS_PER_BAR = 8;

const SEMITONES: Readonly<Record<string, number>> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** Número MIDI de uma nota como `F#5`. */
export function noteNumber(name: string): number {
  const match = /^([A-G])(#?)(\d)$/.exec(name);
  if (!match) throw new Error(`Nota inválida: ${name}`);
  return SEMITONES[match[1]!]! + (match[2] ? 1 : 0) + (Number(match[3]) + 1) * 12;
}

export const frequency = (midi: number): number => 440 * 2 ** ((midi - 69) / 12);

export interface LeadNote {
  readonly midi: number;
  /** Duração em passos. */
  readonly steps: number;
}

export interface Score {
  /** Passos até repetir. */
  readonly length: number;
  readonly stepSeconds: number;
  readonly lead: ReadonlyMap<number, LeadNote>;
  readonly bass: ReadonlyMap<number, number>;
  /** Duas notas por passo. */
  readonly arp: readonly (readonly [number, number])[];
  readonly drums: ReadonlyMap<number, 'k' | 'h'>;
}

const tokens = (text: string): string[] => text.split(/[\s|]+/).filter((t) => t !== '');

/** Converte a notação em eventos por passo. */
export function parseTune(tune: Tune): Score {
  const leadTokens = tokens(tune.lead);
  const chords = tokens(tune.chords).map((name) => {
    const match = /^([A-G]#?)(m?)$/.exec(name);
    if (!match) throw new Error(`Acorde inválido: ${name}`);
    return { root: noteNumber(`${match[1]}3`), third: match[2] ? 3 : 4 };
  });
  const length = chords.length * STEPS_PER_BAR;
  if (leadTokens.length !== length) throw new Error(`Melodia com ${leadTokens.length} passos; esperados ${length}`);

  const lead = new Map<number, LeadNote>();
  for (let i = 0; i < length; i++) {
    const token = leadTokens[i]!;
    if (token === '.' || token === '-') continue;
    let steps = 1;
    while (leadTokens[i + steps] === '-') steps++;
    lead.set(i, { midi: noteNumber(token), steps });
  }

  const bassSteps = tokens(tune.bass);
  const drumSteps = tokens(tune.drums);
  if (bassSteps.length !== STEPS_PER_BAR || drumSteps.length !== STEPS_PER_BAR) throw new Error('Padrão com tamanho errado');
  const bass = new Map<number, number>();
  const drums = new Map<number, 'k' | 'h'>();
  const arp: [number, number][] = [];
  for (let i = 0; i < length; i++) {
    const { root, third } = chords[Math.floor(i / STEPS_PER_BAR)]!;
    const b = bassSteps[i % STEPS_PER_BAR]!;
    if (b !== '.') bass.set(i, root - 12 + Number(b));
    const d = drumSteps[i % STEPS_PER_BAR]!;
    if (d === 'k' || d === 'h') drums.set(i, d);
    const shape = [0, third, 7, 12];
    arp.push([root + 12 + shape[(i * 2) % 4]!, root + 12 + shape[(i * 2 + 1) % 4]!]);
  }
  return { length, stepSeconds: 60 / tune.bpm / 2, lead, bass, arp, drums };
}
