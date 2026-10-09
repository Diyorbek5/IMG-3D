import { computeLineLayout } from './lineLayout';
import { factoryConfig } from '../config/factoryConfig';
import { getSegments, rollerDoors, segmentsTotalLength, showroomRect } from './layout';
import type { Rect } from '../config/factoryConfig';

export interface Check {
  label: string;
  ok: boolean;
  detail: string;
}

const overlap = (a: Rect, b: Rect) => a.x0 < b.x1 && a.x1 > b.x0 && a.z0 < b.z1 && a.z1 > b.z0;

/** Konfiguratsiyaning texnik topshiriqqa mosligini tekshirish (UI "Hisobot" bo‘limi va testlar) */
export function runChecks(cfg = factoryConfig): Check[] {
  const segs = getSegments(cfg);
  const by = (id: string) => segs.find((s) => s.id === id)!;
  const sum = segmentsTotalLength(cfg);
  const front = by('front');
  const prod = by('production');
  const rear = by('rear');
  const sr = showroomRect(cfg);
  const building: Rect = { x0: -cfg.building.width / 2, x1: cfg.building.width / 2, z0: 0, z1: cfg.building.totalLength };
  const L = computeLineLayout();
  const stationsInProd = L.stations.every((s) => Math.min(s.zIn, s.zOut) >= prod.z0 - 1e-6 && Math.max(s.zIn, s.zOut) <= prod.z1 + 1e-6);
  const px = cfg.building.frontPartitionX;
  const qcLeft = L.qualityZone.x0 > 0;
  const showroomRight = sr.x1 <= 0;
  return [
    { label: 'Umumiy uzunlik', ok: Math.abs(sum - cfg.building.totalLength) < 1e-6 && cfg.building.totalLength === 125, detail: `${segs.map((s) => s.length).join(' + ')} = ${sum} m, talab 125 m` },
    { label: 'Umumiy kenglik', ok: cfg.building.width === 40, detail: `${cfg.building.width} m` },
    {
      label: 'Old korpus — omborlar maydoni',
      ok: front.length === 40 && cfg.building.width === 40 && front.height === 12 && px + cfg.building.width / 2 === 22,
      detail: `${cfg.building.width} × ${front.length} m, ${front.height} m balandlik; xomashyo ombori ${px + cfg.building.width / 2} m, tayyor mahsulotlar ombori ${cfg.building.width / 2 - px} m`,
    },
    { label: 'O‘rta (ishlab chiqarish) qism', ok: prod.length === 75 && prod.height === 5, detail: `${prod.length} m × ${prod.height} m balandlik` },
    {
      label: 'Oxirgi qism',
      ok: rear.length === 10 && rear.height === 8 && rear.floors === 2 && cfg.building.rearFirstFloorHeight === 4 && rear.height - cfg.building.rearFirstFloorHeight === 4,
      detail: `${rear.length} m × ${rear.height} m, ${rear.floors} qavat (har biri ${cfg.building.rearFirstFloorHeight} m), ${cfg.rearRooms.length} ta xona`,
    },
    { label: 'Showroom', ok: cfg.showroom.width === 12 && cfg.showroom.depth === 24 && cfg.showroom.height === 9 && showroomRight, detail: `${cfg.showroom.width} × ${cfg.showroom.depth} m, balandligi ${cfg.showroom.height} m, old fasadning o‘ng tomonida` },
    { label: 'Old fasad', ok: cfg.glassCorner.fullFrontGlazing, detail: 'showroom va darvozalar tomoni to‘liq shishadan' },
    { label: 'Rolikli darvozalar', ok: rollerDoors(cfg).length === 3, detail: `${rollerDoors(cfg).length} ta, har biri ${cfg.rollerDoors.width} × ${cfg.rollerDoors.height} m` },
    { label: 'Quyosh panellari', ok: cfg.solar.segments.length > 0, detail: `faqat ishlab chiqarish zonasi tomining ${cfg.solar.side === 'east' ? 'chap' : 'o‘ng'} yarmida` },
    {
      label: 'Qo‘shni binolar alohida',
      ok: cfg.neighborBuildings.every((b) => !overlap(b.rect, building) && !overlap(b.rect, sr)),
      detail: 'masterplandagi 2 ta bino — nomsiz, tomi yopiq',
    },
    { label: 'OTK/GPO zonasi', ok: qcLeft, detail: 'liniyaning chap (qaytish) tarmog‘ida, alohida to‘siq bilan ajratilgan' },
    { label: 'Uskunalar ishlab chiqarish zonasida', ok: stationsInProd, detail: `${L.stations.length} ta stansiya, ${L.conveyors.length} ta konveyer bo‘lagi` },
  ];
}

/** Hisobot: qaysi qiymatlar tasdiqlangan, qaysilari aniqlashtirilishi kerak */
export function dimensionReport(cfg = factoryConfig) {
  const segs = getSegments(cfg);
  const front = segs.find((s) => s.id === 'front')!;
  const px = cfg.building.frontPartitionX;
  const ff = cfg.building.rearFirstFloorHeight;
  const rear = segs.find((s) => s.id === 'rear')!;
  const confirmed: string[] = [
    `Asosiy bino: ${cfg.building.width} × ${cfg.building.totalLength} m`,
    `Old korpus — omborlar maydoni: ${cfg.building.width} × ${front.length} m, balandligi ${front.height} m`,
    `Xomashyo ombori: ${px + cfg.building.width / 2} × ${front.length} m; tayyor mahsulotlar ombori: ${cfg.building.width / 2 - px} × ${front.length} m`,
    ...segs.filter((s) => s.id !== 'front').map((s) => `${s.shortName}: uzunlik ${s.length} m, balandlik ${s.height} m${s.floors > 1 ? `, ${s.floors} qavat` : ''}`),
    `Oxirgi qism qavatlari: 1-qavat ${ff} m, 2-qavat ${rear.height - ff} m`,
    `Showroom: ${cfg.showroom.width} × ${cfg.showroom.depth} m, balandligi ${cfg.showroom.height} m, old fasadning o‘ng tomonida`,
    'Old fasad (showroom va darvozalar tomoni) — to‘liq shisha',
    `Rolikli darvozalar: 3 ta, har biri ${cfg.rollerDoors.width} × ${cfg.rollerDoors.height} m`,
    `Old logistika maydoni: ${cfg.frontYard.width} × ${cfg.frontYard.depth} m`,
    'Quyosh panellari — faqat ishlab chiqarish zonasi tomining yarmida (omborlar tomida yo‘q)',
    'Xomashyo ombori yon devori — yopiq panel (shishasiz)',
    'Old fasad vitraji biroz qoraytirilgan (tonirovkali) shisha',
    'Oxirgi qismning ishlab chiqarishga qaragan tomoni — to‘liq shisha (ikkala qavat)',
    'Hududga kirish va chiqish — bitta KPP darvozasi orqali; forkliftlar yo‘q, yuk mashinasi orqasi bilan darvozaga kiradi',
  ];
  const pending: string[] = [
    'Uskunalar ro‘yxati, o‘lchamlari va ishlab chiqaruvchi chizmalari (hozir parametrik modellar)',
    'Vakuumli shisha texnologiyasi (germetik turi, vakuum darajasi, toblash pechi zarurati)',
    'Quyosh panellari quvvati',
  ];
  return { confirmed, pending };
}
