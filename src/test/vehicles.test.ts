import { describe, expect, it } from 'vitest';
import { animationConfig } from '../config/animationConfig';
import { footprint, minGap } from '../lib/footprint';
import { buildVehicles, sampleVehicle } from '../lib/vehicles';
import { showroomRect } from '../lib/layout';

describe('transport harakati', () => {
  const vehicles = buildVehicles();

  it('yuk mashinalari sikl ichida to‘liq marshrutni bosib o‘tadi', () => {
    for (const v of vehicles.filter((x) => x.kind.startsWith('truck'))) {
      expect(v.schedule.duration).toBeLessThanOrEqual(animationConfig.masterCycle);
    }
  });

  it('transportlar bir-biri bilan to‘qnashmaydi (butun sikl bo‘yicha 0.1 s qadam)', () => {
    const C = animationConfig.masterCycle;
    let worst = { gap: Infinity, t: 0, a: '', b: '' };
    for (let t = 0; t < C; t += 0.1) {
      const fps = vehicles.map((v) => footprint(v, t));
      for (let i = 0; i < vehicles.length; i++)
        for (let j = i + 1; j < vehicles.length; j++) {
          const a = fps[i];
          const b = fps[j];
          if (!a || !b) continue;
          const g = minGap(a, b);
          if (g < worst.gap) worst = { gap: g, t, a: vehicles[i].id, b: vehicles[j].id };
        }
    }
    if (worst.gap < 0.3) console.log('Eng yaqin holat:', worst);
    expect(worst.gap).toBeGreaterThan(0.3);
  });

  it('yuk mashinalari orqasi bilan o‘z darvozasiga biroz kiradi (xomashyo — 3-darvoza, tayyor mahsulot — 1-darvoza)', () => {
    const doorX = { 'truck-raw': -3, 'truck-fg': 14 } as Record<string, number>;
    for (const v of vehicles.filter((x) => x.kind.startsWith('truck'))) {
      let best = { z: -Infinity, x: 0 };
      for (let t = 0; t < animationConfig.masterCycle; t += 0.2) {
        const s = sampleVehicle(v, t);
        if (!s.visible) continue;
        const th = s.trailerHeading ?? s.heading;
        const rz = s.z - Math.sin(th) * 13;
        if (rz > best.z) best = { z: rz, x: s.x - Math.cos(th) * 13 };
      }
      // tirkama orqasi bino ichida 1–6 m, darvoza o‘qida
      expect(best.z, v.id).toBeGreaterThan(1);
      expect(best.z, v.id).toBeLessThan(6);
      expect(Math.abs(best.x - doorX[v.kind]), v.id).toBeLessThan(0.3);
    }
  });

  it('yuk mashinalari showroom (12 × 24 m) bilan to‘qnashmaydi', () => {
    const sr = showroomRect();
    let worst = Infinity;
    for (const v of vehicles.filter((x) => x.kind.startsWith('truck'))) {
      for (let t = 0; t < animationConfig.masterCycle; t += 0.1) {
        const fp = footprint(v, t);
        if (!fp) continue;
        for (const c of fp) {
          const dx = Math.max(sr.x0 - c.x, 0, c.x - sr.x1);
          const dz = Math.max(sr.z0 - c.z, 0, c.z - sr.z1);
          worst = Math.min(worst, Math.hypot(dx, dz) - c.r);
        }
      }
    }
    expect(worst).toBeGreaterThan(1);
  });
});
