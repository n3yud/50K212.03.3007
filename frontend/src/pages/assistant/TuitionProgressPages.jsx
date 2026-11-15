// UC 9 – Quản lý học phí, UC 10 – Quản lý tiến độ học tập (theo Figma 01/02_GOC, 03-10_MOI)
import { useEffect, useState } from 'react';
import { tuition, progress, students, classes, MSG_SYS } from '../../services/api';
import { useAuth } from '../../context/AppContext';
import { Button, Field, Input, Select } from '../../components/ui';
import { PageHead, FCard, Tiles, Pill, FTable, PickLink, Alert, Note } from '../../components/F';
import { fmtDate, todayISO, monthKey, addMonths, weekdayLabel } from '../../lib/dates';
import { patternShort } from '../../lib/schedule';
import { downloadXlsx } from '../../lib/xlsx';

const money = (n) => `${new Intl.NumberFormat('vi-VN').format(n)}đ`;
const mLabel = (k) => `${k.slice(5)}/${k.slice(0, 4)}`;
const errMsg = (e) => e?.message || MSG_SYS;
const sessCode = (i) => i.code;
const sessText = (i) => `${i.date.slice(8)}/${i.date.slice(5, 7)}/${i.date.slice(0, 4)} - ${i.start}-${i.end}`;

// ===================== 9.1 Ghi nhận học phí =====================
export function TuitionRecord() {
  const { user } = useAuth();
  const cur = monthKey(todayISO());
  const [rows, setRows] = useState(null); const [sys, setSys] = useState(null);
  const [sel, setSel] = useState(null); const [month, setMonth] = useState(cur);
  const [done, setDone] = useState(null); const [dup, setDup] = useState(null); const [busy, setBusy] = useState(false);
  const load = () => tuition.search({ month: cur }).then(setRows).catch((e) => setSys(errMsg(e)));
  useEffect(() => { load(); }, []);
  const head = <PageHead crumbs={['Quản lý học phí', 'Ghi nhận học phí']} title="Ghi nhận học phí" />;
  const save = async () => {
    setBusy(true); setDup(null);
    try {
      await tuition.record(sel.studentId, month);
      const r = (await tuition.search({ q: sel.code, month }))[0];
      setDone({ ...r, at: todayISO() }); load();
    } catch (e) { if (e.status === 500) setSys(errMsg(e)); else setDup(e.message); }
    finally { setBusy(false); }
  };
  if (sys) return <>{head}<Alert type="error" msg={sys} onClose={() => setSys(null)} /></>;
  if (done) return (
    <>{head}
      <Alert type="success" msg="Ghi nhận học phí thành công!" onClose={() => { setDone(null); setSel(null); }} />
      <FCard className="soft" title="Kết quả ghi nhận học phí">
        <Tiles items={[['Học viên', done.fullName], ['Tháng', `Tháng ${mLabel(done.month)}`], ['Biểu phí', money(done.amount)], ['Người ghi nhận', user.fullName], ['Thời điểm ghi nhận', fmtDate(done.at)], ['Số buổi tháng', `${done.total} buổi`]]} />
        <div className="f-statusline"><b>Trạng thái học phí:</b><Pill>Đã thanh toán</Pill></div>
      </FCard>
    </>
  );
  if (dup) return (
    <>{head}
      <Alert type="error" msg={dup} onClose={() => setDup(null)} />
      <FCard className="soft" title="Thông tin học phí của học viên">
        <Tiles items={[['Học viên', `${sel.fullName} (${sel.code})`], ['Biểu phí', money(sel.amount)], ['Tháng', `Tháng ${mLabel(month)}`]]} />
        <div className="f-statusline"><b>Trạng thái học phí:</b><Pill>Đã thanh toán</Pill></div>
        <div className="f-actions"><Button variant="secondary" onClick={() => { setDup(null); setSel(null); }}>Huỷ</Button></div>
      </FCard>
    </>
  );
  if (sel) {
    const months = [addMonths(cur, -1), cur, addMonths(cur, 1)];
    return (
      <>{head}
        <FCard className="soft" title="Ghi nhận tình trạng học phí theo tháng">
          <div className="f-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <Field label="Học viên"><Input readOnly value={sel.fullName} /></Field>
            <Field label="Chương trình học"><Input readOnly value={sel.program} /></Field>
            <Field label="Biểu phí"><Input readOnly value={money(sel.amount)} /></Field>
            <Field label="Tháng"><Select value={month} onChange={(e) => setMonth(e.target.value)} options={months.map((m) => ({ value: m, label: mLabel(m) }))} /></Field>
          </div>
          <div style={{ marginTop: 14 }}><Pill>{month === cur ? sel.status : 'Chưa thanh toán'}</Pill></div>
          <div className="f-actions"><Button variant="outline" onClick={() => setSel(null)}>Huỷ</Button><Button onClick={save} disabled={busy}>Lưu</Button></div>
        </FCard>
      </>
    );
  }
  return (
    <>{head}
      <FCard className="soft" title="Danh sách học viên">
        {rows && !rows.length ? <Alert type="error" msg="Hiện không có học viên nào để ghi nhận học phí" /> : (
          <FTable rows={rows || []} rowKey="studentId" cols={[
            { h: 'Học viên', k: 'fullName', b: 1 }, { h: 'Chương trình học', k: 'program' }, { h: 'Tháng', r: (r) => mLabel(r.month) },
            { h: 'Biểu phí', r: (r) => money(r.amount) }, { h: 'Trạng thái', r: (r) => <Pill tone={r.status === 'Đã thanh toán' ? 'ok' : 'bad'}>{r.status}</Pill> },
            { h: 'Hành động', w: 100, r: (r) => <PickLink onClick={() => { setSel(r); setMonth(r.month); }}>{r.status === 'Đã thanh toán' ? 'Xem' : 'Chọn'}</PickLink> },
          ]} />
        )}
      </FCard>
    </>
  );
}

// ===================== 9.2 Tra cứu tình trạng học phí =====================
export function TuitionLookup() {
  const cur = monthKey(todayISO());
  const [f, setF] = useState({ q: '', month: cur, status: '' });
  const [rows, setRows] = useState(null); const [sys, setSys] = useState(null); const [none, setNone] = useState(false);
  const search = async () => {
    setNone(false);
    try { const r = await tuition.search(f); setRows(r); setNone(!r.length); } catch (e) { setSys(errMsg(e)); }
  };
  const head = <PageHead crumbs={['Quản lý học phí', 'Tra cứu tình trạng học phí']} title="Tra cứu tình trạng học phí" />;
  if (sys) return <>{head}<Alert type="error" msg={sys} onClose={() => setSys(null)} /></>;
  const months = Array.from({ length: 6 }, (_, i) => addMonths(cur, -i));
  return (
    <>{head}
      <FCard className="blue-inputs" title="Điều kiện tra cứu">
        <div className="f-row" style={{ gridTemplateColumns: '1.3fr 1.3fr 0.9fr 0.6fr', alignItems: 'end' }}>
          <Field label="Học viên"><Input value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} placeholder="Nhập họ tên học viên" /></Field>
          <Field label="Tháng"><Select value={f.month} onChange={(e) => setF({ ...f, month: e.target.value })} options={months.map((m) => ({ value: m, label: mLabel(m) }))} /></Field>
          <Field label="Trạng thái học phí"><Select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })} options={[{ value: '', label: 'Tất cả' }, 'Đã thanh toán', 'Chưa thanh toán']} /></Field>
          <Button onClick={search}>Tìm kiếm</Button>
        </div>
      </FCard>
      <FCard title="Danh sách kết quả tra cứu học phí">
        {none ? (<><Alert type="error" big msg="Không tìm thấy học viên phù hợp" onClose={() => setNone(false)} /><div className="f-actions"><Button variant="outline" onClick={() => setNone(false)}>Thử lại</Button></div></>)
          : rows && (
            <FTable rows={rows} rowKey="studentId" cols={[
              { h: 'Học viên', k: 'fullName', b: 1 }, { h: 'Chương trình học', k: 'program' }, { h: 'Tháng', r: (r) => mLabel(r.month) },
              { h: 'Học phí', r: (r) => money(r.amount) }, { h: 'Trạng thái học phí', r: (r) => <Pill tone={r.status === 'Đã thanh toán' ? 'ok' : 'warn'}>{r.status}</Pill> },
              { h: 'Số buổi còn lại', r: (r) => `${r.remaining} buổi` },
            ]} />
          )}
        {!rows && !none && <div style={{ minHeight: 120 }} />}
      </FCard>
    </>
  );
}

// ===================== 10.1 Ghi nhận tiến độ học viên =====================
export function ProgressRecord() {
  const { user } = useAuth();
  const [list, setList] = useState(null); const [sys, setSys] = useState(null);
  const [stu, setStu] = useState(null); const [sess, setSess] = useState(null); const [pick, setPick] = useState(null);
  const [f, setF] = useState({ evalDate: '', status: '' }); const [errs, setErrs] = useState({});
  const [done, setDone] = useState(null); const [banner, setBanner] = useState(null); const [busy, setBusy] = useState(false);
  useEffect(() => { students.search({ status: 'Đang học' }).then(setList).catch((e) => setSys(errMsg(e))); }, []);
  const head = <PageHead crumbs={['Quản lý tiến độ học tập', 'Ghi nhận tiến độ học viên']} title="Ghi nhận tiến độ học viên" />;
  const chooseStu = async (s) => { setStu(s); setPick(null); setBanner(null); try { setSess(await progress.openSessions(s.id)); } catch (e) { setSys(errMsg(e)); } };
  const save = async () => {
    setErrs({}); setBanner(null); setBusy(true);
    try { await progress.record(stu.id, pick.key, f.evalDate, f.status); setDone({ ...f, sess: pick, at: todayISO() }); }
    catch (e) {
      if (e.fields) setErrs(e.fields);
      else if (e.status === 500) setSys(errMsg(e));
      else setBanner(e.message);
    } finally { setBusy(false); }
  };
  if (sys) return <>{head}<Alert type="error" msg={sys} onClose={() => setSys(null)} /></>;
  if (done) return (
    <>{head}
      <Alert type="success" msg="Ghi nhận tiến độ thành công!" onClose={() => { setDone(null); setStu(null); }} />
      <FCard title="Thông tin tiến độ đã lưu">
        <div className="f-row f-ro2" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <Field label="Học viên"><Input readOnly value={stu.fullName} /></Field>
          <Field label="Ca học"><Input readOnly value={sessText(done.sess)} /></Field>
          <Field label="Giáo viên phụ trách"><Input readOnly value={done.sess.teacher} /></Field>
          <Field label="Ngày đánh giá"><Input readOnly value={fmtDate(done.evalDate)} /></Field>
          <Field label="Tình trạng tiến độ"><Input readOnly value={done.status} /></Field>
        </div>
      </FCard>
      <Note>Lưu người ghi nhận: {user.fullName} - Thời điểm: {fmtDate(done.at)}</Note>
    </>
  );
  if (pick) return (
    <>{head}
      {banner && <Alert type="error" msg="Không thể lưu bản ghi" sub={banner} onClose={() => setBanner(null)} />}
      <FCard className="soft" title="Ghi nhận tiến độ sau đánh giá của giáo viên">
        <div className="f-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <Field label="Học viên"><Input readOnly value={stu.fullName} /></Field>
          <Field label="Ca học"><Input readOnly value={`${sessCode(pick)} - ${pick.date.slice(8)}/${pick.date.slice(5, 7)}/${pick.date.slice(0, 4)}`} /></Field>
          <Field label="Giáo viên phụ trách"><Input readOnly value={pick.teacher} /></Field>
          <Field label="Ngày đánh giá" error={errs.evalDate}><Input type="date" value={f.evalDate} max={todayISO()} onChange={(e) => setF({ ...f, evalDate: e.target.value })} /></Field>
          <Field label="Tình trạng tiến độ" error={errs.status}><Select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })} placeholder="Chọn tình trạng tiến độ" options={['Đúng tiến độ', 'Chậm tiến độ']} /></Field>
        </div>
        <div className="f-actions"><Button variant="outline" onClick={() => setPick(null)}>Quay lại</Button><Button onClick={save} disabled={busy}>Lưu</Button></div>
      </FCard>
      {errs.evalDate === 'Ngày đánh giá không hợp lệ!' && <Note>Ngày đánh giá không được trước ngày ca học hoặc sau ngày hiện tại.</Note>}
    </>
  );
  if (stu) return (
    <>{head}
      <FCard className="soft"><b className="f-who">Học viên: {stu.fullName}</b></FCard>
      <FCard className="soft" title={sess && !sess.length ? 'Danh sách ca học cần ghi nhận tiến độ' : 'Các ca học đã kết thúc nhưng chưa ghi nhận tiến độ'}>
        {sess && !sess.length ? <Alert type="error" msg="Học viên hiện không có ca học nào cần ghi nhận tiến độ" onClose={() => setStu(null)} /> : (
          <FTable rows={sess || []} rowKey="key" cols={[
            { h: 'Mã ca học', r: sessCode, b: 1 }, { h: 'Ngày học', r: (i) => fmtDate(i.date) }, { h: 'Giáo viên phụ trách', k: 'teacher' },
            { h: 'Lớp', k: 'name' }, { h: 'Hành động', w: 100, r: (i) => <PickLink onClick={() => { setPick(i); setF({ evalDate: '', status: '' }); setErrs({}); }} /> },
          ]} />
        )}
      </FCard>
    </>
  );
  return (
    <>{head}
      <FCard className="soft" title="Danh sách học viên đang học">
        <FTable rows={list || []} cols={[
          { h: 'Mã học viên', k: 'code', b: 1 }, { h: 'Học viên', k: 'fullName' }, { h: 'Chương trình', k: 'program' },
          { h: 'Lớp học', r: (s) => s.classes.map((c) => c.name.replace(/^(Cơ bản|Nâng cao) - /, '')).join(', ') }, { h: 'Hành động', w: 100, r: (s) => <PickLink onClick={() => chooseStu(s)} /> },
        ]} />
      </FCard>
    </>
  );
}

// ===================== 10.2 Tra cứu lịch sử tiến độ =====================
export function ProgressHistory() {
  const [f, setF] = useState({ q: '', program: '', status: '' });
  const [rows, setRows] = useState(null); const [sys, setSys] = useState(null); const [none, setNone] = useState(false);
  const [stu, setStu] = useState(null); const [hist, setHist] = useState(null);
  const head = <PageHead crumbs={['Quản lý tiến độ học tập', 'Tra cứu lịch sử tiến độ']} title="Tra cứu lịch sử tiến độ" />;
  const search = async () => { setStu(null); setNone(false); try { const r = await progress.history(f); setRows(r); setNone(!r.length); } catch (e) { setSys(errMsg(e)); } };
  const view = async (s) => { setStu(s); setHist(null); try { setHist(await progress.historyOf(s.id)); } catch (e) { setSys(errMsg(e)); } };
  if (sys) return <>{head}<Alert type="error" msg={sys} onClose={() => setSys(null)} /></>;
  const filters = (
    <FCard className="soft" title="Điều kiện tra cứu">
      <div className="f-row" style={{ gridTemplateColumns: '1fr 1fr 1fr 0.6fr', alignItems: 'end' }}>
        <Field label="Học viên"><Input value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} placeholder="Nhập học viên" /></Field>
        <Field label="Chương trình học"><Select value={f.program} onChange={(e) => setF({ ...f, program: e.target.value })} options={[{ value: '', label: 'Tất cả' }, 'Cơ bản', 'Nâng cao']} /></Field>
        <Field label="Trạng thái hồ sơ"><Select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })} options={[{ value: '', label: 'Tất cả' }, 'Đang học', 'Chờ xếp lớp', 'Đã bảo lưu']} /></Field>
        <Button onClick={search}>Tìm kiếm</Button>
      </div>
    </FCard>
  );
  if (stu && hist && !hist.length) return (
    <>{head}
      <FCard className="soft"><b className="f-who">Học viên: {stu.fullName}</b></FCard>
      <FCard className="soft" title="Chi tiết lịch sử tiến độ"><Alert type="error" big msg="Học viên này chưa có lịch sử tiến độ" onClose={() => setStu(null)} /></FCard>
    </>
  );
  return (
    <>{head}{filters}
      {stu && hist ? (
        <FCard className="soft" title={`Chi tiết lịch sử tiến độ học viên – ${stu.fullName}`} right={<PickLink onClick={() => setStu(null)}>‹ Danh sách</PickLink>}>
          <FTable rows={hist} cols={[
            { h: 'Ca học', r: (p) => `${p.session.date.slice(8)}/${p.session.date.slice(5, 7)} • ${p.session.start}`, b: 1 }, { h: 'Ngày đánh giá', r: (p) => fmtDate(p.evalDate) },
            { h: 'Giáo viên phụ trách', k: 'teacher' }, { h: 'Tình trạng tiến độ', r: (p) => <Pill>{p.status}</Pill> },
            { h: 'Nhận xét', r: (p) => p.comment ? [p.comment.stroke, p.comment.color].filter(Boolean).join('; ') : '—' }, { h: 'Người ghi nhận', k: 'byName' },
          ]} />
        </FCard>
      ) : none ? <FCard className="soft" title="Kết quả xử lý"><Alert type="error" big msg="Không tìm thấy học viên phù hợp" onClose={() => setNone(false)} /><div className="f-actions"><Button variant="outline" onClick={() => setNone(false)}>Thử lại</Button></div></FCard>
        : rows && (
          <FCard className="soft" title="Danh sách kết quả">
            <FTable rows={rows} cols={[
              { h: 'Học viên', k: 'fullName', b: 1 }, { h: 'Chương trình học', k: 'program' }, { h: 'Trạng thái hồ sơ', r: (s) => <Pill>{s.status}</Pill> },
              { h: 'Hành động', w: 100, r: (s) => <PickLink onClick={() => view(s)}>Xem</PickLink> },
            ]} />
          </FCard>
        )}
    </>
  );
}

// ===================== 10.3 Lập danh sách học viên cần đánh giá =====================
export function ProgressNeedReview() {
  const [opt, setOpt] = useState({ classes: [], teachers: [] });
  const [f, setF] = useState({ program: '', classId: '', teacherId: '' });
  const [rows, setRows] = useState(null); const [sys, setSys] = useState(null);
  useEffect(() => { Promise.all([classes.list(), classes.teachers()]).then(([c, t]) => setOpt({ classes: c, teachers: t })).catch(() => {}); }, []);
  const head = <PageHead crumbs={['Quản lý tiến độ học tập', 'Lập danh sách học viên cần đánh giá']} title="Lập danh sách học viên cần đánh giá" />;
  const run = async () => { try { setRows(await progress.needReview(f)); } catch (e) { setSys(errMsg(e)); } };
  const exportX = () => downloadXlsx(`hoc-vien-can-danh-gia-${todayISO()}.xlsx`, ['Học viên', 'Chương trình học', 'Ca học', 'Giáo viên phụ trách', 'Tình trạng tiến độ', 'Đánh giá gần nhất'], rows.map((r) => [r.fullName, r.program, r.className, r.teacher, r.status, fmtDate(r.lastEval)]), 'CanDanhGia');
  if (sys) return <>{head}<Alert type="error" msg={sys} onClose={() => setSys(null)} /></>;
  const cl = opt.classes.filter((c) => !f.program || c.program === f.program);
  return (
    <>{head}
      <FCard className="soft" title="Bộ lọc học viên chậm tiến độ">
        <div className="f-row" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
          <Field label="Chương trình học"><Select value={f.program} onChange={(e) => setF({ ...f, program: e.target.value, classId: '' })} options={[{ value: '', label: 'Tất cả' }, 'Cơ bản', 'Nâng cao']} /></Field>
          <Field label="Ca học"><Select value={f.classId} onChange={(e) => setF({ ...f, classId: e.target.value })} options={[{ value: '', label: 'Tất cả' }, ...cl.map((c) => ({ value: c.id, label: `${c.name} (${patternShort(c)} ${c.start})` }))]} /></Field>
          <Field label="Giáo viên phụ trách"><Select value={f.teacherId} onChange={(e) => setF({ ...f, teacherId: e.target.value })} options={[{ value: '', label: 'Tất cả' }, ...opt.teachers.map((t) => ({ value: t.id, label: t.name }))]} /></Field>
        </div>
        <div className="f-actions" style={{ marginTop: 16 }}><Button onClick={run}>Lập danh sách</Button></div>
      </FCard>
      <FCard className="soft" title={rows && !rows.length ? 'Danh sách học viên cần đánh giá' : 'Danh sách kết quả'}>
        {!rows ? <Note>Chọn bộ lọc (nếu cần) và nhấn “Lập danh sách”.</Note>
          : !rows.length ? <Alert type="error" big msg="Hiện tại không có học viên nào cần đánh giá" onClose={() => setRows(null)} />
            : <FTable rows={rows} rowKey={(r) => r.studentId + r.className} cols={[
              { h: 'Học viên', k: 'fullName', b: 1 }, { h: 'Chương trình học', k: 'program' }, { h: 'Ca học', k: 'className' },
              { h: 'Giáo viên phụ trách', k: 'teacher' }, { h: 'Tình trạng tiến độ', r: (r) => <Pill tone="warn">{r.status}</Pill> }, { h: 'Đánh giá gần nhất', r: (r) => fmtDate(r.lastEval) },
            ]} />}
      </FCard>
      {rows?.length > 0 && <div className="f-actions" style={{ marginTop: 0 }}><Button variant="outline" onClick={exportX}>Xuất Excel</Button></div>}
    </>
  );
}
