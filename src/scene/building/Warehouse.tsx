import { useMemo } from 'react';
import type { Rect } from '../../config/factoryConfig';
import { factoryConfig } from '../../config/factoryConfig';
import { FLOOR_Y } from '../../lib/lineLayout';
import { GeoBuilder, type MatKey } from '../../three/GeoBuilder';
import { signTexture } from '../../three/textures';
import { useStore } from '../../state/store';
import { Built, Selectable } from '../common/Built';
import { addAFrame, addCrate } from './FrontBlockInterior';
import { curtainWall, wallWithHoles, type Hole } from './shellBuilders';

export interface WarehouseDoor {
  face: 'north' | 'south' | 'east' | 'west';
  /** fasad bo‘ylab markaz koordinatasi */
  at: number;
  width: number;
  height: number;
  /** 0 — yopiq, 1 — to‘liq ochiq (statik) */
  open: number;
}

interface WarehouseProps {
  id: string;
  rect: Rect;
  height: number;
  sign: string;
  signFace: 'north' | 'west' | 'east';
  doors: WarehouseDoor[];
  /** qo‘shimcha past qanot (L-shakl) */
  wing?: Rect;
  content: 'raw' | 'finished';
  cladding?: MatKey;
}

/** Sanoat ombori — sendvich-panel devorlar, rolikli darvozalar, tom, ichki stellajlar */
export function Warehouse(p: WarehouseProps) {
  const roofs = useStore((s) => s.layers.roofs);
  const parts = useMemo(() => build(p), [p]);
  const r = p.rect;
  const signTex = signTexture(p.sign.toUpperCase(), { bg: '#1d1f22', fg: '#ffffff', w: 2048, h: 220, weight: 700 });
  const signW = Math.min(r.x1 - r.x0, r.z1 - r.z0) * 0.6;
  const signPos: [number, number, number] =
    p.signFace === 'north'
      ? [(r.x0 + r.x1) / 2, p.height - 1.6, (p.wing ? Math.min(p.wing.z0, r.z0) : r.z0) - 0.08]
      : p.signFace === 'west'
        ? [r.x0 - 0.08, p.height - 1.6, (r.z0 + r.z1) / 2]
        : [r.x1 + 0.08, p.height - 1.6, (r.z0 + r.z1) / 2];
  const signRot = p.signFace === 'north' ? Math.PI : p.signFace === 'west' ? -Math.PI / 2 : Math.PI / 2;
  const signX = p.signFace === 'north' && p.wing ? (Math.max(p.wing.x1, r.x0) + r.x1) / 2 : signPos[0];
  return (
    <Selectable id={p.id}>
      <group name={p.id}>
        <Built parts={parts.shell} />
        <Built parts={parts.glass} castShadow={false} />
        <Built parts={parts.interior} />
        {roofs && <Built parts={parts.roof} dispose={false} />}
        <mesh position={[p.signFace === 'north' && p.wing ? signX : signPos[0], signPos[1], p.signFace === 'north' ? r.z0 - 0.08 : signPos[2]]} rotation={[0, signRot, 0]}>
          <planeGeometry args={[signW, (signW * 220) / 2048]} />
          <meshStandardMaterial map={signTex} roughness={0.5} metalness={0.2} polygonOffset polygonOffsetFactor={-2} />
        </mesh>
      </group>
    </Selectable>
  );
}

function build(p: WarehouseProps) {
  const shell = new GeoBuilder();
  const glass = new GeoBuilder();
  const roof = new GeoBuilder();
  const interior = new GeoBuilder();
  const t = 0.22;
  const clad = p.cladding ?? 'cladding';
  const blocks: { rect: Rect; height: number }[] = [{ rect: p.rect, height: p.height }];
  if (p.wing) blocks.push({ rect: p.wing, height: p.height - 1.5 });

  blocks.forEach(({ rect: r, height: H }, bi) => {
    const isWing = bi === 1;
    shell.boxMinMax('concreteDark', r.x0 - 0.05, -0.3, r.z0 - 0.05, r.x1 + 0.05, FLOOR_Y, r.z1 + 0.05);
    interior.boxMinMax('floor', r.x0 + t, FLOOR_Y - 0.02, r.z0 + t, r.x1 - t, FLOOR_Y + 0.001, r.z1 - t);
    const faces: { face: WarehouseDoor['face']; axis: 'x' | 'z'; fixed: number; inward: 1 | -1; a0: number; a1: number }[] = [
      { face: 'north', axis: 'x', fixed: r.z0, inward: 1, a0: r.x0, a1: r.x1 },
      { face: 'south', axis: 'x', fixed: r.z1, inward: -1, a0: r.x0, a1: r.x1 },
      { face: 'west', axis: 'z', fixed: r.x0, inward: 1, a0: r.z0, a1: r.z1 },
      { face: 'east', axis: 'z', fixed: r.x1, inward: -1, a0: r.z0, a1: r.z1 },
    ];
    for (const f of faces) {
      // qanot asosiy binoga tutashgan devorni qurmaymiz
      if (isWing && f.face === 'south') continue;
      const holes: Hole[] = [];
      const doors = p.doors.filter((d) => d.face === f.face && d.at > f.a0 && d.at < f.a1);
      for (const d of doors) {
        holes.push({ a0: d.at - d.width / 2, a1: d.at + d.width / 2, y0: 0, y1: d.height });
        const out = -f.inward;
        const dz = (v: number) => f.fixed + out * v;
        // darvoza: baraban qutisi, relslar, qisman ko‘tarilgan polotno
        const curtainH = (1 - d.open) * d.height;
        if (f.axis === 'x') {
          shell.box('galvanized', [d.at, d.height + 0.35, dz(0.3)], [d.width + 0.5, 0.7, 0.6]);
          for (const s of [-1, 1]) shell.box('galvanized', [d.at + s * (d.width / 2 + 0.06), d.height / 2, dz(0.1)], [0.14, d.height, 0.16]);
          if (curtainH > 0.05) shell.box('shutter', [d.at, d.height - curtainH / 2, dz(0.06)], [d.width, curtainH, 0.05]);
          shell.box('aluDark', [d.at, d.height + 0.95, dz(0.85)], [d.width + 1.6, 0.12, 1.7]);
        } else {
          shell.box('galvanized', [dz(0.3), d.height + 0.35, d.at], [0.6, 0.7, d.width + 0.5]);
          for (const s of [-1, 1]) shell.box('galvanized', [dz(0.1), d.height / 2, d.at + s * (d.width / 2 + 0.06)], [0.16, d.height, 0.14]);
          if (curtainH > 0.05) shell.box('shutter', [dz(0.06), d.height - curtainH / 2, d.at], [0.05, curtainH, d.width]);
          shell.box('aluDark', [dz(0.85), d.height + 0.95, d.at], [1.7, 0.12, d.width + 1.6]);
        }
        // to‘xtatgich ustunchalar
        for (const s of [-1, 1]) {
          const pa = d.at + s * (d.width / 2 + 0.45);
          if (f.axis === 'x') shell.cyl('paintYellow', [pa, 0.6, dz(0.5)], 0.11, 1.2, 'y', 12);
          else shell.cyl('paintYellow', [dz(0.5), 0.6, pa], 0.11, 1.2, 'y', 12);
        }
      }
      // lenta derazalar (yuqorida)
      const rb: [number, number] = [H - 2.6, H - 1.7];
      const len = f.a1 - f.a0;
      if (len > 14 && !(isWing && f.face !== 'north')) {
        const ra0 = f.a0 + 2;
        const ra1 = f.a1 - 2;
        holes.push({ a0: ra0, a1: ra1, y0: rb[0], y1: rb[1] });
        curtainWall(glass, shell, f.axis, f.fixed + (f.inward > 0 ? -0.04 : 0.04), ra0, ra1, rb[0], rb[1], 1.5, [], { glassKey: 'glassTint', depth: 0.1 });
      }
      wallWithHoles(shell, clad, f.axis, f.fixed, f.inward, f.a0, f.a1, 0.5, H, holes, t);
      wallWithHoles(shell, 'concreteDark', f.axis, f.fixed - f.inward * 0.03, f.inward, f.a0, f.a1, 0, 0.5, holes.filter((h) => h.y0 < 0.5), t + 0.06);
      // vertikal pilastrlar
      for (let a = f.a0 + 6; a < f.a1 - 1; a += 6) {
        if (holes.some((h) => a > h.a0 - 0.3 && a < h.a1 + 0.3 && h.y0 < 1)) continue;
        const out = -f.inward;
        if (f.axis === 'x') shell.box('claddingDark', [a, H / 2, f.fixed + out * 0.04], [0.3, H - 0.6, 0.08]);
        else shell.box('claddingDark', [f.fixed + out * 0.04, H / 2, a], [0.08, H - 0.6, 0.3]);
      }
    }
    // tom va parapet qoplamasi
    roof.boxMinMax('roof', r.x0 + t, H - 1.0, r.z0 + t, r.x1 - t, H - 0.75, r.z1 - t);
    for (const [x0, z0, x1, z1] of [
      [r.x0 - 0.05, r.z0 - 0.05, r.x1 + 0.05, r.z0 + t + 0.05],
      [r.x0 - 0.05, r.z1 - t - 0.05, r.x1 + 0.05, r.z1 + 0.05],
      [r.x0 - 0.05, r.z0, r.x0 + t + 0.05, r.z1],
      [r.x1 - t - 0.05, r.z0, r.x1 + 0.05, r.z1],
    ])
      shell.boxMinMax('aluminium', x0, H - 0.05, z0, x1, H + 0.02, z1);
    // zenit fonarlari
    if (!isWing)
      for (let z = r.z0 + 6; z < r.z1 - 4; z += 10) {
        roof.boxMinMax('glass', r.x0 + 3, H - 0.6, z, r.x1 - 3, H - 0.58, z + 1.6);
      }
    // ichki ustunlar va fermalar
    for (let x = r.x0 + 6; x < r.x1 - 1; x += 6) {
      roof.boxMinMax('steel', x - 0.12, H - 1.6, r.z0 + t, x + 0.12, H - 1.0, r.z1 - t);
    }
    // ichki yoritgichlar
    for (let x = r.x0 + 4; x < r.x1 - 2; x += 8)
      for (let z = r.z0 + 4; z < r.z1 - 2; z += 8) roof.box('lightPanel', [x, H - 1.7, z], [1.2, 0.06, 0.4]);
  });

  /* ---- ichki jihozlar ---- */
  const r = p.rect;
  if (p.content === 'raw') {
    // A-stellaj qatorlari (forklift yo‘laklari bilan)
    for (let z = r.z0 + 10; z < r.z1 - 6; z += 7.5) {
      for (let x = r.x0 + 6; x < r.x1 - 4; x += 8) {
        if (Math.abs(x - (r.x0 + 26)) < 4) continue; // markaziy yo‘lak
        if (z > 40 && z < 50 && x < r.x0 + 24) continue; // galereya yo‘lagi
        addAFrame(interior, glass, x, z, 6.2, 4);
      }
    }
    // pol belgilari: yo‘lak chiziqlari
    interior.boxMinMax('markingYellow', r.x0 + 23.6, FLOOR_Y + 0.001, r.z0 + 1, r.x0 + 23.72, FLOOR_Y + 0.004, r.z1 - 1);
    interior.boxMinMax('markingYellow', r.x0 + 28.3, FLOOR_Y + 0.001, r.z0 + 1, r.x0 + 28.42, FLOOR_Y + 0.004, r.z1 - 1);
  } else {
    // tayyor mahsulot: yashiklar qatorlari va stellajlar
    for (let x = r.x0 + 4; x < r.x1 - 3; x += 4.2) {
      for (let z = r.z0 + 6.5; z < r.z1 - 2; z += 2.6) {
        if (Math.abs(x - 108) < 3.5 || Math.abs(x - 116) < 3) continue; // ichki yo‘laklar
        addCrate(interior, x, z, FLOOR_Y, 2.4, 1.0, 1.9);
        if ((Math.round(x) + Math.round(z)) % 3 !== 0) addCrate(interior, x, z, FLOOR_Y + 1.95, 2.4, 1.0, 1.9);
      }
    }
    // baland stellaj (palet tokchalari)
    for (const z of [r.z1 - 1.2]) {
      for (let x = r.x0 + 2; x < r.x1 - 2; x += 2.8) {
        interior.box('paintBlue', [x, 3, z], [0.1, 6, 1.1]);
      }
      for (const y of [0.15, 2.0, 3.9, 5.8]) interior.box('paintOrange', [(r.x0 + r.x1) / 2, y, z], [r.x1 - r.x0 - 4, 0.12, 1.1]);
    }
    if (p.wing) {
      const w = p.wing;
      addCrate(interior, w.x0 + 3, (w.z0 + r.z0) / 2 + 3, FLOOR_Y, 2.4, 1, 1.9);
    }
  }
  void factoryConfig;
  return { shell: shell.build(), glass: glass.build(), roof: roof.build(), interior: interior.build() };
}

/** Xomashyo ombori + asosiy bino bilan bog‘lovchi yopiq galereya */
export function RawMaterialWarehouse() {
  const rw = factoryConfig.rawWarehouse;
  const props = useMemo<WarehouseProps>(
    () => ({
      id: rw.id,
      rect: rw.rect,
      height: rw.height,
      sign: 'Xomashyo ombori',
      signFace: 'north',
      content: 'raw',
      doors: [
        { face: 'north', at: 50, width: 4.5, height: 5, open: 1 },
        { face: 'north', at: 36, width: 4.5, height: 5, open: 0 },
        { face: 'west', at: (rw.gallery.z0 + rw.gallery.z1) / 2, width: rw.gallery.z1 - rw.gallery.z0 - 0.6, height: rw.gallery.height - 0.8, open: 1 },
      ],
    }),
    [rw],
  );
  const gallery = useMemo(() => {
    const b = new GeoBuilder();
    const g = rw.gallery;
    const x0 = factoryConfig.building.width / 2;
    const x1 = rw.rect.x0;
    b.boxMinMax('cladding', x0, 0.2, g.z0 - 0.2, x1, g.height, g.z0);
    b.boxMinMax('cladding', x0, 0.2, g.z1, x1, g.height, g.z1 + 0.2);
    b.boxMinMax('roof', x0, g.height, g.z0 - 0.3, x1, g.height + 0.25, g.z1 + 0.3);
    b.boxMinMax('aluminium', x0, g.height + 0.25, g.z0 - 0.35, x1, g.height + 0.35, g.z0 - 0.25);
    b.boxMinMax('concrete', x0, 0, g.z0, x1, FLOOR_Y, g.z1);
    return b.build();
  }, [rw]);
  return (
    <group name="RawMaterialWarehouse">
      <Warehouse {...props} />
      <Selectable id={rw.id}>
        <Built parts={gallery} />
      </Selectable>
    </group>
  );
}

export function FinishedGoodsWarehouse() {
  const fw = factoryConfig.finishedWarehouse;
  const props = useMemo<WarehouseProps>(
    () => ({
      id: fw.id,
      rect: fw.rect,
      wing: fw.wing,
      height: fw.height,
      sign: 'Tayyor mahsulotlar ombori',
      signFace: 'north',
      content: 'finished',
      cladding: 'cladding',
      doors: [
        { face: 'north', at: 116, width: 4.5, height: 5, open: 1 },
        { face: 'north', at: 92, width: 4.5, height: 4.5, open: 1 },
        { face: 'north', at: 124, width: 4.5, height: 5, open: 0 },
        { face: 'west', at: 50, width: 4.5, height: 5, open: 0 },
      ],
    }),
    [fw],
  );
  return (
    <group name="FinishedGoodsWarehouse">
      <Warehouse {...props} />
    </group>
  );
}

/** Masterplandagi kichik yordamchi binolar (vazifasi ko‘rsatilmagan) */
export function AuxBuildings() {
  const parts = useMemo(() => {
    const b = new GeoBuilder();
    for (const a of factoryConfig.site.auxBuildings) {
      const r = a.rect;
      b.boxMinMax('concreteDark', r.x0 - 0.05, -0.2, r.z0 - 0.05, r.x1 + 0.05, 0.3, r.z1 + 0.05);
      b.boxMinMax('claddingLight', r.x0, 0.3, r.z0, r.x1, a.height, r.z1);
      b.boxMinMax('aluminium', r.x0 - 0.05, a.height, r.z0 - 0.05, r.x1 + 0.05, a.height + 0.1, r.z1 + 0.05);
      b.boxMinMax('glassTint', r.x0 - 0.02, a.height - 1.6, r.z0 + 1, r.x0, a.height - 0.8, r.z1 - 1);
      b.boxMinMax('shutter', r.x0 - 0.04, 0.3, (r.z0 + r.z1) / 2 - 1.2, r.x0, 2.8, (r.z0 + r.z1) / 2 + 1.2);
    }
    return b.build();
  }, []);
  return (
    <group name="AuxBuildings">
      {factoryConfig.site.auxBuildings.map((a) => (
        <Selectable key={a.id} id={a.id}>
          <mesh visible={false} position={[(a.rect.x0 + a.rect.x1) / 2, a.height / 2, (a.rect.z0 + a.rect.z1) / 2]}>
            <boxGeometry args={[a.rect.x1 - a.rect.x0, a.height, a.rect.z1 - a.rect.z0]} />
          </mesh>
        </Selectable>
      ))}
      <Built parts={parts} />
    </group>
  );
}
