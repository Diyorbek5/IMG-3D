import { Component, type ReactNode } from 'react';

interface State {
  error: Error | null;
}

/** 3D sahnadagi xatolik butun ilovani oq ekranga aylantirmasligi uchun */
export class ErrorBoundary extends Component<{ children: ReactNode; fallbackTitle?: string }, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error) {
    console.error('3D sahna xatoligi:', error);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="fatal">
          <div className="fatal-card glass">
            <h2>{this.props.fallbackTitle ?? '3D sahnani ko‘rsatishda xatolik yuz berdi'}</h2>
            <p>Brauzeringiz WebGL’ni qo‘llab-quvvatlashini va video drayverlar yangilanganini tekshiring. Sahifani qayta yuklab ko‘ring yoki grafika sifatini pasaytiring.</p>
            <code>{this.state.error.message}</code>
            <div className="fatal-actions">
              <button className="btn btn--primary" onClick={() => window.location.reload()}>
                Qayta yuklash
              </button>
              <button
                className="btn"
                onClick={() => {
                  const u = new URL(window.location.href);
                  u.searchParams.set('q', 'low');
                  window.location.href = u.toString();
                }}
              >
                Past sifatda ochish
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}
