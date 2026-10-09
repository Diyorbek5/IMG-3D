import type { P2 } from '../lib/motion';

/**
 * Transport harakati marshrutlari va jadvallari.
 * Nuqtalar [x, z] ko‘rinishida (metr). Yo‘l bo‘laklari va to‘xtash joylari shu yerda o‘zgartiriladi.
 * Barcha transportlar bitta umumiy sikl (masterCycle) ichida rejalashtirilgan — shuning uchun
 * ular bir-biri bilan to‘qnashmaydi (src/test/vehicles.test.ts avtomatik tekshiradi).
 */
export const animationConfig = {
  /** Umumiy sikl davomiyligi, s (1× tezlikda) */
  masterCycle: 150,
  speeds: {
    road: 13,
    site: 6,
    car: 15,
  },

  /**
   * Yuk mashinalari bitta kirish-chiqish darvozasi (KPP) orqali kiradi va chiqadi:
   * kirishda g‘arbiy bo‘lak (inX), chiqishda sharqiy bo‘lak (outX).
   * Har bir mashina: hovliga kiradi → to‘xtaydi → orqasi bilan ombor darvozasiga biroz kiradi →
   * tushiradi/yuklaydi → oldinga yurib o‘sha darvozadan chiqib ketadi.
   */
  trucks: {
    gate: { inX: 5, outX: 11 },
    cornerRadius: 9,
    /** Orqaga yurish tezligi, m/s */
    reverseSpeed: 2.2,
    /** Yo‘lning qaysi qismidan kiradi / chiqadi (yo‘l bo‘ylama koordinatasi, m) */
    roadEntryU: -210,
    roadExitU: 260,
    raw: {
      offset: 0,
      dwell: 30,
      /** hovliga kirish (oxirgi nuqta — orqaga yurish boshlanadigan joy) */
      approach: [
        [5, -24],
        [26, -24],
      ] as P2[],
      /** orqaga yurish: tirkama 3-darvoza (xomashyo ombori) orqali biroz ichkariga kiradi */
      reverse: [
        [26, -24],
        [-3, -24],
        [-3, 14],
      ] as P2[],
      /** tirkama ilgagining to‘xtash nuqtasi (z) — tirkama orqasi ≈3.5 m ichkarida */
      stopZ: -10,
      /** chiqish (darvozadan kirish-chiqish darvozasigacha) */
      exit: [
        [-3, -10],
        [-3, -30],
        [11, -40],
      ] as P2[],
    },
    finished: {
      offset: 78,
      dwell: 30,
      approach: [
        [5, -24],
        [-16, -24],
      ] as P2[],
      /** tirkama 1-darvoza (tayyor mahsulotlar ombori) orqali biroz ichkariga kiradi */
      reverse: [
        [-16, -24],
        [14, -24],
        [14, 14],
      ] as P2[],
      stopZ: -10,
      exit: [
        [14, -10],
        [14, -34],
        [11, -42],
      ] as P2[],
    },
  },

  /** Katta yo‘ldagi yengil avtomobillar (faqat g‘arbga yo‘nalgan bo‘laklarda — zavod transporti bilan kesishmaydi) */
  cars: [
    { id: 'car-1', lane: 'outer', offset: 0, color: '#d9dde2' },
    { id: 'car-2', lane: 'inner', offset: 13, color: '#30343b' },
    { id: 'car-3', lane: 'outer', offset: 31, color: '#7a1e1e' },
    { id: 'car-4', lane: 'inner', offset: 44, color: '#9aa3ad' },
  ],

  /** Darvozalarni avtomatik ochish masofasi, m */
  doorTriggerDistance: 9,
};
