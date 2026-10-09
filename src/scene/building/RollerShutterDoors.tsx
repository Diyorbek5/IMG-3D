import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { animationConfig } from '../../config/animationConfig';
import { rollerDoors, type DoorLayout } from '../../lib/layout';
import { GeoBuilder } from '../../three/GeoBuilder';
import { getMaterials } from '../../three/materials';
import { useStore, vehicleState } from '../../state/store';
import { Built, Selectable } from '../common/Built';

/** Darvozalarning joriy ochiqlik darajasi (0 — yopiq, 1 — ochiq); boshqa modullar o‘qiydi */
export const doorOpenness: Record<string, number> = {};

/** Sayr rejimida majburiy ochiladigan darvozalar */
export const forcedOpenDoors = new Set<string>();

/** Rolikli darvoza — lamelli polotno, yo‘naltiruvchi relslar, baraban qutisi va yuritma. */
function RollerShutterDoor({ door, curtainMat }: { door: DoorLayout; curtainMat: THREE.Material }) {
  const { cx, width: w, height: h } = door;
  const curtain = useRef<THREE.Mesh>(null);
  const open = useRef(doorOpenness[door.id] ?? 0);

  const frame = useMemo(() => {
    const b = new GeoBuilder();
    // yon relslar (U-profil)
    for (const s of [-1, 1]) {
      const x = cx + s * (w / 2 + 0.06);
      b.box('galvanized', [x, h / 2, -0.12], [0.14, h, 0.16]);
      b.box('steel', [x + s * 0.05, h / 2, -0.21], [0.04, h, 0.04]);
    }
    // baraban qutisi
    b.box('galvanized', [cx, h + 0.36, -0.32], [w + 0.5, 0.72, 0.62]);
    b.box('aluDark', [cx, h + 0.02, -0.32], [w + 0.5, 0.04, 0.64]);
    // elektr yuritma va boshqaruv pulti
    b.cyl('paintDark', [cx + w / 2 + 0.45, h + 0.36, -0.32], 0.17, 0.4, 'x', 14);
    b.box('paintGrey', [cx + w / 2 + 0.7, 1.4, -0.08], [0.22, 0.32, 0.1]);
    b.box('paintRed', [cx + w / 2 + 0.7, 1.45, -0.135], [0.06, 0.06, 0.02]);
    b.box('paintGreen', [cx + w / 2 + 0.7, 1.35, -0.135], [0.06, 0.06, 0.02]);
    return b.build();
  }, [cx, w, h]);

  const curtainGeo = useMemo(() => {
    const b = new GeoBuilder();
    b.box('shutter', [0, h / 2, 0], [w, h, 0.05]);
    // pastki profil (rezina zichlagich bilan)
    const parts = b.build();
    return parts[0].geometry;
  }, [w, h]);
  const bottomBar = useMemo(() => new THREE.BoxGeometry(w, 0.1, 0.09), [w]);

  useFrame((_, dt) => {
    const st = useStore.getState();
    let target = 0;
    if (st.doorMode === 'open' || forcedOpenDoors.has(door.id)) target = 1;
    else if (st.doorMode === 'auto') {
      const r = animationConfig.doorTriggerDistance;
      for (const v of vehicleState.values()) {
        if (!v.visible) continue;
        if (Math.hypot(v.x - cx, v.z) < r) {
          target = 1;
          break;
        }
      }
    }
    const speed = 0.4; // ~2.5 s to‘liq ochilish
    const d = target - open.current;
    open.current += Math.sign(d) * Math.min(Math.abs(d), speed * Math.min(dt, 0.25) * Math.max(1, st.speed));
    doorOpenness[door.id] = open.current;
    if (curtain.current) {
      const lift = open.current * (h - 0.05);
      curtain.current.position.y = lift;
      // baraban ichiga o‘ralgan qism ko‘rinmasligi uchun y > h kesiladi (clipping plane)
    }
  });

  return (
    <Selectable id={door.id}>
      <Built parts={frame} />
      <group position={[cx, 0, -0.1]}>
        <mesh ref={curtain} geometry={curtainGeo} material={curtainMat} castShadow receiveShadow>
          <mesh geometry={bottomBar} position={[0, 0.05, 0]} material={getMaterials().aluDark} />
        </mesh>
      </group>
    </Selectable>
  );
}

export function RollerShutterDoors() {
  const doors = useMemo(() => rollerDoors(), []);
  const curtainMat = useMemo(() => {
    const base = getMaterials().shutter as THREE.MeshStandardMaterial;
    const m = base.clone();
    const maxH = Math.max(...doors.map((d) => d.height));
    m.clippingPlanes = [new THREE.Plane(new THREE.Vector3(0, -1, 0), maxH + 0.02)];
    m.clipShadows = true;
    return m;
  }, [doors]);
  return (
    <group name="RollerShutterDoors">
      {doors.map((d) => (
        <RollerShutterDoor key={d.id} door={d} curtainMat={curtainMat} />
      ))}
    </group>
  );
}
