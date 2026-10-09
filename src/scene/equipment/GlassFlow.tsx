import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { equipmentConfig } from '../../config/equipmentConfig';
import { FLOOR_Y, panelDistanceFn, WORK_H, type LineLayout } from '../../lib/lineLayout';
import { getMaterials } from '../../three/materials';
import { simClock } from '../../state/store';

/**
 * Shisha panellar oqimi: katta (jumbo) list → kesilgan bo‘lak → yig‘ilgan paket.
 * Barcha panellar bitta jadval bo‘yicha harakatlanadi (spawnInterval ga siljigan) —
 * bu ular orasidagi masofa doimo saqlanishini kafolatlaydi.
 */
export function GlassFlow({ layout }: { layout: LineLayout }) {
  const fn = useMemo(() => panelDistanceFn(layout), [layout]);
  const T = equipmentConfig.spawnInterval;
  const count = Math.ceil(fn.duration / T) + 1;
  const jumbo = useRef<THREE.InstancedMesh>(null);
  const piece = useRef<THREE.InstancedMesh>(null);
  const edge = useRef<THREE.InstancedMesh>(null);
  const geos = useMemo(
    () => ({
      jumbo: new THREE.BoxGeometry(6.0, 0.012, 3.21),
      piece: new THREE.BoxGeometry(2.0, 1, 1.4),
      edge: new THREE.BoxGeometry(2.02, 1, 1.42),
    }),
    [],
  );
  useEffect(() => () => Object.values(geos).forEach((g) => g.dispose()), [geos]);
  const edgeMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2b2f33', roughness: 0.6, metalness: 0.4 }), []);
  useEffect(() => () => edgeMat.dispose(), [edgeMat]);

  const m = useMemo(() => new THREE.Matrix4(), []);
  const zero = useMemo(() => new THREE.Matrix4().makeScale(0, 0, 0), []);
  const p = useMemo(() => new THREE.Vector3(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const sc = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    const t = simClock.t;
    const base = ((t % T) + T) % T;
    const y = FLOOR_Y + WORK_H + 0.07;
    for (let k = 0; k < count; k++) {
      const age = base + k * T;
      const visible = age <= fn.duration && t - age >= -1e-6;
      const s = visible ? fn.distanceAt(age) : 0;
      const pose = layout.path.poseAt(s);
      const isJumbo = visible && s < layout.sCutDone;
      const isPiece = visible && !isJumbo && s < layout.sPacked;
      const assembled = s >= layout.sAssembled;
      p.set(pose.x, y, pose.z);
      if (isJumbo) {
        sc.set(1, 1, 1);
        m.compose(p, q, sc);
        jumbo.current?.setMatrixAt(k, m);
      } else jumbo.current?.setMatrixAt(k, zero);
      if (isPiece) {
        const th = assembled ? 0.034 : 0.012;
        p.y = y + th / 2;
        sc.set(1, th, 1);
        m.compose(p, q, sc);
        piece.current?.setMatrixAt(k, m);
        if (assembled) {
          // paket cheti (germetik chizig‘i)
          sc.set(1, th * 0.7, 1);
          m.compose(p, q, sc);
          edge.current?.setMatrixAt(k, m);
        } else edge.current?.setMatrixAt(k, zero);
      } else {
        piece.current?.setMatrixAt(k, zero);
        edge.current?.setMatrixAt(k, zero);
      }
    }
    for (const r of [jumbo, piece, edge]) if (r.current) r.current.instanceMatrix.needsUpdate = true;
  });

  const glassMat = getMaterials().glassSheet;
  return (
    <group name="GlassFlow">
      <instancedMesh ref={jumbo} args={[geos.jumbo, glassMat, count]} frustumCulled={false} renderOrder={3} />
      <instancedMesh ref={piece} args={[geos.piece, glassMat, count]} frustumCulled={false} renderOrder={3} />
      <instancedMesh ref={edge} args={[geos.edge, edgeMat, count]} frustumCulled={false} castShadow />
    </group>
  );
}
