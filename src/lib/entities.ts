import { equipmentConfig } from '../config/equipmentConfig';
import { factoryConfig, type ValueStatus } from '../config/factoryConfig';
import { computeLineLayout, FLOOR_Y } from './lineLayout';
import { frontYardRect, getSegments, HALF_W, rollerDoors, showroomRect } from './layout';

export type EntityKind = 'zone' | 'building' | 'equipment' | 'door' | 'site';

export interface Entity {
  id: string;
  kind: EntityKind;
  name: string;
  term?: string;
  description: string;
  /** Uzunlik (z bo‘yicha yoki oqim bo‘yicha), kenglik, balandlik — metr */
  dims: { length: number; width: number; height: number; status: ValueStatus; note?: string };
  bounds: { min: [number, number, number]; max: [number, number, number] };
  /** Ishlab chiqarish jarayonidagi bosqich (1…) */
  step?: number;
  role?: string;
  nextId?: string;
  params?: Record<string, string>;
  /** Ro‘yxatda guruhlash uchun */
  group: string;
}

export const PROCESS_STEPS: { step: number; name: string; ids: string[] }[] = [
  { step: 1, name: 'Katta yo‘l → kirish darvozasi', ids: ['road', 'site-gate'] },
  { step: 2, name: 'Xomashyo qabul qilish (3-darvoza)', ids: ['door-3', 'front-yard'] },
  { step: 3, name: 'Xomashyo ombori', ids: ['raw-buffer'] },
  { step: 4, name: 'Shishani liniyaga uzatish', ids: ['loader'] },
  { step: 5, name: 'Kesish', ids: ['cutting', 'breakout'] },
  { step: 6, name: 'Chetlariga ishlov berish', ids: ['edger'] },
  { step: 7, name: 'Yuvish va quritish', ids: ['washer'] },
  { step: 8, name: 'Texnologik yig‘ish', ids: ['pillar', 'sealer', 'assembly'] },
  { step: 9, name: 'Vakuum hosil qilish va germetiklash', ids: ['vacuum'] },
  { step: 10, name: 'OTK/GPO sifat nazorati', ids: ['qc-zone', 'inspection', 'testing'] },
  { step: 11, name: 'Qadoqlash', ids: ['packing'] },
  { step: 12, name: 'Tayyor mahsulotlar ombori', ids: ['fg-buffer'] },
  { step: 13, name: 'Jo‘natish (1–2-darvozalar → chiqish)', ids: ['door-1', 'site-exit'] },
];

let cache: Entity[] | null = null;

export function getEntities(): Entity[] {
  if (cache) return cache;
  const cfg = factoryConfig;
  const out: Entity[] = [];
  const segs = getSegments();
  const L = computeLineLayout();

  /* ---- Bino segmentlari ---- */
  const segNext: Record<string, string> = { front: 'seg-production', production: 'seg-rear' };
  for (const s of segs) {
    out.push({
      id: `seg-${s.id}`,
      kind: 'zone',
      name: s.name,
      description: s.purpose,
      dims: {
        length: s.length,
        width: cfg.building.width,
        height: s.height,
        status: s.lengthStatus === 'confirmed' && s.heightStatus === 'confirmed' ? 'confirmed' : 'unconfirmed',
        note:
          s.id === 'rear'
            ? `${s.floors} qavat; 1-qavat balandligi ≈ ${cfg.building.rearFirstFloorHeight} m (taxminiy).`
            : s.id === 'front'
              ? '40 × 40 m ombor maydoni: xomashyo ombori + tayyor mahsulotlar ombori.'
              : undefined,
      },
      bounds: { min: [-HALF_W, 0, s.z0], max: [HALF_W, s.height, s.z1] },
      role: s.id === 'production' ? 'Asosiy texnologik jarayon (4–11-bosqichlar)' : s.id === 'front' ? 'Xomashyo va tayyor mahsulotlarni saqlash (3, 12-bosqichlar)' : undefined,
      nextId: segNext[s.id],
      group: 'Asosiy bino (40 × 125 m)',
    });
  }

  const front = segs.find((s) => s.id === 'front')!;
  const px = cfg.building.frontPartitionX;
  out.push({
    id: 'raw-buffer',
    kind: 'zone',
    name: 'Xomashyo ombori',
    description:
      'Old korpusning o‘ng qismi (old fasadga qaraganda). Float-shisha listlari (jumbo 6000 × 3210 mm) 3-darvoza orqali qabul qilinadi, A-stellajlarda saqlanadi va ko‘prik kran bilan joylashtiriladi. Orqa tomondan to‘g‘ridan-to‘g‘ri liniyaning yuklash stoliga uzatiladi.',
    dims: { length: front.length, width: px + HALF_W, height: front.height, status: 'estimated', note: 'Ikki ombor orasidagi devor joyi chizmadan taxminan olingan.' },
    bounds: { min: [-HALF_W, 0, front.z0], max: [px, front.height, front.z1] },
    step: 3,
    role: 'Xomashyoni qabul qilish va saqlash',
    nextId: 'loader',
    group: 'Asosiy bino (40 × 125 m)',
  });
  out.push({
    id: 'fg-buffer',
    kind: 'zone',
    name: 'Tayyor mahsulotlar ombori',
    description:
      'Old korpusning chap qismi (old fasadga qaraganda). Qadoqlangan vakuumli shisha paketlari ichki yo‘lak orqali keltiriladi, yashik va stellajlarda saqlanadi, 1–2-darvozalar orqali yuk mashinalariga yuklanadi.',
    dims: { length: front.length, width: HALF_W - px, height: front.height, status: 'estimated' },
    bounds: { min: [px, 0, front.z0], max: [HALF_W, front.height, front.z1] },
    step: 12,
    role: 'Tayyor mahsulotni saqlash va jo‘natish',
    nextId: 'door-1',
    group: 'Asosiy bino (40 × 125 m)',
  });

  /* ---- Showroom ---- */
  const sr = showroomRect();
  out.push({
    id: 'showroom',
    kind: 'building',
    name: 'Showroom (ko‘rgazma zali)',
    term: 'Showroom',
    description:
      'Old fasadning o‘ng burchagida (old tomondan qaraganda), binodan oldinga chiqib turgan to‘liq shishali hajm. Alyuminiy profilli vitraj, ichida shisha va oyna mahsulotlari namunalari, ekspozitsiya stendlari va qabul stoyka.',
    dims: { length: cfg.showroom.depth, width: cfg.showroom.width, height: cfg.showroom.height, status: 'confirmed', note: `9 × 15 m, balandligi ${cfg.showroom.height} m.` },
    bounds: { min: [sr.x0, 0, sr.z0], max: [sr.x1, cfg.showroom.height, sr.z1] },
    group: 'Asosiy bino (40 × 125 m)',
  });

  /* ---- Darvozalar ---- */
  for (const d of rollerDoors()) {
    out.push({
      id: d.id,
      kind: 'door',
      name: d.name,
      term: 'Rolikli darvoza (rollstavni)',
      description: 'Sanoat tipidagi rolikli darvoza: lamelli metall polotno, yon yo‘naltiruvchi relslar, yuqorida baraban qutisi va elektr yuritma.',
      dims: { length: 0.3, width: d.width, height: d.height, status: cfg.rollerDoors.sizeStatus, note: 'O‘lchamlari berilmagan — konfiguratsiyada o‘zgartiriladi.' },
      bounds: { min: [d.cx - d.width / 2 - 0.3, 0, -0.6], max: [d.cx + d.width / 2 + 0.3, d.height + 0.8, 0.4] },
      group: 'Darvozalar',
    });
  }

  /* ---- Masterplandagi qo‘shni binolar (vazifasi ko‘rsatilmagan) ---- */
  cfg.neighborBuildings.forEach((nb, i) => {
    const z0 = Math.min(nb.rect.z0, nb.wing?.z0 ?? nb.rect.z0);
    out.push({
      id: nb.id,
      kind: 'building',
      name: `Qo‘shni bino ${i + 1}`,
      description: 'Masterplanda ko‘rsatilgan bino. Vazifasi berilmagan — shunchaki bino sifatida (tomi yopiq) ko‘rsatilgan.',
      dims: { length: nb.rect.z1 - z0, width: nb.rect.x1 - nb.rect.x0, height: nb.height, status: 'estimated', note: 'O‘lchamlar masterplan nisbatlaridan taxminiy olingan.' },
      bounds: { min: [nb.rect.x0, 0, z0], max: [nb.rect.x1, nb.height, nb.rect.z1] },
      group: 'Tashqi binolar',
    });
  });
  for (const a of cfg.site.auxBuildings) {
    out.push({
      id: a.id,
      kind: 'building',
      name: a.name,
      description: 'Masterplanda ko‘rsatilgan kichik bino. Vazifasi berilmagan.',
      dims: { length: a.rect.z1 - a.rect.z0, width: a.rect.x1 - a.rect.x0, height: a.height, status: 'unconfirmed' },
      bounds: { min: [a.rect.x0, 0, a.rect.z0], max: [a.rect.x1, a.height, a.rect.z1] },
      group: 'Tashqi binolar',
    });
  }

  /* ---- Tashqi hudud ---- */
  const fy = frontYardRect();
  out.push({
    id: 'front-yard',
    kind: 'site',
    name: 'Old logistika maydoni (yuklash-tushirish)',
    description:
      'Asosiy bino oldidagi beton maydon: yuk mashinalari darvozalar oldida yon tomoni bilan to‘xtaydi, forkliftlar xomashyoni tushiradi va tayyor mahsulotni yuklaydi.',
    dims: { length: cfg.frontYard.depth, width: cfg.frontYard.width, height: 0, status: 'estimated' },
    bounds: { min: [fy.x0, 0, fy.z0], max: [fy.x1, 0.3, fy.z1] },
    step: 2,
    role: 'Transport kirishi va yuk qabul qilish',
    nextId: 'raw-buffer',
    group: 'Tashqi hudud',
  });
  out.push({
    id: 'road',
    kind: 'site',
    name: 'Katta avtomobil yo‘li',
    description: 'Masterplanda qizil chiziq bilan belgilangan magistral yo‘l: 2 × 2 bo‘lakli asfalt qoplama, ajratuvchi chiziq, piyodalar yo‘lagi. Joylashuvi va burchagi masterplandan taxminiy olingan.',
    dims: { length: cfg.road.halfLength * 2, width: cfg.road.lanesPerDirection * 2 * cfg.road.laneWidth + cfg.road.medianWidth, height: 0, status: 'estimated' },
    bounds: { min: [-60, 0, -90], max: [180, 1, -30] },
    step: 1,
    role: 'Xomashyo yetkazib berish va mahsulot jo‘natish',
    nextId: 'front-yard',
    group: 'Tashqi hudud',
  });
  out.push({
    id: 'site-gate',
    kind: 'site',
    name: 'Kirish darvozasi va nazorat-o‘tkazish punkti (KPP)',
    description: 'Yuk va yengil transport uchun asosiy kirish. Shlagbaum va qo‘riqchi budkasi bilan.',
    dims: { length: 12, width: cfg.site.gateWidth, height: 3, status: 'estimated' },
    bounds: { min: [cfg.site.entryGateX - 10, 0, -58], max: [cfg.site.entryGateX + 8, 4, -44] },
    step: 1,
    nextId: 'front-yard',
    group: 'Tashqi hudud',
  });
  out.push({
    id: 'site-exit',
    kind: 'site',
    name: 'Chiqish darvozasi (jo‘natish)',
    description: 'Tayyor mahsulot ortilgan yuk mashinalari uchun alohida chiqish — xomashyo oqimi bilan kesishmaydi.',
    dims: { length: 12, width: cfg.site.gateWidth, height: 3, status: 'estimated' },
    bounds: { min: [cfg.site.exitGateX - 7, 0, -40], max: [cfg.site.exitGateX + 7, 4, -26] },
    step: 13,
    group: 'Tashqi hudud',
  });
  const pk = cfg.site.parking;
  out.push({
    id: 'parking',
    kind: 'site',
    name: 'Avtoturargoh (xodimlar va mehmonlar)',
    description: 'Masterplandagi daraxtli orolchalar bilan ajratilgan avtoturargoh qatorlari.',
    dims: { length: pk.z1 - pk.z0, width: pk.x1 - pk.x0, height: 0, status: 'estimated' },
    bounds: { min: [pk.x0, 0, pk.z0], max: [pk.x1, 0.5, pk.z1] },
    group: 'Tashqi hudud',
  });

  /* ---- Oxirgi qism xonalari ---- */
  const rear = segs.find((x) => x.id === 'rear')!;
  const ff = cfg.building.rearFirstFloorHeight;
  const zA = rear.z0 + cfg.building.wallThickness + cfg.rearCorridorWidth;
  for (const m of cfg.rearRooms) {
    const y0 = m.floor === 1 ? 0 : ff;
    const y1 = m.floor === 1 ? ff : rear.height - cfg.building.parapetHeight;
    out.push({
      id: m.id,
      kind: 'zone',
      name: `${m.name} (${m.floor}-qavat)`,
      description: `Oxirgi qismning ${m.floor}-qavatidagi xona. Xonalar ishlab chiqarish tomonidagi koridordan kiriladi. Joylashuv va o‘lchamlar taxminiy.`,
      dims: { length: rear.z1 - zA, width: m.x1 - m.x0, height: y1 - y0, status: 'unconfirmed' },
      bounds: { min: [m.x0, y0, zA], max: [m.x1, y1, rear.z1] },
      group: 'Oxirgi qism xonalari',
    });
  }

  /* ---- Quyosh panellari ---- */
  {
    const segsS = segs.filter((x) => cfg.solar.segments.includes(x.id));
    const z0 = Math.min(...segsS.map((x) => x.z0));
    const z1 = Math.max(...segsS.map((x) => x.z1));
    const east = cfg.solar.side === 'east';
    out.push({
      id: 'solar',
      kind: 'zone',
      name: 'Quyosh panellari (ishlab chiqarish zonasi tomining yarmi)',
      description: `Ishlab chiqarish zonasi tomining ${east ? 'chap' : 'o‘ng'} yarmida janubga ${cfg.solar.tiltDeg}° qiyalatilgan fotoelektr panellar qatorlari. Quvvati va aniq maydoni loyiha bo‘yicha aniqlashtiriladi.`,
      dims: { length: z1 - z0, width: HALF_W, height: 0.8, status: 'estimated' },
      bounds: { min: [east ? 0 : -HALF_W, 4, z0], max: [east ? HALF_W : 0, 13, z1] },
      group: 'Asosiy bino (40 × 125 m)',
    });
  }

  /* ---- Uskunalar ---- */
  const stepIdx = (id: string) => PROCESS_STEPS.find((p) => p.ids.includes(id))?.step;
  L.stations.forEach((st, i) => {
    const next = L.stations[i + 1];
    const along = st.length;
    const zMin = Math.min(st.zIn, st.zOut);
    out.push({
      id: st.id,
      kind: 'equipment',
      name: st.name,
      term: st.term,
      description: st.description,
      dims: { length: along, width: st.width, height: st.height, status: 'unconfirmed', note: 'Parametrik model — aniq uskuna o‘lchamlari berilmagan.' },
      bounds: { min: [st.cx - st.width / 2, FLOOR_Y, zMin], max: [st.cx + st.width / 2, FLOOR_Y + st.height, zMin + along] },
      step: stepIdx(st.id) ?? st.step,
      role: PROCESS_STEPS.find((p) => p.step === (stepIdx(st.id) ?? st.step))?.name,
      nextId: next ? next.id : 'fg-buffer',
      params: { ...st.params, 'Panel to‘xtash vaqti': `${st.dwell} s (simulyatsiya)` },
      group: 'Ishlab chiqarish uskunalari',
    });
  });
  for (const o of L.optional) {
    out.push({
      id: o.id,
      kind: 'equipment',
      name: o.name,
      term: o.term,
      description: o.description,
      dims: { length: o.length, width: o.width, height: o.height, status: 'unconfirmed' },
      bounds: { min: [o.cx - o.length / 2, FLOOR_Y, o.cz - o.width / 2], max: [o.cx + o.length / 2, FLOOR_Y + o.height, o.cz + o.width / 2] },
      params: o.params,
      group: 'Qo‘shimcha (ixtiyoriy) uskunalar',
    });
  }
  const q = L.qualityZone;
  out.push({
    id: 'qc-zone',
    kind: 'zone',
    name: 'OTK/GPO sifat nazorati zonasi',
    term: 'Quality control (OTK — texnik nazorat bo‘limi)',
    description: 'Texnologik jarayonda alohida ajratilgan, to‘siq bilan o‘ralgan hudud: vizual nazorat stoli, o‘lchov-vakuum sinovi, yaroqsiz mahsulot stellaji va OTK operatori ish joyi.',
    dims: { length: q.z1 - q.z0, width: q.x1 - q.x0, height: 2.2, status: 'unconfirmed' },
    bounds: { min: [q.x0, FLOOR_Y, q.z0], max: [q.x1, 2.4, q.z1] },
    step: 10,
    role: 'Mahsulot sifatini tekshirish',
    nextId: 'packing',
    group: 'Ishlab chiqarish uskunalari',
  });
  void equipmentConfig;
  cache = out;
  return out;
}

export function getEntity(id: string | null) {
  if (!id) return undefined;
  return getEntities().find((e) => e.id === id);
}
