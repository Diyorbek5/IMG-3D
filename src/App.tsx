import { lazy, Suspense, useEffect } from 'react';
import { useStore } from './state/store';
import { AnimationBar } from './ui/AnimationBar';
import { Brand } from './ui/Brand';
import { ErrorBoundary, hasWebGL } from './ui/ErrorBoundary';
import { SidePanel } from './ui/SidePanel';
import { toggleFullscreen, Toolbar, VIEW_KEYS } from './ui/Toolbar';

// 3D sahna alohida bo‘lakda yuklanadi — interfeys darhol ko‘rinadi
const FactoryScene = lazy(() => import('./scene/FactoryScene').then((m) => ({ default: m.FactoryScene })));

function Loader() {
  const ready = useStore((s) => s.ready);
  return (
    <div className={`loader ${ready ? 'is-done' : ''}`} aria-hidden={ready}>
      <div className="loader-inner">
        <div className="loader-bar" />
        <p>3D maket yuklanmoqda…</p>
      </div>
    </div>
  );
}

function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const st = useStore.getState();
      if (e.code === 'Space') {
        e.preventDefault();
        st.setPlay(st.play === 'playing' ? 'paused' : 'playing');
      } else if (e.key === 'Escape') {
        if (st.walkthrough) st.setWalkthrough(false);
        else st.select(null);
      } else if (e.key === 'f' || e.key === 'F') toggleFullscreen();
      else if (e.key === 'w' || e.key === 'W') st.setWalkthrough(!st.walkthrough);
      else {
        const v = VIEW_KEYS.find((k) => k.key === e.key);
        if (v) {
          st.setWalkthrough(false);
          st.requestCamera({ preset: v.id });
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

export default function App() {
  useShortcuts();
  const webgl = hasWebGL();
  return (
    <div className="app">
      <div className="viewport">
        {webgl ? (
          <ErrorBoundary>
            <Suspense fallback={null}>
              <FactoryScene />
            </Suspense>
          </ErrorBoundary>
        ) : (
          <div className="fatal">
            <div className="fatal-card glass">
              <h2>WebGL mavjud emas</h2>
              <p>3D maketni ko‘rish uchun WebGL’ni qo‘llab-quvvatlaydigan zamonaviy brauzer (Chrome, Edge, Firefox, Safari) kerak.</p>
            </div>
          </div>
        )}
      </div>
      <Brand />
      <Toolbar />
      <SidePanel />
      <AnimationBar />
      <Loader />
    </div>
  );
}
