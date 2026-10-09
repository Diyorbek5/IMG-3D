import { equipmentConfig, type MachineType, type StationConfig } from '../config/equipmentConfig';
import { factoryConfig } from '../config/factoryConfig';
import { getSegment } from './layout';
import { Path2D, trapezoid, type P2, type Step } from './motion';

/** Bino ichidagi pol balandligi (beton plita ustki sathi) */
export const FLOOR_Y = 0.15;
/** Konveyer ishchi sathi (poldan) */
export const WORK_H = 0.95;

export interface PlacedStation extends StationConfig {
  legId: string;
  cx: number;
  cz: number;
  /** stansiya kirish va chiqish nuqtalari (oqim bo‘yicha) */
  zIn: number;
  zOut: number;
  /** oqim yo‘nalishi: z bo‘yicha +1/−1 */
  dir: 1 | -1;
  /** panel yo‘li bo‘ylab stansiya markazining masofasi */
  s: number;
}

export interface ConveyorSeg {
  id: string;
  /** boshlanish va tugash nuqtalari (markaz chizig‘i) */
  a: P2;
  b: P2;
  width: number;
  axis: 'x' | 'z';
}

export interface OptionalMachine {
  id: string;
  type: MachineType;
  name: string;
  term?: string;
  description: string;
  cx: number;
  cz: number;
  length: number;
  width: number;
  height: number;
  params: Record<string, string>;
}

export interface LineLayout {
  zStart: number;
  stations: PlacedStation[];
  conveyors: ConveyorSeg[];
  transferZ: number;
  path: Path2D;
  /** jumbo list → bo‘laklarga aylanish masofasi */
  sCutDone: number;
  /** ikkinchi list qo‘shilib paket hosil bo‘ladigan masofa */
  sAssembled: number;
  /** qadoqlash tugashi (panel yo‘qoladi) */
  sPacked: number;
  stops: { s: number; dwell: number }[];
  optional: OptionalMachine[];
  qualityZone: { x0: number; x1: number; z0: number; z1: number };
  packedStaging: { x0: number; x1: number; z0: number; z1: number };
}

export function computeLineLayout(cfg = equipmentConfig, fcfg = factoryConfig): LineLayout {
  const prod = getSegment('production', fcfg);
  const zStart = prod.z0;
  const transferZ = zStart + cfg.transferOffset;
  const tw = cfg.transferWidth;
  const stations: PlacedStation[] = [];
  const conveyors: ConveyorSeg[] = [];
  const pathPts: P2[] = [];
  const stops: { s: number; dwell: number }[] = [];

  let sAcc = 0;
  let sCutDone = 0;
  let sAssembled = 0;
  let sPacked = 0;

  cfg.legs.forEach((leg, li) => {
    const dir = leg.direction;
    // tarmoq boshlanishi
    let z: number;
    if (li === 0) z = zStart + leg.startOffset;
    else z = transferZ + (dir * tw) / 2; // uzatish konveyerining chetidan
    let prevWidth = cfg.transferWidth;
    if (li === 0) {
      // birinchi stansiya markazidan boshlanadi
      const first = leg.stations[0];
      pathPts.push([leg.x, z + (dir * first.length) / 2]);
    } else {
      pathPts.push([leg.x, transferZ]);
    }
    let lastZ = z;
    leg.stations.forEach((st, si) => {
      if (st.gapBefore > 0.05) {
        const a: P2 = [leg.x, z];
        const b: P2 = [leg.x, z + dir * st.gapBefore];
        conveyors.push({ id: `${leg.id}-c${si}`, a, b, width: Math.max(2.4, Math.min(prevWidth, st.width) - 0.25), axis: 'z' });
      }
      z += dir * st.gapBefore;
      const zIn = z;
      const zOut = z + dir * st.length;
      const cz = (zIn + zOut) / 2;
      // panel yo‘li bo‘yicha masofa
      const firstPt = pathPts[0];
      let s: number;
      if (li === 0) s = Math.abs(cz - firstPt[1]);
      else s = sAcc + Math.abs(cz - transferZ);
      stations.push({ ...st, legId: leg.id, cx: leg.x, cz, zIn, zOut, dir, s });
      if (st.dwell > 0) stops.push({ s, dwell: st.dwell });
      if (st.type === 'breakout') sCutDone = s + st.length / 2;
      if (st.type === 'assembly') sAssembled = s;
      if (st.type === 'packing') sPacked = s + 0.2;
      prevWidth = st.width;
      z = zOut;
      lastZ = zOut;
    });
    if (li === 0) {
      // oxirgi stansiyadan uzatish konveyerigacha
      const endZ = transferZ - (dir * tw) / 2;
      if (Math.abs(endZ - lastZ) > 0.05)
        conveyors.push({ id: `${leg.id}-tail`, a: [leg.x, lastZ], b: [leg.x, endZ], width: Math.max(2.4, prevWidth - 0.25), axis: 'z' });
      pathPts.push([leg.x, transferZ]);
      sAcc = Math.abs(transferZ - pathPts[0][1]);
      stops.push({ s: sAcc, dwell: 2 });
      // ko‘ndalang uzatish
      const next = cfg.legs[1];
      if (next) {
        const x0 = leg.x;
        const x1 = next.x;
        const sx = Math.sign(x1 - x0);
        conveyors.push({
          id: 'transfer',
          a: [x0 + (sx * tw) / 2 - sx * tw, transferZ],
          b: [x1 - (sx * tw) / 2 + sx * tw, transferZ],
          width: tw,
          axis: 'x',
        });
        sAcc += Math.abs(x1 - x0);
        stops.push({ s: sAcc, dwell: 2 });
      }
    } else {
      if (leg.tailConveyor > 0.05) {
        conveyors.push({ id: `${leg.id}-tail`, a: [leg.x, lastZ], b: [leg.x, lastZ + dir * leg.tailConveyor], width: Math.max(2.4, prevWidth - 0.25), axis: 'z' });
      }
      pathPts.push([leg.x, lastZ + dir * Math.max(0.5, leg.tailConveyor * 0.7)]);
    }
  });

  const path = Path2D.polyline(pathPts);

  const optional: OptionalMachine[] = cfg.optional.map((o) => ({
    id: o.id,
    type: o.type,
    name: o.name,
    term: o.term,
    description: o.description,
    cx: o.x,
    cz: zStart + o.zOffset,
    length: o.length,
    width: o.width,
    height: o.height,
    params: o.params,
  }));

  return {
    zStart,
    stations,
    conveyors,
    transferZ,
    path,
    sCutDone,
    sAssembled,
    sPacked: sPacked || path.length,
    stops: stops.sort((a, b) => a.s - b.s),
    optional,
    qualityZone: { x0: cfg.qualityZone.x0, x1: cfg.qualityZone.x1, z0: zStart + cfg.qualityZone.zOffset0, z1: zStart + cfg.qualityZone.zOffset1 },
    packedStaging: { x0: cfg.packedStaging.x0, x1: cfg.packedStaging.x1, z0: zStart + cfg.packedStaging.zOffset0, z1: zStart + cfg.packedStaging.zOffset1 },
  };
}

/**
 * Bitta panelning liniya bo‘ylab harakat jadvali (yo‘l bo‘yicha masofa vaqtga bog‘liq).
 * Barcha panellar bir xil jadvalga ega, faqat spawnInterval ga siljigan.
 */
export function panelSchedule(layout: LineLayout, cfg = equipmentConfig) {
  const steps: Step[] = [];
  let s = 0;
  const stopList = layout.stops.filter((st) => st.s <= layout.sPacked + 0.01);
  for (const st of stopList) {
    if (st.s > s + 0.01) {
      steps.push({ kind: 'move', path: subPath(layout.path, s, st.s), vMax: cfg.conveyorSpeed });
    }
    steps.push({ kind: 'wait', duration: st.dwell });
    s = st.s;
  }
  if (layout.sPacked > s + 0.01) steps.push({ kind: 'move', path: subPath(layout.path, s, layout.sPacked), vMax: cfg.conveyorSpeed });
  return steps;
}

/** Masofa-vaqt jadvali: panel yoshi (s) → yo‘l bo‘ylab masofa */
export function panelDistanceFn(layout: LineLayout, cfg = equipmentConfig) {
  const steps = panelSchedule(layout, cfg);
  // Schedule ni ishlatib, yo‘lni qayta tiklash o‘rniga to‘g‘ridan-to‘g‘ri masofani hisoblaymiz
  const segs: { t0: number; dur: number; s0: number; ds: number; profile?: ReturnType<typeof profileOf> }[] = [];
  let t = 0;
  let s = 0;
  for (const st of steps) {
    if (st.kind === 'wait') {
      segs.push({ t0: t, dur: st.duration, s0: s, ds: 0 });
      t += st.duration;
    } else {
      const pr = profileOf(st.path.length, st.vMax);
      segs.push({ t0: t, dur: pr.duration, s0: s, ds: st.path.length, profile: pr });
      t += pr.duration;
      s += st.path.length;
    }
  }
  const total = t;
  return {
    duration: total,
    distanceAt(age: number) {
      if (age <= 0) return 0;
      if (age >= total) return s;
      for (const sg of segs) {
        if (age <= sg.t0 + sg.dur) {
          if (!sg.profile) return sg.s0;
          return sg.s0 + sg.profile.distanceAt(age - sg.t0);
        }
      }
      return s;
    },
  };
}

function profileOf(L: number, v: number) {
  // konveyerda yumshoq tezlanish
  return trapezoid(L, v, 0.6);
}

function subPath(path: Path2D, s0: number, s1: number): Path2D {
  return path.slice(s0, s1);
}

/** Berilgan vaqtda liniyadagi barcha panellar holati (testlar uchun) */
export function panelStates(layout: LineLayout, t: number, cfg = equipmentConfig) {
  const fn = panelDistanceFn(layout, cfg);
  const T = cfg.spawnInterval;
  const count = Math.ceil(fn.duration / T) + 1;
  const base = ((t % T) + T) % T;
  const out: { k: number; s: number; age: number }[] = [];
  for (let k = 0; k < count; k++) {
    const age = base + k * T;
    if (age > fn.duration) continue;
    out.push({ k, s: fn.distanceAt(age), age });
  }
  return out;
}
