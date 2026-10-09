import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Material kalitlari — materials.ts dagi kutubxona bilan mos */
export type MatKey =
  | 'cladding'
  | 'claddingDark'
  | 'claddingLight'
  | 'roof'
  | 'concrete'
  | 'concreteDark'
  | 'aluminium'
  | 'aluDark'
  | 'glass'
  | 'glassFacade'
  | 'glassTint'
  | 'glassDark'
  | 'solar'
  | 'steel'
  | 'galvanized'
  | 'paintWhite'
  | 'paintGrey'
  | 'paintDark'
  | 'paintOrange'
  | 'paintYellow'
  | 'paintBlue'
  | 'paintRed'
  | 'paintGreen'
  | 'rubber'
  | 'chrome'
  | 'screen'
  | 'floor'
  | 'floorShowroom'
  | 'wood'
  | 'felt'
  | 'mirror'
  | 'glassSheet'
  | 'glassGreen'
  | 'glassBronze'
  | 'glassBlue'
  | 'glassGrey'
  | 'marbleDark'
  | 'stoneGrey'
  | 'fabricLight'
  | 'shutter'
  | 'lightPanel'
  | 'lampWarm'
  | 'fabric'
  | 'plant'
  | 'heat'
  | 'asphalt'
  | 'yardConcrete'
  | 'grass'
  | 'markingWhite'
  | 'markingYellow'
  | 'markingGreen'
  | 'markingRed'
  | 'curb'
  | 'treeCrown'
  | 'treeTrunk'
  | 'cypress'
  | 'shrub';

export interface BuiltPart {
  key: MatKey;
  geometry: THREE.BufferGeometry;
}

type Vec3 = [number, number, number];

const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpE = new THREE.Euler();
const tmpS = new THREE.Vector3(1, 1, 1);
const tmpP = new THREE.Vector3();

/**
 * Ko‘p sonli oddiy shakllarni material bo‘yicha bitta geometriyaga birlashtiradi.
 * Natijada har bir komponent uchun material soniga teng draw call bo‘ladi.
 * UV koordinatalar dunyo metrlarida hisoblanadi (tekstura uzluksiz va masshtabga mos).
 */
export class GeoBuilder {
  private parts = new Map<MatKey, THREE.BufferGeometry[]>();

  add(key: MatKey, g: THREE.BufferGeometry, pos: Vec3 = [0, 0, 0], rot: Vec3 = [0, 0, 0], scale: Vec3 = [1, 1, 1]) {
    tmpE.set(rot[0], rot[1], rot[2]);
    tmpQ.setFromEuler(tmpE);
    tmpP.set(pos[0], pos[1], pos[2]);
    tmpS.set(scale[0], scale[1], scale[2]);
    tmpM.compose(tmpP, tmpQ, tmpS);
    const geo = g.index ? g.toNonIndexed() : g.clone();
    geo.applyMatrix4(tmpM);
    if (!this.parts.has(key)) this.parts.set(key, []);
    this.parts.get(key)!.push(geo);
    return this;
  }

  /** Markazi va o‘lchami bilan quti */
  box(key: MatKey, center: Vec3, size: Vec3, rotY = 0) {
    return this.add(key, new THREE.BoxGeometry(size[0], size[1], size[2]), center, [0, rotY, 0]);
  }

  /** Chegaralari bilan quti (x0..x1, y0..y1, z0..z1) */
  boxMinMax(key: MatKey, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) {
    return this.box(key, [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], [Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)]);
  }

  /** Silindr; axis — uzunlik yo‘nalishi */
  cyl(key: MatKey, center: Vec3, radius: number, length: number, axis: 'x' | 'y' | 'z' = 'y', segments = 16, radiusTop?: number) {
    const g = new THREE.CylinderGeometry(radiusTop ?? radius, radius, length, segments);
    const rot: Vec3 = axis === 'x' ? [0, 0, Math.PI / 2] : axis === 'z' ? [Math.PI / 2, 0, 0] : [0, 0, 0];
    return this.add(key, g, center, rot);
  }

  /** Yassi tekislik (yuqoriga qaragan) */
  plane(key: MatKey, center: Vec3, w: number, d: number) {
    return this.add(key, new THREE.PlaneGeometry(w, d), center, [-Math.PI / 2, 0, 0]);
  }

  /** Vertikal tekislik: normal yo‘nalishi bo‘yicha */
  vplane(key: MatKey, center: Vec3, w: number, h: number, normal: 'x+' | 'x-' | 'z+' | 'z-') {
    const ry = normal === 'z+' ? 0 : normal === 'z-' ? Math.PI : normal === 'x+' ? Math.PI / 2 : -Math.PI / 2;
    return this.add(key, new THREE.PlaneGeometry(w, h), center, [0, ry, 0]);
  }

  /** Ikki nuqta orasidagi to‘sin (kesimi kvadrat) */
  beam(key: MatKey, a: Vec3, b: Vec3, thickness: number) {
    const va = new THREE.Vector3(...a);
    const vb = new THREE.Vector3(...b);
    const len = va.distanceTo(vb);
    const g = new THREE.BoxGeometry(thickness, len, thickness);
    const mid = va.clone().add(vb).multiplyScalar(0.5);
    const dir = vb.clone().sub(va).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    const geo = g.toNonIndexed();
    geo.applyMatrix4(new THREE.Matrix4().compose(mid, q, new THREE.Vector3(1, 1, 1)));
    if (!this.parts.has(key)) this.parts.set(key, []);
    this.parts.get(key)!.push(geo);
    return this;
  }

  merge(other: GeoBuilder) {
    other.parts.forEach((list, key) => {
      if (!this.parts.has(key)) this.parts.set(key, []);
      this.parts.get(key)!.push(...list.map((g) => g.clone()));
    });
    return this;
  }

  isEmpty() {
    return this.parts.size === 0;
  }

  /** Material bo‘yicha birlashtirilgan geometriyalar */
  build(): BuiltPart[] {
    const out: BuiltPart[] = [];
    this.parts.forEach((list, key) => {
      const cleaned = list.map((g) => {
        // atributlar to‘plamini bir xillashtirish
        const n = new THREE.BufferGeometry();
        n.setAttribute('position', g.getAttribute('position'));
        if (!g.getAttribute('normal')) g.computeVertexNormals();
        n.setAttribute('normal', g.getAttribute('normal'));
        return n;
      });
      const merged = mergeGeometries(cleaned, false);
      if (!merged) return;
      worldUV(merged);
      merged.computeBoundingBox();
      merged.computeBoundingSphere();
      out.push({ key, geometry: merged });
      list.forEach((g) => g.dispose());
      cleaned.forEach((g) => g.dispose());
    });
    this.parts.clear();
    return out;
  }
}

/** Har bir uchburchak uchun dominant normal bo‘yicha dunyo-metr UV (triplanar-ga o‘xshash) */
export function worldUV(geo: THREE.BufferGeometry) {
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  const nrm = geo.getAttribute('normal') as THREE.BufferAttribute;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i += 3) {
    // uchburchakning o‘rtacha normali
    let nx = 0;
    let ny = 0;
    let nz = 0;
    for (let k = 0; k < 3 && i + k < pos.count; k++) {
      nx += nrm.getX(i + k);
      ny += nrm.getY(i + k);
      nz += nrm.getZ(i + k);
    }
    const ax = Math.abs(nx);
    const ay = Math.abs(ny);
    const az = Math.abs(nz);
    for (let k = 0; k < 3 && i + k < pos.count; k++) {
      const x = pos.getX(i + k);
      const y = pos.getY(i + k);
      const z = pos.getZ(i + k);
      let u: number;
      let v: number;
      if (ay >= ax && ay >= az) {
        u = x;
        v = z;
      } else if (ax >= az) {
        u = z;
        v = y;
      } else {
        u = x;
        v = y;
      }
      uv[(i + k) * 2] = u;
      uv[(i + k) * 2 + 1] = v;
    }
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

/** Qurilgan qismlar chegaralari (testlar uchun) */
export function partsBounds(parts: BuiltPart[], filter?: (k: MatKey) => boolean) {
  const box = new THREE.Box3();
  for (const p of parts) {
    if (filter && !filter(p.key)) continue;
    p.geometry.computeBoundingBox();
    box.union(p.geometry.boundingBox!);
  }
  return box;
}
