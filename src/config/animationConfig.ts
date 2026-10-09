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
    /** Hudud ichidagi marshrut: kirish darvozasidan chiqish darvozasigacha (yo‘l bo‘laklari avtomatik qo‘shiladi) */
    siteRoute: [
      [8, -36],
      [30, -36],
      [30, 12],
      [140, 12],
    ] as P2[],
    cornerRadius: 11,
    roadCornerRadius: 12,
    /** Yo‘lning qaysi qismidan kiradi / chiqadi (yo‘l bo‘ylama koordinatasi, m) */
    roadEntryU: -210,
    roadExitU: 260,
    raw: { offset: 0, stop: [50, 12] as P2, dwell: 30 },
    finished: { offset: 72, stop: [116, 12] as P2, dwell: 28 },
  },

  forklifts: [
    {
      id: 'fl-gallery',
      name: 'Yuk ortgich — xomashyo ombori → liniya (galereya orqali)',
      route: [
        [46.5, 45],
        [18.9, 45],
      ] as P2[],
      /** yuk bilan boradi, bo‘sh qaytadi */
      loadedOut: true,
      cargo: 'glass',
      offset: 6,
      waitEnd: 6,
      waitStart: 10,
      repeat: 2,
    },
    {
      id: 'fl-raw-unload',
      name: 'Yuk ortgich — yuk mashinasidan xomashyoni tushirish',
      route: [
        [50, 33.5],
        [50, 16.9],
      ] as P2[],
      loadedOut: false,
      cargo: 'glass',
      /** yuk mashinasi to‘xtagandan keyin */
      offset: 0,
      syncWith: 'raw',
      waitEnd: 3,
      waitStart: 2,
      repeat: 2,
    },
    {
      id: 'fl-fg-internal',
      name: 'Yuk ortgich — qadoqlangan mahsulot → old korpus buferi',
      route: [
        [-14.3, 60.4],
        [-14.3, 11.2],
      ] as P2[],
      loadedOut: true,
      cargo: 'crate',
      offset: 20,
      waitEnd: 5,
      waitStart: 8,
      repeat: 1,
    },
    {
      id: 'fl-fg-transfer',
      name: 'Yuk ortgich — tayyor mahsulot → tayyor mahsulotlar ombori',
      route: [
        [-14, 3.4],
        [-14, -20],
        [35.5, -20],
        [35.5, 4.5],
        [92, 4.5],
        [92, 38.5],
      ] as P2[],
      loadedOut: true,
      /** uzoq tashqi marshrut — tezroq harakat (m/s) */
      speedLoaded: 4.0,
      speedEmpty: 4.6,
      cargo: 'crate',
      offset: 34,
      waitEnd: 6,
      waitStart: 6,
      repeat: 1,
    },
    {
      id: 'fl-fg-load',
      name: 'Yuk ortgich — tayyor mahsulotni yuk mashinasiga yuklash',
      route: [
        [116, 41.5],
        [116, 16.6],
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
  doorTriggerDistance: 11,
};
