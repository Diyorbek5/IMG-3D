import { useEffect, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { factoryConfig } from '../../config/factoryConfig';
import { getSegments, HALF_W, showroomRect } from '../../lib/layout';
import { useStore } from '../../state/store';

interface Entry {
  el: HTMLElement;
  pos: THREE.Vector3;
  /** kichikroq — muhimroq (avval joylashtiriladi) */
  priority: number;
}

const entries = new Set<Entry>();

/**
 * HTML yozuvlar uchun o‘rinni boshqaruvchi: yozuvlar ekran bo‘yicha bir-birining ustiga chiqsa,
 * muhimligi past (va kameradan uzoqroq) yozuv vaqtincha yashiriladi.
 */
export function ManagedLabel({ position, priority, children, className, onClick, title }: { position: [number, number, number]; priority: number; children: ReactNode; className?: string; onClick?: () => void; title?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const e: Entry = { el, pos: new THREE.Vector3(...position), priority };
    entries.add(e);
    return () => {
      entries.delete(e);
    };
  }, [position, priority]);
  return (
    <div
      ref={ref}
      className={className}
      title={title}
      style={{ visibility: 'hidden' }}
      // 3D sahnaga "bo‘sh joyni bosish" bo‘lib o‘tib ketmasligi uchun
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      {children}
    </div>
  );
}

/**
 * Yozuvlarni to‘sib qo‘yadigan soddalashtirilgan hajmlar (bino segmentlari, showroom, omborlar).
 * Nur–quti kesishuvi juda arzon, shuning uchun har 0.12 s da barcha yozuvlar tekshiriladi.
 */
function occluderBoxes(): { box: THREE.Box3; roofed: boolean }[] {
  const out: { box: THREE.Box3; roofed: boolean }[] = [];
  for (const s of getSegments()) out.push({ box: new THREE.Box3(new THREE.Vector3(-HALF_W, 0, s.z0), new THREE.Vector3(HALF_W, s.height, s.z1)), roofed: true });
  const sr = showroomRect();
  out.push({ box: new THREE.Box3(new THREE.Vector3(sr.x0, 0, sr.z0), new THREE.Vector3(sr.x1, factoryConfig.showroom.height, sr.z1)), roofed: true });
  for (const w of factoryConfig.neighborBuildings) {
    // qo‘shni binolarning tomi doimo yopiq
    out.push({ box: new THREE.Box3(new THREE.Vector3(w.rect.x0, 0, w.rect.z0), new THREE.Vector3(w.rect.x1, w.height, w.rect.z1)), roofed: false });
  }
  return out;
}

const v = new THREE.Vector3();
const ray = new THREE.Ray();
const hitP = new THREE.Vector3();
const UI_SELECTORS = '.side-panel.is-open, .toolbar, .brand, .anim-bar, .panel-toggle';

export function LabelDeclutter() {
  const last = useRef(0);
  const boxes = useRef(occluderBoxes());
  useFrame(({ camera, clock }) => {
    if (clock.elapsedTime - last.current < 0.12) return;
    last.current = clock.elapsedTime;
    const roofs = useStore.getState().layers.roofs;
    const list = [...entries].map((e) => {
      v.copy(e.pos).project(camera);
      return { e, ndc: v.clone(), dist: camera.position.distanceTo(e.pos) };
    });
    list.sort((a, b) => a.e.priority - b.e.priority || a.dist - b.dist);
    // interfeys panellari ostiga yozuv chiqmasin
    const placed: DOMRect[] = [...document.querySelectorAll(UI_SELECTORS)].map((n) => n.getBoundingClientRect());
    const pad = 3;
    for (const { e, ndc, dist } of list) {
      const off = ndc.z > 1 || ndc.z < -1 || Math.abs(ndc.x) > 1.05 || Math.abs(ndc.y) > 1.05;
      if (off) {
        e.el.style.visibility = 'hidden';
        continue;
      }
      // bino orqasida qolgan yozuvni yashirish
      if (e.priority > 0) {
        ray.origin.copy(camera.position);
        ray.direction.copy(e.pos).sub(camera.position).normalize();
        let occluded = false;
        for (const b of boxes.current) {
          if (b.box.containsPoint(e.pos)) continue;
          if (!roofs && b.roofed && camera.position.y > b.box.max.y) continue;
          if (ray.intersectBox(b.box, hitP) && hitP.distanceTo(camera.position) < dist - 0.5) {
            occluded = true;
            break;
          }
        }
        if (occluded) {
          e.el.style.visibility = 'hidden';
          continue;
        }
      }
      const r = e.el.getBoundingClientRect();
      if (r.width === 0) continue;
      if (r.left < 2 || r.top < 2 || r.right > window.innerWidth - 2 || r.bottom > window.innerHeight - 2) {
        e.el.style.visibility = 'hidden';
        continue;
      }
      const hit = placed.some((p) => r.left < p.right + pad && r.right > p.left - pad && r.top < p.bottom + pad && r.bottom > p.top - pad);
      if (hit) e.el.style.visibility = 'hidden';
      else {
        e.el.style.visibility = 'visible';
        placed.push(r);
      }
    }
  });
  return null;
}
