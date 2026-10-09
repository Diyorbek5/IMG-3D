import { describe, expect, it } from 'vitest';
import { animationConfig } from '../config/animationConfig';
import { footprint, minGap } from '../lib/footprint';
import { buildVehicles, sampleVehicle } from '../lib/vehicles';

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

  it('yuk ortgichlar o‘z sikli davomida harakatlanadi', () => {
    for (const v of vehicles.filter((x) => x.kind === 'forklift')) {
      expect(v.schedule.duration).toBeLessThanOrEqual(animationConfig.masterCycle);
      const a = sampleVehicle(v, v.schedule.offset + 1);
      expect(a.visible).toBe(true);
    }
  });
});
