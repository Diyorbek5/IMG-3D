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
 * Xomashyo ombori (old korpusning o‘ng qismi, old fasadga qaraganda):
 * A-stellajlardagi jumbo shisha listlari va ko‘prik kran. Forklift yo‘laklari bo‘sh qoldirilgan.
 */
export function RawMaterialWarehouse() {
  const front = getSegment('front');
  const px = factoryConfig.building.frontPartitionX;
  const parts = useMemo(() => {
    const b = new GeoBuilder();
    const g = new GeoBuilder();
    const x0 = -HALF_W;
    // devor bo‘ylab A-stellajlar qatori
    for (let z = front.z0 + 4.5; z < front.z1 - 2; z += 5.5) addAFrame(b, g, x0 + 4.2, z, 6.2, 5);
    // 3-darvoza yonidagi qabul qilingan listlar (ko‘ndalang)
    addAFrame(b, g, -8, front.z0 + 6.5, 6.0, 4, Math.PI / 2);
    addAFrame(b, g, -8, front.z0 + 14, 6.0, 3, Math.PI / 2);
    // ko‘prik kran yo‘llari (z bo‘ylab)
    const runY = front.height - factoryConfig.building.parapetHeight - 2.2;
    for (const x of [x0 + 0.6, px - 0.6]) b.boxMinMax('paintYellow', x - 0.15, runY - 0.5, front.z0 + 0.6, x + 0.15, runY, front.z1 - 0.6);
    return { solid: b.build(), glass: g.build(), runY };
  }, [front, px]);
  return (
    <group name="RawMaterialWarehouse">
      <Built parts={parts.solid} />
      <Built parts={parts.glass} castShadow={false} />
      <GantryCrane x0={-HALF_W + 0.6} x1={px - 0.6} z0={front.z0 + 2} z1={front.z1 - 2} y={parts.runY} />
    </group>
  );
}

/** Tayyor mahsulotlar ombori (old korpusning chap qismi): yashiklar qatorlari, forklift yo‘laklari bo‘sh */
export function FinishedGoodsWarehouse() {
  const front = getSegment('front');
  const parts = useMemo(() => {
    const b = new GeoBuilder();
    let k = 0;
    for (const x of [5.6, 9.6, HALF_W - 1.4]) {
      for (let z = front.z0 + 13; z < front.z1 - 2; z += 2.6) {
        addCrate(b, x, z, FLOOR_Y, 2.4, 1.0, 1.9);
        if (k++ % 3 !== 1) addCrate(b, x, z, FLOOR_Y + 1.95, 2.4, 1.0, 1.9);
      }
    }
    // jo‘natishga tayyorlangan yashiklar (darvozalar yonida)
    addCrate(b, 9.6, front.z0 + 4, FLOOR_Y, 2.4, 1.0, 1.9);
    addCrate(b, HALF_W - 1.4, front.z0 + 4, FLOOR_Y, 2.4, 1.0, 1.9);
    addCrate(b, HALF_W - 1.4, front.z0 + 6.6, FLOOR_Y, 2.4, 1.0, 1.9);
    // yuklash zonasi belgisi
    b.boxMinMax('markingYellow', 3, FLOOR_Y + 0.001, front.z0 + 9.6, HALF_W - 0.5, FLOOR_Y + 0.005, front.z0 + 9.75);
    return b.build();
  }, [front]);
  return (
    <group name="FinishedGoodsWarehouse">
      <Built parts={parts} />
    </group>
  );
}

/** Old korpus (omborlar maydoni) ichki jihozlari */
export function FrontBlockInterior() {
  const equipmentVisible = useStore((s) => s.layers.equipment);
  if (!equipmentVisible) return null;
  return (
    <group>
      <RawMaterialWarehouse />
      <FinishedGoodsWarehouse />
    </group>
  );
}

/** Ko‘prik kran — x bo‘ylab ko‘prik, z bo‘ylab runway; animatsiya soatiga bog‘liq */
function GantryCrane({ x0, x1, z0, z1, y }: { x0: number; x1: number; z0: number; z1: number; y: number }) {
  const bridge = useRef<THREE.Group>(null);
  const hoist = useRef<THREE.Group>(null);
  const span = x1 - x0;
  const parts = useMemo(() => {
    const b = new GeoBuilder();
    b.box('paintYellow', [0, 0.35, 0], [span, 0.7, 0.5]);
    b.box('paintYellow', [0, 0.35, 0.7], [span, 0.5, 0.3]);
    b.box('paintDark', [-span / 2 + 0.3, 0.25, 0], [0.6, 0.5, 1.2]);
    b.box('paintDark', [span / 2 - 0.3, 0.25, 0], [0.6, 0.5, 1.2]);
    return b.build();
  }, [span]);
  const hoistParts = useMemo(() => {
    const b = new GeoBuilder();
    b.box('paintDark', [0, 0, 0], [0.9, 0.6, 1.0]);
    b.cyl('steel', [0, -1.6, 0], 0.02, 3.0, 'y', 6);
    // vakuumli ko‘targich ramasi
    b.box('paintOrange', [0, -3.2, 0], [2.6, 0.12, 0.12]);
    b.box('paintOrange', [0, -3.2, 0], [0.12, 0.12, 1.6]);
    for (const [x, z] of [
      [-1.1, -0.7],
      [1.1, -0.7],
      [-1.1, 0.7],
      [1.1, 0.7],
    ])
      b.cyl('rubber', [x, -3.32, z], 0.16, 0.06, 'y', 14);
    return b.build();
  }, []);
  useFrame(() => {
    const t = simClock.t;
    const u = (Math.sin(t * 0.05) + 1) / 2;
    if (bridge.current) bridge.current.position.z = z0 + u * (z1 - z0);
    if (hoist.current) hoist.current.position.x = Math.sin(t * 0.13) * (span / 2 - 1.5);
  });
  return (
    <group ref={bridge} position={[(x0 + x1) / 2, y, z0]}>
      <Built parts={parts} />
      <group ref={hoist} position={[0, -0.1, 0]}>
        <Built parts={hoistParts} />
      </group>
    </group>
  );
}
