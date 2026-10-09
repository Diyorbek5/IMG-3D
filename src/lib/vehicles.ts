import { animationConfig } from '../config/animationConfig';
import { factoryConfig } from '../config/factoryConfig';
import { roadFrame } from './layout';
import { Path2D, Schedule, type MoveStep, type ScheduleSample, type Step } from './motion';

export type VehicleKind = 'truck-raw' | 'truck-fg' | 'car';

export interface VehicleDef {
  id: string;
  kind: VehicleKind;
  name: string;
  schedule: Schedule;
  /** tirkama ilgagi va orqa o‘q orasidagi masofa (faqat yuk mashinasi) */
  trailerOffset: number;
  cargo?: 'glass' | 'crate';
  /** to‘qnashuvni tekshirish uchun taxminiy o‘lcham: uzunlik/kenglik */
  length: number;
  width: number;
  color?: string;
  /** Marshrut (ko‘rsatish uchun) */
  path?: Path2D;
}

type TruckCfg = (typeof animationConfig)['trucks']['raw'];

export interface TruckPlan {
  approach: Path2D;
  reverse: Path2D;
  reverseEndS: number;
  exit: Path2D;
  gateInS: number;
  gateOutS: number;
}

/** Yuk mashinasi marshruti: kirish → orqaga yurib ombor darvozasiga → chiqish (bitta darvoza) */
export function truckPlan(t: TruckCfg, cfg = animationConfig, fcfg = factoryConfig): TruckPlan {
  const rf = roadFrame(fcfg);
  const v = rf.eastboundOuterV;
  const { inX, outX } = cfg.trucks.gate;
  const r = cfg.trucks.cornerRadius;
  const entryLane = rf.toWorld(cfg.trucks.roadEntryU, v);
  const exitLane = rf.toWorld(cfg.trucks.roadExitU, v);
  const approach = Path2D.rounded([[entryLane.x, entryLane.z], [inX, rf.zAt(inX, v)], ...t.approach], r);
  const reverse = Path2D.rounded(t.reverse, r);
  const doorX = t.reverse[t.reverse.length - 1][0];
  const reverseEndS = reverse.nearestS(doorX, t.stopZ);
  const exit = Path2D.rounded([...t.exit, [outX, rf.zAt(outX, v)], [exitLane.x, exitLane.z]], r);
  const gateInS = approach.nearestS(inX, rf.zAt(inX, rf.fenceV));
  const gateOutS = exit.nearestS(outX, rf.zAt(outX, rf.fenceV));
  return { approach, reverse, reverseEndS, exit, gateInS, gateOutS };
}

function move(path: Path2D, s0: number, s1: number, o: Omit<MoveStep, 'kind' | 'path' | 'trailerPath' | 'trailerBase'>): MoveStep {
  return { kind: 'move', path: path.slice(s0, s1), trailerPath: path, trailerBase: s0, ...o };
}

function truckSteps(plan: TruckPlan, dwell: number, loadedBefore: boolean, cfg = animationConfig): Step[] {
  const sp = cfg.speeds;
  const a = loadedBefore;
  const ap = plan.approach;
  const ex = plan.exit;
  const slowIn = Math.max(0, plan.gateInS - 30);
  const fastOut = Math.min(ex.length, plan.gateOutS + 25);
  return [
    move(ap, 0, slowIn, { vMax: sp.road, vStart: sp.road, vEnd: sp.site, loaded: a }),
    move(ap, slowIn, ap.length, { vMax: sp.site, vStart: sp.site, vEnd: 0, loaded: a }),
    { kind: 'wait', duration: 1.5, loaded: a },
    move(plan.reverse, 0, plan.reverseEndS, { vMax: cfg.trucks.reverseSpeed, reverse: true, loaded: a }),
    { kind: 'wait', duration: dwell * 0.5, loaded: a },
    { kind: 'wait', duration: dwell * 0.5, loaded: !a },
    move(ex, 0, fastOut, { vMax: sp.site, vStart: 0, vEnd: sp.site, loaded: !a }),
    move(ex, fastOut, ex.length, { vMax: sp.road, vStart: sp.site, vEnd: sp.road, loaded: !a }),
  ];
}

export function buildVehicles(cfg = animationConfig, fcfg = factoryConfig): VehicleDef[] {
  const C = cfg.masterCycle;
  const out: VehicleDef[] = [];
  const rawPlan = truckPlan(cfg.trucks.raw, cfg, fcfg);
  const fgPlan = truckPlan(cfg.trucks.finished, cfg, fcfg);

  out.push({
    id: 'truck-raw',
    kind: 'truck-raw',
    name: 'Yuk mashinasi — xomashyo (shisha listlari) yetkazib berish',
    schedule: new Schedule(truckSteps(rawPlan, cfg.trucks.raw.dwell, true, cfg), cfg.trucks.raw.offset, C),
    trailerOffset: 9.5,
    length: 16.5,
    width: 2.55,
  });
  out.push({
    id: 'truck-fg',
    kind: 'truck-fg',
    name: 'Yuk mashinasi — tayyor mahsulotni jo‘natish',
    schedule: new Schedule(truckSteps(fgPlan, cfg.trucks.finished.dwell, false, cfg), cfg.trucks.finished.offset, C),
    trailerOffset: 9.5,
    length: 16.5,
    width: 2.55,
  });

  const rf = roadFrame(fcfg);
  for (const c of cfg.cars) {
    const v = c.lane === 'outer' ? rf.westboundOuterV : rf.westboundInnerV;
    const a = rf.toWorld(fcfg.road.halfLength, v);
    const b = rf.toWorld(-fcfg.road.halfLength, v);
    const path = Path2D.polyline([
      [a.x, a.z],
      [b.x, b.z],
    ]);
    const speed = cfg.speeds.car * (c.lane === 'inner' ? 1.15 : 1);
    const dur = path.length / speed;
    const sch = new Schedule([{ kind: 'move', path, vMax: speed, vStart: speed, vEnd: speed }], c.offset, dur, false);
    out.push({ id: c.id, kind: 'car', name: 'Yengil avtomobil', schedule: sch, trailerOffset: 0, length: 4.6, width: 1.85, color: c.color });
  }
  return out;
}

export function sampleVehicle(v: VehicleDef, t: number): ScheduleSample {
  return v.schedule.sample(t, v.trailerOffset);
}
