import * as THREE from 'three';

/**
 * Protsedural teksturalar — tashqi fayllarsiz, ishga tushishda canvas orqali yaratiladi.
 * Har bir tekstura dunyo-metr UV ga mos `tile` (metr) qiymati bilan takrorlanadi.
 */

let seed = 1337;
function rnd() {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
}

function makeCanvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/** Takrorlanuvchi (tileable) qiymat shovqini */
function valueNoise(w: number, h: number, cell: number, s: number) {
  seed = s;
  const gw = Math.ceil(w / cell);
  const gh = Math.ceil(h / cell);
  const grid = new Float32Array(gw * gh).map(() => rnd());
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const gy = y / cell;
    const y0 = Math.floor(gy) % gh;
    const y1 = (y0 + 1) % gh;
    const fy = gy - Math.floor(gy);
    const sy = fy * fy * (3 - 2 * fy);
    for (let x = 0; x < w; x++) {
      const gx = x / cell;
      const x0 = Math.floor(gx) % gw;
      const x1 = (x0 + 1) % gw;
      const fx = gx - Math.floor(gx);
      const sx = fx * fx * (3 - 2 * fx);
      const a = grid[y0 * gw + x0];
      const b = grid[y0 * gw + x1];
      const c = grid[y1 * gw + x0];
      const d = grid[y1 * gw + x1];
      out[y * w + x] = a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
    }
  }
  return out;
}

function fbm(w: number, h: number, base: number, octaves: number, s: number) {
  const out = new Float32Array(w * h);
  let amp = 1;
  let total = 0;
  let cell = base;
  for (let o = 0; o < octaves; o++) {
    const n = valueNoise(w, h, Math.max(1, cell), s + o * 101);
    for (let i = 0; i < out.length; i++) out[i] += n[i] * amp;
    total += amp;
    amp *= 0.5;
    cell /= 2;
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}

function toTexture(canvas: HTMLCanvasElement, tileU: number, tileV: number, srgb: boolean) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1 / tileU, 1 / tileV);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = 8;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.needsUpdate = true;
  return t;
}

/** Balandlik maydonidan normal xarita */
function heightToNormal(hgt: Float32Array, w: number, h: number, strength: number) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const l = hgt[y * w + ((x - 1 + w) % w)];
      const r = hgt[y * w + ((x + 1) % w)];
      const u = hgt[((y - 1 + h) % h) * w + x];
      const d = hgt[((y + 1) % h) * w + x];
      let nx = (l - r) * strength;
      let ny = (d - u) * strength;
      let nz = 1;
      const len = Math.hypot(nx, ny, nz);
      nx /= len;
      ny /= len;
      nz /= len;
      const i = (y * w + x) * 4;
      img.data[i] = (nx * 0.5 + 0.5) * 255;
      img.data[i + 1] = (ny * 0.5 + 0.5) * 255;
      img.data[i + 2] = (nz * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

function colorFromNoise(n: Float32Array, w: number, h: number, fn: (v: number, x: number, y: number) => [number, number, number]) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const [r, g, b] = fn(n[y * w + x], x, y);
      const i = (y * w + x) * 4;
      img.data[i] = r;
      img.data[i + 1] = g;
      img.data[i + 2] = b;
      img.data[i + 3] = 255;
    }
  ctx.putImageData(img, 0, 0);
  return c;
}

const cache = new Map<string, THREE.Texture>();
function cached(key: string, make: () => THREE.Texture) {
  let t = cache.get(key);
  if (!t) {
    t = make();
    cache.set(key, t);
  }
  return t;
}

/* ------------------------------------------------------------------ */

/** Gofrirlangan (trapetsiya profilli) fasad paneli — normal xarita, 1 m da 5 ta qovurg‘a */
export const claddingNormal = () =>
  cached('claddingNormal', () => {
    const w = 512;
    const h = 8;
    const hgt = new Float32Array(w * h);
    const ribs = 5;
    for (let x = 0; x < w; x++) {
      const p = ((x / w) * ribs) % 1;
      // trapetsiya: tekis tepa, qiya yon, tekis tag
      let v: number;
      if (p < 0.25) v = 1;
      else if (p < 0.35) v = 1 - (p - 0.25) / 0.1;
      else if (p < 0.9) v = 0;
      else v = (p - 0.9) / 0.1;
      // panel chokidagi kichik qovurg‘alar
      v += Math.sin(p * Math.PI * 12) * 0.03;
      for (let y = 0; y < h; y++) hgt[y * w + x] = v;
    }
    return toTexture(heightToNormal(hgt, w, h, 18), 1, 1, false);
  });

/** Fasad paneli rang xaritasi — mayda shovqin va vertikal dog‘lar */
export const claddingColor = () =>
  cached('claddingColor', () => {
    const w = 256;
    const h = 256;
    const n = fbm(w, h, 64, 4, 11);
    const streak = valueNoise(w, h, 8, 77);
    const c = colorFromNoise(n, w, h, (v, x) => {
      const s = streak[x] * 0.06;
      const k = 0.9 + v * 0.16 - s;
      return [235 * k, 235 * k, 235 * k];
    });
    return toTexture(c, 6, 6, true);
  });

/** Tom — tik choklar (standing seam), 0.5 m qadam */
export const roofNormal = () =>
  cached('roofNormal', () => {
    const w = 256;
    const h = 8;
    const hgt = new Float32Array(w * h);
    for (let x = 0; x < w; x++) {
      const p = ((x / w) * 2) % 1;
      const v = p < 0.04 ? 1 : p < 0.07 ? 1 - (p - 0.04) / 0.03 : 0;
      for (let y = 0; y < h; y++) hgt[y * w + x] = v + 0.02 * Math.sin(p * 40);
    }
    return toTexture(heightToNormal(hgt, w, h, 10), 1, 1, false);
  });

export const asphaltColor = () =>
  cached('asphaltColor', () => {
    const w = 512;
    const h = 512;
    const n = fbm(w, h, 128, 5, 3);
    seed = 9;
    const c = colorFromNoise(n, w, h, (v) => {
      const speck = rnd();
      let g = 58 + v * 26;
      if (speck > 0.985) g += 40 * rnd();
      else if (speck < 0.02) g -= 18;
      return [g, g, g * 1.02];
    });
    return toTexture(c, 10, 10, true);
  });

export const asphaltNormal = () =>
  cached('asphaltNormal', () => {
    const w = 256;
    const h = 256;
    const n = fbm(w, h, 4, 3, 21);
    return toTexture(heightToNormal(n, w, h, 3), 2, 2, false);
  });

/** Beton qoplama: 5 m qadamli kesilgan choklar + dog‘lar (masshtabga yordam beradi) */
export const concreteColor = () =>
  cached('concreteColor', () => {
    const w = 512;
    const h = 512;
    const n = fbm(w, h, 128, 5, 5);
    const c = colorFromNoise(n, w, h, (v, x, y) => {
      let g = 168 + v * 34;
      const jx = x % 256;
      const jy = y % 256;
      if (jx < 2 || jy < 2) g -= 55;
      return [g * 1.0, g * 0.985, g * 0.95];
    });
    return toTexture(c, 10, 10, true);
  });

export const concreteNormal = () =>
  cached('concreteNormal', () => {
    const w = 256;
    const h = 256;
    const n = fbm(w, h, 8, 3, 31);
    return toTexture(heightToNormal(n, w, h, 1.5), 2, 2, false);
  });

export const grassColor = () =>
  cached('grassColor', () => {
    const w = 512;
    const h = 512;
    const n = fbm(w, h, 128, 6, 8);
    seed = 4;
    const c = colorFromNoise(n, w, h, (v) => {
      const r = rnd();
      const k = 0.75 + v * 0.5 + (r - 0.5) * 0.25;
      return [74 * k, 96 * k, 50 * k];
    });
    return toTexture(c, 8, 8, true);
  });

export const floorColor = () =>
  cached('floorColor', () => {
    const w = 512;
    const h = 512;
    const n = fbm(w, h, 128, 5, 14);
    const c = colorFromNoise(n, w, h, (v, x, y) => {
      let g = 150 + v * 22;
      if (x % 256 < 1 || y % 256 < 1) g -= 25;
      return [g * 0.98, g, g * 1.02];
    });
    return toTexture(c, 12, 12, true);
  });

export const showroomFloorColor = () =>
  cached('showroomFloor', () => {
    const w = 512;
    const h = 512;
    const n = fbm(w, h, 64, 4, 41);
    const c = colorFromNoise(n, w, h, (v, x, y) => {
      let g = 214 + v * 18;
      if (x % 256 < 2 || y % 256 < 2) g = 150;
      return [g, g * 0.985, g * 0.96];
    });
    return toTexture(c, 2.4, 2.4, true);
  });

/** Quyosh paneli: to‘q ko‘k hujayralar, kumushrang chiziqlar, alyuminiy rama (1 modul ≈ 1.05 × 1.05 m) */
export const solarColor = () =>
  cached('solar', () => {
    const w = 256;
    const h = 256;
    const c = makeCanvas(w, h);
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#c9ccd0';
    ctx.fillRect(0, 0, w, h);
    const m = 6;
    ctx.fillStyle = '#16233d';
    ctx.fillRect(m, m, w - 2 * m, h - 2 * m);
    ctx.strokeStyle = 'rgba(170,185,210,0.55)';
    ctx.lineWidth = 1.2;
    const n = 6;
    for (let i = 1; i < n; i++) {
      const p = m + ((w - 2 * m) * i) / n;
      ctx.beginPath();
      ctx.moveTo(p, m);
      ctx.lineTo(p, h - m);
      ctx.moveTo(m, p);
      ctx.lineTo(w - m, p);
      ctx.stroke();
    }
    return toTexture(c, 1.05, 1.05, true);
  });

/** Rolikli darvoza lamellari — 0.08 m gorizontal ariqchalar */
export const shutterNormal = () =>
  cached('shutterNormal', () => {
    const w = 8;
    const h = 256;
    const hgt = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      const p = ((y / h) * 12.5) % 1;
      const v = Math.sin(p * Math.PI) ** 0.6;
      for (let x = 0; x < w; x++) hgt[y * w + x] = v;
    }
    return toTexture(heightToNormal(hgt, w, h, 6), 1, 1, false);
  });

export const woodColor = () =>
  cached('wood', () => {
    const w = 256;
    const h = 256;
    const n = fbm(w, h, 32, 4, 51);
    const c = colorFromNoise(n, w, h, (v, x, y) => {
      const grain = Math.sin(y * 0.35 + v * 6) * 0.08;
      let k = 0.85 + v * 0.25 + grain;
      if (y % 64 < 2) k *= 0.6;
      void x;
      return [176 * k, 136 * k, 92 * k];
    });
    return toTexture(c, 1.2, 1.2, true);
  });

/** Yorug‘lik dog‘i (tungi chiroqlar ostida) */
export const lightPoolTexture = () =>
  cached('lightPool', () => {
    const s = 128;
    const c = makeCanvas(s, s);
    const ctx = c.getContext('2d')!;
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(255,214,150,0.85)');
    g.addColorStop(0.4, 'rgba(255,190,120,0.35)');
    g.addColorStop(1, 'rgba(255,170,100,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  });

/** Pol ostidagi yumshoq soya (ambient occlusion imitatsiyasi) */
export const contactShadowTexture = () =>
  cached('contactShadow', () => {
    const s = 128;
    const c = makeCanvas(s, s);
    const ctx = c.getContext('2d')!;
    const g = ctx.createRadialGradient(s / 2, s / 2, s * 0.15, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(0,0,0,0.55)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    const t = new THREE.CanvasTexture(c);
    return t;
  });

/* ------------------------------------------------------------------ */
/* Matnli teksturalar (yozuvlar, logotip)                               */
/* ------------------------------------------------------------------ */

const FONT = '"Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif';

/**
 * iMG logotipi — reference renderdagi ko‘rinish asosida qayta chizilgan vaqtinchalik variant:
 * to‘q sariq→sariq gradientli uchta qiya plastina + oq "iMG" + aralash harfli "MIRROR & GLASS".
 * Rasmiy vektor fayl bo‘lsa, factoryConfig.brand.logoUrl orqali almashtiriladi.
 */
export function drawLogo(ctx: CanvasRenderingContext2D, w: number, h: number, opts: { dark?: boolean; tagline?: boolean } = {}) {
  const textColor = opts.dark ? '#1d1f22' : '#ffffff';
  const markH = h * (opts.tagline === false ? 0.9 : 0.62);
  const markW = markH * 0.62;
  const x0 = w * 0.02;
  const y0 = (opts.tagline === false ? h * 0.05 : h * 0.04);
  // uchta qiya plastina
  const grad = ctx.createLinearGradient(x0, y0 + markH, x0 + markW, y0);
  grad.addColorStop(0, '#e2401c');
  grad.addColorStop(0.45, '#f39200');
  grad.addColorStop(1, '#ffd23f');
  const bw = markW * 0.27;
  const skew = markW * 0.12;
  for (let i = 0; i < 3; i++) {
    const bx = x0 + i * (bw + markW * 0.06);
    const top = y0 + i * markH * 0.04;
    ctx.beginPath();
    ctx.moveTo(bx + skew, top);
    ctx.lineTo(bx + bw + skew, top + markH * 0.06);
    ctx.lineTo(bx + bw, y0 + markH);
    ctx.lineTo(bx, y0 + markH - markH * 0.05);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
    // yaltiroq chiziq
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = Math.max(1, bw * 0.08);
    ctx.beginPath();
    ctx.moveTo(bx + bw * 0.35 + skew * 0.8, top + markH * 0.1);
    ctx.lineTo(bx + bw * 0.55, y0 + markH * 0.6);
    ctx.stroke();
  }
  // iMG yozuvi
  ctx.fillStyle = textColor;
  ctx.font = `800 ${markH * 1.0}px ${FONT}`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('iMG', x0 + markW * 1.08, y0 + markH * 0.93);
  if (opts.tagline !== false) {
    ctx.font = `600 ${h * 0.17}px ${FONT}`;
    const text = 'MIRROR & GLASS';
    let x = x0 + markW * 0.02;
    const y = h * 0.95;
    const spacing = h * 0.075;
    for (const ch of text) {
      ctx.fillText(ch, x, y);
      x += ctx.measureText(ch).width + spacing;
    }
  }
}

export function logoTexture(dark = false) {
  return cached(`logo-${dark}`, () => {
    const c = makeCanvas(1024, 400);
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, c.width, c.height);
    drawLogo(ctx, c.width, c.height, { dark });
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  });
}

/** Yozuvli taxta (bino nomlari) */
export function signTexture(text: string, opts: { bg?: string; fg?: string; w?: number; h?: number; weight?: number } = {}) {
  return cached(`sign-${text}-${opts.bg}-${opts.fg}`, () => {
    const w = opts.w ?? 1024;
    const h = opts.h ?? 160;
    const c = makeCanvas(w, h);
    const ctx = c.getContext('2d')!;
    if (opts.bg) {
      ctx.fillStyle = opts.bg;
      ctx.fillRect(0, 0, w, h);
    } else ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = opts.fg ?? '#ffffff';
    let size = h * 0.56;
    ctx.font = `${opts.weight ?? 700} ${size}px ${FONT}`;
    while (ctx.measureText(text).width > w * 0.92 && size > 8) {
      size -= 2;
      ctx.font = `${opts.weight ?? 700} ${size}px ${FONT}`;
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2 + size * 0.04);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  });
}

export function disposeTextures() {
  cache.forEach((t) => t.dispose());
  cache.clear();
}
