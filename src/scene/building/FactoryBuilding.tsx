import { useMemo } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { factoryConfig } from '../../config/factoryConfig';
import { getSegments } from '../../lib/layout';
import { useStore } from '../../state/store';
import { Built } from '../common/Built';
import { buildMainShell } from './shellBuilders';
import { FrontFacade } from './FrontFacade';
import { GlassShowroom } from './GlassShowroom';
import { RollerShutterDoors } from './RollerShutterDoors';
import { FrontBlockInterior } from './FrontBlockInterior';
import { FloorMarkings } from './FloorMarkings';

/**
 * Asosiy ishlab chiqarish binosi (40 × 125 m): segmentlar, fasadlar, tom, ichki konstruksiyalar.
 * Bino qobig‘iga bosilganda — bosilgan nuqtaning z koordinatasiga qarab tegishli segment tanlanadi.
 */
export function FactoryBuilding() {
  const parts = useMemo(() => {
    const p = buildMainShell(factoryConfig);
    return {
      shell: p.shell.build(),
      glass: p.glass.build(),
      roof: p.roof.build(),
      upper: p.upper.build(),
      upperGlass: p.upperGlass.build(),
      interior: p.interior.build(),
    };
  }, []);
  const roofs = useStore((s) => s.layers.roofs);
  const upperFloor = useStore((s) => s.layers.upperFloor);
  const select = useStore((s) => s.select);
  const setHovered = useStore((s) => s.setHovered);

  const segs = useMemo(() => getSegments(), []);
  const pick = (e: ThreeEvent<MouseEvent | PointerEvent>) => {
    const z = e.point.z;
    const x = e.point.x;
    if (z < 0) return 'showroom';
    const seg = segs.find((s) => z >= s.z0 - 0.3 && z <= s.z1 + 0.3);
    if (!seg) return null;
    if (seg.id === 'front' && e.point.y < seg.height - 1) return x < factoryConfig.building.frontPartitionX ? 'fg-buffer' : 'raw-buffer';
    return `seg-${seg.id}`;
  };

  return (
    <group
      name="FactoryBuilding"
      onClick={(e) => {
        if (e.delta > 6) return;
        const id = pick(e);
        if (!id) return;
        e.stopPropagation();
        select(id);
      }}
      onPointerMove={(e) => {
        const id = pick(e);
        if (id) {
          e.stopPropagation();
          setHovered(id);
          document.body.style.cursor = 'pointer';
        }
      }}
      onPointerOut={() => {
        setHovered(null);
        document.body.style.cursor = '';
      }}
    >
      <Built parts={parts.shell} />
      <Built parts={parts.glass} castShadow={false} />
      <Built parts={parts.interior} />
      {/* yashirilgan obyektlar ham nur bilan kesishmasligi uchun shartli render */}
      {roofs && <Built parts={parts.roof} dispose={false} />}
      {upperFloor && (
        <>
          <Built parts={parts.upper} dispose={false} />
          <Built parts={parts.upperGlass} castShadow={false} dispose={false} />
        </>
      )}
      <FrontFacade />
      <GlassShowroom />
      <RollerShutterDoors />
      <FrontBlockInterior />
      <FloorMarkings />
    </group>
  );
}
