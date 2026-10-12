import { useMemo, useState } from 'react';
import { departmentTotal, positionCount, staffConfig, staffTotal } from '../config/staffConfig';
import { getEntities } from '../lib/entities';
import { useStore } from '../state/store';

/** "Xodimlar" bo‘limi: oyna zavodining shtat jadvali — bo‘limlar, lavozimlar va soni */
export function StaffPanel() {
  const select = useStore((s) => s.select);
  const requestCamera = useStore((s) => s.requestCamera);
  const setTab = useStore((s) => s.setTab);
  const selected = useStore((s) => s.selected);
  const entities = useMemo(() => new Map(getEntities().map((e) => [e.id, e])), []);
  const total = staffTotal();
  const [open, setOpen] = useState<Record<string, boolean>>(() => Object.fromEntries(staffConfig.departments.map((d) => [d.id, true])));
  const allOpen = Object.values(open).every(Boolean);

  const goTo = (place: string) => {
    const e = entities.get(place);
    if (!e) return;
    select(e.id);
    // ro‘yxat ochiq qoladi (tanlov odatda "Ma’lumot" bo‘limiga o‘tkazadi)
    setTab('staff');
    requestCamera({ focus: e.bounds });
  };

  return (
    <div className="tab-body staff">
      <section className="staff-head">
        <h2>{staffConfig.title}</h2>
        <p className="muted small">
          Kamida {staffConfig.minTotal} nafar xodimga mo‘ljallangan shtat jadvali. Faqat lavozimlar va ularning soni ko‘rsatilgan; ishlab chiqarish {staffConfig.shifts} smenada ishlaydi.
        </p>
        <p className="staff-total">
          Jami: <b>{total}</b> nafar · {staffConfig.departments.length} ta bo‘lim · {positionCount()} ta lavozim
        </p>
        <button className="staff-toggle-all" onClick={() => setOpen(Object.fromEntries(staffConfig.departments.map((d) => [d.id, !allOpen])))}>
          {allOpen ? 'Hammasini yig‘ish' : 'Hammasini ochish'}
        </button>
      </section>
      {staffConfig.departments.map((d, i) => (
        <section key={d.id} className="staff-dept">
          <button className="staff-dept-head" aria-expanded={open[d.id]} onClick={() => setOpen((o) => ({ ...o, [d.id]: !o[d.id] }))}>
            <span className="staff-dept-num">{i + 1}</span>
            <span className="staff-dept-name">{d.name}</span>
            <span className="staff-count">{departmentTotal(d)}</span>
            <span className={`staff-chevron ${open[d.id] ? 'is-open' : ''}`} aria-hidden />
          </button>
          {open[d.id] && (
            <ul className="staff-list">
              {d.positions.map((p) => {
                const linked = p.place && entities.has(p.place);
                const body = (
                  <>
                    <span className="staff-title">
                      {p.title}
                      {linked && <i className="staff-pin"> ↗</i>}
                      {p.note && <small>{p.note}</small>}
                    </span>
                    <span className="staff-n">{p.count}</span>
                  </>
                );
                return (
                  <li key={p.title}>
                    {linked ? (
                      <button className={`staff-row is-link ${selected === p.place ? 'is-on' : ''}`} title="Ish joyini maketda ko‘rsatish" onClick={() => goTo(p.place!)}>
                        {body}
                      </button>
                    ) : (
                      <div className="staff-row">{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ))}
      <p className="muted small staff-foot">
        Ish joyi maketda ko‘rsatilgan lavozimlar ustiga bosilsa, kamera o‘sha joyga boradi.
      </p>
    </div>
  );
}
