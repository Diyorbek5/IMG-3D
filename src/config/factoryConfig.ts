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

export type SegmentId = 'front' | 'tbd' | 'production' | 'rear';

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
     * Tartibni o‘zgartirish mumkin — geometriya, o‘lchamlar va uskunalar avtomatik qayta hisoblanadi.
     * Diqqat: 10 + 75 + 10 = 95 m. Qolgan 30 m — "Vazifasi aniqlashtiriladigan zona".
     */
    segments: [
      {
        id: 'front',
        name: 'Old korpus — xomashyo qabul qilish va tayyor mahsulot buferi',
        shortName: 'Old korpus',
        length: 10,
        height: 12,
        floors: 1,
        lengthStatus: 'confirmed',
        heightStatus: 'confirmed',
        purpose:
          'Chizma bo‘yicha: sharqiy qismi — xomashyo (shisha listlari) qabul qilish va saqlash, g‘arbiy qismi — tayyor mahsulot buferi. Old fasadda 3 ta rolikli darvoza joylashgan.',
      },
      {
        id: 'tbd',
        name: 'Vazifasi aniqlashtiriladigan zona — 30 m',
        shortName: 'Aniqlashtiriladigan zona',
        length: 30,
        height: 12,
        floors: 1,
        lengthStatus: 'unconfirmed',
        heightStatus: 'unconfirmed',
        purpose:
          'Umumiy uzunlik (125 m) va ko‘rsatilgan uzunliklar yig‘indisi (95 m) orasidagi farq. Vazifasi tasdiqlanmaguncha bu yerga ishlab chiqarish uskunalari joylashtirilmagan — faqat transport yo‘laklari o‘tadi. Balandligi berilmagan (vaqtincha old korpus bilan teng).',
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
          'Shishani kesish, chetlariga ishlov berish, yuvish-quritish, vakuumli shisha paketini yig‘ish, germetiklash, OTK/GPO sifat nazorati va qadoqlash. Oqim U-shaklida: sharqiy tomon bo‘ylab orqaga, g‘arbiy tomon bo‘ylab oldinga (chizmadagi strelkalar bo‘yicha).',
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
          '1-qavat: xodimlar kirish joyi, kiyinish xonalari, oshxona, texnik xonalar. 2-qavat: ofislar, laboratoriya, yig‘ilishlar zali (xonalar taqsimoti taxminiy).',
      },
    ] as BuildingSegment[],
    wallThickness: 0.25,
    parapetHeight: 0.9,
    /** Oxirgi qismning birinchi qavat balandligi (berilmagan — taxminiy) */
    rearFirstFloorHeight: 4.0,
    rearFirstFloorHeightStatus: 'unconfirmed' as ValueStatus,
    /** Old korpusdagi bo‘luvchi devor (chizmada ko‘rsatilgan) — x koordinatasi */
    frontPartitionX: -2,
    frontPartitionXStatus: 'estimated' as ValueStatus,
    /** Ustunlar qadami (konstruktiv), m */
    bayLength: 6,
  },

  /**
   * Showroom — chizma bo‘yicha old fasadning sharqiy burchagida, binodan tashqariga chiqib turadi.
   * 9 m — fasad bo‘ylab kenglik, 15 m — fasaddan oldinga chiqish (chuqurlik).
   */
  showroom: {
    width: 9,
    depth: 15,
    sizeStatus: 'confirmed' as ValueStatus,
    /** Balandligi berilmagan — sozlanadigan parametr */
    height: 6.5,
    heightStatus: 'unconfirmed' as ValueStatus,
    /** Sharqiy cheti bino burchagi bilan bir chiziqda (x = width/2) */
    alignEastEdge: true,
  },

  /**
   * Shisha burchak: showroomning ikki tashqi fasadi (shimol va sharq) hamda
   * old korpusning shu burchakdagi to‘liq balandlikdagi qismi — butunlay vitraj.
   */
  glassCorner: {
    side: 'east' as 'east' | 'west',
    /** Old korpus fasadining shisha qismi kengligi (burchakdan), m */
    facadeWidth: 9,
    /** Sharqiy yon fasadda shisha qismining uzunligi (old fasaddan), m */
    sideDepth: 10,
    mullionSpacing: 1.5,
    transomSpacing: 2.2,
  },

  /** 3 ta rolikli darvoza (rollstavni) — old fasadda, shisha burchakning g‘arbiy tomonida */
  rollerDoors: {
    /** Soni o‘zgartirilmaydi: 3 ta */
    centersX: [-14, -6, 3],
    centersStatus: 'estimated' as ValueStatus,
    width: 4.5,
    height: 5.0,
    sizeStatus: 'unconfirmed' as ValueStatus,
    names: ['1-darvoza (tayyor mahsulot jo‘natish)', '2-darvoza (tayyor mahsulot jo‘natish)', '3-darvoza (xomashyo qabul qilish)'],
  },

  /** Asosiy bino oldidagi 40 × 40 m tashqi hovli (logistika maydoni) */
  frontYard: {
    width: 40,
    depth: 40,
    status: 'confirmed' as ValueStatus,
  },

  rawWarehouse: {
    id: 'raw-warehouse',
    name: 'Xomashyo ombori',
    rect: { x0: 24, x1: 64, z0: 27, z1: 68 } as Rect,
    height: 10,
    status: 'estimated' as ValueStatus,
    purpose:
      'Float-shisha listlari (jumbo 6000 × 3210 mm) A-shaklidagi stellajlarda saqlanadi. Yuk mashinalari shimoliy fasaddagi darvozalardan tushiriladi, ichki galereya orqali ishlab chiqarish liniyasiga uzatiladi.',
    /** Asosiy bino bilan bog‘lovchi yopiq galereya (taxminiy) */
    gallery: { z0: 42.5, z1: 47.5, height: 5.2 },
  },

  finishedWarehouse: {
    id: 'fg-warehouse',
    name: 'Tayyor mahsulotlar ombori',
    rect: { x0: 84, x1: 131, z0: 37, z1: 60 } as Rect,
    /** Masterplandagi L-shakl: g‘arbiy qismi shimolga ko‘proq chiqadi */
    wing: { x0: 84, x1: 100, z0: 33, z1: 37 } as Rect,
    height: 9,
    status: 'estimated' as ValueStatus,
    purpose:
      'Qadoqlangan vakuumli shisha paketlari yog‘och yashiklarda va metall stellajlarda saqlanadi, buyurtma bo‘yicha yuk mashinalariga yuklanadi.',
  },

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
