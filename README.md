# iMG — MIRROR & GLASS · Shisha zavodining interaktiv 3D raqamli maketi

React + TypeScript + Vite + Three.js (React Three Fiber) asosidagi, brauzerda ishlaydigan professional 3D vizualizatsiya:
asosiy ishlab chiqarish binosi (40 × 125 m), to‘liq shisha old fasad, showroom, 3 ta rolikli darvoza, 40 × 40 m omborlar
maydoni (xomashyo ombori + tayyor mahsulotlar ombori), quyosh panellari, ikki qavatli ma’muriy-maishiy blok xonalari,
katta avtomobil yo‘li, ichki ishlab chiqarish liniyasi, OTK/GPO zonasi, animatsiyalar va CAD uslubidagi o‘lcham chiziqlari.

> Maket — o‘lchamlari va joylashuvi konfiguratsiyadan tahrirlanadigan **konseptual vizualizatsiya**. U ishlab chiqarishga tayyor
> CAD loyiha emas: uskunalar parametrik, ishlab chiqaruvchi chizmalari asosida aniqlashtirilishi kerak.

---

## Imkoniyatlar

| Bo‘lim | Tavsif |
| --- | --- |
| **3D model** | Barcha geometriya haqiqiy metrlarda (1 birlik = 1 m). Segmentlar: old korpus — omborlar maydoni 40 m / 12 m (40 × 40 m, ikkiga bo‘lingan), ishlab chiqarish 75 m / 5 m, oxirgi qism 10 m / 8 m (2 qavat). Jami 125 m. |
| **Omborlar** | Old korpus ichida: o‘ng tomonda (old fasadga qaraganda) xomashyo ombori — A-stellajlar, ko‘prik kran; chap tomonda tayyor mahsulotlar ombori — yashiklar qatorlari. Masterplandagi yon binolar nomsiz, tomi yopiq. |
| **Fasad** | Old fasad (showroom va darvozalar tomoni) to‘liq alyuminiy profilli vitraj (biroz qoraytirilgan, tonirovkali shisha); yon fasadlarda gofrirlangan sendvich-panellar, pilastrlar, lenta derazalar, parapet qoplamalari, suv quvurlari; iMG logotipi. |
| **Tom** | Ishlab chiqarish zonasi tomining yarmida janubga qiyalatilgan quyosh panellari qatorlari, ikkinchi yarmida zenit fonarlari va ventilyatsiya uskunalari. Omborlar tomida panel yo‘q. |
| **Showroom** | 9 × 15 × 9 m to‘liq shishali hajm, old fasadning o‘ng burchagida: ichida A-stendlar, oyna totemlari, shisha paket namunalari, qabul stoyka, yoritgichlar. |
| **Oxirgi qism** | Ishlab chiqarishga qaragan tomoni (ikkala qavat) — to‘liq vitraj, ishlab chiqarish maydoni ko‘rinib turadi; oshxona va ofis xonalari koridorga shisha bo‘linma bilan ochiladi; tashqi derazalar — haqiqiy shisha. 1-qavat: oshxona va ovqatlanish zali, kiyinish va sanitariya xonalari, texnik xona, tibbiyot xonasi, kirish va zinapoya. 2-qavat: ishlab chiqarish rahbari xonasi, muhandis-texnologlar xonasi, yig‘ilishlar zali, OTK laboratoriyasi. Har bir xona jihozlangan va bosilganda ma’lumot beradi. |
| **Darvozalar** | 3 ta alohida rolikli darvoza (relslar, baraban qutisi, yuritma); avtomatik / ochiq / yopiq rejimlar, silliq ochilish animatsiyasi. |
| **Ishlab chiqarish** | U-shaklidagi liniya (old fasadga qaraganda): o‘ng tomonda xomashyo omboridan yuklash stoli → CNC kesish → sindirish → ikki tomonlama chet silliqlash → yuvish-quritish → tayanchlar → germetik → yig‘ish; orqada o‘ngdan chapga uzatish; chap tomonda vakuum pechi → OTK/GPO → qadoqlash → tayyor mahsulotlar ombori. Konveyerlar, aylanuvchi roliklar, harakatlanuvchi shisha panellar. Toblash pechi — ixtiyoriy. |
| **Tashqi hudud** | Masterplanga mos: og‘ma katta yo‘l (2 × 2 bo‘lak, belgilar), yagona kirish-chiqish darvozasi (KPP: kirish va chiqish bo‘laklari, ikki shlagbaum), shisha fasad oldidagi yuklash-tushirish maydoni, avtoturargoh, yashil maydonlar, to‘siq, chiroqlar, daraxtlar. |
| **Transport** | 2 ta yuk mashinasi (forkliftlar yo‘q): ikkalasi ham bitta KPP orqali kiradi va chiqadi. Xomashyo mashinasi maydonda burilib, orqasi bilan 3-darvozaga (xomashyo ombori) biroz kiradi va tushiriladi; tayyor mahsulot mashinasi orqasi bilan 1-darvozaga (tayyor mahsulot ombori) biroz kirib yuklanadi va chiqib ketadi. Tirkama burilishi real hisoblanadi, avtomatik darvozalar tirkama yaqinlashganda ochiladi; yo‘ldagi avtomobillar — to‘qnashmaslik avtomatik test bilan tekshirilgan. |
| **O‘lchamlar** | CAD uslubidagi o‘lcham chiziqlari (chiqarish chiziqlari, 45° belgilar, raqamlar): 40 × 125 m, 12 m, omborlar 40 × 40 m (≈22 + ≈18 m), 75 m / 5 m, 10 m / 8 m, qavatlar, showroom 9 × 15 × 9 m; umumiy va zona o‘lchamlari alohida yoqiladi, 5 m to‘r. Tasdiqlanmagan qiymatlar to‘q sariq rangda va `≈` belgisi bilan. Yozuvlar bir-birining ustiga chiqmaydi va bino orqasida qolganda yashiriladi. |
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
    vehicles/             # yuk mashinalari, avtomobillar
    overlays/             # DimensionLine, o‘lchamlar, zona nomlari, oqim strelkalari, tanlov, yozuvlar boshqaruvchisi
    CameraController.tsx  # silliq kamera o‘tishlari, fokuslash, walkthrough
    AnimationController.tsx
    Lighting.tsx
  ui/                     # Brand, Toolbar, SidePanel (qatlamlar/zonalar/ma’lumot/hisobot), InteractiveInfoPanel, AnimationBar
  test/                   # vitest testlari
```

### Parametrlarni o‘zgartirish

* **O‘lchamlar** — `factoryConfig.ts`: segmentlar uzunligi/balandligi, omborlarni ajratuvchi devor (`frontPartitionX`),
  showroom, darvozalar, quyosh panellari (`solar`), oxirgi qism xonalari (`rearRooms`). Bino geometriyasi, o‘lcham chiziqlari, uskunalar joylashuvi va hisobot avtomatik yangilanadi.
* **Uskunalar** — `equipmentConfig.ts`: stansiya qo‘shish/o‘chirish, `length/width/height`, `gapBefore` (oldidagi konveyer),
  `dwell` (panel to‘xtash vaqti). Konveyerlar va shisha oqimi qayta hisoblanadi.
* **Transport** — `animationConfig.ts`: marshrut nuqtalari, tezliklar, sikl. `npm run test` to‘qnashuv yo‘qligini tekshiradi.
* **GLB modellar** — `public/models/README.md`. Uskunani GLB bilan almashtirish: stansiyaga `modelUrl` qo‘shing.
* **Logotip** — rasmiy faylni `public/brand/` ga qo‘yib, `factoryConfig.brand.logoUrl` ni to‘ldiring (nisbatlar saqlanadi).

---

## Referenslar tahlili va qabul qilingan qarorlar

Chap/o‘ng yo‘nalishlar **old fasadga qarab turgan kuzatuvchi** nuqtai nazaridan berilgan.

1. **Qo‘lda chizilgan reja.** 40 m kenglik, 125 m uzunlik. Old qism (H-12) — 40 × 40 m ombor maydoni, ichki devor bilan ikkiga
   bo‘lingan: “Склад хом.” (xomashyo ombori, o‘ng) va “Гот. продукция” (tayyor mahsulotlar ombori, chap). Old fasadda 3 juft
   chiziq — 3 ta darvoza; showroom 9 × 15 m o‘ng burchakdan oldinga chiqib turadi; o‘rta qism 75 m / 5 m; oxirgi qism 10 m / 8 m.
   Strelkalar U-shaklidagi oqimni ko‘rsatadi: o‘ng tomon bo‘ylab orqaga, orqada o‘ngdan chapga, chap tomon bo‘ylab oldinga.
2. **Fotorealistik render.** Katta shisha old fasad, iliq kulrang gofrirlangan panellar, past qiyalikdagi tom, beton ustunli
   to‘siq, butalar orolchalari, kiparislar, to‘q sariq gradientli iMG logotipi.
3. **Rangli masterplan.** Yo‘l (qizil chiziq) shimolda, sharqqa qarab hududga yaqinlashadi (≈9.4°); asosiy bino old fasadi yo‘lga
   qaragan; yonidagi ikki bino — vazifasi ko‘rsatilmagan oddiy binolar (nomsiz, tomi yopiq); yo‘l va binolar orasida
   daraxtli avtoturargoh; janubda yashil maydonlar; sharqda kichik yordamchi binolar.

### O‘lchamlar hisoboti

**Tasdiqlangan (sahnada aniq):** asosiy bino 40 × 125 m; old qism — omborlar maydoni 40 × 40 m, balandligi 12 m
(xomashyo ombori + tayyor mahsulotlar ombori); ishlab chiqarish zonasi 75 m, 5 m; oxirgi qism 10 m, 8 m, 2 qavat;
showroom 9 × 15 m, balandligi 9 m, o‘ng burchakda; old fasad to‘liq shisha; darvozalar soni 3 ta; xomashyo ombori yon devori yopiq; quyosh panellari faqat ishlab chiqarish zonasi tomining yarmida.

**Aniqlashtirilishi kerak (sahnada `≈` va to‘q sariq rangda):**
* Ikki ombor orasidagi devor joyi (hozir xomashyo ≈22 m, tayyor mahsulot ≈18 m — chizmadan taxminiy).
* Darvozalar o‘lchami (≈4.5 × 5 m) va aniq o‘rni, oxirgi qism qavat balandliklari (≈4 + 4 m) va xonalar o‘lchamlari.
* Quyosh panellari joylashgan yarim (hozir chap yarim) va quvvati.
* Qo‘shni binolar vazifasi va o‘lchamlari, yo‘l o‘qi/kengligi, kirish-chiqish nuqtalari — masterplan nisbatlaridan taxminiy.
* Uskunalar ro‘yxati va o‘lchamlari, vakuumli shisha texnologiyasi tafsilotlari — parametrik, tasdiqlanmagan.

Ilovadagi **“Hisobot”** bo‘limi shu ro‘yxatni va texnik talablar bo‘yicha avtomatik tekshiruv natijalarini ko‘rsatadi.

---

## Test va sifat nazorati

`npm run test` (32 ta test):
* Umumiy uzunlik 125 m = 40 + 75 + 10 m, balandliklar 12 / 5 / 8 m, oxirgi qism 2 qavat, omborlar maydoni 40 × 40 m.
* **3D geometriyaning o‘zi** o‘lchanadi: fasad panellari 40 × 125 m konturda, har bir segment devorining balandligi
  12 / 5 / 8 m, qavatlararo plita, old fasad 40 m bo‘ylab to‘liq shisha, yon devor yopiq, oxirgi qismning ishlab chiqarishga qaragan devori ikkala qavatda shisha, quyosh panellari faqat ishlab chiqarish zonasi tomining yarmida.
* O‘lcham chiziqlari qiymatlari geometriyadan hisoblanadi (40, 125, 12, 40, 75, 10, 5, 8, 9, 15, 9 m).
* Showroom 9 × 15 × 9 m o‘ng tomonda, 3 ta darvoza, oxirgi qismda oshxona, rahbar xonasi, texnik xona.
* Liniya: barcha stansiyalar ishlab chiqarish zonasida, xomashyo tarmog‘i o‘ngda, OTK va qadoqlash chapda, uzatish
  o‘ngdan chapga, jarayon tartibi, shisha panellar bir-biriga tegmaydi.
* Transport: butun sikl bo‘yicha (0.1 s qadam) hech bir transport boshqasi bilan to‘qnashmaydi; yuk mashinalari tirkamasi
  bilan o‘z darvozasiga (xomashyo — 3, tayyor mahsulot — 1) 1–6 m kiradi.

Brauzerdagi vizual tekshiruv (headless Chromium): barcha kamera ko‘rinishlari, ichki maket, sayr, tun / kun botishi,
“Yuqori” sifat (AO), tanlov va info-panel, mobil ekran (390 × 844) — konsolda xatolar va buzilgan resurs havolalari yo‘q.

## Performance

* Statik geometriya material bo‘yicha birlashtirilgan (`GeoBuilder`), daraxtlar, roliklar, panellar, avtomobillar — instancing.
* Teksturalar 256–512 px, protsedural; soya xaritasi sifatga qarab 1K / 2K / 4K.
* Mobil qurilmalarda avtomatik “Past” sifat, `PerformanceMonitor` FPS tushsa sifatni pasaytiradi, `AdaptiveDpr`.
* 3D sahna alohida JS bo‘lagida yuklanadi; xatolik bo‘lsa — ErrorBoundary (oq ekran o‘rniga xabar va “Past sifatda ochish”).
