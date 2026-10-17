import { factoryConfig } from '../config/factoryConfig';
import type { HumanLook } from '../scene/people/humanGeometry';
import { getSegment, showroomRect, siteNorthZ } from './layout';
import { computeLineLayout, FLOOR_Y } from './lineLayout';
import { restaurantLayout } from './restaurant';

/**
 * Maketdagi xodimlar va mehmonlar: kim, qayerda va nima qilmoqda.
 * Pozitsiyalar maket qatlamidan (liniya stansiyalari, xonalar, showroom) hisoblanadi — o‘lchamlar o‘zgarsa ham mos keladi.
 * Harakat deterministik (simulyatsiya vaqtiga bog‘liq): yurish yo‘llari, to‘xtashlar, ishlash, o‘tirish, suhbat.
 */
export type Pose = 'idle' | 'work' | 'talk' | 'sit' | 'type' | 'eat' | 'look';
type P2 = [number, number];

export interface Stop {
  /** yo‘l nuqtasi indeksi */
  at: number;
  dur: number;
  pose: Pose;
  /** qarash yo‘nalishi (yaw, radian); bo‘lmasa — kelgan yo‘nalish */
  face?: number;
}

export type Behaviour =
  | { kind: 'fixed'; at: P2; face: number; pose: Pose; seat?: number }
  | { kind: 'route'; points: P2[]; speed: number; stops: Stop[]; pingPong?: boolean };

export interface PersonDef {
  id: string;
  /** lavozim / kim */
  role: string;
  zone: string;
  /** pol sathi (m) */
  y: number;
  /** 2-qavat (oxirgi qism) — "2-qavat" qatlami bilan yashiriladi */
  upper?: boolean;
  look: HumanLook;
  behaviour: Behaviour;
  /** vaqt siljishi (s) — bir xil marshrutdagilar sinxron yurmasligi uchun */
  offset: number;
}

export interface PersonSample {
  x: number;
  z: number;
  yaw: number;
  /** 'walk' yoki to‘xtagan holatdagi poza */
  pose: Pose | 'walk';
  /** qadam fazasi (radian) */
  phase: number;
  /** o‘tirgich balandligi (polga nisbatan) */
  seat?: number;
  /** pozaning boshlanishidan beri vaqt (s) — imo-ishoralar uchun */
  local: number;
}

/* ------------------------------------------------------------------ */
/* Tashqi ko‘rinish (kiyim, teri, soch)                                */
/* ------------------------------------------------------------------ */

export type Outfit = 'operator' | 'master' | 'warehouse' | 'mechanic' | 'office' | 'manager' | 'chef' | 'lab' | 'guard' | 'consultant' | 'visitor' | 'nurse' | 'waiter';

const SKIN = ['#e9c6aa', '#ddb497', '#d0a386', '#c19173', '#f1d3bd', '#b48468', '#d8b096'];
const HAIR = ['#17120f', '#241a14', '#33251b', '#120f0d', '#46342a', '#2b211b', '#5b5550'];
const CASUAL_TOP = ['#7d2f2f', '#2f5d7d', '#e5e1d8', '#3f5f3a', '#6b6b6b', '#c58b3a', '#2d2f3a', '#8a6f9e'];
const CASUAL_BOTTOM = ['#34475f', '#2b2b2b', '#b8a98a', '#3d3f45'];

/** deterministik tasodifiy sonlar (har bir odam uchun bir xil natija) */
function rng(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
const pick = <T,>(r: () => number, a: T[]) => a[Math.floor(r() * a.length) % a.length];

export function makeLook(outfit: Outfit, female: boolean, seed: number): HumanLook {
  const r = rng(seed * 7919 + 13);
  const base: HumanLook = {
    height: female ? 1.6 + r() * 0.1 : 1.7 + r() * 0.13,
    build: 0.92 + r() * 0.18,
    female,
    skin: pick(r, SKIN),
    hair: pick(r, HAIR.slice(0, female ? 5 : 7)),
    hairStyle: female ? (r() < 0.5 ? 'long' : 'bun') : r() < 0.08 ? 'bald' : 'short',
    top: '#2b3340',
    bottom: '#2b2f36',
    shoes: '#1b1b1c',
  };
  const brand = factoryConfig.brand.primary;
  switch (outfit) {
    case 'operator':
      return { ...base, hairStyle: female ? 'bun' : base.hairStyle, top: '#2e4163', bottom: '#2e4163', shoes: '#151515', gloves: '#9aa0a6', vest: { color: brand, stripe: '#d7dbde' }, belt: '#111318' };
    case 'master':
      return { ...base, hairStyle: female ? 'bun' : base.hairStyle, top: '#2c3440', bottom: '#262b33', helmet: '#f4f4f2', vest: { color: '#c6ec2c', stripe: '#d7dbde' }, tablet: true };
    case 'warehouse':
      return { ...base, top: '#3a4048', bottom: '#2b3038', helmet: '#f2c200', vest: { color: '#c6ec2c', stripe: '#d7dbde' }, gloves: '#6f6a5f' };
    case 'mechanic':
      return { ...base, top: '#2a5d9f', bottom: '#2a5d9f', helmet: '#f4f4f2', gloves: '#3a3a3a', belt: '#1a1a1a' };
    case 'office':
      return female
        ? { ...base, top: pick(r, ['#f3f1ee', '#e7d8cc', '#2b3340', '#cfdcea']), bottom: pick(r, ['#2b2f36', '#3b3f48', '#5a4a42']), skirt: r() < 0.6, shoes: '#2a1f1b' }
        : { ...base, top: pick(r, ['#eef2f6', '#cfe0f2', '#f5f5f2', '#dde3ea']), bottom: pick(r, ['#2b2f36', '#3a3f4a', '#45403a']), belt: '#161616', tie: r() < 0.4 ? pick(r, ['#7a1f2b', '#1f3a6a', '#2b2b2b']) : undefined };
    case 'manager':
      return female ? { ...base, top: '#1d2230', bottom: '#1d2230', skirt: true, hairStyle: 'bun' } : { ...base, top: '#1d2230', bottom: '#1d2230', tie: '#7a1f2b', badge: brand };
    case 'chef':
      return { ...base, top: '#f1f1ec', bottom: '#33363a', chefHat: true, apron: '#26282b', hairStyle: female ? 'bun' : 'short' };
    case 'lab':
      return { ...base, top: '#e9eef3', bottom: '#3b4250', coat: '#f4f6f7' };
    case 'nurse':
      return { ...base, top: '#dfeef2', bottom: '#dfeef2', coat: '#f4f6f7', hairStyle: 'bun' };
    case 'guard':
      return { ...base, top: '#2b3340', bottom: '#2b3340', cap: '#1c222c', badge: '#c9a227', belt: '#111' };
    case 'consultant':
      return female
        ? { ...base, top: '#1d1f22', bottom: '#1d1f22', badge: brand, skirt: r() < 0.5, hairStyle: 'long' }
        : { ...base, top: '#1d1f22', bottom: '#2b2f36', badge: brand, belt: '#111' };
    case 'waiter':
      // ofitsiant: oq ko‘ylak, qora jilet va shim, uzun qora fartuk
      return { ...base, top: '#f4f4f1', sleeve: '#f4f4f1', bottom: '#1b1c1f', vest: { color: '#1f2024', stripe: '#1f2024' }, apron: '#1b1c1f', hairStyle: female ? 'bun' : 'short', belt: '#111' };
    case 'visitor':
      return { ...base, top: pick(r, CASUAL_TOP), bottom: pick(r, CASUAL_BOTTOM), shortSleeves: r() < 0.3, skirt: female && r() < 0.4, shoes: pick(r, ['#1b1b1c', '#e8e8e4', '#5a3b28']) };
  }
}

/* ------------------------------------------------------------------ */
/* Kim qayerda                                                          */
/* ------------------------------------------------------------------ */

const FACE = { px: Math.PI / 2, nx: -Math.PI / 2, pz: 0, nz: Math.PI };

export function buildPeople(cfg = factoryConfig): PersonDef[] {
  const out: PersonDef[] = [];
  const L = computeLineLayout();
  const F = FLOOR_Y;
  let n = 0;
  const add = (role: string, zone: string, outfit: Outfit, female: boolean, behaviour: Behaviour, opts: { y?: number; upper?: boolean; offset?: number } = {}) => {
    n++;
    let look = makeLook(outfit, female, n);
    // xonalarda (oshxona, ofislar, yig‘ilish) kaska, qo‘lqop va planshet yechilgan
    if (zone.startsWith('room-') && zone !== 'room-tech') look = { ...look, helmet: undefined, gloves: undefined, tablet: undefined };
    out.push({
      id: `p${n}`,
      role,
      zone,
      y: opts.y ?? F,
      upper: opts.upper,
      look,
      behaviour,
      offset: opts.offset ?? n * 3.7,
    });
  };
  const fixed = (at: P2, face: number, pose: Pose, seat?: number): Behaviour => ({ kind: 'fixed', at, face, pose, seat });
  const route = (points: P2[], speed: number, stops: Stop[], pingPong = false): Behaviour => ({ kind: 'route', points, speed, stops, pingPong });

  /* ---- ishlab chiqarish liniyasi: har bir stansiyada operator (stansiyaning markaziy yo‘lak tomonida) ---- */
  const st = (id: string) => L.stations.find((s) => s.id === id)!;
  const op = (id: string, dz = 0, gap = 0.55): { at: P2; face: number } => {
    const s = st(id);
    const side = s.cx < 0 ? 1 : -1;
    const zMid = (s.zIn + s.zOut) / 2 + dz;
    return { at: [s.cx + side * (s.width / 2 + gap), zMid], face: side > 0 ? FACE.nx : FACE.px };
  };
  const operators: [string, string, number, Pose, boolean][] = [
    ['Shisha listlarini yuklash operatori', 'loader', 0, 'work', false],
    ['Kesish stoli (CNC) operatori', 'cutting', 0, 'look', false],
    ['Sindirish (bo‘laklash) ishchisi', 'breakout', 0, 'work', false],
    ['Chet silliqlash stanogi operatori', 'edger', -1.5, 'work', false],
    ['Yuvish-quritish mashinasi operatori', 'washer', 0, 'look', true],
    ['Tayanch ustunchalar stansiyasi operatori', 'pillar', 0, 'work', true],
    ['Germetik surtish operatori', 'sealer', 0, 'work', false],
    ['Paket yig‘ish operatori', 'assembly', -1.0, 'work', false],
    ['Paket yig‘ish operatori', 'assembly', 1.1, 'work', true],
    ['Vakuumlash pechi operatori', 'vacuum', 1.5, 'look', false],
    ['Qadoqlash ishchisi', 'packing', -1.1, 'work', false],
    ['Qadoqlash ishchisi', 'packing', 1.1, 'work', true],
  ];
  for (const [role, id, dz, pose, female] of operators) {
    const o = op(id, dz);
    add(role, id, 'operator', female, fixed(o.at, o.face, pose));
  }
  // OTK/GPO
  const insp = op('inspection', -1.0, 0.6);
  add('OTK nazoratchisi', 'inspection', 'operator', true, fixed(insp.at, insp.face, 'work'));
  const insp2 = op('inspection', 1.0, 0.6);
  add('OTK nazoratchisi', 'inspection', 'master', false, fixed(insp2.at, insp2.face, 'look'));
  const test = op('testing', 0, 0.6);
  add('Vakuum va o‘lcham nazorati operatori', 'testing', 'operator', false, fixed(test.at, test.face, 'work'));
  const q = L.qualityZone;
  add('OTK boshlig‘i', 'qc-zone', 'master', true, route([[q.x1 - 4.2, q.z0 + 2.5], [q.x1 - 4.2, q.z1 - 3.2], [q.x1 - 2.6, q.z1 - 3.2]], 0.9, [{ at: 2, dur: 6, pose: 'talk', face: FACE.nx }, { at: 0, dur: 4, pose: 'look', face: FACE.nx }], true));

  // smena boshlig‘i, yordamchi ishchilar, texnolog, mexanik — markaziy yo‘lak va piyodalar yo‘lagi
  const prod = getSegment('production', cfg);
  // markaziy yo‘lak uzatish konveyeri va toblash pechidan oldin tugaydi
  const laneEnd = Math.min(L.transferZ, ...L.optional.map((o) => o.cz - o.length / 2)) - 3;
  add('Smena boshlig‘i (master)', 'production', 'master', false, route([[-1.2, prod.z0 + 4], [-1.2, laneEnd], [1.3, laneEnd], [1.3, prod.z0 + 4]], 1.15, [{ at: 1, dur: 5, pose: 'look', face: FACE.nx }, { at: 3, dur: 4, pose: 'talk', face: FACE.px }]));
  add('Liniya yordamchi ishchisi', 'production', 'operator', false, route([[-4.5, prod.z0 + 6], [-4.5, laneEnd + 2]], 1.25, [{ at: 0, dur: 3, pose: 'work', face: FACE.nx }, { at: 1, dur: 3, pose: 'work', face: FACE.nx }], true), { offset: 11 });
  add('Liniya yordamchi ishchisi', 'production', 'operator', false, route([[3.6, prod.z0 + 5], [3.6, laneEnd + 1]], 1.2, [{ at: 1, dur: 4, pose: 'idle' }], true), { offset: 37 });
  add('Texnolog', 'production', 'master', true, route([[-2.3, prod.z0 + 20], [-2.3, prod.z0 + 33]], 0.8, [{ at: 0, dur: 9, pose: 'look', face: FACE.nx }, { at: 1, dur: 7, pose: 'talk', face: FACE.nx }], true));
  add('Ta’mirlovchi mexanik', 'washer', 'mechanic', false, fixed([st('washer').cx - st('washer').width / 2 - 0.6, (st('washer').zIn + st('washer').zOut) / 2], FACE.px, 'work'));
  add('Elektrik', 'production', 'mechanic', false, route([[18.7, prod.z0 + 3], [18.7, prod.z1 - 4]], 1.1, [{ at: 1, dur: 5, pose: 'look', face: FACE.px }], true), { offset: 20 });

  /* ---- omborlar ---- */
  const front = getSegment('front', cfg);
  const px = cfg.building.frontPartitionX;
  add('Omborchi-yuklovchi', 'raw-buffer', 'warehouse', false, route([[-11, front.z0 + 5], [-11, front.z1 - 4]], 1.1, [{ at: 0, dur: 5, pose: 'work', face: FACE.nx }, { at: 1, dur: 5, pose: 'work', face: FACE.nx }], true));
  add('Xomashyo ombori mudiri', 'raw-buffer', 'warehouse', false, fixed([-4.6, front.z0 + 30], FACE.nx, 'look'));
  add('Omborchi-yuklovchi', 'fg-buffer', 'warehouse', false, route([[13.6, front.z0 + 12], [13.6, front.z1 - 3]], 1.1, [{ at: 1, dur: 6, pose: 'work', face: FACE.px }, { at: 0, dur: 3, pose: 'idle' }], true), { offset: 5 });
  add('Tayyor mahsulotlar ombori mudiri', 'fg-buffer', 'warehouse', true, fixed([px + 2.3, front.z0 + 11], FACE.pz, 'look'));

  /* ---- oxirgi qism, 1-qavat ---- */
  const rear = getSegment('rear', cfg);
  const t = cfg.building.wallThickness;
  const zA = rear.z0 + t + cfg.rearCorridorWidth;
  const zB = rear.z1 - t;
  const zc = (zA + zB) / 2;
  const room = (type: string, floor: 1 | 2) => cfg.rearRooms.find((m) => m.type === type && m.floor === floor)!;
  const SEAT = 0.48;
  // oshxona: stollar (x0+3, qadami 2.6) × (zc ± 1.6), stullar ±0.5 / ±0.65
  const can = room('canteen', 1);
  const tables: number[] = [];
  for (let x = can.x0 + 3; x < can.x1 - 1.2; x += 2.6) tables.push(x);
  const diners: [number, number, 1 | -1, Outfit, boolean][] = [
    [0, -1.6, 1, 'operator', false],
    [0, -1.6, -1, 'operator', false],
    [1, -1.6, 1, 'office', true],
    [1, -1.6, -1, 'office', false],
    [1, 1.6, 1, 'warehouse', false],
    [2, -1.6, -1, 'master', false],
    [2, 1.6, 1, 'office', true],
    [2, 1.6, -1, 'mechanic', false],
    [0, 1.6, -1, 'lab', true],
  ];
  diners.forEach(([ti, dz, side, outfit, female], i) => {
    const tx = tables[Math.min(ti, tables.length - 1)];
    const sx = i % 2 === 0 ? -0.5 : 0.5;
    const z = zc + dz - side * 0.65;
    add(outfit === 'operator' || outfit === 'warehouse' || outfit === 'mechanic' ? 'Ishlab chiqarish xodimi (tushlik)' : 'Xodim (tushlik)', 'room-canteen', outfit, female, fixed([tx + sx, z], side > 0 ? FACE.pz : FACE.nz, 'eat', SEAT));
  });
  add('Oshpaz', 'room-canteen', 'chef', false, route([[can.x0 + 1.45, zA + 1.4], [can.x0 + 1.45, zc - 0.4]], 0.7, [{ at: 0, dur: 7, pose: 'work', face: FACE.nx }, { at: 1, dur: 7, pose: 'work', face: FACE.nx }], true));
  add('Oshpaz yordamchisi', 'room-canteen', 'chef', true, fixed([can.x0 + 1.45, zB - 1.9], FACE.nx, 'work'));
  // koridor bo‘ylab yurgan xodim
  add('Xodim', 'rear', 'office', false, route([[cfg.building.width / 2 - 6, rear.z0 + t + 0.9], [-cfg.building.width / 2 + 3, rear.z0 + t + 0.9]], 1.2, [{ at: 1, dur: 3, pose: 'idle' }], true), { offset: 8 });
  const lobby = room('lobby', 1);
  add('Qorovul (kirish)', 'room-lobby', 'guard', false, fixed([lobby.x0 + 1.6, zB - 1.9], FACE.nz, 'type', SEAT));
  const med = room('medical', 1);
  add('Hamshira', 'room-medical', 'nurse', true, fixed([med.x1 - 1.2, zB - 1.5], FACE.pz, 'type', SEAT));
  const tech = room('tech', 1);
  add('Bosh energetik', 'room-tech', 'mechanic', false, fixed([(tech.x0 + tech.x1) / 2 + 0.6, zB - 1.1], FACE.pz, 'look'));

  /* ---- oxirgi qism, 2-qavat ---- */
  const y2 = cfg.building.rearFirstFloorHeight + 0.02;
  const up = { y: y2, upper: true };
  const mgr = room('manager', 2);
  const mx = (mgr.x0 + mgr.x1) / 2;
  add('Ishlab chiqarish direktori', 'room-manager', 'manager', false, fixed([mx, zc + 1.6], FACE.nz, 'type', SEAT), up);
  add('Texnolog (yig‘ilishda)', 'room-manager', 'master', false, fixed([mx - 0.6, zc - 0.2], FACE.pz, 'talk', SEAT), up);
  const eng = room('office', 2);
  const desks: number[] = [];
  for (let x = eng.x0 + 1.5; x < eng.x1 - 1; x += 2.6) desks.push(x);
  add('Bosh muhandis', 'room-engineers', 'office', false, fixed([desks[0], zc - 1.3 + 0.7], FACE.nz, 'type', SEAT), up);
  add('Muhandis-texnolog', 'room-engineers', 'office', true, fixed([desks[1] ?? desks[0], zc + 1.6 + 0.7], FACE.nz, 'type', SEAT), up);
  add('Muhandis-texnolog', 'room-engineers', 'office', false, fixed([desks[desks.length - 1], zc - 1.3 + 0.7], FACE.nz, 'type', SEAT), up);
  const meet = room('meeting', 2);
  const chairs: number[] = [];
  for (let x = meet.x0 + 2.2; x < meet.x1 - 1.8; x += 1.1) chairs.push(x);
  const meetingSeats: [number, 1 | -1, Outfit, boolean][] = [
    [0, 1, 'manager', false],
    [1, 1, 'office', true],
    [3, 1, 'master', false],
    [1, -1, 'office', false],
    [2, -1, 'consultant', true],
    [4, -1, 'office', false],
  ];
  for (const [ci, side, outfit, female] of meetingSeats) {
    const x = chairs[Math.min(ci, chairs.length - 1)];
    add('Yig‘ilish ishtirokchisi', 'room-meeting', outfit, female, fixed([x, zc - side * 1.05], side > 0 ? FACE.pz : FACE.nz, 'talk', SEAT), up);
  }
  add('Ma’ruzachi', 'room-meeting', 'manager', true, route([[meet.x0 + 1.0, zc - 0.8], [meet.x0 + 1.0, zc + 0.8]], 0.5, [{ at: 0, dur: 8, pose: 'talk', face: FACE.px }, { at: 1, dur: 8, pose: 'talk', face: FACE.px }], true), up);
  const lab = room('lab', 2);
  add('Laborant (OTK laboratoriyasi)', 'room-lab', 'lab', true, fixed([lab.x0 + 3.2, zc + 0.85], FACE.nz, 'work'), up);
  add('Laborant (OTK laboratoriyasi)', 'room-lab', 'lab', false, fixed([lab.x1 - 3.0, zB - 1.45], FACE.pz, 'work'), up);
  add('Xodim', 'rear', 'office', true, route([[-cfg.building.width / 2 + 3, rear.z0 + t + 0.9], [cfg.building.width / 2 - 7, rear.z0 + t + 0.9]], 1.1, [{ at: 1, dur: 4, pose: 'idle' }], true), { ...up, offset: 21 });

  /* ---- showroom ---- */
  const sr = showroomRect(cfg);
  const X = (u: number) => sr.x0 + u;
  const Z = (v: number) => sr.z0 + v;
  const SD = sr.z1 - sr.z0;
  const SW = sr.x1 - sr.x0;
  const rc = (X(4.1) + X(9.2)) / 2;
  add('Resepshn administratori', 'showroom', 'consultant', true, fixed([rc - 0.9, Z(SD - 3.75) + 1.05], FACE.nz, 'type', 0.5));
  // shisha vitrinasi oldida: konsultant mijozga, mijoz vitrinaga qaraydi
  add('Showroom konsultanti', 'showroom', 'consultant', false, fixed([X(SW - 2.6), Z(9.2)], 0.2, 'talk'));
  add('Mijoz', 'showroom', 'visitor', true, fixed([X(SW - 2.35), Z(10.4)], Math.PI / 2 + 0.35, 'look'));
  // asosiy yo‘lak bo‘ylab aylanib yurgan mijoz
  add('Mijoz', 'showroom', 'visitor', false, route(
    [
      [X(5.6), Z(1.6)],
      [X(5.5), Z(17.8)],
      [X(8.45), Z(17.8)],
      [X(8.45), Z(3.2)],
    ],
    0.85,
    [
      { at: 1, dur: 6, pose: 'look', face: FACE.pz },
      { at: 3, dur: 6, pose: 'look', face: FACE.px },
    ],
  ));
  // eshik-rom bokslari oldida
  add('Showroom konsultanti', 'showroom', 'consultant', true, fixed([X(4.25), Z(8.4)], -0.4, 'talk'));
  add('Mijoz', 'showroom', 'visitor', false, fixed([X(4.6), Z(9.5)], -Math.PI / 2 - 0.3, 'look'));
  add('Mijoz', 'showroom', 'visitor', false, fixed([X(1.0), Z(3.0)], FACE.px, 'talk', 0.42));
  add('Mijoz', 'showroom', 'visitor', true, fixed([X(2.6), Z(1.5)], FACE.pz, 'talk', 0.42));
  add('Mijoz (antresolda)', 'showroom', 'visitor', false, fixed([X(3.3), Z(11.5)], FACE.px, 'look'), { y: 3.62, upper: true });

  /* ---- restoran ---- */
  {
    const R = restaurantLayout(cfg);
    const f1 = { y: R.FL1 };
    const f2 = { y: R.FL2, upper: true };
    const SEAT_R = 0.51;
    const guestOutfits: Outfit[] = ['visitor', 'office', 'visitor', 'manager', 'visitor', 'office'];
    let g = 0;
    const guest = (s: { x: number; z: number; face: number }, opts: { y: number }, pose: Pose) => {
      const outfit = guestOutfits[g % guestOutfits.length];
      const female = g % 3 === 1;
      g++;
      add('Restoran mehmoni', 'restaurant', outfit, female, fixed([s.x, s.z], s.face, pose, SEAT_R), opts);
    };
    // asosiy zal: bir nechta band stollar
    const occupied: [number, number[]][] = [
      [1, [0, 1, 3]],
      [4, [0, 2]],
      [7, [1, 2, 3]],
      [9, [0, 3]],
      [12, [0, 1]],
      [15, [2, 3]],
    ];
    for (const [ti, seats] of occupied) {
      const t = R.hallTables[Math.min(ti, R.hallTables.length - 1)];
      seats.forEach((si, k) => guest(t.seats[si], f1, k % 2 ? 'talk' : 'eat'));
    }
    // ofitsiantlar: markaziy yo‘lak va zal bo‘ylab
    const Xr = R.X;
    const Zr = R.Z;
    add('Ofitsiant', 'restaurant', 'waiter', false, route([[Xr(R.W / 2 - 0.4), Zr(R.arcadeRows[0] + 0.7)], [Xr(R.W / 2 - 0.4), Zr(R.arcadeRows[1] - 0.8)]], 1.05, [{ at: 0, dur: 4, pose: 'look', face: Math.PI }, { at: 1, dur: 6, pose: 'talk', face: 0 }], true), f1);
    add('Ofitsiant', 'restaurant', 'waiter', true, route([[Xr(3.5), Zr(R.arcadeRows[0] - 1.15)], [Xr(15.5), Zr(R.arcadeRows[0] - 1.15)]], 0.95, [{ at: 0, dur: 5, pose: 'talk', face: 0 }, { at: 1, dur: 5, pose: 'talk', face: Math.PI }], true), { ...f1, offset: 9 });
    add('Ofitsiant', 'restaurant', 'waiter', false, route([[Xr(R.W - 15.5), Zr(R.arcadeRows[1] - 0.92)], [Xr(R.W - 3.5), Zr(R.arcadeRows[1] - 0.92)]], 0.95, [{ at: 0, dur: 5, pose: 'talk', face: 0 }, { at: 1, dur: 5, pose: 'talk', face: Math.PI }], true), { ...f1, offset: 3 });
    // bar, administrator, oshxona
    add('Barmen', 'restaurant', 'waiter', false, fixed([Xr(R.W / 2 - 1.2), Zr(R.bar.v1 + 0.65)], Math.PI, 'work'), f1);
    add('Barmen', 'restaurant', 'waiter', true, fixed([Xr(R.W / 2 + 2.4), Zr(R.bar.v1 + 0.65)], Math.PI, 'look'), f1);
    add('Administrator (xostes)', 'restaurant', 'consultant', true, fixed([Xr(R.portico.u1 - 0.95), Zr(3.45)], Math.PI, 'talk'), f1);
    add('Restoran oshpazi', 'restaurant', 'chef', false, fixed([Xr(R.W / 2 + 4), Zr(R.D - 1.35)], 0, 'work'), f1);
    // 2-qavat: banket (1-VIP zal) va dumaloq stollar (2-VIP zal)
    const bs = R.banquetSeats;
    for (const i of [0, 1, 2, 3, 5, 6, 8, 9, 11, bs.length - 2]) if (bs[i]) guest(bs[i], f2, i % 3 ? 'talk' : 'eat');
    add('Ofitsiant (VIP)', 'restaurant', 'waiter', false, route([[Xr(2.2), Zr(2.5)], [Xr(14.2), Zr(2.5)]], 0.8, [{ at: 0, dur: 6, pose: 'look', face: 0 }, { at: 1, dur: 6, pose: 'look', face: 0 }], true), f2);
    for (const [ti, seats] of [
      [0, [0, 2, 3]],
      [4, [1, 3]],
    ] as [number, number[]][]) {
      const t = R.roundTables[ti];
      if (t) seats.forEach((si, k) => guest(t.seats[si], f2, k % 2 ? 'eat' : 'talk'));
    }
    add('Ofitsiant (VIP)', 'restaurant', 'waiter', true, route([[Xr(25.2), Zr(6.1)], [Xr(R.W - 1.5), Zr(6.1)]], 0.85, [{ at: 1, dur: 5, pose: 'talk', face: Math.PI }], true), { ...f2, offset: 14 });
  }

  /* ---- tashqarida: KPP qorovuli ---- */
  const kx = cfg.site.entryGateX - cfg.site.gateWidth / 2 - 14;
  const kz = siteNorthZ(kx, cfg) + 4.2;
  add('Qorovul (KPP)', 'site-gate', 'guard', false, fixed([kx + 2.02, kz + 0.6], FACE.px + 0.3, 'look'), { y: 0.25 });

  return out;
}

/* ------------------------------------------------------------------ */
/* Harakat                                                              */
/* ------------------------------------------------------------------ */

const STRIDE = 1.38; // ikki qadam (to‘liq sikl) uzunligi, m

type Piece = { kind: 'walk'; a: P2; b: P2; t0: number; dur: number; d0: number; yaw: number } | { kind: 'stop'; at: P2; t0: number; dur: number; pose: Pose; face: number };

const timelines = new WeakMap<PersonDef, { pieces: Piece[]; T: number }>();

function timeline(p: PersonDef) {
  const cached = timelines.get(p);
  if (cached) return cached;
  const b = p.behaviour;
  if (b.kind !== 'route') throw new Error('fixed');
  const idx = b.points.map((_, i) => i);
  const order = b.pingPong ? [...idx, ...idx.slice(1, -1).reverse()] : idx;
  const pieces: Piece[] = [];
  let t = 0;
  let d = 0;
  let lastYaw = Number.NaN;
  for (let k = 0; k < order.length; k++) {
    const i = order[k];
    const j = order[(k + 1) % order.length];
    const a = b.points[i];
    const c = b.points[j];
    const yaw = Math.atan2(c[0] - a[0], c[1] - a[1]);
    // to‘xtash shu nuqtada (ping-pong'da har kelishda)
    const stop = b.stops.find((s) => s.at === i);
    if (stop) {
      pieces.push({ kind: 'stop', at: a, t0: t, dur: stop.dur, pose: stop.pose, face: stop.face ?? lastYaw });
      t += stop.dur;
    }
    const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
    const dur = len / b.speed;
    pieces.push({ kind: 'walk', a, b: c, t0: t, dur, d0: d, yaw });
    t += dur;
    d += len;
    lastYaw = yaw;
  }
  // birinchi nuqtadagi yo‘nalishsiz to‘xtash — oxirgi (kirib keladigan) bo‘lak yo‘nalishida
  for (const pc of pieces) if (pc.kind === 'stop' && Number.isNaN(pc.face)) pc.face = lastYaw;
  const res = { pieces, T: t };
  timelines.set(p, res);
  return res;
}

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const lerpAngle = (a: number, b: number, k: number) => a + wrap(b - a) * Math.min(1, Math.max(0, k));

export function samplePerson(p: PersonDef, time: number): PersonSample {
  const b = p.behaviour;
  if (b.kind === 'fixed') return { x: b.at[0], z: b.at[1], yaw: b.face, pose: b.pose, phase: 0, seat: b.seat, local: time + p.offset };
  const { pieces, T } = timeline(p);
  const t = (((time + p.offset) % T) + T) % T;
  let i = pieces.findIndex((pc) => t >= pc.t0 && t < pc.t0 + pc.dur);
  if (i < 0) i = pieces.length - 1;
  const pc = pieces[i];
  const prev = pieces[(i - 1 + pieces.length) % pieces.length];
  const next = pieces[(i + 1) % pieces.length];
  if (pc.kind === 'stop') {
    // to‘xtaganda burilish (0.6 s)
    const k = (t - pc.t0) / 0.6;
    return { x: pc.at[0], z: pc.at[1], yaw: lerpAngle(prev.kind === 'walk' ? prev.yaw : pc.face, pc.face, k), pose: pc.pose, phase: 0, local: t - pc.t0 };
  }
  const u = (t - pc.t0) / pc.dur;
  const x = pc.a[0] + (pc.b[0] - pc.a[0]) * u;
  const z = pc.a[1] + (pc.b[1] - pc.a[1]) * u;
  const len = pc.dur * (b.speed || 1);
  const dStart = u * len;
  const dEnd = (1 - u) * len;
  let yaw = pc.yaw;
  if (prev.kind === 'stop' && dStart < 0.9) yaw = lerpAngle(prev.face, pc.yaw, dStart / 0.9);
  else if (prev.kind === 'walk' && dStart < 0.45) yaw = lerpAngle(prev.yaw, pc.yaw, 0.5 + dStart / 0.9);
  else if (next.kind === 'walk' && dEnd < 0.45) yaw = lerpAngle(pc.yaw, next.yaw, 0.5 - dEnd / 0.9);
  const phase = ((pc.d0 + dStart) / STRIDE) * Math.PI * 2;
  return { x, z, yaw, pose: 'walk', phase, local: t - pc.t0 };
}
