import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { buildVehicles, sampleVehicle, type VehicleDef } from '../../lib/vehicles';
import { GeoBuilder } from '../../three/GeoBuilder';
import { logoTexture } from '../../three/textures';
import { simClock, useStore, vehicleState } from '../../state/store';
import { Built } from '../common/Built';
import { addAFrame, addCrate } from '../building/FrontBlockInterior';

/* ------------------------------------------------------------------ */
/* Geometriyalar (lokal: oldinga +x, pose nuqtasi — egar qurilma)       */
/* ------------------------------------------------------------------ */

function wheelsAt(b: GeoBuilder, xs: number[], halfTrack: number, r: number, width = 0.35) {
  for (const x of xs)
    for (const s of [-1, 1]) {
      b.cyl('rubber', [x, r, s * halfTrack], r, width, 'z', 16);
      b.cyl('steel', [x, r, s * (halfTrack + width / 2 + 0.005)], r * 0.55, 0.02, 'z', 12);
    }
}

function buildTractor(color: 'paintBlue' | 'paintWhite') {
  const b = new GeoBuilder();
  // shassi
  b.box('paintDark', [1.3, 0.85, 0], [5.0, 0.35, 1.1]);
  // kabina
  b.box(color, [3.0, 2.25, 0], [2.0, 2.4, 2.48]);
  b.box(color, [2.4, 3.6, 0], [1.6, 0.35, 2.4]);
  b.box('glassDark', [4.01, 2.6, 0], [0.04, 1.0, 2.2]);
  b.box('glassDark', [3.3, 2.65, 1.245], [1.0, 0.85, 0.02]);
  b.box('glassDark', [3.3, 2.65, -1.245], [1.0, 0.85, 0.02]);
  b.box('paintDark', [4.05, 1.45, 0], [0.12, 0.8, 2.0]);
  b.box('chrome', [4.12, 1.0, 0], [0.12, 0.25, 2.45]);
  b.box('lampWarm', [4.1, 1.35, 0.95], [0.04, 0.15, 0.35]);
  b.box('lampWarm', [4.1, 1.35, -0.95], [0.04, 0.15, 0.35]);
  // ko‘zgular
  for (const s of [-1, 1]) b.box('paintDark', [3.9, 2.9, s * 1.45], [0.1, 0.45, 0.1]);
  // yonilg‘i baki, egar
  b.cyl('aluminium', [1.6, 0.85, -1.0], 0.32, 1.2, 'x', 14);
  b.box('steel', [0, 1.12, 0], [1.4, 0.12, 1.4]);
  // qanotlar
  for (const x of [-0.3, 0.6]) for (const s of [-1, 1]) b.box('paintDark', [x, 1.2, s * 1.1], [1.0, 0.06, 0.45]);
  return b;
}

function buildTractorWheels() {
  const b = new GeoBuilder();
  wheelsAt(b, [3.3, 0.6, -0.4], 0.95, 0.5);
  return b;
}

function buildTrailer(kind: 'flat' | 'box') {
  const b = new GeoBuilder();
  const len = 13.6;
  const x0 = 0.6;
  const x1 = x0 - len;
  b.box('paintDark', [(x0 + x1) / 2, 1.15, 0], [len, 0.3, 2.5]);
  b.box('steel', [x0 - 0.8, 0.85, 0], [0.6, 0.4, 0.4]);
  // tayanch oyoqlar
  for (const s of [-1, 1]) b.box('steel', [x0 - 3.2, 0.6, s * 0.9], [0.15, 1.0, 0.15]);
  // orqa chiroqlar, bamper
  b.box('paintRed', [x1 - 0.02, 1.0, 0], [0.05, 0.15, 2.3]);
  b.box('steel', [x1 + 0.3, 0.55, 0], [0.12, 0.12, 2.3]);
  if (kind === 'box') {
    b.box('paintWhite', [(x0 + x1) / 2 - 0.1, 2.75, 0], [len - 0.3, 2.9, 2.5]);
    b.box('aluminium', [(x0 + x1) / 2 - 0.1, 4.22, 0], [len - 0.3, 0.06, 2.52]);
    b.box('aluminium', [x1 + 0.08, 2.75, 0], [0.04, 2.9, 2.52]);
  } else {
    for (const s of [-1, 1]) b.box('steel', [(x0 + x1) / 2, 1.38, s * 1.2], [len, 0.15, 0.1]);
  }
  return b;
}

function buildTrailerWheels() {
  const b = new GeoBuilder();
  wheelsAt(b, [-9.5, -10.8, -12.1], 0.95, 0.48);
  return b;
}

function buildForklift() {
  const b = new GeoBuilder();
  // korpus
  b.box('paintOrange', [-0.2, 0.75, 0], [2.0, 0.9, 1.15]);
  b.box('paintDark', [-1.15, 0.85, 0], [0.45, 1.0, 1.15]);
  b.box('paintDark', [0.15, 1.25, 0], [0.8, 0.12, 1.0]);
  // o‘rindiq va rul
  b.box('fabric', [-0.45, 1.45, 0], [0.5, 0.15, 0.5]);
  b.box('fabric', [-0.7, 1.75, 0], [0.12, 0.5, 0.5]);
  b.beam('paintDark', [0.3, 1.25, 0], [0.1, 1.75, 0], 0.05);
  // himoya tomi
  for (const [x, s] of [
    [0.55, -1],
    [0.55, 1],
    [-0.95, -1],
    [-0.95, 1],
  ])
    b.box('paintDark', [x, 1.75, s * 0.52], [0.06, 1.3, 0.06]);
  b.box('paintDark', [-0.2, 2.4, 0], [1.6, 0.06, 1.1]);
  // mast
  for (const s of [-1, 1]) b.box('steel', [1.05, 1.25, s * 0.38], [0.1, 2.5, 0.1]);
  b.box('steel', [1.05, 2.45, 0], [0.1, 0.1, 0.86]);
  b.box('lampWarm', [0.95, 2.48, 0.5], [0.08, 0.1, 0.12]);
  wheelsAt(b, [0.6, -0.9], 0.5, 0.3, 0.22);
  return b;
}

function buildForks() {
  const b = new GeoBuilder();
  b.box('paintDark', [1.15, 0.45, 0], [0.08, 0.6, 0.95]);
  for (const s of [-1, 1]) b.box('steel', [1.7, 0.18, s * 0.3], [1.1, 0.05, 0.12]);
  return b;
}

/* ------------------------------------------------------------------ */

function Truck({ v }: { v: VehicleDef }) {
  const root = useRef<THREE.Group>(null);
  const trailer = useRef<THREE.Group>(null);
  const cargo = useRef<THREE.Group>(null);
  const parts = useMemo(() => {
    const isRaw = v.kind === 'truck-raw';
    const c = new GeoBuilder();
    const cg = new GeoBuilder();
    if (isRaw) {
      addAFrame(c, cg, -4.5, 0, 6.0, 4, 0, 1.3);
      addAFrame(c, cg, -10.8, 0, 6.0, 4, 0, 1.3);
    } else {
      for (let x = -1.5; x > -12; x -= 2.6) addCrate(c, x, 0, 1.3, 2.3, 1.0, 1.9);
    }
    return {
      tractor: buildTractor(isRaw ? 'paintBlue' : 'paintWhite').build(),
      tractorWheels: buildTractorWheels().build(),
      trailer: buildTrailer(isRaw ? 'flat' : 'box').build(),
      trailerWheels: buildTrailerWheels().build(),
      cargo: c.build(),
      cargoGlass: cg.build(),
      isRaw,
    };
  }, [v.kind]);
  useFrame(() => {
    const s = sampleVehicle(v, simClock.t);
    vehicleState.set(v.id, { x: s.x, z: s.z, visible: s.visible });
    if (!root.current) return;
    root.current.visible = s.visible;
    if (!s.visible) return;
    root.current.position.set(s.x, 0, s.z);
    root.current.rotation.y = -s.heading;
    if (trailer.current) trailer.current.rotation.y = -((s.trailerHeading ?? s.heading) - s.heading);
    if (cargo.current) cargo.current.visible = parts.isRaw ? s.loaded : true;
  });
  return (
    <group ref={root} visible={false}>
      <Built parts={parts.tractor} dispose={false} />
      <Built parts={parts.tractorWheels} dispose={false} />
      <group ref={trailer}>
        <Built parts={parts.trailer} dispose={false} />
        <Built parts={parts.trailerWheels} dispose={false} />
        {!parts.isRaw && (
          <>
            <LogoDecal position={[-6.3, 2.9, 1.262]} rotationY={0} />
            <LogoDecal position={[-6.3, 2.9, -1.262]} rotationY={Math.PI} />
          </>
        )}
        <group ref={cargo}>
          {parts.isRaw && (
            <>
              <Built parts={parts.cargo} dispose={false} />
              <Built parts={parts.cargoGlass} castShadow={false} dispose={false} />
            </>
          )}
        </group>
      </group>
    </group>
  );
}

function LogoDecal({ position, rotationY }: { position: [number, number, number]; rotationY: number }) {
  const tex = logoTexture(true);
  return (
    <mesh position={position} rotation={[0, rotationY, 0]}>
      <planeGeometry args={[4.6, 1.8]} />
      <meshStandardMaterial map={tex} transparent roughness={0.5} polygonOffset polygonOffsetFactor={-2} />
    </mesh>
  );
}

function Forklift({ v }: { v: VehicleDef }) {
  const root = useRef<THREE.Group>(null);
  const forks = useRef<THREE.Group>(null);
  const load = useRef<THREE.Group>(null);
  const parts = useMemo(() => {
    const l = new GeoBuilder();
    const lg = new GeoBuilder();
    if (v.cargo === 'glass') {
      addAFrame(l, lg, 1.75, 0, 2.2, 3, Math.PI / 2, 0.22);
    } else {
      addCrate(l, 1.75, 0, 0.22, 1.0, 1.0, 1.3);
    }
    return { body: buildForklift().build(), forks: buildForks().build(), load: l.build(), loadGlass: lg.build() };
  }, [v.cargo]);
  useFrame(() => {
    const s = sampleVehicle(v, simClock.t);
    vehicleState.set(v.id, { x: s.x, z: s.z, visible: s.visible });
    if (!root.current) return;
    root.current.visible = s.visible;
    if (!s.visible) return;
    root.current.position.set(s.x, 0.15 * (isInside(s.x, s.z) ? 1 : 0), s.z);
    root.current.rotation.y = -s.heading;
    const lift = s.loaded ? 0.22 : 0.08;
    if (forks.current) forks.current.position.y = lift;
    if (load.current) load.current.visible = s.loaded;
  });
  return (
    <group ref={root} visible={false}>
      <Built parts={parts.body} dispose={false} />
      <group ref={forks}>
        <Built parts={parts.forks} dispose={false} />
        <group ref={load}>
          <Built parts={parts.load} dispose={false} />
          <Built parts={parts.loadGlass} castShadow={false} dispose={false} />
        </group>
      </group>
    </group>
  );
}

/** Bino yoki ombor ichidami (pol sathi 0.15 m balandroq) */
function isInside(x: number, z: number) {
  return (x > -20 && x < 20 && z > 0 && z < 125) || (x > 24 && x < 64 && z > 27 && z < 68) || (x > 84 && x < 131 && z > 33 && z < 60);
}

function RoadCar({ v }: { v: VehicleDef }) {
  const root = useRef<THREE.Group>(null);
  const parts = useMemo(() => {
    const b = new GeoBuilder();
    b.box('paintDark', [0, 0.35, 0], [4.4, 0.3, 1.7]);
    b.box('glassDark', [-0.2, 1.2, 0], [2.2, 0.55, 1.55]);
    wheelsAt(b, [1.35, -1.35], 0.72, 0.32, 0.2);
    return b.build();
  }, []);
  const bodyMat = useMemo(() => new THREE.MeshStandardMaterial({ color: v.color ?? '#cccccc', metalness: 0.6, roughness: 0.32 }), [v.color]);
  const bodyGeo = useMemo(() => new THREE.BoxGeometry(4.4, 0.65, 1.78), []);
  useEffect(
    () => () => {
      bodyMat.dispose();
      bodyGeo.dispose();
    },
    [bodyMat, bodyGeo],
  );
  useFrame(() => {
    const s = sampleVehicle(v, simClock.t);
    if (!root.current) return;
    root.current.visible = s.visible;
    root.current.position.set(s.x, 0.03, s.z);
    root.current.rotation.y = -s.heading;
  });
  return (
    <group ref={root}>
      <mesh geometry={bodyGeo} material={bodyMat} position={[0, 0.75, 0]} castShadow />
      <Built parts={parts} />
    </group>
  );
}

/** Barcha transport vositalari (yuk mashinalari, forkliftlar, yengil avtomobillar) */
export function Vehicles() {
  const vehicles = useMemo(() => buildVehicles(), []);
  const visible = useStore((s) => s.layers.vehicles);
  useEffect(() => {
    if (!visible) vehicleState.clear();
  }, [visible]);
  if (!visible) return null;
  return (
    <group name="Vehicles">
      {vehicles.map((v) =>
        v.kind === 'forklift' ? <Forklift key={v.id} v={v} /> : v.kind === 'car' ? <RoadCar key={v.id} v={v} /> : <Truck key={v.id} v={v} />,
      )}
    </group>
  );
}
