import { describe, expect, it } from 'vitest';
import { departmentTotal, staffConfig, staffTotal } from '../config/staffConfig';
import { getEntities } from '../lib/entities';

describe('xodimlar shtati', () => {
  it('kamida 100 nafar xodimga mo‘ljallangan', () => {
    expect(staffTotal()).toBeGreaterThanOrEqual(staffConfig.minTotal);
    expect(staffConfig.minTotal).toBeGreaterThanOrEqual(100);
  });

  it('birinchi — direktor (CEO), 1 nafar', () => {
    const first = staffConfig.departments[0].positions[0];
    expect(first.title).toMatch(/Direktor/);
    expect(first.count).toBe(1);
  });

  it('talab qilingan bo‘limlar mavjud', () => {
    const names = staffConfig.departments.map((d) => d.name).join(' | ');
    for (const k of ['Sotuv', 'Ishlab chiqarish', 'HR', 'Marketing', 'IT', 'OTK', 'GPO', 'Logistika', 'Ta’minot', 'xo‘jalik', 'Oshxona']) expect(names).toContain(k);
    expect(staffConfig.departments.flatMap((d) => d.positions).some((p) => p.title.includes('ROP'))).toBe(true);
  });

  it('har bir lavozimda kamida 1 nafar, bo‘limlar yig‘indisi jamiga teng, lavozimlar takrorlanmaydi', () => {
    let sum = 0;
    for (const d of staffConfig.departments) {
      for (const p of d.positions) expect(Number.isInteger(p.count) && p.count >= 1, p.title).toBe(true);
      sum += departmentTotal(d);
      expect(new Set(d.positions.map((p) => p.title)).size).toBe(d.positions.length);
    }
    expect(sum).toBe(staffTotal());
  });

  it('ish joyi ko‘rsatilgan lavozimlar maketdagi obyektlarga bog‘langan', () => {
    const ids = new Set(getEntities().map((e) => e.id));
    for (const d of staffConfig.departments) for (const p of d.positions) if (p.place) expect(ids.has(p.place), `${p.title} → ${p.place}`).toBe(true);
  });
});
