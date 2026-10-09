import { useEffect, type ReactNode } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import type { BuiltPart, MatKey } from '../../three/GeoBuilder';
import { getMaterials } from '../../three/materials';
import { useStore } from '../../state/store';

/** Soya tashlamaydigan materiallar */
const NO_CAST = new Set<MatKey>(['glass', 'glassSheet', 'lightPanel', 'screen', 'lampWarm', 'heat']);

interface BuiltProps {
  parts: BuiltPart[];
  castShadow?: boolean;
  receiveShadow?: boolean;
  /** geometriyani komponent o‘chirilganda bo‘shatish */
  dispose?: boolean;
}

/** GeoBuilder natijasini mesh’lar sifatida chizadi (har bir material uchun bitta draw call). */
export function Built({ parts, castShadow = true, receiveShadow = true, dispose = true }: BuiltProps) {
  const mats = getMaterials();
  useEffect(() => {
    if (!dispose) return;
    return () => parts.forEach((p) => p.geometry.dispose());
  }, [parts, dispose]);
  return (
    <>
      {parts.map((p) => (
        <mesh
          key={p.key}
          geometry={p.geometry}
          material={mats[p.key]}
          castShadow={castShadow && !NO_CAST.has(p.key)}
          receiveShadow={receiveShadow && p.key !== 'glass'}
          renderOrder={p.key === 'glass' || p.key === 'glassSheet' ? 2 : 0}
        />
      ))}
    </>
  );
}

/** Bosilganda info-panelni ochadigan guruh. Kamera aylantirish (drag) bosish deb hisoblanmaydi. */
export function Selectable({ id, children }: { id: string; children: ReactNode }) {
  const select = useStore((s) => s.select);
  const setHovered = useStore((s) => s.setHovered);
  return (
    <group
      onClick={(e: ThreeEvent<MouseEvent>) => {
        if (e.delta > 6) return;
        e.stopPropagation();
        select(id);
      }}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        setHovered(id);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(null);
        document.body.style.cursor = '';
      }}
    >
      {children}
    </group>
  );
}
