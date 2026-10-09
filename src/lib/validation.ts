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
    { label: 'Old korpus — omborlar maydoni', ok: front.length === 40 && cfg.building.width === 40 && front.height === 12, detail: `${cfg.building.width} × ${front.length} m, ${front.height} m balandlik; 2 ta ombor (bo‘luvchi devor x = ${px} m)` },
    { label: 'O‘rta (ishlab chiqarish) qism', ok: prod.length === 75 && prod.height === 5, detail: `${prod.length} m × ${prod.height} m balandlik` },
    { label: 'Oxirgi qism', ok: rear.length === 10 && rear.height === 8 && rear.floors === 2, detail: `${rear.length} m × ${rear.height} m, ${rear.floors} qavat, ${cfg.rearRooms.length} ta xona` },
    { label: 'Showroom', ok: cfg.showroom.width === 12 && cfg.showroom.depth === 24 && cfg.showroom.height === 9 && showroomRight, detail: `${cfg.showroom.width} × ${cfg.showroom.depth} m, balandligi ${cfg.showroom.height} m, old fasadning o‘ng tomonida` },
    { label: 'Old fasad', ok: cfg.glassCorner.fullFrontGlazing, detail: 'showroom va darvozalar tomoni to‘liq shishadan' },
    { label: 'Rolikli darvozalar', ok: rollerDoors(cfg).length === 3, detail: `${rollerDoors(cfg).length} ta, har biri ${cfg.rollerDoors.width} × ${cfg.rollerDoors.height} m (taxminiy)` },
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
  const confirmed: string[] = [
    `Asosiy bino: ${cfg.building.width} × ${cfg.building.totalLength} m`,
    `Old korpus — omborlar maydoni: ${cfg.building.width} × ${front.length} m, balandligi ${front.height} m (xomashyo ombori + tayyor mahsulotlar ombori)`,
    ...segs.filter((s) => s.id !== 'front').map((s) => `${s.shortName}: uzunlik ${s.length} m, balandlik ${s.height} m${s.floors > 1 ? `, ${s.floors} qavat` : ''}`),
    `Showroom: ${cfg.showroom.width} × ${cfg.showroom.depth} m, balandligi ${cfg.showroom.height} m, old fasadning o‘ng tomonida`,
    'Old fasad (showroom va darvozalar tomoni) — to‘liq shisha',
    'Rolikli darvozalar soni: 3 ta',
    'Quyosh panellari — faqat ishlab chiqarish zonasi tomining yarmida (omborlar tomida yo‘q)',
    'Xomashyo ombori yon devori — yopiq panel (shishasiz)',
    'Old fasad vitraji biroz qoraytirilgan (tonirovkali) shisha',
    'Oxirgi qismning ishlab chiqarishga qaragan tomoni — to‘liq shisha (ikkala qavat)',
    'Hududga kirish va chiqish — bitta KPP darvozasi orqali; forkliftlar yo‘q, yuk mashinasi orqasi bilan darvozaga kiradi',
  ];
  const pending: string[] = [
    `Ikki ombor orasidagi devor joyi (hozir x = ${cfg.building.frontPartitionX} m: xomashyo ≈${cfg.building.frontPartitionX + cfg.building.width / 2} m, tayyor mahsulot ≈${cfg.building.width / 2 - cfg.building.frontPartitionX} m)`,
    `Rolikli darvozalar o‘lchami (hozir ${cfg.rollerDoors.width} × ${cfg.rollerDoors.height} m) va aniq joylashuvi`,
    `Oxirgi qism qavatlar balandligi (hozir 1-qavat ≈${cfg.building.rearFirstFloorHeight} m) va xonalar o‘lchamlari`,
    `Quyosh panellari qaysi yarimda (hozir ${cfg.solar.side === 'east' ? 'chap' : 'o‘ng'} yarim) va ularning quvvati`,
    'Old logistika maydoni o‘lchami, yo‘lning aniq o‘qi va kirish-chiqish nuqtalari (masterplandan taxminiy)',
    'Qo‘shni ikki binoning vazifasi va o‘lchamlari',
    'Uskunalar ro‘yxati, o‘lchamlari va ishlab chiqaruvchi chizmalari (hozir parametrik modellar)',
    'Vakuumli shisha texnologiyasi (germetik turi, vakuum darajasi, toblash pechi zarurati)',
  ];
  return { confirmed, pending };
}
