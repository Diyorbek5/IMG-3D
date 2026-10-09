import { useEffect, useRef } from 'react';
import { factoryConfig } from '../config/factoryConfig';
import { drawLogo } from '../three/textures';

/** iMG brendi (logotip nisbatlari saqlanadi) va zavod nomi */
export function Brand() {
  const ref = useRef<HTMLCanvasElement>(null);
  const url = factoryConfig.brand.logoUrl;
  useEffect(() => {
    if (url) return;
    const c = ref.current;
    if (!c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = 256 * dpr;
    c.height = 100 * dpr;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    drawLogo(ctx, c.width, c.height);
  }, [url]);
  return (
    <header className="brand glass">
      {url ? <img src={url} alt="iMG — Mirror & Glass" className="brand-logo" /> : <canvas ref={ref} className="brand-logo" aria-label="iMG — Mirror & Glass" role="img" />}
      <div className="brand-text">
        <h1>Shisha zavodi · 3D raqamli maket</h1>
        <p>{factoryConfig.subtitle.split('·')[0].trim()}</p>
      </div>
    </header>
  );
}
