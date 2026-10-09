import { factoryConfig } from '../../config/factoryConfig';
import { GeoBuilder, type MatKey } from '../../three/GeoBuilder';
import { getSegments, HALF_W, rollerDoors, showroomRect, type SegmentLayout } from '../../lib/layout';
import { FLOOR_Y } from '../../lib/lineLayout';

/**
 * Asosiy bino qobig‘ining sof (pure) geometriya quruvchilari.
 * Barcha o‘lchamlar factoryConfig dan olinadi — qiymat o‘zgarsa, geometriya ham o‘zgaradi.
 * Natija material kalitlari bo‘yicha guruhlangan geometriyalar (GeoBuilder).
 */

export interface Hole {
  a0: number;
  a1: number;
  y0: number;
  y1: number;
}

/**
 * Teshiklari bo‘lgan devor.
 * axis = 'x' — devor x bo‘ylab cho‘zilgan (normal z bo‘yicha), `fixed` — devor tashqi yuzasining z koordinatasi.
 * axis = 'z' — devor z bo‘ylab cho‘zilgan (normal x bo‘yicha), `fixed` — tashqi yuzaning x koordinatasi.
 * inward — devor qalinligi qaysi tomonga (+1/−1).
 */
export function wallWithHoles(
  b: GeoBuilder,
  key: MatKey,
  axis: 'x' | 'z',
  fixed: number,
  inward: 1 | -1,
  a0: number,
  a1: number,
  y0: number,
  y1: number,
  holes: Hole[],
  t: number,
) {
  const ys = new Set<number>([y0, y1]);
  for (const h of holes) {
    if (h.y0 > y0 && h.y0 < y1) ys.add(h.y0);
    if (h.y1 > y0 && h.y1 < y1) ys.add(h.y1);
  }
  const ylist = [...ys].sort((p, q) => p - q);
  const c0 = fixed;
  const c1 = fixed + inward * t;
  for (let i = 0; i < ylist.length - 1; i++) {
    const ya = ylist[i];
    const yb = ylist[i + 1];
    const ym = (ya + yb) / 2;
    const cut = holes
      .filter((h) => h.y0 <= ym && h.y1 >= ym)
      .map((h) => [Math.max(a0, h.a0), Math.min(a1, h.a1)] as [number, number])
      .filter(([p, q]) => q > p)
      .sort((p, q) => p[0] - q[0]);
    let cur = a0;
    const spans: [number, number][] = [];
    for (const [p, q] of cut) {
      if (p > cur + 1e-3) spans.push([cur, p]);
      cur = Math.max(cur, q);
    }
    if (a1 > cur + 1e-3) spans.push([cur, a1]);
    for (const [p, q] of spans) {
      if (axis === 'x') b.boxMinMax(key, p, ya, Math.min(c0, c1), q, yb, Math.max(c0, c1));
      else b.boxMinMax(key, Math.min(c0, c1), ya, p, Math.max(c0, c1), yb, q);
    }
  }
}

/** Vitraj (shisha + alyuminiy profillar). outward — tashqi tomon normali yo‘nalishi. */
export function curtainWall(
  glass: GeoBuilder,
  frame: GeoBuilder,
  axis: 'x' | 'z',
  fixed: number,
  a0: number,
  a1: number,
  y0: number,
  y1: number,
  mullion: number,
  transoms: number[],
  opts: { depth?: number; frameKey?: MatKey; glassKey?: MatKey; heavyEvery?: number } = {},
) {
  const depth = opts.depth ?? 0.16;
  const fk = opts.frameKey ?? 'aluDark';
  const gk = opts.glassKey ?? 'glass';
  const len = a1 - a0;
  const h = y1 - y0;
  // shisha tekisligi
  if (axis === 'x') glass.box(gk, [(a0 + a1) / 2, (y0 + y1) / 2, fixed], [len, h, 0.02]);
  else glass.box(gk, [fixed, (y0 + y1) / 2, (a0 + a1) / 2], [0.02, h, len]);
  // vertikal profillar
  const n = Math.max(1, Math.round(len / mullion));
  for (let i = 0; i <= n; i++) {
    const a = a0 + (len * i) / n;
    const heavy = opts.heavyEvery && i % opts.heavyEvery === 0;
    const w = heavy ? 0.12 : 0.06;
    const d = heavy ? depth * 1.6 : depth;
    if (axis === 'x') frame.box(fk, [a, (y0 + y1) / 2, fixed], [w, h, d]);
    else frame.box(fk, [fixed, (y0 + y1) / 2, a], [d, h, w]);
  }
  // gorizontal profillar
  for (const y of [y0, ...transoms.filter((ty) => ty > y0 + 0.05 && ty < y1 - 0.05), y1]) {
    const th = y === y0 || y === y1 ? 0.1 : 0.07;
    if (axis === 'x') frame.box(fk, [(a0 + a1) / 2, y, fixed], [len, th, depth]);
    else frame.box(fk, [fixed, y, (a0 + a1) / 2], [depth, th, len]);
  }
}

/** Ma’lum oraliqdagi transom balandliklari */
const transomLevels = (y0: number, y1: number, step: number) => {
  const out: number[] = [];
  for (let y = y0 + step; y < y1 - 0.3; y += step) out.push(y);
  return out;
};

export interface ShellParts {
  /** devorlar, poydevor, fasad detallari */
  shell: GeoBuilder;
  /** shisha yuzalar (soyasiz) */
  glass: GeoBuilder;
  /** tom, fermalar, tomdagi uskunalar — "kesim" rejimida yashiriladi */
  roof: GeoBuilder;
  /** ikkinchi qavat (oxirgi qism) — alohida yoqib-o‘chiriladi */
  upper: GeoBuilder;
  upperGlass: GeoBuilder;
  /** ichki pol, ustunlar, bo‘linmalar */
  interior: GeoBuilder;
}

/** Segment bo‘ylab ribbon (lenta) derazalar balandligi */
function ribbonFor(seg: SegmentLayout): [number, number] | null {
  if (seg.id === 'rear') return null;
  if (seg.height >= 9) return [seg.height - 3.5, seg.height - 2.3];
  return [seg.height - 2.25, seg.height - 1.3];
}

export function buildMainShell(cfg = factoryConfig): ShellParts {
  const shell = new GeoBuilder();
  const glass = new GeoBuilder();
  const roof = new GeoBuilder();
  const upper = new GeoBuilder();
  const upperGlass = new GeoBuilder();
  const interior = new GeoBuilder();
  const segs = getSegments(cfg);
  const t = cfg.building.wallThickness;
  const P = cfg.building.parapetHeight;
  const L = cfg.building.totalLength;
  const W = HALF_W;
  const plinth = 0.6;
  const gc = cfg.glassCorner;
  const sign = gc.side === 'east' ? 1 : -1;
  const glassX0 = sign > 0 ? W - gc.facadeWidth : -W;
  const glassX1 = sign > 0 ? W : -W + gc.facadeWidth;
  const sr = showroomRect(cfg);
  const front = segs[0];

  /* ---------- Poydevor va pol ---------- */
  shell.boxMinMax('concreteDark', -W - 0.05, -0.3, -0.05, W + 0.05, FLOOR_Y, L + 0.05);
  interior.boxMinMax('floor', -W + t, FLOOR_Y - 0.02, t, W - t, FLOOR_Y + 0.001, L - t);

  /* ---------- Yon devorlar (sharq/g‘arb) ---------- */
  for (const side of [-1, 1] as const) {
    const x = side * W;
    for (const seg of segs) {
      const holes: Hole[] = [];
      const rb = ribbonFor(seg);
      const isGlassSide = side === sign;
      // shisha burchakning yon qismi
      let glassZ1 = seg.z0;
      if (isGlassSide && seg.z0 < gc.sideDepth) {
        glassZ1 = Math.min(seg.z1, gc.sideDepth);
        holes.push({ a0: seg.z0, a1: glassZ1, y0: 0, y1: seg.height - P });
        curtainWall(glass, shell, 'z', x, seg.z0 + 0.02, glassZ1, FLOOR_Y, seg.height - P, gc.mullionSpacing, transomLevels(FLOOR_Y, seg.height - P, gc.transomSpacing), { heavyEvery: 4 });
      }
      if (rb) {
        const za = Math.max(seg.z0 + 1.2, glassZ1 + 1.2);
        const zb = seg.z1 - 1.2;
        if (zb > za) {
          holes.push({ a0: za, a1: zb, y0: rb[0], y1: rb[1] });
          curtainWall(glass, shell, 'z', x + side * -0.05, za, zb, rb[0], rb[1], 1.5, [], { glassKey: 'glassTint', depth: 0.12 });
        }
      }
      // galereya ochig‘i (xomashyo ombori bilan bog‘lanish)
      const gal = cfg.rawWarehouse.gallery;
      if (side === 1 && seg.id === 'production' && gal.z0 >= seg.z0 && gal.z1 <= seg.z1) {
        holes.push({ a0: gal.z0, a1: gal.z1, y0: 0, y1: Math.min(gal.height - 0.6, seg.height - P - 0.4) });
      }
      if (seg.id === 'rear') {
        // ikki qavatli: ikki qator derazalar
        const zc = (seg.z0 + seg.z1) / 2;
        const ff = cfg.building.rearFirstFloorHeight;
        for (const [wy0, wy1, target] of [
          [1.0, ff - 1.1, 'lower'],
          [ff + 0.9, seg.height - P - 0.6, 'upper'],
        ] as const) {
          for (const dz of [-2.6, 2.6]) {
            const hz0 = zc + dz - 1.1;
            const hz1 = zc + dz + 1.1;
            holes.push({ a0: hz0, a1: hz1, y0: wy0, y1: wy1 });
            curtainWall(target === 'upper' ? upperGlass : glass, target === 'upper' ? upper : shell, 'z', x + side * -0.08, hz0, hz1, wy0, wy1, 1.1, [], {
              glassKey: 'glassTint',
              depth: 0.12,
            });
          }
        }
      }
      const tgtLower = shell;
      if (seg.id === 'rear') {
        const ff = cfg.building.rearFirstFloorHeight;
        wallWithHoles(tgtLower, 'cladding', 'z', x, side > 0 ? -1 : 1, seg.z0, seg.z1, plinth, ff, holes, t);
        wallWithHoles(upper, 'cladding', 'z', x, side > 0 ? -1 : 1, seg.z0, seg.z1, ff, seg.height, holes, t);
        // qavatlararo belbog‘ (tashqaridan ikkinchi qavatni ko‘rsatadi)
        shell.boxMinMax('claddingDark', side > 0 ? W - 0.02 : -W - 0.12, ff - 0.35, seg.z0, side > 0 ? W + 0.12 : -W + 0.02, ff + 0.25, seg.z1);
      } else {
        wallWithHoles(tgtLower, 'cladding', 'z', x, side > 0 ? -1 : 1, seg.z0, seg.z1, plinth, seg.height, holes, t);
      }
      // sokol (beton)
      wallWithHoles(shell, 'concreteDark', 'z', x + side * 0.03, side > 0 ? -1 : 1, seg.z0, seg.z1, 0, plinth, holes.filter((h) => h.y0 < plinth), t + 0.06);
      // pilastrlar (konstruktiv ustunlar chizig‘i)
      const bay = cfg.building.bayLength;
      for (let z = seg.z0; z <= seg.z1 + 1e-3; z += bay) {
        if (isGlassSide && z < gc.sideDepth + 0.1) continue;
        const hz = Math.min(Math.max(z, seg.z0 + 0.15), seg.z1 - 0.15);
        const blocked = holes.some((h) => hz > h.a0 - 0.2 && hz < h.a1 + 0.2 && h.y0 < 1);
        if (blocked) continue;
        const rbH = rb ? [rb[0], rb[1]] : null;
        const parts: [number, number][] = rbH ? [[plinth, rbH[0]], [rbH[1], seg.height - 0.15]] : [[plinth, seg.height - 0.15]];
        if (seg.id === 'rear') continue;
        for (const [p0, p1] of parts) shell.boxMinMax('claddingDark', side > 0 ? W : -W - 0.08, p0, hz - 0.15, side > 0 ? W + 0.08 : -W, p1, hz + 0.15);
      }
      // suv quvurlari
      if (seg.length > 20) {
        for (let z = seg.z0 + 9; z < seg.z1 - 3; z += 18) {
          if (isGlassSide && z < gc.sideDepth + 1) continue;
          if (holes.some((h) => z > h.a0 - 0.5 && z < h.a1 + 0.5 && h.y0 < 1)) continue;
          shell.cyl('galvanized', [x + side * 0.18, (seg.height - P) / 2, z], 0.075, seg.height - P, 'y', 10);
          shell.box('galvanized', [x + side * 0.1, seg.height - P - 0.1, z], [0.3, 0.25, 0.3]);
        }
      }
    }
  }

  /* ---------- Old fasad (z = 0) ---------- */
  {
    const holes: Hole[] = [];
    for (const d of rollerDoors(cfg)) holes.push({ a0: d.cx - d.width / 2, a1: d.cx + d.width / 2, y0: 0, y1: d.height });
    // shisha burchak — to‘liq balandlikda vitraj
    holes.push({ a0: glassX0, a1: glassX1, y0: 0, y1: front.height - P });
    // lenta deraza
    const rb = ribbonFor(front)!;
    // lenta deraza: logotip paneli (shisha burchak yonida, ~11 m) uchun joy qoldiriladi
    const ribA0 = sign > 0 ? -W + 1.5 : glassX1 + 12.5;
    const ribA1 = sign > 0 ? glassX0 - 12.5 : W - 1.5;
    holes.push({ a0: ribA0, a1: ribA1, y0: rb[0], y1: rb[1] });
    wallWithHoles(shell, 'cladding', 'x', 0, 1, -W, W, plinth, front.height, holes, t);
    wallWithHoles(shell, 'concreteDark', 'x', -0.03, 1, -W, W, 0, plinth, holes.filter((h) => h.y0 < plinth), t + 0.06);
    curtainWall(glass, shell, 'x', -0.04, ribA0, ribA1, rb[0], rb[1], 1.5, [], { glassKey: 'glassTint', depth: 0.12 });
    // old fasad pilastrlari (konstruktiv qadam bo‘yicha), darvoza va vitrajlardan tashqari
    for (let x = -W + cfg.building.bayLength; x < W - 0.5; x += cfg.building.bayLength) {
      if (holes.some((h) => x > h.a0 - 0.4 && x < h.a1 + 0.4 && h.y0 < 1)) continue;
      if (x > glassX0 - 0.4 && x < glassX1 + 0.4) continue;
      shell.boxMinMax('claddingDark', x - 0.15, plinth, -0.08, x + 0.15, rb[0], 0);
      shell.boxMinMax('claddingDark', x - 0.15, rb[1], -0.08, x + 0.15, front.height - 0.15, 0);
    }
    // burchak qoplamalari
    shell.boxMinMax('aluminium', -W - 0.1, plinth, -0.1, -W + 0.12, front.height, 0.12);
    // shisha burchakning old qismi (showroom ortida pastda ichki vitraj bo‘lib qoladi)
    curtainWall(glass, shell, 'x', 0.02, glassX0, glassX1, FLOOR_Y, front.height - P, gc.mullionSpacing, transomLevels(FLOOR_Y, front.height - P, gc.transomSpacing), { heavyEvery: 3 });
    // darvozalar ustidagi soyabon (kozirek)
    for (const d of rollerDoors(cfg)) {
      shell.boxMinMax('aluDark', d.cx - d.width / 2 - 0.9, d.height + 0.85, -1.7, d.cx + d.width / 2 + 0.9, d.height + 1.0, 0);
      shell.box('steel', [d.cx - d.width / 2 - 0.7, d.height + 1.6, -0.85], [0.05, 1.5, 0.05]);
      shell.beam('steel', [d.cx - d.width / 2 - 0.7, d.height + 0.95, -1.65], [d.cx - d.width / 2 - 0.7, d.height + 2.3, -0.02], 0.05);
      shell.beam('steel', [d.cx + d.width / 2 + 0.7, d.height + 0.95, -1.65], [d.cx + d.width / 2 + 0.7, d.height + 2.3, -0.02], 0.05);
      // darvoza atrofidagi ramka
      shell.boxMinMax('aluDark', d.cx - d.width / 2 - 0.12, 0, -0.06, d.cx - d.width / 2, d.height + 0.05, t);
      shell.boxMinMax('aluDark', d.cx + d.width / 2, 0, -0.06, d.cx + d.width / 2 + 0.12, d.height + 0.05, t);
      // urilishdan himoya ustunchalari (sariq)
      for (const s of [-1, 1]) shell.cyl('paintYellow', [d.cx + s * (d.width / 2 + 0.45), 0.6, -0.5], 0.11, 1.2, 'y', 12);
    }
  }

  /* ---------- Segmentlar orasidagi balandlik farqi devorlari va orqa fasad ---------- */
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    const next = segs[i + 1];
    if (next && Math.abs(next.height - s.height) > 0.01) {
      const hi = s.height > next.height ? s : next;
      const lo = s.height > next.height ? next : s;
      const z = s.z1;
      const inward = hi === s ? -1 : 1; // baland segment tomoniga
      const isRear = hi.id === 'rear' || lo.id === 'rear';
      // past qismi: oxirgi qism bilan ishlab chiqarish orasida to‘liq devor; boshqalarda ochiq
      const fromY = isRear ? plinth : lo.height - P - 0.3;
      const holes: Hole[] = isRear ? [{ a0: -2.5, a1: 2.5, y0: 0, y1: 3.2 }, { a0: -15, a1: -12.5, y0: 0, y1: 2.4 }] : [];
      const tgt = hi.id === 'rear' ? upper : shell;
      if (isRear && hi.id === 'rear') {
        const ff = cfg.building.rearFirstFloorHeight;
        wallWithHoles(shell, 'paintWhite', 'x', z + inward * 0, inward as 1 | -1, -W + t, W - t, 0, Math.min(ff, lo.height - P), holes, t);
        wallWithHoles(shell, 'cladding', 'x', z, inward as 1 | -1, -W, W, lo.height - P - 0.3, ff, [], t);
        wallWithHoles(upper, 'cladding', 'x', z, inward as 1 | -1, -W, W, ff, hi.height, [], t);
      } else {
        wallWithHoles(tgt, 'cladding', 'x', z, inward as 1 | -1, -W, W, fromY, hi.height, [], t);
      }
    }
  }
  // orqa fasad
  {
    const rear = segs[segs.length - 1];
    const z = L;
    const ff = cfg.building.rearFirstFloorHeight;
    const holesLower: Hole[] = [];
    const holesUpper: Hole[] = [];
    const doorX = -2;
    holesLower.push({ a0: doorX - 1.6, a1: doorX + 1.6, y0: 0, y1: 2.9 });
    for (let x = -W + 3; x <= W - 3; x += 4.5) {
      if (Math.abs(x - doorX) < 3) continue;
      holesLower.push({ a0: x - 1.4, a1: x + 1.4, y0: 1.0, y1: ff - 1.1 });
      curtainWall(glass, shell, 'x', z + 0.08, x - 1.4, x + 1.4, 1.0, ff - 1.1, 1.4, [], { glassKey: 'glassTint', depth: 0.12 });
    }
    for (let x = -W + 3; x <= W - 3; x += 4.5) {
      holesUpper.push({ a0: x - 1.4, a1: x + 1.4, y0: ff + 0.9, y1: rear.height - P - 0.6 });
      curtainWall(upperGlass, upper, 'x', z + 0.08, x - 1.4, x + 1.4, ff + 0.9, rear.height - P - 0.6, 1.4, [], { glassKey: 'glassTint', depth: 0.12 });
    }
    if (rear.floors >= 2) {
      wallWithHoles(shell, 'cladding', 'x', z, -1, -W, W, plinth, ff, holesLower, t);
      wallWithHoles(upper, 'cladding', 'x', z, -1, -W, W, ff, rear.height, holesUpper, t);
      shell.boxMinMax('claddingDark', -W - 0.12, ff - 0.35, z - 0.02, W + 0.12, ff + 0.25, z + 0.12);
    } else {
      wallWithHoles(shell, 'cladding', 'x', z, -1, -W, W, plinth, rear.height, holesLower, t);
    }
    wallWithHoles(shell, 'concreteDark', 'x', z + 0.03, -1, -W, W, 0, plinth, holesLower.filter((h) => h.y0 < plinth), t + 0.06);
    // xodimlar kirish joyi: shisha eshik + soyabon
    curtainWall(glass, shell, 'x', z - 0.05, doorX - 1.6, doorX + 1.6, FLOOR_Y, 2.9, 1.6, [2.3]);
    shell.boxMinMax('aluDark', doorX - 3, 3.1, z, doorX + 3, 3.35, z + 2.2);
    shell.boxMinMax('concrete', doorX - 3, 0, z, doorX + 3, FLOOR_Y, z + 2.2);
  }

  /* ---------- Tomlar, parapet qoplamasi, fermalar ---------- */
  for (const seg of segs) {
    const roofY = seg.height - P;
    const isProd = seg.id === 'production';
    // tom plitasi (zenit fonarlari uchun bo‘laklarga ajratilgan)
    const sky: [number, number][] = [];
    if (isProd || seg.id === 'tbd') {
      for (let z = seg.z0 + 6; z < seg.z1 - 4; z += 12) sky.push([z, z + 2.2]);
    }
    let cz = seg.z0;
    const roofSpans: [number, number][] = [];
    for (const [a, b] of sky) {
      roofSpans.push([cz, a]);
      cz = b;
    }
    roofSpans.push([cz, seg.z1]);
    for (const [a, b] of roofSpans) {
      const za = Math.max(a, t);
      const zb = Math.min(b, L - t);
      if (zb > za) roof.boxMinMax('roof', -W + t, roofY - 0.3, za, W - t, roofY, zb);
    }
    // zenit fonarlari (polikarbonat/shisha)
    for (const [a, b] of sky) {
      roof.boxMinMax('glass', -W + 3, roofY + 0.25, a + 0.1, W - 3, roofY + 0.27, b - 0.1);
      roof.boxMinMax('aluminium', -W + 3, roofY, a, W - 3, roofY + 0.25, a + 0.1);
      roof.boxMinMax('aluminium', -W + 3, roofY, b - 0.1, W - 3, roofY + 0.25, b);
      // fonar ochig‘ining tom bilan tutashgan qismlari
      roof.boxMinMax('roof', -W + t, roofY - 0.3, a, -W + 3, roofY, b);
      roof.boxMinMax('roof', W - 3, roofY - 0.3, a, W - t, roofY, b);
    }
    // parapet qoplamasi (alyuminiy)
    shell.boxMinMax('aluminium', -W - 0.06, seg.height - 0.06, seg.z0, -W + t + 0.06, seg.height + 0.02, seg.z1);
    shell.boxMinMax('aluminium', W - t - 0.06, seg.height - 0.06, seg.z0, W + 0.06, seg.height + 0.02, seg.z1);
    // fermalar (ichkaridan ko‘rinadi) — tom bilan birga yashiriladi
    const bay = cfg.building.bayLength;
    for (let z = seg.z0 + bay; z < seg.z1 - 0.5; z += bay) {
      roof.boxMinMax('steel', -W + t, roofY - 1.0, z - 0.12, W - t, roofY - 0.3, z + 0.12);
      // ichki ustunlar devor yonida
      interior.boxMinMax('steel', -W + t, FLOOR_Y, z - 0.18, -W + t + 0.36, roofY - 0.3, z + 0.18);
      interior.boxMinMax('steel', W - t - 0.36, FLOOR_Y, z - 0.18, W - t, roofY - 0.3, z + 0.18);
    }
    // ichki yoritgichlar (LED chiziqlar)
    if (seg.id !== 'rear') {
      for (let z = seg.z0 + 3; z < seg.z1 - 1; z += bay) {
        for (const x of [-12, 0, 12]) roof.boxMinMax('lightPanel', x - 2.5, roofY - 1.25, z - 0.12, x + 2.5, roofY - 1.18, z + 0.12);
      }
    }
    // tomdagi ventilyatsiya uskunalari
    if (isProd) {
      for (const [x, z] of [
        [-9, seg.z0 + 15],
        [9, seg.z0 + 33],
        [-9, seg.z0 + 51],
        [9, seg.z0 + 66],
      ]) {
        roof.box('paintGrey', [x, roofY + 0.75, z], [3.2, 1.5, 2.2]);
        roof.cyl('steel', [x - 0.7, roofY + 1.55, z], 0.55, 0.12, 'y', 20);
        roof.cyl('steel', [x + 0.7, roofY + 1.55, z], 0.55, 0.12, 'y', 20);
        roof.box('galvanized', [x, roofY + 0.25, z + 1.8], [0.6, 0.5, 1.6]);
      }
    }
  }
  // old va orqa parapet qoplamalari
  shell.boxMinMax('aluminium', -W - 0.06, front.height - 0.06, -0.06, W + 0.06, front.height + 0.02, t + 0.06);
  const rearSeg = segs[segs.length - 1];
  upper.boxMinMax('aluminium', -W - 0.06, rearSeg.height - 0.06, L - t - 0.06, W + 0.06, rearSeg.height + 0.02, L + 0.06);

  /* ---------- Oxirgi qism ichki qismi: qavatlararo plita, bo‘linmalar, zinapoya ---------- */
  {
    const r = rearSeg;
    const ff = cfg.building.rearFirstFloorHeight;
    if (r.floors >= 2) {
      // qavatlararo plita
      upper.boxMinMax('concrete', -W + t, ff - 0.3, r.z0 + t, W - t, ff, r.z1 - t);
      upper.boxMinMax('floor', -W + t, ff, r.z0 + t, W - t, ff + 0.02, r.z1 - t);
      // zinapoya ochig‘i atrofidagi to‘siq
      upper.boxMinMax('aluminium', 14.5, ff + 1.0, r.z0 + 0.5, 19.6, ff + 1.06, r.z0 + 0.56);
    }
    // bo‘linmalar (1-qavat): koridor z bo‘ylab o‘rtada
    const corr0 = r.z0 + 4.2;
    const corr1 = r.z0 + 5.8;
    for (const x of [-12, -4, 4, 12]) {
      interior.boxMinMax('paintWhite', x - 0.06, FLOOR_Y, r.z0 + t, x + 0.06, ff - 0.3, corr0);
      interior.boxMinMax('paintWhite', x - 0.06, FLOOR_Y, corr1, x + 0.06, ff - 0.3, r.z1 - t);
      if (r.floors >= 2) {
        upper.boxMinMax('paintWhite', x - 0.06, ff, r.z0 + t, x + 0.06, r.height - P - 0.3, corr0);
        upper.boxMinMax('glass', x - 0.03, ff, corr1, x + 0.03, r.height - P - 0.3, r.z1 - t);
      }
    }
    interior.boxMinMax('paintWhite', -W + t, FLOOR_Y, corr0 - 0.12, 14, ff - 0.3, corr0);
    interior.boxMinMax('paintWhite', -W + t, FLOOR_Y, corr1, 14, ff - 0.3, corr1 + 0.12);
    // zinapoya
    const steps = 22;
    for (let i = 0; i < steps; i++) {
      const y = FLOOR_Y + ((i + 1) * (ff - FLOOR_Y)) / steps;
      const z = r.z1 - t - 0.3 - i * 0.28;
      interior.boxMinMax('concrete', 16.4, y - 0.17, z - 0.3, 19.6, y, z);
    }
    interior.boxMinMax('aluminium', 16.3, FLOOR_Y + 0.9, r.z1 - 6.6, 16.36, ff + 1.0, r.z1 - 0.3);
    // 2-qavat mebellari (stollar)
    if (r.floors >= 2) {
      for (const x of [-16, -8, 0, 8]) {
        for (const dz of [1.3, 7.8]) {
          upper.boxMinMax('paintWhite', x - 1.6, ff + 0.72, r.z0 + dz, x + 1.6, ff + 0.76, r.z0 + dz + 0.8);
          upper.box('fabric', [x - 0.8, ff + 0.45, r.z0 + dz + (dz < 4 ? 1.3 : -0.5)], [0.5, 0.9, 0.5]);
          upper.box('fabric', [x + 0.8, ff + 0.45, r.z0 + dz + (dz < 4 ? 1.3 : -0.5)], [0.5, 0.9, 0.5]);
          upper.box('screen', [x, ff + 1.0, r.z0 + dz + 0.6], [0.6, 0.38, 0.03]);
        }
      }
      upper.boxMinMax('lightPanel', -18, r.height - P - 0.36, r.z0 + 2, 14, r.height - P - 0.32, r.z0 + 2.3);
      upper.boxMinMax('lightPanel', -18, r.height - P - 0.36, r.z0 + 7.7, 14, r.height - P - 0.32, r.z0 + 8);
    }
    // 1-qavat: oshxona stollari, kiyim shkaflari
    for (const x of [-16, -8]) interior.box('paintWhite', [x, FLOOR_Y + 0.75, r.z0 + 2], [3, 0.05, 1.2]);
    for (let x = 0.5; x < 3.6; x += 0.6) interior.box('paintGrey', [x, FLOOR_Y + 1.0, r.z1 - t - 0.35], [0.55, 2.0, 0.5]);
  }

  /* ---------- Old korpus ichki bo‘luvchi devori (chizmadagi chiziq) ---------- */
  {
    const px = cfg.building.frontPartitionX;
    interior.boxMinMax('cladding', px - 0.1, FLOOR_Y, t, px + 0.1, front.height - P - 0.3, front.z1 - 2);
  }

  /* ---------- Showroom va old korpus orasidagi pastki qism ---------- */
  void sr;

  return { shell, glass, roof, upper, upperGlass, interior };
}
