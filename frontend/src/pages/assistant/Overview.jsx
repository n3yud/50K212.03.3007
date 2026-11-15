import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { PageHeader } from '../../components/AdminLayout';
import { useApi } from '../../lib/hooks';
import { overview, classes } from '../../services/api';
import { Async, Table, InfoLine } from '../../components/ui';
import { CapCell } from '../../components/Shared';
import { IconArrow, IconInfo } from '../../components/icons';
import { useBaseFrom } from '../../routes';
import { two } from '../../lib/format';
import { dateLabel, addDays, startOfWeek, todayISO, weekdayLabel, fmtShort } from '../../lib/dates';

export const Stat = ({ label, value }) => <div className="stat"><div className="lb">{label}</div><div className="vl">{two(value)}</div></div>;

export default function AssistantOverview() {
  const base = useBaseFrom(useLocation().pathname);
  const q = useApi(() => overview.assistant(), []);
  const [week, setWeek] = useState(null);
  if (week) return <><PageHeader crumbs={['Tổng quan']} title="Tổng quan" /><div className="panel"><WeekView from={week} setFrom={setWeek} onBack={() => setWeek(null)} /></div></>;
  return (
    <>
      <PageHeader crumbs={['Tổng quan']} title="Tổng quan" />
      <div className="panel"><Async q={q}>{(d) => (
        <>
          <div className="stats">
            <Stat label="Đơn học thử chờ tiếp nhận" value={d.waiting} />
            <Stat label="Ca học hôm nay" value={d.todaySessions.length} />
            <Stat label="Học phí cần nhắc" value={d.tuitionAlerts} />
            <Stat label="Tiến độ cần cập nhật" value={d.progressDue} />
          </div>
          <section className="card">
            <div className="row" style={{ marginBottom: 16 }}>
              <div><h2 className="card-title" style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Ca học hôm nay</h2><div style={{ fontSize: 13, color: 'var(--c-text-soft)' }}>{dateLabel(d.todayLabel)} - Cơ sở Nguyễn Phước Lan</div></div>
              <button onClick={() => setWeek(startOfWeek(todayISO()))} className="btn outline right" style={{ fontSize: 14 }}>Xem lịch tuần <IconArrow size={16} /></button>
            </div>
            <Table rows={d.todaySessions} rowKey="key" empty="Hôm nay không có ca học nào" columns={[
              { header: 'Thời gian', width: 180, headerStyle: { color: '#60747E' }, render: (s) => <span style={{ fontSize: 20, fontWeight: 400, color: 'var(--c-text)' }}>{s.start}-{s.end}</span> },
              { header: 'Ca học / Giáo viên', headerStyle: { color: '#60747E' }, render: (s) => <div><div style={{ fontSize: 18, fontWeight: 400, color: 'var(--c-text)' }}>{s.name}</div><div style={{ fontSize: 14, fontWeight: 400, color: 'var(--c-text-soft)', marginTop: 2 }}>{s.teacher} - {s.code}</div></div> },
              { header: 'Sĩ số', width: 280, headerStyle: { color: '#60747E' }, render: (s) => <CapCell load={s.load} /> },
            ]} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--c-text-soft)', marginTop: 14 }}>
              <IconInfo size={16} /> Sĩ số tối đa 7 học viên/ca, tối đa 8 nếu có học viên học thử/học bù
            </div>
          </section>
        </>
      )}</Async></div>
    </>
  );
}

// Lịch ca học trong tuần dạng lưới (Figma TL-01, Calendar view – STR-TL02)
export function WeekView({ from, setFrom, onBack }) {
  const q = useApi(() => classes.week(from), [from]);
  const t = todayISO();
  return (
    <Async q={q}>{(w) => {
      const slots = [...new Set(w.days.flatMap((d) => d.sessions.map((s) => `${s.start}|${s.end}`)))].sort((a, b) => a.localeCompare(b));
      return (
        <section className="card wk-card">
          <div className="wk-top">
            <div><h2>Lịch ca học trong tuần</h2><div className="sub">{fmtShort(w.start)} – {fmtShort(addDays(w.start, 6))}/{w.start.slice(0, 4)} - Cơ sở Nguyễn Phước Lan</div>
              <div className="lg"><span><i className="b" />Còn chỗ</span><span><i className="o" />Đã đủ sĩ số</span><span><i className="g" />Lớp người lớn</span></div></div>
            <div className="nv"><button onClick={() => setFrom(addDays(from, -7))}>&lt;</button><button className="td" onClick={() => setFrom(startOfWeek(t))}>Hôm nay</button><button onClick={() => setFrom(addDays(from, 7))}>&gt;</button>{onBack && <button className="bk" onClick={onBack}>← Về tổng quan</button>}</div>
          </div>
          <div className="wk-grid">
            <div className="hd" />
            {w.days.map((d) => <div key={d.date} className={`hd ${d.date === t ? 'today' : ''}`}><b>{weekdayLabel(d.weekday)}</b><span>{fmtShort(d.date)}{d.date === t ? ' - Hôm nay' : ''}</span></div>)}
            {slots.map((sl) => { const [a, b] = sl.split('|'); return (
              <div key={sl} style={{ display: 'contents' }}>
                <div className="tm"><b>{a} – {b}</b><span>Trẻ em</span></div>
                {w.days.map((d) => <div key={d.date} className={`cl ${d.date === t ? 'today' : ''}`}>{d.sessions.filter((s) => s.start === a && s.end === b).map((s) => {
                  const full = s.load.total >= s.load.max;
                  return <div key={s.key} className={`ev2 ${full ? 'full' : ''}`}><b>{s.program} - {s.code}</b><span>{s.teacher}</span><em>{s.load.total}/{s.load.max}</em></div>;
                })}</div>)}
              </div>
            ); })}
          </div>
        </section>
      );
    }}</Async>
  );
}
