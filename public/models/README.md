# GLB/GLTF modellar

Blender yoki boshqa dasturda tayyorlangan modellarni shu papkaga joylang (masalan `forklift.glb`).

* Sahnaga qo‘shish: `src/config/externalModels.ts` ro‘yxatiga `{ url: '/models/forklift.glb', position: [x, y, z] }` yozing.
* Parametrik uskunani almashtirish: `src/config/equipmentConfig.ts` dagi stansiyaga `modelUrl: '/models/edger.glb'` qo‘shing — model uskunaning konfiguratsiyadagi o‘lchamlariga moslab joylashtiriladi.
* 1 birlik = 1 metr. Model yuklanmasa, ilova parametrik modelni ko‘rsatishda davom etadi.
