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

/** Egar qurilmasidan tirkama orqa bamperigacha masofa, m */
const TRAILER_REAR = 13;

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
    // tirkama orqa qismi (darvozaga orqasi bilan kiradi — avtomatik darvoza shu nuqta bo‘yicha ochiladi)
    const th = s.trailerHeading ?? s.heading;
    vehicleState.set(v.id, { x: s.x, z: s.z, rx: s.x - Math.cos(th) * TRAILER_REAR, rz: s.z - Math.sin(th) * TRAILER_REAR, visible: s.visible });
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

/** Barcha transport vositalari (yuk mashinalari, yengil avtomobillar) */
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
        v.kind === 'car' ? <RoadCar key={v.id} v={v} /> : <Truck key={v.id} v={v} />,
      )}
    </group>
  );
}
