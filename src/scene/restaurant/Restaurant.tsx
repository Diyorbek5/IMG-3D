import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { RESTAURANT_ID } from '../../lib/restaurant';
import { useStore } from '../../state/store';
import { getMaterials } from '../../three/materials';
import { carpetTexture, lyaganTexture, suzaniTexture } from '../../three/textures';
import { Built, Selectable } from '../common/Built';
import { buildRestaurant, type Decal } from './restaurantBuilders';

const TEX: Record<Decal['kind'], () => THREE.Texture> = {
  carpet: () => carpetTexture(0),
  carpet2: () => carpetTexture(1),
  carpet3: () => carpetTexture(2),
  suzani: () => suzaniTexture(),
  lyagan: () => lyaganTexture(0),
  lyagan2: () => lyaganTexture(1),
};

/** Bir xil teksturali bezak tekisliklari (gilam, so‘zana, lagan) — bitta instanced draw call */
function DecalSet({ kind, items }: { kind: Decal['kind']; items: Decal[] }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const round = kind.startsWith('lyagan');
  const geo = useMemo(() => (round ? new THREE.CircleGeometry(0.5, 32) : new THREE.PlaneGeometry(1, 1)), [round]);
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: TEX[kind](),
        roughness: round ? 0.35 : 0.95,
        transparent: round,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      }),
    [kind, round],
  );
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    items.forEach((d, i) => {
      o.position.set(...d.pos);
      o.rotation.set(...d.rot);
      o.scale.set(d.w, d.h, 1);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [items]);
  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
    },
    [geo, mat],
  );
  return <instancedMesh ref={ref} args={[geo, mat, items.length]} receiveShadow />;
}

/** Fasadni pastdan yorituvchi chiroqlar izi (kechqurun ko‘rinadi; material yorug‘lik rejimi bilan boshqariladi) */
function Uplights({ items }: { items: { pos: [number, number, number]; w: number; h: number; rotY: number }[] }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
  const mat = getMaterials().uplight;
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    items.forEach((d, i) => {
      o.position.set(...d.pos);
      o.rotation.set(0, d.rotY, 0);
      o.scale.set(d.w, d.h, 1);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [items]);
  useEffect(() => () => geo.dispose(), [geo]);
  return <instancedMesh ref={ref} args={[geo, mat, items.length]} renderOrder={3} frustumCulled={false} />;
}

/**
 * Restoran — zavod yonidagi to‘rtburchak bino (masterplandagi 1-qo‘shni bino o‘rnida).
 * Klassik krem fasad, arkali derazalar, frontonli pavilonlar va portik; ichida milliy uslubdagi
 * asosiy zal va bar (1-qavat), ikki VIP zal va to‘rtta VIP xona (2-qavat).
 */
export function Restaurant() {
  const parts = useMemo(() => buildRestaurant(), []);
  const roofs = useStore((s) => s.layers.roofs);
  const upperFloor = useStore((s) => s.layers.upperFloor);
  // "Past" sifatda ichki jihozlar soya tashlamaydi
  const shadows = useStore((s) => s.quality !== 'low');
  const groups = useMemo(() => {
    const m = new Map<Decal['kind'], Decal[]>();
    for (const d of parts.decals) if (upperFloor || !d.upper) m.set(d.kind, [...(m.get(d.kind) ?? []), d]);
    return [...m.entries()];
  }, [parts, upperFloor]);
  return (
    <Selectable id={RESTAURANT_ID}>
      <group name="Restaurant">
        <Built parts={parts.shell} />
        <Built parts={parts.inner} castShadow={shadows} />
        <Built parts={parts.glass} castShadow={false} />
        {/* "2-qavat" qatlami o‘chirilsa 1-qavat shiftidan yuqorisi (devorlar, VIP zallar, tom) yashiriladi */}
        {upperFloor && (
          <>
            <Built parts={parts.upper} castShadow={shadows} dispose={false} />
            <Built parts={parts.upperGlass} castShadow={false} dispose={false} />
            <Uplights items={parts.uplights} />
          </>
        )}
        {roofs && upperFloor && <Built parts={parts.roof} dispose={false} />}
        {groups.map(([k, items]) => (
          <DecalSet key={`${k}-${items.length}`} kind={k} items={items} />
        ))}
      </group>
    </Selectable>
  );
}
