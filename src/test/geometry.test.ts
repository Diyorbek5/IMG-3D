import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { factoryConfig } from '../config/factoryConfig';
import { dimensionSpecs } from '../lib/dimensions';
import { getSegments, rollerDoors, segmentsTotalLength, showroomRect } from '../lib/layout';
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
  it('umumiy uzunlik 125 m: omborlar 40 + ishlab chiqarish 75 + oxirgi qism 10', () => {
    expect(factoryConfig.building.totalLength).toBe(125);
    expect(segmentsTotalLength()).toBe(125);
    const segs = getSegments();
    const byId = Object.fromEntries(segs.map((s) => [s.id, s]));
    expect(byId.front.length).toBe(40);
    expect(byId.front.height).toBe(12);
    expect(byId.production.length).toBe(75);
    expect(byId.production.height).toBe(5);
    expect(byId.rear.length).toBe(10);
    expect(byId.rear.height).toBe(8);
    expect(byId.rear.floors).toBe(2);
    expect(segs.map((s) => s.id)).toEqual(['front', 'production', 'rear']);
  });

  it('showroom 9 × 15 × 6 m old fasadning o‘ng tomonida (x < 0), 3 ta darvoza', () => {
    const r = showroomRect();
    expect(r.x1 - r.x0).toBe(9);
    expect(r.z1 - r.z0).toBe(15);
    expect(factoryConfig.showroom.height).toBe(6);
    expect(r.x1).toBeLessThanOrEqual(0);
    expect(rollerDoors()).toHaveLength(3);
  });

  it('omborlar maydoni 40 × 40 m ikkiga bo‘lingan', () => {
    const front = getSegments()[0];
    expect(front.length).toBe(40);
    expect(factoryConfig.building.width).toBe(40);
    const px = factoryConfig.building.frontPartitionX;
    expect(px).toBeGreaterThan(-20);
    expect(px).toBeLessThan(20);
  });

  it('oxirgi qismda talab qilingan xonalar bor', () => {
    const names = factoryConfig.rearRooms.map((r) => r.name.toLowerCase()).join(' | ');
    expect(names).toContain('oshxona');
    expect(names).toContain('ishlab chiqarish rahbari');
    expect(names).toContain('texnik xona');
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

  it('old fasad to‘liq shisha (40 m bo‘ylab), yon fasad (xomashyo ombori) yopiq', () => {
    const glass = p.glass.build();
    // old fasaddagi shisha (z ≈ 0) qamrovi
    let minX = Infinity;
    let maxX = -Infinity;
    let maxY = 0;
    let sideMaxZ = 0;
    for (const part of glass) {
      if (part.key !== 'glass') continue;
      const pos = part.geometry.getAttribute('position');
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const z = pos.getZ(i);
        if (Math.abs(z) < 0.1) {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, pos.getY(i));
        }
        if (x < -19.9) sideMaxZ = Math.max(sideMaxZ, z);
      }
    }
    expect(minX).toBeLessThan(-19.5);
    expect(maxX).toBeGreaterThan(19.5);
    expect(maxY).toBeCloseTo(12 - factoryConfig.building.parapetHeight, 2);
    // yon devorda vitraj yo‘q — faqat old fasad burchagidagi shisha (z ≈ 0)
    expect(sideMaxZ).toBeLessThan(0.5);
  });

  it('quyosh panellari faqat ishlab chiqarish zonasi tomining yarmida', () => {
    const roof = p.roof.build();
    const b = bounds(roof, 'solar');
    expect(b.isEmpty()).toBe(false);
    const east = factoryConfig.solar.side === 'east';
    if (east) expect(b.min.x).toBeGreaterThanOrEqual(0);
    else expect(b.max.x).toBeLessThanOrEqual(0);
    expect(b.max.x - b.min.x).toBeGreaterThan(17);
    const prod = getSegments().find((s) => s.id === 'production')!;
    expect(b.min.z).toBeGreaterThanOrEqual(prod.z0);
    expect(b.max.z).toBeLessThanOrEqual(prod.z1);
  });
});

describe('o‘lcham chiziqlari geometriyadan hisoblanadi', () => {
  const specs = Object.fromEntries(dimensionSpecs().map((d) => [d.id, d]));
  it.each([
    ['bld-width', 40],
    ['bld-length', 125],
    ['front-height', 12],
    ['len-front', 40],
    ['len-production', 75],
    ['len-rear', 10],
    ['h-production', 5],
    ['h-rear', 8],
    ['sr-width', 9],
    ['sr-depth', 15],
    ['sr-height', 6],
  ])('%s = %d m', (id, v) => {
    expect(specs[id].value).toBeCloseTo(v as number, 6);
  });
  it('tasdiqlanmagan qiymatlar ≈ bilan belgilanadi', () => {
    expect(specs['w-raw'].status).not.toBe('confirmed');
    expect(specs['rear-f1'].status).not.toBe('confirmed');
    expect(specs['len-front'].status).toBe('confirmed');
  });
});
