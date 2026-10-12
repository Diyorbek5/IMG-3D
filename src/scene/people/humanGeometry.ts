import * as THREE from 'three';

/**
 * Protsedural inson modeli: 17 ta suyakli skelet (SkinnedMesh) va silliq, vaznlar bilan bog‘langan sirt.
 * Tashqi fayl yo‘q — har bir xodim uchun kiyim, teri, soch ranglari va aksessuarlar (kaska, jilet,
 * oshpaz qalpog‘i, xalat, galstuk, planshet) alohida generatsiya qilinadi. Bitta xodim — bitta draw call.
 * Lokal koordinatalar: oldinga +z, chap tomon +x, oyoq ostida y = 0, bo‘yi ≈1.75 m (height bilan masshtablanadi).
 */
export const BONE = {
  hips: 0,
  spine: 1,
  chest: 2,
  neck: 3,
  head: 4,
  upperArmL: 5,
  foreArmL: 6,
  handL: 7,
  upperArmR: 8,
  foreArmR: 9,
  handR: 10,
  thighL: 11,
  shinL: 12,
  footL: 13,
  thighR: 14,
  shinR: 15,
  footR: 16,
} as const;

const PARENT = [-1, 0, 1, 2, 3, 2, 5, 6, 2, 8, 9, 0, 11, 12, 0, 14, 15];

type V3 = [number, number, number];
type RGB = [number, number, number];
type W = [number, number][];

/** Suyaklarning dam olish holatidagi (bind pose) dunyo koordinatalari, 1.75 m bo‘yli odam uchun */
const REST: V3[] = [
  [0, 0.97, 0],
  [0, 1.08, 0],
  [0, 1.28, 0],
  [0, 1.5, 0],
  [0, 1.585, 0],
  [0.185, 1.435, 0],
  [0.205, 1.155, -0.005],
  [0.215, 0.895, 0.01],
  [-0.185, 1.435, 0],
  [-0.205, 1.155, -0.005],
  [-0.215, 0.895, 0.01],
  [0.092, 0.925, 0],
  [0.092, 0.51, 0.012],
  [0.092, 0.085, -0.01],
  [-0.092, 0.925, 0],
  [-0.092, 0.51, 0.012],
  [-0.092, 0.085, -0.01],
];

export interface HumanLook {
  height: number;
  /** gavda kengligi koeffitsiyenti (0.9 — ozg‘in, 1.12 — to‘la) */
  build: number;
  female: boolean;
  skin: string;
  hair: string;
  /** soch turi: qisqa, uzun, bog‘langan, kal */
  hairStyle: 'short' | 'long' | 'bun' | 'bald';
  top: string;
  /** yeng rangi (bo‘lmasa — top) */
  sleeve?: string;
  shortSleeves?: boolean;
  bottom: string;
  shoes: string;
  /** yubka (ayollar ofis kiyimi) */
  skirt?: boolean;
  belt?: string;
  vest?: { color: string; stripe: string };
  helmet?: string;
  chefHat?: boolean;
  cap?: string;
  coat?: string;
  tie?: string;
  apron?: string;
  gloves?: string;
  /** o‘ng qo‘lda planshet / bloknot */
  tablet?: boolean;
  /** forma ko‘krak cho‘ntagidagi brend rangli belgi */
  badge?: string;
}

const hex = (c: string): RGB => {
  const col = new THREE.Color(c);
  col.convertSRGBToLinear();
  return [col.r, col.g, col.b];
};

class Mesher {
  pos: number[] = [];
  col: number[] = [];
  si: number[] = [];
  sw: number[] = [];
  idx: number[] = [];

  vert(p: V3, c: RGB, w: W): number {
    const i = this.pos.length / 3;
    this.pos.push(p[0], p[1], p[2]);
    this.col.push(c[0], c[1], c[2]);
    const ws = [...w].sort((a, b) => b[1] - a[1]).slice(0, 4);
    const sum = ws.reduce((a, b) => a + b[1], 0) || 1;
    for (let k = 0; k < 4; k++) {
      this.si.push(ws[k] ? ws[k][0] : 0);
      this.sw.push(ws[k] ? ws[k][1] / sum : 0);
    }
    return i;
  }

  /** uchburchak — tashqi tomonga qaragan holda (outward nuqtasidan uzoqlashadigan normal) */
  tri(a: number, b: number, c: number, inside: V3) {
    const P = (i: number) => [this.pos[i * 3], this.pos[i * 3 + 1], this.pos[i * 3 + 2]] as V3;
    const pa = P(a);
    const pb = P(b);
    const pc = P(c);
    const ux = pb[0] - pa[0];
    const uy = pb[1] - pa[1];
    const uz = pb[2] - pa[2];
    const vx = pc[0] - pa[0];
    const vy = pc[1] - pa[1];
    const vz = pc[2] - pa[2];
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    const mx = (pa[0] + pb[0] + pc[0]) / 3 - inside[0];
    const my = (pa[1] + pb[1] + pc[1]) / 3 - inside[1];
    const mz = (pa[2] + pb[2] + pc[2]) / 3 - inside[2];
    if (nx * mx + ny * my + nz * mz >= 0) this.idx.push(a, b, c);
    else this.idx.push(a, c, b);
  }
}

interface Ring {
  c: V3;
  ru: number;
  rv: number;
  col: RGB;
  w: W;
  /** halqa tekisligi: 'y' — gorizontal (vertikal naycha), 'z' — oldinga yo‘nalgan naycha */
  axis?: 'y' | 'z';
}

/** Halqalar ketma-ketligidan silliq naycha (rang o‘zgarganda chegara halqasi takrorlanadi) */
function tube(m: Mesher, rings: Ring[], n: number, capStart = true, capEnd = true) {
  const rows: number[][] = [];
  const centers: V3[] = [];
  const pushRing = (r: Ring) => {
    const row: number[] = [];
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const p: V3 = r.axis === 'z' ? [r.c[0] + ca * r.ru, r.c[1] + sa * r.rv, r.c[2]] : [r.c[0] + ca * r.ru, r.c[1], r.c[2] + sa * r.rv];
      row.push(m.vert(p, r.col, r.w));
    }
    rows.push(row);
    centers.push(r.c);
  };
  rings.forEach((r, i) => {
    if (i > 0) {
      const prev = rings[i - 1];
      if (prev.col.some((v, k) => Math.abs(v - r.col[k]) > 1e-4)) pushRing({ ...prev, col: r.col });
    }
    pushRing(r);
  });
  for (let i = 0; i + 1 < rows.length; i++) {
    const A = rows[i];
    const B = rows[i + 1];
    const inside: V3 = [(centers[i][0] + centers[i + 1][0]) / 2, (centers[i][1] + centers[i + 1][1]) / 2, (centers[i][2] + centers[i + 1][2]) / 2];
    for (let k = 0; k < n; k++) {
      const k2 = (k + 1) % n;
      m.tri(A[k], B[k], B[k2], inside);
      m.tri(A[k], B[k2], A[k2], inside);
    }
  }
  const cap = (ri: number, other: number) => {
    const r = rings[ri === 0 ? 0 : rings.length - 1];
    const row = rows[ri];
    const c = m.vert(r.c, r.col, r.w);
    const inside = centers[other];
    for (let k = 0; k < n; k++) m.tri(c, row[k], row[(k + 1) % n], inside);
  };
  if (capStart && rows.length > 1) cap(0, 1);
  if (capEnd && rows.length > 1) cap(rows.length - 1, rows.length - 2);
}

/**
 * Ellipsoid (yoki uning bir qismi). latMax(lon) — har bir meridian uchun pastki chegara (radian, 0 — tepa).
 * shape(lat) — kenglik bo‘yicha x/z siqish (masalan, jag‘ toraytirish).
 */
function ellipsoid(
  m: Mesher,
  c: V3,
  r: V3,
  col: RGB,
  w: W,
  opts: { nLon?: number; nLat?: number; latMax?: (lon: number) => number; shape?: (lat: number) => [number, number, number]; flipY?: boolean } = {},
) {
  const nLon = opts.nLon ?? 12;
  const nLat = opts.nLat ?? 8;
  const grid: number[][] = [];
  for (let j = 0; j <= nLat; j++) {
    const row: number[] = [];
    for (let i = 0; i < nLon; i++) {
      const lon = (i / nLon) * Math.PI * 2;
      const lm = opts.latMax ? opts.latMax(lon) : Math.PI;
      const lat = (j / nLat) * lm;
      const [sx, sz, dz] = opts.shape ? opts.shape(lat) : [1, 1, 0];
      const sl = Math.sin(lat);
      const p: V3 = [c[0] + r[0] * sl * Math.sin(lon) * sx, c[1] + r[1] * Math.cos(lat) * (opts.flipY ? -1 : 1), c[2] + r[2] * sl * Math.cos(lon) * sz + dz * r[2]];
      row.push(j === 0 && i > 0 ? row[0] : m.vert(p, col, w));
    }
    grid.push(row);
  }
  for (let j = 0; j < nLat; j++) {
    for (let i = 0; i < nLon; i++) {
      const i2 = (i + 1) % nLon;
      const a = grid[j][i];
      const b = grid[j][i2];
      const cc = grid[j + 1][i];
      const d = grid[j + 1][i2];
      if (j > 0) m.tri(a, b, d, c);
      m.tri(a, d, cc, c);
    }
  }
}

function box(m: Mesher, c: V3, s: V3, col: RGB, w: W) {
  const [hx, hy, hz] = [s[0] / 2, s[1] / 2, s[2] / 2];
  const v: number[] = [];
  for (const dx of [-1, 1]) for (const dy of [-1, 1]) for (const dz of [-1, 1]) v.push(m.vert([c[0] + dx * hx, c[1] + dy * hy, c[2] + dz * hz], col, w));
  const f = [
    [0, 1, 3, 2],
    [4, 6, 7, 5],
    [0, 4, 5, 1],
    [2, 3, 7, 6],
    [0, 2, 6, 4],
    [1, 5, 7, 3],
  ];
  for (const q of f) {
    m.tri(v[q[0]], v[q[1]], v[q[2]], c);
    m.tri(v[q[0]], v[q[2]], v[q[3]], c);
  }
}

const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

export interface HumanAsset {
  geometry: THREE.BufferGeometry;
  /** suyaklarning ota-suyakka nisbatan dam olish pozitsiyalari */
  restLocal: V3[];
  parents: number[];
  scale: number;
}

/** Bitta xodim geometriyasini yaratadi */
export function buildHuman(look: HumanLook): HumanAsset {
  const m = new Mesher();
  const s = look.height / 1.75;
  const bw = look.build * (look.female ? 0.92 : 1);
  const B = BONE;
  const skin = hex(look.skin);
  const skinDark = mix(skin, [0.05, 0.02, 0.02], 0.25);
  const hair = hex(look.hair);
  const top = hex(look.coat ?? look.top);
  const sleeve = hex(look.coat ?? look.sleeve ?? look.top);
  const bottom = hex(look.bottom);
  const shoes = hex(look.shoes);
  const N = 12;
  const fem = look.female;

  /* ---- oyoqlar (shim yoki yubka ostida teri) ---- */
  for (const side of [1, -1]) {
    const th = side > 0 ? B.thighL : B.thighR;
    const sh = side > 0 ? B.shinL : B.shinR;
    const ft = side > 0 ? B.footL : B.footR;
    const x = 0.092 * side;
    const legCol = (y: number) => (look.skirt && y < 0.58 ? skin : bottom);
    const k = fem ? 0.92 : 1;
    const rings: Ring[] = [
      { c: [x, 0.99, 0], ru: 0.088 * bw * k, rv: 0.095 * bw * k, col: legCol(0.99), w: [[th, 0.6], [B.hips, 0.4]] },
      { c: [x, 0.9, 0], ru: 0.088 * bw * k, rv: 0.095 * bw * k, col: legCol(0.9), w: [[th, 1]] },
      { c: [x, 0.76, 0.005], ru: 0.077 * bw * k, rv: 0.083 * bw * k, col: legCol(0.76), w: [[th, 1]] },
      { c: [x * 0.98, 0.6, 0.01], ru: 0.062 * bw * k, rv: 0.066 * bw * k, col: legCol(0.6), w: [[th, 0.85], [sh, 0.15]] },
      { c: [x * 0.97, 0.51, 0.015], ru: 0.057 * bw, rv: 0.06 * bw, col: legCol(0.51), w: [[th, 0.5], [sh, 0.5]] },
      { c: [x * 0.97, 0.43, 0.008], ru: 0.056 * bw, rv: 0.06 * bw, col: legCol(0.43), w: [[sh, 0.85], [th, 0.15]] },
      { c: [x * 0.98, 0.33, -0.008], ru: 0.06 * bw, rv: 0.066 * bw, col: legCol(0.33), w: [[sh, 1]] },
      { c: [x, 0.2, -0.004], ru: 0.046 * bw, rv: 0.048 * bw, col: legCol(0.2), w: [[sh, 1]] },
      { c: [x, 0.11, -0.008], ru: 0.042 * bw, rv: 0.044 * bw, col: legCol(0.11), w: [[sh, 0.6], [ft, 0.4]] },
    ];
    tube(m, rings, N, false, true);
    // poyabzal
    const sz = fem ? 0.92 : 1;
    tube(
      m,
      [
        { c: [x, 0.06, -0.075 * sz], ru: 0.042, rv: 0.045, col: shoes, w: [[ft, 1]], axis: 'z' },
        { c: [x, 0.065, -0.045 * sz], ru: 0.05, rv: 0.06, col: shoes, w: [[ft, 1]], axis: 'z' },
        { c: [x, 0.055, 0.04 * sz], ru: 0.052, rv: 0.052, col: shoes, w: [[ft, 1]], axis: 'z' },
        { c: [x, 0.045, 0.13 * sz], ru: 0.048, rv: 0.04, col: shoes, w: [[ft, 1]], axis: 'z' },
        { c: [x, 0.035, 0.175 * sz], ru: 0.034, rv: 0.026, col: shoes, w: [[ft, 1]], axis: 'z' },
      ],
      10,
    );
  }

  /* ---- yubka ---- */
  if (look.skirt) {
    tube(
      m,
      [
        { c: [0, 1.0, 0], ru: 0.16 * bw, rv: 0.11 * bw, col: bottom, w: [[B.hips, 1]] },
        { c: [0, 0.86, 0], ru: 0.185 * bw, rv: 0.13 * bw, col: bottom, w: [[B.hips, 0.8], [B.thighL, 0.1], [B.thighR, 0.1]] },
        { c: [0, 0.6, 0.01], ru: 0.2 * bw, rv: 0.145 * bw, col: bottom, w: [[B.hips, 0.6], [B.thighL, 0.2], [B.thighR, 0.2]] },
      ],
      N,
      false,
      false,
    );
  }

  /* ---- gavda ---- */
  const female = fem ? 1 : 0;
  const torsoCol = (y: number): RGB => (y < 1.03 ? bottom : top);
  const belt = look.belt ? hex(look.belt) : null;
  const torso: Ring[] = [
    { c: [0, 0.86, 0], ru: 0.11 * bw, rv: 0.085 * bw, col: bottom, w: [[B.hips, 1]] },
    { c: [0, 0.92, 0], ru: (0.155 + 0.012 * female) * bw, rv: 0.105 * bw, col: bottom, w: [[B.hips, 1]] },
    { c: [0, 0.99, -0.005], ru: (0.163 + 0.012 * female) * bw, rv: 0.112 * bw, col: torsoCol(0.99), w: [[B.hips, 1]] },
    ...(belt
      ? ([
          { c: [0, 1.025, 0], ru: 0.152 * bw, rv: 0.104 * bw, col: belt, w: [[B.hips, 0.8], [B.spine, 0.2]] },
          { c: [0, 1.055, 0], ru: 0.15 * bw, rv: 0.103 * bw, col: belt, w: [[B.hips, 0.6], [B.spine, 0.4]] },
        ] as Ring[])
      : []),
    { c: [0, 1.07, 0], ru: (0.148 - 0.01 * female) * bw, rv: 0.102 * bw, col: top, w: [[B.spine, 0.7], [B.hips, 0.3]] },
    { c: [0, 1.16, 0.004], ru: (0.15 - 0.012 * female) * bw, rv: 0.104 * bw, col: top, w: [[B.spine, 1]] },
    { c: [0, 1.25, 0.008], ru: 0.158 * bw, rv: (0.11 + 0.012 * female) * bw, col: top, w: [[B.spine, 0.45], [B.chest, 0.55]] },
    { c: [0, 1.33, 0.01], ru: (0.172 - 0.01 * female) * bw, rv: (0.118 + 0.01 * female) * bw, col: top, w: [[B.chest, 1]] },
    { c: [0, 1.4, 0.004], ru: (0.182 - 0.016 * female) * bw, rv: 0.112 * bw, col: top, w: [[B.chest, 1]] },
    { c: [0, 1.455, -0.004], ru: (0.165 - 0.016 * female) * bw, rv: 0.095 * bw, col: top, w: [[B.chest, 1]] },
    { c: [0, 1.49, -0.008], ru: 0.085, rv: 0.065, col: top, w: [[B.chest, 0.7], [B.neck, 0.3]] },
  ];
  tube(m, torso, N + 2, true, true);
  // yelka (deltasimon) — qo‘l bilan gavdani silliq ulaydi
  for (const side of [1, -1]) {
    const ua = side > 0 ? B.upperArmL : B.upperArmR;
    ellipsoid(m, [0.165 * side * bw, 1.418, -0.004], [0.056 * bw, 0.05, 0.06], sleeve, [[ua, 0.5], [B.chest, 0.5]], { nLon: 12, nLat: 7 });
  }

  /* ---- jilet (ko‘rinadigan signal jilet) ---- */
  if (look.vest) {
    const vc = hex(look.vest.color);
    const st = hex(look.vest.stripe);
    const k = 1.06;
    const rings: Ring[] = [
      { c: [0, 1.0, -0.003], ru: 0.166 * bw * k, rv: 0.114 * bw * k, col: vc, w: [[B.hips, 1]] },
      { c: [0, 1.07, 0], ru: 0.151 * bw * k, rv: 0.105 * bw * k, col: vc, w: [[B.spine, 0.7], [B.hips, 0.3]] },
      { c: [0, 1.12, 0.002], ru: 0.15 * bw * k, rv: 0.104 * bw * k, col: st, w: [[B.spine, 1]] },
      { c: [0, 1.15, 0.003], ru: 0.15 * bw * k, rv: 0.104 * bw * k, col: st, w: [[B.spine, 1]] },
      { c: [0, 1.16, 0.004], ru: 0.151 * bw * k, rv: 0.105 * bw * k, col: vc, w: [[B.spine, 1]] },
      { c: [0, 1.25, 0.008], ru: 0.159 * bw * k, rv: 0.111 * bw * k, col: vc, w: [[B.spine, 0.45], [B.chest, 0.55]] },
      { c: [0, 1.3, 0.009], ru: 0.166 * bw * k, rv: 0.115 * bw * k, col: st, w: [[B.chest, 1]] },
      { c: [0, 1.33, 0.01], ru: 0.172 * bw * k, rv: 0.118 * bw * k, col: st, w: [[B.chest, 1]] },
      { c: [0, 1.34, 0.01], ru: 0.174 * bw * k, rv: 0.118 * bw * k, col: vc, w: [[B.chest, 1]] },
      { c: [0, 1.43, 0.0], ru: 0.17 * bw * k, rv: 0.106 * bw * k, col: vc, w: [[B.chest, 1]] },
    ];
    tube(m, rings, N + 2, false, false);
  }

  /* ---- xalat yoki fartuk (pastki etak) ---- */
  if (look.coat) {
    const cc = hex(look.coat);
    tube(
      m,
      [
        { c: [0, 1.0, 0], ru: 0.175 * bw, rv: 0.122 * bw, col: cc, w: [[B.hips, 1]] },
        { c: [0, 0.8, 0], ru: 0.2 * bw, rv: 0.14 * bw, col: cc, w: [[B.hips, 0.7], [B.thighL, 0.15], [B.thighR, 0.15]] },
        { c: [0, 0.58, 0.01], ru: 0.215 * bw, rv: 0.15 * bw, col: cc, w: [[B.hips, 0.5], [B.thighL, 0.25], [B.thighR, 0.25]] },
      ],
      N,
      false,
      false,
    );
  }
  if (look.apron) {
    const ac = hex(look.apron);
    box(m, [0, 0.92, 0.112 * bw], [0.27 * bw, 0.5, 0.012], ac, [[B.hips, 1]]);
    box(m, [0, 1.25, 0.121 * bw], [0.22 * bw, 0.28, 0.012], ac, [[B.chest, 0.6], [B.spine, 0.4]]);
  }
  if (look.tie) box(m, [0, 1.3, 0.122 * bw], [0.035, 0.26, 0.01], hex(look.tie), [[B.chest, 1]]);
  if (look.badge) box(m, [0.07 * bw, 1.36, 0.122 * bw], [0.05, 0.03, 0.008], hex(look.badge), [[B.chest, 1]]);

  /* ---- qo‘llar ---- */
  for (const side of [1, -1]) {
    const ua = side > 0 ? B.upperArmL : B.upperArmR;
    const fa = side > 0 ? B.foreArmL : B.foreArmR;
    const hd = side > 0 ? B.handL : B.handR;
    const x = (v: number) => v * side;
    const a = fem ? 0.88 : 1;
    const sleeveEnd = look.shortSleeves ? 1.22 : 0.92;
    const armCol = (y: number) => (y >= sleeveEnd ? sleeve : skin);
    const rings: Ring[] = [
      { c: [x(0.186 * bw), 1.43, 0], ru: 0.054 * a * bw, rv: 0.058 * a * bw, col: armCol(1.43), w: [[ua, 0.8], [B.chest, 0.2]] },
      { c: [x(0.19 * bw), 1.35, -0.004], ru: 0.05 * a * bw, rv: 0.053 * a * bw, col: armCol(1.35), w: [[ua, 1]] },
      { c: [x(0.196 * bw), 1.24, -0.006], ru: 0.044 * a * bw, rv: 0.046 * a * bw, col: armCol(1.24), w: [[ua, 1]] },
      ...(look.shortSleeves
        ? ([{ c: [x(0.198 * bw), 1.215, -0.006], ru: 0.042 * a * bw, rv: 0.044 * a * bw, col: skin, w: [[ua, 1]] }] as Ring[])
        : []),
      { c: [x(0.2 * bw), 1.155, -0.006], ru: 0.039 * a * bw, rv: 0.04 * a * bw, col: armCol(1.155), w: [[ua, 0.5], [fa, 0.5]] },
      { c: [x(0.204 * bw), 1.08, -0.003], ru: 0.039 * a * bw, rv: 0.041 * a * bw, col: armCol(1.08), w: [[fa, 0.9], [ua, 0.1]] },
      { c: [x(0.208 * bw), 0.98, 0.003], ru: 0.033 * a, rv: 0.035 * a, col: armCol(0.98), w: [[fa, 1]] },
      { c: [x(0.212 * bw), 0.91, 0.008], ru: 0.026 * a, rv: 0.03 * a, col: armCol(0.91), w: [[fa, 0.7], [hd, 0.3]] },
    ];
    tube(m, rings, 10, false, true);
    // kaft (barmoqlar yig‘ilgan) va bosh barmoq
    const hc = look.gloves ? hex(look.gloves) : skin;
    ellipsoid(m, [x(0.214 * bw), 0.835, 0.014], [0.024 * a, 0.062 * a, 0.042 * a], hc, [[hd, 1]], { nLon: 10, nLat: 6 });
    ellipsoid(m, [x(0.202 * bw), 0.86, 0.045], [0.012, 0.03, 0.013], hc, [[hd, 1]], { nLon: 6, nLat: 4 });
  }
  if (look.tablet) box(m, [-0.214 * bw, 0.8, 0.05], [0.012, 0.2, 0.15], [0.04, 0.045, 0.05], [[B.handR, 1]]);

  /* ---- bo‘yin va bosh ---- */
  tube(
    m,
    [
      { c: [0, 1.46, -0.005], ru: 0.05, rv: 0.052, col: skin, w: [[B.neck, 0.6], [B.chest, 0.4]] },
      { c: [0, 1.53, 0.0], ru: 0.047 * (fem ? 0.9 : 1), rv: 0.05, col: skin, w: [[B.neck, 1]] },
      { c: [0, 1.585, 0.005], ru: 0.048, rv: 0.05, col: skin, w: [[B.head, 0.7], [B.neck, 0.3]] },
    ],
    10,
    false,
    false,
  );
  const hc: V3 = [0, 1.655, 0.012];
  const hr: V3 = [0.077 * (fem ? 0.95 : 1), 0.108 * (fem ? 0.97 : 1), 0.094];
  // bosh: pastki qismi (jag‘) toraytirilgan, iyak oldinga
  ellipsoid(m, hc, hr, skin, [[B.head, 1]], {
    nLon: 14,
    nLat: 10,
    shape: (lat) => {
      const t = Math.max(0, (lat - Math.PI * 0.55) / (Math.PI * 0.45));
      return [1 - 0.28 * t, 1 - 0.12 * t, 0.06 * t];
    },
  });
  // burun, quloqlar, lablar, ko‘zlar, qoshlar
  ellipsoid(m, [0, hc[1] - 0.012, hc[2] + 0.088], [0.013, 0.024, 0.02], skinDark, [[B.head, 1]], { nLon: 8, nLat: 5 });
  for (const sx of [1, -1]) ellipsoid(m, [sx * (hr[0] + 0.002), hc[1] - 0.005, hc[2] - 0.005], [0.011, 0.026, 0.018], skinDark, [[B.head, 1]], { nLon: 6, nLat: 4 });
  ellipsoid(m, [0, hc[1] - 0.058, hc[2] + 0.08], [0.021, 0.006, 0.008], mix(skin, [0.35, 0.05, 0.05], 0.35), [[B.head, 1]], { nLon: 8, nLat: 4 });
  for (const sx of [1, -1]) {
    ellipsoid(m, [sx * 0.03, hc[1] + 0.012, hc[2] + 0.087], [0.013, 0.008, 0.006], [0.85, 0.85, 0.83], [[B.head, 1]], { nLon: 8, nLat: 4 });
    ellipsoid(m, [sx * 0.03, hc[1] + 0.012, hc[2] + 0.093], [0.006, 0.006, 0.003], [0.02, 0.015, 0.012], [[B.head, 1]], { nLon: 6, nLat: 4 });
    box(m, [sx * 0.031, hc[1] + 0.031, hc[2] + 0.09], [0.03, 0.006, 0.008], mix(hair, [0, 0, 0], 0.2), [[B.head, 1]]);
  }

  /* ---- soch ---- */
  if (look.hairStyle !== 'bald') {
    const k: V3 = [hr[0] * 1.08, hr[1] * 1.04, hr[2] * 1.08];
    ellipsoid(m, [hc[0], hc[1] + 0.006, hc[2] - 0.004], k, hair, [[B.head, 1]], {
      nLon: 14,
      nLat: 7,
      // old tomonda peshona ochiq, orqada sochlar pastroq tushadi
      latMax: (lon) => {
        const back = (1 - Math.cos(lon)) / 2;
        return Math.PI * (0.36 + 0.3 * back + (look.hairStyle === 'long' ? 0.08 * back : 0));
      },
    });
    if (look.hairStyle === 'long')
      ellipsoid(m, [0, hc[1] - 0.09, hc[2] - 0.06], [0.085, 0.14, 0.05], hair, [[B.head, 0.6], [B.neck, 0.4]], { nLon: 12, nLat: 7 });
    if (look.hairStyle === 'bun') ellipsoid(m, [0, hc[1] + 0.03, hc[2] - 0.105], [0.04, 0.04, 0.035], hair, [[B.head, 1]], { nLon: 8, nLat: 6 });
  }

  /* ---- bosh kiyimlar ---- */
  if (look.helmet) {
    const h = hex(look.helmet);
    ellipsoid(m, [0, hc[1] + 0.03, hc[2]], [0.106, 0.098, 0.12], h, [[B.head, 1]], { nLon: 16, nLat: 6, latMax: () => Math.PI * 0.5 });
    tube(m, [{ c: [0, hc[1] + 0.03, hc[2] + 0.01], ru: 0.122, rv: 0.15, col: h, w: [[B.head, 1]] }, { c: [0, hc[1] + 0.022, hc[2] + 0.01], ru: 0.122, rv: 0.15, col: h, w: [[B.head, 1]] }], 16);
    box(m, [0, hc[1] + 0.11, hc[2]], [0.03, 0.03, 0.22], h, [[B.head, 1]]);
  }
  if (look.chefHat) {
    const w: RGB = [0.92, 0.92, 0.9];
    tube(m, [{ c: [0, hc[1] + 0.05, hc[2]], ru: 0.086, rv: 0.1, col: w, w: [[B.head, 1]] }, { c: [0, hc[1] + 0.17, hc[2]], ru: 0.09, rv: 0.104, col: w, w: [[B.head, 1]] }], 14, false, false);
    ellipsoid(m, [0, hc[1] + 0.19, hc[2]], [0.105, 0.06, 0.118], w, [[B.head, 1]], { nLon: 14, nLat: 6 });
  }
  if (look.cap) {
    const cc = hex(look.cap);
    ellipsoid(m, [0, hc[1] + 0.035, hc[2]], [0.088, 0.08, 0.104], cc, [[B.head, 1]], { nLon: 14, nLat: 6, latMax: () => Math.PI * 0.5 });
    box(m, [0, hc[1] + 0.035, hc[2] + 0.13], [0.15, 0.012, 0.08], cc, [[B.head, 1]]);
  }

  /* ---- geometriya ---- */
  const g = new THREE.BufferGeometry();
  const P = new Float32Array(m.pos.map((v) => v * s));
  g.setAttribute('position', new THREE.BufferAttribute(P, 3));
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(m.col), 3));
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(m.si, 4));
  g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(m.sw, 4));
  g.setIndex(m.idx);
  g.computeVertexNormals();
  g.computeBoundingSphere();
  if (g.boundingSphere) g.boundingSphere.radius += 0.6 * s;

  const restLocal: V3[] = REST.map((p, i) => {
    const par = PARENT[i];
    const q = par < 0 ? p : ([p[0] - REST[par][0], p[1] - REST[par][1], p[2] - REST[par][2]] as V3);
    return [q[0] * s, q[1] * s, q[2] * s];
  });
  return { geometry: g, restLocal, parents: PARENT, scale: s };
}

/** Skelet (suyaklar ierarxiyasi) — har bir xodim uchun alohida */
export function createSkeleton(asset: HumanAsset) {
  const bones = asset.restLocal.map(() => new THREE.Bone());
  bones.forEach((b, i) => {
    b.position.set(...asset.restLocal[i]);
    const par = asset.parents[i];
    if (par >= 0) bones[par].add(b);
  });
  // teskari bog‘lash matritsalari dam olish holatidan hisoblanadi
  bones[0].updateMatrixWorld(true);
  return { bones, skeleton: new THREE.Skeleton(bones) };
}
