import { create } from 'zustand';
import type { LightingMode } from '../three/materials';

export type CameraPreset = 'reset' | 'front' | 'side' | 'rear' | 'top' | 'iso' | 'interior';
export type Quality = 'high' | 'medium' | 'low';
export type DoorMode = 'auto' | 'open' | 'closed';
export type PlayState = 'playing' | 'paused' | 'stopped';
export type PanelTab = 'layers' | 'zones' | 'info' | 'report';

export interface Layers {
  dimsOverall: boolean;
  dimsZones: boolean;
  grid: boolean;
  equipment: boolean;
  optionalEquipment: boolean;
  flow: boolean;
  labels: boolean;
  roofs: boolean;
  upperFloor: boolean;
  vehicles: boolean;
  landscape: boolean;
}

interface CameraRequest {
  preset?: CameraPreset;
  /** Fokuslash uchun chegaralar */
  focus?: { min: [number, number, number]; max: [number, number, number] };
  nonce: number;
}

interface AppState {
  layers: Layers;
  toggleLayer: (k: keyof Layers) => void;
  setLayer: (k: keyof Layers, v: boolean) => void;

  lighting: LightingMode;
  setLighting: (m: LightingMode) => void;
  quality: Quality;
  setQuality: (q: Quality) => void;

  play: PlayState;
  setPlay: (p: PlayState) => void;
  speed: number;
  setSpeed: (s: number) => void;
  restartNonce: number;
  restart: () => void;

  doorMode: DoorMode;
  setDoorMode: (m: DoorMode) => void;

  selected: string | null;
  select: (id: string | null) => void;
  hovered: string | null;
  setHovered: (id: string | null) => void;

  camera: CameraRequest;
  requestCamera: (r: Omit<CameraRequest, 'nonce'>) => void;
  activePreset: CameraPreset | null;
  setActivePreset: (p: CameraPreset | null) => void;

  walkthrough: boolean;
  setWalkthrough: (v: boolean) => void;

  panelOpen: boolean;
  setPanelOpen: (v: boolean) => void;
  tab: PanelTab;
  setTab: (t: PanelTab) => void;

  ready: boolean;
  setReady: (v: boolean) => void;
}

function initialQuality(): Quality {
  if (typeof window === 'undefined') return 'medium';
  const q = new URLSearchParams(window.location.search).get('q');
  if (q === 'high' || q === 'medium' || q === 'low') return q;
  const coarse = window.matchMedia?.('(pointer: coarse)').matches;
  const small = Math.min(window.innerWidth, window.innerHeight) < 700;
  if (coarse || small) return 'low';
  return (navigator.hardwareConcurrency ?? 4) >= 8 ? 'high' : 'medium';
}

const isSmall = typeof window !== 'undefined' && window.innerWidth < 900;

export const useStore = create<AppState>((set) => ({
  layers: {
    dimsOverall: true,
    dimsZones: true,
    grid: false,
    equipment: true,
    optionalEquipment: true,
    flow: false,
    labels: true,
    roofs: true,
    upperFloor: true,
    vehicles: true,
    landscape: true,
  },
  toggleLayer: (k) => set((s) => ({ layers: { ...s.layers, [k]: !s.layers[k] } })),
  setLayer: (k, v) => set((s) => ({ layers: { ...s.layers, [k]: v } })),

  lighting: 'day',
  setLighting: (lighting) => set({ lighting }),
  quality: initialQuality(),
  setQuality: (quality) => set({ quality }),

  play: 'playing',
  setPlay: (play) => set({ play }),
  speed: 1,
  setSpeed: (speed) => set({ speed }),
  restartNonce: 0,
  restart: () => set((s) => ({ restartNonce: s.restartNonce + 1, play: 'playing' })),

  doorMode: 'auto',
  setDoorMode: (doorMode) => set({ doorMode }),

  selected: null,
  select: (selected) => set((s) => ({ selected, tab: selected ? 'info' : s.tab, panelOpen: selected ? true : s.panelOpen })),
  hovered: null,
  setHovered: (hovered) => set({ hovered }),

  camera: { preset: 'reset', nonce: 0 },
  requestCamera: (r) => set((s) => ({ camera: { ...r, nonce: s.camera.nonce + 1 } })),
  activePreset: 'reset',
  setActivePreset: (activePreset) => set({ activePreset }),

  walkthrough: false,
  setWalkthrough: (walkthrough) => set({ walkthrough }),

  panelOpen: !isSmall,
  setPanelOpen: (panelOpen) => set({ panelOpen }),
  tab: 'layers',
  setTab: (tab) => set({ tab }),

  ready: false,
  setReady: (ready) => set({ ready }),
}));

/**
 * Simulyatsiya soati — React holatidan tashqarida (har kadrda qayta render bo‘lmasligi uchun).
 * AnimationController har kadrda `t` ni oshiradi; barcha animatsiyalar shu qiymatdan hisoblanadi,
 * shuning uchun pauza / davom ettirish / qayta boshlash aniq va deterministik ishlaydi.
 */
export const simClock = {
  t: 18,
  /** konveyer roliklari burchagi uchun alohida (faqat harakatda oshadi) */
  running: true,
};

/** Transportlarning joriy holati (darvozalarni avtomatik ochish uchun) */
export const vehicleState = new Map<string, { x: number; z: number; rx?: number; rz?: number; visible: boolean }>();
