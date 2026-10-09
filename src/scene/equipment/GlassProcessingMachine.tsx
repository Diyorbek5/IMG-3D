import { Component, Suspense, useMemo, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import type { MachineType } from '../../config/equipmentConfig';
import { FLOOR_Y } from '../../lib/lineLayout';
import { simClock } from '../../state/store';
import { Built, Selectable } from '../common/Built';
import { buildMachine } from './machineBuilders';

interface Props {
  id: string;
  type: MachineType;
  position: [number, number];
  rotationY: number;
  length: number;
  width: number;
  height: number;
  modelUrl?: string;
  /** animatsiya fazasi (stanoklar bir vaqtda bir xil harakat qilmasligi uchun) */
  phase?: number;
}

/**
 * Bitta ishlab chiqarish uskunasi. Parametrik geometriya yoki (berilgan bo‘lsa) GLB model.
 * Harakatlanuvchi qismlari animatsiya soatiga bog‘langan.
 */
export function GlassProcessingMachine(p: Props) {
  const parts = useMemo(() => {
    const m = buildMachine(p.type, p.length, p.width, p.height);
    return {
      solid: m.solid.build(),
      glass: m.glass.build(),
      moving: m.moving ? { parts: m.moving.builder.build(), kind: m.moving.kind, range: m.moving.range, base: m.moving.base } : null,
    };
  }, [p.type, p.length, p.width, p.height]);
  const mv = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!mv.current || !parts.moving) return;
    const t = simClock.t + (p.phase ?? 0);
    const { kind, range, base } = parts.moving;
    if (kind === 'gantryZ') mv.current.position.set(base[0], base[1], base[2] + Math.sin(t * 0.55) * range);
    else if (kind === 'lifterY') mv.current.position.set(base[0], base[1] + (Math.sin(t * 0.8) * 0.5 + 0.5) * range, base[2]);
    else if (kind === 'ringSpin') {
      mv.current.position.set(base[0], base[1], base[2]);
      mv.current.rotation.z = t * 1.6;
    }
  });

  const procedural = (
    <>
      <Built parts={parts.solid} />
      <Built parts={parts.glass} castShadow={false} />
      {parts.moving && (
        <group ref={mv}>
          <Built parts={parts.moving.parts} />
        </group>
      )}
    </>
  );

  return (
    <Selectable id={p.id}>
      <group position={[p.position[0], FLOOR_Y, p.position[1]]} rotation={[0, p.rotationY, 0]}>
        {p.modelUrl ? (
          <ModelBoundary fallback={procedural}>
            <Suspense fallback={procedural}>
              <ExternalMachineModel url={p.modelUrl} size={[p.width, p.height, p.length]} />
            </Suspense>
          </ModelBoundary>
        ) : (
          procedural
        )}
      </group>
    </Selectable>
  );
}

/** GLB modelni uskunaning parametrik o‘lchamlariga moslab joylashtiradi */
function ExternalMachineModel({ url, size }: { url: string; size: [number, number, number] }) {
  const gltf = useGLTF(url, false);
  const obj = useMemo(() => {
    const o = gltf.scene.clone(true);
    const box = new THREE.Box3().setFromObject(o);
    const s = new THREE.Vector3();
    box.getSize(s);
    const k = Math.min(size[0] / (s.x || 1), size[1] / (s.y || 1), size[2] / (s.z || 1));
    o.scale.setScalar(k);
    const c = new THREE.Vector3();
    box.getCenter(c);
    o.position.set(-c.x * k, -box.min.y * k, -c.z * k);
    o.traverse((m) => {
      if ((m as THREE.Mesh).isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    return o;
  }, [gltf, size]);
  return <primitive object={obj} />;
}

/** Model yuklanmasa — parametrik model ko‘rsatiladi (ilova oq ekran bo‘lib qolmaydi) */
class ModelBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    console.warn('GLB model yuklanmadi, parametrik model ishlatiladi:', err);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
