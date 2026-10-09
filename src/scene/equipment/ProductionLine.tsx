import { useMemo } from 'react';
import { computeLineLayout } from '../../lib/lineLayout';
import { useStore } from '../../state/store';
import { ConveyorSystem } from './ConveyorSystem';
import { GlassFlow } from './GlassFlow';
import { GlassProcessingMachine } from './GlassProcessingMachine';
import { QualityControlZone } from './QualityControlZone';

/**
 * Ishlab chiqarish liniyasi: stanoklar, konveyerlar, shisha oqimi, OTK zonasi va ixtiyoriy uskunalar.
 * Barcha joylashuv equipmentConfig.ts dan hisoblanadi.
 */
export function ProductionLine() {
  const layout = useMemo(() => computeLineLayout(), []);
  const visible = useStore((s) => s.layers.equipment);
  const optional = useStore((s) => s.layers.optionalEquipment);
  if (!visible) return null;
  return (
    <group name="ProductionLine">
      {layout.stations.map((st, i) => (
        <GlassProcessingMachine
          key={st.id}
          id={st.id}
          type={st.type}
          position={[st.cx, st.cz]}
          rotationY={st.dir > 0 ? 0 : Math.PI}
          length={st.length}
          width={st.width}
          height={st.height}
          modelUrl={st.modelUrl}
          phase={i * 1.7}
        />
      ))}
      <ConveyorSystem conveyors={layout.conveyors} />
      <GlassFlow layout={layout} />
      <QualityControlZone layout={layout} />
      <group>
        {optional && layout.optional.map((o) => (
          <GlassProcessingMachine
            key={o.id}
            id={o.id}
            type={o.type}
            position={[o.cx, o.cz]}
            rotationY={Math.PI / 2}
            length={o.length}
            width={o.width}
            height={o.height}
          />
        ))}
      </group>
    </group>
  );
}
