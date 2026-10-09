import { factoryConfig, type BuildingSegment, type Rect, type SegmentId } from '../config/factoryConfig';

/** Segmentning bino ichidagi joylashuvi (z oralig‘i). */
export interface SegmentLayout extends BuildingSegment {
  z0: number;
  z1: number;
}

export const HALF_W = factoryConfig.building.width / 2;

export function getSegments(cfg = factoryConfig): SegmentLayout[] {
  let z = 0;
  return cfg.building.segments.map((s) => {
    const seg = { ...s, z0: z, z1: z + s.length };
    z += s.length;
    return seg;
  });
}

export function getSegment(id: SegmentId, cfg = factoryConfig): SegmentLayout {
  const s = getSegments(cfg).find((x) => x.id === id);
  if (!s) throw new Error(`Segment topilmadi: ${id}`);
  return s;
}

export function segmentsTotalLength(cfg = factoryConfig): number {
  return cfg.building.segments.reduce((a, s) => a + s.length, 0);
}

/** Bino balandligi berilgan z nuqtada (parapet bilan). */
export function heightAtZ(z: number, cfg = factoryConfig): number {
  const segs = getSegments(cfg);
  for (const s of segs) if (z >= s.z0 && z <= s.z1) return s.height;
  return 0;
}

export function showroomRect(cfg = factoryConfig): Rect {
  const hw = cfg.building.width / 2;
  const sign = cfg.glassCorner.side === 'east' ? 1 : -1;
  const outer = sign * hw;
  const inner = outer - sign * cfg.showroom.width;
  return {
    x0: Math.min(outer, inner),
    x1: Math.max(outer, inner),
    z0: -cfg.showroom.depth,
    z1: 0,
  };
}

export function frontYardRect(cfg = factoryConfig): Rect {
  const hw = cfg.frontYard.width / 2;
  return { x0: -hw, x1: hw, z0: -cfg.frontYard.depth, z1: 0 };
}

export interface DoorLayout {
  index: number;
  id: string;
  name: string;
  cx: number;
  width: number;
  height: number;
}

export function rollerDoors(cfg = factoryConfig): DoorLayout[] {
  const d = cfg.rollerDoors;
  return d.centersX.slice(0, 3).map((cx, i) => ({
    index: i,
    id: `door-${i + 1}`,
    name: d.names[i] ?? `${i + 1}-darvoza`,
    cx,
    width: d.width,
    height: d.height,
  }));
}

/* ------------------------------------------------------------------ */
/* Katta yo‘l geometriyasi                                             */
/* ------------------------------------------------------------------ */

export function roadFrame(cfg = factoryConfig) {
  const a = (cfg.road.angleDeg * Math.PI) / 180;
  const dir = { x: Math.cos(a), z: Math.sin(a) };
  /** janub (hudud) tomonga qaragan normal */
  const nrm = { x: -Math.sin(a), z: Math.cos(a) };
  const origin = { x: 0, z: cfg.road.centerZAtX0 };
  const half = cfg.road.lanesPerDirection * cfg.road.laneWidth + cfg.road.medianWidth / 2;
  /** yo‘l lokal koordinatalari (u — bo‘ylama, v — ko‘ndalang, janubga musbat) → dunyo */
  const toWorld = (u: number, v: number) => ({
    x: origin.x + dir.x * u + nrm.x * v,
    z: origin.z + dir.z * u + nrm.z * v,
  });
  /** dunyo → yo‘l lokal */
  const toLocal = (x: number, z: number) => {
    const dx = x - origin.x;
    const dz = z - origin.z;
    return { u: dx * dir.x + dz * dir.z, v: dx * nrm.x + dz * nrm.z };
  };
  /** Berilgan x da yo‘l o‘qidan v masofadagi chiziqning z qiymati */
  const zAt = (x: number, v: number) => {
    // nuqta = origin + dir*u + nrm*v ; x berilgan → u = (x - origin.x - nrm.x*v) / dir.x
    const u = (x - origin.x - nrm.x * v) / dir.x;
    return origin.z + dir.z * u + nrm.z * v;
  };
  /** O‘ng (janubiy) chekka bo‘lakning markazi — sharqqa harakat */
  const eastboundOuterV = cfg.road.medianWidth / 2 + cfg.road.laneWidth * 1.5;
  const eastboundInnerV = cfg.road.medianWidth / 2 + cfg.road.laneWidth * 0.5;
  const westboundOuterV = -eastboundOuterV;
  const westboundInnerV = -eastboundInnerV;
  const curbV = half;
  const sidewalkV = half + cfg.road.sidewalkWidth;
  const fenceV = sidewalkV + cfg.road.greenStripWidth;
  return {
    angle: a,
    dir,
    nrm,
    origin,
    half,
    toWorld,
    toLocal,
    zAt,
    eastboundOuterV,
    eastboundInnerV,
    westboundOuterV,
    westboundInnerV,
    curbV,
    sidewalkV,
    fenceV,
  };
}

/** Hudud shimoliy chegarasi (to‘siq) berilgan x da */
export function siteNorthZ(x: number, cfg = factoryConfig) {
  return roadFrame(cfg).zAt(x, roadFrame(cfg).fenceV);
}

export const rectCenter = (r: Rect) => ({ x: (r.x0 + r.x1) / 2, z: (r.z0 + r.z1) / 2 });
export const rectSize = (r: Rect) => ({ w: r.x1 - r.x0, d: r.z1 - r.z0 });
