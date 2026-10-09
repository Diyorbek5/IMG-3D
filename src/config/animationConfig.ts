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
    forklift: 2.6,
    forkliftLoaded: 2.0,
    car: 15,
  },

  trucks: {
    /**
     * Hudud ichidagi marshrut: kirish darvozasidan hovli orqali shisha fasad oldidagi yo‘lakka,
     * so‘ng chiqish darvozasigacha (yo‘l bo‘laklari avtomatik qo‘shiladi).
     */
    siteRoute: [
      [8, -38],
      [-30, -38],
      [-30, -21],
      [30, -21],
      [30, 12],
      [140, 12],
    ] as P2[],
    /** Darvozalar oldidagi yuk mashinalari yo‘lagi (z) */
    laneZ: -21,
    cornerRadius: 9,
    roadCornerRadius: 12,
    /** Yo‘lning qaysi qismidan kiradi / chiqadi (yo‘l bo‘ylama koordinatasi, m) */
    roadEntryU: -210,
    roadExitU: 260,
    /** Xomashyo — 3-darvoza oldida, tayyor mahsulot — 1–2-darvozalar oldida */
    raw: { offset: 0, stop: [3.2, -21] as P2, dwell: 30 },
    finished: { offset: 75, stop: [16.2, -21] as P2, dwell: 28 },
  },

  forklifts: [
    {
      id: 'fl-raw-unload',
      name: 'Yuk ortgich — yuk mashinasidan xomashyoni tushirish (3-darvoza)',
      route: [
        [-3, 7],
        [-3, -16.4],
      ] as P2[],
      loadedOut: false,
      cargo: 'glass',
      offset: 0,
      syncWith: 'raw',
      waitEnd: 3,
      waitStart: 2,
      repeat: 2,
    },
    {
      id: 'fl-raw-internal',
      name: 'Yuk ortgich — xomashyo omboridan yuklash stoliga',
      route: [
        [-8, 21],
        [-8, 37.4],
      ] as P2[],
      loadedOut: true,
      cargo: 'glass',
      offset: 6,
      waitEnd: 6,
      waitStart: 10,
      repeat: 2,
    },
    {
      id: 'fl-fg-internal',
      name: 'Yuk ortgich — qadoqlangan mahsulot → tayyor mahsulotlar ombori',
      route: [
        [14.3, 30],
        [14.3, 60.4],
      ] as P2[],
      loadedOut: false,
      cargo: 'crate',
      offset: 20,
      waitEnd: 5,
      waitStart: 8,
      repeat: 1,
    },
    {
      id: 'fl-fg-load',
      name: 'Yuk ortgich — tayyor mahsulotni yuk mashinasiga yuklash (1-darvoza)',
      route: [
        [14, 7],
        [14, -16.4],
      ] as P2[],
      loadedOut: true,
      cargo: 'crate',
      offset: 0,
      syncWith: 'finished',
      waitEnd: 3,
      waitStart: 2,
      repeat: 2,
    },
  ],

  /** Katta yo‘ldagi yengil avtomobillar (faqat g‘arbga yo‘nalgan bo‘laklarda — zavod transporti bilan kesishmaydi) */
  cars: [
    { id: 'car-1', lane: 'outer', offset: 0, color: '#d9dde2' },
    { id: 'car-2', lane: 'inner', offset: 13, color: '#30343b' },
    { id: 'car-3', lane: 'outer', offset: 31, color: '#7a1e1e' },
    { id: 'car-4', lane: 'inner', offset: 44, color: '#9aa3ad' },
  ],

  /** Darvozalarni avtomatik ochish masofasi, m */
  doorTriggerDistance: 6.5,
};
