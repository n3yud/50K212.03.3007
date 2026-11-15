import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../lib/hooks';
import { teacher } from '../../services/api';
import { Button } from '../../components/ui';
import { MTitle } from '../../components/MobileLayout';
import { IconChevronRight } from '../../components/icons';
import { addDays, fmtDate, startOfWeek, todayISO, weekdayOf } from '../../lib/dates';
import { clearDraft, enqueue, getDraft, queued, setDraft } from '../../lib/offline';
import { Ico, MenuCard, Result } from '../parent/Parent';

// ============================================================================
// Ứng dụng web mobile Giáo viên – bám theo Figma GV-01 … GV-44
// ============================================================================
const WD = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
const dayTitle = (d) => `${WD[weekdayOf(d)]} - ${fmtDate(d)}`;
const ddmm = (d) => `${d.slice(8)}/${d.slice(5, 7)}`;
const SYS = 'Hiện tại đang có sự cố, vui lòng thử lại sau';
const errText = (e) => (e?.status === 401 || e?.status === 403 || e?.message ? e.message : SYS);

const Svg = ({ size = 22, children, ...p }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>{children}</svg>;
const GI = {
  check: (p) => <Svg {...p}><path d="m5 12 4.5 4.5L19 7" /></Svg>,
  pic: (p) => <Svg {...p}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="m4 17 5-6 4 4 3-3 4 5" /><circle cx="15.5" cy="8.5" r="1.4" /></Svg>,
  pen: (p) => <Svg strokeWidth={2.2} {...p}><path d="M4.5 19.5 L15 9 a2.8 2.8 0 0 1 4 4 L11 19.5 Z" /></Svg>,
  arch: (p) => <Svg {...p}><path d="M4 19V11a8 8 0 0 1 16 0v8Z" /><path d="M4 15h16" /></Svg>,
  brush: (p) => <Svg {...p}><path d="M18 3 9.5 11.5" /><path d="M9.5 11.5c-2 0-3.5 1.5-3.5 3.5 0 1.5-1 2.5-2 3 3 1 7 0 7.5-3.5" /></Svg>,
  minus: (p) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M8 12h8" /></Svg>,
};

// Biểu tượng bút màu kèm chấm tròn nghệ thuật cho học viên học thử (Figma GV-40 / GV-41)
export const CrayonAvatar = ({ size = 52 }) => (
  <svg width={size} height={size} viewBox="0 0 52 52" fill="none" aria-hidden="true" style={{ flex: 'none' }}>
    <circle cx="26" cy="26" r="26" fill="#e2f4fb" />
    <circle cx="15.5" cy="18" r="3.2" fill="#fba859" />
    <circle cx="33.5" cy="14" r="2.8" fill="#99d363" />
    <circle cx="39.5" cy="28.5" r="2.8" fill="#4ebfe7" />
    <path
      d="M15 37 L17 29 L27 19 A 4.5 4.5 0 0 1 33 25 L23 35 Z"
      fill="#ffffff"
      stroke="#df7c39"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M24.5 21.5 L30.5 27.5"
      stroke="#df7c39"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
  </svg>
);

// Khung trang con có tiêu đề + nút quay lại
const Page = ({ title, sub, onBack, back = true, children }) => (
  <div className="m-body t-body"><MTitle title={title} back={back} onBack={onBack} />{sub && <div className="t-sub">{sub}</div>}{children}</div>
);
// Kết quả dạng thẻ (Figma: "Thông báo" + nút)
const Note = ({ title = 'Thông báo', text, btn = 'Đóng', onBtn, type = 'warn', extra }) => <Result type={type} title={title} text={text} btn={btn} onBtn={onBtn} extra={extra} footer={false} />;
const Pill = ({ tone = 'warn', children }) => <span className={`p-pill ${tone}`}>{children}</span>;
// Thẻ ca học nền xanh nhạt
const SessCard = ({ s, right, tag, onClick, children }) => {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag className={`t-sess ${onClick ? 'tap' : ''}`} onClick={onClick}>
      <span className="l"><b>Ca {s.start} - {s.end}</b><small>{s.name}</small>{tag}{children}</span>
      {right}
    </Tag>
  );
};
const doneTag = (s) => <em className="t-done">{s.date === todayISO() ? 'Đã diễn ra' : `${fmtDate(s.date)} - Đã diễn ra`}</em>;

// ============ Trang chủ (Figma Ngoi_Nha_Nho_GV_Trang_chu_Mobile) ============
export function TeacherHome() {
  const nav = useNavigate();
  const q = useApi(async () => {
    const [today, done] = await Promise.all([teacher.today(), teacher.doneSessions()]);
    const todayDone = done.filter((s) => s.date === todayISO());
    const pres = await Promise.all(todayDone.map((s) => teacher.presentStudents(s.key)));
    const studs = pres.flatMap((p) => p.students);
    return { today, unfinal: today.filter((s) => !s.finalized && s.started).length, photos: studs.filter((x) => !x.hasPhoto).length, comments: studs.filter((x) => !x.hasComment).length };
  }, []);
  const d = q.data;
  const next = d && (d.today.find((s) => !s.ended) || d.today[d.today.length - 1]);
  return (
    <div className="m-body t-body">
      <div><div className="t-h1">Trang chủ</div><div className="t-sub">Chào mừng cô đến với Ngôi Nhà Nhỏ!</div></div>
      {q.error ? <Note text={errText(q.error)} onBtn={q.reload} btn="Thử lại" /> : (<>
        <div className="t-next"><b>Ca học gần nhất</b>
          {!d ? <div className="t-nextin"><small>Đang tải…</small></div>
            : next ? (
              <button className="t-nextin" onClick={() => nav(`/giao-vien/diem-danh/${encodeURIComponent(next.key)}`)}>
                <b>Ca {next.start} - {next.end}</b><small>{next.name}</small>
                <span className="row"><Pill tone={next.finalized ? 'ok' : next.started ? 'warn' : 'orange'}>{next.finalized ? 'Đã chốt' : next.ended ? 'Đã diễn ra' : next.started ? 'Đang diễn ra' : 'Sắp bắt đầu'}</Pill><small>{next.count} học viên</small></span>
              </button>
            ) : <div className="t-nextin"><small>Hôm nay chưa có ca học nào được phân công</small></div>}
        </div>
        <div className="t-tiles">
          <button onClick={() => nav('/giao-vien/lich-day')}><span className="ic blue"><Ico.cal size={20} /></span><span><b>Ca dạy</b><small>Điểm danh ca học, Tra cứu lịch giảng dạy</small></span></button>
          <button onClick={() => nav('/giao-vien/tien-do')}><span className="ic purple"><GI.pen size={20} /></span><span><b>Tiến độ</b><small>Đăng tải tác phẩm, Cập nhật nhận xét, Đánh giá buổi học thử</small></span></button>
        </div>
        <div className="t-h3">Việc cần xử lý hôm nay</div>
        <div className="t-todo">
          <button onClick={() => nav('/giao-vien/diem-danh')}><Ico.cal size={18} /><b>Ca chưa điểm danh</b><em>{d ? d.unfinal : '–'} ca</em></button>
          <button onClick={() => nav('/giao-vien/tien-do/anh')}><GI.pic size={18} /><b>Tác phẩm cần đăng</b><em>{d ? d.photos : '–'} ảnh</em></button>
          <button onClick={() => nav('/giao-vien/tien-do/nhan-xet')}><GI.pen size={18} /><b>Nhận xét cần cập nhật</b><em>{d ? d.comments : '–'} bé</em></button>
        </div>
      </>)}
    </div>
  );
}

// ============ Ca dạy (GV-Menu-02) ============
export function TeachMenu() {
  const nav = useNavigate();
  return (
    <Page title="Ca dạy" onBack={() => nav('/giao-vien/trang-chu')}>
      <div className="stack" style={{ gap: 14, marginTop: 8 }}>
        <MenuCard icon={<GI.check size={24} />} tone="green" title="Điểm danh ca học" sub="Ghi nhận có mặt hoặc vắng mặt" onClick={() => nav('/giao-vien/diem-danh')} />
        <MenuCard icon={<Ico.cal size={24} />} title="Tra cứu lịch giảng dạy" sub="Xem lịch dạy theo ngày hoặc tuần" onClick={() => nav('/giao-vien/lich-giang-day')} />
      </div>
    </Page>
  );
}

// ============ Tra cứu lịch giảng dạy (GV-12 … GV-16) ============
export function TeachSchedule() {
  const nav = useNavigate(); const t = todayISO();
  const [mode, setMode] = useState('week'); const [from, setFrom] = useState(startOfWeek(t)); const [day, setDay] = useState(t);
  const q = useApi(() => teacher.schedule(mode === 'week' ? from : startOfWeek(day)), [mode, from, day]);
  const cur = mode === 'week' ? from === startOfWeek(t) : day === t;
  const move = (n) => (mode === 'week' ? setFrom(addDays(from, 7 * n)) : setDay(addDays(day, n)));
  const days = q.data ? (mode === 'week' ? q.data.days : q.data.days.filter((x) => x.date === day)) : [];
  const sessions = days.flatMap((x) => x.sessions.map((s) => ({ ...s, date: x.date })));
  return (
    <Page title="Tra cứu lịch giảng dạy" onBack={() => nav('/giao-vien/lich-day')}>
      <div className="t-tabs"><button className={mode === 'week' ? 'on' : ''} onClick={() => setMode('week')}>Theo tuần</button><button className={mode === 'day' ? 'on' : ''} onClick={() => setMode('day')}>Theo ngày</button></div>
      <div className="t-nav">
        <small>{mode === 'week' ? (cur ? 'TUẦN HIỆN TẠI' : 'TUẦN ĐƯỢC CHỌN') : (cur ? 'HÔM NAY' : 'NGÀY ĐƯỢC CHỌN')}</small>
        <div><button onClick={() => move(-1)} aria-label="Trước">‹</button><b>{mode === 'week' ? `${ddmm(from)} – ${fmtDate(addDays(from, 6))}` : `${WD[weekdayOf(day)]}, ${fmtDate(day)}`}</b><button onClick={() => move(1)} aria-label="Sau">›</button></div>
      </div>
      {q.error ? <Note title="Không thể tải lịch dạy" text="Hiện tại đang có sự cố, vui lòng thử lại sau" btn={null} />
        : !q.data ? null
          : !sessions.length ? <Note type={<span className="t-minus"><GI.minus size={52} /></span>} title="Không có ca dạy" text="Chưa có ca dạy nào trong khoảng thời gian này" btn={null} />
            : (<>
              <div className="t-h3">{mode === 'day' ? 'Ca dạy trong ngày' : cur ? 'Lịch dạy tuần này' : 'Lịch dạy trong tuần'}</div>
              {(mode === 'week' ? days : days.flatMap((x) => x.sessions.map((s) => ({ date: x.date, sessions: [s] })))).map((x, i) => (
                <div className="t-day" key={x.date + i}>
                  <div className="h"><b>{dayTitle(x.date)}</b>{x.date === t && <Pill tone="ok">Hôm nay</Pill>}</div>
                  {x.sessions.map((s) => (
                    <div className="s" key={s.key}><span><b>{s.start} – {s.end}</b><small>Lớp {s.name}{s.trialCount ? ` · ${s.trialCount} học thử` : ''}</small></span>{s.makeupCount > 0 && <Pill tone="orange">Học bù đã duyệt</Pill>}</div>
                  ))}
                </div>
              ))}
            </>)}
    </Page>
  );
}

// ============ Điểm danh ca học (GV-02, GV-08 … GV-11) ============
export function AttendList() {
  const nav = useNavigate(); const q = useApi(() => teacher.today(), []);
  const rows = q.data || [];
  useEffect(() => { if (rows.length === 1) nav(`/giao-vien/diem-danh/${encodeURIComponent(rows[0].key)}`, { replace: true }); }, [rows.length]); // eslint-disable-line
  return (
    <Page title="Điểm danh ca học" sub={`Ca học hôm nay - ${fmtDate(todayISO())}`} onBack={() => nav('/giao-vien/lich-day')}>
      {q.error ? <Note text={errText(q.error)} onBtn={q.reload} btn="Thử lại" />
        : q.data && !rows.length ? <Note title="Hôm nay chưa có ca học nào được phân công" onBtn={() => nav('/giao-vien/lich-day')} />
          : rows.map((s) => <SessCard key={s.key} s={s} onClick={() => nav(`/giao-vien/diem-danh/${encodeURIComponent(s.key)}`)} right={<IconChevronRight size={18} className="chev" />} tag={<span className="row"><Pill tone={s.finalized ? 'ok' : 'orange'}>{s.finalized ? 'Đã chốt' : 'Chưa chốt'}</Pill><small>{s.count} học viên</small></span>} />)}
    </Page>
  );
}

export function Attend({ sessionKey }) {
  const nav = useNavigate(); const q = useApi(() => teacher.roster(sessionKey), [sessionKey]);
  const [rec, setRec] = useState(() => getDraft(sessionKey)); const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState(navigator.onLine); const [pend, setPend] = useState(() => queued().some((x) => x.key === sessionKey));
  const [res, setRes] = useState(null); // { kind: 'incomplete' | 'final' | 'err' | 'ok', ... }
  useEffect(() => {
    const on = () => setOnline(true); const off = () => setOnline(false);
    const synced = () => { const still = queued().some((x) => x.key === sessionKey); setPend(still); if (!still) q.reload(); };
    window.addEventListener('online', on); window.addEventListener('offline', off); window.addEventListener('nnn-synced', synced);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); window.removeEventListener('nnn-synced', synced); };
  }, []); // eslint-disable-line
  const back = () => nav('/giao-vien/diem-danh');
  const d = q.data; const s = d?.session;
  const mark = (id, v) => setRec((r) => { const n = { ...r, [id]: v }; setDraft(sessionKey, n); return n; }); // lưu nháp tức thì trên máy (BR-UC11-10)
  const finalize = async () => {
    if (!d.students.every((x) => rec[x.id])) return setRes({ kind: 'incomplete' });
    if (!navigator.onLine) { enqueue({ key: sessionKey, records: rec }); setPend(true); return; }
    setBusy(true);
    try { const r = await teacher.finalize(sessionKey, rec); clearDraft(sessionKey); setRes({ kind: 'ok', sum: r }); }
    catch (e) { setRes({ kind: e.message === 'Ca học này đã chốt điểm danh' ? 'final' : 'err', msg: errText(e) }); }
    finally { setBusy(false); }
  };
  const head = s && <SessCard s={s} tag={<span className="row"><Pill tone={d.finalized || res?.kind === 'ok' ? 'ok' : 'orange'}>{d.finalized || res?.kind === 'ok' ? 'Đã chốt' : 'Chưa chốt'}</Pill><small>{d.students.length} học viên</small></span>} />;
  let body;
  if (q.error) body = <Note text={errText(q.error)} btn="Quay lại điểm danh" onBtn={back} />;
  else if (!d) body = null;
  else if (!d.students.length) body = <Note title="Ca học này chưa có học viên" onBtn={back} />;
  else if (res?.kind === 'incomplete') body = <Note title="Vui lòng điểm danh đủ học viên trong ca học!" btn="Quay lại điểm danh" onBtn={() => setRes(null)} />;
  else if (res?.kind === 'final' || (d.finalized && !res)) body = <Note title="Ca học này đã chốt điểm danh" btn="Quay lại điểm danh" onBtn={back} />;
  else if (res?.kind === 'err') body = <Note title={res.msg} btn="Quay lại điểm danh" onBtn={() => setRes(null)} />;
  else if (res?.kind === 'ok') body = <Note type="ok" title="Chốt điểm danh thành công" text={res.sum.length ? 'Số buổi còn lại trong tháng của học viên có mặt:' : 'Không có học viên chính thức có mặt trong ca.'} btn="Về danh sách ca" onBtn={back} extra={res.sum.length > 0 && <div className="t-sum">{res.sum.map((x) => <div key={x.name}><span>{x.name}</span><b>còn {x.remaining} buổi</b></div>)}</div>} />;
  else body = (<>
    {!online && <div className="m-lbanner info">Đang ngoại tuyến – điểm danh được lưu tạm trên thiết bị</div>}
    {pend && <div className="m-lbanner info">Điểm danh đã lưu trên máy, sẽ tự đồng bộ khi có mạng trở lại</div>}
    <div className="t-h3">Danh sách học viên</div>
    <div className="t-att">
      {d.students.map((x) => (
        <div className="r" key={x.id}><span><b>{x.name}</b>{x.kind !== 'Chính thức' && <small>{x.kind}</small>}</span>
          <button className={`p ${rec[x.id] === 'present' ? 'on' : ''}`} disabled={pend} onClick={() => mark(x.id, 'present')}>Có mặt</button>
          <button className={`a ${rec[x.id] === 'absent' ? 'on' : ''}`} disabled={pend} onClick={() => mark(x.id, 'absent')}>Vắng</button></div>
      ))}
    </div>
    <Button block disabled={busy || pend} onClick={finalize}>Chốt điểm danh</Button>
  </>);
  return <Page title="Điểm danh ca học" onBack={back}>{head}{body}</Page>;
}

// ============ Tiến độ (GV-Menu-03) ============
export function ProgressMenu() {
  const nav = useNavigate();
  return (
    <Page title="Tiến độ" sub="Chọn chức năng để quản lý tiến độ học viên" onBack={() => nav('/giao-vien/trang-chu')}>
      <div className="stack" style={{ gap: 14, marginTop: 4 }}>
        <MenuCard icon={<GI.pic size={24} />} tone="orange" title="Đăng tải tác phẩm" sub="Chọn ảnh bài vẽ của học viên" onClick={() => nav('/giao-vien/tien-do/anh')} />
        <MenuCard icon={<GI.pen size={24} />} tone="purple" title="Cập nhật nhận xét học viên" sub="Ghi nhận nét vẽ, màu sắc và tiếp thu" onClick={() => nav('/giao-vien/tien-do/nhan-xet')} />
        <MenuCard icon={<GI.arch size={24} />} title="Đánh giá năng lực buổi học thử" sub="Nhận xét năng lực sau buổi học thử" onClick={() => nav('/giao-vien/tien-do/hoc-thu')} />
      </div>
    </Page>
  );
}

// nén ảnh tác phẩm: bản lưu tối đa 1280px và < 200KB (NFR – tối ưu dung lượng)
const MAX_BYTES = 200 * 1024;
const compress = (file) => new Promise((res, rej) => {
  const img = new Image(); const url = URL.createObjectURL(file);
  img.onload = () => {
    URL.revokeObjectURL(url); let side = 1280; let q = 0.8; let out;
    for (let i = 0; i < 8; i++) {
      const r = Math.min(1, side / Math.max(img.width, img.height)); const c = document.createElement('canvas');
      c.width = Math.round(img.width * r); c.height = Math.round(img.height * r); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      out = c.toDataURL('image/jpeg', q); if ((out.length - 23) * 0.75 <= MAX_BYTES) break;
      if (q > 0.55) q -= 0.1; else side = Math.round(side * 0.8);
    }
    res(out);
  };
  img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Ảnh không hợp lệ. Vui lòng chọn ảnh khác!')); }; img.src = url;
});

// Chọn ca đã diễn ra (GV-17 / GV-27) – dùng chung cho đăng ảnh và nhận xét
function DonePicker({ title, emptyMsg, onPick }) {
  const nav = useNavigate(); const q = useApi(() => teacher.doneSessions(), []);
  return (
    <Page title={title} onBack={() => nav('/giao-vien/tien-do')}>
      {q.error ? <Note text={errText(q.error)} onBtn={() => nav('/giao-vien/tien-do')} />
        : q.data && !q.data.length ? <Note text={emptyMsg} onBtn={() => nav('/giao-vien/tien-do')} />
          : q.data && (<><div className="t-h4">Ca học đã diễn ra hôm nay</div>
            {q.data.map((s) => <SessCard key={s.key} s={s} tag={doneTag(s)} onClick={() => onPick(s)} right={<IconChevronRight size={18} className="chev" />} />)}</>)}
    </Page>
  );
}
// Danh sách học viên có mặt (GV-18 / GV-28)
function PresentList({ title, sub, s, q, onBack, onPick, emptyMsg, status }) {
  if (q.error) return <Page title={title} onBack={onBack}><Note text={errText(q.error)} onBtn={onBack} /></Page>;
  if (q.data && !q.data.students.length) return <Page title={title} onBack={onBack}><Note text={emptyMsg} onBtn={onBack} /></Page>;
  return (
    <Page title={title} onBack={onBack}>
      {sub && <div className="t-h4" style={{ marginTop: -8 }}>{sub}</div>}
      <SessCard s={s} tag={doneTag(s)} />
      {!sub && <div className="t-h4">Học viên có mặt trong ca</div>}
      {q.data?.students.map((x) => (
        <button key={x.id} className="t-stu" onClick={() => onPick(x)}><span className="ic"><Ico.flower size={18} /></span><span className="tx"><b>{x.name}</b><small>{status(x)}</small></span><IconChevronRight size={18} className="chev" /></button>
      ))}
    </Page>
  );
}
const StuBox = ({ name }) => <div className="t-stubox"><small>Học viên</small><b>{name}</b></div>;

// ============ Đăng tải ảnh tác phẩm (GV-17 … GV-26) ============
export function PhotoUpload() {
  const [s, setS] = useState(null); const [pick, setPick] = useState(null); const [img, setImg] = useState(null); const [note, setNote] = useState(null); const [done, setDone] = useState(null); const [busy, setBusy] = useState(false);
  const q = useApi(() => teacher.presentStudents(s.key), [s?.key], { skip: !s });
  const title = 'Đăng tải ảnh tác phẩm';
  if (!s) return <DonePicker title={title} emptyMsg="Hôm nay chưa có ca học nào để đăng tải" onPick={setS} />;
  const reset = () => { setPick(null); setImg(null); setNote(null); setDone(null); };
  const choose = async (f) => {
    if (!f) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type) || f.size > 10 * 1024 * 1024) return setNote({ text: 'Ảnh không hợp lệ. Vui lòng chọn ảnh khác!', btn: 'Chọn ảnh khác', pickAgain: true });
    try { setImg({ data: await compress(f), mime: f.type, bytes: f.size }); } catch (e) { setNote({ text: e.message, btn: 'Chọn ảnh khác', pickAgain: true }); }
  };
  const upload = async () => {
    if (!img) return setNote({ text: 'Vui lòng chọn ảnh tác phẩm!', btn: 'Chọn ảnh', pickAgain: true });
    setBusy(true);
    try { await teacher.uploadPhoto(pick.id, s.key, img.data, img.mime, img.bytes); setDone({ name: pick.name, img: img.data }); q.reload(); }
    catch (e) { setNote({ text: errText(e), btn: 'Đóng', close: true }); }
    finally { setBusy(false); }
  };
  if (note) {
    const fileBtn = note.pickAgain && <label className="btn block t-filebtn">{note.btn}<input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => { setNote(null); choose(e.target.files[0]); e.target.value = ''; }} /></label>;
    return <Page title={title} onBack={() => setNote(null)}><Note text={note.text} btn={fileBtn ? null : note.btn} extra={fileBtn} onBtn={() => (note.close ? reset() : note.cancel ? reset() : setNote(null))} /></Page>;
  }
  if (done) return (
    <Page title={title} onBack={reset}>
      <SessCard s={s} tag={doneTag(s)} />
      <div className="t-donecard"><div className="ok">✓ Ảnh tác phẩm đã đăng tải</div><b>Học viên: {done.name}</b><small>Ca học: {s.start} - {s.end} - {s.name}</small><div className="ph"><img src={done.img} alt={`Tác phẩm của ${done.name}`} /></div><small className="c">Ảnh đã lưu vào nhật ký học tập</small></div>
      <Button block variant="secondary" onClick={reset}>Về danh sách học viên</Button>
    </Page>
  );
  if (pick) return (
    <Page title={title} onBack={() => setNote({ text: 'Đã huỷ thao tác đăng tải', btn: 'Quay lại', cancel: true })}>
      <SessCard s={s} tag={doneTag(s)} />
      <StuBox name={pick.name} />
      <div className="t-h3">Ảnh tác phẩm</div>
      <label className="t-drop">
        <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => { choose(e.target.files[0]); e.target.value = ''; }} />
        {img ? <img src={img.data} alt="Ảnh đã chọn" /> : pick.photo ? <img src={pick.photo} alt="Ảnh hiện tại" /> : <><GI.pic size={56} strokeWidth={1.3} /><b>Chọn ảnh từ thư viện ảnh</b></>}
        <small>{img ? 'Bấm để chọn ảnh khác' : pick.photo ? 'Đã có ảnh – bấm để chọn ảnh thay thế' : 'Ảnh sẽ được gắn vào nhật ký học tập của bé'}</small>
      </label>
      <div className="t-gap" />
      <Button block disabled={busy} onClick={upload}>Đăng tải</Button>
      <button className="p-link" onClick={() => setNote({ text: 'Đã huỷ thao tác đăng tải', btn: 'Quay lại', cancel: true })}>Huỷ</button>
    </Page>
  );
  return <PresentList title={title} s={s} q={q} onBack={() => setS(null)} onPick={setPick} emptyMsg="Ca học này chưa có học viên có mặt" status={(x) => (x.hasPhoto ? 'Có mặt · Đã đăng ảnh' : 'Có mặt')} />;
}

// Biểu mẫu 3 tiêu chí: Nét vẽ / Màu sắc / Khả năng tiếp thu
const CF = [['stroke', 'Nét vẽ'], ['color', 'Màu sắc'], ['absorb', 'Khả năng tiếp thu']];
function Criteria({ f, setF, errors, ph }) {
  return CF.map(([k, l]) => (
    <div className="t-crit" key={k}><label htmlFor={`c-${k}`}>{l}</label>
      <textarea id={`c-${k}`} className={errors[k] ? 'err' : ''} placeholder={ph[k]} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
      {errors[k] && <span className="e">{errors[k]}</span>}</div>
  ));
}

// ============ Cập nhật nhận xét học viên (GV-27 … GV-34) ============
const PH_C = { stroke: 'Bé điều khiển nét bút tốt hơn.', color: 'Bé phối màu tươi sáng, hài hòa.', absorb: 'Bé tiếp thu hướng dẫn tốt.' };
export function CommentPage() {
  const [s, setS] = useState(null); const [pick, setPick] = useState(null); const [f, setF] = useState({ stroke: '', color: '', absorb: '' }); const [e, setE] = useState({}); const [note, setNote] = useState(null); const [busy, setBusy] = useState(false);
  const q = useApi(() => teacher.presentStudents(s.key), [s?.key], { skip: !s });
  const title = 'Cập nhật nhận xét học viên';
  if (!s) return <DonePicker title={title} emptyMsg="Hôm nay chưa có ca học nào để nhận xét" onPick={setS} />;
  const close = () => { setNote(null); setPick(null); setE({}); setF({ stroke: '', color: '', absorb: '' }); };
  const choose = (x) => (x.hasComment ? setNote({ text: 'Học viên đã có nhận xét trong ca học này' }) : setPick(x));
  const save = async () => {
    const er = {}; CF.forEach(([k]) => { if (!f[k].trim()) er[k] = 'Vui lòng nhập đầy đủ nhận xét!'; }); setE(er); if (Object.keys(er).length) return;
    setBusy(true);
    try { await teacher.saveComment(pick.id, s.key, f); setNote({ ok: true }); q.reload(); }
    catch (x) { if (x.fields) setE(x.fields); else setNote({ text: errText(x) }); }
    finally { setBusy(false); }
  };
  if (note) return <Page title={title} onBack={close}>{note.ok ? <Note type="ok" title="Thành công" text="Cập nhật nhận xét thành công!" onBtn={close} /> : <Note text={note.text} onBtn={close} />}</Page>;
  if (pick) return (
    <Page title={title} onBack={() => setNote({ text: 'Đã huỷ thao tác cập nhật' })}>
      <div className="t-h4" style={{ marginTop: -8 }}>Nhập nhận xét sau ca học</div>
      <SessCard s={s} tag={doneTag(s)} />
      <StuBox name={pick.name} />
      <div className="t-h3" style={{ marginBottom: -8 }}>Nhận xét kỹ năng</div>
      <Criteria f={f} setF={setF} errors={e} ph={PH_C} />
      <Button block disabled={busy} onClick={save}>Lưu</Button>
      <button className="p-link" onClick={() => setNote({ text: 'Đã huỷ thao tác cập nhật' })}>Huỷ</button>
    </Page>
  );
  return <PresentList title={title} sub="Chọn học viên có mặt" s={s} q={q} onBack={() => setS(null)} onPick={choose} emptyMsg="Ca học này chưa có học viên có mặt" status={(x) => (x.hasComment ? 'Có mặt · Đã có nhận xét' : 'Có mặt')} />;
}

// ============ Đánh giá năng lực buổi học thử (GV-37 … GV-44) ============
const PH_T = { stroke: 'Bé cầm bút khá tự tin, nét vẽ rõ hơn.', color: 'Bé biết phối các màu sắc hài hòa.', absorb: 'Nhập đánh giá...' };
export function TrialAssess() {
  const nav = useNavigate(); const q = useApi(() => teacher.trialsToAssess(), []);
  const [pick, setPick] = useState(null); const [f, setF] = useState({ stroke: '', color: '', absorb: '' }); const [e, setE] = useState({}); const [note, setNote] = useState(null); const [busy, setBusy] = useState(false);
  const title = 'Đánh giá năng lực buổi học thử';
  const close = () => { setNote(null); setPick(null); setE({}); setF({ stroke: '', color: '', absorb: '' }); q.reload(); };
  const save = async () => {
    const er = {}; CF.forEach(([k]) => { if (!f[k].trim()) er[k] = 'Vui lòng nhập đầy đủ đánh giá!'; }); setE(er); if (Object.keys(er).length) return;
    setBusy(true);
    try { await teacher.assessTrial(pick.id, f); setNote({ ok: true }); }
    catch (x) { if (x.fields) setE(x.fields); else setNote({ text: x.message === 'Học viên đã có đánh giá năng lực' ? 'Học viên đã có đánh giá năng lực' : errText(x) }); }
    finally { setBusy(false); }
  };
  if (note?.ok) return (
    <Page title={title} onBack={close}><div className="t-h4" style={{ marginTop: -8 }}>Kết quả đánh giá</div>
      <Note type="ok" title={<span className="t-oktitle">Lưu đánh giá năng lực thành công!</span>} btn="Quay về danh sách" onBtn={close}
        extra={<div className="t-trialres"><small>Học viên</small><b>{pick.name}</b><span><small>Trạng thái đơn học thử</small><Pill tone="ok">Đã hoàn thành</Pill></span></div>} />
    </Page>
  );
  if (note) return <Page title={title} onBack={close}><Note text={note.text} onBtn={close} /></Page>;
  if (pick) return (
    <Page title={title} onBack={() => { setPick(null); setE({}); }}>
      <div className="t-h4" style={{ marginTop: -8 }}>Nhập đánh giá cho học viên</div>
      <div className="t-sess"><span className="l"><b>{pick.name}</b><small className="dk">Ca học thử {pick.session.start} - {pick.session.end}</small><small>{pick.session.name}</small><span className="row"><Pill tone="ok">Chưa đánh giá</Pill></span></span></div>
      <div className="t-h3" style={{ marginBottom: -8 }}>Đánh giá năng lực</div>
      <Criteria f={f} setF={setF} errors={e} ph={PH_T} />
      <div className="t-2btn"><Button variant="outline" onClick={() => { setPick(null); setE({}); }}>Huỷ</Button><Button disabled={busy} onClick={save}>Lưu</Button></div>
    </Page>
  );
  return (
    <Page title={title} onBack={() => nav('/giao-vien/tien-do')}>
      <div className="t-h4" style={{ marginTop: -8 }}>Học viên học thử cần đánh giá</div>
      {q.error ? <Note text={errText(q.error)} onBtn={() => nav('/giao-vien/tien-do')} />
        : q.data && !q.data.length ? (
          <Note
            type={<span className="t-pen"><GI.pen size={54} strokeWidth={2.4} /></span>}
            title={<>Hiện không có học viên<br />học thử nào cần đánh giá</>}
            btn="Đóng"
            onBtn={() => nav('/giao-vien/tien-do')}
          />
        )
        : q.data && q.data.map((t) => (
          <button key={t.id} className="t-trial" onClick={() => setPick(t)}>
            <CrayonAvatar size={54} />
            <span className="tx">
              <b>{t.name}</b>
              <strong>Ca {t.session.start} - {t.session.end}</strong>
              <small>{t.session.name}{t.session.room ? ` · ${t.session.room}` : ''}</small>
              <Pill tone="ok">Chưa đánh giá</Pill>
            </span>
            <IconChevronRight size={22} className="chev" />
          </button>
        ))}
    </Page>
  );
}
