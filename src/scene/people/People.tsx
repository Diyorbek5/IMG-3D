import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { buildPeople, samplePerson, type PersonDef } from '../../lib/people';
import { simClock, useStore } from '../../state/store';
import { buildHuman, createSkeleton } from './humanGeometry';
import { applyPose } from './pose';

let material: THREE.MeshStandardMaterial | null = null;
/** Barcha odamlar uchun bitta material (ranglar vertex rangida) */
const humanMaterial = () => (material ??= new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.72, metalness: 0.02, envMapIntensity: 0.6 }));

function Person({ def, shadows }: { def: PersonDef; shadows: boolean }) {
  const group = useRef<THREE.Group>(null);
  const rig = useMemo(() => {
    const asset = buildHuman(def.look);
    const { bones, skeleton } = createSkeleton(asset);
    const mesh = new THREE.SkinnedMesh(asset.geometry, humanMaterial());
    mesh.add(bones[0]);
    mesh.bind(skeleton);
    mesh.receiveShadow = true;
    // poza o‘zgarsa ham kadrdan chiqib ketmasligi uchun kengroq chegara sferasi
    mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.9, 0.2), 1.4);
    mesh.name = def.role;
    return { mesh, bones, rest: asset.restLocal, scale: asset.scale };
  }, [def]);
  useEffect(() => {
    rig.mesh.castShadow = shadows;
  }, [rig, shadows]);
  useEffect(
    () => () => {
      rig.mesh.geometry.dispose();
      rig.mesh.skeleton.dispose();
    },
    [rig],
  );
  const seed = Number(def.id.slice(1)) || 1;
  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const s = samplePerson(def, simClock.t);
    g.position.set(s.x, def.y, s.z);
    g.rotation.y = s.yaw;
    applyPose(rig.bones, rig.rest, rig.scale, s, seed, { tablet: def.look.tablet });
  });
  return (
    <group ref={group}>
      <primitive object={rig.mesh} />
    </group>
  );
}

/** Ishlab chiqarish, omborlar, oshxona, xonalar, showroom va hududdagi xodimlar va mehmonlar */
export function People() {
  const visible = useStore((s) => s.layers.people);
  const upperFloor = useStore((s) => s.layers.upperFloor);
  // "Past" sifatda odamlar soya tashlamaydi (mobil qurilmalar uchun)
  const shadows = useStore((s) => s.quality !== 'low');
  const people = useMemo(() => buildPeople(), []);
  if (!visible) return null;
  return (
    <group name="People">
      {people
        .filter((p) => upperFloor || !p.upper)
        .map((p) => (
          <Person key={p.id} def={p} shadows={shadows} />
        ))}
    </group>
  );
}
