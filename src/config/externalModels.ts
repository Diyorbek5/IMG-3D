/**
 * Qo‘shimcha GLB/GLTF modellar (ixtiyoriy).
 * 1) Modelni public/models/ papkasiga joylang (masalan public/models/forklift.glb).
 * 2) Quyidagi ro‘yxatga yozing. Koordinatalar metrda, sahna koordinatalar tizimida.
 * Uskunani GLB bilan almashtirish uchun equipmentConfig.ts dagi stansiyaga `modelUrl` yozing.
 *
 * Misol:
 *   { url: '/models/forklift.glb', position: [10, 0.15, 30], rotationY: Math.PI / 2, scale: 1 }
 */
export const externalModels: { url: string; position: [number, number, number]; rotationY?: number; scale?: number }[] = [];
