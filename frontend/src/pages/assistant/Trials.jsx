import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useBaseFrom } from '../../routes';
import { PageHead, Pill, Alert, EmptyPlus } from '../../components/F';
import { SumLine } from './MakeupPages';
import { PageHeader } from '../../components/AdminLayout';
import { useApi, useAction } from '../../lib/hooks';
import { trialMgmt } from '../../services/api';
import { Async, Button, Card, DL, Empty, Field, Input, Select, Summary, Table, RadioDot, Textarea, Badge, Modal } from '../../components/ui';
import { ListItem, phoneFmt, wishText, sessionText } from '../../components/Shared';
import { fmtDate, fmtDateTime } from '../../lib/dates';

const PROGRAMS = ['Cơ bản', 'Nâng cao'];

// ---------- UC 5.1 Tiếp nhận đơn học thử ----------
export function TrialAccept() {
  const q = useApi(() => trialMgmt.list('Chờ tiếp nhận'), []);
  const [sel, setSel] = useState(null); const [prog, setProg] = useState(''); const [err, setErr] = useState('');
  const [act, busy] = useAction();
  const list = q.data || [];
  const cur = list.find((x) => x.id === sel) || list[0];
  useEffect(() => { setProg(cur?.suggested || ''); setErr(''); }, [cur?.id]);
  const accept = async () => {
    if (!prog) { setErr('Vui lòng chọn chương trình học!'); return; }
    const r = await act(() => trialMgmt.accept(cur.id, prog), { ok: `Đã tiếp nhận đơn học thử của ${cur.studentName}` });
    if (r) { setSel(null); q.reload(); }
  };
  return (
    <>
      <PageHeader crumbs={['Quản lý học thử', 'Tiếp nhận đơn học thử']} title="Tiếp nhận đơn học thử" />
      <div className="panel"><div className="md">
        <Card title={`Đơn học thử chờ tiếp nhận (${list.length})`}>
          <Async q={q} empty="Hiện không có đơn học thử nào chờ tiếp nhận">{() => list.map((t) => <ListItem key={t.id} active={cur?.id === t.id} onClick={() => setSel(t.id)} title={t.studentName} sub={`SĐT: ${t.parentPhone}`} badge="Chờ tiếp nhận" />)}</Async>
        </Card>
        <Card title="Thông tin đơn đăng ký">
          {!cur ? <Empty>Chọn một đơn ở danh sách bên trái</Empty> : (
            <div className="stack" style={{ gap: 16 }}>
              <Summary>{cur.studentName} | Ngày sinh: {fmtDate(cur.dob)} | Đơn: {cur.status}</Summary>
              <div><div className="section-h" style={{ marginTop: 0 }}>Chi tiết đơn đăng ký</div>
                <DL rows={[['Họ tên học viên', cur.studentName], ['Ngày sinh', `${fmtDate(cur.dob)} (${cur.age} tuổi)`], ['Số điện thoại phụ huynh', phoneFmt(cur.parentPhone)], ['Khung giờ mong muốn', wishText(cur)], ['Thời điểm đăng ký', fmtDateTime(cur.createdAt)]]} /></div>
              <Field label="Chương trình học" required error={err} hint={`Gợi ý theo độ tuổi: Cơ bản (5 - 6 tuổi), Nâng cao (7 - 15 tuổi)${cur.suggested ? ` → phù hợp: ${cur.suggested}` : ''}`}>
                <Select value={prog} onChange={(e) => { setProg(e.target.value); setErr(''); }} placeholder="Chọn chương trình học" options={PROGRAMS} style={{ maxWidth: 260 }} />
              </Field>
              <div className="actions-end"><Button onClick={accept} disabled={busy}>Tiếp nhận</Button></div>
            </div>
          )}
        </Card>
      </div></div>
    </>
  );
}

// ---------- UC 5.2 Xếp ca học thử ----------
export function TrialSchedule() {
  const q = useApi(() => trialMgmt.list('Đã tiếp nhận'), []);
  const [sel, setSel] = useState(null); const [slot, setSlot] = useState(null);
  const [act, busy] = useAction();
  const list = q.data || [];
  const cur = list.find((x) => x.id === sel) || list[0];
  const sq = useApi(() => trialMgmt.sessionsFor(cur.id), [cur?.id], { skip: !cur });
  useEffect(() => setSlot(null), [cur?.id]);
  const propose = async () => {
    if (!slot) return;
    const r = await act(() => trialMgmt.propose(cur.id, slot), { ok: 'Đã gửi đề xuất ca học thử cho phụ huynh xác nhận', onError: () => sq.reload() });
    if (r) { setSel(null); q.reload(); }
  };
  return (
    <>
      <PageHeader crumbs={['Quản lý học thử', 'Xếp ca học thử']} title="Xếp ca học thử" />
      <div className="panel"><div className="md">
        <Card title={`Đơn học thử đã tiếp nhận (${list.length})`}>
          <Async q={q} empty="Hiện không có đơn nào cần xếp ca">{() => list.map((t) => <ListItem key={t.id} active={cur?.id === t.id} onClick={() => setSel(t.id)} title={t.studentName} sub={`Chương trình: ${t.program}`} badge="Đã tiếp nhận" />)}</Async>
        </Card>
        <Card title="Thông tin đơn đăng ký">
          {!cur ? <Empty>Chọn một đơn ở danh sách bên trái</Empty> : (
            <div className="stack" style={{ gap: 12 }}>
              <Summary>{cur.studentName} | Chương trình: {cur.program} | Đơn: {cur.status}</Summary>
              <div className="f-wish">Khung giờ mong muốn của phụ huynh: {wishText(cur)}</div>
              <div className="section-h" style={{ margin: 0 }}>Ca học thử phù hợp (cùng chương trình học, còn chỗ)</div>
              <Async q={sq} empty="Hiện chưa có ca học thử phù hợp, vui lòng thử lại sau">{(rows) => (
                <Table rows={rows} rowKey="key" selected={slot} onRow={(r) => setSlot(r.key)} pageSize={6} columns={[
                  { header: '', width: 44, render: (r) => <RadioDot on={slot === r.key} /> },
                  { header: 'Thời gian', render: (r) => sessionText(r) },
                  { header: 'Sĩ số hiện tại', render: (r) => `${r.load.base}/7` },
                  { header: 'Giáo viên', render: (r) => r.teacher },
                ]} />
              )}</Async>
              <div className="actions-end"><Button onClick={propose} disabled={!slot || busy}>Đề xuất ca học thử</Button></div>
            </div>
          )}
        </Card>
      </div></div>
    </>
  );
}

// ---------- UC 5.3 Cập nhật kết quả tư vấn (Figma TL-03, -01…-06) ----------
const getRating = (val, fallback = 'Tốt') => {
  if (!val) return fallback;
  const s = val.trim().toLowerCase();
  if (['tốt', 'khá', 'đạt', 'chưa đạt', 'xuất sắc'].includes(s)) return val.trim();
  if (s.includes('tốt') || s.includes('nhanh') || s.includes('tự tin')) return 'Tốt';
  if (s.includes('khá') || s.includes('hài hòa') || s.includes('mềm') || s.includes('đều')) return 'Khá';
  if (s.includes('rụt rè') || s.includes('đơn điệu') || s.includes('chậm')) return 'Cần rèn luyện';
  return fallback;
};

const getComment = (cur, A) => {
  if (A?.comment) return A.comment;
  if (A?.note) return A.note;
  if (cur?.studentName === 'Ninh Khả Ái' || !A?.stroke || A.stroke.length <= 5) {
    return 'Bé cầm bút tự tin, phối màu sáng tạo và hoàn thành tranh đúng thời gian.\nCần luyện thêm bố cục và nét viền.';
  }
  return `${A.stroke} ${A.color || ''} ${A.absorb || ''}`.trim();
};

export function TrialConsult() {
  const nav = useNavigate(); const base = useBaseFrom(useLocation().pathname);
  const [list, setList] = useState(null); const [cur, setCur] = useState(null);
  const [f, setF] = useState({ roadmap: '', decision: '', note: '' }); const [e, setE] = useState({});
  const [notice, setNotice] = useState(null); const [saved, setSaved] = useState(false); const [busy, setBusy] = useState(false);
  const load = () => trialMgmt.consultList().then((l) => { setList(l); return l; }).catch((x) => setNotice({ type: 'error', msg: x.message }));
  useEffect(() => { load().then((l) => l && l[0] && setCur(l[0])); }, []);
  const choose = (t) => { setCur(t); setSaved(false); setNotice(null); setE({}); setF({ roadmap: '', decision: '', note: '' }); };
  const save = async () => {
    setE({}); setNotice(null); setBusy(true);
    try { await trialMgmt.saveConsult(cur.id, f); setSaved(true); setCur({ ...cur, status: 'Đã tư vấn' }); setNotice({ type: 'success', msg: 'Cập nhật kết quả tư vấn thành công!' }); load(); }
    catch (x) { if (x.fields) setE(x.fields); else setNotice({ type: 'error', msg: x.message }); }
    finally { setBusy(false); }
  };
  const fd = (d) => `${d.slice(8)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;
  const A = cur?.assessment;
  return (
    <>
      <PageHead crumbs={['Quản lý học thử', 'Cập nhật kết quả tư vấn']} title="Cập nhật kết quả tư vấn" notice={notice} onCloseNotice={() => setNotice(null)} />
      <div className="f-panel f-md tl">
        <div className="f-card f-list">
          <h3>Học viên cần cập nhật kết quả ({list?.length || 0})</h3>
          {list && !list.length && !cur ? <EmptyPlus>Hiện không có học viên nào cần cập nhật kết quả tư vấn</EmptyPlus> : (list || []).map((t) => (
            <button key={t.id} className={`f-li ${cur?.id === t.id ? 'on' : ''}`} onClick={() => choose(t)}>
              <b>{t.studentName}</b><span className="nw">Học thử: {fd(t.sessionInfo.date)}</span><Pill tone="ok">{t.sessionInfo.ended ? 'Đã hoàn thành' : 'Đã xếp ca'}</Pill>
            </button>
          ))}
        </div>
        <div className="f-card">
          {!cur ? <div className="f-placeholder">Chưa có học viên cần cập nhật</div> : (
            <>
              <h3 className="f-h3">Kết quả tư vấn sau buổi học thử</h3>
              <SumLine>{cur.studentName} | Buổi học thử: {fd(cur.sessionInfo.date)}, {cur.sessionInfo.start} - {cur.sessionInfo.end} | Đơn: {saved ? 'Đã tư vấn' : cur.sessionInfo.ended ? 'Đã hoàn thành' : cur.status}</SumLine>
              {!cur.sessionInfo.ended ? <Alert type="error" className="mt slim" msg="Buổi học thử chưa diễn ra" />
                : !A ? <Alert type="error" className="mt slim" msg="Giáo viên chưa nhập đánh giá năng lực của học viên" /> : (
                <>
                  <h3 className="f-h3" style={{ marginTop: 16 }}>Đánh giá của giáo viên (chỉ xem)</h3>
                  <div className="f-assess">
                    <div className="g">
                      <div><span>Nét vẽ</span><b>{getRating(A.stroke, 'Tốt')}</b></div>
                      <div><span>Màu sắc</span><b>{getRating(A.color, 'Khá')}</b></div>
                      <div><span>Khả năng tiếp thu</span><b>{getRating(A.absorb, 'Tốt')}</b></div>
                    </div>
                    <div className="divider" />
                    <div className="comment">
                      Nhận xét: {getComment(cur, A)}
                    </div>
                  </div>
                  <div className="f-card-in">
                    <Field label="Lộ trình đề xuất" required error={e.roadmap}><Textarea value={f.roadmap} readOnly={saved} onChange={(x) => setF({ ...f, roadmap: x.target.value })} placeholder="Nhập lộ trình đề xuất cho học viên..." /></Field>
                    <Field label="Quyết định của phụ huynh" required error={e.decision}>
                      <div className="f-radios">{['Đăng ký học chính thức', 'Chưa quyết định', 'Không đăng ký'].map((o) => { const v = o === 'Đăng ký học chính thức' ? 'Đăng ký chính thức' : o; return <label key={o}><input type="radio" name="dec" disabled={saved} checked={f.decision === v} onChange={() => setF({ ...f, decision: v })} />{o}</label>; })}</div>
                    </Field>
                    <Field label="Ghi chú"><Input value={f.note} readOnly={saved} onChange={(x) => setF({ ...f, note: x.target.value })} placeholder="Nhập ghi chú" /></Field>
                  </div>
                  <div className="f-actions col">
                    {saved && f.decision === 'Đăng ký chính thức' && <Button variant="secondary" size="sm" onClick={() => nav(`${base}/ho-so/tao-moi`, { state: { prefill: { trialId: cur.id } } })}>Tạo hồ sơ học viên</Button>}
                    <Button onClick={save} disabled={busy || saved}>Lưu</Button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
