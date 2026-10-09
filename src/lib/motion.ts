/**
 * Yo‘l (trayektoriya) va harakat profillari.
 * Barcha funksiyalar sof (pure) — ular ham 3D sahnada, ham avtomatik testlarda
 * (transportlar to‘qnashmasligini tekshirish) bir xil ishlatiladi.
 */

export type P2 = [number, number]; // [x, z]

export interface Pose {
  x: number;
  z: number;
  /** harakat yo‘nalishi (radian): atan2(dz, dx) */
  heading: number;
}

interface LineSeg {
  kind: 'line';
  ax: number;
  az: number;
  dx: number;
  dz: number;
  len: number;
}
interface ArcSeg {
  kind: 'arc';
  cx: number;
  cz: number;
  r: number;
  a0: number;
  /** ishorali burchak (+ — soat strelkasiga qarshi x→z tekisligida) */
  sweep: number;
  len: number;
}
type Seg = LineSeg | ArcSeg;

export class Path2D {
  readonly segs: Seg[] = [];
  readonly length: number;
  private cum: number[] = [];

  constructor(segs: Seg[]) {
    this.segs = segs.filter((s) => s.len > 1e-6);
    let acc = 0;
    for (const s of this.segs) {
      this.cum.push(acc);
      acc += s.len;
    }
    this.length = acc;
  }

  /**
   * Burchaklari radius bilan yumaloqlangan siniq chiziq.
   * Radius har bir burchakda qo‘shni bo‘laklar uzunligining yarmidan oshmaydi.
   */
  static rounded(points: P2[], radius: number): Path2D {
    const segs: Seg[] = [];
    if (points.length < 2) return new Path2D(segs);
    let cur: P2 = points[0];
    for (let i = 1; i < points.length; i++) {
      const p = points[i];
      const next = points[i + 1];
      if (!next) {
        segs.push(line(cur, p));
        break;
      }
      const d1 = norm(sub(p, points[i - 1]));
      const d2 = norm(sub(next, p));
      const cross = d1[0] * d2[1] - d1[1] * d2[0];
      const dot = clamp(d1[0] * d2[0] + d1[1] * d2[1], -1, 1);
      const phi = Math.acos(dot);
      if (phi < 1e-4) {
        continue; // to‘g‘ri chiziq davomi
      }
      const l1 = dist(points[i - 1], p);
      const l2 = dist(p, next);
      const r = Math.min(radius, (Math.min(l1, l2) * 0.5) / Math.tan(phi / 2));
      const t = r * Math.tan(phi / 2);
      const a: P2 = [p[0] - d1[0] * t, p[1] - d1[1] * t];
      const b: P2 = [p[0] + d2[0] * t, p[1] + d2[1] * t];
      segs.push(line(cur, a));
      // markaz: a nuqtadan burilish tomoniga perpendikulyar
      const side = Math.sign(cross); // +1: chapga (x→z tekisligida CCW)
      const nx = -d1[1] * side;
      const nz = d1[0] * side;
      const cx = a[0] + nx * r;
      const cz = a[1] + nz * r;
      const a0 = Math.atan2(a[1] - cz, a[0] - cx);
      const sweep = side * phi;
      segs.push({ kind: 'arc', cx, cz, r, a0, sweep, len: r * phi });
      cur = b;
    }
    return new Path2D(segs);
  }

  static polyline(points: P2[]): Path2D {
    const segs: Seg[] = [];
    for (let i = 1; i < points.length; i++) segs.push(line(points[i - 1], points[i]));
    return new Path2D(segs);
  }

  poseAt(sIn: number): Pose {
    const s = clamp(sIn, 0, this.length);
    let i = this.segs.length - 1;
    // ikkilik qidiruv
    let lo = 0;
    let hi = this.segs.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (this.cum[mid] <= s) {
        i = mid;
        lo = mid + 1;
      } else hi = mid - 1;
    }
    const seg = this.segs[i];
    if (!seg) return { x: 0, z: 0, heading: 0 };
    const local = s - this.cum[i];
    if (seg.kind === 'line') {
      const t = seg.len > 0 ? local / seg.len : 0;
      return { x: seg.ax + seg.dx * t * seg.len, z: seg.az + seg.dz * t * seg.len, heading: Math.atan2(seg.dz, seg.dx) };
    }
    const ang = seg.a0 + (seg.sweep * local) / seg.len;
    const x = seg.cx + Math.cos(ang) * seg.r;
    const z = seg.cz + Math.sin(ang) * seg.r;
    const dir = Math.sign(seg.sweep);
    // urinma: radius vektoriga perpendikulyar
    const heading = Math.atan2(Math.cos(ang) * dir, -Math.sin(ang) * dir);
    return { x, z, heading };
  }

  /** [s0, s1] oralig‘idagi qism-yo‘l */
  slice(s0: number, s1: number): Path2D {
    const out: Seg[] = [];
    this.segs.forEach((seg, i) => {
      const c0 = this.cum[i];
      const c1 = c0 + seg.len;
      const a = Math.max(s0, c0);
      const b = Math.min(s1, c1);
      if (b - a <= 1e-6) return;
      const la = a - c0;
      const lb = b - c0;
      if (seg.kind === 'line') {
        out.push({ ...seg, ax: seg.ax + seg.dx * la, az: seg.az + seg.dz * la, len: lb - la });
      } else {
        const k = seg.sweep / seg.len;
        out.push({ ...seg, a0: seg.a0 + k * la, sweep: k * (lb - la), len: lb - la });
      }
    });
    return new Path2D(out);
  }

  /** Berilgan nuqtaga eng yaqin joyning masofasi (s) */
  nearestS(x: number, z: number, step = 0.25): number {
    let best = 0;
    let bd = Infinity;
    for (let s = 0; s <= this.length; s += step) {
      const p = this.poseAt(s);
      const d = (p.x - x) ** 2 + (p.z - z) ** 2;
      if (d < bd) {
        bd = d;
        best = s;
      }
    }
    return best;
  }

  /** Yo‘l bo‘ylab nuqtalarni namunalash (chiziq chizish uchun) */
  sample(step = 1): P2[] {
    const n = Math.max(2, Math.ceil(this.length / step) + 1);
    const out: P2[] = [];
    for (let i = 0; i < n; i++) {
      const p = this.poseAt((i / (n - 1)) * this.length);
      out.push([p.x, p.z]);
    }
    return out;
  }
}

/* ------------------------------------------------------------------ */
/* Tezlik profili (trapetsiya)                                         */
/* ------------------------------------------------------------------ */

export interface Profile {
  duration: number;
  distanceAt(t: number): number;
}

/**
 * L masofani vStart dan vEnd gacha, maksimal vMax tezlik va a tezlanish bilan bosib o‘tish.
 */
export function trapezoid(L: number, vMax: number, a: number, vStart = 0, vEnd = 0): Profile {
  if (L <= 1e-6) return { duration: 0, distanceAt: () => 0 };
  let vp = vMax;
  let d1 = Math.abs(vp * vp - vStart * vStart) / (2 * a);
  let d3 = Math.abs(vp * vp - vEnd * vEnd) / (2 * a);
  if (d1 + d3 > L) {
    vp = Math.sqrt((2 * a * L + vStart * vStart + vEnd * vEnd) / 2);
    vp = Math.max(vp, Math.max(vStart, vEnd) * 0.999);
    d1 = Math.abs(vp * vp - vStart * vStart) / (2 * a);
    d3 = Math.max(0, L - d1);
  }
  const t1 = Math.abs(vp - vStart) / a;
  const d2 = Math.max(0, L - d1 - d3);
  const t2 = d2 / vp;
  const t3 = d3 > 0 ? (2 * d3) / (vp + vEnd) : 0;
  const a1 = vp >= vStart ? a : -a;
  const a3 = t3 > 0 ? (vEnd - vp) / t3 : 0;
  const duration = t1 + t2 + t3;
  return {
    duration,
    distanceAt(t: number) {
      if (t <= 0) return 0;
      if (t >= duration) return L;
      if (t < t1) return vStart * t + 0.5 * a1 * t * t;
      if (t < t1 + t2) return d1 + vp * (t - t1);
      const tt = t - t1 - t2;
      return Math.min(L, d1 + d2 + vp * tt + 0.5 * a3 * tt * tt);
    },
  };
}

/* ------------------------------------------------------------------ */
/* Transport jadvali: harakat + to‘xtashlar                            */
/* ------------------------------------------------------------------ */

export interface MoveStep {
  kind: 'move';
  path: Path2D;
  vMax: number;
  vStart?: number;
  vEnd?: number;
  /** orqaga yurish (yuk ortgichlar uchun) — yo‘nalish 180° buriladi */
  reverse?: boolean;
  /** yo‘lni oxiridan boshiga qarab bosib o‘tish */
  backwards?: boolean;
  loaded?: boolean;
  /**
   * Tirkama yo‘nalishini hisoblash uchun to‘liq yo‘l (bo‘lak chegarasida uzilish bo‘lmasligi uchun)
   * va ushbu bo‘lakning shu yo‘ldagi boshlanish masofasi.
   */
  trailerPath?: Path2D;
  trailerBase?: number;
}
export interface WaitStep {
  kind: 'wait';
  duration: number;
  loaded?: boolean;
  /** to‘xtash nomi (debug) */
  label?: string;
}
export type Step = MoveStep | WaitStep;

export interface ScheduleSample extends Pose {
  visible: boolean;
  loaded: boolean;
  /** yo‘l bo‘ylab tezlik (g‘ildiraklar aylanishi uchun) */
  speed: number;
  /** Tirkama yo‘nalishi (yuk mashinasi uchun) */
  trailerHeading?: number;
}

export class Schedule {
  private items: { step: Step; t0: number; dur: number; profile?: Profile }[] = [];
  readonly duration: number;

  constructor(
    steps: Step[],
    /** sikl ichida boshlanish vaqti */
    readonly offset: number,
    /** umumiy sikl davomiyligi */
    readonly cycle: number,
    /** sikl tugagach ham ko‘rinib turadimi (doimiy aylanuvchi transport) */
    readonly persistent = false,
    readonly accel = 1.2,
  ) {
    let t = 0;
    for (const step of steps) {
      if (step.kind === 'wait') {
        this.items.push({ step, t0: t, dur: step.duration });
        t += step.duration;
      } else {
        const profile = trapezoid(step.path.length, step.vMax, this.accel, step.vStart ?? 0, step.vEnd ?? 0);
        this.items.push({ step, t0: t, dur: profile.duration, profile });
        t += profile.duration;
      }
    }
    this.duration = t;
  }

  sample(globalT: number, trailerOffset = 0): ScheduleSample {
    let local = (((globalT - this.offset) % this.cycle) + this.cycle) % this.cycle;
    if (local > this.duration) {
      if (!this.persistent) return { x: 0, z: 0, heading: 0, visible: false, loaded: false, speed: 0 };
      local = this.duration;
    }
    // oxirgi harakatlanuvchi holatni topish
    let lastPose: Pose = { x: 0, z: 0, heading: 0 };
    let lastTrailer = 0;
    let loaded = false;
    for (const it of this.items) {
      const inside = local >= it.t0 && local <= it.t0 + it.dur;
      if (it.step.kind === 'move') {
        const p = it.step.path;
        const tt = Math.min(Math.max(local - it.t0, 0), it.dur);
        let s = it.profile!.distanceAt(tt);
        if (it.step.backwards) s = p.length - s;
        const pose = p.poseAt(s);
        // yuzlanish = urinma + (teskari yo‘nalishda o‘tish ? π) + (orqaga yurish ? π)
        const heading = pose.heading + (it.step.backwards ? Math.PI : 0) + (it.step.reverse ? Math.PI : 0);
        let trailer = heading;
        if (trailerOffset > 0 && it.step.trailerPath) {
          // orqaga yurishda tirkama harakat yo‘nalishida oldinda bo‘ladi
          const dir = (it.step.backwards ? 1 : -1) * (it.step.reverse ? -1 : 1);
          const tp = it.step.trailerPath;
          const sAbs = (it.step.trailerBase ?? 0) + s;
          const back = tp.poseAt(sAbs + dir * trailerOffset);
          trailer = Math.atan2(pose.z - back.z, pose.x - back.x);
          if (sAbs + dir * trailerOffset < 0) trailer = heading;
        } else if (trailerOffset > 0) {
          const dir = it.step.backwards ? 1 : -1;
          const back = p.poseAt(s + dir * trailerOffset);
          trailer = Math.atan2(pose.z - back.z, pose.x - back.x);
          // yo‘l boshida — tirkama yo‘nalishi traktor bilan bir xil
          if ((!it.step.backwards && s < trailerOffset) || (it.step.backwards && p.length - s < trailerOffset)) {
            const blend = Math.min(1, it.step.backwards ? (p.length - s) / trailerOffset : s / trailerOffset);
            trailer = lerpAngle(pose.heading + (it.step.backwards ? Math.PI : 0), trailer, blend);
          }
        }
        lastPose = { x: pose.x, z: pose.z, heading };
        lastTrailer = trailer;
        loaded = !!it.step.loaded;
        if (inside) {
          const eps = 0.05;
          const s2 = it.profile!.distanceAt(Math.min(tt + eps, it.dur));
          const speed = Math.abs(s2 - (it.step.backwards ? p.length - s : s)) / eps;
          return { ...lastPose, visible: true, loaded, speed: Math.min(speed, 40), trailerHeading: lastTrailer };
        }
      } else if (inside) {
        return { ...lastPose, visible: true, loaded: it.step.loaded ?? loaded, speed: 0, trailerHeading: lastTrailer };
      }
      if (local < it.t0) break;
    }
    return { ...lastPose, visible: true, loaded, speed: 0, trailerHeading: lastTrailer };
  }
}

/* ------------------------------------------------------------------ */
function line(a: P2, b: P2): LineSeg {
  const len = dist(a, b);
  const d = len > 0 ? [(b[0] - a[0]) / len, (b[1] - a[1]) / len] : [1, 0];
  return { kind: 'line', ax: a[0], az: a[1], dx: d[0], dz: d[1], len };
}
const sub = (a: P2, b: P2): P2 => [a[0] - b[0], a[1] - b[1]];
const dist = (a: P2, b: P2) => Math.hypot(a[0] - b[0], a[1] - b[1]);
function norm(v: P2): P2 {
  const l = Math.hypot(v[0], v[1]) || 1;
  return [v[0] / l, v[1] / l];
}
export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
export function lerpAngle(a: number, b: number, t: number) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}
