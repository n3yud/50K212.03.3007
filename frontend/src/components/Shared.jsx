import { Fragment, useState } from 'react';
import { Badge, Button, Empty } from './ui';
import { addDays, fmtShort, startOfWeek, todayISO, weekdayLabel, fmtDate } from '../lib/dates';
import { useApi } from '../lib/hooks';
import { classes as classesApi } from '../services/api';
import { Async } from './ui';

// Ô sĩ số có thanh phân đoạn (theo Figma: xanh = còn chỗ, cam = đã đủ)
export function CapCell({ load }) {
  const full = load.total >= load.max;
  const parts = [`${load.official} học viên chính thức`];
  if (load.trials) parts.push(`${load.trials} học viên học thử`);
  if (load.bu) parts.push(`${load.bu} học viên học bù`);
  return (
    <div>
      <div className={`cap ${full ? 'full' : ''}`} style={{ fontSize: 18, fontWeight: 400 }}>{load.total}/{load.max} học viên</div>
      <div className={`bar-seg ${full ? 'full' : ''}`}>{Array.from({ length: load.max }, (_, i) => <i key={i} className={i < load.total ? 'on' : ''} />)}</div>
      <div className="cap-note" style={{ fontSize: 12, color: 'var(--c-text-soft)', marginTop: 2, fontWeight: 400 }}>{full && load.total === load.max && !load.bu && !load.trials ? 'Đã đủ sĩ số' : parts.join(' + ')}</div>
    </div>
  );
}
export const phoneFmt = (p) => (p || '').replace(/^(\d{4})(\d{3})(\d{3})$/, '$1 $2 $3');
export const wishText = (t) => `${[...t.wishDays].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map(weekdayLabel).join(' - ')}, ${t.wishSlot}`;
export const sessionText = (i) => `${weekdayLabel(i.weekday)}, ${fmtShort(i.date)} - ${i.start} - ${i.end}`;

export function ListItem({ active, onClick, title, sub, badge }) {
  return (
    <button className={`list-item ${active ? 'active' : ''}`} onClick={onClick}>
      <div className="t">{title}</div><div className="s">{sub}</div>{badge && <div className="b"><Badge>{badge}</Badge></div>}
    </button>
  );
}

// Lưới lịch tuần (Calendar view) – dùng cho Trợ lý/Quản lý
export function WeekCalendar() {
  const [from, setFrom] = useState(startOfWeek(todayISO()));
  const q = useApi(() => classesApi.week(from), [from]);
  return (
    <div className="stack">
      <div className="row">
        <Button variant="outline" size="sm" onClick={() => setFrom(addDays(from, -7))}>‹ Tuần trước</Button>
        <b>{fmtDate(from)} – {fmtDate(addDays(from, 6))}</b>
        <Button variant="outline" size="sm" onClick={() => setFrom(addDays(from, 7))}>Tuần sau ›</Button>
        <Button variant="secondary" size="sm" className="right" onClick={() => setFrom(startOfWeek(todayISO()))}>Tuần hiện tại</Button>
      </div>
      <Async q={q}>{(d) => (
        <div className="table-wrap"><div className="week">
          <div className="hd" style={{ borderLeft: 0 }} />
          {d.days.map((x) => <div key={x.date} className={`hd ${x.date === todayISO() ? 'today' : ''}`}>{weekdayLabel(x.weekday)}<br /><small className="muted">{fmtShort(x.date)}</small></div>)}
          <div className="tm" style={{ gridColumn: 1 }}>Ca học</div>
          {d.days.map((x) => (
            <div key={x.date} className={`cell ${x.closed ? 'closed' : ''}`}>
              {x.closed ? <span className="muted" style={{ fontSize: 13 }}>Nghỉ</span> : x.sessions.length === 0 ? <span className="muted" style={{ fontSize: 13 }}>—</span> : x.sessions.map((s) => (
                <div key={s.key} className={`ev ${s.program === 'Nâng cao' ? 'adv' : ''}`}>
                  <b>{s.start}-{s.end}</b>{s.name}<br />{s.teacher}<br /><span className="muted">{s.load.total}/{s.load.max} HV{s.load.bu ? ` · ${s.load.bu} bù` : ''}{s.load.trials ? ` · ${s.load.trials} thử` : ''}</span>
                </div>
              ))}
            </div>
          ))}
        </div></div>
      )}</Async>
      <div className="info-line"><span className="badge info">Cơ bản</span><span className="badge accent">Nâng cao</span> Thứ 6 trung tâm nghỉ.</div>
    </div>
  );
}
