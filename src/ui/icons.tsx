import type { ReactNode } from 'react';

const Svg = ({ children, size = 18 }: { children: ReactNode; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

export const Icon = {
  home: () => (
    <Svg>
      <path d="M3 11l9-7 9 7" />
      <path d="M5 10v10h14V10" />
    </Svg>
  ),
  front: () => (
    <Svg>
      <rect x="3" y="7" width="18" height="12" rx="1" />
      <path d="M7 19v-5h4v5M14 11h4" />
    </Svg>
  ),
  side: () => (
    <Svg>
      <path d="M2 18h20M4 18V9h7v-3h9v12" />
    </Svg>
  ),
  rear: () => (
    <Svg>
      <rect x="3" y="7" width="18" height="12" rx="1" />
      <path d="M6 11h3M11 11h3M16 11h2M6 15h3M11 15h3M16 15h2" />
    </Svg>
  ),
  top: () => (
    <Svg>
      <rect x="4" y="4" width="16" height="16" rx="1" />
      <path d="M9 4v16M4 9h5" />
    </Svg>
  ),
  iso: () => (
    <Svg>
      <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" />
      <path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" />
    </Svg>
  ),
  interior: () => (
    <Svg>
      <path d="M3 20h18M5 20V9l7-5 7 5v11" />
      <rect x="9" y="13" width="6" height="4" />
    </Svg>
  ),
  walk: () => (
    <Svg>
      <circle cx="13" cy="4" r="1.6" />
      <path d="M10 21l2-6 3 3v3M9 12l3-4 3 3 3 1M12 8l-2 5" />
    </Svg>
  ),
  fullscreen: () => (
    <Svg>
      <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
    </Svg>
  ),
  play: () => (
    <Svg>
      <path d="M7 5l12 7-12 7z" fill="currentColor" stroke="none" />
    </Svg>
  ),
  pause: () => (
    <Svg>
      <path d="M8 5v14M16 5v14" strokeWidth={3} />
    </Svg>
  ),
  restart: () => (
    <Svg>
      <path d="M4 12a8 8 0 1 0 2.4-5.7" />
      <path d="M4 4v4h4" />
    </Svg>
  ),
  layers: () => (
    <Svg>
      <path d="M12 3l9 5-9 5-9-5z" />
      <path d="M3 13l9 5 9-5" />
    </Svg>
  ),
  list: () => (
    <Svg>
      <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />
    </Svg>
  ),
  info: () => (
    <Svg>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6M12 7.5v.01" />
    </Svg>
  ),
  report: () => (
    <Svg>
      <path d="M6 3h9l4 4v14H6z" />
      <path d="M9 12h7M9 16h7M9 8h4" />
    </Svg>
  ),
  close: () => (
    <Svg>
      <path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  ),
  focus: () => (
    <Svg>
      <path d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4" />
      <circle cx="12" cy="12" r="3" />
    </Svg>
  ),
  stop: () => (
    <Svg>
      <rect x="6" y="6" width="12" height="12" rx="1" fill="currentColor" stroke="none" />
    </Svg>
  ),
  panel: () => (
    <Svg>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M15 4v16" />
    </Svg>
  ),
};
