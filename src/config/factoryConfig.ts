/**
 * iMG — MIRROR & GLASS zavodi: asosiy parametrlar.
 *
 * Koordinatalar tizimi (1 birlik = 1 metr):
 *  - X o‘qi: g‘arb (−) → sharq (+)
 *  - Y o‘qi: yuqoriga
 *  - Z o‘qi: shimol (−) → janub (+)
 *  - Asosiy binoning old fasadi z = 0 da, katta yo‘lga (shimolga) qaraydi.
 *    Bino z = 0 … z = totalLength oralig‘ida janubga cho‘ziladi.
 *  - Binoning bo‘ylama o‘qi x = 0.
 *
 * Har bir qiymatning holati ko‘rsatilgan:
 *  - 'confirmed'   — buyurtmachi tomonidan berilgan (qo‘lda chizilgan reja / texnik topshiriq)
 *  - 'estimated'   — masterplan nisbatlaridan olingan taxminiy qiymat
 *  - 'unconfirmed' — hech qayerda berilmagan, vaqtincha qabul qilingan qiymat
 */

export type ValueStatus = 'confirmed' | 'estimated' | 'unconfirmed';

export type SegmentId = 'front' | 'production' | 'rear';

export interface BuildingSegment {
  id: SegmentId;
  name: string;
  shortName: string;
  /** Bino bo‘ylab uzunlik, m */
  length: number;
  /** Parapet bilan birga umumiy balandlik, m */
  height: number;
  floors: number;
  lengthStatus: ValueStatus;
  heightStatus: ValueStatus;
  purpose: string;
}

export interface Rect {
  /** g‘arbiy chegara (x min) */
  x0: number;
  /** sharqiy chegara (x max) */
  x1: number;
  /** shimoliy chegara (z min) */
  z0: number;
  /** janubiy chegara (z max) */
  z1: number;
}

export const factoryConfig = {
  name: 'iMG — MIRROR & GLASS',
  subtitle: 'Shisha va oyna ishlab chiqarish zavodi · konseptual 3D raqamli maket',

  building: {
    width: 40,
    widthStatus: 'confirmed' as ValueStatus,
    totalLength: 125,
    totalLengthStatus: 'confirmed' as ValueStatus,
    /**
     * Segmentlar old fasaddan (z = 0) orqaga qarab tartiblangan.
     * 40 + 75 + 10 = 125 m. Old korpus (40 × 40 m) — ikkiga bo‘lingan ombor maydoni:
     * xomashyo ombori va tayyor mahsulotlar ombori (buyurtmachi tomonidan aniqlashtirildi).
     */
    segments: [
      {
        id: 'front',
        name: 'Old korpus — omborlar maydoni (xomashyo ombori + tayyor mahsulotlar ombori)',
        shortName: 'Omborlar (40 × 40 m)',
        length: 40,
        height: 12,
        floors: 1,
        lengthStatus: 'confirmed',
        heightStatus: 'confirmed',
        purpose:
          'Showroom ortidagi 40 × 40 m maydon ikkiga bo‘lingan: o‘ng tomoni — xomashyo ombori (shisha listlari A-stellajlarda, ko‘prik kran), chap tomoni — tayyor mahsulotlar ombori. Old fasad to‘liq shishadan, unda 3 ta rolikli darvoza.',
      },
      {
        id: 'production',
        name: 'Asosiy ishlab chiqarish zonasi',
        shortName: 'Ishlab chiqarish',
        length: 75,
        height: 5,
        floors: 1,
        lengthStatus: 'confirmed',
        heightStatus: 'confirmed',
        purpose:
          'Shishani kesish, chetlariga ishlov berish, yuvish-quritish, vakuumli shisha paketini yig‘ish, germetiklash, OTK/GPO sifat nazorati va qadoqlash. Oqim U-shaklida (chizmadagi strelkalar bo‘yicha): o‘ng tomon bo‘ylab orqaga, orqada o‘ngdan chapga, chap tomon bo‘ylab oldinga.',
      },
      {
        id: 'rear',
        name: 'Oxirgi qism — ikki qavatli ma’muriy-maishiy blok',
        shortName: 'Oxirgi qism (2 qavat)',
        length: 10,
        height: 8,
        floors: 2,
        lengthStatus: 'confirmed',
        heightStatus: 'confirmed',
        purpose:
          '1-qavat: oshxona va ovqatlanish zali, kiyinish va sanitariya xonalari, texnik xona, tibbiyot xonasi, kirish va zinapoya. 2-qavat: ishlab chiqarish rahbari xonasi, muhandis-texnologlar xonasi, yig‘ilishlar zali, OTK laboratoriyasi.',
      },
    ] as BuildingSegment[],
    wallThickness: 0.25,
    parapetHeight: 0.9,
    /** Oxirgi qismning birinchi qavat balandligi (berilmagan — taxminiy) */
    rearFirstFloorHeight: 4.0,
    rearFirstFloorHeightStatus: 'unconfirmed' as ValueStatus,
    /**
     * Old korpusdagi omborlarni ajratuvchi devor (chizmadagi chiziq) — x koordinatasi.
     * x < frontPartitionX — xomashyo ombori (old fasadga qaraganda o‘ng tomon),
     * x > frontPartitionX — tayyor mahsulotlar ombori (chap tomon).
     */
    frontPartitionX: 2,
    frontPartitionXStatus: 'estimated' as ValueStatus,
    /** Ustunlar qadami (konstruktiv), m */
    bayLength: 6,
  },

  /**
   * Showroom — old fasadga qaraganda o‘ng burchakda (g‘arbiy burchak), binodan tashqariga chiqib turadi.
   * 9 m — fasad bo‘ylab kenglik, 15 m — fasaddan oldinga chiqish (chuqurlik).
   */
  showroom: {
    width: 9,
    depth: 15,
    sizeStatus: 'confirmed' as ValueStatus,
    height: 6,
    heightStatus: 'confirmed' as ValueStatus,
  },

  /**
   * Shisha fasad: old fasad (showroom va darvozalar tomoni) to‘liq vitraj;
   * Yon fasadda shisha qism yo‘q (sideDepth = 0): showroomdan keyingi xomashyo ombori yon devori yopiq panel.
   * side — showroom joylashgan burchak: 'west' = old fasadga qaraganda o‘ng tomon.
   */
  glassCorner: {
    side: 'west' as 'east' | 'west',
    /** Old fasad to‘liq shishadan */
    fullFrontGlazing: true,
    /** Showroom burchagidagi shisha qism kengligi (to‘liq shisha o‘chirilgan holat uchun), m */
    facadeWidth: 9,
    /** Yon fasadda shisha qismining uzunligi (old fasaddan), m */
    sideDepth: 0,
    mullionSpacing: 1.5,
    transomSpacing: 2.2,
  },

  /**
   * 3 ta rolikli darvoza (rollstavni) — shisha old fasadda, showroomdan chap tomonda.
   * 1 va 2 — tayyor mahsulotlar ombori, 3 — xomashyo ombori.
   */
  rollerDoors: {
    /** Soni o‘zgartirilmaydi: 3 ta */
    centersX: [14, 6, -3],
    centersStatus: 'estimated' as ValueStatus,
    width: 4.5,
    height: 5.0,
    sizeStatus: 'unconfirmed' as ValueStatus,
    names: ['1-darvoza (tayyor mahsulot jo‘natish)', '2-darvoza (tayyor mahsulot jo‘natish)', '3-darvoza (xomashyo qabul qilish)'],
  },

  /** Asosiy bino oldidagi tashqi logistika maydoni (yuk mashinalari, yuklash-tushirish) — o‘lchami taxminiy */
  frontYard: {
    width: 40,
    depth: 40,
    status: 'estimated' as ValueStatus,
  },

  /** Tom: yarmida quyosh panellari */
  solar: {
    /** panellar joylashgan yarim: 'east' — old fasadga qaraganda chap yarmi */
    side: 'east' as 'east' | 'west',
    /** faqat ishlab chiqarish zonasi tomida (omborlar tomida panel yo‘q) */
    segments: ['production'] as SegmentId[],
    rowPitch: 3.2,
    rowDepth: 2.1,
    tiltDeg: 12,
    status: 'estimated' as ValueStatus,
  },

  /**
   * Oxirgi qism xonalari (x oralig‘i bo‘yicha; xonalar shimoliy koridordan kiriladi).
   * Joylashuv va o‘lchamlar taxminiy — konfiguratsiyada o‘zgartiriladi.
   */
  rearRooms: [
    { id: 'room-canteen', floor: 1, x0: -20, x1: -8, name: 'Oshxona va ovqatlanish zali', type: 'canteen' },
    { id: 'room-lockers', floor: 1, x0: -8, x1: -2, name: 'Kiyinish xonalari', type: 'lockers' },
    { id: 'room-wc', floor: 1, x0: -2, x1: 2, name: 'Sanitariya xonalari (dush, hojatxona)', type: 'wc' },
    { id: 'room-tech', floor: 1, x0: 2, x1: 10, name: 'Texnik xona (elektr shchit, kompressor, isitish)', type: 'tech' },
    { id: 'room-medical', floor: 1, x0: 10, x1: 14, name: 'Tibbiyot xonasi', type: 'medical' },
    { id: 'room-lobby', floor: 1, x0: 14, x1: 20, name: 'Xodimlar kirishi, qorovul va zinapoya', type: 'lobby' },
    { id: 'room-manager', floor: 2, x0: -20, x1: -12, name: 'Ishlab chiqarish rahbari xonasi', type: 'manager' },
    { id: 'room-engineers', floor: 2, x0: -12, x1: -4, name: 'Muhandis-texnologlar xonasi', type: 'office' },
    { id: 'room-meeting', floor: 2, x0: -4, x1: 5, name: 'Yig‘ilishlar zali', type: 'meeting' },
    { id: 'room-lab', floor: 2, x0: 5, x1: 14, name: 'OTK laboratoriyasi', type: 'lab' },
    { id: 'room-hall2', floor: 2, x0: 14, x1: 20, name: 'Zinapoya va hol', type: 'lobby' },
  ] as { id: string; floor: 1 | 2; x0: number; x1: number; name: string; type: string }[],
  /** Xonalar oldidagi koridor kengligi (ishlab chiqarish devori tomonda), m */
  rearCorridorWidth: 1.8,

  /**
   * Masterplandagi asosiy bino yonidagi ikki bino — vazifasi ko‘rsatilmagan, shunchaki bino sifatida
   * (nomsiz, tomi yopiq) ko‘rsatiladi. O‘lchamlar masterplan nisbatlaridan taxminiy.
   */
  neighborBuildings: [
    { id: 'bldg-1', rect: { x0: 24, x1: 64, z0: 27, z1: 68 } as Rect, height: 10 },
    { id: 'bldg-2', rect: { x0: 84, x1: 131, z0: 37, z1: 60 } as Rect, wing: { x0: 84, x1: 100, z0: 33, z1: 37 } as Rect, height: 9 },
  ] as { id: string; rect: Rect; wing?: Rect; height: number }[],

  /** Katta avtomobil yo‘li (masterplanda qizil chiziq bilan belgilangan) */
  road: {
    /** x = 0 da yo‘l o‘qining z koordinatasi */
    centerZAtX0: -66,
    /** Yo‘lning masterplandagi og‘ish burchagi (sharqqa qarab binoga yaqinlashadi), gradus */
    angleDeg: 9.4,
    lanesPerDirection: 2,
    laneWidth: 3.5,
    medianWidth: 1.0,
    sidewalkWidth: 2.5,
    greenStripWidth: 3.5,
    halfLength: 420,
    status: 'estimated' as ValueStatus,
  },

  site: {
    /** Hudud chegarasi (shimoliy chegara yo‘lga parallel, hisoblanadi) */
    westX: -48,
    eastX: 178,
    southZ: 150,
    entryGateX: 8,
    exitGateX: 140,
    gateWidth: 12,
    parking: { x0: 39, x1: 78, z0: -30, z1: -3 } as Rect,
    lawns: [
      { x0: 26, x1: 131, z0: 74, z1: 96 },
      { x0: 26, x1: 58, z0: 100, z1: 124 },
      { x0: 62, x1: 94, z0: 100, z1: 124 },
      { x0: 98, x1: 131, z0: 100, z1: 124 },
    ] as Rect[],
    auxBuildings: [
      { id: 'aux-1', name: 'Yordamchi bino (masterplan bo‘yicha, vazifasi ko‘rsatilmagan)', rect: { x0: 150, x1: 158, z0: 40, z1: 64 }, height: 4.5 },
      { id: 'aux-2', name: 'Yordamchi bino (masterplan bo‘yicha, vazifasi ko‘rsatilmagan)', rect: { x0: 146, x1: 162, z0: 76, z1: 84 }, height: 4 },
      { id: 'aux-3', name: 'Yordamchi bino (masterplan bo‘yicha, vazifasi ko‘rsatilmagan)', rect: { x0: 166, x1: 174, z0: 92, z1: 102 }, height: 4 },
    ],
  },

  brand: {
    /**
     * Rasmiy logotip fayli bo‘lsa, uni public/brand/ ga joylab, yo‘lini shu yerga yozing
     * (masalan '/brand/img-logo.png'). Fayl nisbatlari saqlanadi.
     * Bo‘sh bo‘lsa, reference render asosida qayta chizilgan vaqtinchalik logotip ishlatiladi.
     */
    logoUrl: '' as string,
    primary: '#f39200',
    secondary: '#ffc400',
    dark: '#1d1f22',
  },
};

export type FactoryConfig = typeof factoryConfig;
