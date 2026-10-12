/**
 * Oyna zavodining shtat jadvali (taklif): bo‘limlar, lavozimlar va har bir lavozimdagi xodimlar soni.
 * Ism-familiyalar yo‘q — faqat lavozim va soni. Ishlab chiqarish 2 smenada ishlaydi.
 * `place` — maketdagi ish joyi (obyekt id), "Xodimlar" bo‘limida bosilganda kamera shu joyga boradi.
 * Sonlarni shu faylda o‘zgartirish kifoya — jami va bo‘limlar bo‘yicha hisob avtomatik yangilanadi.
 */
export interface StaffPosition {
  title: string;
  count: number;
  note?: string;
  place?: string;
}

export interface StaffDepartment {
  id: string;
  name: string;
  positions: StaffPosition[];
}

export const staffConfig: { title: string; minTotal: number; shifts: number; departments: StaffDepartment[] } = {
  title: 'iMG — oyna zavodi xodimlari shtati',
  /** Zavod kamida shuncha xodimga mo‘ljallangan */
  minTotal: 100,
  shifts: 2,
  departments: [
    {
      id: 'management',
      name: 'Rahbariyat',
      positions: [
        { title: 'Direktor (CEO)', count: 1 },
        { title: 'Ishlab chiqarish direktori', count: 1, place: 'room-manager' },
        { title: 'Tijorat direktori', count: 1 },
        { title: 'Bosh muhandis', count: 1, place: 'room-engineers' },
        { title: 'Direktor yordamchisi (ofis-menejer)', count: 1 },
      ],
    },
    {
      id: 'sales',
      name: 'Sotuv bo‘limi',
      positions: [
        { title: 'Sotuv bo‘limi rahbari (ROP)', count: 1 },
        { title: 'Sotuv menejeri (dilerlar va ulgurji)', count: 3 },
        { title: 'Loyihalar bo‘yicha menejer (B2B, fasadlar)', count: 2 },
        { title: 'Showroom konsultanti', count: 2, place: 'showroom' },
        { title: 'Call-markaz operatori', count: 2 },
      ],
    },
    {
      id: 'production',
      name: 'Ishlab chiqarish va liniyalar',
      positions: [
        { title: 'Ishlab chiqarish boshlig‘i', count: 1, place: 'room-manager' },
        { title: 'Smena boshlig‘i (master)', count: 2, note: '1 nafar / smena' },
        { title: 'Texnolog', count: 2, place: 'room-engineers' },
        { title: 'Shisha listlarini yuklash operatori', count: 2, note: '1 nafar / smena', place: 'loader' },
        { title: 'Kesish stoli (CNC) operatori', count: 2, note: '1 nafar / smena', place: 'cutting' },
        { title: 'Sindirish (bo‘laklash) ishchisi', count: 2, note: '1 nafar / smena', place: 'breakout' },
        { title: 'Chet silliqlash stanogi operatori', count: 2, note: '1 nafar / smena', place: 'edger' },
        { title: 'Yuvish-quritish mashinasi operatori', count: 2, note: '1 nafar / smena', place: 'washer' },
        { title: 'Tayanch ustunchalar stansiyasi operatori', count: 2, note: '1 nafar / smena', place: 'pillar' },
        { title: 'Germetik surtish operatori', count: 2, note: '1 nafar / smena', place: 'sealer' },
        { title: 'Paket yig‘ish operatori', count: 4, note: '2 nafar / smena', place: 'assembly' },
        { title: 'Vakuumlash pechi operatori', count: 2, note: '1 nafar / smena', place: 'vacuum' },
        { title: 'Toblash pechi operatori', count: 2, note: '1 nafar / smena (ixtiyoriy uskuna)', place: 'tempering' },
        { title: 'Qadoqlash ishchisi', count: 4, note: '2 nafar / smena', place: 'packing' },
        { title: 'Liniya yordamchi ishchisi (tashish, chiqindi)', count: 4, note: '2 nafar / smena' },
      ],
    },
    {
      id: 'maintenance',
      name: 'Texnik xizmat va energetika',
      positions: [
        { title: 'Bosh mexanik', count: 1 },
        { title: 'Bosh energetik', count: 1, place: 'room-tech' },
        { title: 'Ta’mirlovchi mexanik (chilangar)', count: 3 },
        { title: 'Elektrik', count: 2, place: 'room-tech' },
        { title: 'Avtomatika (KIPiA) va CNC sozlovchisi', count: 1 },
      ],
    },
    {
      id: 'hr',
      name: 'HR (xodimlar bo‘limi)',
      positions: [
        { title: 'HR rahbari', count: 1 },
        { title: 'HR-mutaxassis (yollash va o‘qitish)', count: 1 },
        { title: 'Kadrlar inspektori', count: 1 },
      ],
    },
    {
      id: 'marketing',
      name: 'Marketing',
      positions: [
        { title: 'Marketing rahbari', count: 1 },
        { title: 'SMM va kontent mutaxassisi', count: 1 },
        { title: 'Grafik dizayner', count: 1 },
      ],
    },
    {
      id: 'it',
      name: 'IT bo‘limi',
      positions: [
        { title: 'IT rahbari', count: 1 },
        { title: 'Tizim administratori', count: 1 },
        { title: '1C / ERP dasturchisi', count: 1 },
      ],
    },
    {
      id: 'qc',
      name: 'Sifat nazorati (OTK / GPO)',
      positions: [
        { title: 'OTK boshlig‘i', count: 1, place: 'qc-zone' },
        { title: 'OTK nazoratchisi (vizual nazorat)', count: 4, note: '2 nafar / smena', place: 'inspection' },
        { title: 'Vakuum va o‘lcham nazorati operatori', count: 2, note: '1 nafar / smena', place: 'testing' },
        { title: 'Laborant (OTK laboratoriyasi)', count: 2, place: 'room-lab' },
      ],
    },
    {
      id: 'logistics',
      name: 'Logistika va omborlar',
      positions: [
        { title: 'Logistika rahbari', count: 1 },
        { title: 'Transport dispetcheri', count: 1, place: 'site-gate' },
        { title: 'Xomashyo ombori mudiri', count: 1, place: 'raw-buffer' },
        { title: 'Tayyor mahsulotlar ombori mudiri', count: 1, place: 'fg-buffer' },
        { title: 'Omborchi-yuklovchi', count: 4, note: '2 nafar / smena' },
        { title: 'Yuk mashinasi haydovchisi', count: 3 },
      ],
    },
    {
      id: 'supply',
      name: 'Ta’minot (xarid)',
      positions: [
        { title: 'Ta’minot bo‘limi boshlig‘i', count: 1 },
        { title: 'Xarid menejeri', count: 2 },
      ],
    },
    {
      id: 'finance',
      name: 'Moliya va buxgalteriya',
      positions: [
        { title: 'Bosh buxgalter', count: 1 },
        { title: 'Buxgalter', count: 2 },
        { title: 'Iqtisodchi', count: 1 },
      ],
    },
    {
      id: 'facility',
      name: 'Ma’muriy-xo‘jalik bo‘limi',
      positions: [
        { title: 'Xo‘jalik mudiri', count: 1 },
        { title: 'Farrosh (tozalovchi)', count: 4 },
        { title: 'Hudud va obodonlashtirish xodimi', count: 1 },
        { title: 'Qorovul (KPP)', count: 4, note: 'navbatchilik, 24/7', place: 'site-gate' },
      ],
    },
    {
      id: 'canteen',
      name: 'Oshxona',
      positions: [
        { title: 'Bosh oshpaz', count: 1, place: 'room-canteen' },
        { title: 'Oshpaz', count: 2, place: 'room-canteen' },
        { title: 'Oshpaz yordamchisi', count: 2, place: 'room-canteen' },
        { title: 'Idish yuvuvchi', count: 1, place: 'room-canteen' },
      ],
    },
    {
      id: 'safety',
      name: 'Mehnat muhofazasi va tibbiyot',
      positions: [
        { title: 'Mehnat muhofazasi muhandisi', count: 1 },
        { title: 'Hamshira (tibbiyot xonasi)', count: 1, place: 'room-medical' },
      ],
    },
  ],
};

export const departmentTotal = (d: StaffDepartment) => d.positions.reduce((a, p) => a + p.count, 0);
export const staffTotal = (cfg = staffConfig) => cfg.departments.reduce((a, d) => a + departmentTotal(d), 0);
export const positionCount = (cfg = staffConfig) => cfg.departments.reduce((a, d) => a + d.positions.length, 0);
