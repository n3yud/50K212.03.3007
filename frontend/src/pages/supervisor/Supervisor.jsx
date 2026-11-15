import { useEffect, useState } from 'react';
import { PageHead, FCard, Pill, FTable, PickLink, Alert, Note } from '../../components/F';
import { downloadXlsx } from '../../lib/xlsx';
import { PageHeader } from '../../components/AdminLayout';
import { useApi, useAction } from '../../lib/hooks';
import { overview, supervisor } from '../../services/api';
import { Async, Badge, Button, Card, Confirm, Empty, Field, Input, Select, Table, downloadCsv } from '../../components/ui';
import { Stat } from '../assistant/Overview';
import { fmtDate } from '../../lib/dates';
import { Link } from 'react-router-dom';

const REMIND = { 'Chưa gửi nhắc nhở': 'warn', 'Đã gửi nhắc nhở': 'ok' };
const reviewCols = [
  { header: 'Mã ca học', key: 'code', width: 110 },
  { header: 'Ngày học', render: (r) => fmtDate(r.date) },
  { header: 'Giáo viên phụ trách', key: 'teacher' },
  { header: 'Sĩ số ca', key: 'size', width: 80 },
  { header: 'Ảnh tác phẩm', render: (r) => <Badge>{r.photo}</Badge> },
  { header: 'Nhận xét', render: (r) => <Badge>{r.comment}</Badge> },
  { header: 'Tuân thủ', render: (r) => <Badge>{r.compliance}</Badge> },
];

export function SupervisorOverview() {
  const q = useApi(() => overview.supervisor(), []);
  return (
    <>
      <PageHeader crumbs={['Tổng quan']} title="Tổng quan" />
      <div className="panel"><Async q={q}>{(d) => (
        <>
          <div className="stats">
            <Stat label="Ca học đã kết thúc hôm nay" value={d.endedToday.length} /><Stat label="Chưa đăng ảnh tác phẩm" value={d.noPhoto} />
            <Stat label="Chưa nhập nhận xét" value={d.noComment} /><Stat label="Ca vi phạm tiến độ" value={d.violations.length} />
          </div>
          <Card title="Ca học đã kết thúc hôm nay" style={{ marginBottom: 16 }}>
            <Table rows={d.endedToday} rowKey="key" empty="Hôm nay chưa có ca học nào kết thúc" columns={[
              { header: 'Mã ca học', key: 'code' }, { header: 'Ca học / Giáo viên', render: (r) => <div>{r.name}<span className="sub">{r.teacher}</span></div> }, { header: 'Thời gian', render: (r) => `${r.start} - ${r.end}` },
              { header: 'Ảnh tác phẩm', render: (r) => <Badge>{r.photo}</Badge> }, { header: 'Nhận xét', render: (r) => <Badge>{r.comment}</Badge> }, { header: 'Tuân thủ', render: (r) => <Badge>{r.compliance}</Badge> }]} />
          </Card>
          <Card title="Ca vi phạm tiến độ">
            <Table rows={d.violations} rowKey="key" pageSize={5} empty="Không có ca vi phạm tiến độ" columns={[
              { header: 'Mã ca học', key: 'code' }, { header: 'Ngày học', render: (r) => fmtDate(r.date) }, { header: 'Giáo viên phụ trách', key: 'teacher' }, { header: 'Nội dung còn thiếu', key: 'missing' }, { header: 'Trạng thái nhắc nhở', render: (r) => <Badge tone={REMIND[r.reminder]}>{r.reminder}</Badge> }]} />
            <div className="actions-end"><Link to="/giam-sat/nhac-nho" className="btn outline">Gửi nhắc nhở</Link></div>
          </Card>
        </>
      )}</Async></div>
    </>
  );
}

// UC 15.1 – Màn hình khởi tạo trống (Figma ảnh 10), sau khi bấm "Kiểm tra" mới có kết quả (Figma ảnh 9)
export function ReviewCheck() {
  const [f, setF] = useState({ teacherId: '', range: 'week', state: '' });
  const [d, setD] = useState(null); const [sys, setSys] = useState(null);
  const tq = useApi(() => supervisor.teachers(), []);
  const run = async () => { try { setD(await supervisor.review(f)); } catch (e) { setSys(e.message); } };
  const exportX = () => downloadXlsx('tien-do-review-giao-vien.xlsx', ['Mã ca học', 'Ngày học', 'Giáo viên phụ trách', 'Sĩ số ca', 'Ảnh tác phẩm', 'Nhận xét', 'Tuân thủ'], d.rows.map((r) => [r.code, fmtDate(r.date), r.teacher, r.size, r.photo, r.comment, r.compliance]), 'TienDoReview');
  const head = <PageHead crumbs={['Giám sát tiến độ', 'Kiểm tra tiến độ review của giáo viên']} title="Kiểm tra tiến độ review của giáo viên" />;
  if (sys) return <>{head}<Alert type="error" msg={sys} onClose={() => setSys(null)} /></>;
  const allOk = d && (d.rows.length === 0 || d.allDone) && !f.state;
  return (
    <>{head}
      <FCard className="soft" title="Điều kiện kiểm tra tiến độ review">
        <div className="f-row" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <Field label="Giáo viên phụ trách"><Select value={f.teacherId} onChange={(e) => setF({ ...f, teacherId: e.target.value })} options={[{ value: '', label: 'Tất cả' }, ...(tq.data || []).map((t) => ({ value: t.id, label: t.name }))]} /></Field>
          <Field label="Thời gian/Ca học"><Select value={f.range} onChange={(e) => setF({ ...f, range: e.target.value })} options={[{ value: 'today', label: 'Hôm nay' }, { value: 'week', label: 'Tuần này' }, { value: 'month', label: 'Tháng này' }, { value: 'all', label: 'Tất cả (30 ngày)' }]} /></Field>
          <Field label="Trạng thái cập nhật"><Select value={f.state} onChange={(e) => setF({ ...f, state: e.target.value })} options={[{ value: '', label: 'Tất cả' }, 'Đã hoàn thành', 'Thiếu ảnh', 'Thiếu nhận xét', 'Quá hạn']} /></Field>
        </div>
        <div className="f-actions" style={{ marginTop: 18 }}><Button onClick={run}>Kiểm tra</Button></div>
      </FCard>
      {allOk ? <Alert type="success" msg="Tất cả các ca học đã kết thúc đều đã hoàn thành cập nhật tiến độ đầy đủ" onClose={() => setD(null)} /> : (
        <FCard className="soft" title="Danh sách ca học đã kết thúc">
          {!d ? <Note>Chọn điều kiện lọc và nhấn “Kiểm tra”</Note> : <FTable rows={d.rows} rowKey="key" empty="Không có ca học phù hợp điều kiện lọc" cols={[
            { h: 'Mã ca học', k: 'code', b: 1 }, { h: 'Ngày học', r: (r) => fmtDate(r.date) }, { h: 'Giáo viên phụ trách', k: 'teacher' }, { h: 'Sĩ số ca', k: 'size' },
            { h: 'Ảnh tác phẩm', r: (r) => <Pill tone={r.photo === 'Đã đăng' ? 'ok' : 'warn'}>{r.photo}</Pill> }, { h: 'Nhận xét', r: (r) => <Pill tone={r.comment === 'Đã nhập' ? 'ok' : 'warn'}>{r.comment}</Pill> },
            { h: 'Tuân thủ', r: (r) => <Pill>{r.compliance}</Pill> }]} />}
        </FCard>
      )}
      {d && !allOk && d.rows.length > 0 && <div className="f-actions" style={{ marginTop: 0 }}><Button variant="outline" onClick={exportX}>Xuất báo cáo</Button></div>}
    </>
  );
}

// UC 15.2 – Gửi nhắc nhở vi phạm tiến độ (Figma 03/04/05/06/07_MOI, 01_GOC_A 17, 02_GOC_B 17)
export function Reminders() {
  const [rows, setRows] = useState(null); const [sys, setSys] = useState(null);
  const [cur, setCur] = useState(null); const [failMsg, setFailMsg] = useState(null);
  const [done, setDone] = useState(null); const [busy, setBusy] = useState(false);
  const load = () => supervisor.violations().then(setRows).catch((e) => setSys(e.message));
  useEffect(() => { load(); }, []);
  const head = <PageHead crumbs={['Giám sát tiến độ', 'Gửi nhắc nhở vi phạm tiến độ']} title="Gửi nhắc nhở vi phạm tiến độ" />;
  const send = async (keys) => {
    setBusy(true); setFailMsg(null);
    try { await supervisor.remind(keys); setDone(rows.filter((r) => keys.includes(r.key))); setCur(null); load(); }
    catch (e) { setFailMsg(e.message); }
    finally { setBusy(false); }
  };
  if (sys) return <>{head}<Alert type="error" msg={sys} onClose={() => setSys(null)} /></>;
  if (done) return (
    <>{head}
      <Alert type="success" msg="Gửi nhắc nhở vi phạm tiến độ thành công!" onClose={() => setDone(null)} />
      <FCard title={done.length > 1 ? `Thông tin nhắc nhở vừa gửi (${done.length} ca học)` : 'Thông tin nhắc nhở vừa gửi'}>
        {done.map((r) => (
          <div key={r.key} className="f-row" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 14 }}>
            <Field label="Mã ca học"><Input readOnly value={r.code} /></Field>
            <Field label="Người chịu trách nhiệm"><Input readOnly value={r.responsibleName} /></Field>
            <Field label="Nội dung còn thiếu"><Input readOnly value={r.missing} /></Field>
            <Field label="Trạng thái nhắc nhở"><Input readOnly value="Đã gửi nhắc nhở" /></Field>
          </div>
        ))}
      </FCard>
    </>
  );
  if (cur) return (
    <>{head}
      <FCard className="soft" title="Thông tin ca học vi phạm">
        <div className="f-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <Field label="Mã ca học"><Input readOnly value={cur.code} /></Field>
          <Field label="Ngày học"><Input readOnly value={fmtDate(cur.date)} /></Field>
          <Field label="Người chịu trách nhiệm"><Input readOnly value={`${cur.responsibleName} - ${cur.responsible}`} /></Field>
          <Field label="Nội dung còn thiếu"><Input readOnly value={cur.missing} /></Field>
        </div>
        <div style={{ margin: '14px 0 8px' }}><Pill tone="bad">Quá hạn</Pill></div>
        <Note>Thông báo sẽ được gửi tới tài khoản của người chịu trách nhiệm.</Note>
        <div className="f-actions"><Button variant="outline" onClick={() => { setCur(null); setFailMsg(null); }}>Hủy</Button><Button onClick={() => send([cur.key])} disabled={busy}>Gửi nhắc nhở</Button></div>
      </FCard>
      {failMsg && <Alert type="error" msg={failMsg} onClose={() => setFailMsg(null)} />}
    </>
  );
  return (
    <>{head}
      {rows && !rows.length ? <FCard className="soft" title="Danh sách ca học vi phạm tiến độ"><Alert type="error" big msg="Hiện tại không có ca học nào vi phạm tiến độ" /></FCard> : (
        <FCard className="soft" title="Danh sách các ca học vi phạm tiến độ">
          {failMsg && <Alert type="error" msg={failMsg} onClose={() => setFailMsg(null)} />}
          <FTable rows={rows || []} rowKey="key" cols={[
            { h: 'Mã ca', k: 'code', b: 1 }, { h: 'Ngày học', r: (r) => fmtDate(r.date) }, { h: 'Người phụ trách', r: (r) => r.responsibleName },
            { h: 'Nội dung còn thiếu', k: 'missing' }, { h: 'Trạng thái', r: (r) => <Pill tone={r.reminder === 'Đã gửi nhắc nhở' ? 'ok' : 'bad'}>{r.reminder === 'Đã gửi nhắc nhở' ? 'Đã nhắc' : 'Quá hạn'}</Pill> },
            { h: 'Hành động', w: 100, r: (r) => <PickLink onClick={() => setCur(r)} /> },
          ]} />
        </FCard>
      )}
    </>
  );
}
