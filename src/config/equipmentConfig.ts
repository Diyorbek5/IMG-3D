/**
 * Ishlab chiqarish liniyasi va uskunalar konfiguratsiyasi.
 *
 * MUHIM: aniq uskuna ro‘yxati va ishlab chiqaruvchi chizmalari berilmagan.
 * Quyidagi barcha o‘lchamlar parametrik, taxminiy qiymatlar — real brend yoki model sifatida
 * ko‘rsatilmaydi. Har bir stansiyaning uzunligi/kengligi/balandligi va oraliqlarini o‘zgartirsangiz,
 * konveyerlar, shisha oqimi animatsiyasi va info-panel ma’lumotlari avtomatik qayta hisoblanadi.
 *
 * Liniya U-shaklida (qo‘lda chizilgan rejadagi strelkalar bo‘yicha, old fasadga qaraganda):
 *  1-tarmoq (o‘ng / g‘arbiy, xomashyo ombori tomonida): ishlab chiqarish zonasining boshidan orqaga (+z)
 *  ko‘ndalang uzatish konveyeri: o‘ngdan chapga (g‘arbdan sharqqa)
 *  2-tarmoq (chap / sharqiy, tayyor mahsulotlar ombori tomonida): orqadan oldinga (−z), OTK/GPO va qadoqlash
 *
 * Koordinatalar ishlab chiqarish zonasining boshlanishiga (zStart) nisbatan beriladi,
 * shuning uchun segmentlar tartibi yoki uzunligi o‘zgarsa, liniya ham birga siljiydi.
 */

export type MachineType =
  | 'loader'
  | 'cutting'
  | 'breakout'
  | 'edger'
  | 'washer'
  | 'pillar'
  | 'sealer'
  | 'assembly'
  | 'vacuum'
  | 'inspection'
  | 'testing'
  | 'packing'
  | 'tempering'
  | 'transfer';

export interface StationConfig {
  id: string;
  type: MachineType;
  name: string;
  /** Inglizcha texnik atama (izoh sifatida) */
  term?: string;
  description: string;
  /** Oqim yo‘nalishi bo‘yicha uzunlik, m */
  length: number;
  /** Ko‘ndalang kenglik, m */
  width: number;
  height: number;
  /** Ushbu stansiyadan oldingi konveyer uzunligi, m */
  gapBefore: number;
  /** Shisha paneli stansiyada to‘xtab turadigan vaqt, s (1× tezlikda) */
  dwell: number;
  /** Jarayon bosqichi raqami (umumiy oqimda) */
  step: number;
  params: Record<string, string>;
  /** Ixtiyoriy GLB model (public/models/...) — berilsa, parametrik model o‘rniga yuklanadi */
  modelUrl?: string;
}

export interface LegConfig {
  id: string;
  /** Liniya o‘qining x koordinatasi */
  x: number;
  /** Ishlab chiqarish zonasi boshidan (zStart) boshlanish masofasi (faqat 1-tarmoq uchun) */
  startOffset: number;
  direction: 1 | -1;
  stations: StationConfig[];
  /** Oxirgi stansiyadan keyingi konveyer uzunligi (keyingi tarmoqqa uzatishgacha) */
  tailConveyor: number;
}

const approx = 'taxminiy, tasdiqlanmagan';

export const equipmentConfig = {
  /** Panel harakat tezligi konveyerda, m/s (1× tezlikda) */
  conveyorSpeed: 0.75,
  /** Har bir yangi panel liniyaga qancha vaqtda bir uzatiladi, s */
  spawnInterval: 18,
  conveyorWidthMargin: 0.3,
  rollerPitch: 0.3,

  /** Ko‘ndalang uzatish konveyerining zStart ga nisbatan joyi */
  transferOffset: 60,
  transferWidth: 2.6,

  legs: [
    {
      id: 'right',
      x: -10,
      startOffset: 1.0,
      direction: 1,
      tailConveyor: 0,
      stations: [
        {
          id: 'loader',
          type: 'loader',
          name: 'Shisha listlarini yuklash stoli',
          term: 'Tilting loading table',
          description:
            'Xomashyo omboridan galereya orqali keltirilgan A-stellajdagi katta shisha listlarini vakuum so‘rg‘ichlar yordamida olib, gorizontal holatda liniyaga uzatadi.',
          length: 3.6,
          width: 6.6,
          height: 1.0,
          gapBefore: 0,
          dwell: 4,
          step: 4,
          params: { 'Maks. list o‘lchami': `6000 × 3210 mm (${approx})`, 'So‘rg‘ichlar soni': '12 (taxminiy)' },
        },
        {
          id: 'cutting',
          type: 'cutting',
          name: 'Avtomatik shisha kesish stoli (CNC)',
          term: 'CNC glass cutting table',
          description: 'Katta listni buyurtma o‘lchamlari bo‘yicha CNC portal kesish kallagi yordamida chizib kesadi.',
          length: 3.9,
          width: 7.0,
          height: 1.1,
          gapBefore: 0.8,
          dwell: 9,
          step: 5,
          params: { 'Ish maydoni': `6100 × 3300 mm (${approx})`, 'Kesish kallagi': 'CNC portal, 1 ta' },
        },
        {
          id: 'breakout',
          type: 'breakout',
          name: 'Sindirish (bo‘laklash) stoli',
          term: 'Break-out table',
          description: 'Kesilgan chiziqlar bo‘yicha listni bo‘laklarga ajratadi; havo yostiqli stol bo‘laklarni yengil siljitadi.',
          length: 3.4,
          width: 6.8,
          height: 0.95,
          gapBefore: 0.8,
          dwell: 5,
          step: 5,
          params: { 'Stol turi': 'havo yostiqli', 'Sindirish to‘sinlari': '2 ta (X/Y)' },
        },
        {
          id: 'edger',
          type: 'edger',
          name: 'Ikki tomonlama chet silliqlash stanogi',
          term: 'Double edger',
          description: 'Shisha bo‘lagining ikki qarama-qarshi chetini bir vaqtda silliqlaydi va faskalaydi. Ichidan uzluksiz o‘tadi.',
          length: 8.5,
          width: 3.4,
          height: 1.9,
          gapBefore: 3.0,
          dwell: 0,
          step: 6,
          params: { 'Shpindellar': '2 × 6 (taxminiy)', 'Shisha qalinligi': `3–19 mm (${approx})` },
        },
        {
          id: 'washer',
          type: 'washer',
          name: 'Shisha yuvish va quritish mashinasi',
          term: 'Washing & drying machine',
          description: 'Cho‘tkalar va demineralizatsiyalangan suv bilan yuvadi, havo pichoqlari bilan quritadi. Yig‘ishdan oldin sirt toza bo‘lishi shart.',
          length: 6.5,
          width: 3.0,
          height: 2.3,
          gapBefore: 2.0,
          dwell: 0,
          step: 7,
          params: { 'Cho‘tkalar juftligi': '3 (taxminiy)', 'Quritish': 'havo pichoqlari' },
        },
        {
          id: 'pillar',
          type: 'pillar',
          name: 'Tayanch ustunchalarni joylashtirish stansiyasi',
          term: 'Support pillar placement',
          description: 'Vakuumli shisha paketida ikki list orasidagi masofani ushlab turuvchi mikro-tayanchlarni (pillar) to‘r bo‘yicha joylashtiradi.',
          length: 4.0,
          width: 3.2,
          height: 2.4,
          gapBefore: 2.0,
          dwell: 6,
          step: 8,
          params: { 'Tayanch qadami': `20–40 mm (${approx})`, 'Joylash usuli': 'portal robot' },
        },
        {
          id: 'sealer',
          type: 'sealer',
          name: 'Chet germetigini surtish stansiyasi',
          term: 'Edge seal dispensing',
          description: 'Paket perimetri bo‘ylab germetiklovchi material (masalan, shisha-frit pastasi) qatlamini surtadi. Aniq material texnologiyaga bog‘liq.',
          length: 4.0,
          width: 3.2,
          height: 2.4,
          gapBefore: 1.0,
          dwell: 6,
          step: 8,
          params: { 'Germetik turi': 'texnologiyaga bog‘liq (tasdiqlanmagan)', 'Dozator': '1 kallak' },
        },
        {
          id: 'assembly',
          type: 'assembly',
          name: 'Paketni yig‘ish (ikkinchi listni yotqizish)',
          term: 'Lay-up / pairing station',
          description: 'Ikkinchi shisha listini vakuum ko‘targich yordamida tayanchlar ustiga aniq joylashtiradi va paketni hosil qiladi.',
          length: 4.2,
          width: 3.4,
          height: 2.8,
          gapBefore: 1.0,
          dwell: 6,
          step: 8,
          params: { 'Joylash aniqligi': `±0.5 mm (${approx})`, 'Ko‘targich': 'vakuumli rama' },
        },
      ],
    },
    {
      id: 'left',
      x: 10,
      /** Ikkinchi tarmoq ko‘ndalang uzatish konveyerining chetidan boshlanadi (avtomatik) */
      startOffset: 0,
      direction: -1,
      tailConveyor: 1.5,
      stations: [
        {
          id: 'vacuum',
          type: 'vacuum',
          name: 'Vakuum hosil qilish va germetiklash pechi',
          term: 'Vacuum sealing / evacuation furnace',
          description:
            'Paket qizdirilib, chet germetigi eritiladi, ichki bo‘shliqdan havo so‘rib olinadi va paket germetik yopiladi. Vakuum nasoslari pech yonida joylashgan.',
          length: 12,
          width: 3.6,
          height: 2.6,
          gapBefore: 1.6,
          dwell: 12,
          step: 9,
          params: {
            'Kamera uzunligi': `12 m (${approx})`,
            'Vakuum darajasi': 'texnologiyaga bog‘liq (tasdiqlanmagan)',
            'Vakuum nasoslari': '2 ta (taxminiy)',
          },
        },
        {
          id: 'inspection',
          type: 'inspection',
          name: 'OTK/GPO vizual nazorat stoli',
          term: 'Light-table inspection',
          description: 'Yoritilgan ekran oldida paketning nuqsonlari (dog‘, chiziq, tayanchlar joylashuvi) operator tomonidan tekshiriladi.',
          length: 4.0,
          width: 3.2,
          height: 2.6,
          gapBefore: 4.0,
          dwell: 6,
          step: 10,
          params: { 'Yoritish': 'LED yorug‘lik devori', 'Nazorat': 'vizual + o‘lchov' },
        },
        {
          id: 'testing',
          type: 'testing',
          name: 'Vakuum va o‘lcham nazorati stansiyasi',
          term: 'Vacuum / dimension test',
          description: 'Paket qalinligi, diagonali va vakuum sifati asboblar bilan o‘lchanadi. Yaroqsiz mahsulot alohida stellajga chiqariladi.',
          length: 3.6,
          width: 3.2,
          height: 2.0,
          gapBefore: 1.5,
          dwell: 5,
          step: 10,
          params: { 'O‘lchovlar': 'qalinlik, diagonal, vakuum', 'Yaroqsiz mahsulot': 'alohida stellaj' },
        },
        {
          id: 'packing',
          type: 'packing',
          name: 'Qadoqlash stansiyasi',
          term: 'Packing station',
          description: 'Tayyor paketlar oraliq qistirmalar bilan yog‘och yashik yoki A-stellajga joylanadi, plyonka bilan o‘raladi va markalanadi.',
          length: 4.4,
          width: 3.4,
          height: 2.6,
          gapBefore: 2.5,
          dwell: 7,
          step: 11,
          params: { 'Qadoq turi': 'yog‘och yashik / A-stellaj', 'Markalash': 'yorliq printeri' },
        },
      ],
    },
  ] as LegConfig[],

  /** Ixtiyoriy (faollashtiriladigan) uskunalar — asosiy liniyaga majburiy kiritilmagan */
  optional: [
    {
      id: 'tempering',
      type: 'tempering' as MachineType,
      name: 'Shishani toblash pechi (ixtiyoriy)',
      term: 'Tempering furnace',
      description:
        'Issiqlik bilan ishlov berish texnologik konfiguratsiyaga bog‘liq. Shu sababli asosiy liniyaga kiritilmagan, qo‘shimcha faollashtiriladigan uskuna sifatida ko‘rsatilgan.',
      /** zStart ga nisbatan markaz va o‘lchamlar */
      x: 2,
      zOffset: 67,
      length: 24,
      width: 3.2,
      height: 2.4,
      params: { 'Holati': 'ixtiyoriy — tasdiqlanmagan', 'Bo‘limlar': 'yuklash, qizdirish, sovutish, tushirish' },
    },
  ],

  /** OTK/GPO sifat nazorati zonasi — alohida ajratilgan hudud (zStart ga nisbatan) */
  qualityZone: { x0: 4.8, x1: 18.6, zOffset0: 29.5, zOffset1: 43.8 },
  /** Qadoqlangan mahsulot buferi (zStart ga nisbatan) */
  packedStaging: { x0: 12.2, x1: 16.6, zOffset0: 22.8, zOffset1: 26.6 },

  /** Yo‘laklar (x oralig‘i) */
  aisles: {
    forkliftCentral: { x0: -3, x1: 3 },
    /** qadoqlangan mahsulot → tayyor mahsulotlar ombori */
    forkliftFinished: { x0: 12.4, x1: 16.2 },
    /** xomashyo ombori → yuklash stoli */
    forkliftRaw: { x0: -9.6, x1: -6.4 },
    walkwayEast: { x0: 18.0, x1: 19.4 },
    walkwayWest: { x0: -19.4, x1: -18.0 },
  },
};

export type EquipmentConfig = typeof equipmentConfig;
