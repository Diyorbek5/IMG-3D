import * as THREE from 'three';
import { restaurantLayout, type RestaurantLayout, type Seat } from '../../lib/restaurant';
import { GeoBuilder, type MatKey } from '../../three/GeoBuilder';

type V3 = [number, number, number];

/** Devordagi teshik: to‘g‘ri burchakli yoki arkali (ry — arka balandligi, rx = kenglikning yarmi) */
export interface Hole {
  a0: number;
  a1: number;
  y0: number;
  /** arka boshlanish (tovon) balandligi; ry bo‘lmasa — teshik tepasi */
  ys: number;
  ry?: number;
}

const holeTop = (h: Hole) => h.ys + (h.ry ?? 0);

function tracePath(p: THREE.Path, h: Hole) {
  const ac = (h.a0 + h.a1) / 2;
  const rx = (h.a1 - h.a0) / 2;
  p.moveTo(h.a0, h.y0);
  p.lineTo(h.a1, h.y0);
  p.lineTo(h.a1, h.ys);
  if (h.ry) p.absellipse(ac, h.ys, rx, h.ry, 0, Math.PI, false, 0);
  else p.lineTo(h.a0, h.ys);
  p.lineTo(h.a0, h.y0);
}

/** Teshik shakli (shisha va tokcha panellari uchun) */
function holeShape(h: Hole) {
  const s = new THREE.Shape();
  tracePath(s, h);
  return s;
}

/**
 * Arkali (yoki to‘g‘ri burchakli) teshiklari bor devor — ExtrudeGeometry orqali.
 * axis 'x': devor x bo‘ylab, z = plane tekisligida; 'z': devor z bo‘ylab, x = plane da.
 * side: qalinlik qaysi tomonga (+1 — o‘qning musbat tomoniga).
 */
export function archedWall(b: GeoBuilder, key: MatKey, axis: 'x' | 'z', plane: number, side: 1 | -1, a0: number, a1: number, y0: number, y1: number, holes: Hole[], t: number) {
  const shape = new THREE.Shape();
  shape.moveTo(a0, y0);
  shape.lineTo(a1, y0);
  shape.lineTo(a1, y1);
  shape.lineTo(a0, y1);
  shape.lineTo(a0, y0);
  for (const h of holes) {
    const p = new THREE.Path();
    tracePath(p, h);
    shape.holes.push(p);
  }
  const g = new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false, curveSegments: 16 });
  if (axis === 'x') g.translate(0, 0, side > 0 ? plane : plane - t);
  else {
    g.rotateY(-Math.PI / 2);
    g.translate(side > 0 ? plane + t : plane, 0, 0);
  }
  b.add(key, g);
}

/** Devor tekisligidagi nuqta/o‘lcham: a — devor bo‘ylab, d — normal bo‘ylab */
const placer = (axis: 'x' | 'z', plane: number) => ({
  P: (a: number, y: number, d = 0): V3 => (axis === 'x' ? [a, y, plane + d] : [plane + d, y, a]),
  S: (sa: number, sy: number, sd: number): V3 => (axis === 'x' ? [sa, sy, sd] : [sd, sy, sa]),
  rot: (axis === 'x' ? [0, 0, 0] : [0, -Math.PI / 2, 0]) as V3,
});

/** Arkali deraza yoki eshik: rama, impost, arka ramasi, nurlar, shisha (devor o‘rtasida) */
export function archWindow(fr: GeoBuilder, gl: GeoBuilder | null, axis: 'x' | 'z', mid: number, h: Hole, frameKey: MatKey = 'aluDark', glassKey: MatKey = 'glass', mullions = true) {
  const { P, S, rot } = placer(axis, mid);
  const ac = (h.a0 + h.a1) / 2;
  const w = h.a1 - h.a0;
  const rx = w / 2;
  const top = holeTop(h);
  fr.box(frameKey, P(h.a0 + 0.04, (h.y0 + h.ys) / 2), S(0.08, h.ys - h.y0, 0.14));
  fr.box(frameKey, P(h.a1 - 0.04, (h.y0 + h.ys) / 2), S(0.08, h.ys - h.y0, 0.14));
  fr.box(frameKey, P(ac, h.y0 + 0.04), S(w, 0.08, 0.14));
  if (mullions) fr.box(frameKey, P(ac, h.ys), S(w, 0.06, 0.12));
  if (mullions) fr.box(frameKey, P(ac, (h.y0 + top) / 2), S(0.06, top - h.y0, 0.12));
  if (mullions && w > 1.7) for (const k of [-1, 1]) fr.box(frameKey, P(ac + (k * w) / 4, (h.y0 + h.ys) / 2), S(0.05, h.ys - h.y0, 0.1));
  if (h.ry) {
    const torus = new THREE.TorusGeometry(rx - 0.04, 0.045, 6, 20, Math.PI);
    fr.add(frameKey, torus, P(ac, h.ys), rot, [1, h.ry / rx, 1]);
    if (mullions) for (const a of [Math.PI / 4, (3 * Math.PI) / 4]) fr.beam(frameKey, P(ac, h.ys), P(ac + Math.cos(a) * (rx - 0.05), h.ys + Math.sin(a) * (h.ry - 0.05)), 0.04);
  }
  gl?.add(glassKey, new THREE.ShapeGeometry(holeShape(h), 16), axis === 'x' ? [0, 0, mid] : [mid, 0, 0], rot);
}

/**
 * Arka shaklidagi panel (tokcha orqasi) devor oldida. face: panel normali yo‘nalishi —
 * 'x' devor uchun +1 → +z, −1 → −z; 'z' devor uchun +1 → +x, −1 → −x.
 */
function archPanel(b: GeoBuilder, key: MatKey, axis: 'x' | 'z', at: number, h: Hole, face: 1 | -1) {
  const mirrored = (axis === 'x' && face < 0) || (axis === 'z' && face > 0);
  const hh = mirrored ? { ...h, a0: -h.a1, a1: -h.a0 } : h;
  const g = new THREE.ShapeGeometry(holeShape(hh), 16);
  if (axis === 'x') b.add(key, g, [0, 0, at], [0, face < 0 ? Math.PI : 0, 0]);
  else b.add(key, g, [at, 0, 0], [0, face > 0 ? Math.PI / 2 : -Math.PI / 2, 0]);
}

/** Yaw bo‘yicha burilgan lokal nuqta */
const yawPt = (x: number, z: number, yaw: number, lx: number, lz: number): [number, number] => [x + lx * Math.cos(yaw) + lz * Math.sin(yaw), z - lx * Math.sin(yaw) + lz * Math.cos(yaw)];

/** Ikat bilan qoplangan stul (o‘tirgich 0.51 m), yoki kreslo */
function chair(b: GeoBuilder, s: Seat, y0: number, arm = false) {
  const p = (lx: number, ly: number, lz: number): V3 => {
    const [x, z] = yawPt(s.x, s.z, s.face, lx, lz);
    return [x, y0 + ly, z];
  };
  const r: V3 = [0, s.face, 0];
  b.add('ikat', new THREE.BoxGeometry(0.48, 0.08, 0.46), p(0, 0.47, 0), r);
  b.add('ikat', new THREE.BoxGeometry(0.48, arm ? 0.62 : 0.5, 0.07), p(0, arm ? 0.82 : 0.76, -0.22), [-0.08, s.face, 0]);
  if (arm) for (const sx of [-0.25, 0.25]) b.add('ikat', new THREE.BoxGeometry(0.06, 0.2, 0.42), p(sx, 0.62, -0.01), r);
  for (const [lx, lz] of [
    [-0.2, -0.19],
    [0.2, -0.19],
    [-0.2, 0.19],
    [0.2, 0.19],
  ])
    b.add('woodDark', new THREE.BoxGeometry(0.04, 0.44, 0.04), p(lx, 0.22, lz), r);
}

/** Marokash/milliy uslubdagi osma fonus */
function lantern(b: GeoBuilder, x: number, z: number, yBottom: number, ceil: number, s = 1) {
  const h = 0.42 * s;
  b.cyl('iron', [x, (yBottom + h + ceil) / 2, z], 0.008, ceil - yBottom - h, 'y', 4);
  b.cyl('brass', [x, yBottom + h + 0.07 * s, z], 0.05 * s, 0.14 * s, 'y', 8, 0.02 * s);
  b.cyl('brass', [x, yBottom + h, z], 0.16 * s, 0.03 * s, 'y', 8);
  b.cyl('lanternGlass', [x, yBottom + h / 2, z], 0.13 * s, h - 0.03, 'y', 8, 0.15 * s);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    b.box('brass', [x + Math.cos(a) * 0.142 * s, yBottom + h / 2, z + Math.sin(a) * 0.142 * s], [0.012, h, 0.012]);
  }
  b.cyl('brass', [x, yBottom - 0.05 * s, z], 0.13 * s, 0.1 * s, 'y', 8, 0.03 * s);
}

/** Devor fonusi (bra) */
function sconce(b: GeoBuilder, x: number, y: number, z: number, outX: number, outZ: number) {
  b.box('brass', [x + outX * 0.08, y + 0.32, z + outZ * 0.08], [Math.abs(outX) > 0 ? 0.16 : 0.03, 0.03, Math.abs(outZ) > 0 ? 0.16 : 0.03]);
  b.cyl('lanternGlass', [x + outX * 0.17, y, z + outZ * 0.17], 0.08, 0.3, 'y', 8, 0.09);
  b.cyl('brass', [x + outX * 0.17, y + 0.17, z + outZ * 0.17], 0.03, 0.08, 'y', 8, 0.1);
  b.cyl('brass', [x + outX * 0.17, y - 0.17, z + outZ * 0.17], 0.09, 0.04, 'y', 8, 0.03);
}

/** Sopol ko‘za */
let jugGeo: THREE.LatheGeometry | null = null;
function jug(b: GeoBuilder, x: number, y: number, z: number, s = 1) {
  jugGeo ??= new THREE.LatheGeometry(
    [
      [0.0, 0],
      [0.09, 0.0],
      [0.15, 0.08],
      [0.17, 0.2],
      [0.13, 0.33],
      [0.06, 0.4],
      [0.05, 0.47],
      [0.08, 0.5],
    ].map(([px, py]) => new THREE.Vector2(px, py)),
    12,
  );
  b.add('jug', jugGeo, [x, y, z], [0, 0, 0], [s, s, s]);
}

/** Palma / zaytun daraxti tuvakda */
function pottedPlant(b: GeoBuilder, x: number, y: number, z: number, s = 1) {
  b.cyl('jug', [x, y + 0.3 * s, z], 0.3 * s, 0.6 * s, 'y', 12, 0.36 * s);
  b.cyl('woodDark', [x, y + 0.6 * s + 0.5 * s, z], 0.04 * s, 1.0 * s, 'y', 6);
  const ico = new THREE.IcosahedronGeometry(1, 0);
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2;
    b.add('plant', ico, [x + Math.cos(a) * 0.35 * s, y + 1.55 * s + (k % 2) * 0.12 * s, z + Math.sin(a) * 0.35 * s], [0.3, a, 0.6], [0.45 * s, 0.08 * s, 0.14 * s]);
  }
  b.add('plant', ico, [x, y + 1.7 * s, z], [0, 0, 0], [0.22 * s, 0.25 * s, 0.22 * s]);
}

export interface Decal {
  kind: 'carpet' | 'carpet2' | 'carpet3' | 'suzani' | 'lyagan' | 'lyagan2';
  pos: V3;
  w: number;
  h: number;
  /** Euler burchaklari */
  rot: V3;
}

/** Restoran geometriyasi: qobiq, shisha, tom/shift (yashiriladi), ichki jihozlar, bezak tekisliklari */
export function buildRestaurant(L: RestaurantLayout = restaurantLayout()) {
  const shell = new GeoBuilder();
  const glass = new GeoBuilder();
  const roof = new GeoBuilder();
  const inner = new GeoBuilder();
  const decals: Decal[] = [];
  const uplights: { pos: V3; w: number; h: number; rotY: number }[] = [];
  const { X, Z, W, D, FL1, CEIL1, FL2, CEIL2, EAVE, PAV_EAVE, pavW, portico } = L;
  const T = 0.4; // tashqi devor qalinligi
  const fw = L.frontWindows;
  const pavU = [...fw.pavilion, ...fw.pavilion.map((u) => W - u)];
  const wingU = [...fw.wing, ...fw.wing.map((u) => W - u)];

  /* ---------------- deraza teshiklari ---------------- */
  const gWin = (c: number, rx: number): Hole => ({ a0: c - rx, a1: c + rx, y0: FL1 + 0.35, ys: 3.25, ry: rx });
  const uWin = (c: number, rx: number, ys = 7.8): Hole => ({ a0: c - rx, a1: c + rx, y0: FL2 + 0.35, ys, ry: rx });
  const door: Hole = { a0: X(W / 2 - 1.3), a1: X(W / 2 + 1.3), y0: FL1 + 0.005, ys: 3.0, ry: 1.3 };
  const balconyDoor: Hole = { a0: X(W / 2 - 1.15), a1: X(W / 2 + 1.15), y0: FL2 + 0.05, ys: 7.75, ry: 1.15 };

  /* ---------------- poydevor, pollar ---------------- */
  shell.boxMinMax('concrete', X(-0.08), 0, Z(-0.08), X(W + 0.08), FL1, Z(D + 0.08));
  shell.boxMinMax('concrete', X(portico.u0 - 0.08), 0, Z(-portico.depth - 0.08), X(portico.u1 + 0.08), FL1, Z(0));
  inner.boxMinMax('stoneWarm', X(T), FL1 - 0.02, Z(T), X(W - T), FL1, Z(D - T));
  inner.boxMinMax('stoneWarm', X(portico.u0 + T), FL1 - 0.02, Z(-portico.depth + T), X(portico.u1 - T), FL1, Z(T));
  // kirish zinapoyalari
  for (let k = 0; k < 3; k++) shell.boxMinMax('concrete', X(portico.u0 + 0.4), 0, Z(-portico.depth - 0.4 * (3 - k)), X(portico.u1 - 0.4), (FL1 * (k + 1)) / 3, Z(-portico.depth));
  // oldingi maydoncha (tosh plitalar)
  shell.boxMinMax('stoneWarm', X(-2), 0.02, Z(-9), X(W + 2), 0.05, Z(-0.1));

  /* ---------------- tashqi devorlar ---------------- */
  const pavHolesFront = (u0: number, u1: number) => pavU.filter((u) => u > u0 && u < u1).flatMap((u) => [gWin(X(u), 0.95), uWin(X(u), 0.95)]);
  const wingHolesFront = wingU.flatMap((u) => [gWin(X(u), 0.8), uWin(X(u), 0.8, 7.6)]);
  // shimoliy (old) fasad: pavilonlar, o‘rta qanot (portik ortida eshik va balkon teshigi)
  archedWall(shell, 'stucco', 'x', Z(0), 1, X(0), X(pavW), 0, PAV_EAVE, pavHolesFront(0, pavW), T);
  archedWall(shell, 'stucco', 'x', Z(0), 1, X(W - pavW), X(W), 0, PAV_EAVE, pavHolesFront(W - pavW, W), T);
  archedWall(shell, 'stucco', 'x', Z(0), 1, X(pavW), X(W - pavW), 0, EAVE, [...wingHolesFront, door, balconyDoor], T);
  // janubiy (orqa) fasad
  archedWall(shell, 'stucco', 'x', Z(D), -1, X(0), X(pavW), 0, PAV_EAVE, pavHolesFront(0, pavW), T);
  archedWall(shell, 'stucco', 'x', Z(D), -1, X(W - pavW), X(W), 0, PAV_EAVE, pavHolesFront(W - pavW, W), T);
  archedWall(shell, 'stucco', 'x', Z(D), -1, X(pavW), X(W - pavW), 0, EAVE, [...wingHolesFront, { a0: X(W / 2 + 6), a1: X(W / 2 + 7.6), y0: FL1 + 0.005, ys: 2.6 }], T);
  // yon fasadlar
  const sideHoles = L.sideWindows.flatMap((v) => [gWin(Z(v), 0.8), uWin(Z(v), 0.8)]);
  archedWall(shell, 'stucco', 'z', X(0), 1, Z(0), Z(D), 0, PAV_EAVE, sideHoles, T);
  archedWall(shell, 'stucco', 'z', X(W), -1, Z(0), Z(D), 0, PAV_EAVE, sideHoles, T);
  // pavilonlarning o‘rta qanotga qaragan yuqori qismi
  for (const u of [pavW, W - pavW]) shell.boxMinMax('stucco', X(u - 0.2), EAVE - 0.2, Z(0), X(u + 0.2), PAV_EAVE, Z(D));
  // portik: old devor (eshik, balkon eshigi) va yon devorlar
  archedWall(shell, 'stucco', 'x', Z(-portico.depth), 1, X(portico.u0), X(portico.u1), 0, portico.eave, [door, balconyDoor], T);
  archedWall(shell, 'stucco', 'z', X(portico.u0), 1, Z(-portico.depth), Z(0), 0, portico.eave, [], T);
  archedWall(shell, 'stucco', 'z', X(portico.u1), -1, Z(-portico.depth), Z(0), 0, portico.eave, [], T);

  /* ---------------- derazalar va eshiklar ---------------- */
  for (const h of [...pavHolesFront(0, W), ...wingHolesFront]) {
    archWindow(shell, glass, 'x', Z(0.16), h);
    archWindow(shell, glass, 'x', Z(D - 0.16), h);
  }
  for (const h of sideHoles) {
    archWindow(shell, glass, 'z', X(0.16), h);
    archWindow(shell, glass, 'z', X(W - 0.16), h);
  }
  archWindow(shell, glass, 'x', Z(-portico.depth + 0.16), door);
  archWindow(shell, glass, 'x', Z(-portico.depth + 0.16), balconyDoor);
  archWindow(shell, glass, 'x', Z(D - 0.16), { a0: X(W / 2 + 6), a1: X(W / 2 + 7.6), y0: FL1 + 0.005, ys: 2.6 }, 'woodDark', 'woodDark');
  // deraza tokchalari (podokonnik) va arka tepasidagi zamok toshi
  const sill = (axis: 'x' | 'z', plane: number, out: number, h: Hole) => {
    const { P, S } = placer(axis, plane);
    const ac = (h.a0 + h.a1) / 2;
    shell.box('stucco', P(ac, h.y0 - 0.06, out * 0.12), S(h.a1 - h.a0 + 0.3, 0.12, 0.3));
    if (h.ry) shell.box('stucco', P(ac, holeTop(h) + 0.08, out * 0.06), S(0.28, 0.36, 0.12));
  };
  for (const h of [...pavHolesFront(0, W), ...wingHolesFront]) {
    sill('x', Z(0), -1, h);
    sill('x', Z(D), 1, h);
  }
  for (const h of sideHoles) {
    sill('z', X(0), -1, h);
    sill('z', X(W), 1, h);
  }
  sill('x', Z(-portico.depth), -1, balconyDoor);

  /* ---------------- pilyastrlar, karnizlar, kechki yoritish ---------------- */
  const pilaster = (axis: 'x' | 'z', plane: number, out: number, a: number, y1: number, w = 0.56, uplight = false) => {
    const { P, S } = placer(axis, plane);
    shell.box('stucco', P(a, (FL1 + y1) / 2, out * 0.09), S(w, y1 - FL1, 0.18));
    shell.box('stucco', P(a, y1 - 0.14, out * 0.13), S(w + 0.2, 0.28, 0.26));
    shell.box('stucco', P(a, FL1 + 0.18, out * 0.12), S(w + 0.14, 0.36, 0.24));
    if (uplight) {
      shell.box('iron', P(a, 0.07, out * 0.45), S(0.22, 0.1, 0.16));
      shell.box('lampWarm', P(a, 0.125, out * 0.45), S(0.14, 0.01, 0.08));
      // yorug‘lik izi alohida (o‘z UV koordinatalari bilan) chiziladi
      uplights.push({ pos: P(a, 0.4 + (y1 - 0.6) / 2, out * 0.2), w: w + 1.6, h: y1 - 0.6, rotY: axis === 'x' ? 0 : Math.PI / 2 });
    }
  };
  const frontPil = [0.28, 3.95, 7.05, pavW - 0.28];
  for (const u of frontPil) {
    pilaster('x', Z(0), -1, X(u), PAV_EAVE - 0.4, 0.56, true);
    pilaster('x', Z(0), -1, X(W - u), PAV_EAVE - 0.4, 0.56, true);
    pilaster('x', Z(D), 1, X(u), PAV_EAVE - 0.4);
    pilaster('x', Z(D), 1, X(W - u), PAV_EAVE - 0.4);
  }
  for (const u of [13.95, W - 13.95]) {
    pilaster('x', Z(0), -1, X(u), EAVE - 0.4, 0.5, true);
    pilaster('x', Z(D), 1, X(u), EAVE - 0.4, 0.5);
  }
  for (const u of [portico.u0 + 0.3, portico.u1 - 0.3]) pilaster('x', Z(-portico.depth), -1, X(u), portico.eave - 0.4, 0.6, true);
  const sv = L.sideWindows;
  const sidePil = [0.28, ...sv.slice(0, -1).map((v, i) => (v + sv[i + 1]) / 2), D - 0.28];
  for (const v of sidePil) {
    pilaster('z', X(0), -1, Z(v), PAV_EAVE - 0.4);
    pilaster('z', X(W), 1, Z(v), PAV_EAVE - 0.4);
  }
  // qavatlararo belbog‘ va tepa karnizlar (yuqori qismi kengroq — klassik profil)
  /** perimetr bo‘ylab halqa (karniz, belbog‘): tashqariga ext, ichkariga devor qalinligicha */
  const ring = (x0: number, z0: number, x1: number, z1: number, y0: number, y1: number, ext: number, inset = T) => {
    shell.boxMinMax('stucco', x0 - ext, y0, z0 - ext, x1 + ext, y1, z0 + inset);
    shell.boxMinMax('stucco', x0 - ext, y0, z1 - inset, x1 + ext, y1, z1 + ext);
    shell.boxMinMax('stucco', x0 - ext, y0, z0 + inset, x0 + inset, y1, z1 - inset);
    shell.boxMinMax('stucco', x1 - inset, y0, z0 + inset, x1 + ext, y1, z1 - inset);
  };
  const band = (x0: number, z0: number, x1: number, z1: number, y: number) => ring(x0, z0, x1, z1, y - 0.15, y + 0.15, 0.14);
  band(X(0), Z(0), X(W), Z(D), (CEIL1 + FL2) / 2);
  band(X(portico.u0), Z(-portico.depth), X(portico.u1), Z(0), (CEIL1 + FL2) / 2);
  const cornice = (x0: number, z0: number, x1: number, z1: number, y: number) => {
    ring(x0, z0, x1, z1, y - 0.42, y - 0.14, 0.12);
    ring(x0, z0, x1, z1, y - 0.14, y + 0.04, 0.3);
    ring(x0, z0, x1, z1, y + 0.04, y + 0.14, 0.4);
  };
  cornice(X(0), Z(0), X(pavW), Z(D), PAV_EAVE);
  cornice(X(W - pavW), Z(0), X(W), Z(D), PAV_EAVE);
  cornice(X(pavW), Z(0), X(W - pavW), Z(D), EAVE);
  cornice(X(portico.u0), Z(-portico.depth), X(portico.u1), Z(0), portico.eave);

  /* ---------------- frontonlar va tomlar ---------------- */
  const gable = (u0: number, u1: number, eave: number, pitch: number, v0: number, v1: number, ornament: 'oculus' | 'cartouche' | null) => {
    const half = (u1 - u0) / 2;
    const rise = half * Math.tan(pitch);
    const uc = (u0 + u1) / 2;
    for (const [v, isFront] of [
      [v0, true],
      [v1, false],
    ] as const) {
      const tri = new THREE.Shape();
      tri.moveTo(X(u0), eave + 0.1);
      tri.lineTo(X(u1), eave + 0.1);
      tri.lineTo(X(uc), eave + 0.1 + rise);
      tri.lineTo(X(u0), eave + 0.1);
      const g = new THREE.ExtrudeGeometry(tri, { depth: T, bevelEnabled: false });
      g.translate(0, 0, isFront ? Z(v) : Z(v) - T);
      shell.add('stucco', g);
      // qiya karnizlar
      const out = isFront ? -1 : 1;
      const len = Math.hypot(half + 0.4, rise + 0.4 * Math.tan(pitch));
      for (const sg of [-1, 1]) {
        shell.add('stucco', new THREE.BoxGeometry(len, 0.3, 0.42), [X(uc + (sg * (half + 0.4)) / 2), eave + 0.2 + rise / 2 - 0.2 * Math.tan(pitch), Z(v) + out * 0.12], [0, 0, -sg * pitch]);
      }
      if (isFront && ornament === 'oculus') {
        shell.add('stucco', new THREE.TorusGeometry(0.62, 0.09, 8, 28), [X(uc), eave + 0.1 + rise * 0.42, Z(v) - 0.05]);
        glass.add('lanternGlass', new THREE.CircleGeometry(0.56, 24), [X(uc), eave + 0.1 + rise * 0.42, Z(v) + 0.02], [0, Math.PI, 0]);
      }
      if (isFront && ornament === 'cartouche') {
        const y = eave + 0.1 + rise * 0.4;
        shell.add('stucco', new THREE.SphereGeometry(1, 16, 8), [X(uc), y, Z(v) - 0.04], [0, 0, 0], [0.55, 0.42, 0.1]);
        for (const sg of [-1, 1]) {
          shell.add('stucco', new THREE.TorusGeometry(0.18, 0.05, 6, 14), [X(uc + sg * 0.85), y - 0.05, Z(v) - 0.05]);
          shell.add('stucco', new THREE.BoxGeometry(0.9, 0.08, 0.08), [X(uc + sg * 1.4), y - 0.2, Z(v) - 0.05], [0, 0, sg * 0.25]);
        }
      }
    }
    // tom qiyaliklari (tik chok profilli terrakota)
    const slope = Math.hypot(half + 0.45, rise + 0.45 * Math.tan(pitch));
    for (const sg of [-1, 1]) {
      roof.add('roofTerracotta', new THREE.BoxGeometry(slope, 0.14, Z(v1) - Z(v0) + 0.7), [X(uc + (sg * (half + 0.45)) / 2), eave + 0.28 + rise / 2 - 0.22 * Math.tan(pitch), (Z(v0) + Z(v1)) / 2], [0, 0, -sg * pitch]);
    }
    roof.add('roofTerracotta', new THREE.BoxGeometry(0.22, 0.16, Z(v1) - Z(v0) + 0.7), [X(uc), eave + 0.36 + rise, (Z(v0) + Z(v1)) / 2]);
    return rise;
  };
  gable(0, pavW, PAV_EAVE, (27 * Math.PI) / 180, 0, D, 'oculus');
  gable(W - pavW, W, PAV_EAVE, (27 * Math.PI) / 180, 0, D, 'oculus');
  gable(portico.u0, portico.u1, portico.eave, (29 * Math.PI) / 180, -portico.depth, 2.6, 'cartouche');
  // o‘rta qanot: old va orqa mansard qiyaliklari, o‘rtasi tekis tom
  {
    const top = EAVE + 0.75;
    const run = 2.3;
    const ang = Math.atan2(top - EAVE, run);
    const len = Math.hypot(run + 0.4, top - EAVE + 0.4 * Math.tan(ang));
    const wl = W - 2 * pavW + 0.6;
    roof.add('roofTerracotta', new THREE.BoxGeometry(wl, 0.14, len), [X(W / 2), (EAVE + top) / 2 + 0.25, Z(run / 2 - 0.2)], [-ang, 0, 0]);
    roof.add('roofTerracotta', new THREE.BoxGeometry(wl, 0.14, len), [X(W / 2), (EAVE + top) / 2 + 0.25, Z(D - run / 2 + 0.2)], [ang, 0, 0]);
    roof.boxMinMax('roof', X(pavW - 0.3), top + 0.1, Z(run), X(W - pavW + 0.3), top + 0.25, Z(D - run));
  }

  /* ---------------- balkonlar (temir panjara) ---------------- */
  const balcony = (u0: number, u1: number, plane: number, depth: number) => {
    const z0 = plane - depth;
    shell.boxMinMax('stucco', X(u0), FL2 - 0.12, z0, X(u1), FL2 + 0.06, plane);
    for (const u of [u0 + 0.3, u1 - 0.3]) shell.boxMinMax('stucco', X(u - 0.12), FL2 - 0.55, z0 + 0.1, X(u + 0.12), FL2 - 0.12, plane);
    const yTop = FL2 + 1.05;
    for (const [a0, a1, zA, zB] of [
      [u0, u1, z0, z0],
      [u0, u0, z0, plane],
      [u1, u1, z0, plane],
    ]) {
      shell.boxMinMax('iron', X(a0) - 0.03, yTop - 0.04, Math.min(zA, zB) - 0.03, X(a1) + 0.03, yTop, Math.max(zA, zB) + 0.03);
      shell.boxMinMax('iron', X(a0) - 0.02, FL2 + 0.1, Math.min(zA, zB) - 0.02, X(a1) + 0.02, FL2 + 0.13, Math.max(zA, zB) + 0.02);
    }
    for (let u = u0 + 0.06; u <= u1 - 0.05; u += 0.13) shell.boxMinMax('iron', X(u) - 0.012, FL2 + 0.1, z0 - 0.012, X(u) + 0.012, yTop, z0 + 0.012);
    for (let u = u0 + 0.35; u < u1 - 0.3; u += 0.52) shell.add('iron', new THREE.TorusGeometry(0.17, 0.014, 4, 16), [X(u), FL2 + 0.6, z0]);
  };
  for (const u of [fw.pavilion[1], W - fw.pavilion[1]]) balcony(u - 1.45, u + 1.45, Z(0), 0.75);
  balcony(W / 2 - 1.9, W / 2 + 1.9, Z(-portico.depth), 0.65);

  /* ---------------- kirish: fonuslar, butalar ---------------- */
  for (const u of [portico.u0 + 0.3, portico.u1 - 0.3]) sconce(shell, X(u), 2.7, Z(-portico.depth - 0.2), 0, -1);
  const shrubs = [...frontPil.slice(1, -1), 13.95].flatMap((u) => [u, W - u]);
  const ico = new THREE.IcosahedronGeometry(1, 1);
  for (const u of shrubs) {
    shell.add('plant', ico, [X(u) + 0.75, 0.42, Z(-0.55)], [0, u, 0], [0.42, 0.4, 0.38]);
    shell.add('plant', ico, [X(u) - 0.75, 0.42, Z(-0.55)], [0, u + 1, 0], [0.42, 0.4, 0.38]);
  }

  /* ================= ICHKI QISM ================= */
  const { arcadeRows, piers, backWallV, bar } = L;

  /* ---- 1-qavat shifti: yog‘och reykalar va to‘sinlar ---- */
  inner.boxMinMax('woodDark', X(T), CEIL1 - 0.05, Z(T), X(W - T), CEIL1, Z(D - T));
  for (let v = 1.4; v < backWallV; v += 1.6) {
    if (arcadeRows.some((r) => Math.abs(r - v) < 0.6)) continue;
    inner.boxMinMax('woodDark', X(T), CEIL1 - 0.3, Z(v - 0.1), X(W - T), CEIL1 - 0.05, Z(v + 0.1));
  }
  // qavatlararo plita (zinapoya teshigi bilan) va 2-qavat poli
  const st = L.stair;
  const slab = (u0: number, v0: number, u1: number, v1: number) => {
    inner.boxMinMax('concrete', X(u0), CEIL1, Z(v0), X(u1), FL2 - 0.02, Z(v1));
    inner.boxMinMax('stoneWarm', X(u0), FL2 - 0.02, Z(v0), X(u1), FL2, Z(v1));
  };
  slab(T, T, W - T, st.v0);
  slab(st.u1, st.v0, W - T, D - T);
  slab(T, st.v0, st.u0, D - T);
  slab(st.u0, st.v1, st.u1, D - T);
  slab(portico.u0 + T, -portico.depth + T, portico.u1 - T, T);

  /* ---- arkalar qatori (asosiy zal) ---- */
  const spans: [number, number][] = [[0.75, piers[0] - 0.4], ...piers.slice(0, -1).map((p, i) => [p + 0.4, piers[i + 1] - 0.4] as [number, number]), [piers[piers.length - 1] + 0.4, W - 0.75]];
  for (const v of arcadeRows) {
    const holes = spans.map(([a, b]) => ({ a0: X(a), a1: X(b), y0: FL1 + 0.005, ys: 2.6, ry: Math.min((b - a) / 2, 1.72) }));
    archedWall(inner, 'stuccoInt', 'x', Z(v - 0.3), 1, X(T), X(W - T), FL1, CEIL1, holes, 0.6);
  }
  // lobbi devorlari (yon arkalar bilan)
  for (const u of [portico.u0 - 0.2, portico.u1 - 0.2]) archedWall(inner, 'stuccoInt', 'z', X(u), 1, Z(T), Z(arcadeRows[0] - 0.3), FL1, CEIL1, [{ a0: Z(1.9), a1: Z(4.7), y0: FL1 + 0.005, ys: 2.4, ry: 1.4 }], 0.4);
  // orqa devor: oshxona va zinapoyaga eshiklar
  archedWall(inner, 'stuccoInt', 'x', Z(backWallV), 1, X(T), X(W - T), FL1, CEIL1, [
    { a0: X(5.6), a1: X(7.4), y0: FL1 + 0.005, ys: 2.3, ry: 0.9 },
    { a0: X(29.2), a1: X(30.8), y0: FL1 + 0.005, ys: 2.4 },
  ], 0.3);

  /* ---- bar: majolika devor, yoritilgan tokchalar va shishalar ---- */
  inner.boxMinMax('majolica', X(bar.u0 - 1.5), FL1, Z(backWallV - 0.22), X(bar.u1 + 1.5), CEIL1 - 0.35, Z(backWallV));
  const niches: Hole[] = [
    { a0: X(W / 2 - 2), a1: X(W / 2 + 2), y0: FL1 + 0.8, ys: 3.1, ry: 1.0 },
    { a0: X(bar.u0 - 0.9), a1: X(bar.u0 + 1.9), y0: FL1 + 0.8, ys: 3.1, ry: 0.75 },
    { a0: X(bar.u1 - 1.9), a1: X(bar.u1 + 0.9), y0: FL1 + 0.8, ys: 3.1, ry: 0.75 },
  ];
  for (const n of niches) {
    archPanel(inner, 'stuccoInt', 'x', Z(backWallV - 0.23), n, -1);
    archWindow(inner, null, 'x', Z(backWallV - 0.27), n, 'woodDark', 'stuccoInt', false);
    const w = n.a1 - n.a0;
    for (const y of [FL1 + 1.2, FL1 + 1.8, FL1 + 2.4]) {
      inner.boxMinMax('woodDark', n.a0 + 0.1, y - 0.03, Z(backWallV - 0.55), n.a1 - 0.1, y, Z(backWallV - 0.24));
      inner.boxMinMax('lampWarm', n.a0 + 0.12, y - 0.045, Z(backWallV - 0.3), n.a1 - 0.12, y - 0.03, Z(backWallV - 0.27));
      let k = 0;
      for (let x = n.a0 + 0.2; x < n.a1 - 0.18; x += 0.115) {
        const key: MatKey = k++ % 3 === 1 ? 'bottleAmber' : 'bottle';
        inner.cyl(key, [x, y + 0.13, Z(backWallV - 0.4)], 0.036, 0.26, 'y', 8);
        inner.cyl(key, [x, y + 0.31, Z(backWallV - 0.4)], 0.014, 0.1, 'y', 6, 0.012);
      }
    }
    void w;
  }
  // bar peshtaxtasi (ikat qoplama), yog‘och usti, pastki yoritish, stullar
  inner.boxMinMax('ikat', X(bar.u0), FL1 + 0.1, Z(bar.v0), X(bar.u1), FL1 + 1.05, Z(bar.v1));
  inner.boxMinMax('woodDark', X(bar.u0 - 0.12), FL1 + 1.05, Z(bar.v0 - 0.18), X(bar.u1 + 0.12), FL1 + 1.11, Z(bar.v1 + 0.05));
  inner.boxMinMax('lampWarm', X(bar.u0 + 0.05), FL1, Z(bar.v0 + 0.04), X(bar.u1 - 0.05), FL1 + 0.06, Z(bar.v0 + 0.1));
  inner.boxMinMax('woodDark', X(bar.u0 - 0.5), FL1, Z(bar.v1 + 1.15), X(bar.u1 + 0.5), FL1 + 0.95, Z(bar.v1 + 1.75));
  for (let u = bar.u0 + 0.55; u < bar.u1 - 0.3; u += 0.95) {
    inner.cyl('ikat', [X(u), FL1 + 0.76, Z(bar.v0 - 0.45)], 0.2, 0.08, 'y', 12);
    inner.cyl('iron', [X(u), FL1 + 0.37, Z(bar.v0 - 0.45)], 0.025, 0.74, 'y', 6);
    inner.cyl('iron', [X(u), FL1 + 0.01, Z(bar.v0 - 0.45)], 0.18, 0.02, 'y', 10);
  }
  for (let k = 0; k < 5; k++) lantern(inner, X(bar.u0 + 1.1 + k * 2.2), Z((bar.v0 + bar.v1) / 2), CEIL1 - 1.35, CEIL1, 0.85);

  /* ---- zal stollari va stullari ---- */
  const table = (x: number, z: number, w: number, d: number, y: number) => {
    inner.boxMinMax('woodDark', x - w / 2, y + 0.72, z - d / 2, x + w / 2, y + 0.76, z + d / 2);
    for (const [sx, sz] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ])
      inner.boxMinMax('woodDark', x + sx * (w / 2 - 0.08) - 0.03, y, z + sz * (d / 2 - 0.08) - 0.03, x + sx * (w / 2 - 0.08) + 0.03, y + 0.72, z + sz * (d / 2 - 0.08) + 0.03);
  };
  const plate = (s: Seat, y: number, dist = 0.42) => {
    const [x, z] = yawPt(s.x, s.z, s.face, 0, dist);
    inner.cyl('paintWhite', [x, y + 0.77, z], 0.13, 0.015, 'y', 16);
  };
  for (const t of L.hallTables) {
    table(t.x, t.z, t.w, t.d, FL1);
    for (const s of t.seats) {
      chair(inner, s, FL1);
      plate(s, FL1);
    }
    inner.cyl('brass', [t.x, FL1 + 0.8, t.z], 0.05, 0.08, 'y', 8);
    inner.cyl('lanternGlass', [t.x, FL1 + 0.88, t.z], 0.035, 0.08, 'y', 8);
    decals.push({ kind: (Math.round(t.x + t.z) % 3 === 0 ? 'carpet2' : 'carpet') as Decal['kind'], pos: [t.x, FL1 + 0.004, t.z], w: 2.3, h: 2.9, rot: [-Math.PI / 2, 0, Math.PI / 2] });
  }
  // markaziy yo‘lak gilam yo‘lkalari
  for (let k = 0; k < arcadeRows.length; k++) {
    const v0 = k === 0 ? 0.5 : arcadeRows[k - 1] + 0.5;
    const v1 = arcadeRows[k] - 0.5;
    decals.push({ kind: 'carpet3', pos: [X(W / 2), FL1 + 0.004, Z((v0 + v1) / 2)], w: 2.4, h: v1 - v0, rot: [-Math.PI / 2, 0, 0] });
  }
  // fonuslar (zal bo‘ylab) va ustunlardagi bra
  for (const v of [3.0, 8.5])
    for (const u of [4.9, 13.25, W / 2, W - 13.25, W - 4.9]) lantern(inner, X(u), Z(v), CEIL1 - 1.45, CEIL1, u === W / 2 ? 1.25 : 1);
  for (const u of [5.2, W - 5.2]) lantern(inner, X(u), Z((arcadeRows[1] + backWallV) / 2), CEIL1 - 1.45, CEIL1);
  for (const v of arcadeRows)
    for (const p of piers) {
      for (const sg of [-1, 1]) {
        const z = Z(v + sg * 0.31);
        sconce(inner, X(p), 2.75, z, 0, sg);
        decals.push({ kind: (p + v) % 2 ? 'suzani' : 'carpet2', pos: [X(p), FL1 + 1.15, z + sg * 0.005], w: 0.66, h: 1.3, rot: [0, sg > 0 ? 0 : Math.PI, 0] });
      }
    }
  // yon devorlardagi gilamlar va ko‘zalar
  for (const v of [4.75, 7.0, 10.0]) {
    for (const [x, ry] of [
      [X(T + 0.01), Math.PI / 2],
      [X(W - T - 0.01), -Math.PI / 2],
    ] as const)
      decals.push({ kind: 'carpet', pos: [x, FL1 + 2.05, Z(v)], w: 1.3, h: 2.1, rot: [0, ry, 0] });
  }
  for (const [u, v] of [
    [portico.u0 - 0.9, 1.2],
    [portico.u1 + 0.9, 1.2],
    [bar.u0 - 1.2, bar.v0 - 0.3],
    [bar.u1 + 1.2, bar.v0 - 0.3],
    [0.95, backWallV - 0.7],
    [W - 0.95, backWallV - 0.7],
  ])
    pottedPlant(inner, X(u), FL1, Z(v), 1.1);
  for (const [u, v] of [
    [portico.u0 - 0.4, 8.2],
    [portico.u1 + 0.4, 8.2],
  ]) {
    jug(inner, X(u), FL1, Z(v), 1.4);
    jug(inner, X(u + 0.35), FL1, Z(v), 1.0);
  }
  // lobbi: administrator stoykasi va katta fonus
  inner.boxMinMax('woodDark', X(portico.u1 - 1.25), FL1, Z(1.6), X(portico.u1 - 0.65), FL1 + 1.1, Z(3.0));
  inner.boxMinMax('brass', X(portico.u1 - 1.3), FL1 + 1.1, Z(1.55), X(portico.u1 - 0.6), FL1 + 1.13, Z(3.05));
  lantern(inner, X(W / 2), Z(2.6), CEIL1 - 1.7, CEIL1, 1.5);

  /* ---- oshxona (xizmat qismi) ---- */
  const k = L.kitchen;
  inner.boxMinMax('steel', X(k.u0 + 0.5), FL1, Z(k.v1 - 0.8), X(k.u1 - 0.5), FL1 + 0.9, Z(k.v1 - 0.1));
  inner.boxMinMax('steel', X(k.u0 + 3), FL1, Z((k.v0 + k.v1) / 2 - 0.6), X(k.u1 - 4), FL1 + 0.9, Z((k.v0 + k.v1) / 2 + 0.6));
  inner.boxMinMax('steel', X(k.u0 + 3), CEIL1 - 0.9, Z((k.v0 + k.v1) / 2 - 0.9), X(k.u1 - 4), CEIL1 - 0.4, Z((k.v0 + k.v1) / 2 + 0.9));
  for (let u = k.u0 + 1; u < k.u1 - 1; u += 2.2) inner.boxMinMax('paintDark', X(u), FL1 + 0.9, Z(k.v1 - 0.75), X(u + 0.8), FL1 + 0.94, Z(k.v1 - 0.15));
  // zinapoya
  // zinapoya: sharqdan g‘arbga ko‘tariladigan to‘g‘ri marsh (orqa devor bo‘ylab)
  const steps = 26;
  const run = (st.u1 - st.u0) / steps;
  for (let i = 0; i < steps; i++) {
    const y = FL1 + ((i + 1) * (FL2 - FL1)) / steps;
    const u = st.u1 - i * run;
    inner.boxMinMax('stoneWarm', X(u - run), y - 0.06, Z(st.v0), X(u), y, Z(st.v1));
  }
  inner.beam('iron', [X(st.u1), FL1 + 0.95, Z(st.v0)], [X(st.u0), FL2 + 0.95, Z(st.v0)], 0.05);
  // 2-qavatda zinapoya teshigi atrofidagi panjara
  inner.boxMinMax('iron', X(st.u0 + 1.2), FL2 + 0.95, Z(st.v0 - 0.03), X(st.u1), FL2 + 1.0, Z(st.v0 + 0.03));
  for (let u = st.u0 + 1.2; u <= st.u1; u += 0.6) inner.boxMinMax('iron', X(u) - 0.015, FL2, Z(st.v0) - 0.015, X(u) + 0.015, FL2 + 0.95, Z(st.v0) + 0.015);

  /* ---------------- 2-QAVAT ---------------- */
  const y2 = FL2;
  const T2 = 0.25;
  const doorH = (a: number, w = 1.6): Hole => ({ a0: a - w / 2, a1: a + w / 2, y0: y2 + 0.005, ys: y2 + 2.2, ry: w / 2 });
  // devorlar
  archedWall(inner, 'stuccoInt', 'z', X(L.vip1.u1), -1, Z(T), Z(L.corridor.v0), y2, CEIL2, [doorH(Z(10.6))], T2);
  archedWall(inner, 'stuccoInt', 'z', X(L.vip2.u0), 1, Z(T), Z(L.corridor.v0), y2, CEIL2, [doorH(Z(10.6))], T2);
  archedWall(inner, 'stuccoInt', 'x', Z(L.corridor.v0), 1, X(T), X(W - T), y2, CEIL2, [doorH(X(8.8)), { a0: X(portico.u0 + 0.6), a1: X(portico.u1 - 0.6), y0: y2 + 0.005, ys: y2 + 2.4, ry: 1.4 }, doorH(X(31.8))], T2);
  archedWall(inner, 'stuccoInt', 'x', Z(L.corridor.v1), 1, X(T), X(W - T), y2, CEIL2, [doorH(X(L.stairHall.u1 - 3.2), 1.3), ...L.vipRooms.map((r) => doorH(X((r.u0 + r.u1) / 2), 1.3))], T2);
  for (const r of L.vipRooms) archedWall(inner, 'stuccoInt', 'z', X(r.u0), 1, Z(L.corridor.v1 + T2), Z(r.v1), y2, CEIL2, [], 0.2);
  lantern(roof, X((L.stairHall.u0 + L.stairHall.u1) / 2 + 1), Z(L.corridor.v1 + 1.6), CEIL2 - 1.4, CEIL2, 1.1);
  // 2-qavat shifti va tom osti (tomlar qatlami bilan yashiriladi)
  roof.boxMinMax('paintWhite', X(T), CEIL2, Z(T), X(W - T), CEIL2 + 0.15, Z(D - T));

  /* ---- 1-VIP zal: banket stoli, qandillar, girih shift ---- */
  const v1r = L.vip1;
  const bq = L.banquet;
  inner.boxMinMax('woodDark', X(bq.u0), y2 + 0.72, Z(bq.v - bq.d / 2), X(bq.u1), y2 + 0.77, Z(bq.v + bq.d / 2));
  inner.boxMinMax('ikat', X(bq.u0 + 0.2), y2 + 0.77, Z(bq.v - 0.22), X(bq.u1 - 0.2), y2 + 0.775, Z(bq.v + 0.22));
  for (const u of [bq.u0 + 0.6, (bq.u0 + bq.u1) / 2, bq.u1 - 0.6]) inner.boxMinMax('woodDark', X(u - 0.25), y2, Z(bq.v - 0.35), X(u + 0.25), y2 + 0.72, Z(bq.v + 0.35));
  for (const s of L.banquetSeats) {
    chair(inner, s, y2, true);
    plate(s, y2, 0.48);
  }
  for (let u = bq.u0 + 0.9; u < bq.u1 - 0.5; u += 1.2) {
    inner.cyl('brass', [X(u), y2 + 0.82, Z(bq.v)], 0.04, 0.1, 'y', 8);
    inner.cyl('lanternGlass', [X(u), y2 + 0.92, Z(bq.v)], 0.028, 0.1, 'y', 8);
  }
  for (let u = bq.u0 + 1.5; u < bq.u1 - 1; u += 2.4) {
    inner.cyl('brass', [X(u), y2 + 0.82, Z(bq.v)], 0.12, 0.08, 'y', 12, 0.08);
    inner.add('plant', ico, [X(u), y2 + 0.98, Z(bq.v)], [0, u, 0], [0.18, 0.14, 0.18]);
    inner.add('paintWhite', ico, [X(u + 0.1), y2 + 1.03, Z(bq.v + 0.05)], [0, 0, 0], [0.07, 0.07, 0.07]);
  }
  decals.push({ kind: 'carpet', pos: [X((bq.u0 + bq.u1) / 2), y2 + 0.004, Z(bq.v)], w: 4.2, h: bq.u1 - bq.u0 + 2.4, rot: [-Math.PI / 2, 0, Math.PI / 2] });
  // sayqal mebel (servant) va pardalar
  inner.boxMinMax('woodDark', X(v1r.u1 - 0.75), y2, Z(1.5), X(v1r.u1 - 0.3), y2 + 0.9, Z(8.6));
  for (const v of [3.4, 6.6]) jug(inner, X(v1r.u1 - 0.52), y2 + 0.9, Z(v), 0.9);
  // shift: atrof bo‘ylab tushirilgan karniz, girih panel, yashirin LED, baraban qandillar
  const ceilingPanel = (u0: number, v0: number, u1: number, v1: number, room: { u0: number; u1: number; v0: number; v1: number }) => {
    const y = CEIL2 - 0.45;
    roof.boxMinMax('stuccoInt', X(room.u0 + 0.2), y, Z(room.v0 + 0.2), X(room.u1 - 0.2), y + 0.1, Z(v0));
    roof.boxMinMax('stuccoInt', X(room.u0 + 0.2), y, Z(v1), X(room.u1 - 0.2), y + 0.1, Z(room.v1 - 0.2));
    roof.boxMinMax('stuccoInt', X(room.u0 + 0.2), y, Z(v0), X(u0), y + 0.1, Z(v1));
    roof.boxMinMax('stuccoInt', X(u1), y, Z(v0), X(room.u1 - 0.2), y + 0.1, Z(v1));
    roof.boxMinMax('girih', X(u0), CEIL2 - 0.05, Z(v0), X(u1), CEIL2, Z(v1));
    for (const [a, b2, c, d] of [
      [u0, v0, u1, v0 + 0.05],
      [u0, v1 - 0.05, u1, v1],
      [u0, v0, u0 + 0.05, v1],
      [u1 - 0.05, v0, u1, v1],
    ])
      roof.boxMinMax('lampWarm', X(a), y + 0.1, Z(b2), X(c), y + 0.13, Z(d));
  };
  ceilingPanel(bq.u0 - 0.5, bq.v - 3.6, bq.u1 + 0.5, bq.v + 3.6, v1r);
  const drum = (x: number, z: number, y: number) => {
    roof.cyl('brass', [x, (y + 0.3 + CEIL2) / 2, z], 0.012, CEIL2 - y - 0.3, 'y', 4);
    roof.add('ikat', new THREE.CylinderGeometry(0.5, 0.5, 0.55, 24, 1, true), [x, y, z]);
    roof.cyl('lampWarm', [x, y - 0.2, z], 0.46, 0.02, 'y', 20);
    roof.cyl('brass', [x, y + 0.28, z], 0.51, 0.03, 'y', 24);
    for (let k = 0; k < 28; k++) {
      const a = (k / 28) * Math.PI * 2;
      roof.box('velvet', [x + Math.cos(a) * 0.5, y - 0.38, z + Math.sin(a) * 0.5], [0.035, 0.2, 0.035]);
    }
  };
  for (const u of [bq.u0 + 2.2, (bq.u0 + bq.u1) / 2, bq.u1 - 2.2]) drum(X(u), Z(bq.v), CEIL2 - 1.25);
  // devor gilamlari, bra
  for (const v of [5.75, 10.75]) decals.push({ kind: 'carpet2', pos: [X(T + 0.01), y2 + 2.1, Z(v)], w: 1.4, h: 2.2, rot: [0, Math.PI / 2, 0] });
  for (const v of [2.6, 8.4]) sconce(inner, X(v1r.u1 - 0.27), y2 + 2.3, Z(v), -1, 0);
  // pardalar (derazalar yonida)
  const curtains = (axis: 'x' | 'z', plane: number, inward: number, centers: number[], rx: number) => {
    for (const c of centers)
      for (const sg of [-1, 1]) {
        const a = c + sg * (rx + 0.22);
        if (axis === 'x') inner.boxMinMax('velvet', a - 0.2, y2 + 0.05, plane + inward * 0.06, a + 0.2, CEIL2 - 0.5, plane + inward * 0.16);
        else inner.boxMinMax('velvet', plane + inward * 0.06, y2 + 0.05, a - 0.2, plane + inward * 0.16, CEIL2 - 0.5, a + 0.2);
      }
  };
  curtains('x', Z(T), 1, [...fw.pavilion, ...fw.wing].map(X), 0.95);
  curtains('x', Z(T), 1, [...fw.pavilion, ...fw.wing].map((u) => X(W - u)), 0.95);
  curtains('z', X(T), 1, L.sideWindows.filter((v) => v < L.corridor.v0).map(Z), 0.8);
  curtains('z', X(W - T), -1, L.sideWindows.filter((v) => v < L.corridor.v0).map(Z), 0.8);

  /* ---- 2-VIP zal: dumaloq stollar, rattan qandillar ---- */
  for (const t of L.roundTables) {
    inner.cyl('woodDark', [t.x, y2 + 0.745, t.z], 0.75, 0.05, 'y', 28);
    inner.cyl('woodDark', [t.x, y2 + 0.36, t.z], 0.07, 0.72, 'y', 8);
    inner.cyl('woodDark', [t.x, y2 + 0.02, t.z], 0.32, 0.04, 'y', 16);
    for (const s of t.seats) {
      chair(inner, s, y2, true);
      plate(s, y2, 0.5);
    }
    inner.cyl('brass', [t.x, y2 + 0.8, t.z], 0.05, 0.08, 'y', 8);
    inner.cyl('lanternGlass', [t.x, y2 + 0.88, t.z], 0.035, 0.08, 'y', 8);
    roof.cyl('iron', [t.x, (CEIL2 + CEIL2 - 1.3) / 2, t.z], 0.008, 1.0, 'y', 4);
    roof.add('rattan', new THREE.CylinderGeometry(0.22, 0.38, 0.42, 18, 1, true), [t.x, CEIL2 - 1.35, t.z]);
    roof.cyl('lampWarm', [t.x, CEIL2 - 1.5, t.z], 0.2, 0.02, 'y', 14);
    decals.push({ kind: 'carpet3', pos: [t.x, y2 + 0.004, t.z], w: 2.7, h: 2.7, rot: [-Math.PI / 2, 0, (t.x + t.z) * 0.1] });
  }
  ceilingPanel(26, 2.0, W - 2.2, 10.5, L.vip2);
  // devordagi arkali tokcha va gilam panno
  {
    const n: Hole = { a0: Z(4.3), a1: Z(7.2), y0: y2 + 0.3, ys: y2 + 2.6, ry: 1.45 };
    archPanel(inner, 'woodDark', 'z', X(W - T - 0.02), n, -1);
    decals.push({ kind: 'carpet', pos: [X(W - T - 0.04), y2 + 2.0, Z(5.75)], w: 2.2, h: 3.0, rot: [0, -Math.PI / 2, 0] });
    pottedPlant(inner, X(W - 1.0), y2, Z(4.0), 0.9);
    pottedPlant(inner, X(W - 1.0), y2, Z(7.5), 0.9);
  }

  /* ---- foye va koridor ---- */
  inner.boxMinMax('velvet', X(portico.u0 + 0.6), y2, Z(6), X(portico.u0 + 1.5), y2 + 0.45, Z(10));
  inner.boxMinMax('velvet', X(portico.u1 - 1.5), y2, Z(6), X(portico.u1 - 0.6), y2 + 0.45, Z(10));
  inner.boxMinMax('woodDark', X(W / 2 - 0.6), y2, Z(7.3), X(W / 2 + 0.6), y2 + 0.42, Z(8.7));
  decals.push({ kind: 'carpet2', pos: [X(W / 2), y2 + 0.004, Z(8)], w: 3.4, h: 5.0, rot: [-Math.PI / 2, 0, 0] });
  lantern(roof, X(W / 2), Z(8), CEIL2 - 1.6, CEIL2, 1.4);
  for (let u = 3; u < W - 2; u += 5) sconce(inner, X(u), y2 + 2.3, Z(L.corridor.v0 + T2 + 0.01), 0, 1);

  /* ---- VIP xonalar: supa, ko‘rpachalar, xontaxta, so‘zana, laganlar ---- */
  for (const [i, r] of L.vipRooms.entries()) {
    const u0 = r.u0 + 0.15;
    const u1 = r.u1 - 0.15;
    const v0 = r.v0 + T2 + 1.4;
    const v1 = r.v1 - 0.05;
    const ph = 0.32;
    // U shaklidagi supa
    inner.boxMinMax('woodDark', X(u0), y2, Z(v1 - 1.1), X(u1), y2 + ph, Z(v1));
    inner.boxMinMax('woodDark', X(u0), y2, Z(v0), X(u0 + 1.1), y2 + ph, Z(v1 - 1.1));
    inner.boxMinMax('woodDark', X(u1 - 1.1), y2, Z(v0), X(u1), y2 + ph, Z(v1 - 1.1));
    // ko‘rpachalar va yostiqlar
    inner.boxMinMax('ikat', X(u0 + 0.05), y2 + ph, Z(v1 - 1.05), X(u1 - 0.05), y2 + ph + 0.1, Z(v1 - 0.05));
    inner.boxMinMax('ikat', X(u0 + 0.05), y2 + ph, Z(v0 + 0.05), X(u0 + 1.05), y2 + ph + 0.1, Z(v1 - 1.05));
    inner.boxMinMax('ikat', X(u1 - 1.05), y2 + ph, Z(v0 + 0.05), X(u1 - 0.05), y2 + ph + 0.1, Z(v1 - 1.05));
    for (let u = u0 + 0.7; u < u1 - 0.5; u += 0.9) inner.box('velvet', [X(u), y2 + ph + 0.35, Z(v1 - 0.22)], [0.6, 0.45, 0.16]);
    for (let v = v0 + 0.5; v < v1 - 1.2; v += 0.9) {
      inner.box('velvet', [X(u0 + 0.22), y2 + ph + 0.35, Z(v)], [0.16, 0.45, 0.6]);
      inner.box('velvet', [X(u1 - 0.22), y2 + ph + 0.35, Z(v)], [0.16, 0.45, 0.6]);
    }
    // xontaxta, dasturxon, mevalar, choynak
    const cx = X((r.u0 + r.u1) / 2);
    const cz = Z((v0 + v1 - 1.1) / 2 + 0.3);
    inner.boxMinMax('woodDark', cx - 1.4, y2, cz - 0.65, cx + 1.4, y2 + 0.36, cz + 0.65);
    inner.boxMinMax('velvet', cx - 1.3, y2 + 0.36, cz - 0.55, cx + 1.3, y2 + 0.37, cz + 0.55);
    const fruitKeys: MatKey[] = ['paintOrange', 'paintRed', 'plant', 'paintYellow'];
    for (let kk = 0; kk < 6; kk++) {
      const fx = cx - 1.0 + kk * 0.4;
      inner.cyl('paintWhite', [fx, y2 + 0.38, cz], 0.15, 0.02, 'y', 14);
      inner.add(fruitKeys[kk % 4], ico, [fx, y2 + 0.43, cz], [0, 0, 0], [0.06, 0.05, 0.06]);
    }
    inner.add('brass', new THREE.SphereGeometry(0.1, 12, 8), [cx + 0.9, y2 + 0.46, cz + 0.3]);
    decals.push({ kind: i % 2 ? 'carpet' : 'carpet3', pos: [cx, y2 + 0.004, cz], w: 4.6, h: 6.0, rot: [-Math.PI / 2, 0, Math.PI / 2] });
    // orqa devor: so‘zanalar, laganlar, tokchalar va ko‘zalar
    const bz = Z(r.v1 - 0.02);
    decals.push({ kind: 'suzani', pos: [X(r.u0 + 1.6), y2 + 2.2, bz], w: 0.8, h: 1.6, rot: [0, Math.PI, 0] });
    decals.push({ kind: 'suzani', pos: [X(r.u1 - 1.6), y2 + 2.2, bz], w: 0.8, h: 1.6, rot: [0, Math.PI, 0] });
    for (const [du, dy, s] of [
      [-0.55, 2.55, 0.5],
      [0.55, 2.55, 0.5],
      [0, 2.0, 0.62],
    ] as const)
      decals.push({ kind: i % 2 ? 'lyagan' : 'lyagan2', pos: [cx + du, y2 + dy, bz - 0.005], w: s, h: s, rot: [0, Math.PI, 0] });
    for (const du of [-2.6, 2.6]) {
      const n: Hole = { a0: cx + du - 0.35, a1: cx + du + 0.35, y0: y2 + 1.2, ys: y2 + 1.85, ry: 0.35 };
      archPanel(inner, 'woodDark', 'x', bz - 0.01, n, -1);
      jug(inner, cx + du, y2 + 1.25, bz - 0.15, 0.85);
      inner.boxMinMax('woodDark', cx + du - 0.33, y2 + 1.2, bz - 0.3, cx + du + 0.33, y2 + 1.25, bz - 0.01);
    }
    // yon devor gilamlari
    decals.push({ kind: 'carpet2', pos: [X(r.u0 + 0.21), y2 + 2.25, Z((r.v0 + r.v1) / 2 + 0.6)], w: 1.4, h: 1.9, rot: [0, Math.PI / 2, 0] });
    // yog‘och shift va to‘sinlar, markaziy fonus
    roof.boxMinMax('woodDark', X(r.u0), CEIL2 - 0.06, Z(r.v0 + T2), X(r.u1), CEIL2, Z(r.v1));
    for (let v = r.v0 + 1.2; v < r.v1 - 0.4; v += 1.4) roof.boxMinMax('woodDark', X(r.u0), CEIL2 - 0.3, Z(v - 0.09), X(r.u1), CEIL2 - 0.06, Z(v + 0.09));
    roof.boxMinMax('lampWarm', X(r.u0 + 0.15), CEIL2 - 0.32, Z(r.v1 - 0.12), X(r.u1 - 0.15), CEIL2 - 0.3, Z(r.v1 - 0.06));
    lantern(roof, cx, cz, CEIL2 - 1.5, CEIL2, 1.25);
  }

  return { shell: shell.build(), glass: glass.build(), roof: roof.build(), inner: inner.build(), decals, uplights };
}
