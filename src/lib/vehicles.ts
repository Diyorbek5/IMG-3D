import { animationConfig } from '../config/animationConfig';
import { factoryConfig } from '../config/factoryConfig';
import { roadFrame } from './layout';
import { Path2D, Schedule, type P2, type ScheduleSample, type Step } from './motion';

export type VehicleKind = 'truck-raw' | 'truck-fg' | 'forklift' | 'car';

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

export interface TruckRoute {
  path: Path2D;
  gateInS: number;
  gateOutS: number;
}

export function truckRoute(cfg = animationConfig, fcfg = factoryConfig): TruckRoute {
  const rf = roadFrame(fcfg);
  const v = rf.eastboundOuterV;
  const site = cfg.trucks.siteRoute;
  const first = site[0];
  const last = site[site.length - 1];
  const entryLane = rf.toWorld(cfg.trucks.roadEntryU, v);
  const exitLane = rf.toWorld(cfg.trucks.roadExitU, v);
  const entryCorner: P2 = [first[0], rf.zAt(first[0], v)];
  const exitCorner: P2 = [last[0], rf.zAt(last[0], v)];
  const pts: P2[] = [[entryLane.x, entryLane.z], entryCorner, ...site, exitCorner, [exitLane.x, exitLane.z]];
  const path = Path2D.rounded(pts, cfg.trucks.cornerRadius);
  const gateInS = path.nearestS(first[0], rf.zAt(first[0], rf.fenceV));
  const gateOutS = path.nearestS(last[0], rf.zAt(last[0], rf.fenceV));
  return { path, gateInS, gateOutS };
}

function truckSteps(route: TruckRoute, stop: P2, dwell: number, loadedBefore: boolean, cfg = animationConfig): Step[] {
  const { path } = route;
  const sp = cfg.speeds;
  const sStop = path.nearestS(stop[0], stop[1]);
  const slowIn = Math.max(0, route.gateInS - 30);
  const fastOut = Math.min(path.length, route.gateOutS + 25);
  const a = loadedBefore;
  return [
    { kind: 'move', path: path.slice(0, slowIn), vMax: sp.road, vStart: sp.road, vEnd: sp.site, loaded: a },
    { kind: 'move', path: path.slice(slowIn, sStop), vMax: sp.site, vStart: sp.site, vEnd: 0, loaded: a },
    { kind: 'wait', duration: dwell * 0.5, loaded: a },
    { kind: 'wait', duration: dwell * 0.5, loaded: !a },
    { kind: 'move', path: path.slice(sStop, fastOut), vMax: sp.site, vStart: 0, vEnd: sp.site, loaded: !a },
    { kind: 'move', path: path.slice(fastOut, path.length), vMax: sp.road, vStart: sp.site, vEnd: sp.road, loaded: !a },
  ];
}

/** Yuk mashinasi to‘xtash joyiga yetib kelish vaqti (sikl ichida) */
function arrivalTime(steps: Step[], offset: number, accel = 1.2): number {
  const sch = new Schedule(steps.slice(0, 2), offset, 1e9, false, accel);
  return offset + sch.duration;
}

export function buildVehicles(cfg = animationConfig, fcfg = factoryConfig): VehicleDef[] {
  const C = cfg.masterCycle;
  const route = truckRoute(cfg, fcfg);
  const out: VehicleDef[] = [];

  const rawSteps = truckSteps(route, cfg.trucks.raw.stop, cfg.trucks.raw.dwell, true, cfg);
  const fgSteps = truckSteps(route, cfg.trucks.finished.stop, cfg.trucks.finished.dwell, false, cfg);
  const arrivals: Record<string, number> = {
    raw: arrivalTime(rawSteps, cfg.trucks.raw.offset),
    finished: arrivalTime(fgSteps, cfg.trucks.finished.offset),
  };

  out.push({
    id: 'truck-raw',
    kind: 'truck-raw',
    name: 'Yuk mashinasi — xomashyo (shisha listlari) yetkazib berish',
    schedule: new Schedule(rawSteps, cfg.trucks.raw.offset, C),
    trailerOffset: 9.5,
    length: 16.5,
    width: 2.55,
    path: route.path,
  });
  out.push({
    id: 'truck-fg',
    kind: 'truck-fg',
    name: 'Yuk mashinasi — tayyor mahsulotni jo‘natish',
    schedule: new Schedule(fgSteps, cfg.trucks.finished.offset, C),
    trailerOffset: 9.5,
    length: 16.5,
    width: 2.55,
    path: route.path,
  });

  for (const f of cfg.forklifts) {
    const path = Path2D.rounded(f.route, 2.5);
    const sp = cfg.speeds;
    const steps: Step[] = [];
    const vLoaded = 'speedLoaded' in f && f.speedLoaded ? f.speedLoaded : sp.forkliftLoaded;
    const vEmpty = 'speedEmpty' in f && f.speedEmpty ? f.speedEmpty : sp.forklift;
    for (let i = 0; i < f.repeat; i++) {
      steps.push({ kind: 'move', path, vMax: f.loadedOut ? vLoaded : vEmpty, loaded: f.loadedOut });
      steps.push({ kind: 'wait', duration: f.waitEnd, loaded: !f.loadedOut });
      steps.push({ kind: 'move', path, vMax: f.loadedOut ? vEmpty : vLoaded, backwards: true, reverse: true, loaded: !f.loadedOut });
      steps.push({ kind: 'wait', duration: f.waitStart, loaded: false });
    }
    const sync = 'syncWith' in f && f.syncWith ? arrivals[f.syncWith as string] ?? 0 : 0;
    const offset = sync + f.offset;
    out.push({
      id: f.id,
      kind: 'forklift',
      name: f.name,
      schedule: new Schedule(steps, offset, C, true, 0.9),
      trailerOffset: 0,
      cargo: f.cargo as 'glass' | 'crate',
      length: 3.6,
      width: 1.5,
      path,
    });
  }

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
