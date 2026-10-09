import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { Environment, Lightformer, Sky, Stars } from '@react-three/drei';
import { applyLightingMode, setGlassMode, type LightingMode } from '../three/materials';
import { useStore, type Quality } from '../state/store';

interface Preset {
  /** quyosh yo‘nalishi (birlik vektor, quyosh tomonga) */
  sun: [number, number, number];
  sunColor: string;
  sunIntensity: number;
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  fog: string;
  fogNear: number;
  fogFar: number;
  turbidity: number;
  rayleigh: number;
  mie: number;
  exposure: number;
  envIntensity: number;
}

/**
 * Old fasad shimolga qaragan, shuning uchun asosiy kunduzgi render uchun
 * ertalabki shimoli-sharqiy quyosh tanlangan (fasad va shisha burchak yoritiladi).
 */
export const LIGHTING: Record<LightingMode, Preset> = {
  day: {
    sun: [0.62, 0.62, -0.48],
    sunColor: '#fff1dc',
    sunIntensity: 2.5,
    hemiSky: '#bcd6f5',
    hemiGround: '#6f6a5a',
    hemiIntensity: 0.42,
    fog: '#cdd8e2',
    fogNear: 380,
    fogFar: 1700,
    turbidity: 3.5,
    rayleigh: 1.7,
    mie: 0.003,
    exposure: 0.92,
    envIntensity: 0.75,
  },
  sunset: {
    sun: [-0.78, 0.12, -0.62],
    sunColor: '#ffb070',
    sunIntensity: 2.6,
    hemiSky: '#ffd2a8',
    hemiGround: '#5a4a3c',
    hemiIntensity: 0.55,
    fog: '#e6b996',
    fogNear: 300,
    fogFar: 1500,
    turbidity: 9,
    rayleigh: 2.6,
    mie: 0.008,
    exposure: 0.95,
    envIntensity: 0.8,
  },
  night: {
    sun: [0.3, 0.55, 0.4],
    sunColor: '#9fb6ff',
    sunIntensity: 0.35,
    hemiSky: '#3a4f78',
    hemiGround: '#141820',
    hemiIntensity: 0.38,
    fog: '#0b1220',
    fogNear: 250,
    fogFar: 1200,
    turbidity: 1,
    rayleigh: 0.2,
    mie: 0.001,
    exposure: 1.25,
    envIntensity: 0.35,
  },
};

const SHADOW_SIZE: Record<Quality, number> = { high: 4096, medium: 2048, low: 1024 };
/** Soya kamerasi qamrovi markazi (asosiy bino va omborlar) */
const SHADOW_CENTER = new THREE.Vector3(55, 0, 40);

/** Tungi fasad yoritgichlari (faqat tun rejimida — soyasiz projektorlar) */
function NightFacadeLights() {
  const spots: { pos: [number, number, number]; target: [number, number, number]; intensity: number }[] = [
    { pos: [-8, 0.6, -14], target: [-8, 8, 0], intensity: 900 },
    { pos: [6, 0.6, -24], target: [4, 9, 0], intensity: 900 },
    { pos: [15.5, 0.4, -22], target: [15.5, 3, -12], intensity: 600 },
    { pos: [44, 0.6, 16], target: [44, 7, 27], intensity: 900 },
    { pos: [108, 0.6, 24], target: [108, 6, 37], intensity: 700 },
  ];
  return (
    <>
      {spots.map((s, i) => (
        <SpotTo key={i} {...s} />
      ))}
    </>
  );
}

function SpotTo({ pos, target, intensity }: { pos: [number, number, number]; target: [number, number, number]; intensity: number }) {
  const ref = useRef<THREE.SpotLight>(null);
  useEffect(() => {
    const l = ref.current;
    if (!l) return;
    l.target.position.set(...target);
    l.target.updateMatrixWorld();
  }, [target]);
  return <spotLight ref={ref} position={pos} angle={0.75} penumbra={0.8} intensity={intensity} distance={60} decay={2} color="#ffd8a8" />;
}

export function Lighting() {
  const mode = useStore((s) => s.lighting);
  const quality = useStore((s) => s.quality);
  const p = LIGHTING[mode];
  const { gl, scene } = useThree();
  const sun = useRef<THREE.DirectionalLight>(null);
  const sunDir = useMemo(() => new THREE.Vector3(...p.sun).normalize(), [p.sun]);
  const skySunPos = useMemo<[number, number, number]>(() => {
    // tun rejimida osmon qorong‘i bo‘lishi uchun quyosh ufq ostida
    if (mode === 'night') return [0.2, -0.25, 0.5];
    return [sunDir.x, sunDir.y, sunDir.z];
  }, [mode, sunDir]);

  useEffect(() => {
    applyLightingMode(mode);
    gl.toneMappingExposure = p.exposure;
    scene.fog = new THREE.Fog(p.fog, p.fogNear, p.fogFar);
    return () => {
      scene.fog = null;
    };
  }, [mode, p, gl, scene]);

  useEffect(() => {
    setGlassMode(quality === 'high' ? 'transmission' : 'alpha');
  }, [quality]);

  useEffect(() => {
    const l = sun.current;
    if (!l) return;
    l.target.position.copy(SHADOW_CENTER);
    l.target.updateMatrixWorld();
    const cam = l.shadow.camera as THREE.OrthographicCamera;
    const r = 165;
    cam.left = -r;
    cam.right = r;
    cam.top = r;
    cam.bottom = -r;
    cam.near = 10;
    cam.far = 800;
    cam.updateProjectionMatrix();
    l.shadow.mapSize.set(SHADOW_SIZE[quality], SHADOW_SIZE[quality]);
    l.shadow.map?.dispose();
    l.shadow.map = null as unknown as THREE.WebGLRenderTarget;
    l.shadow.needsUpdate = true;
  }, [quality]);

  const sunPos = useMemo(() => SHADOW_CENTER.clone().addScaledVector(sunDir, 380), [sunDir]);

  return (
    <>
      <Sky distance={4000} sunPosition={skySunPos} turbidity={p.turbidity} rayleigh={p.rayleigh} mieCoefficient={p.mie} mieDirectionalG={0.85} />
      {mode === 'night' && <Stars radius={1500} depth={300} count={2500} factor={18} saturation={0} fade speed={0} />}
      {mode === 'night' && <NightFacadeLights />}
      <hemisphereLight args={[p.hemiSky, p.hemiGround, p.hemiIntensity]} />
      <directionalLight
        ref={sun}
        position={sunPos}
        color={p.sunColor}
        intensity={p.sunIntensity}
        castShadow
        shadow-bias={-0.0004}
        shadow-normalBias={0.06}
      />
      <Environment key={mode} resolution={256} frames={1} environmentIntensity={p.envIntensity}>
        <Sky distance={4000} sunPosition={skySunPos} turbidity={p.turbidity} rayleigh={p.rayleigh} mieCoefficient={p.mie} mieDirectionalG={0.85} />
        {/* yer yuzasidan qaytgan yorug‘lik */}
        <Lightformer form="rect" intensity={mode === 'night' ? 0.05 : 0.6} color={mode === 'sunset' ? '#8a6a50' : '#8d8a7c'} position={[0, -40, 0]} rotation-x={Math.PI / 2} scale={[400, 400, 1]} />
        <Lightformer form="rect" intensity={mode === 'night' ? 0.4 : 1.4} color="#ffffff" position={[0, 60, -90]} scale={[120, 30, 1]} />
        {mode === 'night' && <Lightformer form="ring" intensity={2} color="#ffd9a0" position={[40, 20, 40]} scale={20} />}
      </Environment>
    </>
  );
}
