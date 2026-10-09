import type { CameraPreset } from '../state/store';

/**
 * Kamera ko‘rinishlari: pozitsiya va qarash nuqtasi (metr).
 * 'top' — avtomatik hisoblanadi (butun masterplan ekranga sig‘adi).
 */
export const cameraConfig: {
  fov: number;
  presets: Record<Exclude<CameraPreset, 'top'>, { position: [number, number, number]; target: [number, number, number]; label: string }>;
  top: { center: [number, number, number]; extent: [number, number] };
  walkthrough: { points: [number, number, number][]; lookAhead: number; duration: number };
} = {
  fov: 40,
  presets: {
    reset: { position: [74, 30, -72], target: [4, 4, 16], label: 'Asosiy ko‘rinish' },
    front: { position: [0, 6.5, -46], target: [0, 6.2, 0], label: 'Old fasad' },
    side: { position: [-98, 34, 60], target: [0, 3, 60], label: 'Yon tomondan (g‘arb)' },
    rear: { position: [-40, 30, 245], target: [10, 4, 62], label: 'Orqa tomondan' },
    iso: { position: [-150, 165, -135], target: [55, 0, 40], label: 'Izometrik' },
    interior: { position: [52, 48, 30], target: [-2, 0, 78], label: 'Ichki maket' },
  },
  top: { center: [65, 0, 38], extent: [250, 235] },
  walkthrough: {
    /** Ichki sayr marshruti: hovlidan 3-darvoza orqali kirib, liniya bo‘ylab OTK zonasigacha */
    points: [
      [3, 1.75, -30],
      [3, 1.75, -6],
      [3, 1.75, 3],
      [-0.9, 1.75, 5.2],
      [-0.9, 1.75, 10],
      [0, 1.75, 16],
      [0, 1.75, 38],
      [1.5, 1.75, 52],
      [1.5, 1.75, 72],
      [1.5, 1.75, 90],
      [-2, 1.75, 95],
      [-3.5, 1.75, 88],
      [-3.5, 1.75, 76],
      [-3.5, 1.75, 62],
      [-1, 1.75, 50],
    ],
    lookAhead: 6,
    duration: 75,
  },
};
