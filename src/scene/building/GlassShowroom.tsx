import { useMemo } from 'react';
import * as THREE from 'three';
import { factoryConfig } from '../../config/factoryConfig';
import { showroomRect } from '../../lib/layout';
import { FLOOR_Y } from '../../lib/lineLayout';
import { GeoBuilder } from '../../three/GeoBuilder';
import { Built } from '../common/Built';
import { curtainWall } from './shellBuilders';
import { LogoPlane } from './FrontFacade';

/**
 * Showroom — 9 × 15 m, to‘liq shishali hajm (shisha burchak).
 * Balandlik factoryConfig.showroom.height orqali sozlanadi.
 */
export function buildShowroom(cfg = factoryConfig) {
  const r = showroomRect(cfg);
  const H = cfg.showroom.height;
  const solid = new GeoBuilder();
  const glass = new GeoBuilder();
  const fascia = 0.9;
  const gTop = H - fascia;
  const step = cfg.glassCorner.mullionSpacing;
  const transoms = [3.2];

  // poydevor va pol
  solid.boxMinMax('concreteDark', r.x0 - 0.05, -0.3, r.z0 - 0.05, r.x1 + 0.05, FLOOR_Y - 0.02, r.z1);
  solid.boxMinMax('floorShowroom', r.x0 + 0.05, FLOOR_Y - 0.02, r.z0 + 0.05, r.x1 - 0.05, FLOOR_Y, r.z1);
  // tom plitasi va fasad karnizi
  solid.boxMinMax('paintWhite', r.x0, gTop, r.z0, r.x1, H - 0.1, r.z1);
  solid.boxMinMax('aluDark', r.x0 - 0.25, gTop - 0.05, r.z0 - 0.25, r.x1 + 0.02, H, r.z0 + 0.15);
  solid.boxMinMax('aluDark', r.x0 - 0.25, gTop - 0.05, r.z0 - 0.25, r.x0 + 0.15, H, r.z1);
  solid.boxMinMax('aluDark', r.x1 - 0.15, gTop - 0.05, r.z0 - 0.25, r.x1 + 0.02, H, r.z1);
  solid.boxMinMax('roof', r.x0 + 0.15, H - 0.12, r.z0 + 0.15, r.x1 - 0.15, H - 0.05, r.z1);

  // vitrajlar: shimoliy, sharqiy, g‘arbiy fasadlar
  curtainWall(glass, solid, 'x', r.z0, r.x0, r.x1, FLOOR_Y, gTop, step, transoms, { heavyEvery: 2, depth: 0.2 });
  curtainWall(glass, solid, 'z', r.x1, r.z0, r.z1, FLOOR_Y, gTop, step, transoms, { heavyEvery: 2, depth: 0.2 });
  curtainWall(glass, solid, 'z', r.x0, r.z0, r.z1, FLOOR_Y, gTop, step, transoms, { heavyEvery: 2, depth: 0.2 });
  // burchak ustunlari (alyuminiy)
  for (const [x, z] of [
    [r.x0, r.z0],
    [r.x1, r.z0],
  ])
    solid.box('aluDark', [x, (FLOOR_Y + gTop) / 2, z], [0.22, gTop - FLOOR_Y, 0.22]);

  // kirish eshigi (shimoliy fasad, g‘arb tomonida) — ikki tabaqali shisha eshik
  const dx = r.x0 + 2.2;
  solid.boxMinMax('aluminium', dx - 1.2, FLOOR_Y, r.z0 - 0.12, dx - 1.12, 2.7, r.z0 + 0.06);
  solid.boxMinMax('aluminium', dx + 1.12, FLOOR_Y, r.z0 - 0.12, dx + 1.2, 2.7, r.z0 + 0.06);
  solid.boxMinMax('aluminium', dx - 1.2, 2.62, r.z0 - 0.12, dx + 1.2, 2.72, r.z0 + 0.06);
  solid.box('chrome', [dx - 0.12, 1.1, r.z0 - 0.14], [0.03, 1.2, 0.04]);
  solid.box('chrome', [dx + 0.12, 1.1, r.z0 - 0.14], [0.03, 1.2, 0.04]);
  // kirish oldidagi zinapoya-maydoncha
  solid.boxMinMax('concrete', dx - 2, 0, r.z0 - 2.2, dx + 2, FLOOR_Y - 0.03, r.z0);

  /* ---- interyer ---- */
  // qabul stoyka
  solid.box('paintWhite', [r.x1 - 2.6, FLOOR_Y + 0.55, r.z1 - 3.4], [3.2, 1.1, 0.8]);
  solid.box('paintOrange', [r.x1 - 2.6, FLOOR_Y + 0.25, r.z1 - 3.81], [3.2, 0.08, 0.02]);
  solid.box('screen', [r.x1 - 2.4, FLOOR_Y + 1.25, r.z1 - 3.1], [0.6, 0.38, 0.03]);
  // brend devori (old korpus vitraji oldida)
  solid.box('paintDark', [(r.x0 + r.x1) / 2 + 0.6, FLOOR_Y + 2.0, r.z1 - 0.9], [5.2, 4.0, 0.2]);
  // A-shaklidagi ekspozitsiya stendlari (shisha namunalari bilan)
  const stands: [number, number][] = [
    [r.x0 + 2.2, r.z0 + 4.6],
    [r.x0 + 2.2, r.z0 + 8.8],
    [r.x1 - 2.4, r.z0 + 6.6],
  ];
  for (const [x, z] of stands) {
    for (const s of [-1, 1]) {
      solid.beam('aluminium', [x + s * 0.55, FLOOR_Y, z - 0.9], [x + s * 0.12, FLOOR_Y + 1.9, z - 0.9], 0.05);
      solid.beam('aluminium', [x + s * 0.55, FLOOR_Y, z + 0.9], [x + s * 0.12, FLOOR_Y + 1.9, z + 0.9], 0.05);
      glass.add('glassSheet', unitBox(), [x + s * 0.33, FLOOR_Y + 1.05, z], [0, 0, s * 0.22], [0.012, 1.7, 1.6]);
    }
    solid.box('aluminium', [x, FLOOR_Y + 1.9, z], [0.12, 0.05, 1.9]);
    solid.box('paintDark', [x, FLOOR_Y + 0.04, z], [1.4, 0.08, 2.1]);
  }
  // oyna totemlari
  for (const z of [r.z0 + 2.2, r.z0 + 11.2]) {
    solid.box('aluDark', [r.x1 - 1.2, FLOOR_Y + 1.25, z], [0.7, 2.5, 0.08]);
    solid.box('mirror', [r.x1 - 1.2, FLOOR_Y + 1.25, z - 0.045], [0.6, 2.36, 0.01]);
  }
  // shisha paket (vakuumli shisha) namunalari — vertikal ramalar
  for (let i = 0; i < 4; i++) {
    const z = r.z0 + 10.5 + i * 0.9;
    solid.box('aluminium', [r.x0 + 0.9, FLOOR_Y + 1.1, z], [0.06, 1.6, 0.8]);
    glass.box('glassSheet', [r.x0 + 0.93, FLOOR_Y + 1.1, z], [0.03, 1.5, 0.7]);
  }
  // mehmonlar uchun divan va stol
  solid.box('fabric', [r.x0 + 4.6, FLOOR_Y + 0.25, r.z1 - 3.3], [2.2, 0.5, 0.9]);
  solid.box('fabric', [r.x0 + 4.6, FLOOR_Y + 0.6, r.z1 - 2.9], [2.2, 0.6, 0.2]);
  solid.box('paintWhite', [r.x0 + 4.6, FLOOR_Y + 0.22, r.z1 - 4.6], [1.2, 0.04, 0.7]);
  // o‘simliklar
  for (const [x, z] of [
    [r.x0 + 0.7, r.z0 + 0.8],
    [r.x1 - 0.7, r.z1 - 1.6],
  ]) {
    solid.cyl('paintDark', [x, FLOOR_Y + 0.3, z], 0.3, 0.6, 'y', 14);
    solid.add('plant', unitIco(), [x, FLOOR_Y + 1.15, z], [0, 0, 0], [0.55, 0.8, 0.55]);
  }
  // osma chiroqlar
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 2; j++) {
      const x = r.x0 + 2.5 + j * 4;
      const z = r.z0 + 3 + i * 4.5;
      solid.cyl('aluDark', [x, (gTop + gTop - 1.4) / 2, z], 0.01, 1.4, 'y', 4);
      solid.cyl('lampWarm', [x, gTop - 1.5, z], 0.22, 0.18, 'y', 18);
    }
  solid.boxMinMax('lightPanel', r.x0 + 1, gTop - 0.02, r.z0 + 1, r.x1 - 1, gTop, r.z0 + 1.2);
  return { solid: solid.build(), glass: glass.build(), brandWall: { x: (r.x0 + r.x1) / 2 + 0.6, y: FLOOR_Y + 2.4, z: r.z1 - 1.01 }, fasciaY: gTop + fascia / 2, r };
}

let _box: THREE.BufferGeometry | null = null;
let _ico: THREE.BufferGeometry | null = null;
const unitBox = () => (_box ??= new THREE.BoxGeometry(1, 1, 1));
const unitIco = () => (_ico ??= new THREE.IcosahedronGeometry(1, 1));

export function GlassShowroom() {
  const sr = useMemo(() => buildShowroom(), []);
  return (
    <group name="GlassShowroom">
      <Built parts={sr.solid} />
      <Built parts={sr.glass} castShadow={false} />
      {/* brend devoridagi logotip */}
      <LogoPlane position={[sr.brandWall.x, sr.brandWall.y, sr.brandWall.z]} height={1.5} rotationY={Math.PI} />
      {/* fasad karnizidagi logotip */}
      <LogoPlane position={[(sr.r.x0 + sr.r.x1) / 2, sr.fasciaY, sr.r.z0 - 0.27]} height={0.78} rotationY={Math.PI} />
    </group>
  );
}
