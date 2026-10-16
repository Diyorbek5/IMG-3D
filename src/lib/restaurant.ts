import { factoryConfig, type Rect } from '../config/factoryConfig';

/**
 * Restoran (zavod yonidagi to‘rtburchak bino) rejasi — barcha o‘lchamlar metrda.
 * Lokal koordinatalar: u — g‘arbiy devordan sharqqa (0..W), v — old (shimoliy) fasaddan ichkariga (0..D).
 * Old fasad yo‘l va avtoturargoh tomonga (shimolga) qaragan.
 * Shu rejadan ham bino geometriyasi, ham stollardagi mehmonlar va ofitsiantlar joylashuvi olinadi.
 */
export const RESTAURANT_ID = 'bldg-1';

export interface Seat {
  x: number;
  z: number;
  /** o‘tirgan odam qaraydigan yo‘nalish (yaw) */
  face: number;
}
export interface Table {
  x: number;
  z: number;
  /** u (x) va v (z) bo‘yicha o‘lcham; dumaloq stol uchun r */
  w: number;
  d: number;
  round?: boolean;
  seats: Seat[];
}

export function restaurantLayout(cfg = factoryConfig) {
  const b = cfg.neighborBuildings.find((n) => n.id === RESTAURANT_ID)!;
  const r: Rect = b.rect;
  const W = r.x1 - r.x0;
  const D = r.z1 - r.z0;
  const X = (u: number) => r.x0 + u;
  const Z = (v: number) => r.z0 + v;

  /** sathlar */
  const FL1 = 0.45;
  const CEIL1 = 4.75;
  const FL2 = 5.05;
  const CEIL2 = 9.3;
  const EAVE = 9.8;
  const PAV_EAVE = 10.6;
  /** old fasad kompozitsiyasi: ikki pavilon (frontonli), o‘rta qanot, portik */
  const pavW = 11;
  const portico = { u0: W / 2 - 3.5, u1: W / 2 + 3.5, depth: 1.6, eave: 10.9 };

  /** 1-qavat asosiy zali: arkalar qatori (v), ustunlar (u) */
  const arcadeRows = [6.0, 11.0];
  const piers = [10, 16.5, 23.5, 30];
  /** zal orqa devori; undan keyin oshxona, zinapoya va xizmat xonalari */
  const backWallV = D - 4.9;
  const bar = { u0: W / 2 - 5.5, u1: W / 2 + 5.5, v0: backWallV - 3.2, v1: backWallV - 2.4 };

  const face = { pz: 0, nz: Math.PI, px: Math.PI / 2, nx: -Math.PI / 2 };
  const rectTable = (u: number, v: number): Table => {
    const seats: Seat[] = [];
    for (const du of [-0.33, 0.33]) {
      seats.push({ x: X(u + du), z: Z(v - 0.72), face: face.pz });
      seats.push({ x: X(u + du), z: Z(v + 0.72), face: face.nz });
    }
    return { x: X(u), z: Z(v), w: 1.3, d: 0.9, seats };
  };

  /* ---- 1-qavat: stollar (markaziy yo‘lak va bar oldi bo‘sh) ---- */
  const hallTables: Table[] = [];
  const colsU = [2.8, 7.2, 13.25, W - 13.25, W - 7.2, W - 2.8];
  for (const v of [3.0, 8.5]) for (const u of colsU) hallTables.push(rectTable(u, v));
  for (const u of [3.4, 7.0, W - 7.0, W - 3.4]) hallTables.push(rectTable(u, (arcadeRows[1] + backWallV) / 2 + 0.1));

  /* ---- 2-qavat ---- */
  const vip1 = { u0: 0.3, u1: 16.5, v0: 0.3, v1: 12.2 };
  const vip2 = { u0: 23.5, u1: W - 0.3, v0: 0.3, v1: 12.2 };
  const corridor = { v0: 12.2, v1: 14.4 };
  /** 2-qavat orqa qismi: g‘arbda zinapoya xonasi, keyin 3 ta VIP xona */
  const stairHall = { u0: 0.3, u1: 8.3, v0: corridor.v1, v1: D - 0.4 };
  const vipRoomsU = [stairHall.u1, 18.8, 29.25, W - 0.3];
  const vipRooms = vipRoomsU.slice(0, -1).map((u0, i) => ({ u0, u1: vipRoomsU[i + 1], v0: corridor.v1, v1: D - 0.4 }));

  // 1-VIP zal: uzun banket stoli
  const banquet = { u0: 2.5, u1: 14.3, v: (vip1.v0 + vip1.v1) / 2, d: 1.3 };
  const banquetSeats: Seat[] = [];
  for (let u = banquet.u0 + 0.5; u < banquet.u1 - 0.3; u += 0.78) {
    banquetSeats.push({ x: X(u), z: Z(banquet.v - 1.02), face: face.pz });
    banquetSeats.push({ x: X(u), z: Z(banquet.v + 1.02), face: face.nz });
  }
  banquetSeats.push({ x: X(banquet.u0 - 0.55), z: Z(banquet.v), face: face.px });
  banquetSeats.push({ x: X(banquet.u1 + 0.55), z: Z(banquet.v), face: face.nx });

  // 2-VIP zal: dumaloq stollar
  const roundTables: Table[] = [];
  for (const v of [3.3, 8.9])
    for (const u of [27.6, 32.4, 37.1]) {
      if (u === 37.1 && v === 3.3) continue; // devordagi arkali tokcha oldi bo‘sh
      const seats: Seat[] = [];
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2 + 0.3;
        const sx = Math.sin(a) * 1.08;
        const sz = Math.cos(a) * 1.08;
        seats.push({ x: X(u) + sx, z: Z(v) + sz, face: Math.atan2(-sx, -sz) });
      }
      roundTables.push({ x: X(u), z: Z(v), w: 1.5, d: 1.5, round: true, seats });
    }

  /* ---- zinapoya va xizmat qismi ---- */
  /** to‘g‘ri marsh: sharqdan (pastda, u1) g‘arbga (yuqorida, u0) ko‘tariladi */
  const stair = { u0: 0.6, u1: 7.9, v0: D - 1.9, v1: D - 0.6 };
  const kitchen = { u0: 13, u1: W - 0.3, v0: backWallV + 0.3, v1: D - 0.3 };

  return {
    rect: r,
    W,
    D,
    X,
    Z,
    FL1,
    CEIL1,
    FL2,
    CEIL2,
    EAVE,
    PAV_EAVE,
    pavW,
    portico,
    arcadeRows,
    piers,
    backWallV,
    bar,
    hallTables,
    vip1,
    vip2,
    corridor,
    vipRooms,
    banquet,
    banquetSeats,
    roundTables,
    stair,
    stairHall,
    kitchen,
    /** fasad derazalari (u markazlari) */
    frontWindows: { pavilion: [2.4, 5.5, 8.6], wing: [12.9, 15.0] },
    /** yon devor derazalari (v markazlari) — arkalar va bo‘linmalar bilan to‘qnashmaydi */
    sideWindows: [3.0, 8.5, 13.3, 18.0],
  };
}

export type RestaurantLayout = ReturnType<typeof restaurantLayout>;
