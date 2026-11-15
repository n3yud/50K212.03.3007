import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../../components/AdminLayout';
import { useApi, useAction } from '../../lib/hooks';
import { approvals, overview, reports, classes } from '../../services/api';
import { Async, Badge, Button, Card, Confirm, DL, Empty, Field, Input, Select, Summary, Table, Tabs } from '../../components/ui';
import { ListItem, sessionText } from '../../components/Shared';
import { Stat } from '../assistant/Overview';
import { dateLabel, fmtDate, vnd, weekdayLabel, todayISO, addDays, startOfWeek, monthKey } from '../../lib/dates';
import { PageHead, FCard, Pill, FTable, Alert, Note, EmptyPlus } from '../../components/F';
import { phoneFmt } from '../../components/Shared';
import { downloadXlsx } from '../../lib/xlsx';
import { dec, pct } from '../../lib/format';

// ---------- Tổng quan ----------
export function ManagerOverview() {
  const q = useApi(() => overview.manager(), []);
  return (
    <>
      <PageHeader crumbs={['Tổng quan']} title="Tổng quan" />
      <div className="panel"><Async q={q}>{(d) => {
        const rows = [
          ...d.trialPending.map((t) => ({ k: t.key, type: 'Ca học thử', name: `${t.info.program} · ${sessionText(t.info)}`, sub: `Giáo viên: ${t.info.teacher}`, size: `${t.load.base}/7`, to: '/quan-ly/phe-duyet/ca-hoc-thu' })),
          ...d.makeupPending.map((a) => ({ k: a.id, type: 'Xếp học bù', name: `${a.student.fullName} · nghỉ ${fmtDate(a.session.date)}`, sub: `Ca bù: ${a.makeupInfo ? sessionText(a.makeupInfo) : ''}`, size: a.makeupInfo ? `${a.makeupInfo.load.total}/${a.makeupInfo.load.max}` : '', to: '/quan-ly/phe-duyet/de-xuat-bu' })),
        ];
        const s = d.students; const tot = Math.max(1, s.total);
        return (<>
          <div className="stats">
            <Stat label="Ca học thử chờ phê duyệt" value={d.trialPending.length} /><Stat label="Đề xuất xếp bù chờ phê duyệt" value={d.makeupPending.length} />
            <Stat label="Học viên thuộc diện cảnh báo học phí" value={d.tuitionAlerts} /><Stat label="Tổng số học viên" value={s.total} />
          </div>
          <div className="grid-2">
            <Card title="Việc cần phê duyệt"><Table rows={rows} rowKey="k" pageSize={5} empty="Không có việc cần phê duyệt" columns={[
              { header: 'Loại', key: 'type', width: 110 }, { header: 'Nội dung', render: (r) => <Link to={r.to}>{r.name}<span className="sub">{r.sub}</span></Link> }, { header: 'Sĩ số ca', key: 'size', width: 80 }, { header: 'Trạng thái', width: 110, render: () => <Badge>Chờ duyệt</Badge> }]} /></Card>
            <Card title="Tình hình học viên" sub="Học viên mới tính theo tuần">
              <div className="hbar" style={{ margin: '18px 0 14px' }}><i style={{ width: `${(s.fresh / tot) * 100}%`, background: 'var(--c-primary)' }} /><i style={{ width: `${(s.old / tot) * 100}%`, background: '#7fd0f0' }} /><i style={{ width: `${(s.reserved / tot) * 100}%`, background: 'var(--c-accent)' }} /></div>
              {[['var(--c-primary)', 'Học viên mới (tuần này)', s.fresh], ['#7fd0f0', 'Học viên cũ', s.old], ['var(--c-accent)', 'Học viên đã bảo lưu (thống kê riêng)', s.reserved]].map(([c, l, v]) => <div className="legend" key={l}><span><i className="dot" style={{ background: c }} />{l}</span><b>{String(v).padStart(2, '0')}</b></div>)}
              <div className="kv-row" style={{ borderTop: '1px solid var(--c-border)', marginTop: 8 }}><b>Tổng số học viên</b><b style={{ color: 'var(--c-primary)', fontSize: 18 }}>{s.total}</b></div>
            </Card>
          </div>
          <div className="grid-2">
            <Card title="Cảnh báo học phí"><Table rows={d.alertRows} pageSize={5} empty="Không có học viên cần cảnh báo" columns={[{ header: 'Học viên', render: (r) => r.fullName }, { header: 'Chương trình', key: 'program' }, { header: 'Buổi còn lại', key: 'remaining' }, { header: 'Trạng thái học phí', render: (r) => <Badge>{r.status}</Badge> }, { header: 'Số tiền học phí', render: (r) => vnd(r.amount) }]} /></Card>
            <Card title="Vận hành lớp học" sub="Tuần này">
              {[['Tổng số ca học đã diễn ra', d.ops.sessions], ['Sĩ số bình quân / ca', dec(d.ops.avg)], ['Tỷ lệ chuyên cần', pct(d.ops.rate)], ['Lượt vắng có phép / không phép', `${d.ops.exc} / ${d.ops.une}`], ['Buổi học bù đã xử lý', d.ops.makeups]].map(([k, v]) => <div className="kv-row" key={k}><span>{k}</span><b>{v}</b></div>)}
            </Card>
          </div>
        </>);
      }}</Async></div>
    </>
  );
}

// ---------- Phê duyệt ca học thử ----------
export function ApproveTrial() {
  const q = useApi(() => approvals.trialSessions(), []); const [sel, setSel] = useState(null); const [act, busy] = useAction();
  const [hideNotice, setHideNotice] = useState(false);
  const list = q.data || []; const cur = list.find((x) => x.key === sel) || list[0];
  const run = async (fn, ok, okType = 'success') => { const r = await act(fn, { ok, okType, onError: () => q.reload() }); if (r) { setSel(null); q.reload(); } };
  const ok = cur && cur.load.base <= 7;
  const empty = !list.length;
  return (
    <>
      <PageHead
        crumbs={['Phê duyệt lịch trình', 'Phê duyệt ca học thử']}
        title="Phê duyệt ca học thử"
        notice={empty && !hideNotice ? { type: 'warn', msg: 'Hiện không có ca học thử nào cần phê duyệt' } : null}
        onCloseNotice={() => setHideNotice(true)}
      />
      <div className="panel"><div className="md">
        <Card title={`Ca học thử chờ phê duyệt (${list.length})`}>
          <Async q={q} empty={<EmptyPlus style={{ minHeight: 480 }}>Hiện không có ca học thử nào cần phê duyệt</EmptyPlus>}>
            {() => (
              !list.length ? (
                <EmptyPlus style={{ minHeight: 480 }}>Hiện không có ca học thử nào cần phê duyệt</EmptyPlus>
              ) : (
                list.map((c) => <ListItem key={c.key} active={cur?.key === c.key} onClick={() => setSel(c.key)} title={dateLabel(c.date)} sub={`${c.start}-${c.end} - ${c.teacher}`} badge="Chờ duyệt" />)
              )
            )}
          </Async>
        </Card>
        {!list.length ? (
          <Card>
            <div className="f-placeholder">Chưa có mục nào cần phê duyệt</div>
          </Card>
        ) : (
          <Card title="Chi tiết ca học thử">
            {!cur ? <Empty>Chọn một ca học thử ở danh sách bên trái</Empty> : (
              <div className="stack" style={{ gap: 14 }}>
                <Summary>{dateLabel(cur.date)} | {cur.start} - {cur.end} | {cur.teacher} | Chờ duyệt ca học thử</Summary>
                <DL rows={[['Ca học thử', `${dateLabel(cur.date)} - ${cur.start} - ${cur.end}`], ['Giáo viên phụ trách', cur.teacher], ['Trạng thái', 'Chờ duyệt ca học thử']]} />
                <div className="section-h" style={{ margin: 0 }}>Danh sách học viên học thử</div>
                <Table rows={cur.students} pageSize={5} columns={[{ header: 'Họ tên', key: 'name' }, { header: 'Ngày sinh', render: (r) => fmtDate(r.dob) }, { header: 'Chương trình', key: 'program' }]} />
                <div className="form-grid">
                  <Field label="Sĩ số hiện tại (tính cả học viên học thử)"><Input readOnly value={`${cur.load.base}/7`} /></Field>
                  <Field label="Kết quả kiểm tra sĩ số" error={!ok ? 'Vượt quá 7 học viên – không thể phê duyệt' : ''}><Input readOnly value={ok ? 'Hợp lệ - không vượt quá 7 học viên' : 'Không hợp lệ'} /></Field>
                </div>
                <div className="actions-end"><Button variant="danger-outline" disabled={busy} onClick={() => run(() => approvals.rejectTrial(cur.key), 'Đã không duyệt ca học thử.', 'info')}>Không duyệt</Button><Button variant="success" disabled={busy || !ok} onClick={() => run(() => approvals.approveTrial(cur.key), 'Phê duyệt ca học thử thành công!')}>Phê duyệt</Button></div>
              </div>
            )}
          </Card>
        )}
      </div></div>
    </>
  );
}

// ---------- Phê duyệt đề xuất xếp bù ----------
export function ApproveMakeup() {
  const q = useApi(() => approvals.makeups(), []); const [sel, setSel] = useState(null); const [act, busy] = useAction();
  const [hideNotice, setHideNotice] = useState(false);
  const list = q.data || []; const cur = list.find((x) => x.id === sel) || list[0];
  const run = async (fn, ok, okType = 'success') => { const r = await act(fn, { ok, okType, onError: () => q.reload() }); if (r) { setSel(null); q.reload(); } };
  const L = cur?.makeupInfo?.load; const okSize = L && L.total <= L.max && L.bu <= 2;
  const empty = !list.length;
  return (
    <>
      <PageHead
        crumbs={['Phê duyệt lịch trình', 'Phê duyệt đề xuất xếp bù']}
        title="Phê duyệt đề xuất xếp bù"
        notice={empty && !hideNotice ? { type: 'warn', msg: 'Hiện không có đề xuất ca học bù nào cần phê duyệt' } : null}
        onCloseNotice={() => setHideNotice(true)}
      />
      <div className="panel"><div className="md">
        <Card title={`Đề xuất chờ phê duyệt (${list.length})`}>
          <Async q={q} empty={<EmptyPlus style={{ minHeight: 480 }}>Hiện không có đề xuất ca học bù nào cần phê duyệt</EmptyPlus>}>
            {() => (
              !list.length ? (
                <EmptyPlus style={{ minHeight: 480 }}>Hiện không có đề xuất ca học bù nào cần phê duyệt</EmptyPlus>
              ) : (
                list.map((a) => <ListItem key={a.id} active={cur?.id === a.id} onClick={() => setSel(a.id)} title={a.student.fullName} sub={`Nghỉ ${fmtDate(a.session.date)} · Bù ${a.makeupInfo ? fmtDate(a.makeupInfo.date) : ''}`} badge="Chờ duyệt" />)
              )
            )}
          </Async>
        </Card>
        {!list.length ? (
          <Card>
            <div className="f-placeholder">Chưa có mục nào cần phê duyệt</div>
          </Card>
        ) : (
          <Card title="Chi tiết đề xuất xếp bù">
            {!cur ? <Empty>Chọn một đề xuất ở danh sách bên trái</Empty> : (
              <div className="stack" style={{ gap: 14 }}>
                <Summary>{cur.student.fullName} | {cur.student.program} | Chờ duyệt</Summary>
                <DL rows={[['Ca nghỉ', `${cur.session.name} – ${sessionText(cur.session)}`], ['Lý do nghỉ', cur.reason || '—'], ['Hạn học bù', fmtDate(cur.deadline)], ['Ca học bù đề xuất', `${cur.makeupInfo.name} – ${sessionText(cur.makeupInfo)}`], ['Giáo viên ca bù', cur.makeupInfo.teacher]]} />
                <div className="form-grid">
                  <Field label="Sĩ số ca bù (tính cả học bù)"><Input readOnly value={`${L.total}/${L.max}`} /></Field>
                  <Field label="Kết quả kiểm tra" error={!okSize ? 'Vượt giới hạn sĩ số' : ''}><Input readOnly value={okSize ? 'Hợp lệ - tối đa 8 học viên, tối đa 2 học viên bù' : 'Không hợp lệ'} /></Field>
                </div>
                <div className="actions-end"><Button variant="danger-outline" disabled={busy} onClick={() => run(() => approvals.rejectMakeup(cur.id), 'Đã không duyệt đề xuất ca học bù.', 'info')}>Không duyệt</Button><Button variant="success" disabled={busy || !okSize} onClick={() => run(() => approvals.approveMakeup(cur.id), 'Phê duyệt đề xuất ca học bù thành công!')}>Phê duyệt</Button></div>
              </div>
            )}
          </Card>
        )}
      </div></div>
    </>
  );
}

// ---------- Báo cáo & thống kê ----------
// ---------- UC 14 – Xem báo cáo và thống kê (Figma 01_GOC_A 13-15, 02_GOC_B 13-15, 03/04/05_MOI) ----------
const RCR = 'Báo cáo và thống kê';
function useRange(init = 'month') {
  const t = todayISO();
  const calc = (m) => (m === 'week' ? { from: startOfWeek(t), to: addDays(startOfWeek(t), 6) } : { from: `${monthKey(t)}-01`, to: addDays(`${addMonthsK(monthKey(t), 1)}-01`, -1) });
  const [f, setF] = useState({ mode: init, ...calc(init) });
  const setMode = (mode) => setF(mode === 'range' ? { ...f, mode } : { mode, ...calc(mode) });
  return [f, setF, setMode];
}
const addMonthsK = (k, n) => { const [y, m] = k.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const MODES = [{ value: 'week', label: 'Tuần' }, { value: 'month', label: 'Tháng' }, { value: 'range', label: 'Tùy chọn' }];
function RangeFields({ f, setF, setMode }) {
  return (<>
    <Field label="Khoảng thời gian"><Select value={f.mode} onChange={(e) => setMode(e.target.value)} options={MODES} /></Field>
    <Field label="Từ ngày"><Input type="date" value={f.from} onChange={(e) => setF({ ...f, mode: 'range', from: e.target.value })} /></Field>
    <Field label="Đến ngày"><Input type="date" value={f.to} onChange={(e) => setF({ ...f, mode: 'range', to: e.target.value })} /></Field>
  </>);
}
function FBars({ items, unit = '' }) {
  const max = Math.max(1, ...items.map((i) => i.value)); const top = items.reduce((a, b) => (b.value > a.value ? b : a), items[0] || {});
  const isLg = items.length <= 5;
  return (<div className={`f-bars ${isLg ? 'f-bars-lg' : ''}`}>{items.map((i) => <div key={i.label} className="col"><span className="v">{i.value}{unit}</span><div className={`bar ${i === top ? 'top' : ''}`} style={{ height: `${(i.value / max) * 120 + 14}px` }} /><span className="l">{i.label}</span></div>)}</div>);
}
function ResultFail({ msg, onRetry }) {
  return <FCard className="soft" title="Kết quả xử lý"><Alert type="error" big msg={msg} onClose={onRetry} /><div className="f-actions"><Button variant="outline" onClick={onRetry}>Thử lại</Button></div></FCard>;
}
function useReport(fn) {
  const [d, setD] = useState(null); const [err, setErr] = useState(null); const [sys, setSys] = useState(null);
  const run = async (args) => { setErr(null); try { setD(await fn(args)); } catch (e) { setD(null); if (e.status === 500) setSys(e.message); else setErr(e.message); } };
  return { d, err, sys, setErr, setSys, run };
}
const Stat4 = ({ items }) => <div className="stats">{items.map(([k, v]) => <div key={k} className="stat"><div className="lb">{k}</div><div className="vl">{v}</div></div>)}</div>;

export function ReportStudents() {
  const [f, setF, setMode] = useRange('month'); const R = useReport(reports.students);
  const head = <PageHead crumbs={[RCR, 'Thống kê tình hình học viên']} title="Thống kê tình hình học viên" />;
  if (R.sys) return <>{head}<Alert type="error" msg={R.sys} onClose={() => R.setSys(null)} /></>;
  const x = () => downloadXlsx(`thong-ke-hoc-vien-${f.from}_${f.to}.xlsx`, ['Chỉ số', 'Giá trị'], [['Từ ngày', fmtDate(f.from)], ['Đến ngày', fmtDate(f.to)], ['Học viên mới', R.d.newCount], ['Học viên cũ', R.d.oldCount], ['Đã bảo lưu', R.d.reservedCount], ['Tổng số học viên', R.d.total], ...R.d.series.map((s) => [s.label, s.value])], 'ThongKeHocVien');
  return (<>{head}
    <FCard className={R.d ? '' : 'soft'} title="Khoảng thời gian và bộ lọc">
      <div className="f-row" style={{ gridTemplateColumns: '1fr 1fr 1fr 0.55fr', alignItems: 'end' }}><RangeFields f={f} setF={setF} setMode={setMode} /><Button onClick={() => R.run(f)}>Thống kê</Button></div>
    </FCard>
    {R.err ? <ResultFail msg={R.err} onRetry={() => R.setErr(null)} /> : !R.d ? <FCard className="soft" title="Báo cáo tình hình học viên"><Note>Chọn khoảng thời gian và nhấn “Thống kê”.</Note><div style={{ height: 40 }} /></FCard> : (<>
      <Stat4 items={[['Học viên mới', R.d.newCount], ['Học viên cũ', R.d.oldCount], ['Đã bảo lưu', R.d.reservedCount], ['Tổng số học viên', R.d.total]]} />
      <FCard title="Học viên theo tuần trong tháng"><FBars items={R.d.series} /></FCard>
      <div className="f-actions" style={{ marginTop: 0 }}><Button variant="outline" onClick={x}>Xuất báo cáo</Button></div>
    </>)}
  </>);
}
export function ReportOps() {
  const [f, setF, setMode] = useRange('month'); const [cid, setCid] = useState(''); const [cl, setCl] = useState([]);
  useEffect(() => { classes.list().then(setCl).catch(() => {}); }, []);
  const R = useReport(reports.operations);
  const head = <PageHead crumbs={[RCR, 'Báo cáo vận hành lớp học']} title="Báo cáo vận hành lớp học" />;
  if (R.sys) return <>{head}<Alert type="error" msg={R.sys} onClose={() => R.setSys(null)} /></>;
  const x = () => downloadXlsx(`bao-cao-van-hanh-${f.from}_${f.to}.xlsx`, ['Lớp/Ca học', 'Số ca', 'Tỷ lệ chuyên cần (%)'], R.d.byClass.map((b) => [b.name, b.sessions, Math.round(b.rate)]), 'VanHanh');
  return (<>{head}
    <FCard className={R.d ? '' : 'soft'} title="Khoảng thời gian và bộ lọc">
      <div className="f-row" style={{ gridTemplateColumns: R.d || R.err ? '1fr 1fr 1fr 1fr 0.7fr' : '1fr 1fr 1fr 1fr', alignItems: 'end' }}>
        <Field label="Khoảng thời gian"><Select value={f.mode} onChange={(e) => setMode(e.target.value)} options={MODES} /></Field>
        <Field label="Lớp học/Ca học"><Select value={cid} onChange={(e) => setCid(e.target.value)} options={[{ value: '', label: 'Tất cả' }, ...cl.map((c) => ({ value: c.id, label: c.name }))]} /></Field>
        <Field label="Từ ngày"><Input type="date" value={f.from} onChange={(e) => setF({ ...f, mode: 'range', from: e.target.value })} /></Field>
        <Field label="Đến ngày"><Input type="date" value={f.to} onChange={(e) => setF({ ...f, mode: 'range', to: e.target.value })} /></Field>
        {(R.d || R.err) && <Button onClick={() => R.run({ ...f, classId: cid })}>Xem báo cáo</Button>}
      </div>
      {!(R.d || R.err) && <div className="f-actions" style={{ marginTop: 16 }}><Button onClick={() => R.run({ ...f, classId: cid })}>Xem báo cáo</Button></div>}
    </FCard>
    {R.err ? <ResultFail msg="Không có dữ liệu báo cáo vận hành trong khoảng thời gian này" onRetry={() => R.setErr(null)} /> : !R.d ? <FCard className="soft" title="Báo cáo vận hành lớp học"><Note>Chọn khoảng thời gian và nhấn “Xem báo cáo”.</Note><div style={{ height: 40 }} /></FCard> : (<>
      <Stat4 items={[['Tổng số ca học', R.d.sessions], ['Sĩ số bình quân/ca', dec(R.d.avgSize)], ['Tỷ lệ chuyên cần', `${Math.round(R.d.rate)}%`], ['Buổi học bù đã xử lý', R.d.makeups]]} />
      <FCard title="So sánh tỷ lệ chuyên cần giữa các ca"><FBars items={R.d.byClass.slice(0, 8).map((b, i) => ({ label: `Ca ${i + 1}`, value: Math.round(b.rate), title: b.name }))} unit="%" /></FCard>
      <div className="f-actions" style={{ marginTop: 0 }}><Button variant="outline" onClick={x}>Xuất báo cáo</Button></div>
    </>)}
  </>);
}
export function ReportTuition() {
  const [f, setF] = useState({ n: '2', status: 'Chưa thanh toán' }); const R = useReport(reports.tuitionAlert);
  const head = <PageHead crumbs={[RCR, 'Báo cáo cảnh báo học phí']} title="Báo cáo cảnh báo học phí" />;
  if (R.sys) return <>{head}<Alert type="error" msg={R.sys} onClose={() => R.setSys(null)} /></>;
  const x = () => downloadXlsx(`canh-bao-hoc-phi-${todayISO()}.xlsx`, ['Học viên', 'Chương trình học', 'SĐT phụ huynh', 'Buổi còn lại', 'Trạng thái học phí', 'Số tiền học phí (VNĐ)'], R.d.map((r) => [r.fullName, r.program, r.parentPhone, r.remaining, r.status, r.amount]), 'CanhBaoHocPhi');
  return (<>{head}
    <FCard className={R.d ? '' : 'soft'} title="Điều kiện cảnh báo học phí">
      <div className="f-row" style={{ gridTemplateColumns: '1fr 1fr 0.6fr', alignItems: 'end' }}>
        <Field label="Ngưỡng cảnh báo số buổi còn lại (N)"><Input value={f.n} onChange={(e) => setF({ ...f, n: e.target.value.replace(/\D/g, '') })} /></Field>
        <Field label="Trạng thái học phí"><Select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })} options={[{ value: '', label: 'Tất cả' }, 'Chưa thanh toán', 'Đã thanh toán']} /></Field>
        <Button onClick={() => R.run({ n: f.n || 2, status: f.status })}>Xem cảnh báo</Button>
      </div>
    </FCard>
    {R.err ? <ResultFail msg={R.err} onRetry={() => R.setErr(null)} /> : !R.d ? <FCard className="soft" title="Danh sách cảnh báo học phí"><Note>Mặc định N = 2. Danh sách bao gồm học viên còn không quá N buổi học và có trạng thái phí phù hợp.</Note><div style={{ height: 40 }} /></FCard> : (<>
      <FCard title="Danh sách cảnh báo học phí">
        <FTable rows={R.d} rowKey="studentId" cols={[{ h: 'Học viên', k: 'fullName', b: 1 }, { h: 'Chương trình học', k: 'program' }, { h: 'SĐT phụ huynh', r: (r) => phoneFmt(r.parentPhone) }, { h: 'Buổi còn lại', r: (r) => `${r.remaining} buổi` }, { h: 'Trạng thái học phí', r: (r) => <Pill>{r.status}</Pill> }, { h: 'Số tiền học phí', r: (r) => `${new Intl.NumberFormat('vi-VN').format(r.amount)}đ` }]} />
      </FCard>
      <div className="f-actions" style={{ marginTop: 0 }}><Button variant="outline" onClick={x}>Xuất báo cáo</Button></div>
    </>)}
  </>);
}
