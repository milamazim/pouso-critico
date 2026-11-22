import { describe, expect, it } from 'vitest';
import { GLYPHS } from '../src/font/glyphs';
import { buildFont } from '../src/font/ttf';
import { fontPixel } from '../src/render/stage';

const SOURCES = import.meta.glob<string>('../src/{screens,render,input,data}/**/*.ts', {
  query: '?raw', import: 'default', eager: true,
});

describe('glifos', () => {
  it('têm linhas retangulares, só com pixels válidos', () => {
    for (const [char, g] of GLYPHS) {
      expect(g.rows.length, char).toBeGreaterThanOrEqual(7);
      expect(g.rows.length, char).toBeLessThanOrEqual(9);
      for (const row of g.rows) expect(row, char).toMatch(/^[.#]+$/);
      expect(new Set(g.rows.slice(0, 7).map((r) => r.length)).size, char).toBeLessThanOrEqual(2);
      for (const row of g.above) expect(row, char).toMatch(/^[.#]+$/);
    }
  });

  it('cobrem os acentos do português, em maiúsculas e minúsculas', () => {
    for (const c of 'ÁÀÂÃÉÊÍÓÔÕÚÇáàâãéêíóôõúç') expect(GLYPHS.has(c), c).toBe(true);
  });

  it('são todos diferentes entre si', () => {
    const upper = [...GLYPHS].filter(([c]) => c === c.toUpperCase());
    const shapes = upper.map(([, g]) => JSON.stringify([g.above, g.rows]));
    expect(new Set(shapes).size).toBe(shapes.length);
  });

  it('cobrem todos os textos das telas', () => {
    const missing = new Set<string>();
    expect(Object.keys(SOURCES).length).toBeGreaterThan(10);
    for (const [file, source] of Object.entries(SOURCES)) {
      const code = source.replace(/[/][*][^]*?[*][/]/g, '').replace(/[/][/].*$/gm, '');
      for (const c of code) if (c.charCodeAt(0) > 0x7e && !GLYPHS.has(c)) missing.add(`${c} em ${file}`);
    }
    expect([...missing]).toEqual([]);
  });
});

describe('arquivo TrueType', () => {
  const font = buildFont('Teste', GLYPHS);
  const view = new DataView(font.buffer);
  const tables = new Map<string, { offset: number; length: number; sum: number }>();
  for (let i = 0; i < view.getUint16(4); i++) {
    const at = 12 + i * 16;
    const tag = String.fromCharCode(...font.slice(at, at + 4));
    tables.set(tag, { sum: view.getUint32(at + 4), offset: view.getUint32(at + 8), length: view.getUint32(at + 12) });
  }

  it('tem as tabelas obrigatórias, alinhadas e dentro do arquivo', () => {
    expect([...tables.keys()]).toEqual(['OS/2', 'cmap', 'glyf', 'head', 'hhea', 'hmtx', 'loca', 'maxp', 'name', 'post']);
    for (const { offset, length } of tables.values()) {
      expect(offset % 4).toBe(0);
      expect(offset + length).toBeLessThanOrEqual(font.length);
    }
  });

  it('tem tamanhos de tabela corretos', () => {
    const glyphs = view.getUint16(tables.get('maxp')!.offset + 4);
    expect(tables.get('OS/2')!.length).toBe(96);
    expect(tables.get('head')!.length).toBe(54);
    expect(tables.get('hhea')!.length).toBe(36);
    expect(tables.get('maxp')!.length).toBe(32);
    expect(tables.get('hmtx')!.length).toBe(glyphs * 4);
    expect(tables.get('loca')!.length).toBe((glyphs + 1) * 4);
  });

  it('a soma de verificação do arquivo inteiro confere', () => {
    let sum = 0;
    for (let i = 0; i < font.length; i += 4) sum = (sum + view.getUint32(i)) >>> 0;
    expect(sum).toBe(0xb1b0afba);
  });
});

describe('fontPixel', () => {
  it.each([[1, 1, 1], [2, 1, 2], [3, 1, 2], [4, 1, 3], [2.78, 2, 2], [4.33, 3, 3]])('escala %f em dpr %i usa %i', (s, d, px) => {
    expect(fontPixel(s, d)).toBe(px);
  });
});
