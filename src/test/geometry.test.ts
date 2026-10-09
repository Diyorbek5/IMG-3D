import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { factoryConfig } from '../config/factoryConfig';
import { dimensionSpecs } from '../lib/dimensions';
import { frontYardRect, getSegments, rollerDoors, segmentsTotalLength, showroomRect } from '../lib/layout';
import { runChecks } from '../lib/validation';
import { buildMainShell } from '../scene/building/shellBuilders';
import type { BuiltPart } from '../three/GeoBuilder';

/** Uchburchak markazi predikatga mos keladigan yuzalarning maksimal balandligi */
function maxY(parts: BuiltPart[], key: string, pred: (x: number, z: number) => boolean) {
  let m = -Infinity;
  for (const p of parts) {
    if (p.key !== key) continue;
    const pos = p.geometry.getAttribute('position');
    for (let i = 0; i + 2 < pos.count; i += 3) {
      const cx = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3;
      const cz = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3;
      if (pred(cx, cz)) m = Math.max(m, pos.getY(i), pos.getY(i + 1), pos.getY(i + 2));
    }
  }
  return m;
}

function bounds(parts: BuiltPart[], key: string) {
  const b = new THREE.Box3();
  for (const p of parts) if (p.key === key) b.union(p.geometry.boundingBox!);
  return b;
}

describe('bino o‘lchamlari (konfiguratsiya)', () => {
  it('umumiy uzunlik 125 m saqlangan, 30 m alohida zona', () => {
    expect(factoryConfig.building.totalLength).toBe(125);
    expect(segmentsTotalLength()).toBe(125);
    const segs = getSegments();
    const byId = Object.fromEntries(segs.map((s) => [s.id, s]));
    expect(byId.front.length).toBe(10);
    expect(byId.front.height).toBe(12);
    expect(byId.production.length).toBe(75);
    expect(byId.production.height).toBe(5);
    expect(byId.rear.length).toBe(10);
    expect(byId.rear.height).toBe(8);
    expect(byId.rear.floors).toBe(2);
    expect(byId.tbd.length).toBe(30);
    expect(byId.tbd.lengthStatus).toBe('unconfirmed');
  });

  it('showroom 9 × 15 m, 3 ta darvoza, 40 × 40 m hovli', () => {
    const r = showroomRect();
    expect(r.x1 - r.x0).toBe(9);
    expect(r.z1 - r.z0).toBe(15);
    expect(rollerDoors()).toHaveLength(3);
    const y = frontYardRect();
    expect(y.x1 - y.x0).toBe(40);
    expect(y.z1 - y.z0).toBe(40);
  });

  it('barcha texnik tekshiruvlar o‘tadi', () => {
    for (const c of runChecks()) expect(c.ok, `${c.label}: ${c.detail}`).toBe(true);
  });
});

describe('3D geometriya haqiqiy metrlarda', () => {
  const p = buildMainShell();
  const shell = p.shell.build();
  const upper = p.upper.build();
  const all = [...shell, ...upper];

  it('fasad panellari 40 × 125 m konturda', () => {
    const b = bounds(all, 'cladding');
    expect(b.min.x).toBeCloseTo(-20, 3);
    expect(b.max.x).toBeCloseTo(20, 3);
    expect(b.min.z).toBeCloseTo(0, 3);
    expect(b.max.z).toBeCloseTo(125, 3);
    expect(b.max.y).toBeCloseTo(12, 3);
  });

  it('segmentlar balandligi geometriyada: 12 / 12 / 5 / 8 m', () => {
    for (const s of getSegments()) {
      const h = maxY(all, 'cladding', (x, z) => Math.abs(x) > 19.7 && z > s.z0 + 0.5 && z < s.z1 - 0.5);
      expect(h, s.id).toBeCloseTo(s.height, 3);
    }
  });

  it('oxirgi qism ikki qavatli: qavatlararo plita mavjud', () => {
    const slab = bounds(upper, 'concrete');
    expect(slab.max.y).toBeCloseTo(factoryConfig.building.rearFirstFloorHeight, 3);
    expect(slab.min.z).toBeGreaterThanOrEqual(115);
  });

  it('shisha burchak: old va yon fasadda vitraj', () => {
    const glass = p.glass.build();
    const b = bounds(glass, 'glass');
    // sharqiy burchak (x = 11…20), old fasad (z ≈ 0) va yon fasad (z 0…10)
    expect(b.max.x).toBeCloseTo(20, 1);
    expect(b.min.x).toBeLessThanOrEqual(11.01);
    expect(b.max.z).toBeGreaterThanOrEqual(9.9);
  });
});

describe('o‘lcham chiziqlari geometriyadan hisoblanadi', () => {
  const specs = Object.fromEntries(dimensionSpecs().map((d) => [d.id, d]));
  it.each([
    ['bld-width', 40],
    ['bld-length', 125],
    ['front-height', 12],
    ['yard-w', 40],
    ['yard-d', 40],
    ['len-front', 10],
    ['len-tbd', 30],
    ['len-production', 75],
    ['len-rear', 10],
    ['h-production', 5],
    ['h-rear', 8],
    ['sr-width', 9],
    ['sr-depth', 15],
  ])('%s = %d m', (id, v) => {
    expect(specs[id].value).toBeCloseTo(v as number, 6);
  });
  it('tasdiqlanmagan qiymatlar ≈ bilan belgilanadi', () => {
    expect(specs['len-tbd'].status).not.toBe('confirmed');
    expect(specs['sr-height'].status).not.toBe('confirmed');
  });
});
