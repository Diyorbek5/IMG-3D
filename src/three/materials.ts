import * as THREE from 'three';
import type { MatKey } from './GeoBuilder';
import {
  asphaltColor,
  asphaltNormal,
  claddingColor,
  claddingNormal,
  concreteColor,
  concreteNormal,
  floorColor,
  grassColor,
  roofNormal,
  shutterNormal,
  showroomFloorColor,
  solarColor,
  woodColor,
} from './textures';

/**
 * PBR materiallar kutubxonasi — bir marta yaratiladi va barcha komponentlarda qayta ishlatiladi.
 */

type Lib = Record<MatKey, THREE.Material>;

let lib: Lib | null = null;
let glassMode: 'transmission' | 'alpha' = 'alpha';

const std = (p: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(p);

function withMaps(m: THREE.MeshStandardMaterial, map?: THREE.Texture, normal?: THREE.Texture, ns = 1) {
  if (map) m.map = map;
  if (normal) {
    m.normalMap = normal;
    m.normalScale = new THREE.Vector2(ns, ns);
  }
  return m;
}

function makeGlass(mode: 'transmission' | 'alpha') {
  if (mode === 'transmission') {
    return new THREE.MeshPhysicalMaterial({
      color: '#d6e4e8',
      metalness: 0,
      roughness: 0.03,
      transmission: 0.92,
      thickness: 0.02,
      ior: 1.52,
      envMapIntensity: 1.6,
      specularIntensity: 1,
      side: THREE.DoubleSide,
    });
  }
  return new THREE.MeshPhysicalMaterial({
    color: '#6f8792',
    metalness: 0.15,
    roughness: 0.03,
    transparent: true,
    opacity: 0.38,
    envMapIntensity: 2.2,
    specularIntensity: 1,
    ior: 1.52,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

export function getMaterials(): Lib {
  if (lib) return lib;
  const cladN = claddingNormal();
  const cladC = claddingColor();
  lib = {
    cladding: withMaps(std({ color: '#7d7b76', metalness: 0.55, roughness: 0.42 }), cladC, cladN, 0.9),
    claddingDark: withMaps(std({ color: '#3b3d40', metalness: 0.6, roughness: 0.4 }), cladC, cladN, 0.9),
    claddingLight: withMaps(std({ color: '#b3b4b2', metalness: 0.55, roughness: 0.42 }), cladC, cladN, 0.9),
    roof: withMaps(std({ color: '#a2a5a7', metalness: 0.6, roughness: 0.48 }), cladC, roofNormal(), 0.8),
    concrete: withMaps(std({ color: '#ffffff', roughness: 0.92 }), concreteColor(), concreteNormal(), 0.6),
    concreteDark: withMaps(std({ color: '#9b978f', roughness: 0.95 }), undefined, concreteNormal(), 0.6),
    aluminium: std({ color: '#c3c7cb', metalness: 1, roughness: 0.3 }),
    aluDark: std({ color: '#2a2d31', metalness: 0.75, roughness: 0.38 }),
    glass: makeGlass(glassMode),
    glassTint: std({ color: '#18232c', metalness: 0.9, roughness: 0.05, envMapIntensity: 1.5, emissive: '#ffcf8a', emissiveIntensity: 0 }),
    glassDark: std({ color: '#141b22', metalness: 0.9, roughness: 0.06, envMapIntensity: 1.3 }),
    steel: std({ color: '#7d8389', metalness: 0.85, roughness: 0.42 }),
    solar: withMaps(std({ color: '#ffffff', metalness: 0.55, roughness: 0.18, envMapIntensity: 1.3 }), solarColor()),
    galvanized: withMaps(std({ color: '#aeb3b7', metalness: 0.9, roughness: 0.5 }), cladC),
    paintWhite: std({ color: '#e9eae6', metalness: 0.1, roughness: 0.45 }),
    paintGrey: std({ color: '#c6c9c5', metalness: 0.15, roughness: 0.5 }),
    paintDark: std({ color: '#3a3e44', metalness: 0.3, roughness: 0.5 }),
    paintOrange: std({ color: '#ec8613', metalness: 0.2, roughness: 0.42 }),
    paintYellow: std({ color: '#f0c000', metalness: 0.15, roughness: 0.5 }),
    paintBlue: std({ color: '#2a5d9f', metalness: 0.2, roughness: 0.45 }),
    paintRed: std({ color: '#c0392b', metalness: 0.2, roughness: 0.45 }),
    paintGreen: std({ color: '#2f8a4c', metalness: 0.1, roughness: 0.6 }),
    rubber: std({ color: '#171717', roughness: 0.9 }),
    chrome: std({ color: '#e3e5e8', metalness: 1, roughness: 0.14 }),
    screen: std({ color: '#0b1724', emissive: '#4cb3ff', emissiveIntensity: 0.9, roughness: 0.2 }),
    floor: withMaps(std({ color: '#ffffff', roughness: 0.5, metalness: 0.0, envMapIntensity: 0.7 }), floorColor()),
    floorShowroom: withMaps(std({ color: '#ffffff', roughness: 0.16, metalness: 0.0, envMapIntensity: 1 }), showroomFloorColor()),
    wood: withMaps(std({ color: '#ffffff', roughness: 0.82 }), woodColor()),
    felt: std({ color: '#3b4842', roughness: 0.96 }),
    mirror: std({ color: '#ffffff', metalness: 1, roughness: 0.02, envMapIntensity: 1.4 }),
    glassSheet: new THREE.MeshPhysicalMaterial({
      color: '#a9cfc6',
      metalness: 0.05,
      roughness: 0.05,
      transparent: true,
      opacity: 0.6,
      envMapIntensity: 1.8,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
    shutter: withMaps(std({ color: '#b7bcc1', metalness: 0.75, roughness: 0.4 }), undefined, shutterNormal(), 1),
    lightPanel: std({ color: '#ffffff', emissive: '#f4f8ff', emissiveIntensity: 1.3 }),
    lampWarm: std({ color: '#fff3d6', emissive: '#ffd9a0', emissiveIntensity: 0.25 }),
    fabric: std({ color: '#2b3038', roughness: 0.95 }),
    plant: std({ color: '#3f6f33', roughness: 0.85 }),
    heat: std({ color: '#2a0b00', emissive: '#ff6a1a', emissiveIntensity: 1.6 }),

    asphalt: withMaps(std({ color: '#ffffff', roughness: 0.93, metalness: 0 }), asphaltColor(), asphaltNormal(), 0.5),
    yardConcrete: withMaps(std({ color: '#ffffff', roughness: 0.9 }), concreteColor(), concreteNormal(), 0.6),
    grass: withMaps(std({ color: '#ffffff', roughness: 1, metalness: 0, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2 }), grassColor()),
    markingWhite: std({ color: '#efefea', roughness: 0.75, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    markingYellow: std({ color: '#f0bf1a', roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    markingGreen: std({ color: '#3fae5a', roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    markingRed: std({ color: '#d0453a', roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    curb: withMaps(std({ color: '#c9c6bf', roughness: 0.9 }), undefined, concreteNormal(), 0.5),
    treeCrown: std({ color: '#ffffff', roughness: 0.92 }),
    treeTrunk: std({ color: '#5a4636', roughness: 0.95 }),
    cypress: std({ color: '#ffffff', roughness: 0.9, flatShading: true }),
    shrub: std({ color: '#ffffff', roughness: 0.92, flatShading: true }),
  };
  return lib;
}

/** Sifat rejimiga qarab shisha turini almashtirish */
export function setGlassMode(mode: 'transmission' | 'alpha') {
  if (glassMode === mode && lib) return;
  glassMode = mode;
  if (!lib) return;
  const old = lib.glass;
  const next = makeGlass(mode);
  // mavjud material obyektini almashtirish o‘rniga xususiyatlarni ko‘chiramiz (mesh havolalari saqlanadi)
  (old as THREE.MeshPhysicalMaterial).copy(next as THREE.MeshPhysicalMaterial);
  old.needsUpdate = true;
  next.dispose();
}

export type LightingMode = 'day' | 'sunset' | 'night';

/** Kun vaqtiga qarab emissiv materiallarni sozlash */
export function applyLightingMode(mode: LightingMode) {
  const m = getMaterials();
  const night = mode === 'night';
  const dusk = mode === 'sunset';
  (m.lampWarm as THREE.MeshStandardMaterial).emissiveIntensity = night ? 4.5 : dusk ? 2 : 0.25;
  (m.glassTint as THREE.MeshStandardMaterial).emissiveIntensity = night ? 0.55 : dusk ? 0.12 : 0;
  (m.lightPanel as THREE.MeshStandardMaterial).emissiveIntensity = night ? 2.4 : 1.3;
  (m.screen as THREE.MeshStandardMaterial).emissiveIntensity = night ? 1.6 : 0.9;
}
