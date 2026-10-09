import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { equipmentConfig } from '../../config/equipmentConfig';
import { FLOOR_Y, WORK_H, type ConveyorSeg } from '../../lib/lineLayout';
import { GeoBuilder } from '../../three/GeoBuilder';
import { getMaterials } from '../../three/materials';
import { simClock, useStore } from '../../state/store';
import { Built } from '../common/Built';

/**
 * Rolikli konveyerlar: ramalar birlashtirilgan geometriya, roliklar — bitta InstancedMesh.
 * Roliklar aylanishi animatsiya soatiga bog‘liq (pauzada to‘xtaydi).
 */
export function ConveyorSystem({ conveyors }: { conveyors: ConveyorSeg[] }) {
  const pitch = equipmentConfig.rollerPitch;
  const { frame, rollers } = useMemo(() => {
    const b = new GeoBuilder();
    const rollers: { x: number; z: number; len: number; axis: 'x' | 'z' }[] = [];
    const y = FLOOR_Y + WORK_H;
    for (const c of conveyors) {
      const along = c.axis === 'z' ? 1 : 0;
      const a0 = along ? Math.min(c.a[1], c.b[1]) : Math.min(c.a[0], c.b[0]);
      const a1 = along ? Math.max(c.a[1], c.b[1]) : Math.max(c.a[0], c.b[0]);
      const len = a1 - a0;
      const mid = (a0 + a1) / 2;
      const cross = along ? c.a[0] : c.a[1];
      const hw = c.width / 2;
      const P = (alongV: number, crossV: number, yy: number): [number, number, number] =>
        along ? [crossV, yy, alongV] : [alongV, yy, crossV];
      const S = (alongL: number, crossL: number, h: number): [number, number, number] => (along ? [crossL, h, alongL] : [alongL, h, crossL]);
      // yon profillar
      for (const s of [-1, 1]) {
        b.box('steel', P(mid, cross + s * (hw + 0.05), y - 0.06), S(len, 0.1, 0.16));
        b.box('paintOrange', P(mid, cross + s * (hw + 0.105), y - 0.06), S(len, 0.01, 0.05));
      }
      // tayanch oyoqlar
      const n = Math.max(2, Math.ceil(len / 1.5) + 1);
      for (let i = 0; i < n; i++) {
        const a = a0 + 0.1 + ((len - 0.2) * i) / (n - 1);
        for (const s of [-1, 1]) b.box('steel', P(a, cross + s * (hw - 0.05), FLOOR_Y + (WORK_H - 0.1) / 2), S(0.08, 0.08, WORK_H - 0.1));
        b.box('steel', P(a, cross, FLOOR_Y + 0.25), S(0.06, c.width - 0.1, 0.06));
      }
      // roliklar
      for (let a = a0 + pitch / 2; a < a1; a += pitch) {
        const p = P(a, cross, y);
        rollers.push({ x: p[0], z: p[2], len: c.width - 0.06, axis: along ? 'x' : 'z' });
      }
    }
    return { frame: b.build(), rollers };
  }, [conveyors, pitch]);

  const inst = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => new THREE.CylinderGeometry(0.045, 0.045, 1, 10), []);
  useEffect(() => () => geo.dispose(), [geo]);
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), e: new THREE.Euler(), p: new THREE.Vector3(), s: new THREE.Vector3() }), []);

  const update = (angle: number) => {
    const im = inst.current;
    if (!im) return;
    const y = FLOOR_Y + WORK_H;
    rollers.forEach((r, i) => {
      // silindr o‘qi y → x yoki z ga buriladi, keyin o‘z o‘qi atrofida aylanadi
      if (r.axis === 'x') tmp.e.set(angle, 0, Math.PI / 2, 'XYZ');
      else tmp.e.set(Math.PI / 2, angle, 0, 'XYZ');
      tmp.q.setFromEuler(tmp.e);
      tmp.p.set(r.x, y, r.z);
      tmp.s.set(1, r.len, 1);
      tmp.m.compose(tmp.p, tmp.q, tmp.s);
      im.setMatrixAt(i, tmp.m);
    });
    im.instanceMatrix.needsUpdate = true;
  };
  useEffect(() => update(0));

  const last = useRef(-1);
  useFrame(() => {
    if (useStore.getState().play !== 'playing') return;
    const angle = (simClock.t * equipmentConfig.conveyorSpeed) / 0.045;
    if (Math.abs(angle - last.current) < 0.01) return;
    last.current = angle;
    update(angle);
  });

  return (
    <group name="ConveyorSystem">
      <Built parts={frame} />
      <instancedMesh ref={inst} args={[geo, getMaterials().chrome, rollers.length]} castShadow receiveShadow frustumCulled={false} />
    </group>
  );
}
