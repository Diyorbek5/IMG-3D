import { describe, expect, it } from 'vitest';
import { equipmentConfig } from '../config/equipmentConfig';
import { getSegment } from '../lib/layout';
import { computeLineLayout, panelStates } from '../lib/lineLayout';

describe('ishlab chiqarish liniyasi', () => {
  const L = computeLineLayout();
  const prod = getSegment('production');
  const front = getSegment('front');

  it('barcha stansiyalar ishlab chiqarish zonasida, omborlar maydonida uskuna yo‘q', () => {
    for (const s of L.stations) {
      const z0 = Math.min(s.zIn, s.zOut);
      const z1 = Math.max(s.zIn, s.zOut);
      expect(z0).toBeGreaterThanOrEqual(prod.z0);
      expect(z1).toBeLessThanOrEqual(prod.z1);
      expect(z0).toBeGreaterThanOrEqual(front.z1);
    }
    for (const o of L.optional) expect(o.cz).toBeGreaterThan(prod.z0);
  });

  it('jarayon tartibi: kesish → chet ishlov → yuvish → yig‘ish → vakuum → OTK → qadoqlash', () => {
    const order = L.stations.map((s) => s.type);
    const idx = (t: string) => order.indexOf(t as never);
    expect(idx('cutting')).toBeLessThan(idx('edger'));
    expect(idx('edger')).toBeLessThan(idx('washer'));
    expect(idx('washer')).toBeLessThan(idx('assembly'));
    expect(idx('assembly')).toBeLessThan(idx('vacuum'));
    expect(idx('vacuum')).toBeLessThan(idx('inspection'));
    expect(idx('inspection')).toBeLessThan(idx('packing'));
    expect(order).not.toContain('tempering');
  });

  it('stansiyalar oqim yo‘lida ketma-ket (yuklash/tushirish tomonlari mos)', () => {
    for (let i = 1; i < L.stations.length; i++) expect(L.stations[i].s).toBeGreaterThan(L.stations[i - 1].s);
  });

  it('U-oqim: xomashyo tarmog‘i o‘ngda (x < 0), OTK va qadoqlash chapda (x > 0), uzatish o‘ngdan chapga', () => {
    const loader = L.stations.find((s) => s.type === 'loader')!;
    const packing = L.stations.find((s) => s.type === 'packing')!;
    expect(loader.cx).toBeLessThan(0);
    expect(packing.cx).toBeGreaterThan(0);
    expect(L.qualityZone.x0).toBeGreaterThan(0);
    const tr = L.conveyors.find((c) => c.id === 'transfer')!;
    expect(tr.b[0]).toBeGreaterThan(tr.a[0]);
  });

  it('OTK/GPO zonasi nazorat stansiyalarini o‘z ichiga oladi', () => {
    const q = L.qualityZone;
    for (const s of L.stations.filter((x) => x.type === 'inspection' || x.type === 'testing')) {
      expect(s.cx).toBeGreaterThan(q.x0);
      expect(s.cx).toBeLessThan(q.x1);
      expect(Math.min(s.zIn, s.zOut)).toBeGreaterThanOrEqual(q.z0);
      expect(Math.max(s.zIn, s.zOut)).toBeLessThanOrEqual(q.z1);
    }
  });

  it('shisha panellar bir-biriga tegmaydi (butun sikl bo‘yicha)', () => {
    let minGap = Infinity;
    for (let t = 0; t < 600; t += 0.25) {
      const ps = panelStates(L, t).sort((a, b) => a.s - b.s);
      for (let i = 1; i < ps.length; i++) {
        const lead = ps[i];
        const follow = ps[i - 1];
        // panel o‘lchami oqim bo‘yicha: jumbo 3.21 m, bo‘lak 1.4 m (transferda 2.0 m)
        const len = (s: number) => (s < L.sCutDone ? 3.21 : 2.0);
        const gap = lead.s - follow.s - (len(lead.s) + len(follow.s)) / 2;
        minGap = Math.min(minGap, gap);
      }
    }
    expect(minGap).toBeGreaterThan(0.2);
    expect(equipmentConfig.spawnInterval).toBeGreaterThan(0);
  });
});
