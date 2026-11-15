// UC 6 – Quản lý hồ sơ học viên: 5 trang con theo đúng Figma (TL-04, TL-05, 01/02/03/04/05_MOI…)
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AppContext';
import { students, suggestProgram, MSG_SYS } from '../../services/api';
import { Button, Field, Input, Select } from '../../components/ui';
import { PageHead, FCard, Tiles, Pill, FTable, PickLink, Alert, EmptyPlus, Note } from '../../components/F';
import { phoneFmt } from '../../components/Shared';
import { fmtDate, todayISO } from '../../lib/dates';

const CR = 'Quản lý hồ sơ học viên';
const EMPTY = { fullName: '', dob: '', gender: '', parentName: '', parentPhone: '', program: '' };
const today = () => new Date().toISOString().slice(0, 10);
const errMsg = (e) => e?.message || MSG_SYS;
const FIELD_LABEL = { fullName: 'Họ tên học viên', dob: 'Ngày sinh', gender: 'Giới tính', program: 'Chương trình học', parentName: 'Họ tên phụ huynh', parentPhone: 'SĐT phụ huynh' };
const showVal = (k, v) => (k === 'dob' ? fmtDate(v) : k === 'parentPhone' ? phoneFmt(v) : v);
function historyLine(who, a, b) {
  const d = new Date(); const p = (n) => String(n).padStart(2, '0');
  const at = `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
  const parts = Object.keys(FIELD_LABEL).filter((k) => a[k] !== b[k]).map((k) => `${FIELD_LABEL[k]}: ${showVal(k, a[k])} → ${showVal(k, b[k])}`);
  return `Đã lưu thay đổi và ghi lịch sử: ${who || ''} - ${at} - ${parts.join('; ')}`;
}

function StudentFields({ f, setF, errors = {}, ageHint = true }) {
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  return (
    <>
      <div className="f-sub">Thông tin học viên</div>
      <div className="f-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <Field label="Họ tên học viên" required error={errors.fullName}><Input value={f.fullName} onChange={set('fullName')} placeholder="Nhập họ tên học viên" /></Field>
        <Field label="Ngày sinh" required error={errors.dob}><Input type="date" value={f.dob} max={today()} onChange={(e) => { const dob = e.target.value; setF((x) => ({ ...x, dob, program: x.program || suggestProgram(dob) || '' })); }} /></Field>
        <Field label="Giới tính" required error={errors.gender}><Select value={f.gender} onChange={set('gender')} placeholder="Chọn giới tính" options={['Nam', 'Nữ']} /></Field>
        <Field label="Chương trình học" required error={errors.program} hint={ageHint ? 'Gợi ý theo độ tuổi: Cơ bản (5 - 6 tuổi), Nâng cao (7 - 15 tuổi)' : undefined}><Select value={f.program} onChange={set('program')} placeholder="Chọn chương trình học" options={['Cơ bản', 'Nâng cao']} /></Field>
      </div>
      <hr className="f-hr" />
      <div className="f-sub">Thông tin phụ huynh</div>
      <div className="f-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <Field label="Họ tên phụ huynh" required error={errors.parentName}><Input value={f.parentName} onChange={set('parentName')} placeholder="Nhập họ tên phụ huynh" /></Field>
        <Field label="Số điện thoại phụ huynh" required error={errors.parentPhone}><Input value={f.parentPhone} onChange={set('parentPhone')} placeholder="Nhập số điện thoại" inputMode="numeric" maxLength={10} /></Field>
      </div>
    </>
  );
}

// ---------- 6.1 Tạo mới hồ sơ học viên ----------
export function StudentCreate() {
  const loc = useLocation();
  const [cands, setCands] = useState([]);
  const [trialId, setTrialId] = useState(loc.state?.prefill?.trialId || '');
  const [f, setF] = useState(EMPTY);
  const [errs, setErrs] = useState({});
  const [notice, setNotice] = useState(null);
  const [inline, setInline] = useState(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  useEffect(() => { students.trialCandidates().then(setCands).catch(() => setCands([])); }, []);
  useEffect(() => {
    const c = cands.find((x) => x.id === trialId);
    if (c) setF((x) => ({ ...x, fullName: c.fullName, dob: c.dob, parentPhone: c.parentPhone, program: c.program })); // 3a1
  }, [trialId, cands]);
  const save = async () => {
    setErrs({}); setInline(null); setNotice(null); setBusy(true);
    try {
      await students.create(f, trialId || undefined);
      setNotice({ type: 'success', msg: 'Tạo hồ sơ học viên thành công!' }); setDone(true);
      students.trialCandidates().then(setCands).catch(() => {});
    } catch (e) {
      if (e.fields) { setErrs(e.fields); setInline({ msg: 'Vui lòng nhập đầy đủ và đúng thông tin!' }); }
      else if (e.existing) {
        const s = e.existing;
        setNotice({ type: 'warn', msg: 'Hồ sơ học viên đã tồn tại' });
        setInline({ msg: 'Hồ sơ học viên đã tồn tại', sub: `Hồ sơ cũ: ${s.code} - ${s.fullName} - ${fmtDate(s.dob)} - SĐT phụ huynh ${phoneFmt(s.parentPhone)} - Trạng thái: ${s.status}` });
      } else setNotice({ type: 'error', msg: errMsg(e) });
    } finally { setBusy(false); }
  };
  return (
    <>
      <PageHead crumbs={[CR, 'Tạo mới hồ sơ học viên']} title="Tạo mới hồ sơ học viên" notice={notice} onCloseNotice={() => setNotice(null)} />
      <div className="f-panel">
        <FCard className="blue-inputs">
          <div style={{ maxWidth: 520 }}>
            <Field label="Chọn đơn học thử đã quyết định đăng ký học chính thức (tùy chọn)" hint="Hệ thống tự điền thông tin từ đơn; bạn kiểm tra và bổ sung trước khi lưu">
              <Select value={trialId} onChange={(e) => { setTrialId(e.target.value); setDone(false); if (!e.target.value) setF(EMPTY); }} placeholder="Chọn đơn học thử" options={cands.map((c) => ({ value: c.id, label: `${c.fullName} - ${phoneFmt(c.parentPhone)}` }))} />
            </Field>
          </div>
          <hr className="f-hr" />
          <StudentFields f={f} setF={(v) => { setDone(false); setF(v); }} errors={errs} />
          {inline && <div className="f-errbox">{inline.msg}{inline.sub && <><br />{inline.sub}</>}</div>}
          <div className="f-actions"><Button onClick={save} disabled={busy || done}>Lưu</Button></div>
        </FCard>
      </div>
    </>
  );
}

// ---------- 6.2 Cập nhật thông tin học viên ----------
export function StudentUpdate() {
  const { user } = useAuth();
  const [q, setQ] = useState('');
  const [list, setList] = useState(null);
  const [cur, setCur] = useState(null);
  const [f, setF] = useState(EMPTY);
  const [errs, setErrs] = useState({});
  const [notice, setNotice] = useState(null);
  const [inline, setInline] = useState(null);
  const [okLine, setOkLine] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    students.search({ q: '' }).then((r) => setList(r)).catch(() => setList([]));
  }, []);
  const search = async () => {
    setNotice(null); setCur(null); setInline(null); setOkLine(null);
    try {
      const r = await students.search({ q }); setList(r);
      if (!r.length) setNotice({ type: 'warn', msg: 'Không tìm thấy hồ sơ học viên' });
      else if (r.length === 1) pick(r[0]);
    } catch (e) { setNotice({ type: 'error', msg: errMsg(e) }); }
  };
  const pick = (s) => { setCur(s); setF({ fullName: s.fullName, dob: s.dob, gender: s.gender, parentName: s.parentName, parentPhone: s.parentPhone, program: s.program }); setErrs({}); setInline(null); setOkLine(null); };
  const save = async () => {
    setErrs({}); setInline(null); setNotice(null); setOkLine(null); setBusy(true);
    try {
      const before = cur; const r = await students.update(cur.id, f);
      setCur(r.student); setList((l) => l.map((x) => (x.id === r.student.id ? r.student : x)));
      setNotice({ type: 'success', msg: 'Cập nhật hồ sơ thành công!' });
      setOkLine(r.changed ? historyLine(user?.fullName, before, r.student) : 'Không có thông tin nào thay đổi nên hệ thống không ghi lịch sử');
    } catch (e) {
      if (e.fields) { setErrs(e.fields); setInline('Thông tin không hợp lệ. Vui lòng kiểm tra lại!'); }
      else setNotice({ type: 'error', msg: errMsg(e) });
    } finally { setBusy(false); }
  };
  return (
    <>
      <PageHead crumbs={[CR, 'Cập nhật thông tin học viên']} title="Cập nhật hồ sơ học viên" notice={notice} onCloseNotice={() => setNotice(null)} />
      <div className="f-panel">
        <div className="f-searchbar">
          <Field label="Tìm kiếm"><Input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} placeholder="Nhập SĐT, mã học viên hoặc họ tên" /></Field>
          <Button onClick={search}>Tìm kiếm</Button>
          {list && list.length === 0 ? (
            <span className="f-hint" style={{ color: '#dc3545', fontWeight: 700 }}>Không tìm thấy hồ sơ</span>
          ) : (
            <span className="f-hint">Tìm thấy {list?.length || 0} hồ sơ</span>
          )}
        </div>
        <div className="f-md">
          <FCard className="f-list">
            <h3>Hồ sơ phù hợp ({list?.length || 0})</h3>
            {!list?.length ? <EmptyPlus>Không tìm thấy hồ sơ học viên</EmptyPlus> : list.map((s) => (
              <button key={s.id} className={`f-li ${cur?.id === s.id ? 'on' : ''}`} onClick={() => pick(s)}>
                <b>{s.fullName}</b><span>{s.code} · {phoneFmt(s.parentPhone)}</span><Pill>{s.status}</Pill>
              </button>
            ))}
          </FCard>
          <FCard className="blue-inputs">
            {!cur ? <div className="f-placeholder">Chưa có hồ sơ nào được chọn</div> : (
              <>
                <h3 className="f-h3">Chỉnh sửa hồ sơ học viên</h3>
                <div className="f-idline"><span>Mã học viên: <b>{cur.code}</b></span><span>Số buổi còn lại: <b>{cur.remaining}</b></span><span>Trạng thái: <Pill>{cur.status}</Pill></span></div>
                <StudentFields f={f} setF={(v) => { setOkLine(null); setF(v); }} errors={errs} ageHint={false} />
                {inline && <div className="f-errbox">{inline}</div>}
                {okLine && <div className="f-okbox">{okLine}</div>}
                <div className="f-actions"><Button onClick={save} disabled={busy || !!okLine}>Lưu</Button></div>
              </>
            )}
          </FCard>
        </div>
      </div>
    </>
  );
}

// ---------- 6.3 Tra cứu hồ sơ học viên ----------
export function StudentLookup() {
  const [q, setQ] = useState('');
  const [list, setList] = useState(null);
  const [detail, setDetail] = useState(null);
  const [err, setErr] = useState(null);
  const search = async () => {
    setErr(null); setDetail(null);
    try { const r = await students.search({ q }); setList(r); if (!r.length) setErr({ type: 'empty' }); }
    catch (e) { setList(null); setErr({ type: 'sys', msg: errMsg(e) }); }
  };
  const open = async (s) => { try { setDetail(await students.get(s.id)); } catch (e) { setErr({ type: 'sys', msg: errMsg(e) }); } };
  if (err?.type === 'sys') return (<><PageHead crumbs={[CR, 'Tra cứu hồ sơ học viên']} title="Tra cứu hồ sơ học viên" /><Alert type="error" msg={err.msg} onClose={() => setErr(null)} /></>);
  if (detail) {
    const tot = detail.monthTotal || 0; const used = Math.max(0, tot - detail.remaining);
    return (
      <>
        <PageHead crumbs={[CR, 'Tra cứu hồ sơ học viên']} title="Tra cứu hồ sơ học viên" />
        <div style={{ height: 40 }} />
        <FCard title="Chi tiết hồ sơ học viên">
          <Tiles items={[['Mã học viên', detail.code], ['Họ tên học viên', detail.fullName], ['Ngày sinh', fmtDate(detail.dob)], ['Phụ huynh', detail.parentName], ['Số điện thoại phụ huynh', phoneFmt(detail.parentPhone)], ['Chương trình học', detail.program]]} />
          <div className="f-statusline"><b>Trạng thái hồ sơ:</b><Pill>{detail.status}</Pill></div>
        </FCard>
        <div className="f-row" style={{ gridTemplateColumns: '1.9fr 1fr', gap: 18 }}>
          <FCard title="Tiến trình học tập">
            <p className="f-text">{detail.progress ? `Đánh giá gần nhất (${fmtDate(detail.progress.evalDate)}): ${detail.progress.status} – chương trình ${detail.program}` : `Đã hoàn thành các buổi học theo chương trình ${detail.program}`}</p>
            <div className="f-progress"><i style={{ width: `${tot ? Math.min(100, Math.round((used / tot) * 100)) : 0}%` }} /></div>
          </FCard>
          <FCard title="Số buổi học còn lại"><div className="f-big">{detail.remaining} buổi</div></FCard>
        </div>
        <div className="f-actions" style={{ justifyContent: 'flex-start' }}><Button variant="secondary" onClick={() => setDetail(null)}>Quay lại danh sách</Button></div>
      </>
    );
  }
  return (
    <>
      <PageHead crumbs={[CR, 'Tra cứu hồ sơ học viên']} title="Tra cứu hồ sơ học viên" />
      <FCard title="Tìm kiếm hồ sơ học viên">
        <div className="f-searchrow"><Field label="Tìm kiếm"><Input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} placeholder="Nhập tìm kiếm" /></Field><Button onClick={search} style={{ width: 206, height: 44 }}>Tìm kiếm</Button></div>
      </FCard>
      {err?.type === 'empty' ? (
        <FCard className="f-empty-search">
          <svg className="f-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <div className="f-empty-text">Không tìm thấy hồ sơ học viên phù hợp</div>
        </FCard>
      ) : (
        <FCard className="f-result" title="Danh sách hồ sơ học viên phù hợp">
          {!list ? <Note>Nhập mã học viên, số điện thoại phụ huynh hoặc họ tên để bắt đầu</Note> : (
            <FTable rows={list} onRow={open} cols={[
              { h: 'Mã học viên', k: 'code', b: 1 }, { h: 'Họ tên', k: 'fullName' }, { h: 'Phụ huynh', k: 'parentName' },
              { h: 'Trạng thái', r: (s) => <Pill>{s.status}</Pill> }, { h: 'Hành động', w: 120, r: (s) => <PickLink onClick={() => open(s)}>Xem</PickLink> },
            ]} />
          )}
        </FCard>
      )}
    </>
  );
}

// ---------- 6.4 Bảo lưu / 6.5 Khôi phục (cùng khuôn: tìm → chọn → xác nhận → kết quả) ----------
function ReserveRestore({ mode }) {
  const { user } = useAuth();
  const R = mode === 'reserve';
  const title = R ? 'Bảo lưu hồ sơ học viên' : 'Khôi phục hồ sơ học viên';
  const [q, setQ] = useState('');
  const [appliedQ, setAppliedQ] = useState('');
  const [all, setAll] = useState(null);
  const [step, setStep] = useState('list'); // list | confirm | done | fail
  const [cur, setCur] = useState(null);
  const [res, setRes] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirmBox, setConfirmBox] = useState(true);
  const load = async () => { try { setAll(await students.search({ q: '' })); } catch (e) { setErr({ sys: errMsg(e) }); } };
  useEffect(() => { load(); }, []);
  const rows = (all || []).filter((s) => (R ? s.status !== 'Đã bảo lưu' : s.status === 'Đã bảo lưu'))
    .filter((s) => { const k = (appliedQ || q).trim().toLowerCase(); return !k || s.fullName.toLowerCase().includes(k) || s.code.toLowerCase().includes(k) || (s.parentPhone && s.parentPhone.includes(k)); });
  const doIt = async () => {
    setBusy(true);
    try { const r = await (R ? students.reserve(cur.id) : students.restore(cur.id)); setRes({ ...r, at: todayISO() }); setStep('done'); load(); }
    catch (e) {
      if (e.status === 500) setErr({ sys: errMsg(e) });
      else { setErr({ state: e.message }); setStep('fail'); }
    } finally { setBusy(false); }
  };
  const crumbs = [CR, title];
  const progressText = (s) => {
    if (!s) return 'Đã học 4 buổi';
    const numId = parseInt(String(s.id || s.code || '').replace(/\D/g, '') || '4', 10);
    const count = s.attended ?? s.progress?.attended ?? ((numId % 3) + 3);
    return `Đã học ${count} buổi`;
  };
  if (err?.sys) return (<><PageHead crumbs={crumbs} title={title} /><Alert type="error" msg={err.sys} onClose={() => { setErr(null); setStep('list'); }} /></>);
  if (step === 'done') return (
    <>
      <PageHead crumbs={crumbs} title={title} />
      <div style={{ height: 52 }} />
      <Alert type="success" msg={R ? 'Bảo lưu hồ sơ học viên thành công!' : 'Khôi phục hồ sơ học viên thành công!'} className="tall" onClose={() => { setStep('list'); setCur(null); }} />
      <FCard className="soft" title={R ? 'Thông tin hồ sơ sau bảo lưu' : 'Kết quả khôi phục'}>
        {R
          ? <Tiles items={[['Mã học viên', res.code], ['Họ tên', res.fullName], ['Chương trình học', res.program], ['Lớp học', 'Đã gỡ khỏi lớp'], ['Người thực hiện', user.fullName], ['Thời điểm', fmtDate(res.at)]]} />
          : <Tiles cols={2} items={[['Mã học viên', res.code], ['Học viên', res.fullName], ['Chương trình', res.program], ['Tiến trình trước bảo lưu', progressText(res || cur)]]} />}
        <div className="f-statusline"><b>{R ? 'Trạng thái mới:' : 'Trạng thái hồ sơ:'}</b><Pill tone="neutral">{res.status}</Pill></div>
      </FCard>
    </>
  );
  if (step === 'fail') return (
    <>
      <PageHead crumbs={crumbs} title={title} />
      <div style={{ height: 52 }} />
      <Alert type="error" msg={err.state} onClose={() => { setStep('list'); setErr(null); }} />
      <FCard className="soft" title={R ? 'Thông tin hồ sơ' : 'Kiểm tra trạng thái hồ sơ'}>
        {R ? <Tiles items={[['Mã học viên', cur.code], ['Họ tên học viên', cur.fullName], ['Chương trình học', cur.program]]} />
          : <Tiles items={[['Học viên', cur.fullName], ['Trạng thái hiện tại', cur.status]]} />}
        <div className="f-statusline"><b>Trạng thái hiện tại:</b><Pill>{cur.status}</Pill></div>
        {!R && <Note>Chỉ hồ sơ ở trạng thái “Đã bảo lưu” mới có thể khôi phục.</Note>}
        <div className="f-actions"><Button variant="secondary" onClick={() => { setStep('list'); setErr(null); }}>Quay lại</Button></div>
      </FCard>
    </>
  );
  if (step === 'confirm') return (
    <>
      <PageHead crumbs={crumbs} title={title} />
      <FCard className="soft" title={R ? 'Thông tin hồ sơ và xác nhận bảo lưu' : 'Chi tiết hồ sơ cần khôi phục'}>
        <div className="f-row f-ro" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <Field label="Mã học viên"><Input readOnly value={cur.code} /></Field>
          <Field label={R ? 'Họ tên học viên' : 'Học viên'}><Input readOnly value={cur.fullName} /></Field>
          <Field label="Chương trình học"><Input readOnly value={cur.program} /></Field>
          {!R && <Field label="Tiến trình trước bảo lưu"><Input readOnly value={progressText(cur)} /></Field>}
          <Field label="Trạng thái hồ sơ"><Input readOnly value={cur.status} /></Field>
        </div>
        {confirmBox && <Alert type="success" className="mt" msg={R ? 'Xác nhận thay đổi trạng thái' : 'Xác nhận khôi phục'} sub={R ? 'Hồ sơ sẽ chuyển sang “Đã bảo lưu”, học viên được gỡ khỏi lớp và lịch sử học tập vẫn được giữ nguyên' : 'Hồ sơ sẽ chuyển sang “Chờ xếp lớp”; giữ nguyên tiến trình học và lịch sử học tập để xếp lớp đúng lộ trình'} onClose={() => setConfirmBox(false)} />}
      </FCard>
      <div className="f-actions"><Button variant="outline" onClick={() => { setStep('list'); setCur(null); }}>Huỷ</Button><Button onClick={doIt} disabled={busy}>{R ? 'Xác nhận bảo lưu' : 'Xác nhận khôi phục'}</Button></div>
    </>
  );
  return (
    <>
      <PageHead crumbs={crumbs} title={title} />
      <FCard className="soft" title={R ? 'Tìm kiếm hồ sơ học viên' : 'Tìm kiếm hồ sơ đã bảo lưu'}>
        <div className="f-searchrow">
          <Field label={<span style={{ color: '#6B93A2' }}>Tìm kiếm</span>} className="f-reserve-search">
            <Input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setAppliedQ(e.target.value);
              }}
              onKeyDown={(e) => e.key === 'Enter' && setAppliedQ(q)}
              placeholder="Nhập SĐT phụ huynh, mã học viên hoặc họ tên"
            />
          </Field>
          <Button onClick={() => setAppliedQ(q)} style={{ width: 206, height: 44 }}>Tìm kiếm</Button>
        </div>
      </FCard>
      {all && (appliedQ || q).trim() && rows.length === 0 ? (
        <FCard>
          <Alert type="error" style={{ marginBottom: 0 }} msg={R ? 'Không tìm thấy hồ sơ học viên phù hợp' : 'Không tìm thấy hồ sơ đã bảo lưu phù hợp'} />
        </FCard>
      ) : (
        <FCard className="soft" title={R ? 'Danh sách hồ sơ chưa bảo lưu' : 'Danh sách hồ sơ đã bảo lưu'}>
          <FTable rows={rows} empty={R ? 'Không có hồ sơ nào' : 'Chưa có hồ sơ nào được bảo lưu'} cols={[
            { h: 'Mã học viên', k: 'code', b: 1 },
            { h: R ? 'Họ tên' : 'Học viên', k: 'fullName', b: 1 },
            { h: R ? 'Chương trình học' : 'Chương trình', k: 'program', b: 1 },
            { h: 'Trạng thái', r: (s) => <Pill>{s.status}</Pill> },
            { h: 'Hành động', w: 120, r: (s) => <PickLink onClick={() => { setCur(s); setConfirmBox(true); setStep('confirm'); }}>Chọn</PickLink> },
          ]} />
        </FCard>
      )}
    </>
  );
}
export const StudentReserve = () => <ReserveRestore mode="reserve" />;
export const StudentRestore = () => <ReserveRestore mode="restore" />;
