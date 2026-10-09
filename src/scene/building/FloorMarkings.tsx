import { useMemo } from 'react';
import * as THREE from 'three';
import { equipmentConfig } from '../../config/equipmentConfig';
import { factoryConfig } from '../../config/factoryConfig';
import { getSegment, HALF_W, rollerDoors } from '../../lib/layout';
import { computeLineLayout, FLOOR_Y } from '../../lib/lineLayout';
import { GeoBuilder } from '../../three/GeoBuilder';
import { signTexture } from '../../three/textures';
import { Built } from '../common/Built';

/**
 * Ichki pol belgilari: forklift yo‘laklari (sariq), piyodalar yo‘laklari (yashil),
 * piyodalar o‘tish joylari, darvozalar oldidagi yo‘laklar va omborlar nomlari.
 */
export function FloorMarkings() {
  const front = getSegment('front');
  const prod = getSegment('production');
  const layout = useMemo(() => computeLineLayout(), []);
  const parts = useMemo(() => {
    const b = new GeoBuilder();
    const y = FLOOR_Y + 0.003;
    const line = (key: 'markingYellow' | 'markingGreen' | 'markingWhite' | 'markingRed', x0: number, z0: number, x1: number, z1: number) =>
      b.boxMinMax(key, x0, y - 0.002, z0, x1, y, z1);
    const lw = 0.12;
    const a = equipmentConfig.aisles;
    const zCentralEnd = layout.transferZ - equipmentConfig.transferWidth / 2 - 2.5;
    // markaziy forklift yo‘lagi (ishlab chiqarish zonasi bo‘ylab)
    for (const x of [a.forkliftCentral.x0, a.forkliftCentral.x1]) line('markingYellow', x - lw / 2, prod.z0 + 0.5, x + lw / 2, zCentralEnd);
    // xomashyo ombori → yuklash stoli
    for (const x of [a.forkliftRaw.x0, a.forkliftRaw.x1]) line('markingYellow', x - lw / 2, front.z1 - 20, x + lw / 2, prod.z0 + 0.6);
    // qadoqlangan mahsulot → tayyor mahsulotlar ombori
    for (const x of [a.forkliftFinished.x0, a.forkliftFinished.x1]) line('markingYellow', x - lw / 2, front.z1 - 8, x + lw / 2, layout.packedStaging.z0 - 0.3);
    // darvozalardan kirish yo‘laklari
    for (const d of rollerDoors()) {
      for (const sx of [-1, 1]) line('markingYellow', d.cx + sx * (d.width / 2 + 0.1) - lw / 2, 0.4, d.cx + sx * (d.width / 2 + 0.1) + lw / 2, 9);
      line('markingYellow', d.cx - d.width / 2 - 0.1, 9, d.cx + d.width / 2 + 0.1, 9 + lw);
    }
    // piyodalar yo‘laklari
    for (const w of [a.walkwayEast, a.walkwayWest]) line('markingGreen', w.x0, prod.z0 + 0.5, w.x1, prod.z1 - 1);
    // yo‘nalish strelkalari (markaziy yo‘lakda)
    for (let z = prod.z0 + 6; z < zCentralEnd - 4; z += 14) {
      line('markingWhite', -0.1, z, 0.1, z + 2.2);
      b.add('markingWhite', new THREE.CylinderGeometry(0.0001, 0.55, 0.002, 3), [0, y - 0.001, z + 2.6], [0, Math.PI, 0], [1, 1, 1.4]);
    }
    // piyodalar o‘tish joyi (zebra)
    for (const z of [prod.z0 + 2, prod.z0 + 30]) {
      for (let x = a.forkliftCentral.x0 + 0.2; x < a.forkliftCentral.x1 - 0.3; x += 0.8) line('markingWhite', x, z, x + 0.45, z + 2.5);
    }
    // omborlar va ishlab chiqarish chegarasi (qizil punktir)
    for (let x = -HALF_W + 0.5; x < HALF_W - 0.5; x += 1.6) line('markingRed', x, front.z1 - 0.3, x + 0.8, front.z1 - 0.15);
    return b.build();
  }, [front, prod, layout]);

  const px = factoryConfig.building.frontPartitionX;
  const rawLabel = signTexture('XOMASHYO OMBORI', { fg: '#c27803', w: 1024, h: 140, weight: 800 });
  const fgLabel = signTexture('TAYYOR MAHSULOTLAR OMBORI', { fg: '#1f7a46', w: 1600, h: 140, weight: 800 });
  return (
    <group name="FloorMarkings">
      <Built parts={parts} castShadow={false} />
      {/* omborlar nomi polda (old fasad tomondan o‘qiladi) */}
      <mesh rotation={[-Math.PI / 2, 0, Math.PI]} position={[(-HALF_W + px) / 2, FLOOR_Y + 0.008, front.z1 - 13]}>
        <planeGeometry args={[12, 1.64]} />
        <meshStandardMaterial map={rawLabel} transparent depthWrite={false} polygonOffset polygonOffsetFactor={-4} roughness={0.7} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, Math.PI]} position={[(HALF_W + px) / 2, FLOOR_Y + 0.008, front.z1 - 13]}>
        <planeGeometry args={[14, 1.22]} />
        <meshStandardMaterial map={fgLabel} transparent depthWrite={false} polygonOffset polygonOffsetFactor={-4} roughness={0.7} />
      </mesh>
    </group>
  );
}
