import type { ComponentType } from 'react';
import { useEffect, useState } from 'react';
import { useStore, type CameraPreset } from '../state/store';
import { Icon } from './icons';

const VIEWS: { id: CameraPreset; label: string; icon: ComponentType; key: string }[] = [
  { id: 'reset', label: 'Asosiy', icon: Icon.home, key: '1' },
  { id: 'front', label: 'Old fasad', icon: Icon.front, key: '2' },
  { id: 'side', label: 'Yon', icon: Icon.side, key: '3' },
  { id: 'rear', label: 'Orqa', icon: Icon.rear, key: '4' },
  { id: 'top', label: 'Yuqoridan', icon: Icon.top, key: '5' },
  { id: 'iso', label: 'Izometrik', icon: Icon.iso, key: '6' },
  { id: 'interior', label: 'Ichki maket', icon: Icon.interior, key: '7' },
];

export function toggleFullscreen() {
  const d = document as Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => void };
  const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => void };
  if (document.fullscreenElement || d.webkitFullscreenElement) {
    (document.exitFullscreen?.bind(document) ?? d.webkitExitFullscreen)?.();
  } else {
    (el.requestFullscreen?.bind(el) ?? el.webkitRequestFullscreen)?.();
  }
}

/** Kamera ko‘rinishlari paneli */
export function Toolbar() {
  const requestCamera = useStore((s) => s.requestCamera);
  const active = useStore((s) => s.activePreset);
  const walkthrough = useStore((s) => s.walkthrough);
  const setWalkthrough = useStore((s) => s.setWalkthrough);
  const [fs, setFs] = useState(false);
  useEffect(() => {
    const on = () => setFs(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  }, []);

  return (
    <nav className="toolbar glass" aria-label="Kamera ko‘rinishlari">
      {VIEWS.map((v) => (
        <button
          key={v.id}
          className={`tool-btn ${active === v.id && !walkthrough ? 'is-active' : ''}`}
          onClick={() => {
            setWalkthrough(false);
            requestCamera({ preset: v.id });
          }}
          title={`${v.label} (${v.key})`}
        >
          <v.icon />
          <span>{v.label}</span>
        </button>
      ))}
      <div className="toolbar-sep" />
      <button
        className={`tool-btn ${walkthrough ? 'is-active' : ''}`}
        onClick={() => {
          if (walkthrough) {
            setWalkthrough(false);
            requestCamera({ preset: 'interior' });
          } else setWalkthrough(true);
        }}
        title="Ichki hududlar bo‘ylab kamera sayri (W)"
      >
        {walkthrough ? <Icon.stop /> : <Icon.walk />}
        <span>{walkthrough ? 'To‘xtatish' : 'Sayr'}</span>
      </button>
      <button className={`tool-btn ${fs ? 'is-active' : ''}`} onClick={toggleFullscreen} title="To‘liq ekran (F)">
        <Icon.fullscreen />
        <span>To‘liq ekran</span>
      </button>
    </nav>
  );
}

export const VIEW_KEYS = VIEWS.map((v) => ({ key: v.key, id: v.id }));
