// UC 8 – Điều phối lịch học bù (TL-13 Ghi nhận lịch nghỉ, TL-14 Lập đề xuất ca học bù) theo Figma.
// Đặc tả bản sửa: bỏ UC 8.3 – sau khi Quản lý duyệt, HỆ THỐNG tự cập nhật lịch bù và báo PH + GV.
import { useEffect, useState } from 'react';
import { makeup, MSG_SYS } from '../../services/api';
import { Button, Input, Textarea } from '../../components/ui';
import { PageHead, Pill, EmptyPlus } from '../../components/F';
import { fmtDate, fmtShort, weekdayLabel, addDays, startOfWeek, todayISO, weekdayOf } from '../../lib/dates';

const CR = 'Điều phối lịch học bù';
const sess = (i) => `${weekdayLabel(i.weekday)}, ${fmtDate(i.date)} - ${i.start} - ${i.end}`;
const UserIco = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ed986f" strokeWidth="2"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>;
export const SumLine = ({ children }) => <div className="f-sumline"><UserIco /><span>{children}</span></div>;
const Radio = ({ on, off }) => <span className={`f-radio ${on ? 'on' : ''} ${off ? 'off' : ''}`} />;

// ---------- 8.1 Ghi nhận lịch nghỉ của học viên ----------
export function MakeupRecord() {
  const [list, setList] = useState([]); const [q, setQ] = useState('');
  const [cur, setCur] = useState(null); const [rows, setRows] = useState(null);
  const [key, setKey] = useState(null); const [reason, setReason] = useState('');
  const [notice, setNotice] = useState(null); const [busy, setBusy] = useState(false);
  useEffect(() => { makeup.students().then(setList).catch((e) => setNotice({ type: 'error', msg: e.message || MSG_SYS })); }, []);
  const loadRows = async (s) => {
    try { const r = await makeup.recordable(s.id); setRows(r); if (!r.length) setNotice({ type: 'warn', msg: 'Học viên hiện không có ca học nào để ghi nhận nghỉ' }); }
    catch (e) { setNotice({ type: 'error', msg: e.message || MSG_SYS }); }
  };
  const pick = (s) => { setCur(s); setKey(null); setReason(''); setNotice(null); setRows(null); loadRows(s); };
  const save = async () => {
    if (!key) { setNotice({ type: 'warn', msg: 'Vui lòng chọn ca học cần ghi nhận nghỉ' }); return; }
    setBusy(true); setNotice(null);
    try { await makeup.record(cur.id, key, reason); setNotice({ type: 'success', msg: 'Ghi nhận lịch nghỉ thành công!' }); setReason(''); await loadRows(cur); }
    catch (e) { setNotice({ type: 'error', msg: e.message || MSG_SYS }); }
    finally { setBusy(false); }
  };
  const shown = list.filter((s) => { const k = q.trim().toLowerCase(); return !k || s.fullName.toLowerCase().includes(k) || s.code.toLowerCase().includes(k); });
  return (
    <>
      <PageHead crumbs={[CR, 'Ghi nhận lịch nghỉ']} title="Ghi nhận lịch nghỉ của học viên" notice={notice} onCloseNotice={() => setNotice(null)} />
      <div className="f-panel f-md">
        <div className="f-card f-list">
          <div className="f-search"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0d7fa8" strokeWidth="2.4"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm kiếm học viên" /></div>
          {shown.map((s) => (
            <button key={s.id} className={`f-li ${cur?.id === s.id ? 'on' : ''}`} onClick={() => pick(s)}>
              <b>{s.fullName}</b><span>{s.code} - {s.classNames || s.program}</span><Pill>{s.status}</Pill>
            </button>
          ))}
        </div>
        <div className="f-card">
          {!cur ? <div className="f-placeholder">Chọn học viên để ghi nhận lịch nghỉ</div> : (
            <>
              <h3 className="f-h3">Ghi nhận lịch nghỉ</h3>
              <SumLine>{cur.fullName} | {cur.code} | {cur.status}</SumLine>
              <h3 className="f-h3" style={{ marginTop: 18 }}>Ca học có thể ghi nhận nghỉ</h3>
              {rows && !rows.length ? <div className="f-boxempty"><EmptyPlus>Học viên hiện không có ca học nào để ghi nhận nghỉ</EmptyPlus></div> : (
                <>
                  <div className="f-table">
                    <table>
                      <thead><tr><th style={{ width: 40 }} /><th>Ngày - giờ học</th><th>Lớp</th><th>Trạng thái</th><th>Buổi còn lại</th></tr></thead>
                      <tbody>{(rows || []).map((r) => (
                        <tr key={r.key} className={`click ${key === r.key ? 'sel' : ''}`} onClick={() => !r.recorded && setKey(r.key)}>
                          <td><Radio on={key === r.key} off={r.recorded} /></td><td>{sess(r)}</td><td>{r.name}</td>
                          <td className={r.recorded ? 'f-st-done' : ''}>{r.recorded ? 'Đã xin nghỉ' : r.unrecorded ? 'Vắng - còn hạn bù' : 'Chưa diễn ra'}</td>
                          <td className={r.remaining <= 0 ? 'f-st-bad' : ''}>{r.remaining}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                  <h3 className="f-h3" style={{ marginTop: 18 }}>Lý do nghỉ</h3>
                  <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Nhập lý do nghỉ (tùy chọn)" />
                  <div className="f-actions"><Button variant="secondary" onClick={() => { setKey(null); setReason(''); }}>Hủy</Button><Button onClick={save} disabled={busy}>Lưu</Button></div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

// Lưới ca bù khả dụng trong 1 tuần (Figma TL-14-03-1)
function SlotGrid({ opts, from, sel, onSel }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(from, i));
  const times = [...new Set(opts.map((o) => `${o.start} - ${o.end}`))].sort();
  return (
    <div className="f-slots" style={{ gridTemplateColumns: `90px repeat(7, 99px)` }}>
      <div className="h">Ngày - giờ học</div>
      {days.map((d) => <div key={d} className="h">{weekdayLabel(weekdayOf(d))} - {fmtShort(d)}{weekdayOf(d) === 5 && <><br /><small>(nghỉ)</small></>}</div>)}
      {times.map((t) => (
        <div key={t} style={{ display: 'contents' }}>
          <div className="t">{t}</div>
          {days.map((d) => {
            const o = opts.find((x) => x.date === d && `${x.start} - ${x.end}` === t);
            if (!o) return <div key={d} className="c" />;
            const left = o.load.max - o.load.total;
            return <button key={d} className={`c slot ${sel === o.key ? 'on' : ''}`} onClick={() => onSel(o)}><b>{o.load.total}/{o.load.max}</b><span>Còn {left} chỗ</span></button>;
          })}
        </div>
      ))}
    </div>
  );
}

// ---------- 8.2 Lập đề xuất xếp ca học bù ----------
export function MakeupPropose() {
  const [list, setList] = useState(null); const [cur, setCur] = useState(null);
  const [opts, setOpts] = useState(null); const [sel, setSel] = useState(null); const [week, setWeek] = useState(startOfWeek(todayISO()));
  const [notice, setNotice] = useState(null); const [busy, setBusy] = useState(false);
  const load = async (keepId) => {
    try {
      const r = await makeup.pending(); setList(r);
      if (!r.filter((a) => a.status !== 'Hết hạn').length) setNotice({ type: 'warn', msg: 'Hiện không có yêu cầu học bù nào cần xử lý' });
      const c = r.find((a) => a.id === keepId); setCur(c || null); if (c) loadOpts(c);
    } catch (e) { setNotice({ type: 'error', msg: e.message || MSG_SYS }); }
  };
  const loadOpts = async (a) => {
    setOpts(null); setSel(null);
    if (a.status !== 'Chờ xếp lịch bù') return;
    try { const o = await makeup.options(a.id); setOpts(o); if (!o.length) setNotice({ type: 'warn', msg: 'Hiện chưa có ca học bù phù hợp trong hạn học bù' }); }
    catch (e) { setNotice({ type: 'error', msg: e.message || MSG_SYS }); }
  };
  useEffect(() => { load(); }, []);
  const choose = (a) => {
    setNotice(null); setCur(a); setWeek(startOfWeek(todayISO()));
    if (a.status === 'Hết hạn') { setNotice({ type: 'error', msg: 'Yêu cầu học bù này đã quá thời hạn học bù' }); setOpts(null); return; }
    loadOpts(a);
  };
  const run = async (fn, ok) => {
    setBusy(true); setNotice(null);
    try { await fn(); setNotice({ type: 'success', msg: ok }); await load(cur.id); }
    catch (e) { setNotice({ type: 'error', msg: e.message || MSG_SYS }); await load(cur.id); }
    finally { setBusy(false); }
  };
  const weekOpts = (opts || []).filter((o) => o.date >= week && o.date <= addDays(week, 6));
  const selO = (opts || []).find((o) => o.key === sel);
  return (
    <>
      <PageHead crumbs={[CR, 'Lập đề xuất ca học bù']} title="Lập đề xuất ca học bù" notice={notice} onCloseNotice={() => setNotice(null)} />
      <div className="f-panel f-md">
        <div className="f-card f-list">
          <h3>Yêu cầu cần xử lý ({(list || []).filter((a) => a.status !== 'Hết hạn').length})</h3>
          {list && !list.length ? <EmptyPlus>Hiện không có yêu cầu học bù nào cần xử lý</EmptyPlus> : (list || []).map((a) => (
            <button key={a.id} className={`f-li ${cur?.id === a.id ? 'on' : ''}`} onClick={() => choose(a)}>
              <b>{a.student.fullName}</b><span>Nghỉ: {fmtDate(a.session.date)}</span><Pill>{a.status}</Pill>
            </button>
          ))}
        </div>
        <div className="f-card">
          {!cur ? <div className="f-placeholder">{list && !list.length ? 'Chưa có yêu cầu nào để xử lý' : 'Chọn yêu cầu nghỉ để lập đề xuất'}</div> : (
            <>
              <h3 className="f-h3">Chi tiết yêu cầu học bù</h3>
              <SumLine>{cur.student.fullName} | Nghỉ ngày {fmtDate(cur.session.date)} | Yêu cầu: {cur.status}</SumLine>
              {cur.status === 'Chờ xếp lịch bù' && (
                <>
                  {opts && !opts.length ? (
                    <>
                      <h3 className="f-h3" style={{ marginTop: 18 }}>Ca học bù khả dụng (hạn đến {fmtDate(cur.deadline)})</h3>
                      <div className="f-boxempty"><EmptyPlus>Hiện chưa có ca học bù phù hợp trong hạn học bù<small>Yêu cầu vẫn ở trạng thái “Chờ xếp lịch bù”</small></EmptyPlus></div>
                    </>
                  ) : (
                    <>
                      <div className="f-weekhead">
                        <h3 className="f-h3">Ca học bù khả dụng (tuần {fmtShort(week)} - {fmtShort(addDays(week, 6))}/{week.slice(0, 4)})</h3>
                        <span><button className="f-wk" disabled={week <= startOfWeek(todayISO())} onClick={() => setWeek(addDays(week, -7))}>‹</button><button className="f-wk" disabled={addDays(week, 7) > cur.deadline} onClick={() => setWeek(addDays(week, 7))}>›</button></span>
                      </div>
                      {weekOpts.length ? <SlotGrid opts={weekOpts} from={week} sel={sel} onSel={(o) => setSel(o.key)} /> : <div className="f-boxempty small">Tuần này không có ca bù khả dụng – chuyển sang tuần khác</div>}
                      <p className="f-note" style={{ marginTop: 10 }}>Ô xanh: còn chỗ · Ô xanh đậm: ca đang chọn · Ca bù tối đa 8 học viên (tối đa 1 học viên học bù/ca)</p>
                      {selO && <div className="f-chosen">Ca đang chọn: {sess(selO)} - {selO.teacher} - Sĩ số {selO.load.total}/{selO.load.max}</div>}
                      <div className="f-actions"><Button variant="secondary" onClick={() => setSel(null)} disabled={!sel}>Hủy</Button><Button disabled={!sel || busy} onClick={() => run(() => makeup.pick(cur.id, sel), 'Đã chọn ca học bù cho học viên')}>Chọn ca này</Button></div>
                    </>
                  )}
                </>
              )}
              {cur.status !== 'Chờ xếp lịch bù' && (
                <>
                  <h3 className="f-h3" style={{ marginTop: 18 }}>Yêu cầu xin nghỉ</h3>
                  <div className="f-dl">
                    <div><span>Học viên</span><b>{cur.student.fullName} - {cur.student.code}</b></div>
                    <div><span>Ca xin nghỉ</span><b>{sess(cur.session)}</b></div>
                    <div><span>Lý do nghỉ</span><b>{cur.reason || '—'}</b></div>
                    <div><span>Hạn học bù</span><b>{fmtDate(cur.deadline)}</b></div>
                  </div>
                  {cur.makeupInfo && (
                    <>
                      <h3 className="f-h3" style={{ marginTop: 18 }}>Ca học bù đã đăng ký</h3>
                      <div className="f-dl">
                        <div><span>Ca học bù</span><b>{sess(cur.makeupInfo)}</b></div>
                        <div><span>Giáo viên</span><b>{cur.makeupInfo.teacher}</b></div>
                        <div><span>Sĩ số hiện tại</span><b>{cur.makeupInfo.load.total}/{cur.makeupInfo.load.max}</b></div>
                      </div>
                    </>
                  )}
                  <div className="f-actions"><Button variant="secondary" disabled={cur.status !== 'Đã đăng ký học bù'} onClick={() => setCur(null)}>Hủy</Button><Button disabled={cur.status !== 'Đã đăng ký học bù' || busy} onClick={() => run(() => makeup.submit(cur.id), 'Trình duyệt đề xuất ca học bù thành công!')}>Trình duyệt</Button></div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
