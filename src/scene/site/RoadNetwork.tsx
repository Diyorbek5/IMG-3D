import { useMemo } from 'react';
import * as THREE from 'three';
import { factoryConfig } from '../../config/factoryConfig';
import { roadFrame } from '../../lib/layout';
import { GeoBuilder } from '../../three/GeoBuilder';
import { Built, Selectable } from '../common/Built';

/** Yassi ko‘pburchak (x, z nuqtalar) → gorizontal geometriya */
export function polygonGeometry(points: [number, number][], y: number) {
  const shape = new THREE.Shape(points.map(([x, z]) => new THREE.Vector2(x, -z)));
  const g = new THREE.ShapeGeometry(shape, 2);
  g.rotateX(-Math.PI / 2);
  g.translate(0, y, 0);
  return g;
}

/** Yo‘l lokal koordinatalaridagi to‘rtburchak (u0..u1, v0..v1) → dunyo ko‘pburchagi */
export function roadQuad(u0: number, u1: number, v0: number, v1: number): [number, number][] {
  const rf = roadFrame();
  return [rf.toWorld(u0, v0), rf.toWorld(u1, v0), rf.toWorld(u1, v1), rf.toWorld(u0, v1)].map((p) => [p.x, p.z] as [number, number]);
}

/**
 * Katta avtomobil yo‘li — masterplandagi qizil chiziq o‘rnida, kulrang asfalt:
 * 2 × 2 bo‘lak, ajratuvchi ikki chiziq, punktir bo‘lak chiziqlari, chekka chiziqlar,
 * bordyurlar, piyodalar yo‘lagi va hududga kirish/chiqish tutashuvlari.
 */
export function RoadNetwork() {
  const parts = useMemo(() => {
    const cfg = factoryConfig;
    const rf = roadFrame();
    const b = new GeoBuilder();
    const L = cfg.road.halfLength;
    const half = rf.half;
    const ang = -rf.angle;
    const at = (u: number, v: number, y: number): [number, number, number] => {
      const p = rf.toWorld(u, v);
      return [p.x, y, p.z];
    };
    // asfalt qoplama
    b.add('asphalt', polygonGeometry(roadQuad(-L, L, -half, half), 0.03));
    // bordyurlar
    for (const s of [-1, 1]) b.add('curb', new THREE.BoxGeometry(L * 2, 0.18, 0.3), at(0, s * (half + 0.15), 0.09), [0, ang, 0]);
    // piyodalar yo‘laklari
    for (const s of [-1, 1]) {
      const v0 = s * (half + 0.3);
      const v1 = s * (half + 0.3 + cfg.road.sidewalkWidth);
      b.add('concrete', polygonGeometry(roadQuad(-L, L, Math.min(v0, v1), Math.max(v0, v1)), 0.12));
    }
    // ajratuvchi ikki uzluksiz chiziq
    for (const v of [-0.18, 0.18]) b.add('markingYellow', new THREE.BoxGeometry(L * 2, 0.01, 0.12), at(0, v, 0.04), [0, ang, 0]);
    // chekka chiziqlar
    for (const s of [-1, 1]) b.add('markingWhite', new THREE.BoxGeometry(L * 2, 0.01, 0.15), at(0, s * (half - 0.35), 0.04), [0, ang, 0]);
    // bo‘laklar orasidagi punktir chiziqlar
    const lw = cfg.road.laneWidth;
    const m = cfg.road.medianWidth / 2;
    for (const s of [-1, 1]) {
      for (let i = 1; i < cfg.road.lanesPerDirection; i++) {
        const v = s * (m + lw * i);
        for (let u = -L; u < L; u += 12) b.add('markingWhite', new THREE.BoxGeometry(6, 0.01, 0.13), at(u + 3, v, 0.04), [0, ang, 0]);
      }
    }
    // yo‘nalish strelkalari (har 60 m)
    const arrow = new THREE.CylinderGeometry(0.0001, 0.9, 0.01, 3);
    for (let u = -L + 40; u < L; u += 80) {
      for (const s of [-1, 1]) {
        for (let i = 0; i < cfg.road.lanesPerDirection; i++) {
          const v = s * (m + lw * (i + 0.5));
          const dirSign = s > 0 ? 1 : -1; // janubiy bo‘laklar — sharqqa
          b.add('markingWhite', new THREE.BoxGeometry(2.2, 0.01, 0.22), at(u, v, 0.045), [0, ang, 0]);
          b.add('markingWhite', arrow, at(u + dirSign * 1.6, v, 0.045), [0, ang + (dirSign * Math.PI) / 2, 0], [1, 1, 1.4]);
        }
      }
    }
    // hududga kirish va chiqish tutashuvlari (asfalt)
    const fenceV = rf.fenceV;
    for (const gx of [cfg.site.entryGateX]) {
      const gw = cfg.site.gateWidth / 2;
      const flare = 7;
      const pts: [number, number][] = [
        [gx - gw - flare, rf.zAt(gx - gw - flare, half - 0.2)],
        [gx + gw + flare, rf.zAt(gx + gw + flare, half - 0.2)],
        [gx + gw, rf.zAt(gx + gw, half + cfg.road.sidewalkWidth + 1.5)],
        [gx + gw, rf.zAt(gx + gw, fenceV + 2)],
        [gx - gw, rf.zAt(gx - gw, fenceV + 2)],
        [gx - gw, rf.zAt(gx - gw, half + cfg.road.sidewalkWidth + 1.5)],
      ];
      b.add('asphalt', polygonGeometry(pts, 0.135));
      // to‘xtash chizig‘i (chiqish bo‘lagida) va bo‘laklar orasidagi chiziq
      b.add('markingWhite', new THREE.BoxGeometry(gw, 0.01, 0.4), [gx + gw / 2, 0.15, rf.zAt(gx + gw / 2, fenceV - 0.5)], [0, ang, 0]);
    }
    return b.build();
  }, []);
  return (
    <Selectable id="road">
      <Built parts={parts} castShadow={false} />
    </Selectable>
  );
}
