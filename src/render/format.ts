/** Número com uma casa e vírgula decimal. */
export const fmt = (v: number): string => v.toFixed(1).replace('.', ',');

/**
 * Percentual inteiro, arredondado para baixo para nunca parecer que atingiu
 * uma meta que faltou por pouco. Só mostra 0% com o tanque realmente vazio.
 */
export const fmtPct = (v: number): string => `${v > 0 ? Math.max(1, Math.floor(v)) : 0}%`;

export const fmtTime = (ms: number): string => `${fmt(ms / 1000)} s`;

export const star = (earned: boolean | undefined): string => (earned ? '★' : '☆');

/** Versão legível em letras pequenas, em que ★ e ☆ se confundem. */
export const starBox = (earned: boolean | undefined): string => (earned ? '[★]' : '[ ]');
