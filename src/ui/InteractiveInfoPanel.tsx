import { getEntity, PROCESS_STEPS } from '../lib/entities';
import { useStore } from '../state/store';
import { Icon } from './icons';

const STATUS_TEXT = {
  confirmed: 'Tasdiqlangan',
  estimated: 'Taxminiy (masterplan)',
  unconfirmed: 'Tasdiqlanmagan',
} as const;

const fmt = (v: number) => (Math.abs(v - Math.round(v)) < 0.01 ? `${Math.round(v)}` : v.toFixed(1));

/** Tanlangan zona / uskuna / bino haqida ma’lumot paneli */
export function InteractiveInfoPanel() {
  const selected = useStore((s) => s.selected);
  const select = useStore((s) => s.select);
  const requestCamera = useStore((s) => s.requestCamera);
  const doorMode = useStore((s) => s.doorMode);
  const setDoorMode = useStore((s) => s.setDoorMode);
  const e = getEntity(selected);
  if (!e) {
    return (
      <div className="info-empty">
        <Icon.info />
        <p>3D sahnada istalgan bino, zona yoki uskunani bosing — bu yerda uning vazifasi, o‘lchamlari va ishlab chiqarish jarayonidagi o‘rni ko‘rsatiladi.</p>
        <p className="muted">Maslahat: “Ichki maket” ko‘rinishida tom olib tashlanadi va stanoklar ko‘rinadi.</p>
      </div>
    );
  }
  const next = getEntity(e.nextId ?? null);
  const approx = e.dims.status !== 'confirmed';
  const step = e.step ? PROCESS_STEPS.find((p) => p.step === e.step) : undefined;
  return (
    <div className="info">
      <div className="info-head">
        <span className="info-group">{e.group}</span>
        <h2>{e.name}</h2>
        {e.term && <p className="info-term">Atama: {e.term}</p>}
      </div>
      <p className="info-desc">{e.description}</p>

      <div className="info-dims">
        <div>
          <span>Uzunlik</span>
          <b>
            {approx ? '≈ ' : ''}
            {fmt(e.dims.length)} m
          </b>
        </div>
        <div>
          <span>Kenglik</span>
          <b>
            {approx ? '≈ ' : ''}
            {fmt(e.dims.width)} m
          </b>
        </div>
        <div>
          <span>Balandlik</span>
          <b>{e.dims.height > 0 ? `${approx ? '≈ ' : ''}${fmt(e.dims.height)} m` : '—'}</b>
        </div>
      </div>
      <p className={`status status--${e.dims.status}`}>
        <i /> {STATUS_TEXT[e.dims.status]}
        {e.dims.note ? ` — ${e.dims.note}` : ''}
      </p>

      {(step || e.role) && (
        <div className="info-row">
          <span>Jarayondagi o‘rni</span>
          <b>{step ? `${step.step}-bosqich: ${step.name}` : e.role}</b>
        </div>
      )}
      {next && (
        <div className="info-row">
          <span>Keyingi jarayon</span>
          <button className="link" onClick={() => select(next.id)}>
            {next.name} →
          </button>
        </div>
      )}
      {e.params && (
        <table className="info-params">
          <tbody>
            {Object.entries(e.params).map(([k, v]) => (
              <tr key={k}>
                <td>{k}</td>
                <td>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {e.kind === 'door' && (
        <div className="info-row">
          <span>Darvozalar rejimi</span>
          <div className="seg">
            {(['auto', 'open', 'closed'] as const).map((m) => (
              <button key={m} className={doorMode === m ? 'is-on' : ''} onClick={() => setDoorMode(m)}>
                {m === 'auto' ? 'Avto' : m === 'open' ? 'Ochish' : 'Yopish'}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="info-actions">
        <button className="btn btn--primary" onClick={() => requestCamera({ focus: e.bounds })}>
          <Icon.focus /> Fokuslash
        </button>
        <button className="btn" onClick={() => select(null)}>
          <Icon.close /> Yopish
        </button>
      </div>
    </div>
  );
}
