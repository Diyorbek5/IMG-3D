import { useMemo } from 'react';
import * as THREE from 'three';
import { factoryConfig } from '../../config/factoryConfig';
import { frontYardRect, rollerDoors, roadFrame, siteNorthZ } from '../../lib/layout';
import { GeoBuilder, worldUV } from '../../three/GeoBuilder';
import { getMaterials } from '../../three/materials';
import { Built, Selectable } from '../common/Built';
import { polygonGeometry } from './RoadNetwork';

/** Dunyo-metr UV bilan gorizontal tekislik */
function groundPlane(w: number, d: number, cx: number, cz: number, y: number) {
  const g = new THREE.PlaneGeometry(w, d).toNonIndexed();
  g.rotateX(-Math.PI / 2);
  g.translate(cx, y, cz);
  worldUV(g);
  return g;
}

/** Bitta tekis to‘rtburchak qoplama */
const rectPoly = (x0: number, z0: number, x1: number, z1: number): [number, number][] => [
  [x0, z0],
  [x1, z0],
  [x1, z1],
  [x0, z1],
];

/**
 * Hudud yer qoplamalari: maysazor, asfalt maydonlar, 40 × 40 m beton hovli,
 * avtoturargoh, yo‘lak belgilari, piyodalar yo‘laklari va xavfsizlik zonalari.
 */
export function SiteGround() {
  const cfg = factoryConfig;
  const parts = useMemo(() => {
    const b = new GeoBuilder();
    const rf = roadFrame();
    const fz = (x: number) => siteNorthZ(x) + 1;
    const W = cfg.building.width / 2;
    const L = cfg.building.totalLength;
    const yA = 0.035;

    /* ---- asfalt maydon (yuk mashinalari aylanma yo‘li va yuklash maydonlari) ---- */
    const fw = cfg.finishedWarehouse;
    const rw = cfg.rawWarehouse;
    b.add(
      'asphalt',
      polygonGeometry(
        [
          [W, fz(W)],
          [cfg.site.exitGateX + 6, fz(cfg.site.exitGateX + 6)],
          [cfg.site.exitGateX + 6, fw.rect.z0],
          [fw.wing.x1, fw.rect.z0],
          [fw.wing.x1, fw.wing.z0],
          [fw.wing.x0, fw.wing.z0],
          [fw.wing.x0, rw.rect.z0],
          [W, rw.rect.z0],
        ],
        yA,
      ),
    );
    // kirish yo‘li (darvozadan hovligacha)
    const gx = cfg.site.entryGateX;
    const gw = cfg.site.gateWidth / 2;
    b.add('asphalt', polygonGeometry([[gx - gw, fz(gx - gw)], [gx + gw, fz(gx + gw)], [gx + gw, -cfg.frontYard.depth], [gx - gw, -cfg.frontYard.depth]], yA));
    // binolar atrofidagi yong‘in-texnik yo‘llari (beton)
    b.add('concrete', polygonGeometry(rectPoly(-W - 7, -cfg.frontYard.depth, -W, L + 7), yA));
    b.add('concrete', polygonGeometry(rectPoly(-W - 7, L, W + 10, L + 7), yA));
    b.add('concrete', polygonGeometry(rectPoly(W, rw.rect.z0, rw.rect.x0, L), yA));
    b.add('concrete', polygonGeometry(rectPoly(rw.rect.x0, rw.rect.z1, rw.rect.x1 + 2, rw.rect.z1 + 4), yA));

    /* ---- 40 × 40 m old hovli (beton, 5 m choklar bilan) ---- */
    const y = frontYardRect();
    b.add('yardConcrete', polygonGeometry(rectPoly(y.x0, y.z0, y.x1, y.z1), 0.07));
    const yl = 0.075;
    const mark = (key: 'markingYellow' | 'markingWhite' | 'markingGreen' | 'markingRed', x0: number, z0: number, x1: number, z1: number) =>
      b.boxMinMax(key, x0, yl, z0, x1, yl + 0.004, z1);
    // hovli chegarasi
    mark('markingYellow', y.x0, y.z0, y.x1, y.z0 + 0.15);
    mark('markingYellow', y.x0, y.z0, y.x0 + 0.15, y.z1);
    // darvozalar oldidagi xavfsizlik zonasi (sariq diagonal shtrix)
    for (const d of rollerDoors()) {
      const x0 = d.cx - d.width / 2 - 0.5;
      const x1 = d.cx + d.width / 2 + 0.5;
      mark('markingYellow', x0, -4.2, x1, -4.0);
      mark('markingYellow', x0, -4.2, x0 + 0.2, -0.05);
      mark('markingYellow', x1 - 0.2, -4.2, x1, -0.05);
      for (let x = x0 + 0.6; x < x1 - 0.6; x += 1.0) b.add('markingYellow', new THREE.BoxGeometry(0.18, 0.004, 1.6), [x, yl + 0.002, -2.1], [0, 0.6, 0]);
    }
    // forklift yo‘nalishi (hovlida)
    for (let z = -2; z > -19; z -= 3) mark('markingWhite', -14.08, z - 1.6, -13.92, z);

    /* ---- avtoturargoh ---- */
    const pk = cfg.site.parking;
    const rows: { z0: number; z1: number }[] = [
      { z0: pk.z0 + 1.5, z1: pk.z0 + 6.5 },
      { z0: pk.z0 + 12.5, z1: pk.z0 + 17.5 },
      { z0: pk.z0 + 19, z1: pk.z0 + 24 },
    ];
    for (const r of rows) {
      for (let x = pk.x0 + 1; x <= pk.x1 - 1; x += 2.5) mark('markingWhite', x - 0.06, r.z0, x + 0.06, r.z1);
      mark('markingWhite', pk.x0 + 1, r.z1 - 0.1, pk.x1 - 1, r.z1);
    }
    // daraxtli orolchalar (masterplandagidek)
    for (const [z0, z1] of [
      [pk.z0, pk.z0 + 1.5],
      [pk.z0 + 17.5, pk.z0 + 19],
    ]) {
      b.boxMinMax('curb', pk.x0, 0, z0, pk.x1, 0.16, z1);
      b.boxMinMax('grass', pk.x0 + 0.15, 0.161, z0 + 0.15, pk.x1 - 0.15, 0.165, z1 - 0.15);
    }

    /* ---- piyodalar yo‘lagi: avtoturargoh → showroom ---- */
    const sr = { x: cfg.building.width / 2 - cfg.showroom.width + 2.2, z: -cfg.showroom.depth };
    b.add('concrete', polygonGeometry(rectPoly(sr.x - 1.2, -25.5, pk.x0, -23.5), 0.085));
    b.add('concrete', polygonGeometry(rectPoly(sr.x - 1.2, -25.5, sr.x + 1.2, sr.z - 2.2), 0.085));
    // zebra o‘tish joylari
    for (const [x0, x1, z0, z1, along] of [
      [28, 32.6, -25.5, -23.5, 'x'],
      [sr.x - 1.2, sr.x + 1.2, -21, -19, 'z'],
    ] as const) {
      if (along === 'x') for (let z = z0 + 0.1; z < z1; z += 0.6) mark('markingWhite', x0, z, x1, z + 0.35);
      else for (let x = x0 + 0.1; x < x1; x += 0.6) mark('markingWhite', x, z0 - 1.5, x + 0.35, z1 + 1.5);
    }

    /* ---- yuk mashinalari yo‘nalish chiziqlari ---- */
    const lane = (x0: number, z0: number, x1: number, z1: number) => {
      const len = Math.hypot(x1 - x0, z1 - z0);
      const n = Math.floor(len / 6);
      for (let i = 0; i < n; i++) {
        const t0 = (i * 6) / len;
        const t1 = Math.min(1, (i * 6 + 3) / len);
        const ax = x0 + (x1 - x0) * t0;
        const az = z0 + (z1 - z0) * t0;
        const bx = x0 + (x1 - x0) * t1;
        const bz = z0 + (z1 - z0) * t1;
        b.boxMinMax('markingWhite', Math.min(ax, bx) - 0.06, yA + 0.012, Math.min(az, bz) - 0.06, Math.max(ax, bx) + 0.06, yA + 0.016, Math.max(az, bz) + 0.06);
      }
    };
    lane(36.5, -10, 36.5, 6);
    lane(42, 17.5, 134, 17.5);
    lane(42, 7.5, 134, 7.5);
    // to‘xtash joylari (yuk mashinalari) — sariq ramka
    for (const [cx] of [[50], [116]]) {
      mark('markingYellow', cx - 9, 10.4, cx + 9, 10.55);
      mark('markingYellow', cx - 9, 13.45, cx + 9, 13.6);
    }
    // forklift o‘tish joyi (yuk mashinasi yo‘lagi kesishmasida)
    for (let z = 7.8; z < 17; z += 0.8) mark('markingYellow', 90.8, z, 93.2, z + 0.4);

    /* ---- masterplandagi yashil maydonlar (chegara to‘siq — past butalar) ---- */
    for (const l of cfg.site.lawns) {
      b.boxMinMax('curb', l.x0, 0, l.z0, l.x1, 0.12, l.z0 + 0.2);
      b.boxMinMax('curb', l.x0, 0, l.z1 - 0.2, l.x1, 0.12, l.z1);
      b.boxMinMax('curb', l.x0, 0, l.z0, l.x0 + 0.2, 0.12, l.z1);
      b.boxMinMax('curb', l.x1 - 0.2, 0, l.z0, l.x1, 0.12, l.z1);
    }
    void rf;
    return b.build();
  }, [cfg]);

  const ground = useMemo(() => groundPlane(3000, 3000, 60, 40, -0.04), []);
  const lawns = useMemo(() => factoryConfig.site.lawns.map((l) => groundPlane(l.x1 - l.x0, l.z1 - l.z0, (l.x0 + l.x1) / 2, (l.z0 + l.z1) / 2, 0.01)), []);
  const pk = factoryConfig.site.parking;
  const lawnMat = useMemo(() => {
    const m = (getMaterials().grass as THREE.MeshStandardMaterial).clone();
    m.color = new THREE.Color('#8fb07b');
    return m;
  }, []);

  return (
    <group name="SiteGround">
      {/* asosiy maysazor */}
      <mesh geometry={ground} receiveShadow material={getMaterials().grass} />
      <Selectable id="front-yard">
        <Built parts={parts.filter((p) => p.key === 'yardConcrete')} castShadow={false} />
      </Selectable>
      <Built parts={parts.filter((p) => p.key !== 'yardConcrete')} castShadow={false} />
      <Selectable id="parking">
        <mesh visible={false} position={[(pk.x0 + pk.x1) / 2, 0.3, (pk.z0 + pk.z1) / 2]}>
          <boxGeometry args={[pk.x1 - pk.x0, 0.5, pk.z1 - pk.z0]} />
        </mesh>
      </Selectable>
      {lawns.map((g, i) => (
        <mesh key={i} geometry={g} receiveShadow material={lawnMat} />
      ))}
    </group>
  );
}
