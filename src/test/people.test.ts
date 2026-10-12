import { describe, expect, it } from 'vitest';
import { factoryConfig } from '../config/factoryConfig';
import { getSegment, HALF_W, showroomRect } from '../lib/layout';
import { computeLineLayout } from '../lib/lineLayout';
import { buildPeople, samplePerson, type PersonDef } from '../lib/people';

const people = buildPeople();
const times = Array.from({ length: 600 }, (_, i) => i * 0.5);

describe('odamlar (xodimlar va mehmonlar)', () => {
  it('liniya, omborlar, oshxona, yig‘ilishlar zali, xonalar va showroomda odamlar bor', () => {
    expect(people.length).toBeGreaterThanOrEqual(50);
    const zones = new Set(people.map((p) => p.zone));
    for (const z of ['cutting', 'assembly', 'packing', 'inspection', 'raw-buffer', 'fg-buffer', 'room-canteen', 'room-meeting', 'room-manager', 'room-engineers', 'room-lab', 'showroom', 'site-gate']) expect(zones.has(z), z).toBe(true);
    expect(people.some((p) => p.behaviour.kind === 'route')).toBe(true);
  });

  it('hech kim uskunalar, konveyerlar va toblash pechi ichidan o‘tmaydi', () => {
    const L = computeLineLayout();
    const rects = L.stations.map((s) => ({ id: s.id, x0: s.cx - s.width / 2, x1: s.cx + s.width / 2, z0: Math.min(s.zIn, s.zOut), z1: Math.max(s.zIn, s.zOut) }));
    // konveyerlar va ixtiyoriy uskunalar (toblash pechi)
    for (const c of L.conveyors) {
      const hw = c.width / 2;
      rects.push(c.axis === 'x' ? { id: c.id, x0: Math.min(c.a[0], c.b[0]), x1: Math.max(c.a[0], c.b[0]), z0: c.a[1] - hw, z1: c.a[1] + hw } : { id: c.id, x0: c.a[0] - hw, x1: c.a[0] + hw, z0: Math.min(c.a[1], c.b[1]), z1: Math.max(c.a[1], c.b[1]) });
    }
    for (const o of L.optional) rects.push({ id: o.id, x0: o.cx - o.width / 2, x1: o.cx + o.width / 2, z0: o.cz - o.length / 2, z1: o.cz + o.length / 2 });
    const hits: string[] = [];
    for (const p of people.filter((q) => q.y < 1 && !q.upper)) {
      for (const t of times) {
        const s = samplePerson(p, t);
        for (const r of rects) {
          if (s.x > r.x0 + 0.05 && s.x < r.x1 - 0.05 && s.z > r.z0 + 0.05 && s.z < r.z1 - 0.05) hits.push(`${p.role} → ${r.id} (t=${t})`);
        }
      }
    }
    expect(hits.slice(0, 5)).toEqual([]);
  });

  it('har kim o‘z hududida (bino, showroom, oxirgi qism, hudud)', () => {
    const sr = showroomRect();
    const rear = getSegment('rear');
    for (const p of people) {
      for (const t of times.filter((_, i) => i % 4 === 0)) {
        const s = samplePerson(p, t);
        if (p.zone === 'showroom') {
          expect(s.x > sr.x0 && s.x < sr.x1 && s.z > sr.z0 && s.z < sr.z1, p.role).toBe(true);
        } else if (p.zone === 'site-gate') {
          expect(s.z < 0, p.role).toBe(true);
        } else {
          expect(Math.abs(s.x) < HALF_W - 0.3 && s.z > 0.3 && s.z < factoryConfig.building.totalLength - 0.3, `${p.role} (${s.x.toFixed(1)}, ${s.z.toFixed(1)})`).toBe(true);
          if (p.zone.startsWith('room-') || p.zone === 'rear') expect(s.z > rear.z0, p.role).toBe(true);
        }
      }
    }
  });

  it('odamlar bir-biriga urilmaydi (bir sathda, butun sikl bo‘yicha)', () => {
    let worst = { d: Infinity, a: '', b: '', t: 0 };
    const levels = new Map<number, PersonDef[]>();
    for (const p of people) levels.set(p.y, [...(levels.get(p.y) ?? []), p]);
    for (const group of levels.values()) {
      for (const t of times) {
        const pts = group.map((p) => samplePerson(p, t));
        for (let i = 0; i < pts.length; i++)
          for (let j = i + 1; j < pts.length; j++) {
            const d = Math.hypot(pts[i].x - pts[j].x, pts[i].z - pts[j].z);
            if (d < worst.d) worst = { d, a: group[i].role, b: group[j].role, t };
          }
      }
    }
    expect(worst.d, JSON.stringify(worst)).toBeGreaterThan(0.55);
  });
});
