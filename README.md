# iMG — MIRROR & GLASS · Shisha zavodining interaktiv 3D raqamli maketi

React + TypeScript + Vite + Three.js (React Three Fiber) asosidagi, brauzerda ishlaydigan professional 3D vizualizatsiya:
asosiy ishlab chiqarish binosi (40 × 125 m), shisha burchakli showroom, 3 ta rolikli darvoza, xomashyo va tayyor mahsulotlar
omborlari, katta avtomobil yo‘li, tashqi logistika maydoni, ichki ishlab chiqarish liniyasi, OTK/GPO zonasi, animatsiyalar
va CAD uslubidagi o‘lcham chiziqlari.

> Maket — o‘lchamlari va joylashuvi konfiguratsiyadan tahrirlanadigan **konseptual vizualizatsiya**. U ishlab chiqarishga tayyor
> CAD loyiha emas: uskunalar parametrik, ishlab chiqaruvchi chizmalari asosida aniqlashtirilishi kerak.

---

## Imkoniyatlar

| Bo‘lim | Tavsif |
| --- | --- |
| **3D model** | Barcha geometriya haqiqiy metrlarda (1 birlik = 1 m). Segmentlar: old korpus 10 m / 12 m, aniqlashtiriladigan zona 30 m, ishlab chiqarish 75 m / 5 m, oxirgi qism 10 m / 8 m (2 qavat). |
| **Fasad** | Gofrirlangan sendvich-panellar, pilastrlar, alyuminiy profilli vitrajlar, lenta derazalar, parapet qoplamalari, suv quvurlari, darvoza soyabonlari, iMG logotipi. |
| **Showroom** | 9 × 15 m to‘liq shishali hajm (shisha burchak): ichida A-stendlar, oyna totemlari, shisha paket namunalari, qabul stoyka, yoritgichlar. Balandligi sozlanadi. |
| **Darvozalar** | 3 ta alohida rolikli darvoza (relslar, baraban qutisi, yuritma); avtomatik / ochiq / yopiq rejimlar, silliq ochilish animatsiyasi. |
| **Ishlab chiqarish** | U-shaklidagi liniya: yuklash stoli → CNC kesish → sindirish → ikki tomonlama chet silliqlash → yuvish-quritish → tayanchlar → germetik → yig‘ish → vakuum pechi → OTK/GPO → qadoqlash. Konveyerlar, aylanuvchi roliklar, harakatlanuvchi shisha panellar. Toblash pechi — ixtiyoriy (yoqib-o‘chiriladi). |
| **Tashqi hudud** | Masterplanga mos: og‘ma katta yo‘l (2 × 2 bo‘lak, belgilar), kirish (KPP) va alohida chiqish, 40 × 40 m beton hovli, avtoturargoh, yashil maydonlar, to‘siq, chiroqlar, daraxtlar. |
| **Transport** | 2 ta yuk mashinasi (xomashyo / tayyor mahsulot), 5 ta forklift, yo‘ldagi avtomobillar — oldindan belgilangan marshrutlar, to‘qnashmaslik avtomatik test bilan tekshirilgan. |
| **O‘lchamlar** | CAD uslubidagi o‘lcham chiziqlari (chiqarish chiziqlari, 45° belgilar, raqamlar), umumiy va zona o‘lchamlari alohida yoqiladi, 5 m to‘r. Tasdiqlanmagan qiymatlar to‘q sariq rangda va `≈` belgisi bilan. Yozuvlar bir-birining ustiga chiqmaydi va bino orqasida qolganda yashiriladi. |
| **Kamera** | Orbit / zoom / pan, Asosiy, Old fasad, Yon, Orqa, Yuqoridan (masterplan), Izometrik, Ichki maket (kesim), ichki sayr (walkthrough), to‘liq ekran. Barcha o‘tishlar silliq. |
| **Interaktivlik** | Istalgan bino/zona/uskunani bosish → info-panel: vazifasi, o‘lchamlari, jarayondagi o‘rni, keyingi jarayon, parametrlar, “Fokuslash”. |
| **Render** | PBR materiallar, protsedural teksturalar, quyosh + osmon + atrof-muhit refleksiyalari, soyalar, ACES tone mapping. Kunduz / kun botishi / tun. “Yuqori” sifatda N8AO ambient occlusion, real shisha sinishi, 4K soyalar. |

### Klaviatura

`1`–`7` — kamera ko‘rinishlari · `Probel` — pauza/davom · `W` — sayr · `F` — to‘liq ekran · `Esc` — tanlovni bekor qilish.

---

## Ishga tushirish

Talablar: Node.js ≥ 20.19 (22 LTS tavsiya etiladi).

```bash
npm install
npm run dev        # http://localhost:5173
npm run test       # avtomatik testlar (vitest)
npm run build      # TypeScript tekshiruvi + production build → dist/
npm run preview    # build natijasini lokal ko‘rish
```

URL parametrlari: `?q=high|medium|low` — grafika sifatini majburan tanlash (mobil qurilmalarda avtomatik `low`).

## Vercel’ga joylash (deploy)

Loyiha Vercel uchun tayyor (`vercel.json`): build buyrug‘i `npm run build`, chiqish papkasi `dist`, SPA rewrite va
aktivlar uchun uzoq muddatli kesh. API kalitlari yoki pullik xizmatlar ishlatilmaydi — barcha teksturalar brauzerda yaratiladi.

**GitHub orqali (tavsiya):**
1. Repository’ni GitHub’ga push qiling.
2. [vercel.com/new](https://vercel.com/new) → repository’ni import qiling → Framework: **Vite** (avtomatik aniqlanadi).
3. Build Command: `npm run build`, Output Directory: `dist` → **Deploy**.

**Vercel CLI orqali:**
```bash
npm i -g vercel
vercel login
vercel          # preview
vercel --prod   # production
```

---

## Loyiha tuzilishi

```
src/
  config/
    factoryConfig.ts      # bino o‘lchamlari, segmentlar, showroom, darvozalar, omborlar, yo‘l, hudud, brend
    equipmentConfig.ts    # liniya tarmoqlari, stansiyalar (o‘lchamlar, oraliqlar, to‘xtash vaqti), OTK zonasi, yo‘laklar
    animationConfig.ts    # transport marshrutlari va jadvallari
    cameraConfig.ts       # kamera ko‘rinishlari va sayr marshruti
    externalModels.ts     # qo‘shimcha GLB/GLTF modellar
  lib/                    # sof hisob-kitoblar (testlanadi): layout, lineLayout, motion, vehicles, dimensions, validation, entities
  three/                  # GeoBuilder (geometriyalarni birlashtirish), materiallar, protsedural teksturalar
  scene/
    FactoryScene.tsx      # Canvas, postprotsessing, sahna tarkibi
    building/             # FactoryBuilding, FrontFacade, GlassShowroom, RollerShutterDoors, Warehouse (Raw/FinishedGoods), shellBuilders
    equipment/            # ProductionLine, GlassProcessingMachine, machineBuilders, ConveyorSystem, GlassFlow, QualityControlZone
    site/                 # SiteGround, RoadNetwork, Landscape
    vehicles/             # yuk mashinalari, forkliftlar, avtomobillar
    overlays/             # DimensionLine, o‘lchamlar, zona nomlari, oqim strelkalari, tanlov, yozuvlar boshqaruvchisi
    CameraController.tsx  # silliq kamera o‘tishlari, fokuslash, walkthrough
    AnimationController.tsx
    Lighting.tsx
  ui/                     # Brand, Toolbar, SidePanel (qatlamlar/zonalar/ma’lumot/hisobot), InteractiveInfoPanel, AnimationBar
  test/                   # vitest testlari
```

### Parametrlarni o‘zgartirish

* **O‘lchamlar** — `factoryConfig.ts`. Masalan, aniqlashtiriladigan zona vazifasi tasdiqlansa, uning `length`, `height`
  va segmentlar tartibini o‘zgartiring. Bino geometriyasi, o‘lcham chiziqlari, uskunalar joylashuvi va hisobot avtomatik yangilanadi.
* **Uskunalar** — `equipmentConfig.ts`: stansiya qo‘shish/o‘chirish, `length/width/height`, `gapBefore` (oldidagi konveyer),
  `dwell` (panel to‘xtash vaqti). Konveyerlar va shisha oqimi qayta hisoblanadi.
* **Transport** — `animationConfig.ts`: marshrut nuqtalari, tezliklar, sikl. `npm run test` to‘qnashuv yo‘qligini tekshiradi.
* **GLB modellar** — `public/models/README.md`. Uskunani GLB bilan almashtirish: stansiyaga `modelUrl` qo‘shing.
* **Logotip** — rasmiy faylni `public/brand/` ga qo‘yib, `factoryConfig.brand.logoUrl` ni to‘ldiring (nisbatlar saqlanadi).

---

## Referenslar tahlili va qabul qilingan qarorlar

1. **Qo‘lda chizilgan reja.** 40 m kenglik, 125 m uzunlik; old qismda (12 m) “Склад хом.” (xomashyo) va “Гот. продукция”
   (tayyor mahsulot) bo‘limlari va ular orasidagi devor; old fasadda 3 juft chiziq — 3 ta darvoza; showroom 9 × 15 m old-o‘ng
   burchakdan tashqariga chiqib turadi; o‘rta qism 75 m / 5 m; oxirgi qism 10 m / 8 m. Strelkalar U-shaklidagi oqimni ko‘rsatadi
   (o‘ng tomonda orqaga, chap tomonda oldinga) — liniya shu bo‘yicha joylashtirilgan.
2. **Fotorealistik render.** Iliq kulrang gofrirlangan panellar, to‘q rangli profilli katta vitrajlar, past qiyalikdagi tom,
   beton ustunli to‘siq, butalar orolchalari, kiparislar, to‘q sariq gradientli iMG logotipi — materiallar va uslub shundan olingan.
3. **Rangli masterplan.** Yo‘l (qizil chiziq) shimolda, sharqqa qarab hududga yaqinlashadi (≈9.4°); asosiy bino old fasadi yo‘lga
   qaragan; xomashyo ombori asosiy binoning sharqida yonma-yon; L-shakldagi tayyor mahsulotlar ombori undan sharqroqda;
   yo‘l va binolar orasida daraxtli avtoturargoh; janubda yashil maydonlar; sharqda kichik yordamchi binolar.
   Shisha burchak (qizil belgi) — old fasadning sharqiy burchagi.

### O‘lchamlar hisoboti

**Tasdiqlangan (sahnada aniq):** asosiy bino 40 × 125 m; old qism 10 m uzunlik, 12 m balandlik; ishlab chiqarish zonasi
75 m, 5 m; oxirgi qism 10 m, 8 m, 2 qavat; showroom 9 × 15 m; old hovli 40 × 40 m; darvozalar soni 3 ta.

**Aniqlashtirilishi kerak (sahnada `≈` va to‘q sariq rangda):**
* **30 m farq** (125 − 10 − 75 − 10). “Vazifasi aniqlashtiriladigan zona — 30 m” sifatida alohida parametr; uskunalar
  joylashtirilmagan. Joylashuvi (hozir old korpus orqasida) va balandligi (hozir ≈12 m) taxminiy.
  *Eslatma:* chizmadagi old qism uzunligi “10” yoki “40” deb o‘qilishi mumkin — “40” bo‘lsa, farq yo‘qoladi.
* Showroom balandligi (≈6.5 m), darvozalar o‘lchami (≈4.5 × 5 m) va aniq o‘rni, oxirgi qism qavat balandliklari (≈4 + 4 m).
* Omborlar o‘lchamlari va balandligi, yo‘l o‘qi/kengligi, kirish-chiqish nuqtalari — masterplan nisbatlaridan taxminiy.
* Uskunalar ro‘yxati va o‘lchamlari, vakuumli shisha texnologiyasi tafsilotlari (germetik turi, vakuum darajasi, toblash
  pechi zarurati) — parametrik, tasdiqlanmagan.

Ilovadagi **“Hisobot”** bo‘limi shu ro‘yxatni va texnik talablar bo‘yicha avtomatik tekshiruv natijalarini ko‘rsatadi.

---

## Test va sifat nazorati

`npm run test` (29 ta test):
* Umumiy uzunlik 125 m, segmentlar 10 / 30 / 75 / 10 m, balandliklar 12 / 5 / 8 m, oxirgi qism 2 qavat.
* **3D geometriyaning o‘zi** o‘lchanadi: fasad panellari 40 × 125 m konturda, har bir segment devorining balandligi
  12 / 12 / 5 / 8 m, qavatlararo plita, shisha burchak vitraji.
* O‘lcham chiziqlari qiymatlari geometriyadan hisoblanadi (40, 125, 12, 40 × 40, 10, 30, 75, 10, 5, 8, 9, 15 m).
* Showroom 9 × 15 m, 3 ta darvoza, hovli binodan alohida, omborlar alohida obyektlar.
* Liniya: barcha stansiyalar ishlab chiqarish zonasida, aniqlashtiriladigan zonada uskuna yo‘q, jarayon tartibi,
  OTK zonasi nazorat stansiyalarini qamraydi, shisha panellar bir-biriga tegmaydi.
* Transport: butun sikl bo‘yicha (0.1 s qadam) hech bir transport boshqasi bilan to‘qnashmaydi.

Brauzerdagi vizual tekshiruv (headless Chromium): barcha kamera ko‘rinishlari, ichki maket, sayr, tun / kun botishi,
“Yuqori” sifat (AO), tanlov va info-panel, mobil ekran (390 × 844) — konsolda xatolar va buzilgan resurs havolalari yo‘q.

## Performance

* Statik geometriya material bo‘yicha birlashtirilgan (`GeoBuilder`), daraxtlar, roliklar, panellar, avtomobillar — instancing.
* Teksturalar 256–512 px, protsedural; soya xaritasi sifatga qarab 1K / 2K / 4K.
* Mobil qurilmalarda avtomatik “Past” sifat, `PerformanceMonitor` FPS tushsa sifatni pasaytiradi, `AdaptiveDpr`.
* 3D sahna alohida JS bo‘lagida yuklanadi; xatolik bo‘lsa — ErrorBoundary (oq ekran o‘rniga xabar va “Past sifatda ochish”).
