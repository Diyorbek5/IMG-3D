import { useMemo } from 'react';
import { FLOOR_Y, type LineLayout } from '../../lib/lineLayout';
import { GeoBuilder } from '../../three/GeoBuilder';
import { Built, Selectable } from '../common/Built';
import { addCrate } from '../building/FrontBlockInterior';

/**
 * OTK/GPO sifat nazorati zonasi — alohida ajratilgan, to‘siq bilan o‘ralgan hudud.
 * To‘siqda konveyer kirishi va chiqishi hamda xodimlar uchun eshik ochiq qoldirilgan.
 */
export function QualityControlZone({ layout }: { layout: LineLayout }) {
  const parts = useMemo(() => {
    const q = layout.qualityZone;
    const b = new GeoBuilder();
    const g = new GeoBuilder();
    const y = FLOOR_Y + 0.004;
    // pol: yashil qoplama va chegaraviy chiziq
    b.boxMinMax('markingGreen', q.x0, y - 0.003, q.z0, q.x1, y, q.z1);
    const lw = 0.12;
    b.boxMinMax('markingWhite', q.x0, y, q.z0, q.x1, y + 0.002, q.z0 + lw);
    b.boxMinMax('markingWhite', q.x0, y, q.z1 - lw, q.x1, y + 0.002, q.z1);
    b.boxMinMax('markingWhite', q.x0, y, q.z0, q.x0 + lw, y + 0.002, q.z1);
    b.boxMinMax('markingWhite', q.x1 - lw, y, q.z0, q.x1, y + 0.002, q.z1);
    // to‘siq (sariq ustunlar + shaffof panellar)
    const lineX = layout.stations.find((s) => s.type === 'inspection')?.cx ?? (q.x0 + q.x1) / 2;
    const gapHalf = 1.7;
    const fenceH = 2.2;
    const post = (x: number, z: number) => b.box('paintYellow', [x, FLOOR_Y + fenceH / 2, z], [0.08, fenceH, 0.08]);
    const panelX = (x0: number, x1: number, z: number) => {
      if (x1 - x0 < 0.2) return;
      g.box('glass', [(x0 + x1) / 2, FLOOR_Y + 0.15 + (fenceH - 0.3) / 2, z], [x1 - x0, fenceH - 0.3, 0.015]);
      b.box('paintYellow', [(x0 + x1) / 2, FLOOR_Y + fenceH, z], [x1 - x0, 0.06, 0.06]);
      b.box('paintYellow', [(x0 + x1) / 2, FLOOR_Y + 0.1, z], [x1 - x0, 0.06, 0.06]);
    };
    const panelZ = (z0: number, z1: number, x: number) => {
      if (z1 - z0 < 0.2) return;
      g.box('glass', [x, FLOOR_Y + 0.15 + (fenceH - 0.3) / 2, (z0 + z1) / 2], [0.015, fenceH - 0.3, z1 - z0]);
      b.box('paintYellow', [x, FLOOR_Y + fenceH, (z0 + z1) / 2], [0.06, 0.06, z1 - z0]);
      b.box('paintYellow', [x, FLOOR_Y + 0.1, (z0 + z1) / 2], [0.06, 0.06, z1 - z0]);
    };
    // shimoliy va janubiy tomonlar (konveyer o‘tadigan ochiq joy bilan)
    for (const z of [q.z0, q.z1]) {
      panelX(q.x0, lineX - gapHalf, z);
      panelX(lineX + gapHalf, q.x1, z);
      for (const x of [q.x0, lineX - gapHalf, lineX + gapHalf, q.x1]) post(x, z);
    }
    // g‘arbiy tomon to‘liq, sharqiy tomonda xodimlar eshigi
    panelZ(q.z0, q.z1, q.x0);
    const doorZ = (q.z0 + q.z1) / 2;
    panelZ(q.z0, doorZ - 0.6, q.x1);
    panelZ(doorZ + 0.6, q.z1, q.x1);
    for (const z of [q.z0 + (q.z1 - q.z0) / 3, q.z0 + (2 * (q.z1 - q.z0)) / 3, doorZ - 0.6, doorZ + 0.6]) {
      post(q.x0, z);
      if (Math.abs(z - doorZ) > 0.5) post(q.x1, z);
    }
    post(q.x1, doorZ - 0.6);
    post(q.x1, doorZ + 0.6);
    // OTK operatori ish joyi va hujjatlar stoli
    b.box('paintWhite', [q.x0 + 1.4, FLOOR_Y + 0.75, q.z1 - 1.2], [2.0, 0.05, 0.9]);
    b.box('screen', [q.x0 + 1.4, FLOOR_Y + 1.05, q.z1 - 0.85], [0.6, 0.38, 0.03]);
    b.box('fabric', [q.x0 + 1.4, FLOOR_Y + 0.45, q.z1 - 1.9], [0.5, 0.9, 0.5]);
    // namuna stellaji
    b.box('steel', [q.x0 + 0.6, FLOOR_Y + 1.0, q.z0 + 3], [0.5, 2.0, 2.4]);
    // yaroqsiz mahsulot konteyneri (qizil)
    b.box('paintRed', [q.x1 - 1.2, FLOOR_Y + 0.5, q.z0 + 1.2], [1.4, 1.0, 1.0]);
    // qadoqlangan mahsulot buferi (yashiklar) — qadoqlashdan keyin
    const st = layout.packedStaging;
    b.boxMinMax('markingYellow', st.x0, y, st.z0, st.x1, y + 0.002, st.z0 + 0.1);
    b.boxMinMax('markingYellow', st.x0, y, st.z1 - 0.1, st.x1, y + 0.002, st.z1);
    addCrate(b, (st.x0 + st.x1) / 2, st.z1 - 0.7, FLOOR_Y, 2.4, 1.0, 1.9);
    addCrate(b, (st.x0 + st.x1) / 2, st.z1 - 0.7, FLOOR_Y + 1.95, 2.4, 1.0, 1.9);
    return { solid: b.build(), glass: g.build() };
  }, [layout]);
  return (
    <Selectable id="qc-zone">
      <Built parts={parts.solid} />
      <Built parts={parts.glass} castShadow={false} />
    </Selectable>
  );
}
