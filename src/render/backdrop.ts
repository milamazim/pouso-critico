import { SCREEN_H, SCREEN_W } from '../data/physics';
import type { WorldId } from '../sim/level';
import type { TerrainMask } from '../sim/terrain';

interface Palette {
  /** Faixas do céu, de cima para baixo. */
  readonly sky: readonly string[];
  readonly stars: readonly [dim: string, bright: string];
  /** Silhuetas distantes, da mais longe para a mais perto. */
  readonly far: readonly string[];
  /** Contorno, camada clara, corpo, fundo e grãos do terreno. */
  readonly edge: string;
  readonly rim: string;
  readonly body: string;
  readonly deep: string;
  readonly grain: string;
}

const PALETTES: Readonly<Record<WorldId, Palette>> = {
  plain: {
    sky: ['#080b1e', '#0c1028', '#111634', '#171d42'],
    stars: ['#444c74', '#c7cdea'],
    far: ['#1b2148', '#232a55'],
    edge: '#e3dcc6', rim: '#a9a596', body: '#70717f', deep: '#555869', grain: '#62646f',
  },
  crater: {
    sky: ['#14060f', '#1d0914', '#2a0d18', '#3b131a'],
    stars: ['#5c2c34', '#e0a08a'],
    far: ['#3a1219', '#4a1a1d'],
    edge: '#f09a55', rim: '#b5532f', body: '#83392a', deep: '#5f2822', grain: '#743025',
  },
  cave: {
    sky: ['#04141c', '#051a24', '#07222e', '#0a2b38'],
    stars: ['#17485a', '#7fd8e6'],
    far: ['#0c3040', '#113b4c'],
    edge: '#a8f0f2', rim: '#5aa3b8', body: '#356480', deep: '#274c66', grain: '#2d5872',
  },
};

// Gerador congruente linear: o cenário de cada mundo é sempre o mesmo.
function createRandom(seed: number): () => number {
  let state = seed;
  return () => (state = (state * 16807) % 2147483647) / 2147483647;
}

type Ctx = CanvasRenderingContext2D;

/** Céu e terreno não mudam durante a fase, então são desenhados uma única vez. */
export function createBackdrop(mask: TerrainMask, world: WorldId): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = SCREEN_W;
  canvas.height = SCREEN_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D indisponível');
  const palette = PALETTES[world];

  drawSky(ctx, palette);
  drawStars(ctx, palette, world === 'cave' ? 40 : 90);
  if (world === 'plain') drawPlanet(ctx, 392, 62, 26);
  if (world === 'crater') drawSun(ctx, 86, 70, 18);
  if (world === 'cave') drawStalactites(ctx, palette);
  palette.far.forEach((color, i) => drawRange(ctx, color, world, i));
  if (world === 'cave') drawGlowCrystals(ctx);
  drawTerrain(ctx, mask, palette);
  return canvas;
}

/** Faixas com transição pontilhada, no lugar de um degradê liso. */
function drawSky(ctx: Ctx, { sky }: Palette): void {
  const band = SCREEN_H / sky.length;
  for (let y = 0; y < SCREEN_H; y++) {
    const at = y / band;
    const index = Math.min(sky.length - 1, Math.floor(at));
    ctx.fillStyle = sky[index]!;
    ctx.fillRect(0, y, SCREEN_W, 1);
    const next = sky[index + 1];
    const into = at - index;
    if (!next || into < 0.7) continue;
    ctx.fillStyle = next;
    const step = into > 0.9 ? 2 : 4;
    for (let x = (y * 3) % step; x < SCREEN_W; x += step) ctx.fillRect(x, y, 1, 1);
  }
}

function drawStars(ctx: Ctx, { stars }: Palette, count: number): void {
  const random = createRandom(7);
  for (let i = 0; i < count; i++) {
    const x = Math.floor(random() * SCREEN_W);
    const y = Math.floor(random() * SCREEN_H * 0.8);
    const bright = random() > 0.75;
    ctx.fillStyle = stars[bright ? 1 : 0];
    ctx.fillRect(x, y, 1, 1);
    if (bright && random() > 0.7) {
      ctx.fillStyle = stars[0];
      ctx.fillRect(x - 1, y, 1, 1);
      ctx.fillRect(x + 1, y, 1, 1);
      ctx.fillRect(x, y - 1, 1, 1);
      ctx.fillRect(x, y + 1, 1, 1);
    }
  }
}

/** Preenche um disco escolhendo a cor de cada pixel. */
function disc(ctx: Ctx, cx: number, cy: number, r: number, color: (dx: number, dy: number) => string): void {
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy > r * r) continue;
      ctx.fillStyle = color(dx, dy);
      ctx.fillRect(cx + dx, cy + dy, 1, 1);
    }
  }
}

/** Planeta com anel, iluminado da esquerda. */
function drawPlanet(ctx: Ctx, cx: number, cy: number, r: number): void {
  const ring = (front: boolean): void => {
    for (let a = 0; a < 360; a++) {
      const rad = (a * Math.PI) / 180;
      const y = Math.sin(rad) * r * 0.28;
      if (y > 0 !== front) continue;
      ctx.fillStyle = a % 3 === 0 ? '#39406f' : '#4b5286';
      ctx.fillRect(Math.round(cx + Math.cos(rad) * r * 1.7), Math.round(cy + y + Math.cos(rad) * 6), 2, 1);
    }
  };
  ring(false);
  disc(ctx, cx, cy, r, (dx, dy) => {
    const light = (-dx - dy * 0.6) / r;
    const stripe = Math.abs((dy + dx * 0.2 + 100) % 11) < 3 ? 0.18 : 0;
    const dither = (dx + dy) % 2 === 0 ? 0.08 : 0;
    const v = light - stripe + dither;
    return v > 0.45 ? '#7f86bd' : v > 0 ? '#5d649c' : v > -0.5 ? '#404777' : '#2a3057';
  });
  ring(true);
}

/** Sol vermelho com halo pontilhado. */
function drawSun(ctx: Ctx, cx: number, cy: number, r: number): void {
  const glow = r + 8;
  for (let dy = -glow; dy <= glow; dy++) {
    for (let dx = -glow; dx <= glow; dx++) {
      const d = Math.hypot(dx, dy);
      if (d > glow || d <= r || (dx + dy * 2) % 3 !== 0) continue;
      ctx.fillStyle = '#5a1c1f';
      ctx.fillRect(cx + dx, cy + dy, 1, 1);
    }
  }
  disc(ctx, cx, cy, r, (dx, dy) => {
    const d = Math.hypot(dx, dy) / r;
    return dy > r * 0.2 && dy % 4 === 0 ? '#8c2f27' : d < 0.55 ? '#f0a05a' : d < 0.85 ? '#d9683c' : '#b0452f';
  });
}

/** Montanhas, vulcões ou colunas ao longe. */
function drawRange(ctx: Ctx, color: string, world: WorldId, layer: number): void {
  const random = createRandom(101 + layer * 37 + world.length * 11);
  const baseY = 178 + layer * 22;
  ctx.fillStyle = color;
  const waves = Array.from({ length: 4 }, (_, i) => ({
    f: (i + 1) * (0.008 + random() * 0.01), p: random() * 6.28, a: (world === 'crater' ? 13 : 10) / (i + 1),
  }));
  for (let x = 0; x < SCREEN_W; x++) {
    let h = 0;
    for (const w of waves) {
      const s = Math.sin(x * w.f + w.p);
      // Na cratera, cristas pontudas; nos outros mundos, ondas suaves.
      h += (world === 'crater' ? 1 - Math.abs(s) * 2 : s) * w.a;
    }
    const top = Math.round(baseY - h);
    ctx.fillRect(x, top, 1, SCREEN_H - top);
  }
}

function drawStalactites(ctx: Ctx, { far }: Palette): void {
  const random = createRandom(53);
  for (let i = 0; i < 26; i++) {
    const x = Math.floor(random() * SCREEN_W);
    const length = 14 + Math.floor(random() * 52);
    const half = 3 + Math.floor(random() * 7);
    ctx.fillStyle = far[i % 2]!;
    for (let y = 0; y < length; y++) {
      const w = Math.max(1, Math.round(half * (1 - y / length)));
      ctx.fillRect(x - w, y, w * 2, 1);
    }
  }
}

/** Cristais luminosos distantes. */
function drawGlowCrystals(ctx: Ctx): void {
  const random = createRandom(91);
  for (let i = 0; i < 12; i++) {
    const x = Math.floor(random() * SCREEN_W);
    const y = 168 + Math.floor(random() * 40);
    const h = 4 + Math.floor(random() * 7);
    ctx.fillStyle = '#12434f';
    ctx.fillRect(x - 1, y - h, 3, h);
    ctx.fillStyle = '#195664';
    ctx.fillRect(x, y - h - 1, 1, h);
  }
}

/** Contorno claro, camadas que escurecem com a profundidade e grãos. */
function drawTerrain(ctx: Ctx, mask: TerrainMask, p: Palette): void {
  const random = createRandom(31);
  const depth = terrainDepth(mask);
  for (let y = 0; y < SCREEN_H; y++) {
    for (let x = 0; x < SCREEN_W; x++) {
      const d = depth[y * SCREEN_W + x]!;
      if (d === 0) continue;
      const r = random();
      let color: string;
      if (d === 1) color = p.edge;
      else if (d <= 3) color = p.rim;
      else if (d <= 5) color = (x + y) % 2 === 0 ? p.rim : p.body;
      else if (d <= 26) color = r > 0.985 ? p.rim : r > 0.94 ? p.grain : p.body;
      else if (d <= 30) color = (x + y) % 2 === 0 ? p.body : p.deep;
      else color = r > 0.95 ? p.grain : p.deep;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

/** Distância (em passos) até o vazio mais próximo; bordas da tela não contam. */
function terrainDepth(mask: TerrainMask): Uint8Array {
  const depth = new Uint8Array(SCREEN_W * SCREEN_H).fill(255);
  for (let y = 0; y < SCREEN_H; y++) {
    for (let x = 0; x < SCREEN_W; x++) if (!mask.isSolid(x, y)) depth[y * SCREEN_W + x] = 0;
  }
  const relax = (x: number, y: number, dx: number, dy: number): void => {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= SCREEN_W || ny >= SCREEN_H) return;
    const i = y * SCREEN_W + x;
    depth[i] = Math.min(depth[i]!, depth[ny * SCREEN_W + nx]! + 1, 255);
  };
  for (let y = 0; y < SCREEN_H; y++) {
    for (let x = 0; x < SCREEN_W; x++) {
      relax(x, y, -1, 0);
      relax(x, y, 0, -1);
    }
  }
  for (let y = SCREEN_H - 1; y >= 0; y--) {
    for (let x = SCREEN_W - 1; x >= 0; x--) {
      relax(x, y, 1, 0);
      relax(x, y, 0, 1);
    }
  }
  return depth;
}
