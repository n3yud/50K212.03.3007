// Web mobile Phụ huynh – dựng lại theo đúng Figma "Giao diện Phụ huynh mobile web"
// (Trang chủ, menu 3 chức năng mỗi tab, màn kết quả dạng thẻ có biểu tượng tròn + nút "Đóng").
import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AppContext';
import { parent, trialsApi, validateChild, MSG_SYS_PARENT, notifications } from '../../services/api';
import { Button, Field, Input, Select } from '../../components/ui';
import { MTitle } from '../../components/MobileLayout';
import { IconChevronRight, IconChevronDown } from '../../components/icons';
import { addDays, fmtDate, fmtDateTime, fmtShort, startOfWeek, todayISO, weekdayLabel } from '../../lib/dates';
import { SCHED_CHOICES } from '../../lib/schedule';

const P = '/phu-huynh';
const NOT_LINKED = 'Tài khoản chưa được liên kết với hồ sơ học viên. Vui lòng liên hệ Trợ lý để hỗ trợ';
const dmy = (d) => fmtDate(d);
const wdLong = (wd) => (wd === 0 ? 'Chủ Nhật' : ['', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'][wd]);

// ---------- Biểu tượng (vẽ lại theo Figma) ----------
const Svg = ({ children, s = 26, c = 'currentColor' }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>;
export const Ico = {
  palette: (p) => <Svg {...p}><path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.6-.8 1.3-1.7-.4-1 .2-2.3 1.4-2.3H17a4 4 0 0 0 4-4c0-5.5-4-10-9-10Z" /><circle cx="7.5" cy="11" r="1.2" /><circle cx="10" cy="7" r="1.2" /><circle cx="14.5" cy="7" r="1.2" /></Svg>,
  cal: (p) => <Svg {...p}><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /></Svg>,
  check: (p) => <Svg {...p}><rect x="5" y="3" width="14" height="18" rx="2" /><path d="m9 12 2 2 4-4" /></Svg>,
  doc: (p) => <Svg {...p}><path d="M6 3h8l4 4v14H6Z" /><path d="M9 12h6M9 16h6" /></Svg>,
  calAdd: (p) => <Svg {...p}><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4M12 13v5M9.5 15.5h5" /></Svg>,
  calX: (p) => <Svg {...p}><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4M10 14l4 4M14 14l-4 4" /></Svg>,
  book: (p) => <Svg {...p}><path d="M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2Z" /><path d="M8 7h6" /></Svg>,
  bell: (p) => <Svg {...p}><path d="M6 9a6 6 0 0 1 12 0c0 6 2 7 2 7H4s2-1 2-7ZM10 20a2 2 0 0 0 4 0" /></Svg>,
  clock: (p) => <Svg {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 3.5v8.5h8.5" /></Svg>,
  flower: ({ s = 24, c = '#33b5e5' }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill={c} aria-hidden="true">
      <circle cx="12" cy="7.2" r="3.2" />
      <circle cx="16.56" cy="10.52" r="3.2" />
      <circle cx="14.82" cy="15.88" r="3.2" />
      <circle cx="9.18" cy="15.88" r="3.2" />
      <circle cx="7.44" cy="10.52" r="3.2" />
      <circle cx="12" cy="12" r="1.8" fill="#fff" />
    </svg>
  ),
};

// ---------- Khối dùng chung ----------
export function MenuCard({ icon, tone = 'blue', title, sub, onClick }) {
  return (
    <button className="p-menu" onClick={onClick}>
      <span className={`ic ${tone}`}>{icon}</span>
      <span className="tx"><b>{title}</b><small>{sub}</small></span>
      <IconChevronRight size={20} className="chev" />
    </button>
  );
}
// Màn kết quả: biểu tượng tròn + tiêu đề + mô tả + nút (Figma: PH-xx "Đóng")
export function Result({ type = 'warn', title, text, btn = 'Đóng', onBtn, extra, footer = true }) {
  const icon = type === 'ok'
    ? <span className="r-ic ok"><svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#6db33f" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="m6 12 4 4 8-8" /></svg></span>
    : type === 'warn' ? <span className="r-ic warn">!</span>
      : <span className="r-ic soft">{type}</span>;
  return (
    <div className="p-result">
      <div className="card">
        {icon}
        <b>{title}</b>
        {text && <p>{text}</p>}
        {extra}
        {btn && <Button block onClick={onBtn}>{btn}</Button>}
      </div>
      {footer && <div className="brandfoot">LỚP VẼ NGÔI NHÀ NHỎ</div>}
    </div>
  );
}
const sysText = 'Hiện tại đang có sự cố, ba mẹ đợi Ngôi Nhà Nhỏ một xíu nhé!';

// Chọn học viên (Figma: ô "Học viên" + mũi tên). Trả về {kids, kid, picker, err}
function useKids() {
  const [kids, setKids] = useState(null); const [err, setErr] = useState(null);
  const [id, setId] = useState(() => {
    const s = sessionStorage.getItem('nnn_kid');
    return s ? Number(s) : null;
  });
  useEffect(() => { parent.kids().then(setKids).catch((e) => setErr(e.message || MSG_SYS_PARENT)); }, []);
  const kid = (kids || []).find((k) => Number(k.id) === Number(id)) || (kids || [])[0];
  const pick = (v) => {
    const num = Number(v);
    setId(num);
    sessionStorage.setItem('nnn_kid', String(num));
  };
  const picker = kid && (
    <label className="p-kid">
      <span className="lb">Học viên</span>
      {kids.length > 1
        ? <><select value={kid.id} onChange={(e) => pick(e.target.value)} aria-label="Chọn học viên">{kids.map((k) => <option key={k.id} value={k.id}>{k.fullName}</option>)}</select><IconChevronDown size={18} className="cv" /></>
        : <><span className="vl">{kid.fullName}</span><IconChevronDown size={18} className="cv" /></>}
    </label>
  );
  return { kids, kid, picker, err };
}

// ======================= TRANG CHỦ (PH-05) =======================
export function ParentHome() {
  const nav = useNavigate(); const { kids } = useKids();
  const k = kids?.[0];
  return (
    <div className="m-body">
      <div className="p-h1">Trang chủ</div>
      <div className="p-h1sub">Chào mừng ba mẹ đến với Ngôi Nhà Nhỏ!</div>
      <div className="p-linked">
        <small>HỌC VIÊN ĐÃ LIÊN KẾT</small>
        <b>{k ? kids.map((x) => x.fullName).join(', ') : 'Chưa liên kết học viên'}</b>
        <span>{k ? 'Theo dõi việc học của bé' : 'Ba mẹ vui lòng liên hệ Trợ lý để liên kết hồ sơ'}</span>
      </div>
      <div className="p-grid">
        <button onClick={() => nav(`${P}/hoc-thu`)}><span className="ic blue"><Ico.flower s={24} /></span><b>Học thử</b><small>Đăng ký, lịch học và kết quả</small></button>
        <button onClick={() => nav(`${P}/xin-nghi`)}><span className="ic orange"><Ico.clock s={22} /></span><b>Xin nghỉ</b><small>Xin nghỉ và đăng ký học bù</small></button>
        <button onClick={() => nav(`${P}/lich-hoc`)}><span className="ic green"><Ico.cal s={22} /></span><b>Lịch học</b><small>Thời khóa biểu và nhật ký học tập</small></button>
        <button onClick={() => nav(`${P}/thong-bao`)}><span className="ic purple"><Ico.bell s={22} /></span><b>Thông báo</b><small>Thông tin và cập nhật từ lớp vẽ</small></button>
      </div>
    </div>
  );
}

// ======================= HỌC THỬ (UC 2) =======================
export function TrialMenu() {
  const nav = useNavigate();
  return (
    <div className="m-body">
      <MTitle title="Học thử" onBack={() => nav(`${P}/trang-chu`)} sub="Chọn chức năng học thử cần sử dụng" />
      <MenuCard icon={<Ico.palette />} title="Đăng ký học thử" sub="Tạo đơn đăng ký cho bé" onClick={() => nav(`${P}/hoc-thu/dang-ky`)} />
      <MenuCard icon={<Ico.cal />} tone="orange" title="Xem lịch học thử" sub="Tra cứu lịch đã được xếp" onClick={() => nav(`${P}/hoc-thu/lich`)} />
      <MenuCard icon={<Ico.check />} tone="green" title="Xem kết quả học thử" sub="Theo dõi kết quả và tư vấn" onClick={() => nav(`${P}/hoc-thu/ket-qua`)} />
    </div>
  );
}

// Khung giờ mong muốn (Figma PH-07: 1 ô chọn) = đúng lịch học của trung tâm (lib/schedule.js)
const WISHES = SCHED_CHOICES.map((o) => ({ days: o.days, slot: `${o.start} - ${o.end}` }))
.map((w) => ({ ...w, label: `${w.days.map(weekdayLabel).join(' - ')}, ${w.slot}` }));

// UC 2.1 – dùng cho cả trang công khai (/dang-ky-hoc-thu) và trong app
export function TrialRegister() {
  const { user } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const isParent = user?.role === 'parent';
  const inParentLayout = loc.pathname.startsWith('/phu-huynh');
  const [kids, setKids] = useState([{ name: '', dob: '' }]);
  const [phone, setPhone] = useState(isParent ? (user?.phone || '') : '');
  const [wish, setWish] = useState('');
  const [errs, setErrs] = useState({ f: {}, k: [] });
  const [bad, setBad] = useState(false);
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const upd = (i, k, v) => setKids(kids.map((c, j) => (j === i ? { ...c, [k]: v } : c)));
  const back = () => nav(inParentLayout ? `${P}/hoc-thu` : isParent ? `${P}/trang-chu` : -1);
  const submit = async () => {
    const ce = kids.map((c) => validateChild(c.name, c.dob)); const fe = {};
    if (!/^0\d{9}$/.test(phone)) fe.phone = 'Số điện thoại gồm đúng 10 chữ số và bắt đầu bằng số 0';
    if (!wish) fe.wish = 'Vui lòng chọn khung giờ mong muốn';
    setErrs({ f: fe, k: ce });
    if (Object.keys(fe).length || ce.some((x) => Object.keys(x).length)) { setBad(true); return; }
    setBad(false); setBusy(true);
    const w = WISHES[Number(wish)];
    try { await trialsApi.register({ children: kids, parentPhone: phone, wishDays: w.days, wishSlot: w.slot }); setRes('ok'); }
    catch (e) { if (e.fields || e.children) { setErrs({ f: e.fields || {}, k: e.children || [] }); setBad(true); } else setRes('fail'); }
    finally { setBusy(false); }
  };
  const wrap = (c) => (inParentLayout ? c : <div className="m-root"><div className="m-app">{c}</div></div>);
  if (res === 'ok') return wrap(<div className="m-body"><MTitle title="Đăng ký học thử" onBack={back} /><Result type="ok" title="Đăng ký học thử thành công!" text={inParentLayout ? 'Trợ lý sẽ liên hệ và đề xuất ca học thử phù hợp cho bé.' : 'Trợ lý sẽ liên hệ ba mẹ qua Zalo để hỗ trợ tài khoản và đề xuất ca học thử phù hợp.'} onBtn={back} /></div>);
  if (res === 'fail') return wrap(<div className="m-body"><MTitle title="Đăng ký học thử" onBack={back} /><Result type="warn" title="Không thể đăng ký học thử" text={sysText} onBtn={() => setRes(null)} /></div>);
  return wrap(
    <div className="m-body">
      <MTitle title="Đăng ký học thử" onBack={back} />
      <div className="p-form">
        {bad && <div className="p-errbar">Thông tin đăng ký không hợp lệ. Vui lòng kiểm tra lại!</div>}
        {kids.map((c, i) => (
          <div key={i} className="p-sec">
            <div className="h">{i === 0 ? 'Thông tin học viên' : 'Thông tin học viên thứ hai'}{i > 0 && <button className="link-btn" onClick={() => setKids(kids.filter((_, j) => j !== i))}>Xóa</button>}</div>
            <Field label="Họ và tên học viên" required error={errs.k[i]?.name}><Input value={c.name} onChange={(e) => upd(i, 'name', e.target.value)} placeholder="Nhập họ và tên" /></Field>
            <Field label="Ngày sinh" required error={errs.k[i]?.dob}><Input type="date" value={c.dob} max={todayISO()} onChange={(e) => upd(i, 'dob', e.target.value)} /></Field>
          </div>
        ))}
        <div className="p-sec">
          <div className="h">Thông tin phụ huynh</div>
          <Field label="Số điện thoại phụ huynh" required error={errs.f.phone || errs.f.parentPhone}><Input value={phone} readOnly={isParent && inParentLayout} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} inputMode="numeric" maxLength={10} placeholder="Nhập số điện thoại" /></Field>
          <Field label="Khung giờ mong muốn" required error={errs.f.wish} hint="Đây là nguyện vọng, lịch chính thức do Lớp vẽ sắp xếp"><Select value={wish} onChange={(e) => setWish(e.target.value)} placeholder="Chọn khung giờ" options={WISHES.map((w, i) => ({ value: String(i), label: w.label }))} /></Field>
        </div>
        {kids.length < 2 && <Button variant="outline" block onClick={() => setKids([...kids, { name: '', dob: '' }])}>+ Thêm bé thứ hai</Button>}
        <Button block onClick={submit} disabled={busy}>Đăng ký</Button>
      </div>
    </div>
  );
}

const STATUS_CLS = { 'Chờ phụ huynh xác nhận': 'warn', 'Chờ tiếp nhận': 'warn', 'Đã tiếp nhận': 'info', 'Chờ duyệt ca học thử': 'warn', 'Đã xếp ca': 'ok', 'Đã hoàn thành': 'ok', 'Đã tư vấn': 'ok' };
const sessRows = (i) => [['Ngày học', `${weekdayLabel(i.weekday)}, ${dmy(i.date)}`], ['Ca học', `${i.start} – ${i.end}`], ['Giáo viên', i.teacher]];

// UC 2.2 – Xem lịch học thử
export function TrialSchedule() {
  const nav = useNavigate(); const [list, setList] = useState(null); const [err, setErr] = useState(null);
  const [cur, setCur] = useState(null); const [res, setRes] = useState(null); const [busy, setBusy] = useState(false);
  const load = () => trialsApi.mine().then(setList).catch(() => setErr(true));
  useEffect(() => { load(); }, []);
  const back = () => nav(`${P}/hoc-thu`);
  if (err) return <div className="m-body"><MTitle title="Lịch học thử" onBack={back} /><Result title="Không thể tải lịch học thử" text={sysText} onBtn={back} /></div>;
  if (res === 'ok') return <div className="m-body"><MTitle title="Chi tiết lịch học thử" onBack={() => { setRes(null); setCur(null); }} /><Result type="ok" title="Xác nhận lịch học thử thành công!" onBtn={() => { setRes(null); setCur(null); load(); }} /></div>;
  if (res) return <div className="m-body"><MTitle title="Chi tiết lịch học thử" onBack={() => setRes(null)} /><Result title="Không thể xác nhận lịch học thử" text={res} onBtn={() => setRes(null)} /></div>;
  if (cur) {
    const confirm = async () => { setBusy(true); try { await trialsApi.confirm(cur.id); setRes('ok'); } catch (e) { setRes(e.message === 'Đơn này không còn ở trạng thái chờ xác nhận' ? e.message : sysText); } finally { setBusy(false); } };
    return (
      <div className="m-body">
        <MTitle title="Chi tiết lịch học thử" onBack={() => setCur(null)} />
        <div className="p-card">
          <div className="p-row-h"><b>{cur.studentName}</b><span className={`p-pill ${STATUS_CLS[cur.status] || 'info'}`}>{cur.status}</span></div>
          {cur.sessionInfo ? <div className="p-kv">{sessRows(cur.sessionInfo).map(([k, v]) => <div key={k}><span>{k}</span><b>{v}</b></div>)}</div>
            : <div className="p-kv"><div><span>Ca học</span><span className="p-pill warn wide">Chờ xếp ca</span></div></div>}
          <div className="p-note">{cur.status === 'Chờ phụ huynh xác nhận' ? 'Ca học do Trợ lý đề xuất. Lịch chỉ được chốt sau khi Quản lý phê duyệt.' : cur.sessionInfo ? 'Lịch học thử của bé đã được ghi nhận.' : 'Trợ lý sẽ cập nhật ca học khi đã xếp lịch.'}</div>
          {cur.status === 'Chờ phụ huynh xác nhận' && <Button block onClick={confirm} disabled={busy}>Xác nhận lịch</Button>}
        </div>
      </div>
    );
  }
  return (
    <div className="m-body">
      <MTitle title="Lịch học thử" onBack={back} sub={list?.length ? 'Chạm vào đơn để xem chi tiết' : undefined} />
      {list && !list.length ? <Result title="Bạn chưa có đơn đăng ký học thử nào" onBtn={back} footer={false} /> : (list || []).map((t) => (
        <button key={t.id} className="p-card tapcard" onClick={() => setCur(t)}>
          <div className="p-row-h"><b>{t.studentName}</b><span className={`p-pill ${STATUS_CLS[t.status] || 'info'}`}>{t.status}</span></div>
          {t.sessionInfo ? <div className="p-kv sm">{sessRows(t.sessionInfo).map(([k, v]) => <div key={k}><span>{k}</span><b>{v}</b></div>)}</div> : <div className="p-pill warn wide block">Chờ xếp ca</div>}
        </button>
      ))}
    </div>
  );
}

// UC 2.3 – Xem kết quả học thử
export function TrialResult() {
  const nav = useNavigate(); const [list, setList] = useState(null); const [err, setErr] = useState(null); const [cur, setCur] = useState(null);
  useEffect(() => { trialsApi.completed().then((l) => { setList(l); if (l.length === 1) setCur(l[0]); }).catch(() => setErr(true)); }, []);
  const back = () => nav(`${P}/hoc-thu`);
  const title = 'Kết quả học thử';
  if (err) return <div className="m-body"><MTitle title={title} onBack={back} /><Result title="Không thể tải kết quả học thử" text={sysText} onBtn={back} /></div>;
  if (cur && !cur.result) return <div className="m-body"><MTitle title={title} onBack={() => (list.length > 1 ? setCur(null) : back())} /><Result title="Kết quả chưa được cập nhật. Vui lòng quay lại sau" onBtn={() => (list.length > 1 ? setCur(null) : back())} /></div>;
  if (cur) {
    const a = cur.result.assessment || {};
    return (
      <div className="m-body">
        <MTitle title={title} onBack={() => (list.length > 1 ? setCur(null) : back())} />
        <div className="p-card">
          <b className="p-name">{cur.studentName}</b><div className="p-date">Buổi học thử: {dmy(cur.session.date)}</div>
          <hr />
          <div className="p-h3">Đánh giá năng lực</div>
          <div className="p-kv"><div><span>Nét vẽ</span><b>{a.stroke}</b></div><div><span>Màu sắc</span><b>{a.color}</b></div><div><span>Khả năng tiếp thu</span><b>{a.absorb}</b></div></div>
          <hr />
          <div className="p-h3">Lộ trình đề xuất</div><p className="p-text">{cur.result.roadmap}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="m-body">
      <MTitle title={title} onBack={back} sub={list?.length ? 'Chạm vào buổi học thử để xem kết quả.' : undefined} />
      {list && !list.length ? <Result title="Chưa có kết quả học thử" onBtn={back} footer={false} /> : (list || []).map((t) => (
        <button key={t.id} className="p-card tapcard row" onClick={() => setCur(t)}>
          <span><b>{t.studentName}</b><small>Buổi học thử: {dmy(t.session.date)}</small></span><span className={`p-pill ${t.status === 'Đã tư vấn' ? 'ok' : 'ok2'}`}>{t.status}</span><IconChevronRight size={18} />
        </button>
      ))}
    </div>
  );
}

// ======================= XIN NGHỈ (UC 3) =======================
export function LeaveMenu() {
  const nav = useNavigate();
  return (
    <div className="m-body">
      <MTitle title="Xin nghỉ" onBack={() => nav(`${P}/trang-chu`)} sub="Chọn chức năng nghỉ học cần sử dụng" />
      <MenuCard icon={<Ico.doc />} tone="orange" title="Gửi yêu cầu xin nghỉ học" sub="Báo nghỉ cho buổi học sắp tới" onClick={() => nav(`${P}/xin-nghi/gui`)} />
      <MenuCard icon={<Ico.calAdd />} tone="green" title="Đăng ký ca học bù" sub="Chọn ca học bù phù hợp cho bé" onClick={() => nav(`${P}/xin-nghi/dang-ky-bu`)} />
      <MenuCard icon={<Ico.calX />} tone="red" title="Huỷ yêu cầu học bù" sub="Quản lý và huỷ đăng ký nếu cần" onClick={() => nav(`${P}/xin-nghi/huy-bu`)} />
    </div>
  );
}
const Radio = ({ on }) => <span className={`p-radio ${on ? 'on' : ''}`} />;

// 3.1 Gửi yêu cầu xin nghỉ học
export function LeaveSend() {
  const nav = useNavigate(); const back = () => nav(`${P}/xin-nghi`); const T = 'Gửi yêu cầu xin nghỉ';
  const { kids, kid, picker, err } = useKids();
  const [rows, setRows] = useState(null); const [key, setKey] = useState(null); const [reason, setReason] = useState('');
  const [res, setRes] = useState(null); const [busy, setBusy] = useState(false);
  useEffect(() => { if (kid) { setRows(null); setKey(null); parent.upcoming(kid.id).then((r) => setRows(r.slice(0, 4))).catch(() => setRes({ t: 'warn', title: 'Không thể gửi yêu cầu xin nghỉ', text: sysText })); } }, [kid?.id]);
  const send = async () => {
    if (!key) return; setBusy(true);
    try { await parent.leave(kid.id, key, reason); setRes({ t: 'ok', title: 'Gửi yêu cầu xin nghỉ thành công!' }); }
    catch (e) { setRes({ t: 'warn', title: e.status === 500 ? 'Không thể gửi yêu cầu xin nghỉ' : e.message, text: e.status === 500 ? sysText : '' }); }
    finally { setBusy(false); }
  };
  if (err) return <div className="m-body"><MTitle title={T} onBack={back} /><Result title="Không thể gửi yêu cầu xin nghỉ" text={sysText} onBtn={back} /></div>;
  if (kids && !kids.length) return <div className="m-body"><MTitle title={T} onBack={back} /><Result title="Tài khoản chưa liên kết" text="Tài khoản chưa được liên kết với hồ sơ học viên. Vui lòng liên hệ Trợ lý để hỗ trợ" onBtn={back} /></div>;
  if (res) return <div className="m-body"><MTitle title={T} onBack={back} /><Result type={res.t} title={res.title} text={res.text} onBtn={back} /></div>;
  return (
    <div className="m-body">
      <MTitle title={T} onBack={back} sub="Chọn buổi học sắp tới của bé" />
      {picker}
      {rows && !rows.length ? <Result type={<Ico.cal s={34} c="#33b5e5" />} title="Bé không có buổi học sắp tới" text="Học viên hiện không có buổi học nào sắp tới để gửi đơn xin nghỉ" btn={null} footer={false} /> : (<>
        <div className="p-h3">Chọn buổi học chưa diễn ra</div>
        <div className="p-choices">
          {rows === null ? (
            <div style={{ padding: '16px', textAlign: 'center', color: '#6b7c88', fontSize: '13px' }}>
              Đang tải danh sách buổi học sắp tới...
            </div>
          ) : (
            rows.map((r) => (
              <button key={r.key} className={`p-choice ${key === r.key ? 'on' : ''}`} onClick={() => setKey(r.key)}>
                <Radio on={key === r.key} />
                <span><b>{wdLong(r.weekday)} - {dmy(r.date)}</b><small>{r.start}-{r.end} - {r.name.replace(/^.* - /, '')}</small></span>
              </button>
            ))
          )}
        </div>
        <div className="p-h3">Lý do nghỉ</div>
        <textarea className="textarea p-ta" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ba mẹ có thể để trống phần này..." />
        <div className="p-bottom"><Button block disabled={!key || busy} onClick={send}>Gửi yêu cầu xin nghỉ</Button><button className="p-link" onClick={back}>Hủy</button></div>
      </>)}
    </div>
  );
}

// 3.2 Đăng ký ca học bù
export function MakeupRegister() {
  const nav = useNavigate(); const back = () => nav(`${P}/xin-nghi`); const T = 'Đăng ký ca học bù';
  const { kids, kid, picker, err } = useKids();
  const [abs, setAbs] = useState(null); const [aid, setAid] = useState(null); const [opts, setOpts] = useState(null); const [key, setKey] = useState(null);
  const [full, setFull] = useState(null); const [res, setRes] = useState(null); const [busy, setBusy] = useState(false);
  useEffect(() => { if (kid) { setAbs(null); setAid(null); parent.absences(kid.id, ['Chờ xếp lịch bù', 'Hết hạn']).then((r) => { const now = r.filter((a) => a.status === 'Chờ xếp lịch bù' || (a.status === 'Hết hạn' && a.daysLeft > -7)); setAbs(now); if (now[0]) setAid(now[0].id); }).catch(() => setRes({ t: 'warn', title: 'Không thể đăng ký ca học bù', text: sysText })); } }, [kid?.id]);
  const cur = (abs || []).find((a) => a.id === aid);
  useEffect(() => { setOpts(null); setKey(null); setFull(null); if (cur && cur.status === 'Chờ xếp lịch bù') parent.makeupOptions(cur.id).then(setOpts).catch(() => setRes({ t: 'warn', title: 'Không thể đăng ký ca học bù', text: sysText })); }, [aid]);
  const send = async () => {
    if (!key) return; setBusy(true); setFull(null);
    try { await parent.registerMakeup(cur.id, key); setRes({ t: 'ok', title: 'Đăng ký học bù thành công! Vui lòng chờ xác nhận.' }); }
    catch (e) {
      if (/vừa hết chỗ/.test(e.message)) { setFull(key); parent.makeupOptions(cur.id).then((o) => setOpts(o)); }
      else setRes({ t: 'warn', title: e.status === 500 ? 'Không thể đăng ký ca học bù' : e.message, text: e.status === 500 ? sysText : '' });
    } finally { setBusy(false); }
  };
  if (err) return <div className="m-body"><MTitle title={T} onBack={back} /><Result title="Không thể đăng ký ca học bù" text={sysText} onBtn={back} /></div>;
  if (kids && !kids.length) return <div className="m-body"><MTitle title={T} onBack={back} /><Result title="Tài khoản chưa liên kết" text={NOT_LINKED} onBtn={back} /></div>;
  if (res) return <div className="m-body"><MTitle title={T} onBack={back} /><Result type={res.t} title={res.title} text={res.text} onBtn={back} /></div>;
  return (
    <div className="m-body">
      <MTitle title={T} onBack={back} />
      {picker}
      {abs && !abs.length ? <Result type={<Ico.clock s={34} c="#33b5e5" />} title="Chưa có buổi cần học bù" text="Học viên hiện không có buổi nghỉ nào cần học bù" btn={null} footer={false} /> : cur && (<>
        <div className="p-h3">Buổi nghỉ cần học bù</div>
        {abs.length > 1 && <select className="select" value={aid} onChange={(e) => setAid(e.target.value)} aria-label="Chọn buổi nghỉ">{abs.map((a) => <option key={a.id} value={a.id}>{dmy(a.session.date)} - {a.session.start}</option>)}</select>}
        <div className="p-card">
          <b>{cur.status === 'Hết hạn' ? `Buổi nghỉ: ${dmy(cur.session.date)}` : `${dmy(cur.session.date)} - ${cur.session.start}-${cur.session.end}`}</b>
          <small className="p-muted">{cur.status === 'Hết hạn' ? `Hạn học bù: ${dmy(cur.deadline)}` : `Chương trình: ${cur.student.program}`}</small>
          <div style={{ marginTop: 8 }}><span className={`p-pill ${cur.status === 'Hết hạn' ? 'bad' : 'warn'}`}>{cur.status}</span></div>
        </div>
        {cur.status === 'Hết hạn' ? (<>
          <Result type={<Ico.clock s={34} c="#f08a94" />} title="Yêu cầu đã quá hạn" text="Yêu cầu học bù này đã quá thời hạn học bù nên không thể đăng ký" btn={null} footer={false} extra={<div className="p-redtxt">Không thể tiếp tục đăng ký</div>} />
          <Button block onClick={back}>Quay lại</Button>
        </>) : opts && !opts.length ? (<>
          <Result type={<Ico.cal s={34} c="#33b5e5" />} title="Chưa có ca học bù phù hợp" text="Hiện chưa có ca học bù phù hợp. Trợ lý sẽ liên hệ ba mẹ để sắp xếp" btn={null} footer={false} />
          <Button block onClick={back}>Quay lại</Button>
        </>) : (<>
          <div className="p-h3">Chọn ca học bù khả dụng</div>
          <div className="p-choices">
            {opts === null ? (
              <div style={{ padding: '16px', textAlign: 'center', color: '#6b7c88', fontSize: '13px' }}>
                Đang tìm kiếm ca học bù khả dụng...
              </div>
            ) : (
              opts.slice(0, 6).map((o) => (
                <button key={o.key} className={`p-choice ${key === o.key ? 'on' : ''} ${full === o.key ? 'full' : ''}`} onClick={() => setKey(o.key)}>
                  <Radio on={key === o.key} />
                  <span><b>{wdLong(o.weekday)} - {dmy(o.date)}</b><small>{o.start}-{o.end} - {o.name.replace(/^.* - /, '')}</small><em>Còn chỗ - Cùng trình độ</em></span>
                </button>
              ))
            )}
          </div>
          {full ? <div className="p-redbox"><b>Ca học này vừa hết chỗ.</b><span>Ba mẹ vui lòng chọn ca khác</span></div>
            : <div className="p-infobox"><b>Hạn học bù: {dmy(cur.deadline)}</b><span>Đăng ký được giữ chỗ, chưa chốt lịch<br />Lịch chỉ chính thức sau khi Quản lý duyệt</span></div>}
          <div className="p-bottom"><Button block disabled={!key || busy} onClick={send}>Gửi đăng ký</Button><button className="p-link" onClick={back}>Hủy</button></div>
        </>)}
      </>)}
    </div>
  );
}

// 3.3 Huỷ yêu cầu học bù
export function MakeupCancel() {
  const nav = useNavigate(); const back = () => nav(`${P}/xin-nghi`); const T = 'Hủy yêu cầu học bù';
  const { kids, kid, picker, err } = useKids();
  const [list, setList] = useState(null); const [aid, setAid] = useState(null); const [res, setRes] = useState(null); const [busy, setBusy] = useState(false);
  useEffect(() => { if (kid) { setList(null); parent.absences(kid.id, ['Đã đăng ký học bù', 'Chờ duyệt', 'Đã xếp lịch bù']).then((r) => { const l = r.filter((a) => a.makeupInfo && !a.makeupInfo.started); setList(l); setAid(l[0]?.id || null); }).catch(() => setRes({ t: 'warn', title: 'Có sự cố xảy ra', text: sysText })); } }, [kid?.id]);
  const cur = (list || []).find((a) => a.id === aid);
  const go = async () => {
    setBusy(true);
    try { await parent.cancelMakeup(cur.id); setRes({ t: 'ok', title: 'Hủy học bù thành công!', text: 'Ba mẹ có thể đăng ký ca học bù khác trong hạn học bù' }); }
    catch (e) {
      const m = e.message;
      if (e.status === 500) setRes({ t: 'warn', title: 'Có sự cố xảy ra', text: sysText });
      else if (/quá thời hạn/.test(m)) setRes({ t: 'warn', title: 'Yêu cầu đã hết hạn', text: m });
      else if (/đã diễn ra/.test(m)) setRes({ t: 'warn', title: 'Không thể hủy ca học bù', text: m });
      else setRes({ t: 'warn', title: 'Không có ca học bù để hủy', text: m });
    } finally { setBusy(false); }
  };
  if (err) return <div className="m-body"><MTitle title={T} onBack={back} /><Result title="Có sự cố xảy ra" text={sysText} onBtn={back} /></div>;
  if (kids && !kids.length) return <div className="m-body"><MTitle title={T} onBack={back} /><Result title="Chưa liên kết học viên" text="Tài khoản chưa được liên kết với hồ sơ học viên. Vui lòng liên hệ Trợ lý để hỗ trợ" onBtn={back} /></div>;
  if (res) return <div className="m-body"><MTitle title={T} onBack={back} /><Result type={res.t} title={res.title} text={res.text} onBtn={back} /></div>;
  if (list && !list.length) return <div className="m-body"><MTitle title={T} onBack={back} />{picker}<Result title="Không có ca học bù để hủy" text="Học viên hiện không có ca học bù nào có thể hủy" onBtn={back} footer={false} /></div>;
  return (
    <div className="m-body">
      <MTitle title={T} onBack={back} />
      {picker}
      {cur && (<>
        <div className="p-h3">Yêu cầu có ca học bù được phép hủy</div>
        <div className="p-choices">{list.map((a) => (
          <button key={a.id} className={`p-choice ${aid === a.id ? 'on' : ''}`} onClick={() => setAid(a.id)}><Radio on={aid === a.id} /><span><b>{a.makeupInfo.code} - Buổi học bù {fmtShort(a.makeupInfo.date)}</b><small>{a.makeupInfo.start}-{a.makeupInfo.end} - {a.makeupInfo.name.replace(/^.* - /, '')}</small><span className={`p-pill ${a.status === 'Đã xếp lịch bù' ? 'ok' : 'warn'}`}>{a.status}</span></span></button>
        ))}</div>
        <div className="p-h3">Thông tin cần xác nhận hủy</div>
        <div className="p-card p-kv col">
          <div><span>Buổi học đã xin nghỉ</span><b>{dmy(cur.session.date)}</b></div>
          <div><span>Ca học bù đã đăng ký</span><b>{dmy(cur.makeupInfo.date)} - {cur.makeupInfo.start}</b></div>
          <div><span>Hạn học bù</span><b>{dmy(cur.deadline)}</b></div>
        </div>
        <div className="p-bottom"><Button block variant="danger" onClick={go} disabled={busy}>Xác nhận hủy</Button><button className="p-link" onClick={back}>Giữ lại</button></div>
      </>)}
    </div>
  );
}

// ======================= LỊCH HỌC (UC 4) =======================
export function ScheduleMenu() {
  const nav = useNavigate();
  return (
    <div className="m-body">
      <MTitle title="Lịch học" onBack={() => nav(`${P}/trang-chu`)} sub="Chọn chức năng theo dõi lịch học của bé" />
      <MenuCard icon={<Ico.cal />} title="Tra cứu thời khoá biểu" sub="Xem lịch học theo tuần của bé" onClick={() => nav(`${P}/lich-hoc/tkb`)} />
      <MenuCard icon={<Ico.book />} tone="orange" title="Xem nhật ký học tập" sub="Theo dõi ảnh bài vẽ và nhận xét" onClick={() => nav(`${P}/lich-hoc/nhat-ky`)} />
      <MenuCard icon={<Ico.bell />} tone="purple" title="Xem thông báo" sub="Nhận thông tin mới từ lớp vẽ" onClick={() => nav(`${P}/thong-bao`)} />
    </div>
  );
}

// 4.1 Tra cứu thời khoá biểu
export function Timetable() {
  const nav = useNavigate(); const back = () => nav(`${P}/lich-hoc`); const T = 'Tra cứu thời khóa biểu';
  const { kids, kid, picker, err } = useKids();
  const [from, setFrom] = useState(startOfWeek(todayISO())); const [d, setD] = useState(null); const [fail, setFail] = useState(false);
  useEffect(() => { if (kid) { setD(null); parent.timetable(kid.id, from).then(setD).catch(() => setFail(true)); } }, [kid?.id, from]);
  if (err || fail) return <div className="m-body"><MTitle title={T} onBack={back} /><Result title="Không thể tải thời khóa biểu" text={sysText} onBtn={back} /></div>;
  if (kids && !kids.length) return <div className="m-body"><MTitle title={T} onBack={back} /><Result title="Tài khoản chưa liên kết" text={NOT_LINKED} onBtn={back} /></div>;
  const curWeek = from === startOfWeek(todayISO());
  return (
    <div className="m-body">
      <MTitle title={T} onBack={back} sub={curWeek ? 'Lịch học theo tuần' : `Tuần ${fmtShort(from)} - ${dmy(addDays(from, 6))}`} />
      {picker}
      <div className="p-week"><button onClick={() => setFrom(addDays(from, -7))} aria-label="Tuần trước">‹</button><div><b>{fmtShort(from)} - {dmy(addDays(from, 6))}</b><small>{curWeek ? 'Tuần hiện tại' : 'Tuần đã chọn'}</small></div><button onClick={() => setFrom(addDays(from, 7))} aria-label="Tuần sau">›</button></div>
      {d && !d.items.length ? <Result type={<Ico.cal s={34} c="#33b5e5" />} title="Chưa có lịch học" text="Bé chưa có lịch học trong thời gian này. Vui lòng chọn tuần khác hoặc liên hệ Trợ lý để được hỗ trợ thêm." btn="Đóng" onBtn={() => setFrom(startOfWeek(todayISO()))} footer={false} /> : d && (<>
        <div className="p-count"><small>Số buổi còn lại trong tháng</small><b>{d.remaining} buổi</b></div>
        {d.items.map((s) => (
          <div key={s.key + s.tag} className={`p-slot ${s.tag === 'Học bù' ? 'bu' : ''} ${s.tag.startsWith('Đã xin nghỉ') ? 'off' : ''}`}>
            <div className="day">{weekdayLabel(s.weekday)}<small>{fmtShort(s.date)}</small></div>
            <div className="inf"><b><Ico.clock s={13} /> {s.start} - {s.end}</b><span>{s.name}</span><span>GV. {s.teacher.replace(/^(Cô|Thầy) /, '')}</span>{s.tag && <em>{s.tag}</em>}</div>
          </div>
        ))}
      </>)}
    </div>
  );
}

export const ART_TITLES = {
  'art1.svg': 'Ngôi nhà bên sườn đồi',
  'art2.svg': 'Chú mèo lười bên cửa sổ',
  'art3.svg': 'Đại dương xanh và đàn cá nhỏ',
  'art4.svg': 'Mặt trời rực rỡ và đồi cỏ xanh',
  'art5.svg': 'Lọ hoa mùa xuân khoe sắc',
  'art6.svg': 'Tàu vũ trụ khám phá ngân hà',
  'art7.svg': 'Khinh khí cầu qua đồi núi',
  'art8.svg': 'Chú gấu trúc tinh nghịch',
  'art9.svg': 'Thuyền buồm lướt sóng ra khơi',
  'art10.svg': 'Chú hươu cao cổ trên thảo nguyên',
  'art11.svg': 'Cầu vồng rực rỡ sau mưa',
  'art12.svg': 'Đêm trăng rằm quê hương thanh bình',
  'art13.svg': 'Chú chim én đón mùa xuân',
  'art14.svg': 'Cối xay gió trên cánh đồng quê',
  'art15.svg': 'Tĩnh vật quả dâu tây ngọt ngào',
  'art16.svg': 'Chú khủng long vui vẻ',
  'art17.svg': 'Tĩnh vật bình hoa cúc rực rỡ',
  'art18.svg': 'Tĩnh vật đĩa trái cây tươi',
  'art19.svg': 'Cánh đồng lúa chín quê hương',
  'art20.svg': 'Hoàng hôn trên biển quê hương',
};

export function getLessonTitle(j) {
  if (j?.title) return j.title;
  if (j?.photo) {
    const fn = j.photo.split('/').pop().split('?')[0];
    if (ART_TITLES[fn]) return ART_TITLES[fn];
  }
  return j?.session?.name?.replace(/^(Cơ bản|Nâng cao) - /, '') || 'Bài vẽ của bé';
}

// 4.2 Xem nhật ký học tập (+ chi tiết)
export function Diary() {
  const nav = useNavigate(); const back = () => nav(`${P}/lich-hoc`); const T = 'Xem nhật ký học tập';
  const { kids, kid, picker, err } = useKids();
  const [rows, setRows] = useState(null); const [fail, setFail] = useState(false); const [open, setOpen] = useState(null);
  useEffect(() => { if (kid) { setRows(null); parent.diary(kid.id).then(setRows).catch(() => setFail(true)); } }, [kid?.id]);
  if (err || fail) return <div className="m-body"><MTitle title={T} onBack={back} /><Result title="Không thể tải nhật ký" text={sysText} onBtn={back} /></div>;
  if (kids && !kids.length) return <div className="m-body"><MTitle title={T} onBack={back} /><Result title="Tài khoản chưa liên kết" text={NOT_LINKED} onBtn={back} /></div>;
  if (open) {
    const c = open.comment;
    const lessonTitle = getLessonTitle(open);
    return (
      <div className="m-body">
        <MTitle title="Chi tiết nhật ký học tập" onBack={() => setOpen(null)} sub={`${kid.fullName} - Buổi học ${dmy(open.session.date)}`} />
        <div className="p-card hl">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span className="p-pill ok" style={{ fontSize: '0.78rem' }}>Chủ đề</span>
            <b className="p-h3" style={{ margin: 0, color: '#0d7fa8' }}>{lessonTitle}</b>
          </div>
          <small className="p-muted">Lớp {open.session.name} • {open.session.start} - {open.session.end}</small>
          {open.photo ? <img className="p-photo" src={open.photo} alt={lessonTitle} /> : <div className="p-photo empty">Giáo viên chưa đăng ảnh tác phẩm</div>}
        </div>
        <div className="p-card">
          <div className="p-h3" style={{ marginTop: 0 }}>Nhận xét của giáo viên</div>
          {c ? [['Nét vẽ', c.stroke], ['Màu sắc', c.color], ['Khả năng tiếp thu', c.absorb]].map(([k, v]) => <div key={k} className="p-cm"><span>{k}</span><p>{v}</p></div>) : <p className="p-muted">Giáo viên chưa nhập nhận xét</p>}
        </div>
      </div>
    );
  }
  return (
    <div className="m-body">
      <MTitle title={T} onBack={back} sub="Tác phẩm và nhận xét" />
      {picker}
      {rows && !rows.length ? <Result type={<Ico.bell s={34} c="#a9deef" />} title="Chưa có nội dung" text="Nhật ký học tập của bé chưa có nội dung" btn={null} footer={false} /> : (<>
        {rows && <div className="p-h3">Mới nhất</div>}
        {(rows || []).map((j) => {
          const lessonTitle = getLessonTitle(j);
          return (
            <button key={j.id} className="p-diary" onClick={() => setOpen(j)}>
              <span className="th">{j.photo ? <img src={j.photo} alt={lessonTitle} /> : <Ico.palette s={34} c="#ed986f" />}</span>
              <span className="tx">
                <small>{dmy(j.session.date)} • Lớp {j.session.name.replace(/^(Cơ bản|Nâng cao) - /, '')}</small>
                <b>{lessonTitle}</b>
                <span>{j.comment ? j.comment.stroke : 'Chưa có nhận xét'}</span>
                <em>Xem chi tiết</em>
              </span>
            </button>
          );
        })}
      </>)}
    </div>
  );
}

function notifTone(t = '') {
  const s = t.toLowerCase();
  if (s.includes('duyệt') || s.includes('hoàn thành')) return 'green';
  if (s.includes('xác nhận')) return 'yellow';
  if (s.includes('tiếp nhận')) return 'purple';
  return 'cyan';
}

// 4.3 Xem thông báo (+ chi tiết)
export function Notices() {
  const nav = useNavigate(); const { id } = useParams();
  const [rows, setRows] = useState(null); const [fail, setFail] = useState(false);
  const load = () => notifications.mine().then(setRows).catch(() => setFail(true));
  useEffect(() => { load(); }, []);
  const back = () => nav(`${P}/trang-chu`);
  if (fail) return <div className="m-body"><MTitle title="Xem thông báo" onBack={back} /><Result title="Không thể tải thông báo" text={sysText} onBtn={back} /></div>;
  if (!rows) return <div className="m-body"><MTitle title={id ? "Chi tiết thông báo" : "Xem thông báo"} onBack={id ? () => nav(`${P}/thong-bao`) : back} /><div style={{ textAlign: 'center', padding: '32px', color: '#6b7c88' }}>Đang tải...</div></div>;
  const cur = id && rows.find((n) => String(n.id) === String(id));
  if (cur) return (
    <div className="m-body">
      <MTitle title="Chi tiết thông báo" onBack={() => nav(`${P}/thong-bao`)} />
      <div className="p-card hl">
        <span className="p-okic">✓</span>
        <b className="p-h3" style={{ margin: '10px 0 2px' }}>{cur.title}</b>
        <small className="p-muted">{fmtDateTime(cur.createdAt)}</small>
        <hr />
        <p className="p-text">{cur.body}</p>
      </div>
    </div>
  );
  if (id && rows) return (
    <div className="m-body">
      <MTitle title="Chi tiết thông báo" onBack={() => nav(`${P}/thong-bao`)} />
      <Result title="Không tìm thấy thông báo" text="Thông báo này không tồn tại hoặc đã bị xóa" onBtn={() => nav(`${P}/thong-bao`)} />
    </div>
  );
  return (
    <div className="m-body">
      <MTitle title="Xem thông báo" onBack={back} />
      {rows && !rows.length ? <Result type={<Ico.bell s={34} c="#a9deef" />} title="Bạn chưa có thông báo nào" text="Bé chưa có lịch học trong thời gian này. Vui lòng chọn tuần khác hoặc liên hệ Trợ lý để được hỗ trợ thêm" onBtn={back} /> : (rows || []).map((n) => (
        <button key={n.id} className={`p-notif notif-${notifTone(n.title)} ${n.read ? '' : 'unread'}`} onClick={async () => { if (!n.read) { await notifications.markRead(n.id); } nav(`${P}/thong-bao/${n.id}`); load(); }}>
          <span className="bar-ind" />
          <span className="tx"><b>{n.title}</b><small>{fmtDateTime(n.createdAt)}</small><span className="bd">{n.body}</span></span>
          <IconChevronRight size={18} className="chev" />
        </button>
      ))}
    </div>
  );
}

// Giữ tên cũ cho các import khác
export const TrialHub = TrialMenu;
export const Leave = LeaveMenu;
export const Schedule = ScheduleMenu;
