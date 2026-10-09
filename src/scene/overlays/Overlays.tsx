import { useEffect, useMemo, useRef } from 'react';
import { Grid, Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { factoryConfig } from '../../config/factoryConfig';
import { animationConfig } from '../../config/animationConfig';
import { dimensionSpecs, dimText } from '../../lib/dimensions';
import { getEntity } from '../../lib/entities';
import { getSegments, HALF_W, roadFrame, showroomRect } from '../../lib/layout';
import { computeLineLayout, FLOOR_Y } from '../../lib/lineLayout';
import { Path2D, type P2 } from '../../lib/motion';
import { simClock, useStore } from '../../state/store';
import { DimensionLine } from './DimensionLine';
import { ManagedLabel } from './labelManager';

/** O‘lcham chiziqlari — umumiy va zonalar guruhlari alohida yoqiladi */
export function Dimensions() {
  const overall = useStore((s) => s.layers.dimsOverall);
  const zones = useStore((s) => s.layers.dimsZones);
  const select = useStore((s) => s.select);
  const specs = useMemo(() => dimensionSpecs(), []);
  const target: Record<string, string> = {
    'len-front': 'seg-front',
    'len-production': 'seg-production',
    'len-rear': 'seg-rear',
    'h-production': 'seg-production',
    'h-rear': 'seg-rear',
    'rear-f1': 'seg-rear',
    'rear-f2': 'seg-rear',
    'sr-width': 'showroom',
    'sr-depth': 'showroom',
    'sr-height': 'showroom',
    'w-raw': 'raw-buffer',
    'w-fg': 'fg-buffer',
    'front-height': 'seg-front',
  };
  return (
    <group name="Dimensions">
      {specs
        .filter((d) => (d.group === 'overall' ? overall : zones))
        .map((d) => (
          <DimensionLine key={d.id} a={d.a} b={d.b} offset={d.offset} label={dimText(d)} status={d.status} priority={d.group === 'overall' ? 1 : 2} onClick={target[d.id] ? () => select(target[d.id]) : undefined} />
        ))}
    </group>
  );
}

/** 5 metrli masshtab to‘ri */
export function ScaleGrid() {
  const on = useStore((s) => s.layers.grid);
  if (!on) return null;
  return (
    <Grid
      position={[60, 0.07, 40]}
      args={[400, 400]}
      cellSize={5}
      cellThickness={0.6}
      cellColor="#2c3e50"
      sectionSize={25}
      sectionThickness={1.2}
      sectionColor="#0e7490"
      fadeDistance={520}
      fadeStrength={1.2}
      infiniteGrid={false}
    />
  );
}

/** Zona va bino nomlari (bosilganda info-panel ochiladi) */
export function ZoneLabels() {
  const on = useStore((s) => s.layers.labels);
  const roofs = useStore((s) => s.layers.roofs);
  const upperFloor = useStore((s) => s.layers.upperFloor);
  const select = useStore((s) => s.select);
  const labels = useMemo(() => {
    const segs = getSegments();
    const L = computeLineLayout();
    const out: { id: string; text: string; pos: [number, number, number]; kind: 'major' | 'minor' | 'room1' | 'room2' }[] = [];
    for (const s of segs) if (s.id !== 'front') out.push({ id: `seg-${s.id}`, text: s.shortName, pos: [0, s.height + 2.5, (s.z0 + s.z1) / 2], kind: 'major' });
    const c = factoryConfig;
    const sr = showroomRect();
    const front = segs[0];
    const px = c.building.frontPartitionX;
    out.push({ id: 'showroom', text: 'Showroom', pos: [(sr.x0 + sr.x1) / 2, c.showroom.height + 2.2, (sr.z0 + sr.z1) / 2], kind: 'major' });
    out.push({ id: 'raw-buffer', text: 'Xomashyo ombori', pos: [(-HALF_W + px) / 2, front.height + 1.2, front.z0 + front.length * 0.62], kind: 'major' });
    out.push({ id: 'fg-buffer', text: 'Tayyor mahsulotlar ombori', pos: [(HALF_W + px) / 2, front.height + 1.2, front.z0 + front.length * 0.62], kind: 'major' });
    out.push({ id: 'front-yard', text: 'Yuklash-tushirish maydoni', pos: [6, 1.5, -30], kind: 'minor' });
    for (const m of c.rearRooms) {
      const r = segs[segs.length - 1];
      const y = m.floor === 1 ? FLOOR_Y + 2.6 : c.building.rearFirstFloorHeight + 2.4;
      out.push({ id: m.id, text: m.name.split(' (')[0], pos: [(m.x0 + m.x1) / 2, y, r.z0 + 6.5], kind: m.floor === 1 ? 'room1' : 'room2' });
    }
    const rf = roadFrame();
    const rp = rf.toWorld(-40, 0);
    out.push({ id: 'road', text: 'Katta avtomobil yo‘li', pos: [rp.x, 2, rp.z], kind: 'major' });
    out.push({ id: 'parking', text: 'Avtoturargoh', pos: [(c.site.parking.x0 + c.site.parking.x1) / 2, 2, (c.site.parking.z0 + c.site.parking.z1) / 2], kind: 'minor' });
    out.push({ id: 'site-gate', text: 'Kirish-chiqish (KPP)', pos: [c.site.entryGateX, 4, -50], kind: 'minor' });
    // ichki zonalar (kesim rejimida)
    for (const st of L.stations) out.push({ id: st.id, text: st.name, pos: [st.cx, FLOOR_Y + st.height + 0.9, st.cz], kind: 'minor' });
    out.push({ id: 'qc-zone', text: 'OTK/GPO sifat nazorati', pos: [(L.qualityZone.x0 + L.qualityZone.x1) / 2 - 3, 3.0, (L.qualityZone.z0 + L.qualityZone.z1) / 2], kind: 'major' });
    for (const o of L.optional) out.push({ id: o.id, text: o.name, pos: [o.cx, FLOOR_Y + o.height + 0.9, o.cz], kind: 'minor' });
    return out;
  }, []);
  if (!on) return null;
  const interior = new Set(['qc-zone', ...computeLineLayout().stations.map((s) => s.id), ...computeLineLayout().optional.map((o) => o.id)]);
  return (
    <group name="ZoneLabels">
      {labels
        .filter((l) => (interior.has(l.id) ? !roofs : true))
        .filter((l) => (!roofs ? !l.id.startsWith('seg-') : true))
        .filter((l) => (l.kind === 'room2' ? !roofs && upperFloor : l.kind === 'room1' ? !roofs && !upperFloor : true))
        .map((l) => (
          <Html key={l.id} position={l.pos} center zIndexRange={[12, 2]}>
            <ManagedLabel position={l.pos} priority={l.kind === 'major' ? 3 : 4} className={`zone-label zone-label--${l.kind === 'major' ? 'major' : 'minor'}`} onClick={() => select(l.id)}>
              {l.text}
            </ManagedLabel>
          </Html>
        ))}
    </group>
  );
}

/** Tanlangan va ustiga kursor olib borilgan obyekt chegaralari */
export function SelectionHighlight() {
  const selected = useStore((s) => s.selected);
  const hovered = useStore((s) => s.hovered);
  const geo = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), []);
  useEffect(() => () => geo.dispose(), [geo]);
  const selMat = useMemo(() => new THREE.LineBasicMaterial({ color: '#ff9f1a', depthTest: false, transparent: true }), []);
  const hovMat = useMemo(() => new THREE.LineBasicMaterial({ color: '#ffffff', depthTest: false, transparent: true, opacity: 0.6 }), []);
  const selRef = useRef<THREE.LineSegments>(null);
  useFrame(({ clock }) => {
    selMat.opacity = 0.65 + Math.sin(clock.elapsedTime * 4) * 0.3;
  });
  const place = (id: string | null) => {
    const e = getEntity(id);
    if (!e) return null;
    const { min, max } = e.bounds;
    const pad = 0.25;
    return {
      pos: [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2] as [number, number, number],
      scale: [max[0] - min[0] + pad, Math.max(0.3, max[1] - min[1]) + pad, max[2] - min[2] + pad] as [number, number, number],
    };
  };
  const s = place(selected);
  const h = hovered !== selected ? place(hovered) : null;
  return (
    <group>
      {s && <lineSegments ref={selRef} geometry={geo} material={selMat} position={s.pos} scale={s.scale} renderOrder={30} />}
      {h && <lineSegments geometry={geo} material={hovMat} position={h.pos} scale={h.scale} renderOrder={29} />}
    </group>
  );
}

/**
 * Ishlab chiqarish oqimi yo‘nalishi: Katta yo‘l → xomashyo → liniya → OTK → qadoqlash → ombor → jo‘natish.
 * Rangli strelkalar yo‘l bo‘ylab harakatlanadi (xomashyo — sariq, ishlov — moviy, tayyor mahsulot — yashil).
 */
export function FlowArrows() {
  const on = useStore((s) => s.layers.flow);
  const data = useMemo(() => {
    const rf = roadFrame();
    const L = computeLineLayout();
    const lane = rf.eastboundOuterV;
    const tr = animationConfig.trucks;
    const roadIn = rf.toWorld(-90, lane);
    const roadOut = rf.toWorld(90 + tr.gate.outX, lane);
    const linePts: P2[] = L.path.sample(1.0);
    const rawDoorX = tr.raw.reverse[tr.raw.reverse.length - 1][0];
    const fgDoorX = tr.finished.reverse[tr.finished.reverse.length - 1][0];
    // Katta yo‘l → kirish-chiqish darvozasi → 3-darvoza (xomashyo ombori) → yuklash stoli
    const raw: P2[] = [
      [roadIn.x, roadIn.z],
      [tr.gate.inX, rf.zAt(tr.gate.inX, lane)],
      ...tr.raw.approach,
      ...tr.raw.reverse.slice(1, -1),
      [rawDoorX, 6],
      [-8, 20],
      [-8, 38],
      linePts[0],
    ];
    // qadoqlash → tayyor mahsulotlar ombori → 1-darvoza → yuk mashinasi → o‘sha darvozadan chiqish
    const fg: P2[] = [
      [14.3, L.packedStaging.z0 + 1],
      [14.3, 30],
      [fgDoorX, 5],
      ...tr.finished.exit,
      [tr.gate.outX, rf.zAt(tr.gate.outX, lane)],
      [roadOut.x, roadOut.z],
    ];
    const paths = [
      { path: Path2D.rounded(raw, 6), color: '#f5a524', inside: false },
      { path: Path2D.polyline(linePts), color: '#22b8f0', inside: true },
      { path: Path2D.rounded(fg, 4), color: '#2fbf71', inside: false },
    ];
    return paths;
  }, []);
  const spacing = 4.5;
  const total = data.reduce((a, p) => a + Math.ceil(p.path.length / spacing), 0);
  const inst = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0.9, 0);
    s.lineTo(-0.5, 0.8);
    s.lineTo(-0.2, 0);
    s.lineTo(-0.5, -0.8);
    s.closePath();
    const g = new THREE.ShapeGeometry(s);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  useEffect(() => () => geo.dispose(), [geo]);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffffff', depthTest: false, transparent: true, opacity: 0.95, toneMapped: false, side: THREE.DoubleSide }), []);
  useEffect(() => {
    const im = inst.current;
    if (!im) return;
    const c = new THREE.Color();
    let i = 0;
    for (const p of data) {
      const n = Math.ceil(p.path.length / spacing);
      for (let k = 0; k < n; k++) im.setColorAt(i++, c.set(p.color));
    }
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
  }, [data, on]);
  const m = useMemo(() => new THREE.Matrix4(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const e = useMemo(() => new THREE.Euler(), []);
  const v = useMemo(() => new THREE.Vector3(), []);
  const one = useMemo(() => new THREE.Vector3(1.4, 1.4, 1.4), []);
  useFrame(() => {
    const im = inst.current;
    if (!im || !on) return;
    const shift = (simClock.t * 3) % spacing;
    let i = 0;
    for (const p of data) {
      const n = Math.ceil(p.path.length / spacing);
      for (let k = 0; k < n; k++) {
        const s = (k * spacing + shift) % p.path.length;
        const pose = p.path.poseAt(s);
        const inside = pose.x > -HALF_W && pose.x < HALF_W && pose.z > 0 && pose.z < factoryConfig.building.totalLength;
        const y = p.inside ? 3.0 : inside ? 2.6 : 0.6;
        e.set(0, -pose.heading, 0);
        q.setFromEuler(e);
        v.set(pose.x, y, pose.z);
        m.compose(v, q, one);
        im.setMatrixAt(i++, m);
      }
    }
    im.instanceMatrix.needsUpdate = true;
  });
  if (!on) return null;
  return <instancedMesh ref={inst} args={[geo, mat, total]} frustumCulled={false} renderOrder={25} />;
}

/** Tanlangan obyekt yonida qisqa nom (3D sahnada) */
export function SelectedTag() {
  const selected = useStore((s) => s.selected);
  const e = getEntity(selected);
  if (!e) return null;
  const pos: [number, number, number] = [(e.bounds.min[0] + e.bounds.max[0]) / 2, e.bounds.max[1] + 1.2, (e.bounds.min[2] + e.bounds.max[2]) / 2];
  return (
    <Html position={pos} center zIndexRange={[14, 13]} style={{ pointerEvents: 'none' }}>
      <ManagedLabel position={pos} priority={0} className="selected-tag">
        {e.name}
      </ManagedLabel>
    </Html>
  );
}

