import { equipmentConfig } from '../config/equipmentConfig';
import { factoryConfig, type ValueStatus } from '../config/factoryConfig';
import { computeLineLayout, FLOOR_Y } from './lineLayout';
import { restaurantLayout, RESTAURANT_ID } from './restaurant';
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
  { step: 13, name: 'Jo‘natish (1-darvoza → kirish-chiqish darvozasi)', ids: ['door-1', 'site-gate'] },
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
        status: 'confirmed',
        note:
          s.id === 'rear'
            ? `${s.floors} qavat, har biri ${cfg.building.rearFirstFloorHeight} m (1-qavat ${cfg.building.rearFirstFloorHeight} m + 2-qavat ${s.height - cfg.building.rearFirstFloorHeight} m). Ishlab chiqarishga qaragan tomoni — to‘liq vitraj.`
            : s.id === 'front'
              ? '40 × 40 m ombor maydoni: xomashyo ombori + tayyor mahsulotlar ombori.'
              : undefined,
      },
      bounds: { min: [-HALF_W, 0, s.z0], max: [HALF_W, s.height, s.z1] },
      role: s.id === 'production' ? 'Asosiy texnologik jarayon (4–11-bosqichlar)' : s.id === 'front' ? 'Xomashyo va tayyor mahsulotlarni saqlash (3, 12-bosqichlar)' : undefined,
      nextId: segNext[s.id],
      group: `Asosiy bino (${cfg.building.width} × ${cfg.building.totalLength} m)`,
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
    dims: { length: front.length, width: px + HALF_W, height: front.height, status: 'confirmed', note: `Xomashyo ombori kengligi ${px + HALF_W} m.` },
    bounds: { min: [-HALF_W, 0, front.z0], max: [px, front.height, front.z1] },
    step: 3,
    role: 'Xomashyoni qabul qilish va saqlash',
    nextId: 'loader',
    group: `Asosiy bino (${cfg.building.width} × ${cfg.building.totalLength} m)`,
  });
  out.push({
    id: 'fg-buffer',
    kind: 'zone',
    name: 'Tayyor mahsulotlar ombori',
    description:
      'Old korpusning chap qismi (old fasadga qaraganda). Qadoqlangan vakuumli shisha paketlari ichki yo‘lak orqali keltiriladi, yashik va stellajlarda saqlanadi, 1–2-darvozalar orqali yuk mashinalariga yuklanadi.',
    dims: { length: front.length, width: HALF_W - px, height: front.height, status: 'confirmed', note: `Tayyor mahsulotlar ombori kengligi ${HALF_W - px} m.` },
    bounds: { min: [px, 0, front.z0], max: [HALF_W, front.height, front.z1] },
    step: 12,
    role: 'Tayyor mahsulotni saqlash va jo‘natish',
    nextId: 'door-1',
    group: `Asosiy bino (${cfg.building.width} × ${cfg.building.totalLength} m)`,
  });

  /* ---- Showroom ---- */
  const sr = showroomRect();
  out.push({
    id: 'showroom',
    kind: 'building',
    name: 'Showroom (ko‘rgazma zali)',
    term: 'Showroom',
    description:
      'Old fasadning o‘ng burchagida (old tomondan qaraganda), binodan oldinga chiqib turgan to‘liq shishali ko‘rgazma zali. Ichida: qora marmar brend devori va iMG logotipi, marmar resepshn, arxitektura shishalari vitrinasi (shaffof, yashil, kulrang, ko‘k, bronza, oyna), alyuminiy profil tizimlari stendi (Thermo, Engelberg, Slide Master, Pergola), eshik-rom tizimlari bokslari, shisha to‘siqli antresol va zinapoya, mehmonlar lounge zonasi, trek-chiroqlar va LED yoritish.',
    dims: { length: cfg.showroom.depth, width: cfg.showroom.width, height: cfg.showroom.height, status: 'confirmed', note: `${cfg.showroom.width} × ${cfg.showroom.depth} m, balandligi ${cfg.showroom.height} m.` },
    bounds: { min: [sr.x0, 0, sr.z0], max: [sr.x1, cfg.showroom.height, sr.z1] },
    group: `Asosiy bino (${cfg.building.width} × ${cfg.building.totalLength} m)`,
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
    if (nb.id === RESTAURANT_ID) {
      const R = restaurantLayout(cfg);
      const seats1 = R.hallTables.reduce((a, t) => a + t.seats.length, 0);
      const seats2 = R.banquetSeats.length + R.roundTables.reduce((a, t) => a + t.seats.length, 0);
      out.push({
        id: nb.id,
        kind: 'building',
        name: 'Restoran',
        term: 'Restaurant',
        description:
          'Zavod yonidagi ikki qavatli restoran. Klassik uslubdagi krem rang fasad: arkali katta derazalar, pilyastrlar, karnizlar, frontonli ikki pavilon, markazda portik va temir panjarali balkonlar, terrakota tom; kechqurun fasad pastdan yoritiladi. Ichki qism milliy uslubda: arkalar, gilamlar, so‘zana va laganlar, fonuslar, majolika va ikat bezaklari.',
        dims: { length: nb.rect.z1 - z0, width: nb.rect.x1 - nb.rect.x0, height: R.PAV_EAVE, status: 'confirmed', note: `2 qavat; 1-qavat ≈${seats1} o‘rin, 2-qavat ≈${seats2} o‘rin + 4 ta VIP xona.` },
        bounds: { min: [nb.rect.x0, 0, z0 - R.portico.depth], max: [nb.rect.x1, R.PAV_EAVE + 2.8, nb.rect.z1] },
        role: 'Xodimlar, mehmonlar va mijozlar uchun ovqatlanish, tadbirlar',
        group: 'Restoran',
      });
      const zone = (id: string, name: string, description: string, u0: number, v0: number, u1: number, v1: number, y0: number, y1: number) =>
        out.push({
          id,
          kind: 'zone',
          name,
          description,
          dims: { length: v1 - v0, width: u1 - u0, height: y1 - y0, status: 'confirmed' },
          bounds: { min: [R.X(u0), y0, R.Z(v0)], max: [R.X(u1), y1, R.Z(v1)] },
          group: 'Restoran',
        });
      zone('rest-hall', 'Asosiy zal (1-qavat)', `Kundalik tashriflar, oilaviy bayramlar va tadbirlar uchun. An’anaviy arkalar, milliy bezaklar, fonuslar va iliq yoritish; ${R.hallTables.length} ta stol, ${seats1} o‘rin.`, 0.4, 0.4, R.W - 0.4, R.backWallV, R.FL1, R.CEIL1);
      zone('rest-bar', 'Bar', 'Majolika bilan qoplangan devor, yoritilgan arkali tokchalar va shishalar, ikat naqshli peshtaxta va bar stullari.', R.bar.u0 - 1.5, R.bar.v0 - 1, R.bar.u1 + 1.5, R.backWallV, R.FL1, R.CEIL1);
      zone('rest-vip1', '1-VIP zal (2-qavat)', `Banket zali: ${R.banquetSeats.length} o‘rinli uzun stol, ikat kreslolar, girih panjarali yoritilgan shift, baraban qandillar, gilamlar.`, R.vip1.u0, R.vip1.v0, R.vip1.u1, R.vip1.v1, R.FL2, R.CEIL2);
      zone('rest-vip2', '2-VIP zal (2-qavat)', `${R.roundTables.length} ta dumaloq stol, rattan qandillar, girih shift, arkali tokcha va gilam panno.`, R.vip2.u0, R.vip2.v0, R.vip2.u1, R.vip2.v1, R.FL2, R.CEIL2);
      zone('rest-vip-rooms', 'VIP xonalar (4 ta)', 'Milliy uslubdagi xonalar: supa ustida ko‘rpacha va yostiqlar, xontaxta va dasturxon, so‘zana, laganlar, tokchalardagi ko‘zalar, yog‘och to‘sinli shift.', 0.3, R.corridor.v1, R.W - 0.3, R.backWallV, R.FL2, R.CEIL2);
      zone('rest-kitchen', 'Oshxona', 'Zanglamaydigan po‘lat stollar, plitalar va havo so‘rgich; xizmat eshigi orqa fasadda.', R.kitchen.u0, R.kitchen.v0, R.kitchen.u1, R.kitchen.v1, R.FL1, R.CEIL1);
      return;
    }
    out.push({
      id: nb.id,
      kind: 'building',
      name: `Qo‘shni bino ${i}`,
      description: 'Masterplanda ko‘rsatilgan bino. Vazifasi berilmagan — shunchaki bino sifatida (tomi yopiq) ko‘rsatilgan.',
      dims: { length: nb.rect.z1 - z0, width: nb.rect.x1 - nb.rect.x0, height: nb.height, status: 'confirmed' },
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
      dims: { length: a.rect.z1 - a.rect.z0, width: a.rect.x1 - a.rect.x0, height: a.height, status: 'confirmed' },
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
      'Asosiy bino oldidagi beton maydon: yuk mashinasi KPP orqali kirib, burilish joyida to‘xtaydi va orqasi bilan o‘z darvozasiga biroz kiradi — xomashyo 3-darvozada tushiriladi, tayyor mahsulot 1-darvozada yuklanadi; so‘ng shu KPP orqali chiqib ketadi.',
    dims: { length: cfg.frontYard.depth, width: cfg.frontYard.width, height: 0, status: 'confirmed' },
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
    description: 'Masterplanda qizil chiziq bilan belgilangan magistral yo‘l: 2 × 2 bo‘lakli asfalt qoplama, ajratuvchi chiziq, piyodalar yo‘lagi.',
    dims: { length: cfg.road.halfLength * 2, width: cfg.road.lanesPerDirection * 2 * cfg.road.laneWidth + cfg.road.medianWidth, height: 0, status: 'confirmed' },
    bounds: { min: [-60, 0, -90], max: [180, 1, -30] },
    step: 1,
    role: 'Xomashyo yetkazib berish va mahsulot jo‘natish',
    nextId: 'front-yard',
    group: 'Tashqi hudud',
  });
  out.push({
    id: 'site-gate',
    kind: 'site',
    name: 'Kirish-chiqish darvozasi va nazorat-o‘tkazish punkti (KPP)',
    description: 'Hududga yagona kirish va chiqish joyi: kirish (g‘arbiy) va chiqish (sharqiy) bo‘laklari, shlagbaumlar va qo‘riqchi budkasi. Yuk mashinalari shu yerdan kirib, shu yerdan chiqadi.',
    dims: { length: 12, width: cfg.site.gateWidth, height: 3, status: 'confirmed' },
    bounds: { min: [cfg.site.entryGateX - 10, 0, -58], max: [cfg.site.entryGateX + 8, 4, -44] },
    step: 1,
    nextId: 'front-yard',
    group: 'Tashqi hudud',
  });
  const pk = cfg.site.parking;
  out.push({
    id: 'parking',
    kind: 'site',
    name: 'Avtoturargoh (xodimlar va mehmonlar)',
    description: 'Masterplandagi daraxtli orolchalar bilan ajratilgan avtoturargoh qatorlari.',
    dims: { length: pk.z1 - pk.z0, width: pk.x1 - pk.x0, height: 0, status: 'confirmed' },
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
      description: `Oxirgi qismning ${m.floor}-qavatidagi xona. Xonalar ishlab chiqarish tomonidagi koridordan kiriladi; oshxona va ofis xonalari koridorga shisha bo‘linma bilan ochiladi (ishlab chiqarish ko‘rinib turadi).`,
      dims: { length: rear.z1 - zA, width: m.x1 - m.x0, height: y1 - y0, status: 'confirmed' },
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
      dims: { length: z1 - z0, width: HALF_W, height: 0.8, status: 'confirmed' },
      bounds: { min: [east ? 0 : -HALF_W, 4, z0], max: [east ? HALF_W : 0, 13, z1] },
      group: `Asosiy bino (${cfg.building.width} × ${cfg.building.totalLength} m)`,
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
    dims: { length: q.z1 - q.z0, width: q.x1 - q.x0, height: 2.2, status: 'confirmed' },
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
