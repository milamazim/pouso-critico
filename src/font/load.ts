import { GLYPHS } from './glyphs';
import { buildFont } from './ttf';

export const FONT_FAMILY = 'PousoPixel';

/** Se a fonte falhar, os textos usam a alternativa definida no CSS. */
export async function loadFont(): Promise<void> {
  try {
    const face = new FontFace(FONT_FAMILY, buildFont(FONT_FAMILY, GLYPHS));
    document.fonts.add(await face.load());
  } catch (error) {
    console.warn('Fonte do jogo indisponível', error);
  }
}
