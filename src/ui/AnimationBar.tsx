import { useEffect, useState } from 'react';
import { simClock, useStore, type DoorMode } from '../state/store';
import { Icon } from './icons';

const SPEEDS = [0.5, 1, 2, 4];
const DOORS: { id: DoorMode; label: string }[] = [
  { id: 'auto', label: 'Avto' },
  { id: 'open', label: 'Ochiq' },
  { id: 'closed', label: 'Yopiq' },
];

function SimTime() {
  const [t, setT] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setT(simClock.t), 250);
    return () => window.clearInterval(id);
  }, []);
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return (
    <span className="sim-time" title="Simulyatsiya vaqti">
      {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </span>
  );
}

/** Animatsiya va ishlab chiqarish simulyatsiyasi boshqaruvi */
export function AnimationBar() {
  const play = useStore((s) => s.play);
  const setPlay = useStore((s) => s.setPlay);
  const restart = useStore((s) => s.restart);
  const speed = useStore((s) => s.speed);
  const setSpeed = useStore((s) => s.setSpeed);
  const doorMode = useStore((s) => s.doorMode);
  const setDoorMode = useStore((s) => s.setDoorMode);
  const flow = useStore((s) => s.layers.flow);
  const equipment = useStore((s) => s.layers.equipment);
  const toggleLayer = useStore((s) => s.toggleLayer);
  const setLayer = useStore((s) => s.setLayer);

  const mainLabel = play === 'playing' ? 'Pauza' : play === 'paused' ? 'Davom ettirish' : 'Boshlash';
  return (
    <div className="anim-bar glass" role="toolbar" aria-label="Animatsiya boshqaruvi">
      <div className="anim-group">
        <button className="anim-main" onClick={() => setPlay(play === 'playing' ? 'paused' : 'playing')} title="Boshlash / pauza (Probel)">
          {play === 'playing' ? <Icon.pause /> : <Icon.play />}
          <span>{mainLabel}</span>
        </button>
        <button
          className="anim-btn"
          onClick={() => {
            restart();
          }}
          title="Qayta boshlash"
        >
          <Icon.restart />
          <span className="hide-sm">Qayta boshlash</span>
        </button>
        <SimTime />
      </div>
      <div className="anim-group">
        <span className="anim-label">Tezlik</span>
        <div className="seg">
          {SPEEDS.map((s) => (
            <button key={s} className={speed === s ? 'is-on' : ''} onClick={() => setSpeed(s)}>
              {s}×
            </button>
          ))}
        </div>
      </div>
      <div className="anim-group">
        <span className="anim-label">Darvozalar</span>
        <div className="seg">
          {DOORS.map((d) => (
            <button key={d.id} className={doorMode === d.id ? 'is-on' : ''} onClick={() => setDoorMode(d.id)}>
              {d.label}
            </button>
          ))}
        </div>
      </div>
      <div className="anim-group">
        <button
          className={`chip ${flow ? 'is-on' : ''}`}
          onClick={() => {
            if (!flow) setLayer('roofs', false);
            toggleLayer('flow');
          }}
          title="Ishlab chiqarish oqimi yo‘nalishini ko‘rsatish"
        >
          <i className="dot dot--flow" /> Oqim yo‘nalishi
        </button>
        <button className={`chip ${equipment ? 'is-on' : ''}`} onClick={() => toggleLayer('equipment')} title="Uskunalar qatlamini yoqish/o‘chirish">
          <i className="dot dot--eq" /> Uskunalar
        </button>
      </div>
    </div>
  );
}
