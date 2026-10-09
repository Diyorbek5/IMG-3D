import { computeLineLayout } from './lineLayout';
import { factoryConfig } from '../config/factoryConfig';
import { frontYardRect, getSegments, rollerDoors, segmentsTotalLength, showroomRect } from './layout';
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
  const tbd = by('tbd');
  const sr = showroomRect(cfg);
  const yard = frontYardRect(cfg);
  const building: Rect = { x0: -cfg.building.width / 2, x1: cfg.building.width / 2, z0: 0, z1: cfg.building.totalLength };
  const L = computeLineLayout();
  const stationsInProd = L.stations.every((s) => Math.min(s.zIn, s.zOut) >= prod.z0 - 1e-6 && Math.max(s.zIn, s.zOut) <= prod.z1 + 1e-6);
  const nothingInTbd = L.stations.every((s) => Math.max(s.zIn, s.zOut) <= tbd.z0 || Math.min(s.zIn, s.zOut) >= tbd.z1);
  const known = front.length + prod.length + rear.length;
  return [
    { label: 'Umumiy uzunlik', ok: Math.abs(sum - cfg.building.totalLength) < 1e-6 && cfg.building.totalLength === 125, detail: `segmentlar yig‘indisi ${sum} m, talab 125 m` },
    { label: 'Umumiy kenglik', ok: cfg.building.width === 40, detail: `${cfg.building.width} m` },
    { label: 'Old qism', ok: front.length === 10 && front.height === 12, detail: `${front.length} m × ${front.height} m balandlik` },
    { label: 'O‘rta (ishlab chiqarish) qism', ok: prod.length === 75 && prod.height === 5, detail: `${prod.length} m × ${prod.height} m balandlik` },
    { label: 'Oxirgi qism', ok: rear.length === 10 && rear.height === 8 && rear.floors === 2, detail: `${rear.length} m × ${rear.height} m, ${rear.floors} qavat` },
    { label: 'Aniqlashtiriladigan zona', ok: tbd.length === cfg.building.totalLength - known, detail: `125 − (${front.length} + ${prod.length} + ${rear.length}) = ${tbd.length} m; uskunalar joylashtirilmagan: ${nothingInTbd ? 'ha' : 'YO‘Q'}` },
    { label: 'Showroom', ok: cfg.showroom.width === 9 && cfg.showroom.depth === 15, detail: `${cfg.showroom.width} × ${cfg.showroom.depth} m (balandligi ≈${cfg.showroom.height} m — sozlanadi)` },
    { label: 'Rolikli darvozalar', ok: rollerDoors(cfg).length === 3, detail: `${rollerDoors(cfg).length} ta, har biri ${cfg.rollerDoors.width} × ${cfg.rollerDoors.height} m (taxminiy)` },
    { label: 'Old hovli 40 × 40 m', ok: yard.x1 - yard.x0 === 40 && yard.z1 - yard.z0 === 40 && !overlap(yard, building), detail: 'binodan alohida tashqi maydon' },
    {
      label: 'Omborlar alohida',
      ok: !overlap(cfg.rawWarehouse.rect, building) && !overlap(cfg.finishedWarehouse.rect, building) && !overlap(cfg.rawWarehouse.rect, cfg.finishedWarehouse.rect) && !overlap(cfg.rawWarehouse.rect, sr),
      detail: 'xomashyo ombori, tayyor mahsulotlar ombori va showroom — uchta alohida obyekt',
    },
    { label: 'Uskunalar ishlab chiqarish zonasida', ok: stationsInProd, detail: `${L.stations.length} ta stansiya, ${L.conveyors.length} ta konveyer bo‘lagi` },
  ];
}

/** Hisobot: qaysi qiymatlar tasdiqlangan, qaysilari aniqlashtirilishi kerak */
export function dimensionReport(cfg = factoryConfig) {
  const segs = getSegments(cfg);
  const confirmed: string[] = [
    `Asosiy bino: ${cfg.building.width} × ${cfg.building.totalLength} m`,
    ...segs.filter((s) => s.lengthStatus === 'confirmed').map((s) => `${s.shortName}: uzunlik ${s.length} m${s.heightStatus === 'confirmed' ? `, balandlik ${s.height} m` : ''}${s.floors > 1 ? `, ${s.floors} qavat` : ''}`),
    `Showroom: ${cfg.showroom.width} × ${cfg.showroom.depth} m`,
    `Old hovli: ${cfg.frontYard.width} × ${cfg.frontYard.depth} m`,
    'Rolikli darvozalar soni: 3 ta',
  ];
  const pending: string[] = [
    `Aniqlashtiriladigan zona: ${segs.find((s) => s.id === 'tbd')?.length} m — vazifasi, joylashuvi (hozir old korpus orqasida) va balandligi (hozir ≈${segs.find((s) => s.id === 'tbd')?.height} m)`,
    `Qo‘lda chizilgan rejadagi old qism uzunligi "10" yoki "40" deb o‘qilishi mumkin — "40" bo‘lsa, 30 m farq yo‘qoladi`,
    `Showroom balandligi (hozir ≈${cfg.showroom.height} m)`,
    `Rolikli darvozalar o‘lchami (hozir ${cfg.rollerDoors.width} × ${cfg.rollerDoors.height} m) va aniq joylashuvi`,
    `Oxirgi qism qavatlar balandligi (hozir 1-qavat ≈${cfg.building.rearFirstFloorHeight} m)`,
    'Xomashyo va tayyor mahsulotlar omborlarining o‘lchamlari va balandligi (masterplandan taxminiy)',
    'Katta yo‘lning aniq o‘qi, kengligi va kirish/chiqish nuqtalari (masterplandan taxminiy)',
    'Uskunalar ro‘yxati, o‘lchamlari va ishlab chiqaruvchi chizmalari (hozir parametrik modellar)',
    'Vakuumli shisha texnologiyasi (germetik turi, vakuum darajasi, toblash pechi zarurati)',
  ];
  return { confirmed, pending };
}
