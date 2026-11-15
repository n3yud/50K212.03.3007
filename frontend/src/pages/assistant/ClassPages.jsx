// UC 7 – Quản lý lớp học: 4 trang con theo Figma (03/04/05/06/07/08_MOI, 01_GOC_A 4-7, 02_GOC_B 4-7, Group 352)
import { useEffect, useState } from 'react';
import { classes, students, MSG_SYS } from '../../services/api';
import { Button, Field, Input, Select } from '../../components/ui';
import { PageHead, FCard, Tiles, Pill, FTable, PickLink, Alert } from '../../components/F';
import { weekdayLabel } from '../../lib/dates';
import { SCHED_CHOICES, meets, patternLabel, patternOf } from '../../lib/schedule';

const CR = 'Quản lý lớp học';
const errMsg = (e) => e?.message || MSG_SYS;
const WDS = [1, 2, 3, 4, 6, 0]; // cột lịch tuần: trung tâm nghỉ Thứ 6 (BR-UC7-04)
// Lịch học: chọn 1 trong các cặp ngày + khung giờ cố định của trung tâm (xem lib/schedule.js)
export const schedLabel = (c) => `${patternLabel(c)} • ${c.start} - ${c.end}`;
const SCHED_OPTS = SCHED_CHOICES.map((o) => ({ value: o.value, label: o.label }));
const toForm = (c) => ({ name: c.name, program: c.program, sched: `${patternOf(c)?.id || ''}|${c.start}|${c.end}`, capacity: String(c.capacity) });
const fromForm = (f) => { const o = SCHED_CHOICES.find((x) => x.value === f.sched); return { name: f.name, program: f.program, days: o ? o.days : [], weekday: o ? o.days[0] : '', weekday2: o ? o.days[1] : '', start: o?.start || '', end: o?.end || '', capacity: f.capacity }; };
const fieldErrs = (fe = {}) => ({ name: fe.name, program: fe.program, sched: fe.days || fe.weekday || fe.weekday2 || fe.start || fe.end, capacity: fe.capacity });

// Lưới lịch nhỏ (Figma: "Lịch học lớp vừa xếp", "Lịch dạy giáo viên")
export function MiniWeek({ items }) {
  const rows = [...new Set(items.map((i) => `${i.start}-${i.end}`))].sort();
  return (
    <div className="f-week">
      <div className="h">Giờ</div>{WDS.map((w) => <div key={w} className="h">{weekdayLabel(w)}</div>)}
      {rows.map((r) => (
        <div key={r} style={{ display: 'contents' }}>
          <div className="t">{r.replace('-', ' - ')}</div>
          {WDS.map((w) => <div key={w} className="c">{items.filter((i) => meets(i, w) && `${i.start}-${i.end}` === r).map((i) => <span key={i.id} className={`chip ${i.hl ? 'hl' : i.program === 'Nâng cao' ? 'adv' : ''}`}>{i.name}</span>)}</div>)}
        </div>
      ))}
    </div>
  );
}

function ClassForm({ f, setF, errs, studentsNow }) {
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <>
      <div className="f-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <Field label="Tên lớp" error={errs.name}><Input value={f.name} onChange={set('name')} placeholder="Nhập tên lớp" /></Field>
        <Field label="Chương trình học" error={errs.program}><Select value={f.program} onChange={set('program')} placeholder="Chọn chương trình học" options={['Cơ bản', 'Nâng cao']} /></Field>
        <Field label="Lịch học" error={errs.sched}><Select value={f.sched} onChange={set('sched')} placeholder="Chọn lịch học" options={SCHED_OPTS} /></Field>
        <Field label="Sĩ số tối đa" error={errs.capacity}><Input value={f.capacity} onChange={set('capacity')} placeholder="Nhập sĩ số tối đa" /></Field>
      </div>
      {studentsNow != null && <p className="f-note" style={{ marginTop: 22 }}>Số học viên hiện có: {studentsNow}</p>}
    </>
  );
}

// ---------- 7.1 Tạo lớp học mới ----------
export function ClassCreate() {
  const E = { name: '', program: '', sched: '', capacity: '' };
  const [f, setF] = useState(E); const [errs, setErrs] = useState({});
  const [done, setDone] = useState(null); const [sys, setSys] = useState(null); const [busy, setBusy] = useState(false);
  const save = async () => {
    setErrs({}); setBusy(true);
    try { setDone(await classes.create(fromForm(f))); }
    catch (e) {
      if (e.fields) {
        const fe = fieldErrs(e.fields);
        Object.keys(fe).forEach((k) => fe[k] && (fe[k] = 'Thông tin lớp học không hợp lệ, vui lòng kiểm tra lại'));
        setErrs(fe);
      } else setSys(errMsg(e));
    }
    finally { setBusy(false); }
  };
  const head = <PageHead crumbs={[CR, 'Tạo lớp học mới']} title="Tạo lớp học mới" />;
  if (sys) return <>{head}<Alert type="error" msg={sys} onClose={() => setSys(null)} /></>;
  if (done) return (
    <>{head}
      <Alert type="success" msg="Tạo lớp học thành công!" onClose={() => { setDone(null); setF(E); }} />
      <FCard className="soft" title="Lớp học vừa tạo">
        <Tiles cols={2} items={[['Tên lớp', done.name], ['Chương trình học', done.program], ['Lịch học', schedLabel(done)], ['Sĩ số tối đa', `${done.capacity} học viên`]]} />
        <div className="f-actions"><Button variant="secondary" onClick={() => { setDone(null); setF(E); }}>Quay về lớp học</Button></div>
      </FCard>
    </>
  );
  return (
    <>{head}
      <FCard className="soft" title="Thông tin lớp học mới">
        <ClassForm f={f} setF={setF} errs={errs} />
        <div className="f-actions"><Button variant="outline" onClick={() => { setF(E); setErrs({}); }}>Huỷ</Button><Button onClick={save} disabled={busy}>Lưu</Button></div>
      </FCard>
    </>
  );
}

function useClasses() {
  const [list, setList] = useState(null); const [sys, setSys] = useState(null);
  const load = () => classes.list().then(setList).catch((e) => setSys(errMsg(e)));
  useEffect(() => { load(); }, []);
  return { list, sys, setSys, load };
}

// ---------- 7.2 Cập nhật thông tin lớp ----------
export function ClassUpdate() {
  const { list, sys, setSys, load } = useClasses();
  const [cur, setCur] = useState(null); const [f, setF] = useState(null);
  const [errs, setErrs] = useState({}); const [done, setDone] = useState(null); const [busy, setBusy] = useState(false);
  const head = <PageHead crumbs={[CR, 'Cập nhật thông tin lớp']} title="Cập nhật thông tin lớp" />;
  const save = async () => {
    setErrs({}); setBusy(true);
    try { setDone(await classes.update(cur.id, fromForm(f))); load(); }
    catch (e) {
      if (e.fields) {
        const fe = fieldErrs(e.fields);
        if (fe.capacity && /nhỏ hơn/.test(fe.capacity)) fe.capacity = 'Sĩ số tối đa không được nhỏ hơn số học viên hiện có';
        else Object.keys(fe).forEach((k) => fe[k] && (fe[k] = 'Thông tin lớp học không hợp lệ. Vui lòng kiểm tra lại'));
        setErrs(fe);
      } else setSys(errMsg(e));
    } finally { setBusy(false); }
  };
  if (sys) return <>{head}<Alert type="error" msg={sys} onClose={() => setSys(null)} /></>;
  if (done) return (
    <>{head}
      <Alert type="success" msg="Cập nhật thông tin lớp học thành công!" onClose={() => { setDone(null); setCur(null); }} />
      <FCard className="soft" title="Thông tin lớp học sau cập nhật">
        <Tiles cols={2} items={[['Tên lớp', done.name], ['Chương trình học', done.program], ['Lịch học', schedLabel(done)], ['Sĩ số tối đa', `${done.capacity} học viên`]]} />
        <div className="f-actions"><Button variant="secondary" onClick={() => { setDone(null); setCur(null); }}>Quay về danh sách</Button></div>
      </FCard>
    </>
  );
  if (cur) return (
    <>{head}
      <FCard className="soft" title="Cập nhật thông tin lớp">
        <ClassForm f={f} setF={setF} errs={errs} studentsNow={cur.size} />
        <div className="f-actions"><Button variant="outline" onClick={() => setCur(null)}>Huỷ</Button><Button onClick={save} disabled={busy}>Lưu</Button></div>
      </FCard>
    </>
  );
  return (
    <>{head}
      <FCard className="soft" title="Danh sách lớp học">
        {list && !list.length ? <div className="f-center">Hiện chưa có lớp học nào</div> : (
          <FTable rows={list || []} cols={[
            { h: 'Mã lớp', r: (c) => c.code || `LH${String(c.id).padStart(3, '0')}`, b: 1 }, { h: 'Tên lớp', k: 'name', b: 1 }, { h: 'Chương trình', k: 'program' },
            { h: 'Lịch học', r: (c) => schedLabel(c) }, { h: 'Sĩ số', r: (c) => `${c.size}/${c.capacity}` },
            { h: 'Hành động', w: 110, r: (c) => <PickLink onClick={() => { setCur(c); setF(toForm(c)); setErrs({}); }} /> },
          ]} />
        )}
      </FCard>
    </>
  );
}

// ---------- 7.3 Xếp học viên vào lớp ----------
export function ClassEnroll() {
  const [wait, setWait] = useState(null); const [sys, setSys] = useState(null);
  const [stu, setStu] = useState(null); const [opts, setOpts] = useState(null); const [pick, setPick] = useState(null);
  const [notice, setNotice] = useState(null); const [done, setDone] = useState(null); const [all, setAll] = useState([]); const [busy, setBusy] = useState(false);
  const load = () => students.search({ status: 'Chờ xếp lớp' }).then(setWait).catch((e) => setSys(errMsg(e)));
  useEffect(() => { load(); classes.list().then(setAll).catch(() => {}); }, []);
  const choose = async (s) => { setStu(s); setPick(null); setNotice(null); try { setOpts((await classes.openFor(s.id))); } catch (e) { setSys(errMsg(e)); } };
  const confirm = async () => {
    if (!pick) { setNotice({ type: 'error', msg: 'Vui lòng chọn lớp học' }); return; }
    setBusy(true); setNotice(null);
    try { await classes.enroll(stu.id, pick.id); setDone({ stu, cls: pick }); classes.list().then(setAll); load(); }
    catch (e) { if (e.status === 500) setSys(errMsg(e)); else setNotice({ type: 'error', msg: e.message }); }
    finally { setBusy(false); }
  };
  const head = <PageHead crumbs={[CR, 'Xếp học viên vào lớp']} title="Xếp học viên vào lớp" notice={notice} onCloseNotice={() => setNotice(null)} />;
  if (sys) return <>{head}<Alert type="error" msg={sys} onClose={() => setSys(null)} /></>;
  if (done) {
    const mine = all.filter((c) => done.stu.classIds?.includes(c.id) || c.id === done.cls.id).map((c) => ({ ...c, hl: c.id === done.cls.id }));
    return (
      <>{head}
        <Alert type="success" msg="Xếp học viên vào lớp thành công!" onClose={() => { setDone(null); setStu(null); }} />
        <FCard className="soft" title={<span>Thông tin xếp lớp <span className="f-inline-status">Trạng thái hồ sơ: <Pill>Đang học</Pill></span></span>}>
          <Tiles cols={2} items={[['Học viên', done.stu.fullName], ['Chương trình học', done.stu.program], ['Lớp học', done.cls.name], ['Lịch học', schedLabel(done.cls)]]} />
        </FCard>
        <FCard className="soft" title="Lịch học lớp vừa xếp"><MiniWeek items={mine} /></FCard>
      </>
    );
  }
  if (stu) {
    const age = stu.age;
    return (
      <>{head}
        <FCard className="soft"><b className="f-who">Học viên: {stu.fullName} - {age} tuổi - Chương trình: {stu.program}</b></FCard>
        {opts && !opts.length ? <Alert type="error" msg="Hiện tại không có lớp học phù hợp" /> : (
          <FCard className="soft" title="Chọn lớp học phù hợp">
            <FTable rows={opts || []} selected={pick?.id} cols={[
              { h: 'Lớp học', k: 'name', b: 1 }, { h: 'Lịch học', r: (c) => schedLabel(c) },
              { h: 'Sĩ số', r: (c) => `${c.size}/${c.capacity}` },
              { h: 'Hành động', w: 120, r: (c) => <PickLink onClick={() => setPick(c)}>{pick?.id === c.id ? 'Đã chọn' : 'Chọn lớp'}</PickLink> },
            ]} />
            <div className="f-actions"><Button variant="outline" onClick={() => setStu(null)}>Huỷ</Button><Button onClick={confirm} disabled={busy}>Xác nhận</Button></div>
          </FCard>
        )}
      </>
    );
  }
  return (
    <>{head}
      <FCard className="soft" title="Học viên chờ xếp lớp">
        {wait && !wait.length ? <Alert type="success" msg="Hiện không có học viên nào cần xếp lớp" /> : (
          <FTable rows={wait || []} cols={[
            { h: 'Mã học viên', k: 'code', b: 1 }, { h: 'Học viên', k: 'fullName', b: 1 }, { h: 'Độ tuổi', r: (s) => `${s.age} tuổi` },
            { h: 'Chương trình', k: 'program' }, { h: 'Trạng thái', r: (s) => <Pill>{s.status}</Pill> },
            { h: 'Hành động', w: 110, r: (s) => <PickLink onClick={() => choose(s)} /> },
          ]} />
        )}
      </FCard>
    </>
  );
}

// ---------- 7.4 Phân công giáo viên phụ trách ----------
export function ClassAssign() {
  const { list, sys, setSys, load } = useClasses();
  const [cur, setCur] = useState(null); const [tea, setTea] = useState(null); const [pick, setPick] = useState(null);
  const [notice, setNotice] = useState(null); const [done, setDone] = useState(null); const [busy, setBusy] = useState(false);
  const head = <PageHead crumbs={[CR, 'Phân công giáo viên phụ trách']} title="Phân công giáo viên phụ trách" />;
  const choose = async (c) => { setCur(c); setPick(null); setNotice(null); try { setTea(await classes.teachersFor(c.id)); } catch (e) { setSys(errMsg(e)); } };
  const assign = async () => {
    if (!pick) { setNotice('Vui lòng chọn giáo viên phụ trách'); return; }
    setBusy(true); setNotice(null);
    try { const c = await classes.assignTeacher(cur.id, pick.id); const all = await classes.list(); setDone({ c, t: pick, sched: all.filter((x) => x.teacherId === pick.id).map((x) => ({ ...x, hl: x.id === c.id })) }); load(); }
    catch (e) { if (e.status === 500) setSys(errMsg(e)); else setNotice(e.message); }
    finally { setBusy(false); }
  };
  if (sys) return <>{head}<Alert type="error" msg={sys} onClose={() => setSys(null)} /></>;
  if (done) return (
    <>{head}
      <Alert type="success" msg="Phân công giáo viên thành công!" onClose={() => { setDone(null); setCur(null); }} />
      <FCard className="soft" title="Lớp học và giáo viên phụ trách">
        <Tiles cols={2} items={[['Lớp học', done.c.name], ['Giáo viên phụ trách', done.t.name], ['Lịch học', schedLabel(done.c)], ['Trạng thái', 'Đã phân công']]} />
      </FCard>
      <FCard className="soft" title="Lịch dạy giáo viên"><MiniWeek items={done.sched} /></FCard>
    </>
  );
  if (cur) return (
    <>{head}
      {notice && <Alert type="error" msg={notice} onClose={() => setNotice(null)} />}
      {!notice && <FCard className="soft"><b className="f-who">Lớp: {cur.name} • {schedLabel(cur)}</b></FCard>}
      <FCard className="soft" title="Danh sách giáo viên và lịch dạy">
        <FTable rows={tea || []} selected={pick?.id} cols={[
          { h: 'Giáo viên', k: 'name', b: 1 }, { h: 'Lịch dạy hiện có', k: 'schedule' },
          { h: 'Trạng thái', r: (t) => <Pill tone={t.conflict ? 'bad' : 'ok'}>{t.conflict ? 'Trùng lịch' : 'Phù hợp'}</Pill> },
          { h: 'Hành động', w: 140, r: (t) => (t.conflict ? <span className="f-muted">Không thể chọn</span> : <PickLink onClick={() => setPick(t)}>{pick?.id === t.id ? 'Đã chọn' : 'Chọn giáo viên'}</PickLink>) },
        ]} />
        <p className="f-note" style={{ marginTop: 14 }}>Hãy chọn giáo viên không trùng lịch dạy cho lớp này.</p>
        <div className="f-actions"><Button variant="outline" onClick={() => setCur(null)}>Huỷ</Button><Button onClick={assign} disabled={busy}>Phân công</Button></div>
      </FCard>
    </>
  );
  return (
    <>{head}
      <FCard className="soft" title="Chọn lớp học cần phân công giáo viên">
        {list && !list.length ? <div className="f-center">Hiện chưa có lớp học nào</div> : (
          <FTable rows={list || []} cols={[
            { h: 'Mã lớp', r: (c) => c.code || `LH${String(c.id).padStart(3, '0')}`, b: 1 }, { h: 'Tên lớp', k: 'name', b: 1 }, { h: 'Lịch học', r: (c) => schedLabel(c) },
            { h: 'Giáo viên', r: (c) => c.teacher || 'Chưa phân công' }, { h: 'Hành động', w: 110, r: (c) => <PickLink onClick={() => choose(c)} /> },
          ]} />
        )}
      </FCard>
    </>
  );
}
