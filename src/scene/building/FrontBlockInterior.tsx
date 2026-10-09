import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { factoryConfig } from '../../config/factoryConfig';
import { getSegment, HALF_W } from '../../lib/layout';
import { FLOOR_Y } from '../../lib/lineLayout';
import { GeoBuilder } from '../../three/GeoBuilder';
import { simClock, useStore } from '../../state/store';
import { Built } from '../common/Built';

/** A-shaklidagi stellaj (jumbo shisha listlari bilan). Uzunligi x bo‘ylab. */
export function addAFrame(b: GeoBuilder, glass: GeoBuilder, x: number, z: number, len: number, sheetsPerSide: number, rotY = 0, y0 = FLOOR_Y) {
  const h = 3.4;
  const cos = Math.cos(rotY);
  const sin = Math.sin(rotY);
  const P = (lx: number, ly: number, lz: number): [number, number, number] => [x + lx * cos + lz * sin, y0 + ly, z - lx * sin + lz * cos];
  // asos
  b.add('steel', box(len, 0.16, 1.6), P(0, 0.08, 0), [0, rotY, 0]);
  // A-ramalar
  for (const lx of [-len / 2 + 0.2, 0, len / 2 - 0.2]) {
    b.beam('paintOrange', P(lx, 0.15, -0.75), P(lx, h, 0), 0.09);
    b.beam('paintOrange', P(lx, 0.15, 0.75), P(lx, h, 0), 0.09);
  }
  b.add('paintOrange', box(len, 0.1, 0.1), P(0, h, 0), [0, rotY, 0]);
  // shisha listlari (ikki tomonda, qiya)
  const sheetH = 3.1;
  for (const side of [-1, 1]) {
    for (let i = 0; i < sheetsPerSide; i++) {
      const off = 0.14 + i * 0.05;
      const tilt = side * 0.2;
      glass.add('glassSheet', box(len - 0.2, sheetH, 0.012), P(0, 0.2 + sheetH / 2 * 0.98, side * (off + 0.28)), [tilt * cos, rotY, -tilt * sin]);
    }
  }
}

const _box = new Map<string, THREE.BufferGeometry>();
function box(w: number, h: number, d: number) {
  const k = `${w}|${h}|${d}`;
  let g = _box.get(k);
  if (!g) {
    g = new THREE.BoxGeometry(w, h, d);
    _box.set(k, g);
  }
  return g;
}

/** Yog‘och yashik (qadoqlangan mahsulot) */
export function addCrate(b: GeoBuilder, x: number, z: number, y0: number, w = 2.4, d = 1.0, h = 1.9) {
  b.box('wood', [x, y0 + h / 2, z], [w, h, d]);
  b.box('steel', [x, y0 + h * 0.3, z], [w + 0.02, 0.04, d + 0.02]);
  b.box('steel', [x, y0 + h * 0.75, z], [w + 0.02, 0.04, d + 0.02]);
  b.box('wood', [x, y0 + 0.06, z], [w + 0.1, 0.12, d + 0.1]);
}

/**
 * Old korpus ichki jihozlari: xomashyo qismi (A-stellajlar va ko‘prik kran),
 * tayyor mahsulot buferi (yashiklar), hamda vazifasi aniqlashtiriladigan zona belgisi.
 */
export function FrontBlockInterior() {
  const front = getSegment('front');
  const px = factoryConfig.building.frontPartitionX;
  const equipmentVisible = useStore((s) => s.layers.equipment);
  const parts = useMemo(() => {
    const b = new GeoBuilder();
    const g = new GeoBuilder();
    // xomashyo: A-stellajlar (3-darvoza oldida bo‘sh joy qoldiriladi)
    const zA = front.z1 - 2.6;
    addAFrame(b, g, px + 5.2, zA, 6.2, 5);
    addAFrame(b, g, px + 12.6, zA, 6.2, 4);
    addAFrame(b, g, HALF_W - 3.6, zA - 3.5, 6.2, 5);
    // ko‘prik kran yo‘llari (runway)
    const runY = front.height - factoryConfig.building.parapetHeight - 2.2;
    for (const z of [front.z0 + 0.7, front.z1 - 0.5]) {
      b.boxMinMax('paintYellow', px + 0.4, runY - 0.5, z - 0.15, HALF_W - 0.4, runY, z + 0.15);
    }
    // tayyor mahsulot buferi — yashiklar to‘plami (forklift yo‘laklari bo‘sh qoladi)
    const crates: [number, number, number][] = [
      [-18.4, 2.2, 0],
      [-18.4, 2.2, 1],
      [-18.4, 4.0, 0],
      [-18.4, 6.0, 0],
      [-18.4, 6.0, 1],
      [-18.4, 8.0, 0],
      [-10.4, 6.0, 0],
      [-10.4, 6.0, 1],
      [-10.4, 8.2, 0],
      [-3.6, 7.6, 0],
    ];
    for (const [x, z, lvl] of crates) addCrate(b, x, z, FLOOR_Y + lvl * 1.95, 2.4, 1.0, 1.9);
    // paletlar
    b.box('wood', [-10.4, FLOOR_Y + 0.07, 3.4], [2.4, 0.14, 1.2]);
    return { solid: b.build(), glass: g.build(), runY };
  }, [front, px]);

  if (!equipmentVisible) return null;
  return (
    <group>
      <Built parts={parts.solid} />
      <Built parts={parts.glass} castShadow={false} />
      <GantryCrane x0={px + 0.6} x1={HALF_W - 0.6} z0={front.z0 + 0.7} z1={front.z1 - 0.5} y={parts.runY} />
    </group>
  );
}

/** Ko‘prik kran — runway bo‘ylab sekin harakatlanadi (animatsiya soatiga bog‘liq) */
function GantryCrane({ x0, x1, z0, z1, y }: { x0: number; x1: number; z0: number; z1: number; y: number }) {
  const bridge = useRef<THREE.Group>(null);
  const hoist = useRef<THREE.Group>(null);
  const span = z1 - z0;
  const parts = useMemo(() => {
    const b = new GeoBuilder();
    b.box('paintYellow', [0, 0.35, 0], [0.5, 0.7, span]);
    b.box('paintYellow', [0.7, 0.35, 0], [0.3, 0.5, span]);
    b.box('paintDark', [0, 0.25, -span / 2 + 0.3], [1.2, 0.5, 0.6]);
    b.box('paintDark', [0, 0.25, span / 2 - 0.3], [1.2, 0.5, 0.6]);
    return b.build();
  }, [span]);
  const hoistParts = useMemo(() => {
    const b = new GeoBuilder();
    b.box('paintDark', [0, 0, 0], [1.0, 0.6, 0.9]);
    b.cyl('steel', [0, -1.6, 0], 0.02, 3.0, 'y', 6);
    // vakuumli ko‘targich ramasi
    b.box('paintOrange', [0, -3.2, 0], [0.12, 0.12, 2.6]);
    b.box('paintOrange', [0, -3.2, 0], [1.6, 0.12, 0.12]);
    for (const [x, z] of [
      [-0.7, -1.1],
      [0.7, -1.1],
      [-0.7, 1.1],
      [0.7, 1.1],
    ])
      b.cyl('rubber', [x, -3.32, z], 0.16, 0.06, 'y', 14);
    return b.build();
  }, []);
  useFrame(() => {
    const t = simClock.t;
    const u = (Math.sin(t * 0.07) + 1) / 2;
    if (bridge.current) bridge.current.position.x = x0 + 1 + u * (x1 - x0 - 2);
    if (hoist.current) hoist.current.position.z = Math.sin(t * 0.13) * (span / 2 - 1.2);
  });
  return (
    <group ref={bridge} position={[x0 + 1, y, (z0 + z1) / 2]}>
      <Built parts={parts} />
      <group ref={hoist} position={[0, -0.1, 0]}>
        <Built parts={hoistParts} />
      </group>
    </group>
  );
}
