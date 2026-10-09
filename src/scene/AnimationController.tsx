import { useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { simClock, useStore } from '../state/store';

/**
 * Animatsiya boshqaruvchisi: umumiy simulyatsiya soatini yuritadi.
 * Pauza — soat to‘xtaydi; davom ettirish — davom etadi; qayta boshlash — t = 0.
 * Barcha harakatlar (konveyer, shisha panellar, transport, kranlar) shu soatdan hisoblanadi.
 */
export function AnimationController() {
  const restartNonce = useStore((s) => s.restartNonce);
  useEffect(() => {
    if (restartNonce > 0) simClock.t = 0;
  }, [restartNonce]);
  useFrame((_, delta) => {
    const st = useStore.getState();
    simClock.running = st.play === 'playing';
    if (!simClock.running) return;
    simClock.t += Math.min(delta, 0.1) * st.speed;
  });
  return null;
}
