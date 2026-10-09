import { useMemo } from 'react';
import type { Rect } from '../../config/factoryConfig';
import { factoryConfig } from '../../config/factoryConfig';
import { FLOOR_Y } from '../../lib/lineLayout';
import { GeoBuilder, type MatKey } from '../../three/GeoBuilder';
import { Built, Selectable } from '../common/Built';
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
  doors: WarehouseDoor[];
  /** qo‘shimcha past qanot (L-shakl) */
  wing?: Rect;
  cladding?: MatKey;
}

/**
 * Sanoat binosi (masterplandagi qo‘shni binolar): sendvich-panel devorlar, yopiq rolikli darvozalar, tom.
 * Vazifasi ko‘rsatilmagani uchun nom va ichki jihozlar yo‘q; tomi doimo yopiq (kesim rejimida ham).
 */
export function Warehouse(p: WarehouseProps) {
  const parts = useMemo(() => build(p), [p]);
  return (
    <Selectable id={p.id}>
      <group name={p.id}>
        <Built parts={parts.shell} />
        <Built parts={parts.glass} castShadow={false} />
        <Built parts={parts.roof} />
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

  void factoryConfig;
  void interior;
  return { shell: shell.build(), glass: glass.build(), roof: roof.build() };
}

/** Masterplandagi asosiy bino yonidagi ikki bino — nomsiz, tomi yopiq */
export function NeighborBuildings() {
  const list = useMemo(
    () =>
      factoryConfig.neighborBuildings.map<WarehouseProps>((b) => ({
        id: b.id,
        rect: b.rect,
        wing: b.wing,
        height: b.height,
        doors: [
          { face: 'north', at: b.rect.x0 + (b.rect.x1 - b.rect.x0) * 0.3, width: 4.5, height: 5, open: 0 },
          { face: 'north', at: b.rect.x0 + (b.rect.x1 - b.rect.x0) * 0.7, width: 4.5, height: 5, open: 0 },
        ],
      })),
    [],
  );
  return (
    <group name="NeighborBuildings">
      {list.map((p) => (
        <Warehouse key={p.id} {...p} />
      ))}
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
