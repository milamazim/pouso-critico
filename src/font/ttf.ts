import type { Glyph } from './glyphs';

/** Um pixel da fonte; o corpo tem 10 pixels de altura. */
const PX = 100;
const EM = 10 * PX;
const ASCENT = 10 * PX;
const DESCENT = 2 * PX;
const SPACE_WIDTH = 4;

/** Escritor de bytes em ordem big-endian, como o formato TrueType exige. */
class Writer {
  readonly bytes: number[] = [];

  u8(v: number): this {
    this.bytes.push(v & 0xff);
    return this;
  }

  u16(...values: number[]): this {
    for (const v of values) this.bytes.push((v >> 8) & 0xff, v & 0xff);
    return this;
  }

  u32(...values: number[]): this {
    for (const v of values) this.bytes.push((v >>> 24) & 0xff, (v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff);
    return this;
  }

  ascii(text: string): this {
    for (const c of text) this.bytes.push(c.charCodeAt(0));
    return this;
  }

  append(other: readonly number[]): this {
    for (const b of other) this.bytes.push(b);
    return this;
  }

  pad4(): this {
    while (this.bytes.length % 4 !== 0) this.bytes.push(0);
    return this;
  }
}

type Rect = readonly [x0: number, y0: number, x1: number, y1: number];

/** Um retângulo por sequência horizontal de pixels, em unidades da fonte. */
function glyphRects(g: Glyph): Rect[] {
  const rects: Rect[] = [];
  const addRows = (rows: readonly string[], top: number): void => {
    rows.forEach((row, i) => {
      const y1 = top - i;
      for (const run of row.matchAll(/#+/g)) {
        rects.push([run.index * PX, (y1 - 1) * PX, (run.index + run[0].length) * PX, y1 * PX]);
      }
    });
  };
  addRows(g.rows, 7);
  // Uma linha vazia separa o acento da letra.
  addRows(g.above, 10);
  return rects;
}

interface Outline {
  readonly data: readonly number[];
  readonly advance: number;
  readonly xMin: number;
  readonly points: number;
  readonly contours: number;
}

function outline(rects: readonly Rect[], advance: number): Outline {
  if (rects.length === 0) return { data: [], advance, xMin: 0, points: 0, contours: 0 };
  const xs = rects.flatMap((r) => [r[0], r[2]]);
  const ys = rects.flatMap((r) => [r[1], r[3]]);
  const xMin = Math.min(...xs);
  const w = new Writer();
  w.u16(rects.length, xMin, Math.min(...ys), Math.max(...xs), Math.max(...ys));
  rects.forEach((_, i) => w.u16(i * 4 + 3));
  w.u16(0); // sem instruções
  const points = rects.flatMap(([x0, y0, x1, y1]) => [[x0, y0], [x0, y1], [x1, y1], [x1, y0]] as const);
  // Todos na curva, com deltas de 16 bits.
  for (let i = 0; i < points.length; i++) w.u8(1);
  for (const axis of [0, 1] as const) {
    let previous = 0;
    for (const p of points) {
      w.u16(p[axis] - previous);
      previous = p[axis];
    }
  }
  w.pad4();
  return { data: w.bytes, advance, xMin, points: points.length, contours: rects.length };
}

function nameTable(family: string): number[] {
  const texts: [number, string][] = [
    [1, family], [2, 'Regular'], [3, `${family} 1.0`], [4, family], [5, 'Version 1.0'], [6, family],
  ];
  const strings = new Writer();
  const w = new Writer().u16(0, texts.length, 6 + texts.length * 12);
  for (const [id, text] of texts) {
    w.u16(3, 1, 0x409, id, text.length * 2, strings.bytes.length);
    for (const c of text) strings.u16(c.charCodeAt(0));
  }
  return w.append(strings.bytes).bytes;
}

function cmapTable(codes: readonly (readonly [code: number, glyph: number])[]): number[] {
  const segments = [...codes.map(([c, g]) => [c, (g - c) & 0xffff] as const), [0xffff, 1] as const];
  const n = segments.length;
  const log = Math.floor(Math.log2(n));
  const range = 2 * 2 ** log;
  const sub = new Writer().u16(4, 16 + n * 8, 0, n * 2, range, log, n * 2 - range);
  sub.u16(...segments.map(([c]) => c)).u16(0);
  sub.u16(...segments.map(([c]) => c));
  sub.u16(...segments.map(([, delta]) => delta));
  sub.u16(...segments.map(() => 0));
  return new Writer().u16(0, 1, 3, 1).u32(12).append(sub.bytes).bytes;
}

const checksum = (bytes: readonly number[]): number => {
  let sum = 0;
  for (let i = 0; i < bytes.length; i += 4) {
    const word = ((bytes[i] ?? 0) * 0x1000000) + ((bytes[i + 1] ?? 0) << 16) + ((bytes[i + 2] ?? 0) << 8) + (bytes[i + 3] ?? 0);
    sum = (sum + word) >>> 0;
  }
  return sum;
};

/** Monta uma fonte TrueType a partir dos glifos, para usar em textos comuns da página. */
export function buildFont(family: string, glyphs: ReadonlyMap<string, Glyph>): Uint8Array<ArrayBuffer> {
  // Glifo 0 é o "ausente"; 1 é o espaço.
  const outlines: Outline[] = [
    outline([[0, 0, 4 * PX, 7 * PX]], 5 * PX),
    outline([], SPACE_WIDTH * PX),
  ];
  const codes: [number, number][] = [[0x20, 1], [0xa0, 1]];
  const ids = new Map<Glyph, number>();
  for (const [char, glyph] of glyphs) {
    let id = ids.get(glyph);
    if (id === undefined) {
      id = outlines.length;
      ids.set(glyph, id);
      outlines.push(outline(glyphRects(glyph), (glyph.width + 1) * PX));
    }
    codes.push([char.codePointAt(0)!, id]);
  }
  codes.sort((a, b) => a[0] - b[0]);

  const loca = new Writer();
  const glyf = new Writer();
  for (const o of outlines) {
    loca.u32(glyf.bytes.length);
    glyf.append(o.data);
  }
  loca.u32(glyf.bytes.length);

  const maxAdvance = Math.max(...outlines.map((o) => o.advance));
  const hmtx = new Writer();
  for (const o of outlines) hmtx.u16(o.advance, o.xMin);

  const head = new Writer()
    .u32(0x10000, 0x10000, 0, 0x5f0f3cf5)
    .u16(3, EM)
    .u32(0, 0, 0, 0)
    .u16(0, -DESCENT, maxAdvance, ASCENT, 0, 8, 2, 1, 0).bytes;
  const hhea = new Writer()
    .u32(0x10000)
    .u16(ASCENT, -DESCENT, 0, maxAdvance, 0, 0, maxAdvance, 1, 0, 0, 0, 0, 0, 0, 0, outlines.length).bytes;
  const maxp = new Writer()
    .u32(0x10000)
    .u16(outlines.length, Math.max(...outlines.map((o) => o.points)), Math.max(...outlines.map((o) => o.contours)))
    .u16(0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0).bytes;
  const os2 = new Writer()
    .u16(4, 5 * PX, 400, 5, 0)
    .u16(500, 500, 0, 100, 500, 500, 0, 400, PX, 3 * PX, 0)
    .u32(0, 0).u16(0) // panose
    .u32(0, 0, 0, 0)
    .ascii('POUS')
    .u16(0x40, codes[0]![0], Math.min(0xffff, codes[codes.length - 1]![0]))
    .u16(ASCENT, -DESCENT, 0, ASCENT, DESCENT)
    .u32(1, 0)
    .u16(7 * PX, 7 * PX, 0, 0x20, 1).bytes;
  const post = new Writer().u32(0x30000, 0).u16(-PX, PX).u32(0, 0, 0, 0, 0).bytes;

  // Em ordem alfabética de etiqueta, como o formato exige.
  const tables: [string, readonly number[]][] = [
    ['OS/2', os2], ['cmap', cmapTable(codes)], ['glyf', glyf.bytes], ['head', head], ['hhea', hhea],
    ['hmtx', hmtx.bytes], ['loca', loca.bytes], ['maxp', maxp], ['name', nameTable(family)], ['post', post],
  ];
  const n = tables.length;
  const log = Math.floor(Math.log2(n));
  const range = 16 * 2 ** log;
  const directory = new Writer().u32(0x10000).u16(n, range, log, n * 16 - range);
  const body = new Writer();
  let headOffset = 0;
  for (const [tag, bytes] of tables) {
    const offset = 12 + n * 16 + body.bytes.length;
    if (tag === 'head') headOffset = offset;
    directory.ascii(tag).u32(checksum(bytes), offset, bytes.length);
    body.append(bytes).pad4();
  }
  const file = [...directory.bytes, ...body.bytes];
  const adjustment = (0xb1b0afba - checksum(file)) >>> 0;
  new Writer().u32(adjustment).bytes.forEach((b, i) => { file[headOffset + 8 + i] = b; });
  return Uint8Array.from(file);
}
