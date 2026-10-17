import { describe, expect, it } from 'vitest';
import { factoryConfig } from '../config/factoryConfig';
import { getEntities } from '../lib/entities';
import { restaurantLayout, RESTAURANT_ID } from '../lib/restaurant';
import { buildRestaurant } from '../scene/restaurant/restaurantBuilders';

const R = restaurantLayout();

describe('restoran (zavod yonidagi bino)', () => {
  it('masterplandagi to‘rtburchak bino o‘rnida, zavodga tegmaydi, 2 qavat', () => {
    const nb = factoryConfig.neighborBuildings.find((b) => b.id === RESTAURANT_ID)!;
    expect(R.rect).toEqual(nb.rect);
    expect(R.rect.x0).toBeGreaterThan(factoryConfig.building.width / 2);
    expect(R.FL2).toBeGreaterThan(R.CEIL1);
    expect(R.CEIL2).toBeLessThan(R.EAVE);
  });

  it('zal, banket, VIP zal va VIP xonalar bor', () => {
    expect(R.hallTables.length).toBeGreaterThanOrEqual(14);
    expect(R.banquetSeats.length).toBeGreaterThanOrEqual(24);
    expect(R.roundTables.length).toBeGreaterThanOrEqual(5);
    expect(R.vipRooms).toHaveLength(3);
    // orqa tomondan yarmiga qisqartirilgan: chuqurligi ≈20.5 m
    expect(R.D).toBeCloseTo(20.5, 3);
    const ids = new Set(getEntities().map((e) => e.id));
    for (const id of [RESTAURANT_ID, 'rest-hall', 'rest-bar', 'rest-vip1', 'rest-vip2', 'rest-vip-rooms', 'rest-kitchen']) expect(ids.has(id), id).toBe(true);
  });

  it('zal stullari arkalar devoriga, tashqi devorlarga va markaziy yo‘lakka tushmaydi', () => {
    for (const t of R.hallTables)
      for (const s of t.seats) {
        const u = s.x - R.rect.x0;
        const v = s.z - R.rect.z0;
        expect(u > 0.7 && u < R.W - 0.7 && v > 0.7 && v < R.backWallV - 0.3).toBe(true);
        for (const row of R.arcadeRows) expect(Math.abs(v - row), `stul arkaga tegadi (v=${v.toFixed(2)})`).toBeGreaterThan(0.55);
        expect(Math.abs(u - R.W / 2), 'markaziy yo‘lak bo‘sh').toBeGreaterThan(2.2);
      }
  });

  it('geometriya: fasad, ichki bezaklar va shishalar yaratiladi', () => {
    const r = buildRestaurant(R);
    const keys = (parts: { key: string }[]) => new Set(parts.map((p) => p.key));
    const shell = keys(r.shell);
    const inner = keys(r.inner);
    for (const k of ['stucco', 'aluDark', 'iron', 'concrete']) expect(shell.has(k), k).toBe(true);
    for (const k of ['stuccoInt', 'ikat', 'majolica', 'woodDark', 'lanternGlass', 'bottle', 'jug']) expect(inner.has(k), k).toBe(true);
    for (const k of ['stucco', 'stuccoInt', 'ikat', 'velvet', 'woodDark']) expect(keys(r.upper).has(k), k).toBe(true);
    expect(r.upperGlass.length).toBeGreaterThan(0);
    expect(keys(r.roof).has('girih')).toBe(true);
    expect(keys(r.roof).has('roofTerracotta')).toBe(true);
    expect(r.glass.length).toBeGreaterThan(0);
    expect(r.decals.length).toBeGreaterThan(40);
    expect(r.uplights.length).toBeGreaterThanOrEqual(12);
  });

  it('"2-qavat" qatlami: 1-qavat shiftidan yuqorisi alohida guruhda', () => {
    const r = buildRestaurant(R);
    const maxY = (parts: { geometry: { boundingBox: { max: { y: number } } | null; computeBoundingBox(): void } }[]) =>
      Math.max(
        ...parts.map((p) => {
          p.geometry.computeBoundingBox();
          return p.geometry.boundingBox!.max.y;
        }),
      );
    // o‘chirilganda qoladigan qism (qobiq, 1-qavat jihozlari, 1-qavat shishalari) 1-qavat shiftidan oshmaydi
    for (const parts of [r.shell, r.glass]) expect(maxY(parts)).toBeLessThanOrEqual(R.CEIL1 + 0.01);
    // 1-qavat jihozlaridan faqat zinapoya (va uning poruchenlari) 2-qavat sathiga yetadi
    expect(maxY(r.inner)).toBeLessThanOrEqual(R.FL2 + 1.0);
    expect(maxY(r.upper)).toBeGreaterThan(R.PAV_EAVE);
    expect(r.decals.some((d) => d.upper)).toBe(true);
    for (const d of r.decals) expect(!!d.upper).toBe(d.pos[1] > R.CEIL1);
  });
});
