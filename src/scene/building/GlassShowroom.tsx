import { useMemo } from 'react';
import * as THREE from 'three';
import { factoryConfig } from '../../config/factoryConfig';
import { showroomRect } from '../../lib/layout';
import { FLOOR_Y } from '../../lib/lineLayout';
import { GeoBuilder, type MatKey } from '../../three/GeoBuilder';
import { listTexture, signTexture, towerPhotoTexture } from '../../three/textures';
import { useStore } from '../../state/store';
import { Built } from '../common/Built';
import { curtainWall } from './shellBuilders';
import { LogoPlane } from './FrontFacade';

type V3 = [number, number, number];

/** Yozuvli / tasvirli panel (teksturasi komponentda yaratiladi — builder DOM’siz ishlaydi) */
export interface ShowroomPanel {
  tex: { type: 'list'; lines: string[]; icons?: boolean } | { type: 'sign'; text: string; fg?: string; weight?: number; w?: number; h?: number } | { type: 'photo' };
  pos: V3;
  size: [number, number];
  /** panel normali: 0 → +z, π → −z, π/2 → +x, −π/2 → −x */
  rotY: number;
}

/** Profil tizimlari namunalari (stend) */
const PROFILE_SAMPLES = ['Thermo 57', 'Thermo 70', 'Thermo 88', 'Engelberg 7000', 'Engelberg 8000', 'Slide Master BKH 35', 'Slide Master BKH 65', 'Gelatina', 'Pergola'];
const GLASS_PRODUCTS = ['Tempered glass', 'Laminated glass', 'Insulated glass', 'Mirror solutions', 'Facade glass', 'Processing', 'Project solutions'];
const SYSTEMS = ['Windows & doors', 'Aluminium systems', 'Sliding systems', 'Guillotine systems', 'Facade systems', 'Pergola systems', 'Service & support'];
const SAMPLE_GLASS: MatKey[] = ['glassSheet', 'glassGreen', 'glassGrey', 'glassBlue', 'glassBronze', 'mirror'];

/**
 * Showroom — 12 × 24 m, balandligi 9 m, to‘liq shishali hajm (old fasadning o‘ng burchagi).
 * Ichki makon zamonaviy ko‘rgazma zali sifatida: qora marmar brend devori va iMG logotipi, marmar resepshn,
 * arxitektura shishalari vitrinasi, alyuminiy profil tizimlari stendi, eshik-rom bokslari, antresol (2-sath),
 * mehmonlar lounge zonasi, trek-chiroqlar va LED yoritish.
 * Joylashuv showroom o‘lchamlariga nisbatan (u — g‘arbiy devordan, v — old devordan, metrda) beriladi.
 */
export function buildShowroom(cfg = factoryConfig) {
  const r = showroomRect(cfg);
  const H = cfg.showroom.height;
  const F = FLOOR_Y;
  const solid = new GeoBuilder();
  const glass = new GeoBuilder();
  /** shift, tom va shiftdagi yoritgichlar — "Tomlar" qatlami o‘chirilganda yashiriladi */
  const roof = new GeoBuilder();
  const panels: ShowroomPanel[] = [];
  const fascia = 0.9;
  const gTop = H - fascia;
  const step = cfg.glassCorner.mullionSpacing;
  const transoms = [3.2, 6.2];
  const SW = r.x1 - r.x0;
  const SD = r.z1 - r.z0;
  // g‘arbiy devordan (u) va old devordan (v) o‘lchanadigan lokal koordinatalar
  const X = (u: number) => r.x0 + u;
  const Z = (v: number) => r.z0 + v;
  const led = (b: GeoBuilder, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => b.boxMinMax('lampWarm', x0, y0, z0, x1, y1, z1);

  /* ================= Qobiq ================= */
  // poydevor va marmar pol
  solid.boxMinMax('concreteDark', r.x0 - 0.05, -0.3, r.z0 - 0.05, r.x1 + 0.05, F - 0.02, r.z1);
  solid.boxMinMax('floorShowroom', r.x0 + 0.05, F - 0.02, r.z0 + 0.05, r.x1 - 0.05, F, r.z1);
  // fasad karnizi (tashqi alyuminiy band)
  solid.boxMinMax('aluDark', r.x0 - 0.25, gTop - 0.05, r.z0 - 0.25, r.x1 + 0.25, H, r.z0 + 0.15);
  solid.boxMinMax('aluDark', r.x0 - 0.25, gTop - 0.05, r.z0 - 0.25, r.x0 + 0.15, H, r.z1);
  solid.boxMinMax('aluDark', r.x1 - 0.15, gTop - 0.05, r.z0 - 0.25, r.x1 + 0.25, H, r.z1);
  // shift plitasi va tom
  roof.boxMinMax('paintWhite', r.x0 + 0.15, gTop, r.z0 + 0.15, r.x1 - 0.15, H - 0.1, r.z1);
  roof.boxMinMax('roof', r.x0 + 0.15, H - 0.12, r.z0 + 0.15, r.x1 - 0.15, H - 0.05, r.z1);

  // vitrajlar: shimoliy (old), sharqiy va g‘arbiy fasadlar — tonirovkali shisha
  const cw = { heavyEvery: 2, depth: 0.2, glassKey: 'glassFacade' as MatKey };
  curtainWall(glass, solid, 'x', r.z0, r.x0, r.x1, F, gTop, step, transoms, cw);
  curtainWall(glass, solid, 'z', r.x1, r.z0, r.z1, F, gTop, step, transoms, cw);
  curtainWall(glass, solid, 'z', r.x0, r.z0, r.z1, F, gTop, step, transoms, cw);
  for (const [x, z] of [
    [r.x0, r.z0],
    [r.x1, r.z0],
  ])
    solid.box('aluDark', [x, (F + gTop) / 2, z], [0.22, gTop - F, 0.22]);

  // kirish: markazda ikki tabaqali shisha eshik, soyabon va maydoncha
  const dx = X(SW / 2);
  for (const sx of [-1.3, -0.04, 1.22]) solid.boxMinMax('aluminium', dx + sx, F, r.z0 - 0.12, dx + sx + 0.08, 3.0, r.z0 + 0.06);
  solid.boxMinMax('aluminium', dx - 1.3, 2.92, r.z0 - 0.12, dx + 1.3, 3.02, r.z0 + 0.06);
  for (const sx of [-0.18, 0.18]) solid.box('chrome', [dx + sx, F + 1.1, r.z0 - 0.15], [0.03, 1.4, 0.04]);
  solid.boxMinMax('aluDark', dx - 2.2, 3.4, r.z0 - 2.2, dx + 2.2, 3.6, r.z0);
  led(solid, dx - 2.0, 3.38, r.z0 - 2.0, dx + 2.0, 3.4, r.z0 - 1.9);
  solid.boxMinMax('concrete', dx - 2.4, 0, r.z0 - 2.6, dx + 2.4, F - 0.03, r.z0);
  solid.boxMinMax('rubber', dx - 1.4, F, Z(0.3), dx + 1.4, F + 0.012, Z(2.1));

  /* ================= Orqa devor: brend zonasi ================= */
  const wz = Z(SD - 0.55); // panellar old yuzasi
  // umumiy fon devori (asosiy bino vitrajini yopadi)
  solid.boxMinMax('stoneGrey', X(0.15), F, Z(SD - 0.5), X(SW - 0.15), gTop, Z(SD - 0.3));
  // (kirishdan qaraganda: chapda — shisha mahsulotlari, markazda — marmar brend devori, o‘ngda — istek tizimlari)
  // 1) istek paneli — rom-eshik tizimlari ro‘yxati (g‘arbiy tomonda)
  const i0 = X(1.4);
  const i1 = X(3.15);
  solid.boxMinMax('stoneGrey', i0, F, wz - 0.2, i1, 7.6, wz);
  for (let k = 0; k < 3; k++) solid.box('paintOrange', [(i0 + i1) / 2 - 0.22 + k * 0.2, 6.75 + k * 0.03, wz - 0.24], [0.15, 0.62, 0.05]);
  panels.push({ tex: { type: 'sign', text: 'istek', weight: 800, w: 512, h: 200 }, pos: [(i0 + i1) / 2, 6.05, wz - 0.21], size: [1.6, 0.62], rotY: Math.PI });
  panels.push({ tex: { type: 'sign', text: 'ROM FABRIKASI', weight: 700, w: 512, h: 80 }, pos: [(i0 + i1) / 2, 5.62, wz - 0.21], size: [1.6, 0.25], rotY: Math.PI });
  panels.push({ tex: { type: 'list', lines: SYSTEMS, icons: true }, pos: [(i0 + i1) / 2, 3.35, wz - 0.21], size: [1.65, 3.4], rotY: Math.PI });
  // 2) yog‘och reykali panel
  for (let x = X(3.25); x < X(4.0); x += 0.13) solid.boxMinMax('wood', x, F, wz - 0.16, x + 0.07, 7.2, wz);
  // 3) qora marmar brend devori, iMG logotipi, LED chiziqlar
  const m0 = X(4.1);
  const m1 = X(9.2);
  solid.boxMinMax('marbleDark', m0, F, wz - 0.25, m1, 7.2, wz);
  led(solid, m0, 7.2, wz - 0.24, m1, 7.24, wz - 0.02);
  led(solid, m0 + 0.2, F + 1.45, wz - 0.27, m1 - 0.2, F + 1.47, wz - 0.25);
  for (const x of [m0 - 0.03, m1]) led(solid, x, F, wz - 0.2, x + 0.03, 7.2, wz - 0.05);
  // 4) shisha mahsulotlari paneli + shisha fasadli bino fotosurati (sharqiy tomonda)
  const g0 = X(9.35);
  const g1 = X(SW - 0.2);
  solid.boxMinMax('stoneGrey', g0, F, wz - 0.2, g1, 7.4, wz);
  panels.push({ tex: { type: 'photo' }, pos: [(g0 + g1) / 2, 5.95, wz - 0.21], size: [1.75, 2.5], rotY: Math.PI });
  solid.boxMinMax('aluDark', (g0 + g1) / 2 - 0.9, 4.6, wz - 0.22, (g0 + g1) / 2 + 0.9, 4.64, wz - 0.2);
  panels.push({ tex: { type: 'list', lines: GLASS_PRODUCTS }, pos: [(g0 + g1) / 2, 3.0, wz - 0.21], size: [2.1, 2.9], rotY: Math.PI });
  // orqa devor ustidagi shift karnizi (bulkhead) va yashirin LED
  roof.boxMinMax('paintWhite', X(0.15), gTop - 0.7, Z(SD - 1.4), X(SW - 0.15), gTop, Z(SD - 0.3));
  led(roof, X(0.3), gTop - 0.72, Z(SD - 1.42), X(SW - 0.3), gTop - 0.7, Z(SD - 1.3));

  /* ================= Resepshn ================= */
  const rc = (m0 + m1) / 2;
  const rz0 = Z(SD - 4.65);
  const rz1 = Z(SD - 3.75);
  solid.boxMinMax('marbleDark', rc - 2.25, F + 0.08, rz0 + 0.06, rc + 2.25, F + 1.05, rz1);
  solid.boxMinMax('marbleDark', rc - 2.35, F + 1.05, rz0 - 0.04, rc + 2.35, F + 1.11, rz1 + 0.02);
  led(solid, rc - 2.2, F, rz0 + 0.04, rc + 2.2, F + 0.08, rz0 + 0.1);
  led(solid, rc - 2.3, F + 1.04, rz0 - 0.05, rc + 2.3, F + 1.05, rz0 - 0.03);
  // ish stoli va jihozlar
  solid.boxMinMax('wood', rc - 2.1, F + 0.72, rz1, rc + 2.1, F + 0.76, rz1 + 0.6);
  for (const sx of [-1.9, 1.9]) solid.boxMinMax('marbleDark', rc + sx - 0.12, F, rz1, rc + sx + 0.12, F + 0.72, rz1 + 0.6);
  for (const sx of [-0.9, 0.9]) {
    solid.box('paintDark', [rc + sx, F + 0.95, rz1 + 0.25], [0.6, 0.38, 0.03]);
    solid.box('screen', [rc + sx, F + 0.95, rz1 + 0.233], [0.56, 0.33, 0.005]);
    solid.box('paintDark', [rc + sx, F + 0.79, rz1 + 0.28], [0.06, 0.08, 0.06]);
    // ofis kreslosi
    solid.box('fabric', [rc + sx, F + 0.48, rz1 + 1.05], [0.52, 0.08, 0.5]);
    solid.box('fabric', [rc + sx, F + 0.8, rz1 + 1.3], [0.5, 0.6, 0.07]);
    solid.cyl('chrome', [rc + sx, F + 0.24, rz1 + 1.05], 0.03, 0.46, 'y', 8);
    solid.cyl('paintDark', [rc + sx, F + 0.03, rz1 + 1.05], 0.3, 0.05, 'y', 12);
  }
  for (const sx of [-2.0, 2.0]) solid.add('plant', unitIco(), [rc + sx, F + 1.32, (rz0 + rz1) / 2], [0, 0, 0], [0.22, 0.2, 0.22]);
  // resepshn ustidagi chiziqli osma chiroq
  for (const sx of [-1.7, 1.7]) roof.cyl('aluDark', [rc + sx, (gTop + 5.6) / 2, (rz0 + rz1) / 2], 0.008, gTop - 5.6, 'y', 4);
  roof.boxMinMax('aluDark', rc - 1.9, 5.56, (rz0 + rz1) / 2 - 0.06, rc + 1.9, 5.66, (rz0 + rz1) / 2 + 0.06);
  led(roof, rc - 1.85, 5.54, (rz0 + rz1) / 2 - 0.04, rc + 1.85, 5.56, (rz0 + rz1) / 2 + 0.04);

  /* ================= Daraxtlar (zaytun) beton tuvaklarda ================= */
  const tree = (x: number, z: number, s = 1) => {
    solid.boxMinMax('stoneGrey', x - 0.45 * s, F, z - 0.45 * s, x + 0.45 * s, F + 0.85 * s, z + 0.45 * s);
    solid.boxMinMax('concreteDark', x - 0.4 * s, F + 0.85 * s - 0.04, z - 0.4 * s, x + 0.4 * s, F + 0.85 * s - 0.01, z + 0.4 * s);
    solid.cyl('wood', [x, F + 0.85 * s + 0.75 * s, z], 0.05 * s, 1.5 * s, 'y', 7);
    for (const [ox, oy, oz, sc] of [
      [0, 2.1, 0, 0.6],
      [0.35, 1.85, 0.15, 0.45],
      [-0.3, 1.95, -0.2, 0.5],
      [0.05, 2.45, -0.1, 0.42],
    ])
      solid.add('plant', unitIco(), [x + ox * s, F + oy * s + 0.5 * s, z + oz * s], [0, ox, 0], [sc * s, sc * 0.8 * s, sc * s]);
  };
  tree(X(3.55), Z(SD - 4.2), 1.05);
  tree(X(9.75), Z(SD - 4.2), 1.05);
  tree(X(SW - 0.9), Z(1.1), 0.8);

  /* ================= Antresol (2-sath) va zinapoya — g‘arbiy tomonda ================= */
  const MZ = 3.6;
  const mu1 = 3.8; // antresolning sharqiy cheti (u)
  const mv0 = 5.6;
  const mv1 = SD - 5.4;
  solid.boxMinMax('paintWhite', X(0.15), MZ - 0.3, Z(mv0), X(mu1), MZ, Z(mv1));
  solid.boxMinMax('floorShowroom', X(0.15), MZ, Z(mv0), X(mu1), MZ + 0.02, Z(mv1));
  // fasad bandi + pastki LED
  solid.boxMinMax('aluDark', X(mu1), MZ - 0.32, Z(mv0), X(mu1 + 0.08), MZ + 0.12, Z(mv1));
  solid.boxMinMax('aluDark', X(0.15), MZ - 0.32, Z(mv0 - 0.08), X(mu1 + 0.08), MZ + 0.12, Z(mv0));
  led(solid, X(mu1 - 0.06), MZ - 0.34, Z(mv0), X(mu1 + 0.08), MZ - 0.32, Z(mv1));
  // ustunlar
  for (const v of [mv0 + 0.2, (mv0 + mv1) / 2, mv1 - 0.2]) solid.box('aluDark', [X(mu1 - 0.15), (F + MZ - 0.3) / 2, Z(v)], [0.2, MZ - 0.3 - F, 0.2]);
  // shisha to‘siq (balyustrada) va poruchen
  glass.boxMinMax('glass', X(mu1 + 0.01), MZ + 0.12, Z(mv0), X(mu1 + 0.03), MZ + 1.1, Z(mv1));
  solid.boxMinMax('chrome', X(mu1 - 0.01), MZ + 1.1, Z(mv0), X(mu1 + 0.05), MZ + 1.14, Z(mv1));
  glass.boxMinMax('glass', X(1.3), MZ + 0.02, Z(mv1 - 0.03), X(mu1), MZ + 1.1, Z(mv1 - 0.01));
  solid.boxMinMax('chrome', X(1.3), MZ + 1.1, Z(mv1 - 0.04), X(mu1), MZ + 1.14, Z(mv1));
  glass.boxMinMax('glass', X(0.15), MZ + 0.12, Z(mv0 - 0.06), X(mu1), MZ + 1.1, Z(mv0 - 0.04));
  // antresol ostidagi yoritgichlar
  for (let v = mv0 + 0.9; v < mv1; v += 1.5)
    for (const u of [1.0, 2.8]) solid.cyl('lampWarm', [X(u), MZ - 0.31, Z(v)], 0.09, 0.02, 'y', 12);
  // zinapoya: orqa devordan antresolga (g‘arbiy vitraj yonida)
  const steps = 18;
  const sv0 = SD - 0.75;
  for (let i = 0; i < steps; i++) {
    const y = F + ((i + 1) * (MZ - F)) / steps;
    const v = sv0 - i * ((sv0 - mv1) / steps);
    solid.boxMinMax('marbleDark', X(0.2), y - 0.05, Z(v - (sv0 - mv1) / steps), X(1.25), y, Z(v));
    led(solid, X(0.2), y - 0.07, Z(v - 0.03), X(1.25), y - 0.05, Z(v));
  }
  solid.beam('aluDark', [X(1.25), F, Z(sv0)], [X(1.25), MZ, Z(mv1)], 0.12);
  for (let k = 0; k < 4; k++) {
    const va = sv0 - (k * (sv0 - mv1)) / 4;
    const vb = sv0 - ((k + 1) * (sv0 - mv1)) / 4;
    const ya = F + ((sv0 - va) / (sv0 - mv1)) * (MZ - F);
    glass.boxMinMax('glass', X(1.27), ya + 0.1, Z(vb), X(1.29), ya + 1.05, Z(va));
  }
  // 2-sathdagi deraza tizimlari namunalari
  for (const v of [7.2, 10.8, 14.4]) {
    curtainWall(glass, solid, 'z', X(0.9), Z(v - 0.9), Z(v + 0.9), MZ + 0.15, MZ + 2.55, 0.9, [MZ + 1.5], { frameKey: 'aluDark', depth: 0.09, glassKey: 'glass' });
    solid.boxMinMax('aluDark', X(0.75), MZ, Z(v - 1.0), X(1.05), MZ + 0.15, Z(v + 1.0));
  }
  solid.add('plant', unitIco(), [X(2.6), MZ + 0.75, Z(mv0 + 0.8)], [0, 0, 0], [0.4, 0.55, 0.4]);
  solid.boxMinMax('stoneGrey', X(2.35), MZ, Z(mv0 + 0.55), X(2.85), MZ + 0.5, Z(mv0 + 1.05));
  // antresol bandidagi yozuvlar
  panels.push({ tex: { type: 'sign', text: 'WINDOWS & DOORS', w: 1024, h: 110 }, pos: [X(mu1 + 0.09), MZ - 0.1, Z(mv0 + 3.2)], size: [3.2, 0.34], rotY: Math.PI / 2 });
  panels.push({ tex: { type: 'sign', text: 'SLIDING SYSTEMS', w: 1024, h: 110 }, pos: [X(mu1 + 0.09), MZ - 0.1, Z(mv1 - 3.2)], size: [3.2, 0.34], rotY: Math.PI / 2 });

  /* ================= Eshik-rom bokslari (antresol ostida) ================= */
  const booths: [number, number, 'living' | 'dining'][] = [
    [mv0 + 0.1, (mv0 + mv1) / 2 - 0.2, 'living'],
    [(mv0 + mv1) / 2 + 0.2, mv1 - 0.1, 'dining'],
  ];
  for (const [va, vb, kind] of booths) {
    for (const v of [va, vb - 0.12]) solid.boxMinMax('stoneGrey', X(0.2), F, Z(v), X(3.6), MZ - 0.3, Z(v + 0.12));
    // lounge tomondagi devorda — fasad loyihasi fotosurati
    if (kind === 'living') {
      panels.push({ tex: { type: 'photo' }, pos: [X(1.9), F + 1.6, Z(va) - 0.012], size: [1.6, 2.4], rotY: Math.PI });
      solid.boxMinMax('aluDark', X(1.05), F + 0.36, Z(va) - 0.03, X(2.75), F + 0.4, Z(va));
    }
    // sharqiy tomonda — qora alyuminiy surma eshik tizimi
    curtainWall(glass, solid, 'z', X(3.6), Z(va + 0.12), Z(vb - 0.12), F, MZ - 0.35, 1.45, [], { frameKey: 'aluDark', depth: 0.14, heavyEvery: 2, glassKey: 'glass' });
    solid.boxMinMax('aluDark', X(3.52), MZ - 0.45, Z(va + 0.12), X(3.68), MZ - 0.3, Z(vb - 0.12));
    const vc = (va + vb) / 2;
    solid.boxMinMax('wood', X(0.3), F, Z(va + 0.2), X(3.5), F + 0.01, Z(vb - 0.2));
    if (kind === 'living') {
      solid.boxMinMax('fabric', X(0.9), F + 0.01, Z(vc - 1.6), X(3.2), F + 0.02, Z(vc + 1.6));
      solid.boxMinMax('fabricLight', X(0.35), F, Z(vc - 1.3), X(1.25), F + 0.42, Z(vc + 1.3));
      solid.boxMinMax('fabricLight', X(0.35), F + 0.42, Z(vc - 1.3), X(0.6), F + 0.85, Z(vc + 1.3));
      solid.boxMinMax('marbleDark', X(1.9), F, Z(vc - 0.5), X(2.6), F + 0.38, Z(vc + 0.5));
      solid.cyl('aluDark', [X(0.6), F + 0.8, Z(vb - 0.5)], 0.02, 1.6, 'y', 6);
      solid.cyl('lampWarm', [X(0.6), F + 1.65, Z(vb - 0.5)], 0.22, 0.3, 'y', 14, 0.12);
    } else {
      solid.boxMinMax('wood', X(1.1), F + 0.74, Z(vc - 1.0), X(2.5), F + 0.78, Z(vc + 1.0));
      for (const sv of [-0.8, 0.8]) solid.boxMinMax('aluDark', X(1.6), F, Z(vc + sv - 0.05), X(2.0), F + 0.74, Z(vc + sv + 0.05));
      for (const sv of [-0.55, 0.55])
        for (const su of [0.75, 2.85]) {
          solid.box('fabricLight', [X(su), F + 0.46, Z(vc + sv)], [0.45, 0.06, 0.45]);
          solid.box('fabricLight', [X(su + (su < 2 ? -0.2 : 0.2)), F + 0.75, Z(vc + sv)], [0.06, 0.55, 0.45]);
          solid.box('aluDark', [X(su), F + 0.22, Z(vc + sv)], [0.05, 0.44, 0.05]);
        }
      solid.cyl('lampWarm', [X(1.8), MZ - 1.2, Z(vc)], 0.3, 0.12, 'y', 16, 0.05);
      solid.cyl('aluDark', [X(1.8), MZ - 0.75, Z(vc)], 0.006, 0.9, 'y', 4);
    }
  }

  /* ================= Profil tizimlari stendi (markazda) ================= */
  const pu0 = 6.8;
  const pu1 = 7.9;
  const pv0 = 5.0;
  const pv1 = pv0 + PROFILE_SAMPLES.length * 1.2 + 0.2;
  solid.boxMinMax('marbleDark', X(pu0 + 0.06), F + 0.06, Z(pv0 + 0.06), X(pu1 - 0.06), F + 0.75, Z(pv1 - 0.06));
  solid.boxMinMax('marbleDark', X(pu0), F + 0.75, Z(pv0), X(pu1), F + 0.8, Z(pv1));
  for (const u of [pu0 + 0.04, pu1 - 0.1]) led(solid, X(u), F, Z(pv0 + 0.06), X(u + 0.06), F + 0.06, Z(pv1 - 0.06));
  led(solid, X(pu0 - 0.01), F + 0.74, Z(pv0), X(pu0), F + 0.75, Z(pv1));
  PROFILE_SAMPLES.forEach((name, i) => {
    const cz = Z(pv0 + 0.7 + i * 1.2);
    const cx = X((pu0 + pu1) / 2);
    const top = F + 0.8;
    const sliding = name.startsWith('Slide');
    const pergola = name === 'Pergola';
    const w = 0.07 + (i % 3) * 0.012 + (sliding ? 0.05 : 0);
    const h = pergola ? 0.32 : 0.42 + (i % 4) * 0.04;
    solid.boxMinMax('aluminium', cx - 0.3, top, cz - 0.3, cx + 0.3, top + 0.03, cz + 0.3);
    const b = top + 0.03;
    if (pergola) {
      // pergola: lamel profili va kronshteyn
      solid.boxMinMax('aluDark', cx - 0.25, b, cz - 0.08, cx + 0.25, b + 0.22, cz + 0.08);
      for (let k = 0; k < 3; k++) solid.box('aluminium', [cx, b + 0.28 + k * 0.01, cz - 0.16 + k * 0.16], [0.5, 0.025, 0.14], 0);
      return;
    }
    // ramka profili kesimi (vertikal namuna): tashqi kamera, termo-ko‘prik, ichki kamera
    const fh = h + 0.1;
    solid.boxMinMax('aluDark', cx - 0.16, b, cz - w, cx + 0.16, b + fh, cz - w * 0.35);
    solid.boxMinMax('paintDark', cx - 0.16, b, cz - w * 0.35, cx + 0.16, b + fh * 0.92, cz - w * 0.15);
    solid.boxMinMax('aluDark', cx - 0.16, b, cz - w * 0.15, cx + 0.16, b + fh * 0.85, cz + w);
    solid.boxMinMax('aluminium', cx - 0.161, b + 0.02, cz - w - 0.004, cx + 0.161, b + fh - 0.02, cz - w);
    // shisha paket (2 yoki 3 qatlam) — profildan yuqoriga chiqib turadi
    const panes = name.includes('88') || name.includes('8000') ? 3 : 2;
    for (let k = 0; k < panes; k++) {
      const pz = cz + w + 0.02 + k * 0.03;
      glass.boxMinMax('glassSheet', cx - 0.15, b + 0.04, pz - 0.004, cx + 0.15, b + h + 0.32, pz + 0.004);
    }
    solid.boxMinMax('aluDark', cx - 0.16, b, cz + w, cx + 0.16, b + 0.08, cz + w + 0.03 * panes + 0.04);
    // yorliq — asosiy yo‘lak tomonda
    panels.push({ tex: { type: 'sign', text: name, w: 512, h: 96 }, pos: [X(pu0 + 0.06) - 0.006, F + 0.42, cz], size: [1.0, 0.19], rotY: -Math.PI / 2 });
  });

  /* ================= Arxitektura shishalari vitrinasi (sharqiy vitraj yonida) ================= */
  const gu0 = SW - 1.9;
  const gu1 = SW - 0.9;
  const gv0 = 3.0;
  const gv1 = 14.5;
  solid.boxMinMax('marbleDark', X(gu0 + 0.05), F + 0.06, Z(gv0), X(gu1), F + 0.5, Z(gv1));
  solid.boxMinMax('marbleDark', X(gu0), F + 0.5, Z(gv0 - 0.05), X(gu1 + 0.05), F + 0.55, Z(gv1 + 0.05));
  led(solid, X(gu0 + 0.03), F, Z(gv0), X(gu0 + 0.09), F + 0.06, Z(gv1));
  panels.push({ tex: { type: 'sign', text: 'ARCHITECTURAL GLASS SOLUTIONS', w: 1536, h: 96, weight: 600 }, pos: [X(gu0 + 0.04), F + 0.28, Z((gv0 + gv1) / 2)], size: [6.0, 0.36], rotY: -Math.PI / 2 });
  solid.boxMinMax('aluminium', X((gu0 + gu1) / 2 - 0.06), F + 0.55, Z(gv0 + 0.2), X((gu0 + gu1) / 2 + 0.06), F + 0.62, Z(gv1 - 0.2));
  let n = 0;
  for (let v = gv0 + 0.35; v < gv1 - 0.3; v += 0.3) {
    if (n % 7 === 6) {
      n++;
      continue; // guruhlar orasidagi bo‘shliq
    }
    const key = SAMPLE_GLASS[n % SAMPLE_GLASS.length];
    const h = 1.5 + 0.7 * (((n * 37) % 7) / 7);
    const target = key === 'mirror' ? solid : glass;
    target.box(key, [X((gu0 + gu1) / 2), F + 0.62 + h / 2, Z(v)], [0.95, h, 0.014]);
    n++;
  }

  /* ================= Mehmonlar lounge zonasi (kirish yonida) ================= */
  const lu = 0.5;
  const lv = 1.0;
  solid.boxMinMax('fabric', X(lu + 0.2), F + 0.002, Z(lv + 0.4), X(lu + 3.4), F + 0.014, Z(lv + 3.6));
  solid.boxMinMax('fabricLight', X(lu), F, Z(lv + 0.6), X(lu + 0.95), F + 0.42, Z(lv + 3.4));
  solid.boxMinMax('fabricLight', X(lu), F + 0.42, Z(lv + 0.6), X(lu + 0.25), F + 0.86, Z(lv + 3.4));
  solid.boxMinMax('fabricLight', X(lu + 0.95), F, Z(lv), X(lu + 3.0), F + 0.42, Z(lv + 0.95));
  solid.boxMinMax('fabricLight', X(lu + 0.95), F + 0.42, Z(lv), X(lu + 3.0), F + 0.86, Z(lv + 0.25));
  solid.boxMinMax('marbleDark', X(lu + 1.5), F, Z(lv + 1.6), X(lu + 2.6), F + 0.4, Z(lv + 2.6));
  solid.box('paintWhite', [X(lu + 1.9), F + 0.415, Z(lv + 2.0)], [0.42, 0.03, 0.3], 0.3);
  solid.add('plant', unitIco(), [X(lu + 2.3), F + 0.55, Z(lv + 2.3)], [0, 0, 0], [0.16, 0.14, 0.16]);

  /* ================= Shift: trek-chiroqlar va perimetr LED ================= */
  for (const u of [2.0, SW / 2, SW - 2.0]) {
    roof.boxMinMax('aluDark', X(u) - 0.03, gTop - 0.06, Z(1.0), X(u) + 0.03, gTop, Z(SD - 2.0));
    for (let v = 1.8; v < SD - 2.2; v += 1.6) {
      const tilt = ((Math.round(v * 10) % 3) - 1) * 0.35;
      roof.add('aluDark', unitCyl(), [X(u), gTop - 0.2, Z(v)], [tilt, 0, 0], [0.06, 0.2, 0.06]);
      roof.cyl('lampWarm', [X(u), gTop - 0.31, Z(v)], 0.045, 0.01, 'y', 10);
    }
  }
  led(roof, X(0.2), gTop - 0.03, Z(0.2), X(SW - 0.2), gTop, Z(0.36));
  led(roof, X(0.2), gTop - 0.03, Z(0.2), X(0.36), gTop, Z(SD - 1.4));
  led(roof, X(SW - 0.36), gTop - 0.03, Z(0.2), X(SW - 0.2), gTop, Z(SD - 1.4));

  return {
    solid: solid.build(),
    glass: glass.build(),
    roof: roof.build(),
    panels,
    brandWall: { x: (m0 + m1) / 2, y: 4.5, z: wz - 0.27 },
    fasciaY: gTop + fascia / 2,
    r,
  };
}

let _ico: THREE.BufferGeometry | null = null;
let _cyl: THREE.BufferGeometry | null = null;
const unitIco = () => (_ico ??= new THREE.IcosahedronGeometry(1, 1));
const unitCyl = () => (_cyl ??= new THREE.CylinderGeometry(1, 1, 1, 12));

function panelTexture(p: ShowroomPanel): THREE.Texture {
  const t = p.tex;
  if (t.type === 'photo') return towerPhotoTexture();
  if (t.type === 'list') return listTexture(t.lines, { icons: t.icons });
  return signTexture(t.text, { fg: t.fg ?? '#f2f2f0', w: t.w, h: t.h, weight: t.weight });
}

/** Yozuvlar va tasvirlar — yengil yorug‘lik chiqaradi (tunda ham o‘qiladi) */
function Panel({ p }: { p: ShowroomPanel }) {
  const tex = useMemo(() => panelTexture(p), [p]);
  const photo = p.tex.type === 'photo';
  return (
    <mesh position={p.pos} rotation={[0, p.rotY, 0]}>
      <planeGeometry args={p.size} />
      <meshStandardMaterial
        map={tex}
        transparent={!photo}
        roughness={photo ? 0.25 : 0.6}
        emissive="#ffffff"
        emissiveMap={tex}
        emissiveIntensity={photo ? 0.35 : 0.25}
        polygonOffset
        polygonOffsetFactor={-2}
        toneMapped
      />
    </mesh>
  );
}

export function GlassShowroom() {
  const sr = useMemo(() => buildShowroom(), []);
  const roofs = useStore((s) => s.layers.roofs);
  const r = sr.r;
  return (
    <group name="GlassShowroom">
      <Built parts={sr.solid} />
      <Built parts={sr.glass} castShadow={false} />
      {roofs && <Built parts={sr.roof} dispose={false} />}
      {sr.panels.map((p, i) => (
        <Panel key={i} p={p} />
      ))}
      {/* qora marmar brend devoridagi logotip */}
      <LogoPlane position={[sr.brandWall.x, sr.brandWall.y, sr.brandWall.z]} height={1.7} rotationY={Math.PI} />
      {/* fasad karnizlaridagi logotiplar (old va yon tomonlar) */}
      <LogoPlane position={[(r.x0 + r.x1) / 2, sr.fasciaY, r.z0 - 0.27]} height={0.78} rotationY={Math.PI} />
      <LogoPlane position={[r.x1 + 0.27, sr.fasciaY, (r.z0 + r.z1) / 2]} height={0.78} rotationY={Math.PI / 2} />
      <LogoPlane position={[r.x0 - 0.27, sr.fasciaY, (r.z0 + r.z1) / 2]} height={0.78} rotationY={-Math.PI / 2} />
    </group>
  );
}
