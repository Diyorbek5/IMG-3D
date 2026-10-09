import { useMemo } from 'react';
import { Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import type { ValueStatus } from '../../config/factoryConfig';
import type { V3 } from '../../lib/dimensions';
import { ManagedLabel } from './labelManager';

interface Props {
  a: V3;
  b: V3;
  offset: V3;
  label: string;
  status: ValueStatus;
  onClick?: () => void;
  priority?: number;
}

const COLORS: Record<ValueStatus, string> = {
  confirmed: '#16a3e0',
  estimated: '#f0a020',
  unconfirmed: '#f0a020',
};

/**
 * CAD uslubidagi o‘lcham chizig‘i: chiqarish chiziqlari, o‘lcham chizig‘i, 45° belgi-chiziqchalar
 * (arxitektura "tick") va o‘qilishi oson HTML yozuv.
 */
export function DimensionLine({ a, b, offset, label, status, onClick, priority = 1 }: Props) {
  const segs = useMemo(() => {
    const A = new THREE.Vector3(...a);
    const B = new THREE.Vector3(...b);
    const off = new THREE.Vector3(...offset);
    const offDir = off.clone().normalize();
    const A2 = A.clone().add(off);
    const B2 = B.clone().add(off);
    const gap = Math.min(0.4, off.length() * 0.15);
    const over = 0.7;
    const dir = B2.clone().sub(A2).normalize();
    const tick = dir.clone().add(offDir).normalize().multiplyScalar(0.55);
    const pts: THREE.Vector3[] = [
      // chiqarish chiziqlari
      A.clone().addScaledVector(offDir, gap),
      A2.clone().addScaledVector(offDir, over),
      B.clone().addScaledVector(offDir, gap),
      B2.clone().addScaledVector(offDir, over),
      // o‘lcham chizig‘i (biroz chiqib turadi)
      A2.clone().addScaledVector(dir, -0.5),
      B2.clone().addScaledVector(dir, 0.5),
      // belgilar
      A2.clone().sub(tick),
      A2.clone().add(tick),
      B2.clone().sub(tick),
      B2.clone().add(tick),
    ];
    const mid = A2.clone().add(B2).multiplyScalar(0.5);
    return { pts, mid: [mid.x, mid.y, mid.z] as [number, number, number] };
  }, [a, b, offset]);
  const color = COLORS[status];
  return (
    <group>
      <Line points={segs.pts} segments color={color} lineWidth={1.8} transparent opacity={0.95} renderOrder={20} />
      <Html position={segs.mid} center zIndexRange={[12, 2]} style={{ pointerEvents: onClick ? 'auto' : 'none' }}>
        <ManagedLabel
          position={segs.mid}
          priority={priority}
          className={`dim-label ${status !== 'confirmed' ? 'dim-label--approx' : ''}`}
          onClick={onClick}
          title={status === 'confirmed' ? 'Tasdiqlangan o‘lcham' : 'Taxminiy / tasdiqlanmagan qiymat'}
        >
          {label}
        </ManagedLabel>
      </Html>
    </group>
  );
}
