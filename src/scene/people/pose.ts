import type * as THREE from 'three';
import type { PersonSample } from '../../lib/people';
import { BONE } from './humanGeometry';

type V3 = [number, number, number];

/**
 * Suyaklarga poza beradi: yurish sikli (son, tizza, to‘piq, tos tebranishi, qo‘llar),
 * tik turish (nafas, og‘irlikni almashtirish, atrofga qarash), ish harakatlari, o‘tirish,
 * klaviaturada yozish, ovqatlanish va suhbat imo-ishoralari.
 */
export function applyPose(bones: THREE.Bone[], rest: V3[], scale: number, s: PersonSample, seed: number, opts: { tablet?: boolean } = {}) {
  for (let i = 0; i < bones.length; i++) {
    bones[i].rotation.set(0, 0, 0);
    bones[i].position.set(rest[i][0], rest[i][1], rest[i][2]);
  }
  const b = (k: keyof typeof BONE) => bones[BONE[k]];
  const t = s.local;
  const r = seed * 1.37;
  const sin = Math.sin;
  const arm = (side: 'L' | 'R', x: number, z: number, fore: number, hand = 0) => {
    const sg = side === 'L' ? 1 : -1;
    b(`upperArm${side}`).rotation.set(x, 0, z * sg);
    b(`foreArm${side}`).rotation.x = fore;
    b(`hand${side}`).rotation.x = hand;
  };

  if (s.pose === 'walk') {
    const p = s.phase;
    const A = 0.42;
    const legs = (side: 'L' | 'R', ph: number) => {
      const thigh = -A * sin(ph);
      const knee = 0.06 + 0.85 * Math.pow(Math.max(0, Math.cos(ph + Math.PI / 6)), 1.6);
      b(`thigh${side}`).rotation.x = thigh;
      b(`shin${side}`).rotation.x = knee;
      b(`foot${side}`).rotation.x = -(thigh + knee) * 0.8 + 0.12 * Math.max(0, sin(ph - Math.PI / 2));
    };
    legs('L', p);
    legs('R', p + Math.PI);
    b('hips').position.y = rest[BONE.hips][1] + scale * (0.012 - 0.03 * Math.abs(sin(p)));
    b('hips').rotation.y = 0.07 * sin(p);
    b('hips').rotation.z = 0.03 * Math.cos(p);
    b('spine').rotation.set(0.04, -0.05 * sin(p), -0.02 * Math.cos(p));
    b('chest').rotation.y = -0.06 * sin(p);
    b('neck').rotation.x = 0.03;
    b('head').rotation.y = 0.05 * sin(p);
    if (opts.tablet) {
      arm('R', -0.45, 0.1, -1.15, 0.2);
      arm('L', 0.3 * sin(p), 0.08, -0.25 - 0.25 * Math.max(0, -sin(p)));
    } else {
      arm('L', 0.32 * sin(p), 0.08, -0.2 - 0.25 * Math.max(0, -sin(p)));
      arm('R', -0.32 * sin(p), 0.08, -0.2 - 0.25 * Math.max(0, sin(p)));
    }
    return;
  }

  const seated = s.seat !== undefined;
  // nafas olish va mayda tebranishlar (hamma pozalarda)
  b('chest').rotation.x = 0.012 * sin(t * 1.6 + r);
  if (seated) {
    const seat = s.seat!;
    b('hips').position.y = seat + 0.1 * scale;
    b('hips').rotation.x = -0.05;
    for (const [side, sg] of [
      ['L', 1],
      ['R', -1],
    ] as const) {
      b(`thigh${side}`).rotation.set(-1.5, 0, 0.07 * sg);
      b(`shin${side}`).rotation.x = 1.42 + 0.06 * sin(t * 0.4 + r + sg);
      b(`foot${side}`).rotation.x = 0.05;
    }
    b('spine').rotation.x = 0.06;
  } else {
    // og‘irlikni bir oyoqdan ikkinchisiga o‘tkazish
    const shift = 0.025 * sin(t * 0.35 + r);
    b('hips').rotation.z = shift;
    b('thighL').rotation.z = -shift;
    b('thighR').rotation.z = -shift;
    b('shinL').rotation.x = 0.03;
    b('shinR').rotation.x = 0.03;
  }

  switch (s.pose) {
    case 'work': {
      // stol ustida ishlash: oldinga engashish, qo‘llar navbat bilan harakatlanadi
      b('spine').rotation.x += 0.16;
      b('chest').rotation.x += 0.06;
      b('neck').rotation.x = 0.32;
      const w = t * 2.1 + r;
      arm('L', -0.62 + 0.12 * sin(w), -0.12, -1.0 + 0.14 * sin(w * 1.3), -0.2);
      arm('R', -0.62 + 0.12 * sin(w + 1.7), -0.12, -1.0 + 0.14 * sin(w * 1.3 + 2), -0.2);
      b('chest').rotation.y = 0.08 * sin(t * 0.5 + r);
      break;
    }
    case 'look': {
      // uskuna / planshetga qarash
      b('neck').rotation.x = 0.22;
      b('head').rotation.set(0.1, 0.25 * sin(t * 0.23 + r), 0);
      if (opts.tablet) {
        arm('R', -0.45, 0.12, -1.15, 0.2);
        arm('L', -0.32, -0.1, -1.05);
      } else {
        arm('L', 0.05, 0.07, -0.15);
        arm('R', -0.35 + 0.08 * sin(t * 0.7 + r), 0.05, -0.85);
      }
      break;
    }
    case 'talk': {
      const g = t * 1.7 + r;
      b('neck').rotation.x = 0.04 * sin(t * 1.1 + r);
      b('head').rotation.y = 0.2 * sin(t * 0.31 + r);
      if (seated) {
        arm('L', -0.5, -0.1, -0.95);
        arm('R', -0.55 + 0.18 * Math.max(0, sin(g)), -0.08, -1.05 + 0.3 * sin(g * 1.4));
      } else {
        arm('L', -0.08, 0.07, -0.25);
        arm('R', -0.4 + 0.15 * sin(g), 0.1, -1.15 + 0.3 * sin(g * 1.4), 0.2);
      }
      break;
    }
    case 'type': {
      b('neck').rotation.x = 0.18;
      const k = t * 7 + r;
      arm('L', -0.55, -0.14, -0.95 + 0.04 * sin(k), -0.15);
      arm('R', -0.55, -0.14, -0.95 + 0.04 * sin(k + 1.3), -0.15);
      break;
    }
    case 'eat': {
      b('neck').rotation.x = 0.12;
      const cyc = (t + r * 3) % 7;
      const lift = cyc < 1.4 ? sin((cyc / 1.4) * Math.PI) : 0;
      arm('L', -0.5, -0.12, -0.95);
      arm('R', -0.55 - 0.3 * lift, -0.12 - 0.08 * lift, -0.95 - 1.0 * lift, -0.2);
      b('head').rotation.x = -0.08 * lift;
      break;
    }
    case 'sit': {
      arm('L', -0.35, 0.02, -0.75);
      arm('R', -0.35, 0.02, -0.75);
      break;
    }
    default: {
      // tik turish: qo‘llar bo‘shashgan, atrofga qarash
      b('head').rotation.y = 0.3 * sin(t * 0.21 + r);
      arm('L', 0.04 * sin(t * 0.5 + r), 0.07, -0.15);
      arm('R', 0.04 * sin(t * 0.5 + r + 1), 0.07, -0.15);
    }
  }
}
