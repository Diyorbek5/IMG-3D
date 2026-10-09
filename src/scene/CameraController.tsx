import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { CameraControls } from '@react-three/drei';
import type CameraControlsImpl from 'camera-controls';
import { cameraConfig } from '../config/cameraConfig';
import { Path2D } from '../lib/motion';
import { useStore, type CameraPreset } from '../state/store';
import { forcedOpenDoors } from './building/RollerShutterDoors';

/**
 * Kamera boshqaruvi: orbit / zoom / pan (camera-controls), ko‘rinishlar orasida silliq o‘tish,
 * obyektga fokuslash va ichki sayr (walkthrough).
 */
export function CameraController() {
  const ref = useRef<CameraControlsImpl>(null);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const get = useThree((s) => s.get);
  const request = useStore((s) => s.camera);
  const walkthrough = useStore((s) => s.walkthrough);
  const first = useRef(true);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const st = useStore.getState();
    if (request.focus) {
      const box = new THREE.Box3(new THREE.Vector3(...request.focus.min), new THREE.Vector3(...request.focus.max));
      const sz = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const radius = Math.max(sz.x, sz.y, sz.z, 6);
      // joriy yo‘nalishni saqlab, obyektga yaqinlashish
      const dir = new THREE.Vector3();
      c.getPosition(dir);
      const tgt = new THREE.Vector3();
      c.getTarget(tgt);
      dir.sub(tgt).normalize();
      if (dir.y < 0.35) dir.y = 0.35;
      dir.normalize();
      const dist = (radius * 0.9) / Math.tan((camera.fov * Math.PI) / 360) + 2;
      const pos = center.clone().addScaledVector(dir, dist);
      c.setLookAt(pos.x, pos.y, pos.z, center.x, center.y, center.z, true);
      st.setActivePreset(null);
      return;
    }
    const preset = request.preset as CameraPreset | undefined;
    if (!preset) return;
    const smooth = !first.current;
    first.current = false;
    if (preset === 'top') {
      const { center, extent } = cameraConfig.top;
      const size = get().size;
      const aspect = size.width / Math.max(1, size.height);
      const t = Math.tan((camera.fov * Math.PI) / 360);
      const h = Math.max(extent[1] / 2 / t, extent[0] / 2 / (t * aspect)) * 1.04;
      c.setLookAt(center[0], h, center[2] + 0.01, center[0], 0, center[2], smooth);
    } else {
      const p = cameraConfig.presets[preset];
      c.setLookAt(...p.position, ...p.target, smooth);
    }
    st.setActivePreset(preset);
    if (preset === 'interior') st.setLayer('roofs', false);
    else if (preset !== 'top') st.setLayer('roofs', true);
  }, [request, camera, get]);

  useEffect(() => {
    if (ref.current) ref.current.enabled = !walkthrough;
  }, [walkthrough]);

  return (
    <>
      <CameraControls
        ref={ref}
        makeDefault
        minDistance={4}
        maxDistance={900}
        maxPolarAngle={Math.PI / 2 - 0.02}
        smoothTime={0.6}
        draggingSmoothTime={0.12}
        dollyToCursor
      />
      {walkthrough && <Walkthrough controls={ref} />}
    </>
  );
}

/** Ichki hududlar bo‘ylab kamera sayri */
function Walkthrough({ controls }: { controls: React.RefObject<CameraControlsImpl | null> }) {
  const setWalkthrough = useStore((s) => s.setWalkthrough);
  const cfg = cameraConfig.walkthrough;
  const path = useMemo(() => Path2D.rounded(cfg.points.map((p) => [p[0], p[2]] as [number, number]), 3), [cfg.points]);
  const t0 = useRef<number | null>(null);
  const look = useMemo(() => new THREE.Vector3(), []);
  const prevRoofs = useRef(useStore.getState().layers.roofs);

  useEffect(() => {
    forcedOpenDoors.add('door-3');
    const st = useStore.getState();
    prevRoofs.current = st.layers.roofs;
    st.setLayer('roofs', true);
    return () => {
      forcedOpenDoors.delete('door-3');
      useStore.getState().setLayer('roofs', prevRoofs.current);
    };
  }, []);

  useFrame((state) => {
    if (t0.current === null) t0.current = state.clock.elapsedTime;
    const el = state.clock.elapsedTime - t0.current;
    const u = Math.min(1, el / cfg.duration);
    // yumshoq boshlanish va tugash
    const e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
    const s = e * path.length;
    const p = path.poseAt(s);
    const ahead = path.poseAt(Math.min(path.length, s + cfg.lookAhead));
    const eye = cfg.points[0][1];
    look.set(ahead.x, eye - 0.25, ahead.z);
    if (Math.hypot(ahead.x - p.x, ahead.z - p.z) < 4.5) look.set(p.x + Math.cos(p.heading) * 5, eye - 0.25, p.z + Math.sin(p.heading) * 5);
    // kamera camera-controls orqali boshqariladi (foydalanuvchi kiritishi o‘chirilgan)
    controls.current?.setLookAt(p.x, eye, p.z, look.x, look.y, look.z, false);
    if (u >= 1) setWalkthrough(false);
  });
  return null;
}
