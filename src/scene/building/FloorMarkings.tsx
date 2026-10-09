import { useMemo } from 'react';
import * as THREE from 'three';
import { equipmentConfig } from '../../config/equipmentConfig';
import { getSegment, HALF_W } from '../../lib/layout';
import { computeLineLayout, FLOOR_Y } from '../../lib/lineLayout';
import { GeoBuilder } from '../../three/GeoBuilder';
import { hatchTexture, signTexture } from '../../three/textures';
import { Built, Selectable } from '../common/Built';

/**
 * Ichki pol belgilari: forklift yo‘laklari (sariq), piyodalar yo‘laklari (yashil),
 * piyodalar o‘tish joylari va "Vazifasi aniqlashtiriladigan zona" shtrixlash belgisi.
 */
export function FloorMarkings() {
  const tbd = getSegment('tbd');
  const prod = getSegment('production');
  const layout = useMemo(() => computeLineLayout(), []);
  const parts = useMemo(() => {
    const b = new GeoBuilder();
    const y = FLOOR_Y + 0.003;
    const line = (key: 'markingYellow' | 'markingGreen' | 'markingWhite' | 'markingRed', x0: number, z0: number, x1: number, z1: number) =>
      b.boxMinMax(key, x0, y - 0.002, z0, x1, y, z1);
    const lw = 0.12;
    const a = equipmentConfig.aisles;
    const zA0 = tbd.z0 + 0.5;
    const zCentralEnd = layout.transferZ - equipmentConfig.transferWidth / 2 - 2.5;
    // markaziy forklift yo‘lagi
    for (const x of [a.forkliftCentral.x0, a.forkliftCentral.x1]) line('markingYellow', x - lw / 2, zA0, x + lw / 2, zCentralEnd);
    // g‘arbiy forklift yo‘lagi (qadoqlangan mahsulot → old korpus)
    const zWestEnd = layout.packedStaging.z0 - 0.3;
    for (const x of [a.forkliftWest.x0, a.forkliftWest.x1]) line('markingYellow', x - lw / 2, 0.6, x + lw / 2, zWestEnd);
    // piyodalar yo‘laklari
    for (const w of [a.walkwayEast, a.walkwayWest]) {
      line('markingGreen', w.x0, zA0, w.x1, prod.z1 - 1);
    }
    // yo‘nalish strelkalari (markaziy yo‘lakda)
    for (let z = zA0 + 6; z < zCentralEnd - 4; z += 14) {
      line('markingWhite', -0.1, z, 0.1, z + 2.2);
      b.add('markingWhite', new THREE.CylinderGeometry(0.0001, 0.55, 0.002, 3), [0, y - 0.001, z + 2.6], [0, Math.PI, 0], [1, 1, 1.4]);
    }
    // piyodalar o‘tish joyi (zebra) — markaziy yo‘lak kesishmalarida
    for (const z of [prod.z0 + 2, prod.z0 + 30]) {
      for (let x = a.forkliftCentral.x0 + 0.2; x < a.forkliftCentral.x1 - 0.3; x += 0.8) line('markingWhite', x, z, x + 0.45, z + 2.5);
    }
    // TBD zonasi chegarasi (qizil-oq punktir)
    for (let x = -HALF_W + 0.5; x < HALF_W - 0.5; x += 1.6) {
      line('markingRed', x, tbd.z0 + 0.15, x + 0.8, tbd.z0 + 0.3);
      line('markingRed', x, tbd.z1 - 0.3, x + 0.8, tbd.z1 - 0.15);
    }
    return b.build();
  }, [tbd, prod, layout]);

  const w0 = HALF_W * 2 - 1;
  const hatch = useMemo(() => {
    const t = hatchTexture().clone();
    t.repeat.set(w0 / 3, (tbd.length - 0.8) / 3);
    t.needsUpdate = true;
    return t;
  }, [w0, tbd.length]);
  const label = signTexture(`VAZIFASI ANIQLASHTIRILADIGAN ZONA — ${tbd.length} m`, { fg: '#b45309', w: 2048, h: 200, weight: 800 });
  const w = w0;
  return (
    <group name="FloorMarkings">
      <Built parts={parts} castShadow={false} />
      <Selectable id="seg-tbd">
        {/* shtrixlash — aniqlashtiriladigan zona */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR_Y + 0.006, (tbd.z0 + tbd.z1) / 2]} receiveShadow>
          <planeGeometry args={[w, tbd.length - 0.8]} />
          <meshStandardMaterial map={hatch} transparent opacity={0.55} depthWrite={false} polygonOffset polygonOffsetFactor={-3} roughness={0.8} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, Math.PI]} position={[-9.5, FLOOR_Y + 0.008, (tbd.z0 + tbd.z1) / 2]}>
          <planeGeometry args={[16, 1.56]} />
          <meshStandardMaterial map={label} transparent depthWrite={false} polygonOffset polygonOffsetFactor={-4} roughness={0.7} />
        </mesh>
      </Selectable>
    </group>
  );
}
