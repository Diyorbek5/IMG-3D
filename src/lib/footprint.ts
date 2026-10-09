import type { VehicleDef } from './vehicles';
import { sampleVehicle } from './vehicles';

export interface Circle {
  x: number;
  z: number;
  r: number;
}

/** Transportning taxminiy egallagan joyi (doiralar to‘plami) */
export function footprint(v: VehicleDef, t: number): Circle[] | null {
  const s = sampleVehicle(v, t);
  if (!s.visible) return null;
  const hx = Math.cos(s.heading);
  const hz = Math.sin(s.heading);
  const out: Circle[] = [];
  if (v.kind === 'truck-raw' || v.kind === 'truck-fg') {
    // pose nuqtasi = egarli qurilma (tягач orqa o‘qi)
    for (const d of [-0.5, 1.5, 3.6]) out.push({ x: s.x + hx * d, z: s.z + hz * d, r: 1.45 });
    const th = s.trailerHeading ?? s.heading;
    const tx = Math.cos(th);
    const tz = Math.sin(th);
    for (let d = 1.5; d <= 12.6; d += 2.2) out.push({ x: s.x - tx * d, z: s.z - tz * d, r: 1.45 });
  } else {
    for (const d of [-1.3, 0, 1.3]) out.push({ x: s.x + hx * d, z: s.z + hz * d, r: 1.0 });
  }
  return out;
}

export function minGap(a: Circle[], b: Circle[]): number {
  let m = Infinity;
  for (const p of a) for (const q of b) m = Math.min(m, Math.hypot(p.x - q.x, p.z - q.z) - p.r - q.r);
  return m;
}
