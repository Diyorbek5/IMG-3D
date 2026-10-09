import { factoryConfig, type ValueStatus } from '../config/factoryConfig';
import { frontYardRect, getSegments, HALF_W, showroomRect } from './layout';

export type V3 = [number, number, number];

export interface DimSpec {
  id: string;
  group: 'overall' | 'zones';
  a: V3;
  b: V3;
  /** o‘lcham chizig‘ining o‘lchanayotgan nuqtalardan siljishi */
  offset: V3;
  /** o‘lchangan qiymat (m) — geometriyadan hisoblanadi */
  value: number;
  caption?: string;
  status: ValueStatus;
}

const fmt = (v: number) => (Math.abs(v - Math.round(v)) < 0.01 ? `${Math.round(v)}` : v.toFixed(1));
export const dimText = (d: DimSpec) => `${d.status === 'confirmed' ? '' : '≈ '}${fmt(d.value)} m${d.caption ? ` — ${d.caption}` : ''}`;

/**
 * Barcha o‘lcham chiziqlari bino geometriyasi bilan bir xil manbadan (factoryConfig) hisoblanadi —
 * parametr o‘zgarsa, chiziqlar va raqamlar ham avtomatik yangilanadi.
 */
export function dimensionSpecs(cfg = factoryConfig): DimSpec[] {
  const W = HALF_W;
  const segs = getSegments(cfg);
  const L = segs[segs.length - 1].z1;
  const front = segs[0];
  const y = frontYardRect(cfg);
  const sr = showroomRect(cfg);
  const g = 0.12;
  const len = (a: V3, b: V3) => Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const out: DimSpec[] = [];
  const add = (d: Omit<DimSpec, 'value'>) => out.push({ ...d, value: len(d.a, d.b) });

  /* ---- Umumiy o‘lchamlar ---- */
  add({ id: 'bld-width', group: 'overall', a: [-W, front.height, 0], b: [W, front.height, 0], offset: [0, 1.8, 0], caption: 'bino kengligi', status: cfg.building.widthStatus });
  add({ id: 'bld-length', group: 'overall', a: [-W, g, 0], b: [-W, g, L], offset: [-11, 0, 0], caption: 'bino uzunligi', status: cfg.building.totalLengthStatus });
  add({ id: 'front-height', group: 'overall', a: [-W, 0, 0], b: [-W, front.height, 0], offset: [0, 0, -3.2], caption: 'old qism balandligi', status: front.heightStatus });
  add({ id: 'yard-w', group: 'overall', a: [y.x0, g, y.z0], b: [y.x1, g, y.z0], offset: [0, 0, -3.5], caption: 'old hovli', status: cfg.frontYard.status });
  add({ id: 'yard-d', group: 'overall', a: [y.x0, g, y.z0], b: [y.x0, g, y.z1], offset: [-5, 0, 0], caption: 'old hovli', status: cfg.frontYard.status });

  /* ---- Zonalar ---- */
  const captions: Record<string, string> = {
    front: 'old qism',
    tbd: 'aniqlashtiriladigan zona',
    production: 'ishlab chiqarish',
    rear: 'oxirgi qism',
  };
  for (const s of segs) {
    add({ id: `len-${s.id}`, group: 'zones', a: [-W, g, s.z0], b: [-W, g, s.z1], offset: [-5, 0, 0], caption: captions[s.id], status: s.lengthStatus });
    if (s.id !== 'front') {
      const zc = s.id === 'rear' ? s.z0 + s.length * 0.3 : (s.z0 + s.z1) / 2;
      add({ id: `h-${s.id}`, group: 'zones', a: [-W, 0, zc], b: [-W, s.height, zc], offset: [-2.4, 0, 0], caption: 'balandlik', status: s.heightStatus });
    }
    if (s.id === 'rear' && s.floors >= 2) {
      const ff = cfg.building.rearFirstFloorHeight;
      add({ id: 'rear-f1', group: 'zones', a: [W, 0, s.z1], b: [W, ff, s.z1], offset: [0, 0, 2.6], caption: '1-qavat', status: cfg.building.rearFirstFloorHeightStatus });
      add({ id: 'rear-f2', group: 'zones', a: [W, ff, s.z1], b: [W, s.height, s.z1], offset: [0, 0, 2.6], caption: '2-qavat', status: cfg.building.rearFirstFloorHeightStatus });
    }
  }
  add({ id: 'sr-width', group: 'zones', a: [sr.x0, g, sr.z0], b: [sr.x1, g, sr.z0], offset: [0, 0, -2.6], caption: 'showroom', status: cfg.showroom.sizeStatus });
  add({ id: 'sr-depth', group: 'zones', a: [sr.x1, g, sr.z0], b: [sr.x1, g, sr.z1], offset: [3.2, 0, 0], caption: 'showroom', status: cfg.showroom.sizeStatus });
  add({ id: 'sr-height', group: 'zones', a: [sr.x0, 0, sr.z0], b: [sr.x0, cfg.showroom.height, sr.z0], offset: [-1.6, 0, -1.6], caption: 'showroom balandligi', status: cfg.showroom.heightStatus });
  return out;
}
