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

/** Marmar tomirlari — chegaradan o‘tganda qarama-qarshi tomondan davom etadi (tileable) */
function drawVeins(ctx: CanvasRenderingContext2D, w: number, h: number, count: number, color: string, width: number, s: number) {
  seed = s;
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  for (let i = 0; i < count; i++) {
    const pts: [number, number][] = [];
    let x = rnd() * w;
    let y = rnd() * h;
    let a = -0.6 + rnd() * 1.2 + (rnd() < 0.5 ? 0 : Math.PI);
    const n = 6 + Math.floor(rnd() * 8);
    for (let k = 0; k < n; k++) {
      pts.push([x, y]);
      a += (rnd() - 0.5) * 0.9;
      const step = w * (0.05 + rnd() * 0.08);
      x += Math.cos(a) * step;
      y += Math.sin(a) * step;
    }
    const lw = width * (0.4 + rnd());
    for (const ox of [-w, 0, w])
      for (const oy of [-h, 0, h]) {
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.moveTo(pts[0][0] + ox, pts[0][1] + oy);
        for (let k = 1; k < pts.length - 1; k++) {
          const mx = (pts[k][0] + pts[k + 1][0]) / 2;
          const my = (pts[k][1] + pts[k + 1][1]) / 2;
          ctx.quadraticCurveTo(pts[k][0] + ox, pts[k][1] + oy, mx + ox, my + oy);
        }
        ctx.stroke();
        // ingichka yo‘ldosh tomir
        ctx.lineWidth = lw * 0.35;
        ctx.beginPath();
        ctx.moveTo(pts[0][0] + ox + lw * 3, pts[0][1] + oy + lw * 2);
        for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k][0] + ox + lw * 3, pts[k][1] + oy + lw * 2);
        ctx.stroke();
      }
  }
}

/** Showroom poli: sayqallangan och kulrang marmar plitalar (1.2 × 1.2 m) */
export const showroomFloorColor = () =>
  cached('showroomFloor', () => {
    const w = 1024;
    const h = 1024;
    const n = fbm(w, h, 128, 4, 41);
    const c = colorFromNoise(n, w, h, (v) => {
      const g = 206 + v * 22;
      return [g, g * 0.99, g * 0.975];
    });
    const ctx = c.getContext('2d')!;
    drawVeins(ctx, w, h, 9, 'rgba(120,118,115,0.22)', 3, 77);
    drawVeins(ctx, w, h, 5, 'rgba(255,255,255,0.35)', 2, 78);
    // plitalar orasidagi choklar (2 × 2 plita)
    ctx.fillStyle = 'rgba(110,108,104,0.55)';
    for (const p of [0, w / 2]) {
      ctx.fillRect(p, 0, 2, h);
      ctx.fillRect(0, p, w, 2);
    }
    return toTexture(c, 2.4, 2.4, true);
  });

/** Qora marmar (brend devori, resepshn, podiumlar): oq-kulrang tomirlar */
export const marbleDarkColor = () =>
  cached('marbleDark', () => {
    const w = 1024;
    const h = 1024;
    const n = fbm(w, h, 128, 4, 63);
    const c = colorFromNoise(n, w, h, (v) => {
      const g = 26 + v * 16;
      return [g, g * 1.01, g * 1.04];
    });
    const ctx = c.getContext('2d')!;
    drawVeins(ctx, w, h, 7, 'rgba(210,212,214,0.55)', 2.4, 91);
    drawVeins(ctx, w, h, 12, 'rgba(160,162,166,0.25)', 1.4, 92);
    return toTexture(c, 3.0, 3.0, true);
  });

/** Ko‘p qatorli ro‘yxat paneli (mahsulotlar yo‘nalishlari) — shaffof fon, oq matn, ixtiyoriy belgi-ikonkalar */
export function listTexture(lines: string[], opts: { icons?: boolean; title?: string; w?: number; h?: number; fg?: string } = {}) {
  return cached(`list-${opts.title ?? ''}-${lines.join('|')}-${opts.icons}`, () => {
    const w = opts.w ?? 512;
    const h = opts.h ?? 1024;
    const c = makeCanvas(w, h);
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, w, h);
    const fg = opts.fg ?? '#f2f2f0';
    let y = h * 0.06;
    if (opts.title) {
      ctx.fillStyle = fg;
      ctx.font = `800 ${w * 0.11}px ${FONT}`;
      ctx.textBaseline = 'top';
      ctx.fillText(opts.title, w * 0.06, y);
      y += w * 0.2;
    }
    const step = (h - y - h * 0.04) / lines.length;
    const size = Math.min(w * 0.078, step * 0.4);
    ctx.font = `600 ${size}px ${FONT}`;
    ctx.textBaseline = 'middle';
    lines.forEach((line, i) => {
      const cy = y + step * (i + 0.5);
      let x = w * 0.06;
      if (opts.icons) {
        const s2 = size * 1.5;
        ctx.strokeStyle = fg;
        ctx.lineWidth = Math.max(1.5, size * 0.09);
        ctx.strokeRect(x, cy - s2 / 2, s2, s2);
        ctx.beginPath();
        ctx.moveTo(x + s2 * 0.5, cy - s2 * 0.32);
        ctx.lineTo(x + s2 * 0.5, cy + s2 * 0.32);
        ctx.moveTo(x + s2 * 0.22, cy);
        ctx.lineTo(x + s2 * 0.78, cy);
        ctx.stroke();
        x += s2 * 1.6;
      }
      ctx.fillStyle = fg;
      let x2 = x;
      for (const ch of line.toUpperCase()) {
        ctx.fillText(ch, x2, cy);
        x2 += ctx.measureText(ch).width + size * 0.08;
      }
    });
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  });
}

/** Shisha fasadli bino fotosurati (showroomdagi reklama paneli uchun stilizatsiya) */
export function towerPhotoTexture() {
  return cached('towerPhoto', () => {
    const w = 512;
    const h = 768;
    const c = makeCanvas(w, h);
    const ctx = c.getContext('2d')!;
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#3f7fc4');
    sky.addColorStop(0.7, '#b9d6ee');
    sky.addColorStop(1, '#e8eef2');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    // ikki yuzali shisha minora
    const faces: [number, number, number, number, string, string][] = [
      [w * 0.18, w * 0.52, h * 0.12, h * 0.86, '#2d5c86', '#9cc7e6'],
      [w * 0.52, w * 0.8, h * 0.16, h * 0.86, '#1d3c5a', '#5f8fb5'],
    ];
    for (const [x0, x1, y0, y1, c0, c1] of faces) {
      const g = ctx.createLinearGradient(x0, y0, x1, y1);
      g.addColorStop(0, c1);
      g.addColorStop(1, c0);
      ctx.fillStyle = g;
      ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
      ctx.strokeStyle = 'rgba(20,30,40,0.75)';
      ctx.lineWidth = 2;
      for (let x = x0; x <= x1 + 0.5; x += (x1 - x0) / 6) {
        ctx.beginPath();
        ctx.moveTo(x, y0);
        ctx.lineTo(x, y1);
        ctx.stroke();
      }
      for (let y = y0; y <= y1 + 0.5; y += (y1 - y0) / 14) {
        ctx.beginPath();
        ctx.moveTo(x0, y);
        ctx.lineTo(x1, y);
        ctx.stroke();
      }
    }
    // daraxtlar va yer
    ctx.fillStyle = '#4d6b3a';
    for (let i = 0; i < 9; i++) {
      ctx.beginPath();
      ctx.arc(w * (0.05 + i * 0.12), h * 0.86, w * 0.07, Math.PI, 0);
      ctx.fill();
    }
    ctx.fillStyle = '#9a9890';
    ctx.fillRect(0, h * 0.86, w, h * 0.14);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  });
}

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

/* ------------------------------------------------------------------ */
/* Restoran: milliy bezaklar (ikat, gilam, so‘zana, majolika, girih, lagan) */
/* ------------------------------------------------------------------ */

const canvasTex = (c: HTMLCanvasElement) => {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
};

/** Iliq krem rang shtukaturka (fasad va ichki devorlar) */
export const stuccoColor = () =>
  cached('stucco', () => {
    const w = 512;
    const h = 512;
    const n = fbm(w, h, 96, 5, 71);
    const c = colorFromNoise(n, w, h, (v) => {
      const g = 222 + v * 26;
      return [g, g * 0.965, g * 0.9];
    });
    return toTexture(c, 3.5, 3.5, true);
  });

/** Iliq rangli tosh plitalar (restoran poli), 0.6 m */
export const stoneWarmColor = () =>
  cached('stoneWarm', () => {
    const w = 512;
    const h = 512;
    const n = fbm(w, h, 64, 4, 73);
    const c = colorFromNoise(n, w, h, (v, x, y) => {
      let g = 196 + v * 30;
      if (x % 256 < 2 || y % 256 < 2) g -= 60;
      return [g, g * 0.92, g * 0.8];
    });
    return toTexture(c, 1.2, 1.2, true);
  });

/** Ikat (abr) mato: vertikal ustunlardagi "olovsimon" romb naqshlar, chetlari tabiiy "yoyilgan" */
export const ikatColor = () =>
  cached('ikat', () => {
    const w = 256;
    const h = 512;
    const c = makeCanvas(w, h);
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#d8c3a0';
    ctx.fillRect(0, 0, w, h);
    seed = 91;
    const cols = ['#5e2418', '#2d4a3a', '#8f5a26', '#3a2c4a', '#7a2238'];
    const motif = (cx: number, cy: number, rw: number, rh: number, col: string) => {
      // har bir qator biroz siljigan — ikatning xarakterli "yoyilgan" chetlari
      for (let y = -rh; y <= rh; y += 2) {
        const k = 1 - Math.abs(y) / rh;
        const half = rw * k + (rnd() - 0.5) * 6;
        const jitter = (rnd() - 0.5) * 4;
        ctx.fillStyle = col;
        ctx.fillRect(cx - half + jitter, cy + y, half * 2, 2);
      }
    };
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 4; j++) {
        const cx = w * (0.25 + i * 0.5);
        const cy = h * (0.125 + j * 0.25) + (i ? h * 0.125 : 0);
        motif(cx, cy, w * 0.2, h * 0.11, cols[(i + j) % cols.length]);
        motif(cx, cy, w * 0.11, h * 0.06, '#d8c3a0');
        motif(cx, cy, w * 0.05, h * 0.03, cols[(i + j + 2) % cols.length]);
      }
    }
    // ingichka vertikal chiziqlar
    ctx.fillStyle = 'rgba(60,20,20,0.35)';
    for (let x = 0; x < w; x += 64) ctx.fillRect(x, 0, 2, h);
    return toTexture(c, 0.45, 0.9, true);
  });

/** Majolika (ko‘k-oq-feruza sopol plitkalar, sakkiz qirrali yulduz) — 0.3 m */
export const majolicaColor = () =>
  cached('majolica', () => {
    const s = 256;
    const c = makeCanvas(s, s);
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#f2efe6';
    ctx.fillRect(0, 0, s, s);
    const star = (cx: number, cy: number, r: number, col: string) => {
      ctx.fillStyle = col;
      ctx.beginPath();
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2;
        const rr = k % 2 === 0 ? r : r * 0.62;
        ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fill();
    };
    for (const [x, y] of [
      [0, 0],
      [s, 0],
      [0, s],
      [s, s],
      [s / 2, s / 2],
    ]) {
      star(x, y, s * 0.36, '#1d3f8a');
      star(x, y, s * 0.24, '#2aa3a8');
      star(x, y, s * 0.1, '#f2efe6');
    }
    ctx.strokeStyle = '#c99a3a';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, s, s);
    return toTexture(c, 0.3, 0.3, true);
  });

/** Girih yog‘och panjara (shiftdagi orqadan yoritilgan panel): to‘q yog‘och va yorug‘ teshiklar */
export const girihColor = () =>
  cached('girih', () => {
    const s = 256;
    const c = makeCanvas(s, s);
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#3a2416';
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = '#ffd9a0';
    const hole = (cx: number, cy: number, r: number) => {
      ctx.beginPath();
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2 + Math.PI / 16;
        const rr = k % 2 === 0 ? r : r * 0.7;
        ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fill();
    };
    for (const [x, y] of [
      [s / 2, s / 2],
      [0, 0],
      [s, 0],
      [0, s],
      [s, s],
    ])
      hole(x, y, s * 0.3);
    for (const [x, y] of [
      [s / 2, 0],
      [0, s / 2],
      [s, s / 2],
      [s / 2, s],
    ])
      hole(x, y, s * 0.12);
    ctx.fillStyle = '#3a2416';
    for (const [x, y] of [
      [s / 2, s / 2],
      [0, 0],
      [s, 0],
      [0, s],
      [s, s],
    ])
      hole(x, y, s * 0.1);
    return toTexture(c, 0.9, 0.9, true);
  });

/** Gilam (qizil fon, markaziy medalyon, chegaralar) — har bir gilamga butun tekstura */
export function carpetTexture(variant = 0) {
  return cached(`carpet-${variant}`, () => {
    const w = 512;
    const h = 768;
    const c = makeCanvas(w, h);
    const ctx = c.getContext('2d')!;
    const field = ['#7d1717', '#6b1420', '#3a2a5a'][variant % 3];
    const navy = '#1d2440';
    const cream = '#e8d9b5';
    const gold = '#c08a3a';
    ctx.fillStyle = navy;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = cream;
    ctx.fillRect(18, 18, w - 36, h - 36);
    ctx.fillStyle = navy;
    ctx.fillRect(30, 30, w - 60, h - 60);
    // chegara naqshi (romblar)
    ctx.fillStyle = gold;
    for (let x = 44; x < w - 44; x += 28) {
      for (const y of [44, h - 44]) {
        ctx.beginPath();
        ctx.moveTo(x, y - 9);
        ctx.lineTo(x + 9, y);
        ctx.lineTo(x, y + 9);
        ctx.lineTo(x - 9, y);
        ctx.fill();
      }
    }
    for (let y = 72; y < h - 44; y += 28) {
      for (const x of [44, w - 44]) {
        ctx.beginPath();
        ctx.moveTo(x, y - 9);
        ctx.lineTo(x + 9, y);
        ctx.lineTo(x, y + 9);
        ctx.lineTo(x - 9, y);
        ctx.fill();
      }
    }
    ctx.fillStyle = field;
    ctx.fillRect(64, 64, w - 128, h - 128);
    // mayda naqshli maydon
    seed = 101 + variant;
    for (let y = 80; y < h - 80; y += 34)
      for (let x = 80; x < w - 80; x += 34) {
        ctx.fillStyle = rnd() < 0.5 ? 'rgba(232,217,181,0.35)' : 'rgba(29,36,64,0.45)';
        ctx.beginPath();
        ctx.moveTo(x, y - 6);
        ctx.lineTo(x + 6, y);
        ctx.lineTo(x, y + 6);
        ctx.lineTo(x - 6, y);
        ctx.fill();
      }
    // markaziy medalyon
    const med = (r: number, col: string) => {
      ctx.fillStyle = col;
      ctx.beginPath();
      for (let k = 0; k < 24; k++) {
        const a = (k / 24) * Math.PI * 2;
        const rr = k % 2 === 0 ? r : r * 0.8;
        ctx.lineTo(w / 2 + Math.cos(a) * rr * 0.8, h / 2 + Math.sin(a) * rr * 1.15);
      }
      ctx.closePath();
      ctx.fill();
    };
    med(150, navy);
    med(124, cream);
    med(98, field);
    med(56, gold);
    med(26, navy);
    // burchak elementlari
    for (const [x, y] of [
      [64, 64],
      [w - 64, 64],
      [64, h - 64],
      [w - 64, h - 64],
    ]) {
      ctx.fillStyle = navy;
      ctx.beginPath();
      ctx.arc(x, y, 70, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = gold;
      ctx.beginPath();
      ctx.arc(x, y, 34, 0, Math.PI * 2);
      ctx.fill();
    }
    return canvasTex(c);
  });
}

/** So‘zana (krem fon, qizil gul-rozetkalar, yashil barglar) */
export function suzaniTexture() {
  return cached('suzani', () => {
    const w = 384;
    const h = 768;
    const c = makeCanvas(w, h);
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#efe2c6';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#8c1d1d';
    ctx.lineWidth = 14;
    ctx.strokeRect(14, 14, w - 28, h - 28);
    const rosette = (cx: number, cy: number, r: number) => {
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2;
        ctx.fillStyle = '#2f5a3a';
        ctx.beginPath();
        ctx.ellipse(cx + Math.cos(a) * r * 1.2, cy + Math.sin(a) * r * 1.2, r * 0.32, r * 0.14, a, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const [rr, col] of [
        [r, '#a3201f'],
        [r * 0.78, '#e8b04a'],
        [r * 0.62, '#a3201f'],
        [r * 0.35, '#2a2f5a'],
        [r * 0.15, '#e8b04a'],
      ] as [number, string][]) {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(cx, cy, rr, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    rosette(w / 2, h * 0.25, 70);
    rosette(w / 2, h * 0.62, 90);
    rosette(w * 0.22, h * 0.86, 30);
    rosette(w * 0.78, h * 0.86, 30);
    rosette(w * 0.22, h * 0.08, 24);
    rosette(w * 0.78, h * 0.08, 24);
    // pastki popuk (tassels)
    ctx.fillStyle = '#7a1a1a';
    for (let x = 20; x < w - 20; x += 16) ctx.fillRect(x, h - 18, 6, 18);
    return canvasTex(c);
  });
}

/** Lagan (sopol likop) — dumaloq, ko‘k naqsh */
export function lyaganTexture(variant = 0) {
  return cached(`lyagan-${variant}`, () => {
    const s = 256;
    const c = makeCanvas(s, s);
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, s, s);
    const cx = s / 2;
    const ring = (r: number, col: string) => {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(cx, cx, r, 0, Math.PI * 2);
      ctx.fill();
    };
    const blue = variant % 2 ? '#1d3f8a' : '#7a2a1a';
    ring(126, blue);
    ring(112, '#f1ead8');
    ctx.fillStyle = blue;
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(cx + Math.cos(a) * 72, cx + Math.sin(a) * 72, 28, 11, a, 0, Math.PI * 2);
      ctx.fill();
    }
    ring(48, '#2aa3a8');
    ring(34, '#f1ead8');
    ring(18, blue);
    return canvasTex(c);
  });
}

/** Fasadni pastdan yorituvchi chiroq izi (konussimon gradient, additive) */
export function uplightTexture() {
  return cached('uplight', () => {
    const w = 128;
    const h = 256;
    const c = makeCanvas(w, h);
    const ctx = c.getContext('2d')!;
    const img = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) {
      const t = y / h; // 0 — tepa, 1 — past (chiroq yonida)
      const spread = 0.22 + 0.78 * (1 - t);
      for (let x = 0; x < w; x++) {
        const dx = Math.abs(x / w - 0.5) / (0.5 * spread);
        let a = Math.max(0, 1 - dx * dx) * Math.pow(t, 1.1) * (1 - Math.pow(t, 30));
        a = Math.min(1, a * 1.3);
        const i = (y * w + x) * 4;
        img.data[i] = 255;
        img.data[i + 1] = 214;
        img.data[i + 2] = 150;
        img.data[i + 3] = Math.round(a * 255);
      }
    }
    ctx.putImageData(img, 0, 0);
    return canvasTex(c);
  });
}
