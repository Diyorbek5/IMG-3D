import type { ComponentType } from 'react';
import { useMemo } from 'react';
import { getEntities, PROCESS_STEPS } from '../lib/entities';
import { dimensionReport, runChecks } from '../lib/validation';
import { useStore, type Layers, type PanelTab, type Quality } from '../state/store';
import type { LightingMode } from '../three/materials';
import { Icon } from './icons';
import { InteractiveInfoPanel } from './InteractiveInfoPanel';

const TABS: { id: PanelTab; label: string; icon: ComponentType }[] = [
  { id: 'layers', label: 'Qatlamlar', icon: Icon.layers },
  { id: 'zones', label: 'Zonalar', icon: Icon.list },
  { id: 'info', label: 'Ma’lumot', icon: Icon.info },
  { id: 'report', label: 'Hisobot', icon: Icon.report },
];

const LAYER_GROUPS: { title: string; items: { key: keyof Layers; label: string; hint?: string }[] }[] = [
  {
    title: 'O‘lchamlar',
    items: [
      { key: 'dimsOverall', label: 'Umumiy o‘lchamlar', hint: '40 × 125 m, 12 m, 40 × 40 m' },
      { key: 'dimsZones', label: 'Zonalar o‘lchamlari', hint: 'segmentlar, balandliklar, showroom' },
      { key: 'grid', label: '5 metrli to‘r', hint: 'masshtab yordamchisi' },
      { key: 'labels', label: 'Zona nomlari' },
    ],
  },
  {
    title: 'Model',
    items: [
      { key: 'roofs', label: 'Tomlar', hint: 'o‘chirilsa — ichki maket (kesim)' },
      { key: 'upperFloor', label: 'Oxirgi qism: 2-qavat', hint: 'o‘chirilsa 1-qavat ko‘rinadi' },
      { key: 'equipment', label: 'Uskunalar va konveyerlar' },
      { key: 'optionalEquipment', label: 'Qo‘shimcha (ixtiyoriy) uskunalar', hint: 'toblash pechi' },
      { key: 'flow', label: 'Ishlab chiqarish oqimi' },
      { key: 'vehicles', label: 'Transport (yuk mashinalari, forkliftlar)' },
      { key: 'landscape', label: 'Daraxtlar va landshaft' },
    ],
  },
];

const LIGHTS: { id: LightingMode; label: string }[] = [
  { id: 'day', label: 'Kunduz' },
  { id: 'sunset', label: 'Kun botishi' },
  { id: 'night', label: 'Tun' },
];
const QUALITIES: { id: Quality; label: string }[] = [
  { id: 'high', label: 'Yuqori' },
  { id: 'medium', label: 'O‘rta' },
  { id: 'low', label: 'Past' },
];

function LayersTab() {
  const layers = useStore((s) => s.layers);
  const toggle = useStore((s) => s.toggleLayer);
  const lighting = useStore((s) => s.lighting);
  const setLighting = useStore((s) => s.setLighting);
  const quality = useStore((s) => s.quality);
  const setQuality = useStore((s) => s.setQuality);
  return (
    <div className="tab-body">
      {LAYER_GROUPS.map((g) => (
        <section key={g.title}>
          <h3>{g.title}</h3>
          {g.items.map((it) => (
            <label key={it.key} className="toggle">
              <input type="checkbox" checked={layers[it.key]} onChange={() => toggle(it.key)} />
              <span className="toggle-ui" />
              <span className="toggle-text">
                {it.label}
                {it.hint && <small>{it.hint}</small>}
              </span>
            </label>
          ))}
        </section>
      ))}
      <section>
        <h3>Render ko‘rinishi</h3>
        <div className="seg seg--full">
          {LIGHTS.map((l) => (
            <button key={l.id} className={lighting === l.id ? 'is-on' : ''} onClick={() => setLighting(l.id)}>
              {l.label}
            </button>
          ))}
        </div>
        <h3>Grafika sifati</h3>
        <div className="seg seg--full">
          {QUALITIES.map((q) => (
            <button key={q.id} className={quality === q.id ? 'is-on' : ''} onClick={() => setQuality(q.id)}>
              {q.label}
            </button>
          ))}
        </div>
        <p className="muted small">“Yuqori” — ambient occlusion, real shisha sinishi va 4K soyalar. Mobil qurilmalarda avtomatik “Past”.</p>
      </section>
      <section>
        <h3>Shartli belgilar</h3>
        <ul className="legend">
          <li>
            <i className="lg lg--dim" /> Tasdiqlangan o‘lcham
          </li>
          <li>
            <i className="lg lg--approx" /> ≈ Taxminiy / tasdiqlanmagan
          </li>
          <li>
            <i className="lg lg--raw" /> Xomashyo oqimi
          </li>
          <li>
            <i className="lg lg--proc" /> Ishlov berish
          </li>
          <li>
            <i className="lg lg--fg" /> Tayyor mahsulot oqimi
          </li>
        </ul>
      </section>
    </div>
  );
}

function ZonesTab() {
  const select = useStore((s) => s.select);
  const requestCamera = useStore((s) => s.requestCamera);
  const selected = useStore((s) => s.selected);
  const groups = useMemo(() => {
    const m = new Map<string, ReturnType<typeof getEntities>>();
    for (const e of getEntities()) {
      if (!m.has(e.group)) m.set(e.group, []);
      m.get(e.group)!.push(e);
    }
    return [...m.entries()];
  }, []);
  return (
    <div className="tab-body">
      <section>
        <h3>Ishlab chiqarish oqimi</h3>
        <ol className="flow-list">
          {PROCESS_STEPS.map((p) => (
            <li key={p.step}>
              <button
                onClick={() => {
                  const id = p.ids[0];
                  select(id);
                  const e = getEntities().find((x) => x.id === id);
                  if (e) requestCamera({ focus: e.bounds });
                }}
              >
                <span className="flow-num">{p.step}</span>
                {p.name}
              </button>
            </li>
          ))}
        </ol>
      </section>
      {groups.map(([g, items]) => (
        <section key={g}>
          <h3>{g}</h3>
          <ul className="zone-list">
            {items.map((e) => (
              <li key={e.id}>
                <button
                  className={selected === e.id ? 'is-on' : ''}
                  onClick={() => {
                    select(e.id);
                    requestCamera({ focus: e.bounds });
                  }}
                >
                  <span>{e.name}</span>
                  {e.dims.status !== 'confirmed' && <em>≈</em>}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function ReportTab() {
  const checks = useMemo(() => runChecks(), []);
  const rep = useMemo(() => dimensionReport(), []);
  return (
    <div className="tab-body">
      <section>
        <h3>Texnik talablar bo‘yicha tekshiruv</h3>
        <ul className="checks">
          {checks.map((c) => (
            <li key={c.label} className={c.ok ? 'ok' : 'fail'}>
              <i>{c.ok ? '✓' : '!'}</i>
              <div>
                <b>{c.label}</b>
                <small>{c.detail}</small>
              </div>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h3>Tasdiqlangan o‘lchamlar</h3>
        <ul className="report-list">
          {rep.confirmed.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </section>
      <section>
        <h3>Aniqlashtirilishi kerak</h3>
        <ul className="report-list report-list--warn">
          {rep.pending.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        <p className="muted small">
          Maket — o‘lchamlari va joylashuvi tahrirlanadigan professional vizualizatsiya. U ishlab chiqarishga tayyor CAD loyiha emas: uskunalar parametrik, ishlab chiqaruvchi chizmalari asosida
          aniqlashtiriladi.
        </p>
      </section>
    </div>
  );
}

/** O‘ng yon panel: qatlamlar, zonalar ro‘yxati, ma’lumot va hisobot */
export function SidePanel() {
  const open = useStore((s) => s.panelOpen);
  const setOpen = useStore((s) => s.setPanelOpen);
  const tab = useStore((s) => s.tab);
  const setTab = useStore((s) => s.setTab);
  return (
    <>
      <button className={`panel-toggle glass ${open ? 'is-open' : ''}`} onClick={() => setOpen(!open)} title="Panelni ochish/yopish" aria-expanded={open}>
        {open ? <Icon.close /> : <Icon.panel />}
      </button>
      <aside className={`side-panel glass ${open ? 'is-open' : ''}`} aria-hidden={!open}>
        <div className="tabs" role="tablist">
          {TABS.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'is-on' : ''} onClick={() => setTab(t.id)}>
              <t.icon />
              <span>{t.label}</span>
            </button>
          ))}
        </div>
        <div className="tab-scroll">
          {tab === 'layers' && <LayersTab />}
          {tab === 'zones' && <ZonesTab />}
          {tab === 'info' && <InteractiveInfoPanel />}
          {tab === 'report' && <ReportTab />}
        </div>
      </aside>
    </>
  );
}
