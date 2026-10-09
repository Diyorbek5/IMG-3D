import * as THREE from 'three';
import type { MachineType } from '../../config/equipmentConfig';
import { GeoBuilder } from '../../three/GeoBuilder';
import { WORK_H } from '../../lib/lineLayout';

/**
 * Parametrik stanok geometriyalari.
 * Lokal koordinatalar: markaz (0, 0, 0) — pol sathida, oqim +z yo‘nalishida,
 * L — oqim bo‘yicha uzunlik, W — ko‘ndalang kenglik (x), H — umumiy balandlik.
 * Har bir uskuna o‘ziga xos sanoat geometriyasiga ega (stol, portal, korpus, motorlar, pultlar).
 */

export interface MachineParts {
  solid: GeoBuilder;
  glass: GeoBuilder;
  /** animatsiyalanadigan qism (portal, ko‘targich va h.k.) — lokal o‘rni bilan */
  moving?: { builder: GeoBuilder; kind: 'gantryZ' | 'headX' | 'lifterY' | 'ringSpin'; range: number; base: [number, number, number] };
}

const ico = new THREE.IcosahedronGeometry(1, 0);
/** Yarim silindr: o‘qi z bo‘ylab, egri qismi yuqorida */
const halfCyl = (r: number, len: number) => new THREE.CylinderGeometry(r, r, len, 24, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateY(Math.PI / 2);
const torus = (r: number, t: number) => new THREE.TorusGeometry(r, t, 8, 32);

function legs(b: GeoBuilder, L: number, W: number, h: number, key: 'steel' | 'paintGrey' | 'paintDark' = 'steel') {
  const xs = [-W / 2 + 0.12, W / 2 - 0.12];
  const n = Math.max(2, Math.ceil(L / 1.6) + 1);
  for (const x of xs)
    for (let i = 0; i < n; i++) {
      const z = -L / 2 + 0.12 + ((L - 0.24) * i) / (n - 1);
      b.box(key, [x, h / 2, z], [0.1, h, 0.1]);
      b.box('rubber', [x, 0.02, z], [0.18, 0.04, 0.18]);
    }
}

function controlPanel(b: GeoBuilder, x: number, z: number, rotY = 0) {
  b.box('paintGrey', [x, 0.55, z], [0.25, 1.1, 0.25]);
  b.add('paintWhite', new THREE.BoxGeometry(0.7, 0.5, 0.12), [x, 1.35, z], [-0.35, rotY, 0]);
  b.add('screen', new THREE.BoxGeometry(0.5, 0.32, 0.02), [x + Math.sin(rotY) * 0.07, 1.37, z + Math.cos(rotY) * 0.07], [-0.35, rotY, 0]);
}

function cabinet(b: GeoBuilder, x: number, z: number, w = 0.8, d = 0.5, h = 2.0) {
  b.box('paintGrey', [x, h / 2, z], [w, h, d]);
  b.box('paintDark', [x, h + 0.05, z], [w + 0.04, 0.1, d + 0.04]);
  b.box('screen', [x, h * 0.72, z + d / 2 + 0.01], [w * 0.45, 0.25, 0.01]);
  b.box('paintYellow', [x, h * 0.4, z + d / 2 + 0.01], [0.12, 0.12, 0.01]);
}

function safetyFence(b: GeoBuilder, g: GeoBuilder, L: number, W: number, h = 2.0, openEnds = true) {
  const x0 = -W / 2 - 0.5;
  const x1 = W / 2 + 0.5;
  for (const x of [x0, x1]) {
    for (let z = -L / 2; z <= L / 2 + 1e-3; z += L / 3) b.box('paintYellow', [x, h / 2, z], [0.06, h, 0.06]);
    b.box('paintYellow', [x, h, 0], [0.05, 0.05, L]);
    b.box('paintYellow', [x, 0.15, 0], [0.05, 0.05, L]);
    g.box('glass', [x, h / 2 + 0.08, 0], [0.012, h - 0.2, L]);
  }
  if (!openEnds) {
    for (const z of [-L / 2, L / 2]) g.box('glass', [0, h / 2, z], [W + 1, h - 0.2, 0.012]);
  }
}

export function buildMachine(type: MachineType, L: number, W: number, H: number): MachineParts {
  const b = new GeoBuilder();
  const g = new GeoBuilder();
  const top = WORK_H;
  switch (type) {
    case 'loader': {
      legs(b, L, W, top - 0.12);
      b.box('paintGrey', [0, top - 0.08, 0], [W, 0.14, L]);
      // tayanch roliklar
      for (let z = -L / 2 + 0.3; z < L / 2; z += 0.45) b.cyl('chrome', [0, top + 0.02, z], 0.04, W - 0.3, 'x', 10);
      // qiya ag‘dariladigan rama (A-stellaj tomonidan)
      const tilt = 1.15;
      const fx = W / 2 - 0.2;
      for (const z of [-L / 2 + 0.4, L / 2 - 0.4])
        b.beam('paintOrange', [fx, top, z], [fx + Math.cos(tilt) * 0.2, top + Math.sin(tilt) * 2.4, z], 0.14);
      b.add('paintOrange', new THREE.BoxGeometry(0.12, 2.4, L - 0.6), [fx + 0.1, top + 1.15, 0], [0, 0, -0.42]);
      for (let i = 0; i < 4; i++)
        for (const z of [-L / 4, L / 4]) b.cyl('rubber', [fx + 0.22 + i * 0.12, top + 0.4 + i * 0.5, z], 0.14, 0.05, 'x', 14);
      // gidravlik silindrlar
      b.beam('chrome', [fx - 0.6, 0.3, -L / 2 + 0.6], [fx + 0.15, top + 1.0, -L / 2 + 0.6], 0.08);
      b.beam('chrome', [fx - 0.6, 0.3, L / 2 - 0.6], [fx + 0.15, top + 1.0, L / 2 - 0.6], 0.08);
      controlPanel(b, -W / 2 - 0.5, -L / 2 + 0.3, Math.PI / 2);
      break;
    }
    case 'cutting':
    case 'breakout': {
      legs(b, L, W, top - 0.5, 'paintDark');
      b.box('paintWhite', [0, top - 0.3, 0], [W, 0.45, L]);
      b.box('paintOrange', [0, top - 0.48, -L / 2 - 0.005], [W, 0.06, 0.02]);
      b.box('felt', [0, top - 0.05, 0], [W - 0.1, 0.06, L - 0.1]);
      if (type === 'cutting') {
        // yon relslar
        for (const s of [-1, 1]) b.box('steel', [s * (W / 2 + 0.08), top - 0.05, 0], [0.16, 0.18, L + 0.4]);
        cabinet(b, W / 2 + 0.8, -L / 2 + 0.6, 0.9, 0.6, 1.9);
        controlPanel(b, -W / 2 - 0.6, 0, Math.PI / 2);
        // harakatlanuvchi portal (kesish kallagi bilan)
        const p = new GeoBuilder();
        for (const s of [-1, 1]) {
          p.box('paintWhite', [s * (W / 2 + 0.08), top + 0.32, 0], [0.22, 0.65, 0.5]);
          p.box('paintDark', [s * (W / 2 + 0.08), top + 0.02, 0], [0.26, 0.08, 0.56]);
        }
        p.box('paintWhite', [0, top + 0.72, 0], [W + 0.45, 0.28, 0.42]);
        p.box('paintOrange', [0, top + 0.72, -0.215], [W + 0.45, 0.08, 0.01]);
        p.box('paintDark', [0.6, top + 0.42, 0.25], [0.32, 0.5, 0.26]);
        p.cyl('chrome', [0.6, top + 0.12, 0.25], 0.03, 0.2, 'y', 8);
        return { solid: b, glass: g, moving: { builder: p, kind: 'gantryZ', range: L / 2 - 0.4, base: [0, 0, 0] } };
      } else {
        // sindirish to‘sinlari va havo ventilyatori
        for (const z of [-L / 6, L / 6]) b.box('steel', [0, top + 0.03, z], [W - 0.4, 0.05, 0.08]);
        b.cyl('paintGrey', [-W / 2 + 0.6, 0.35, 0], 0.32, 0.4, 'x', 18);
        controlPanel(b, W / 2 + 0.55, L / 2 - 0.3, -Math.PI / 2);
      }
      break;
    }
    case 'edger': {
      b.box('paintWhite', [0, 0.42, 0], [W, 0.84, L]);
      b.box('paintDark', [0, 0.03, 0], [W + 0.05, 0.06, L + 0.05]);
      // markaziy transport tasmasi
      b.box('rubber', [0, top - 0.04, 0], [W * 0.42, 0.06, L + 0.1]);
      // ikkita silliqlash kallagi qopqoqlari
      for (const s of [-1, 1]) {
        const x = s * (W / 2 - 0.42);
        b.box('paintWhite', [x, 1.35, 0], [0.8, 1.1, L - 0.3]);
        b.box('paintOrange', [x, 1.0, 0], [0.82, 0.07, L - 0.28]);
        g.box('glassTint', [x - s * 0.41, 1.45, 0], [0.02, 0.4, L - 1.2]);
        for (let i = 0; i < 6; i++) {
          const z = -L / 2 + 0.9 + (i * (L - 1.8)) / 5;
          b.cyl('steel', [x + s * 0.1, 2.05, z], 0.17, 0.35, 'y', 16);
          b.cyl('paintBlue', [x + s * 0.1, 2.26, z], 0.12, 0.07, 'y', 16);
        }
      }
      // sovutish suyuqligi baki
      b.box('paintBlue', [W / 2 + 0.55, 0.45, L / 2 - 1.0], [0.7, 0.9, 1.4]);
      cabinet(b, W / 2 + 0.6, -L / 2 + 0.8, 0.8, 0.6, 2.0);
      controlPanel(b, -W / 2 - 0.55, -L / 2 + 0.6, Math.PI / 2);
      break;
    }
    case 'washer': {
      b.box('paintWhite', [0, 0.55, 0], [W, 1.1, L]);
      b.box('paintGrey', [0, top + 0.6, 0], [W, 1.0, L - 0.6]);
      // yumaloq qopqoq (yarim silindr)
      b.add('paintGrey', halfCyl(W / 2, L - 0.6), [0, top + 1.1, 0], [0, 0, 0], [1, 0.35, 1]);
      // kirish-chiqish tirqishlari
      for (const s of [-1, 1]) b.box('rubber', [0, top + 0.08, s * (L / 2 - 0.28)], [W * 0.85, 0.12, 0.02]);
      // kuzatish oynalari
      for (const s of [-1, 1]) g.box('glassTint', [s * (W / 2 + 0.005), top + 0.55, 0], [0.01, 0.45, L * 0.55]);
      // havo puflagich korpuslari
      for (const z of [-L / 4, L / 4]) {
        b.cyl('paintGrey', [W / 2 - 0.5, H - 0.35, z], 0.32, 0.7, 'y', 18);
        b.cyl('steel', [W / 2 - 0.5, H + 0.0, z], 0.2, 0.05, 'y', 18);
      }
      b.box('galvanized', [W / 2 - 0.5, H - 0.1, 0], [0.3, 0.3, L / 2]);
      // suv baki va nasos
      b.box('paintBlue', [-W / 2 - 0.55, 0.5, -L / 4], [0.8, 1.0, 1.6]);
      b.cyl('steel', [-W / 2 - 0.55, 1.15, L / 6], 0.18, 0.5, 'z', 14);
      cabinet(b, -W / 2 - 0.55, L / 2 - 0.6, 0.8, 0.6, 2.0);
      break;
    }
    case 'pillar':
    case 'sealer':
    case 'assembly': {
      legs(b, L, W - 0.4, top - 0.1, 'paintDark');
      b.box('paintGrey', [0, top - 0.06, 0], [W - 0.4, 0.12, L]);
      for (let z = -L / 2 + 0.25; z < L / 2; z += 0.35) b.cyl('chrome', [0, top + 0.02, z], 0.035, W - 0.6, 'x', 10);
      // portal ustunlar
      const ph = H - 0.2;
      for (const s of [-1, 1])
        for (const z of [-L / 2 + 0.25, L / 2 - 0.25]) b.box('paintWhite', [s * (W / 2 + 0.05), ph / 2, z], [0.2, ph, 0.2]);
      for (const s of [-1, 1]) b.box('paintWhite', [s * (W / 2 + 0.05), ph, 0], [0.22, 0.25, L - 0.3]);
      safetyFence(b, g, L - 0.6, W + 0.4, 1.8, true);
      cabinet(b, W / 2 + 1.25, -L / 2 + 0.5, 0.8, 0.6, 1.9);
      controlPanel(b, -W / 2 - 1.2, L / 2 - 0.4, Math.PI / 2);
      const p = new GeoBuilder();
      if (type === 'assembly') {
        p.box('paintWhite', [0, ph, 0], [W + 0.3, 0.3, 0.4]);
        p.cyl('chrome', [0, ph - 0.7, 0], 0.06, 1.1, 'y', 10);
        p.box('paintOrange', [0, ph - 1.3, 0], [W - 0.9, 0.1, 0.12]);
        p.box('paintOrange', [0, ph - 1.3, 0], [0.12, 0.1, L - 1.6]);
        for (const [x, z] of [
          [-0.7, -0.8],
          [0.7, -0.8],
          [-0.7, 0.8],
          [0.7, 0.8],
        ])
          p.cyl('rubber', [x, ph - 1.4, z], 0.14, 0.06, 'y', 12);
        // ikkinchi listlar uchun vertikal kasseta
        b.box('steel', [-W / 2 - 1.2, 0.08, 0], [0.9, 0.16, L - 1.0]);
        for (let i = 0; i < 5; i++) g.box('glassSheet', [-W / 2 - 1.4 + i * 0.1, 1.05, 0], [0.012, 1.7, L - 1.4]);
        return { solid: b, glass: g, moving: { builder: p, kind: 'lifterY', range: 0.55, base: [0, 0, 0] } };
      }
      p.box('paintWhite', [0, ph, 0], [W + 0.3, 0.28, 0.36]);
      p.box(type === 'pillar' ? 'paintOrange' : 'paintBlue', [0.3, ph - 0.35, 0.22], [0.3, 0.5, 0.3]);
      p.cyl('chrome', [0.3, ph - 0.85, 0.22], 0.03, 0.5, 'y', 8);
      if (type === 'sealer') {
        b.cyl('paintBlue', [W / 2 + 1.2, 0.6, L / 2 - 0.6], 0.3, 1.2, 'y', 18);
        b.cyl('steel', [W / 2 + 1.2, 1.25, L / 2 - 0.6], 0.32, 0.1, 'y', 18);
      } else {
        // tayanchlar bunkeri
        b.cyl('paintGrey', [W / 2 + 1.2, 1.1, L / 2 - 0.7], 0.3, 0.6, 'y', 16, 0.12);
        b.box('steel', [W / 2 + 1.2, 0.4, L / 2 - 0.7], [0.5, 0.8, 0.5]);
      }
      return { solid: b, glass: g, moving: { builder: p, kind: 'gantryZ', range: L / 2 - 0.6, base: [0, 0, 0] } };
    }
    case 'vacuum': {
      // poydevor ramasi
      b.box('paintDark', [0, 0.15, 0], [W, 0.3, L]);
      // izolyatsiyalangan kamera
      const ch = H - 0.5;
      b.box('paintWhite', [0, 0.3 + ch / 2, 0], [W, ch, L - 0.5]);
      b.add('paintWhite', halfCyl(W / 2, L - 0.5), [0, 0.3 + ch, 0], [0, 0, 0], [1, 0.22, 1]);
      for (let z = -L / 2 + 1.2; z < L / 2 - 0.5; z += 1.2) b.box('paintGrey', [0, 0.3 + ch / 2, z], [W + 0.04, ch - 0.1, 0.05]);
      b.box('paintOrange', [0, 0.85, 0], [W + 0.03, 0.08, L - 0.5]);
      // kirish va chiqish eshiklari
      for (const s of [-1, 1]) {
        b.box('steel', [0, top + 0.5, s * (L / 2 - 0.2)], [W - 0.4, 1.4, 0.15]);
        b.box('rubber', [0, top + 0.05, s * (L / 2 - 0.12)], [W * 0.7, 0.1, 0.02]);
      }
      // ko‘rish oynasi (ichki issiqlik)
      for (const z of [-L / 4, L / 4]) b.box('heat', [W / 2 + 0.01, top + 0.6, z], [0.02, 0.25, 0.6]);
      // vakuum nasoslari (−x tomonda)
      for (const z of [-L / 3, 0, L / 3]) {
        b.box('paintBlue', [-W / 2 - 0.9, 0.45, z], [1.0, 0.9, 1.1]);
        b.cyl('steel', [-W / 2 - 0.9, 1.05, z], 0.22, 0.3, 'y', 16);
        b.beam('steel', [-W / 2 - 0.9, 1.2, z], [-W / 2 - 0.2, 1.6, z], 0.1);
        b.beam('chrome', [-W / 2 - 0.2, 1.6, z], [-W / 2 + 0.05, 1.6, z], 0.12);
      }
      // chiqindi gaz quvurlari
      for (const z of [-L / 3, L / 3]) {
        b.cyl('galvanized', [W / 4, H + 0.6, z], 0.18, 1.6, 'y', 14);
        b.cyl('galvanized', [W / 4, H + 1.45, z], 0.24, 0.12, 'y', 14);
      }
      cabinet(b, W / 2 + 0.6, -L / 2 + 0.6, 1.0, 0.6, 2.1);
      cabinet(b, W / 2 + 0.6, -L / 2 + 1.8, 1.0, 0.6, 2.1);
      controlPanel(b, W / 2 + 0.6, L / 2 - 0.5, -Math.PI / 2);
      break;
    }
    case 'inspection': {
      legs(b, L, W - 0.4, top - 0.1);
      b.box('paintGrey', [0, top - 0.06, 0], [W - 0.4, 0.12, L]);
      for (let z = -L / 2 + 0.25; z < L / 2; z += 0.35) b.cyl('chrome', [0, top + 0.02, z], 0.035, W - 0.6, 'x', 10);
      // yorug‘lik devori (LED)
      b.box('paintDark', [W / 2 + 0.35, 1.4, 0], [0.18, 2.6, L - 0.4]);
      b.box('lightPanel', [W / 2 + 0.25, 1.45, 0], [0.02, 2.3, L - 0.7]);
      // operator joyi
      b.box('paintYellow', [-W / 2 - 0.8, 0.01, 0], [1.2, 0.02, 2.2]);
      b.box('paintWhite', [-W / 2 - 1.5, 0.75, L / 2 - 0.6], [0.8, 0.05, 1.2]);
      b.box('screen', [-W / 2 - 1.5, 1.05, L / 2 - 0.6], [0.04, 0.35, 0.55]);
      b.box('fabric', [-W / 2 - 0.9, 0.45, L / 2 - 0.6], [0.45, 0.9, 0.45]);
      break;
    }
    case 'testing': {
      legs(b, L, W - 0.4, top - 0.1);
      b.box('paintGrey', [0, top - 0.06, 0], [W - 0.4, 0.12, L]);
      for (let z = -L / 2 + 0.25; z < L / 2; z += 0.35) b.cyl('chrome', [0, top + 0.02, z], 0.035, W - 0.6, 'x', 10);
      // o‘lchov arkasi
      for (const s of [-1, 1]) b.box('paintWhite', [s * (W / 2 + 0.1), 1.2, 0], [0.2, 2.4, 0.4]);
      b.box('paintWhite', [0, 2.35, 0], [W + 0.4, 0.2, 0.4]);
      for (const x of [-0.8, 0, 0.8]) b.box('paintBlue', [x, 2.12, 0], [0.18, 0.25, 0.18]);
      cabinet(b, W / 2 + 0.7, L / 2 - 0.5, 0.8, 0.6, 1.9);
      // yaroqsiz mahsulot stellaji
      b.box('paintRed', [-W / 2 - 0.8, 0.08, 0], [0.8, 0.16, L - 0.6]);
      b.box('paintRed', [-W / 2 - 0.8, 0.9, 0], [0.08, 1.6, L - 0.6]);
      break;
    }
    case 'packing': {
      legs(b, L, W - 0.4, top - 0.1);
      b.box('paintGrey', [0, top - 0.06, 0], [W - 0.4, 0.12, L]);
      for (let z = -L / 2 + 0.25; z < L / 2; z += 0.35) b.cyl('chrome', [0, top + 0.02, z], 0.035, W - 0.6, 'x', 10);
      // o‘rash halqasi ramasi
      for (const s of [-1, 1]) b.box('paintWhite', [s * (W / 2 + 0.25), H / 2, 0], [0.25, H, 0.5]);
      b.box('paintWhite', [0, H, 0], [W + 0.75, 0.25, 0.5]);
      const p = new GeoBuilder();
      p.add('steel', torus(1.35, 0.06), [0, 0, 0]);
      p.box('paintOrange', [0, 1.35, 0], [0.25, 0.2, 0.3]);
      p.cyl('fabric', [0, 1.35, 0.25], 0.08, 0.5, 'z', 10);
      // yashik yig‘ish stoli va plyonka rulonlari
      b.box('wood', [W / 2 + 1.6, 0.5, 0], [1.4, 0.1, 2.4]);
      b.box('steel', [W / 2 + 1.6, 0.22, 0], [1.3, 0.44, 2.3]);
      for (const z of [-0.6, 0, 0.6]) b.cyl('fabric', [-W / 2 - 0.7, 0.6, z], 0.15, 0.5, 'y', 12);
      return { solid: b, glass: g, moving: { builder: p, kind: 'ringSpin', range: 0, base: [0, top + 0.6, 0] } };
    }
    case 'tempering': {
      // lokal z bo‘ylab uzun pech (keyin aylantiriladi)
      const sec = L / 4;
      legs(b, sec, W, top - 0.1);
      b.box('paintGrey', [0, top - 0.06, -L / 2 + sec / 2], [W, 0.12, sec]);
      b.box('paintWhite', [0, (H + 0.2) / 2, -sec / 2], [W + 0.4, H + 0.2, sec * 1.4]);
      b.box('paintOrange', [0, H - 0.1, -sec / 2], [W + 0.42, 0.12, sec * 1.4]);
      b.box('heat', [W / 2 + 0.21, top + 0.4, -sec / 2], [0.02, 0.2, sec]);
      b.box('paintGrey', [0, H / 2, sec * 0.95], [W + 0.2, H, sec * 0.8]);
      for (let i = 0; i < 3; i++) b.cyl('steel', [0, H + 0.35, sec * 0.6 + i * 0.7], 0.32, 0.7, 'y', 18);
      legs(b, sec * 0.9, W, top - 0.1);
      b.box('paintGrey', [0, top - 0.06, L / 2 - sec * 0.45], [W, 0.12, sec * 0.9]);
      cabinet(b, -W / 2 - 0.8, -sec / 2, 1.0, 0.6, 2.1);
      void ico;
      break;
    }
    default:
      b.box('paintGrey', [0, H / 2, 0], [W, H, L]);
  }
  return { solid: b, glass: g };
}
