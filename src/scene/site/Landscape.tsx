import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { factoryConfig } from '../../config/factoryConfig';
import { roadFrame, siteNorthZ } from '../../lib/layout';
import { GeoBuilder } from '../../three/GeoBuilder';
import { getMaterials } from '../../three/materials';
import { lightPoolTexture } from '../../three/textures';
import { useStore } from '../../state/store';
import { Built, Selectable } from '../common/Built';

let seed = 7;
const rnd = () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

interface TreeInst {
  x: number;
  z: number;
  s: number;
  kind: 'tree' | 'cypress' | 'shrub';
}

/** Daraxtlar joylashuvi — asosiy fasad va yo‘llarni to‘smaydigan qilib tanlangan */
function treeLayout(): TreeInst[] {
  seed = 7;
  const cfg = factoryConfig;
  const rf = roadFrame();
  const out: TreeInst[] = [];
  const gates = [cfg.site.entryGateX, cfg.site.exitGateX];
  // yo‘l bo‘yidagi daraxtlar (hudud tomoni) — old fasad ko‘rinishini ochiq qoldiramiz
  for (let u = -240; u < 320; u += 11) {
    const p = rf.toWorld(u, rf.sidewalkV + 1.7);
    if (Math.abs(p.x) < 34) continue;
    if (gates.some((g) => Math.abs(p.x - g) < 15)) continue;
    out.push({ x: p.x, z: p.z, s: 0.85 + rnd() * 0.35, kind: u % 2 === 0 ? 'cypress' : 'tree' });
  }
  // yo‘lning narigi tomoni
  for (let u = -400; u < 420; u += 13) {
    const p = rf.toWorld(u, -rf.sidewalkV - 2.2);
    out.push({ x: p.x, z: p.z, s: 0.9 + rnd() * 0.4, kind: 'tree' });
  }
  // hudud chegarasi bo‘ylab
  const { westX, eastX, southZ } = cfg.site;
  for (let z = siteNorthZ(westX) + 6; z < southZ - 3; z += 8) out.push({ x: westX + 3, z, s: 0.8 + rnd() * 0.3, kind: Math.round(z / 8) % 2 ? 'cypress' : 'tree' });
  for (let x = westX + 6; x < eastX - 3; x += 8) out.push({ x, z: southZ - 3, s: 0.8 + rnd() * 0.3, kind: Math.round(x / 8) % 2 ? 'cypress' : 'tree' });
  for (let z = siteNorthZ(eastX) + 6; z < southZ - 3; z += 8) {
    if (z > 86 && z < 108) continue;
    out.push({ x: eastX - 3, z, s: 0.8 + rnd() * 0.3, kind: 'tree' });
  }
  // avtoturargoh orolchalari
  const pk = cfg.site.parking;
  for (let x = pk.x0 + 3; x < pk.x1 - 2; x += 7) {
    out.push({ x, z: pk.z0 + 0.75, s: 0.7 + rnd() * 0.2, kind: 'tree' });
    out.push({ x: x + 3.5, z: pk.z0 + 18.25, s: 0.7 + rnd() * 0.2, kind: 'tree' });
  }
  // yashil maydonlar chetida
  for (const l of cfg.site.lawns) {
    for (let x = l.x0 + 3; x < l.x1 - 2; x += 9) out.push({ x, z: l.z0 + 2, s: 0.75 + rnd() * 0.3, kind: 'tree' });
    for (let x = l.x0 + 2; x < l.x1 - 1; x += 2.2) out.push({ x, z: l.z1 - 0.8, s: 0.6 + rnd() * 0.25, kind: 'shrub' });
  }
  // old landshaft orolchalari (hovli va to‘siq orasida) — faqat past butalar markazda
  for (let x = -44; x < 2; x += 1.9) {
    const z = siteNorthZ(x) + 3.2;
    if (z > -41) continue;
    out.push({ x, z, s: 0.55 + rnd() * 0.25, kind: 'shrub' });
    if (x < -26 && Math.round(x) % 3 === 0) out.push({ x, z: z + 3, s: 0.8, kind: 'tree' });
  }
  for (let x = 15; x < 26; x += 1.8) out.push({ x, z: siteNorthZ(x) + 3.2, s: 0.55 + rnd() * 0.2, kind: 'shrub' });
  // orqa tomonda
  for (let x = -40; x < 30; x += 7) out.push({ x, z: cfg.building.totalLength + 12, s: 0.8 + rnd() * 0.3, kind: 'tree' });
  // uzoqdagi o‘rmon (gorizontni to‘ldiradi)
  for (let i = 0; i < 420; i++) {
    const a = rnd() * Math.PI * 2;
    const r = 260 + Math.pow(rnd(), 0.7) * 520;
    const x = 60 + Math.cos(a) * r;
    const z = 40 + Math.sin(a) * r;
    const loc = rf.toLocal(x, z);
    if (Math.abs(loc.v) < 26) continue;
    out.push({ x, z, s: 1.1 + rnd() * 0.9, kind: rnd() > 0.85 ? 'cypress' : 'tree' });
  }
  return out;
}

/** Daraxt tojini tabiiyroq qilish uchun uchlarini tasodifiy siljitish (bir marta) */
function jitter(g: THREE.BufferGeometry, k: number) {
  const pos = g.getAttribute('position') as THREE.BufferAttribute;
  const map = new Map<string, number>();
  let s = 11;
  const r = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
  for (let i = 0; i < pos.count; i++) {
    const key = `${pos.getX(i).toFixed(3)}|${pos.getY(i).toFixed(3)}|${pos.getZ(i).toFixed(3)}`;
    let f = map.get(key);
    if (f === undefined) {
      f = 1 + (r() - 0.5) * 2 * k;
      map.set(key, f);
    }
    pos.setXYZ(i, pos.getX(i) * f, pos.getY(i) * f * (pos.getY(i) < 0 ? 0.75 : 1), pos.getZ(i) * f);
  }
  g.computeVertexNormals();
  return g;
}

function InstancedTrees({ items }: { items: TreeInst[] }) {
  const mats = getMaterials();
  const trees = items.filter((t) => t.kind === 'tree');
  const cyp = items.filter((t) => t.kind === 'cypress');
  const shrubs = items.filter((t) => t.kind === 'shrub');
  const geos = useMemo(
    () => ({
      crown: jitter(new THREE.IcosahedronGeometry(1, 2), 0.16),
      trunk: new THREE.CylinderGeometry(0.12, 0.2, 1, 6),
      cone: new THREE.ConeGeometry(1, 1, 8),
      shrub: new THREE.IcosahedronGeometry(1, 0),
    }),
    [],
  );
  useEffect(() => () => Object.values(geos).forEach((g) => g.dispose()), [geos]);
  const crown = useRef<THREE.InstancedMesh>(null);
  const crown2 = useRef<THREE.InstancedMesh>(null);
  const trunk = useRef<THREE.InstancedMesh>(null);
  const cone = useRef<THREE.InstancedMesh>(null);
  const shrub = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    seed = 99;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const c = new THREE.Color();
    const greens = ['#4d6a33', '#5a7537', '#43602e', '#66803f', '#506b31'];
    trees.forEach((t, i) => {
      const h = 7 * t.s;
      q.setFromEuler(new THREE.Euler(0, rnd() * 6, 0));
      m.compose(new THREE.Vector3(t.x, h * 0.32, t.z), q, new THREE.Vector3(1.2 * t.s, h * 0.64, 1.2 * t.s));
      trunk.current?.setMatrixAt(i, m);
      m.compose(new THREE.Vector3(t.x, h * 0.72, t.z), q, new THREE.Vector3(2.6 * t.s, 2.3 * t.s, 2.6 * t.s));
      crown.current?.setMatrixAt(i, m);
      m.compose(new THREE.Vector3(t.x + 0.6 * t.s, h * 0.9, t.z - 0.4 * t.s), q, new THREE.Vector3(1.7 * t.s, 1.6 * t.s, 1.7 * t.s));
      crown2.current?.setMatrixAt(i, m);
      c.set(greens[i % greens.length]).multiplyScalar(0.85 + rnd() * 0.3);
      crown.current?.setColorAt(i, c);
      crown2.current?.setColorAt(i, c.multiplyScalar(1.08));
    });
    cyp.forEach((t, i) => {
      const h = 7.5 * t.s;
      m.compose(new THREE.Vector3(t.x, h / 2 + 0.3, t.z), q.identity(), new THREE.Vector3(0.95 * t.s, h, 0.95 * t.s));
      cone.current?.setMatrixAt(i, m);
      c.set('#34502a').multiplyScalar(0.85 + rnd() * 0.3);
      cone.current?.setColorAt(i, c);
    });
    shrubs.forEach((t, i) => {
      q.setFromEuler(new THREE.Euler(0, rnd() * 6, 0));
      m.compose(new THREE.Vector3(t.x, 0.45 * t.s, t.z), q, new THREE.Vector3(1.1 * t.s, 0.8 * t.s, 1.1 * t.s));
      shrub.current?.setMatrixAt(i, m);
      c.set(rnd() > 0.5 ? '#4b6b30' : '#5c7836').multiplyScalar(0.85 + rnd() * 0.3);
      shrub.current?.setColorAt(i, c);
    });
    for (const r of [crown, crown2, trunk, cone, shrub]) {
      if (!r.current) continue;
      r.current.instanceMatrix.needsUpdate = true;
      if (r.current.instanceColor) r.current.instanceColor.needsUpdate = true;
      r.current.computeBoundingSphere();
    }
  }, [trees, cyp, shrubs]);

  return (
    <group name="Trees">
      <instancedMesh ref={trunk} args={[geos.trunk, mats.treeTrunk, trees.length]} castShadow />
      <instancedMesh ref={crown} args={[geos.crown, mats.treeCrown, trees.length]} castShadow receiveShadow />
      <instancedMesh ref={crown2} args={[geos.crown, mats.treeCrown, trees.length]} castShadow receiveShadow />
      <instancedMesh ref={cone} args={[geos.cone, mats.cypress, cyp.length]} castShadow receiveShadow />
      <instancedMesh ref={shrub} args={[geos.shrub, mats.shrub, shrubs.length]} castShadow receiveShadow />
    </group>
  );
}

/** Chiroq ustunlari joylashuvi */
function lampPositions(): { x: number; z: number; rot: number }[] {
  const cfg = factoryConfig;
  const out: { x: number; z: number; rot: number }[] = [];
  const W = cfg.building.width / 2;
  for (let z = 4; z < cfg.building.totalLength; z += 24) out.push({ x: -W - 6.5, z, rot: 0 });
  for (let x = 40; x < 136; x += 20) if (![50, 116, 92].some((a) => Math.abs(a - x) < 4)) out.push({ x, z: 21.5, rot: Math.PI / 2 });
  for (let z = -30; z < 4; z += 16) out.push({ x: 24, z, rot: Math.PI });
  for (let x = cfg.site.parking.x0 + 6; x < cfg.site.parking.x1; x += 14) out.push({ x, z: cfg.site.parking.z0 + 18.25, rot: Math.PI / 2 });
  out.push({ x: cfg.site.exitGateX + 7.5, z: siteNorthZ(cfg.site.exitGateX) + 3, rot: Math.PI });
  out.push({ x: -24, z: -38, rot: 0 });
  for (let z = 76; z < cfg.building.totalLength; z += 24) out.push({ x: 23, z, rot: Math.PI });
  return out;
}

/** To‘siq, KPP, chiroqlar va turargohdagi avtomobillar */
function SiteFurniture() {
  const lighting = useStore((s) => s.lighting);
  const lamps = useMemo(lampPositions, []);
  const parts = useMemo(() => {
    const cfg = factoryConfig;
    const b = new GeoBuilder();
    /* ---- to‘siq: beton ustunlar + metall panellar ---- */
    const bay = 3;
    const fenceSeg = (ax: number, az: number, bx: number, bz: number) => {
      const len = Math.hypot(bx - ax, bz - az);
      const n = Math.max(1, Math.round(len / bay));
      const rot = -Math.atan2(bz - az, bx - ax);
      for (let i = 0; i <= n; i++) {
        const x = ax + ((bx - ax) * i) / n;
        const z = az + ((bz - az) * i) / n;
        b.add('paintWhite', new THREE.BoxGeometry(0.35, 2.1, 0.35), [x, 1.05, z], [0, rot, 0]);
        b.add('paintWhite', new THREE.BoxGeometry(0.42, 0.08, 0.42), [x, 2.12, z], [0, rot, 0]);
        if (i === n) break;
        const mx = ax + ((bx - ax) * (i + 0.5)) / n;
        const mz = az + ((bz - az) * (i + 0.5)) / n;
        const seg = len / n - 0.35;
        b.add('concreteDark', new THREE.BoxGeometry(seg, 0.4, 0.2), [mx, 0.2, mz], [0, rot, 0]);
        b.add('aluDark', new THREE.BoxGeometry(seg, 0.05, 0.05), [mx, 1.85, mz], [0, rot, 0]);
        b.add('aluDark', new THREE.BoxGeometry(seg, 0.05, 0.05), [mx, 0.5, mz], [0, rot, 0]);
        const bars = 7;
        for (let k = 0; k < bars; k++) {
          const t = (k + 0.5) / bars - 0.5;
          const ox = Math.cos(-rot) * t * seg;
          const oz = Math.sin(-rot) * t * seg;
          b.add('aluDark', new THREE.BoxGeometry(0.025, 1.45, 0.025), [mx + ox, 1.17, mz + oz], [0, rot, 0]);
        }
      }
    };
    const { westX, eastX, southZ, entryGateX, exitGateX, gateWidth } = cfg.site;
    const gh = gateWidth / 2 + 1.5;
    const nz = (x: number) => siteNorthZ(x);
    fenceSeg(westX, nz(westX), entryGateX - gh, nz(entryGateX - gh));
    fenceSeg(entryGateX + gh, nz(entryGateX + gh), exitGateX - gh, nz(exitGateX - gh));
    fenceSeg(exitGateX + gh, nz(exitGateX + gh), eastX, nz(eastX));
    fenceSeg(westX, nz(westX), westX, southZ);
    fenceSeg(westX, southZ, eastX, southZ);
    fenceSeg(eastX, nz(eastX), eastX, southZ);
    // darvoza ustunlari va surma darvozalar (ochiq holatda)
    for (const gx of [entryGateX, exitGateX]) {
      for (const s of [-1, 1]) {
        const x = gx + s * gh;
        b.box('paintDark', [x, 1.4, nz(x)], [0.5, 2.8, 0.5]);
      }
      b.box('aluDark', [gx - gh - 5, 1.1, nz(gx - gh - 5) + 0.6], [9, 1.8, 0.08]);
      // shlagbaum
      const bx = gx + gh - 1.2;
      const bz = nz(bx) + 4;
      b.box('paintGrey', [bx, 0.55, bz], [0.4, 1.1, 0.4]);
      for (let k = 0; k < 6; k++) b.add(k % 2 ? 'paintWhite' : 'paintRed', new THREE.BoxGeometry(0.1, 0.95, 0.1), [bx, 1.6 + k * 0.95, bz], [0, 0, 0.15]);
    }
    /* ---- KPP (nazorat-o‘tkazish punkti) ---- */
    {
      // KPP old fasad o‘qidan chetroqda (old ko‘rinishni to‘smasligi uchun)
      const x = entryGateX - gh - 14;
      const z = nz(x) + 4.2;
      b.boxMinMax('concreteDark', x - 2.2, 0, z - 2.7, x + 2.2, 0.25, z + 2.7);
      b.boxMinMax('claddingLight', x - 1.8, 0.25, z - 2.3, x + 1.8, 1.1, z + 2.3);
      b.boxMinMax('glassTint', x - 1.8, 1.1, z - 2.3, x + 1.8, 2.5, z + 2.3);
      b.boxMinMax('aluDark', x - 2.4, 2.5, z - 2.9, x + 2.4, 2.85, z + 2.9);
    }
    /* ---- chiroq ustunlari ---- */
    for (const l of lamps) {
      const h = 9;
      b.box('concreteDark', [l.x, 0.25, l.z], [0.6, 0.5, 0.6]);
      b.cyl('galvanized', [l.x, h / 2, l.z], 0.09, h, 'y', 10, 0.06);
      const dx = Math.cos(l.rot) * 1.1;
      const dz = -Math.sin(l.rot) * 1.1;
      b.beam('galvanized', [l.x, h - 0.2, l.z], [l.x + dx, h, l.z + dz], 0.06);
      b.box('aluDark', [l.x + dx * 1.2, h - 0.02, l.z + dz * 1.2], [0.7, 0.1, 0.35]);
      b.box('lampWarm', [l.x + dx * 1.2, h - 0.08, l.z + dz * 1.2], [0.6, 0.02, 0.28]);
    }
    /* ---- binolar devoridagi chiroqlar ---- */
    const W = cfg.building.width / 2;
    for (let z = 6; z < cfg.building.totalLength; z += 12) {
      b.box('lampWarm', [-W - 0.15, 4.0, z], [0.12, 0.18, 0.5]);
      b.box('lampWarm', [W + 0.15, 4.0, z], [0.12, 0.18, 0.5]);
    }
    return b.build();
  }, [lamps]);

  /* ---- tungi yorug‘lik dog‘lari ---- */
  const pools = useRef<THREE.InstancedMesh>(null);
  const poolGeo = useMemo(() => new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), []);
  const poolMat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: lightPoolTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
    [],
  );
  useEffect(() => () => {
    poolGeo.dispose();
    poolMat.dispose();
  }, [poolGeo, poolMat]);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    lamps.forEach((l, i) => {
      const dx = Math.cos(l.rot) * 1.3;
      const dz = -Math.sin(l.rot) * 1.3;
      m.compose(new THREE.Vector3(l.x + dx, 0.2, l.z + dz), new THREE.Quaternion(), new THREE.Vector3(18, 1, 18));
      pools.current?.setMatrixAt(i, m);
    });
    if (pools.current) pools.current.instanceMatrix.needsUpdate = true;
  }, [lamps]);
  poolMat.opacity = lighting === 'night' ? 0.9 : lighting === 'sunset' ? 0.35 : 0;

  return (
    <group name="SiteFurniture">
      <Built parts={parts} />
      <instancedMesh ref={pools} args={[poolGeo, poolMat, lamps.length]} visible={lighting !== 'day'} frustumCulled={false} renderOrder={1} />
      <Selectable id="site-gate">
        <mesh visible={false} position={[factoryConfig.site.entryGateX - 6, 1.5, siteNorthZ(factoryConfig.site.entryGateX) + 4]}>
          <boxGeometry args={[14, 3, 9]} />
        </mesh>
      </Selectable>
      <Selectable id="site-exit">
        <mesh visible={false} position={[factoryConfig.site.exitGateX, 1.5, siteNorthZ(factoryConfig.site.exitGateX) + 3]}>
          <boxGeometry args={[14, 3, 6]} />
        </mesh>
      </Selectable>
    </group>
  );
}

/** Turargohdagi avtomobillar (instancing) */
function ParkedCars() {
  const cars = useMemo(() => {
    const pk = factoryConfig.site.parking;
    const rows = [pk.z0 + 4, pk.z0 + 15, pk.z0 + 21.5];
    const out: { x: number; z: number; c: string }[] = [];
    const colors = ['#e8e9eb', '#1f2328', '#8a9097', '#c9ccd1', '#3a4a5c', '#7b1c1c', '#d8d4cc'];
    let s = 3;
    for (const z of rows)
      for (let x = pk.x0 + 2.25; x < pk.x1 - 1; x += 2.5) {
        s = (s * 7 + 3) % 11;
        if (s % 3 === 0) continue;
        out.push({ x, z, c: colors[(s + Math.round(x)) % colors.length] });
      }
    return out;
  }, []);
  const body = useRef<THREE.InstancedMesh>(null);
  const cabin = useRef<THREE.InstancedMesh>(null);
  const geos = useMemo(() => ({ body: new THREE.BoxGeometry(1.8, 0.75, 4.4), cabin: new THREE.BoxGeometry(1.6, 0.55, 2.3) }), []);
  useEffect(() => () => Object.values(geos).forEach((g) => g.dispose()), [geos]);
  const bodyMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: 0.6, roughness: 0.35 }), []);
  useEffect(() => () => bodyMat.dispose(), [bodyMat]);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const c = new THREE.Color();
    cars.forEach((car, i) => {
      m.makeTranslation(car.x, 0.62, car.z);
      body.current?.setMatrixAt(i, m);
      body.current?.setColorAt(i, c.set(car.c));
      m.makeTranslation(car.x, 1.25, car.z + 0.2);
      cabin.current?.setMatrixAt(i, m);
    });
    for (const r of [body, cabin]) if (r.current) r.current.instanceMatrix.needsUpdate = true;
    if (body.current?.instanceColor) body.current.instanceColor.needsUpdate = true;
  }, [cars]);
  return (
    <group name="ParkedCars">
      <instancedMesh ref={body} args={[geos.body, bodyMat, cars.length]} castShadow receiveShadow />
      <instancedMesh ref={cabin} args={[geos.cabin, getMaterials().glassDark, cars.length]} castShadow />
    </group>
  );
}

export function Landscape() {
  const visible = useStore((s) => s.layers.landscape);
  const items = useMemo(treeLayout, []);
  return (
    <group name="Landscape">
      {visible && <InstancedTrees items={items} />}
      <SiteFurniture />
      <ParkedCars />
    </group>
  );
}
