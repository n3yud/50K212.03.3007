// ============================================================================
// LỚP "API" GIẢ LẬP – mô phỏng Backend ASP.NET Core.
// - Mỗi hàm export tương ứng 1 endpoint REST sau này (ghi chú ở đầu mỗi nhóm).
// - Quy tắc nghiệp vụ & kiểm tra quyền được xử lý TẠI ĐÂY, không phải ở giao diện.
// - Mỗi thao tác ghi là một "giao dịch": lỗi thì hoàn tác toàn bộ (BR-UC3-19...).
// Khi có Backend thật: chỉ cần thay thân các hàm bằng fetch('/api/...').
// ============================================================================
import { getDb, save, nid, resetDb, PRICE, MAX_CLASS, MAX_WITH_MAKEUP, MAX_MAKEUP, MAKEUP_DAYS } from './db';
import {
  todayISO, addDays, diffDays, weekdayOf, monthKey, ageOn, isEnded, isStarted, countWeekdayInMonth,
  startOfWeek, nextDateForWeekday, fmtDate, weekdayLabel, toMin,
} from '../lib/dates';
import { daysOf, meets, shareDay, schedText, isValidSchedule, patternShort } from '../lib/schedule';

export { resetDb };
export const MSG_SYS = 'Hiện tại đang có sự cố, vui lòng thử lại sau';
export const MSG_SYS_PARENT = 'Hiện tại đang có sự cố, ba mẹ đợi Ngôi Nhà Nhỏ một xíu nhé!';

export class ApiError extends Error {
  constructor(message, field, status = 400) { super(message); this.field = field; this.status = status; }
}
const fail = (m, f) => { throw new ApiError(m, f); };
// Giả lập sự cố hệ thống để trình diễn các luồng ngoại lệ "lỗi hệ thống" của đặc tả.
// Bật/tắt bằng tổ hợp phím Ctrl + Alt + E (xem components/DemoFault.jsx).
const faultOn = () => { try { return localStorage.getItem('nnn_fault') === '1'; } catch { return false; } };
const sysMsg = () => { try { const D = getDb(); const u = D.users.find((x) => x.id === localStorage.getItem('nnn_session')); return u?.role === 'parent' ? MSG_SYS_PARENT : MSG_SYS; } catch { return MSG_SYS; } };
const faultCheck = () => { if (faultOn()) throw new ApiError(sysMsg(), null, 500); };
const delay = (ms = 90) => new Promise((r) => setTimeout(r, ms));
const wait = async (ms = 90) => { await delay(ms); faultCheck(); };

// ---------- phiên đăng nhập (mô phỏng JWT) ----------
const SKEY = 'nnn_session';
const setSession = (uid) => { try { uid ? localStorage.setItem(SKEY, uid) : localStorage.removeItem(SKEY); } catch { /* ignore */ } };
const sessionId = () => { try { return localStorage.getItem(SKEY); } catch { return null; } };
export const publicUser = (u) => u && ({ id: u.id, role: u.role, fullName: u.fullName, title: u.title, username: u.username, phone: u.phone, mustChangePassword: u.mustChangePassword });

// Kiểm tra quyền ở "Backend": gọi đầu mỗi hàm cần đăng nhập
function need(D, ...roles) {
  const u = D.users.find((x) => x.id === sessionId());
  if (!u || u.locked) throw new ApiError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', null, 401);
  if (roles.length && !roles.includes(u.role)) throw new ApiError('Bạn không có quyền thực hiện thao tác này.', null, 403);
  return u;
}
const OPS = ['assistant', 'manager']; // Quản lý kế thừa quyền Trợ lý (đặc tả mục 1.3.2)

// Đọc: không ghi. Ghi: giao dịch có hoàn tác.
const read = (fn) => async (...a) => { await wait(); const D = getDb(); refresh(D); return structuredClone(fn(D, ...a)); };
const write = (fn) => async (...a) => {
  await wait(); const D = getDb(); const snap = JSON.stringify(D);
  try { refresh(D); const r = fn(D, ...a); save(); return structuredClone(r); }
  catch (e) { Object.keys(D).forEach((k) => delete D[k]); Object.assign(D, JSON.parse(snap)); throw e; }
};

// ---------- helper nghiệp vụ dùng chung ----------
const cls = (D, id) => D.classes.find((c) => c.id === id);
const stu = (D, id) => D.students.find((s) => s.id === id);
const usr = (D, id) => D.users.find((u) => u.id === id);
export const sk = (cid, date) => `${cid}|${date}`;
const split = (k) => { const [classId, date] = k.split('|'); return { classId, date }; };
const teacherName = (D, id) => { const u = usr(D, id); return u ? `${u.title ? u.title + ' ' : ''}${u.fullName}` : ''; };
const ACTIVE_TRIAL = ['Chờ phụ huynh xác nhận', 'Chờ duyệt ca học thử', 'Đã xếp ca', 'Đã hoàn thành', 'Đã tư vấn'];
const HOLD_STATES = ['Đã đăng ký học bù', 'Chờ duyệt', 'Đã xếp lịch bù'];

function info(D, key) {
  const { classId, date } = split(key); const c = cls(D, classId);
  const dd = date.slice(8), mm = date.slice(5, 7);
  return {
    key, classId, date, name: c.name, program: c.program, start: c.start, end: c.end, weekday: weekdayOf(date), days: daysOf(c),
    code: `${c.program === 'Cơ bản' ? 'CB' : 'NC'}${dd}${mm}${c.letter}`,
    teacherId: c.teacherId, teacher: teacherName(D, c.teacherId),
    ended: isEnded(date, c.end), started: isStarted(date, c.start),
  };
}
function load(D, key) {
  const { classId } = split(key);
  const official = D.students.filter((s) => s.status === 'Đang học' && s.classIds.includes(classId)).length;
  const trials = D.trials.filter((t) => t.session === key && ACTIVE_TRIAL.includes(t.status)).length;
  const bu = D.absences.filter((a) => a.makeup === key && HOLD_STATES.includes(a.status)).length;
  const base = official + trials;
  return { official, trials, bu, base, total: base + bu, max: bu > 0 ? MAX_WITH_MAKEUP : MAX_CLASS };
}
const sessionLabel = (D, key) => { const i = info(D, key); return `${weekdayLabel(weekdayOf(i.date))}, ${fmtDate(i.date)} · ${i.start} - ${i.end}`; };

// Hết hạn học bù tự động (BR-UC3-16)
function refresh(D) {
  const t = todayISO(); let ch = false;
  D.absences.forEach((a) => {
    if (t > a.deadline && ['Chờ xếp lịch bù', 'Đã đăng ký học bù', 'Chờ duyệt'].includes(a.status)) { a.status = 'Hết hạn'; a.makeup = null; ch = true; }
  });
  if (ch) save();
}
function notify(D, userId, title, body) { D.notifications.push({ id: nid('n'), userId, title, body, createdAt: Date.now(), read: false }); }
const notifyParent = (D, s, title, body) => { const u = D.users.find((x) => x.role === 'parent' && x.phone === s.parentPhone); if (u) notify(D, u.id, title, body); };
const notifyRole = (D, role, title, body) => D.users.filter((u) => u.role === role).forEach((u) => notify(D, u.id, title, body));
function log(D, entity, entityId, by, from, to, note) { D.history.push({ id: nid('h'), entity, entityId, by, at: Date.now(), from, to, note }); }

// Số buổi còn lại theo tháng (BR-UC9-06, BR-UC3-06, BR-UC11-06/07) – tính từ dữ liệu gốc
function remaining(D, sid, month) {
  const tu = D.tuition.find((x) => x.studentId === sid && x.month === month && x.status === 'Đã thanh toán');
  if (!tu) return 0;
  const s = stu(D, sid);
  let used = 0;
  Object.entries(D.attendance).forEach(([k, att]) => {
    if (att.finalized && att.records[sid] === 'present' && k.split('|')[1].startsWith(month) && s.classIds.includes(split(k).classId)) used++;
  });
  used += D.absences.filter((a) => a.studentId === sid && split(a.sessionKey).date.startsWith(month)).length;
  return Math.max(0, tu.total - used);
}
const nextSessions = (D, s, days = 35) => {
  const out = []; const t = todayISO();
  for (let i = 0; i <= days; i++) {
    const d = addDays(t, i);
    s.classIds.forEach((cid) => { const c = cls(D, cid); if (meets(c, weekdayOf(d)) && !isStarted(d, c.start)) out.push(sk(cid, d)); });
  }
  return out.sort((a, b) => split(a).date.localeCompare(split(b).date));
};
const overlaps = (a, b) => toMin(a.start) < toMin(b.end) && toMin(b.start) < toMin(a.end);

// Ca học bù khả dụng (BR-UC3-11, BR-UC3-12)
function availableMakeups(D, a) {
  const s = stu(D, a.studentId); const t = todayISO(); const out = [];
  const own = nextSessions(D, s, MAKEUP_DAYS + 5).map((k) => info(D, k));
  for (let i = 0; i <= MAKEUP_DAYS; i++) {
    const d = addDays(t, i); if (d > a.deadline) break;
    D.classes.forEach((c) => {
      if (c.program !== s.program || !meets(c, weekdayOf(d)) || isStarted(d, c.start)) return;
      const key = sk(c.id, d);
      if (key === a.sessionKey) return;
      if (own.some((o) => o.date === d && overlaps(o, c))) return; // trùng lịch học của chính bé
      const L = load(D, key);
      if (L.bu < MAX_MAKEUP && L.base + L.bu + 1 <= MAX_WITH_MAKEUP) out.push({ ...info(D, key), load: L });
    });
  }
  return out;
}

// ============================================================================
// 1. ĐĂNG NHẬP   (POST /api/auth/login, POST /api/auth/change-password, GET /api/auth/me)
// ============================================================================
export const auth = {
  // Thông điệp quên mật khẩu theo vai trò (BR-UC1-13)
  // app: 'staff' (web quản trị: Trợ lý/Quản lý/Giám sát) | 'parent' | 'teacher' (2 web mobile riêng)
  login: async (username, password, app = 'staff') => {
    await delay(); const D = getDb();
    const e = {};
    if (!username?.trim()) e.username = 'Vui lòng điền đầy đủ thông tin!';
    if (!password) e.password = 'Vui lòng điền đầy đủ thông tin!';
    if (Object.keys(e).length) { const er = new ApiError('Vui lòng điền đầy đủ thông tin!'); er.fields = e; throw er; }
    if (faultOn()) fail('Hiện tại đang có sự cố. Vui lòng thử lại sau'); // 6c. Lỗi hệ thống khi xác thực
    const q = username.trim().toLowerCase();
    const u = D.users.find((x) => x.username.toLowerCase() === q || (x.email && x.email.toLowerCase() === q));
    if (u) {
      if (u.locked) fail('Tài khoản đã bị khóa. Vui lòng liên hệ bộ phận hỗ trợ');
      if (u.lockoutEnd && u.lockoutEnd > Date.now()) {
        const mins = Math.max(1, Math.ceil((u.lockoutEnd - Date.now()) / 60000));
        fail(`Tài khoản tạm thời bị khóa do nhập sai mật khẩu quá 5 lần. Vui lòng thử lại sau ${mins} phút hoặc liên hệ hỗ trợ`);
      }
      if (u.lockoutEnd && u.lockoutEnd <= Date.now()) {
        u.lockoutEnd = null;
        u.failedAttempts = 0;
      }
    }
    // BR-UC1-10, BR-UC1-11: bảo vệ chống brute-force sau 5 lần
    if (!u || u.password !== password) {
      if (u) {
        u.failedAttempts = (u.failedAttempts || 0) + 1;
        if (u.failedAttempts >= 5) {
          u.lockoutEnd = Date.now() + 15 * 60 * 1000;
          fail('Tài khoản đã bị tạm khóa 15 phút do nhập sai mật khẩu quá 5 lần. Vui lòng thử lại sau hoặc liên hệ hỗ trợ');
        }
        const left = 5 - u.failedAttempts;
        fail(`Tên đăng nhập hoặc mật khẩu không chính xác. Bạn còn ${left} lần thử trước khi tài khoản bị khóa tạm thời!`);
      }
      fail('Tên đăng nhập hoặc mật khẩu không chính xác. Vui lòng thử lại!');
    }
    u.failedAttempts = 0;
    u.lockoutEnd = null;
    const allowed = app === 'parent' ? ['parent'] : app === 'teacher' ? ['teacher'] : ['assistant', 'manager', 'supervisor'];
    if (!allowed.Contains ? !allowed.includes(u.role) : !allowed.includes(u.role)) fail('Tài khoản không có quyền truy cập ứng dụng này');
    setSession(u.id);
    return publicUser(u);
  },
  logout: async () => { setSession(null); },
  me: async () => { const D = getDb(); const u = D.users.find((x) => x.id === sessionId()); return u && !u.locked ? publicUser(u) : null; },
  changePassword: write((D, oldPw, newPw) => {
    const u = need(D);
    if (!newPw || newPw.length < 6) fail('Mật khẩu mới cần có ít nhất 6 ký tự', 'newPw');
    if (newPw === u.password) fail('Mật khẩu mới phải khác mật khẩu hiện tại', 'newPw');
    if (u.password !== oldPw) fail(u.mustChangePassword ? 'Mật khẩu tạm không đúng' : 'Mật khẩu hiện tại không đúng', 'oldPw');
    u.password = newPw; u.mustChangePassword = false; return publicUser(u);
  }),
  forgotMessage: (role) => (role === 'parent' ? 'Vui lòng liên hệ Trợ lý để được hỗ trợ cấp lại mật khẩu' : 'Vui lòng liên hệ bộ phận Admin để được hỗ trợ cấp lại mật khẩu'),
};

// ============================================================================
// 2. HỌC THỬ – PHỤ HUYNH  (POST /api/trials, GET /api/parent/trials, POST /api/parent/trials/{id}/confirm ...)
// ============================================================================
// Mật khẩu khởi tạo do bộ phận kỹ thuật/Admin cấp ngoài hệ thống: hệ thống chỉ tạo tài khoản với mật khẩu ngẫu nhiên, không hiển thị cho ai.
const randomPw = () => Array.from(crypto.getRandomValues(new Uint8Array(10)), (b) => 'abcdefghjkmnpqrstuvwxyz23456789'[b % 31]).join('');
export const NAME_RE = /^[A-Za-zÀ-ỹĐđ\s]+$/u;
export function validateChild(name, dob) {
  const e = {};
  const n = (name || '').trim();
  if (!n) e.name = 'Vui lòng nhập họ tên học viên'; else if (n.length < 2 || n.length > 50 || !NAME_RE.test(n)) e.name = 'Họ tên chỉ gồm chữ cái, dài từ 2 đến 50 ký tự';
  if (!dob) e.dob = 'Vui lòng chọn ngày sinh';
  else if (dob > todayISO()) e.dob = 'Ngày sinh không được sau ngày hiện tại';
  else { const a = ageOn(dob); if (a < 5 || a > 15) e.dob = 'Học viên cần từ 5 đến 15 tuổi (Cơ bản 5–6 tuổi, Nâng cao 7–15 tuổi)'; }
  return e;
}
export const suggestProgram = (dob) => { const a = ageOn(dob); return a >= 5 && a <= 6 ? 'Cơ bản' : a >= 7 && a <= 15 ? 'Nâng cao' : ''; };

export const trialsApi = {
  // Không cần đăng nhập (đặc tả: đăng ký học thử trực tiếp)
  register: write((D, { children, parentPhone, wishDays, wishSlot }) => {
    const errors = {};
    if (!/^0\d{9}$/.test(parentPhone || '')) errors.parentPhone = 'Số điện thoại gồm đúng 10 chữ số và bắt đầu bằng số 0';
    if (!wishDays?.length || !wishSlot) errors.wish = 'Vui lòng chọn khung giờ mong muốn';
    const ce = children.map((c) => validateChild(c.name, c.dob));
    if (Object.keys(errors).length || ce.some((x) => Object.keys(x).length)) { const er = new ApiError('Thông tin đăng ký không hợp lệ. Vui lòng kiểm tra lại!'); er.fields = errors; er.children = ce; throw er; }
    // BR-UC2-06: mỗi học viên chỉ có 1 đơn hiệu lực
    children.forEach((c, i) => {
      const dup = D.trials.find((t) => t.studentName.trim().toLowerCase() === c.name.trim().toLowerCase() && t.dob === c.dob && t.parentPhone === parentPhone && t.status !== 'Đã tư vấn');
      if (dup) { const er = new ApiError(`${c.name.trim()} đã có đơn học thử đang được xử lý`); er.children = children.map((_, j) => (j === i ? { name: 'Đã có đơn học thử hiệu lực' } : {})); throw er; }
    });
    let isNew = false;
    if (!D.users.find((u) => u.role === 'parent' && u.phone === parentPhone)) {
      isNew = true; // BR-UC1-05: tự tạo tài khoản theo SĐT; việc cấp mật khẩu do Trợ lý phối hợp bộ phận Admin (ngoài phạm vi hệ thống)
      D.users.push({ id: `u_ph_${parentPhone}`, role: 'parent', username: parentPhone, email: '', password: randomPw(), fullName: `Phụ huynh ${parentPhone.slice(-4)}`, phone: parentPhone, locked: false, mustChangePassword: true });
    }
    children.forEach((c) => {
      const t = { id: nid('t'), studentName: c.name.trim(), dob: c.dob, parentPhone, wishDays, wishSlot, createdAt: Date.now(), status: 'Chờ tiếp nhận', program: null, session: null, assessment: null, consult: null, history: [] };
      D.trials.push(t); log(D, 'trial', t.id, 'parent', '', 'Chờ tiếp nhận', 'Phụ huynh đăng ký');
    });
    notifyRole(D, 'assistant', 'Có đơn đăng ký học thử mới', `${children.map((c) => c.name.trim()).join(', ')} – SĐT ${parentPhone}`);
    return { isNew, count: children.length };
  }),
  mine: read((D) => {
    const u = need(D, 'parent');
    return D.trials.filter((t) => t.parentPhone === u.phone).sort((a, b) => b.createdAt - a.createdAt).map((t) => ({
      ...t, sessionInfo: t.session && ['Chờ phụ huynh xác nhận', 'Chờ duyệt ca học thử', 'Đã xếp ca', 'Đã hoàn thành', 'Đã tư vấn'].includes(t.status) ? info(D, t.session) : null, // BR-UC2-12
      assessment: undefined,
    }));
  }),
  confirm: write((D, id) => {
    const u = need(D, 'parent'); const t = D.trials.find((x) => x.id === id && x.parentPhone === u.phone);
    if (!t) fail(MSG_SYS_PARENT);
    if (t.status !== 'Chờ phụ huynh xác nhận') fail('Đơn này không còn ở trạng thái chờ xác nhận');
    t.status = 'Chờ duyệt ca học thử'; log(D, 'trial', t.id, u.id, 'Chờ phụ huynh xác nhận', t.status, 'Phụ huynh xác nhận lịch');
    notifyRole(D, 'assistant', 'Phụ huynh đã xác nhận lịch học thử', `${t.studentName} đã xác nhận ca học thử.`);
    notifyRole(D, 'manager', 'Có ca học thử chờ phê duyệt', `${t.studentName} – ${sessionLabel(D, t.session)}`);
    return true;
  }),
  result: read((D) => {
    const u = need(D, 'parent');
    // BR-UC2-13/14: chỉ buổi đã hoàn thành và đã có kết quả tư vấn; ẩn ghi chú nội bộ
    return D.trials.filter((t) => t.parentPhone === u.phone && t.status === 'Đã tư vấn' && t.consult).map((t) => ({
      id: t.id, studentName: t.studentName, session: t.session ? info(D, t.session) : null, assessment: t.assessment, roadmap: t.consult.roadmap,
    }));
  }),
  // UC 2.3: các buổi học thử đã hoàn thành (kèm kết quả nếu Trợ lý đã cập nhật tư vấn)
  completed: read((D) => {
    const u = need(D, 'parent');
    return D.trials.filter((t) => t.parentPhone === u.phone && t.session && (['Đã hoàn thành', 'Đã tư vấn'].includes(t.status) || (t.status === 'Đã xếp ca' && info(D, t.session).ended))).sort((a, b) => b.createdAt - a.createdAt).map((t) => ({
      id: t.id, studentName: t.studentName, status: t.status === 'Đã tư vấn' ? 'Đã tư vấn' : 'Đã hoàn thành', session: info(D, t.session), result: t.status === 'Đã tư vấn' && t.consult ? { assessment: t.assessment, roadmap: t.consult.roadmap } : null,
    }));
  }),
  hasCompleted: read((D) => { const u = need(D, 'parent'); return D.trials.filter((t) => t.parentPhone === u.phone && ['Đã hoàn thành', 'Đã tư vấn'].includes(t.status)).length; }),
};

// ============================================================================
// 3. HỌC THỬ – TRỢ LÝ  (GET /api/assistant/trials?status=..., POST .../{id}/accept, .../propose, .../consult)
// ============================================================================
export const trialMgmt = {
  list: read((D, status) => { need(D, ...OPS); return D.trials.filter((t) => t.status === status).sort((a, b) => a.createdAt - b.createdAt).map((t) => ({ ...t, age: ageOn(t.dob), suggested: suggestProgram(t.dob), sessionInfo: t.session ? info(D, t.session) : null })); }),
  accept: write((D, id, program) => {
    const u = need(D, ...OPS);
    const t = D.trials.find((x) => x.id === id);
    if (!t) fail(MSG_SYS);
    if (!program) fail('Vui lòng chọn chương trình học!', 'program');
    if (t.status !== 'Chờ tiếp nhận') fail('Đơn này đã được xử lý trước đó'); // BR-UC5-03
    t.program = program; t.status = 'Đã tiếp nhận'; log(D, 'trial', t.id, u.id, 'Chờ tiếp nhận', 'Đã tiếp nhận', program);
    const parent = D.users.find((x) => x.role === 'parent' && x.phone === t.parentPhone);
    if (parent) notify(D, parent.id, 'Đã tiếp nhận đơn học thử', `Ngôi Nhà Nhỏ đã tiếp nhận đơn học thử của bé ${t.studentName}.`);
    return true;
  }),
  // Danh sách ca học thử phù hợp (BR-UC5-05, 5-06): cùng chương trình, chưa diễn ra, còn chỗ
  sessionsFor: read((D, id) => {
    need(D, ...OPS); const t = D.trials.find((x) => x.id === id); const out = []; const today = todayISO();
    for (let i = 0; i <= 28; i++) {
      const d = addDays(today, i);
      D.classes.filter((c) => c.program === t.program && meets(c, weekdayOf(d)) && !isStarted(d, c.start)).forEach((c) => {
        const key = sk(c.id, d); const L = load(D, key);
        if (L.base < MAX_CLASS) out.push({ ...info(D, key), load: L });
      });
    }
    return out;
  }),
  propose: write((D, id, key) => {
    const u = need(D, ...OPS); const t = D.trials.find((x) => x.id === id);
    if (!t || t.status !== 'Đã tiếp nhận') fail('Đơn này không còn ở trạng thái Đã tiếp nhận');
    if (!key) fail('Vui lòng chọn ca học thử');
    if (load(D, key).base >= MAX_CLASS) fail('Ca học đã đầy, vui lòng chọn ca khác'); // kiểm tra lại sĩ số
    t.session = key; t.status = 'Chờ phụ huynh xác nhận'; log(D, 'trial', t.id, u.id, 'Đã tiếp nhận', t.status, key);
    const parent = D.users.find((x) => x.role === 'parent' && x.phone === t.parentPhone);
    if (parent) notify(D, parent.id, 'Đề xuất lịch học thử', `Ngôi Nhà Nhỏ đề xuất ca học thử cho bé ${t.studentName}: ${sessionLabel(D, key)}. Ba mẹ vui lòng xác nhận lịch.`);
    return true;
  }),
  // Cập nhật kết quả tư vấn (UC 5.3)
  consultList: read((D) => { need(D, ...OPS); return D.trials.filter((t) => ['Đã xếp ca', 'Đã hoàn thành'].includes(t.status) && t.session && !t.consult).map((t) => ({ ...t, sessionInfo: info(D, t.session) })); }),
  saveConsult: write((D, id, { roadmap, decision, note }) => {
    const u = need(D, ...OPS); const t = D.trials.find((x) => x.id === id);
    if (!t) fail(MSG_SYS);
    const si = info(D, t.session);
    if (!si.ended) fail('Buổi học thử chưa diễn ra');
    if (!t.assessment) fail('Giáo viên chưa nhập đánh giá năng lực của học viên');
    const e = {};
    if (!roadmap?.trim()) e.roadmap = 'Vui lòng nhập đầy đủ thông tin!';
    if (!['Đăng ký chính thức', 'Chưa quyết định', 'Không đăng ký'].includes(decision)) e.decision = 'Vui lòng nhập đầy đủ thông tin!';
    if (Object.keys(e).length) { const er = new ApiError('Vui lòng nhập đầy đủ thông tin!'); er.fields = e; throw er; }
    t.consult = { roadmap: roadmap.trim(), decision, note: note || '', by: u.id, at: Date.now() };
    log(D, 'trial', t.id, u.id, t.status, 'Đã tư vấn', JSON.stringify(t.consult)); t.status = 'Đã tư vấn';
    const parent = D.users.find((x) => x.role === 'parent' && x.phone === t.parentPhone);
    if (parent) notify(D, parent.id, 'Kết quả học thử đã sẵn sàng', `Ba mẹ có thể xem kết quả học thử của bé ${t.studentName}.`);
    return { suggestCreateProfile: decision === 'Đăng ký chính thức', trial: t };
  }),
};

// ============================================================================
// 4. HỒ SƠ HỌC VIÊN  (GET/POST/PUT /api/students, POST /api/students/{id}/reserve|restore)
// ============================================================================
const PHONE_RE = /^0\d{9}$/;
export function validateStudent(f) {
  const e = {};
  const ce = validateChild(f.fullName, f.dob);
  if (ce.name) e.fullName = ce.name; if (ce.dob) e.dob = ce.dob;
  if (!f.gender) e.gender = 'Vui lòng chọn giới tính';
  if (!f.parentName?.trim()) e.parentName = 'Vui lòng nhập họ tên phụ huynh';
  if (!PHONE_RE.test(f.parentPhone || '')) e.parentPhone = 'Số điện thoại gồm đúng 10 chữ số và bắt đầu bằng số 0';
  if (!f.program) e.program = 'Vui lòng chọn chương trình học';
  else if (f.dob && !ce.dob && suggestProgram(f.dob) !== f.program) e.program = 'Chương trình học không phù hợp độ tuổi (Cơ bản 5–6 tuổi, Nâng cao 7–15 tuổi)';
  return e;
}
const dupStudent = (D, f, exceptId) => D.students.find((s) => s.id !== exceptId && s.fullName.trim().toLowerCase() === f.fullName.trim().toLowerCase() && s.dob === f.dob && s.parentPhone === f.parentPhone);
const stuView = (D, s) => {
  const p = D.progress.filter((x) => x.studentId === s.id).sort((a, b) => b.evalDate.localeCompare(a.evalDate))[0] || null;
  const numId = parseInt(String(s.id || s.code || '').replace(/\D/g, '') || '4', 10);
  const attended = Object.values(D.attendance || {}).filter((att) => att?.records?.[s.id] === 'present').length || ((numId % 3) + 3);
  return {
    ...s,
    age: ageOn(s.dob),
    classes: s.classIds.map((c) => ({ ...cls(D, c), teacher: teacherName(D, cls(D, c).teacherId) })),
    remaining: remaining(D, s.id, monthKey(todayISO())),
    monthTotal: D.tuition.find((x) => x.studentId === s.id && x.month === monthKey(todayISO()))?.total || 0,
    attended,
    progress: p ? { ...p, attended } : { status: 'Đúng tiến độ', evalDate: todayISO(), attended }
  };
};

export const students = {
  search: read((D, { q = '', status = '', program = '' } = {}) => {
    need(D, ...OPS); const k = q.trim().toLowerCase();
    return D.students.filter((s) => (!status || s.status === status) && (!program || s.program === program) && (!k || s.fullName.toLowerCase().includes(k) || s.code.toLowerCase().includes(k) || s.parentPhone.includes(k))).map((s) => stuView(D, s));
  }),
  get: read((D, id) => { need(D, ...OPS); const s = stu(D, id); if (!s) fail('Không tìm thấy hồ sơ học viên'); return stuView(D, s); }),
  create: write((D, f, fromTrialId) => {
    const u = need(D, ...OPS); const e = validateStudent(f);
    if (Object.keys(e).length) { const er = new ApiError('Vui lòng nhập đầy đủ và đúng thông tin!'); er.fields = e; throw er; }
    const dup = dupStudent(D, f); if (dup) { const er = new ApiError('Hồ sơ học viên đã tồn tại'); er.existing = stuView(D, dup); throw er; }
    const n = D.students.length + 1;
    const s = { id: nid('s'), code: `HV${String(n).padStart(4, '0')}`, fullName: f.fullName.trim(), dob: f.dob, gender: f.gender, parentName: f.parentName.trim(), parentPhone: f.parentPhone, program: f.program, status: 'Chờ xếp lớp', classIds: [], prevClassIds: [], createdAt: Date.now(), trialId: fromTrialId || null };
    D.students.push(s); log(D, 'student', s.id, u.id, '', 'Chờ xếp lớp', 'Tạo mới hồ sơ');
    if (!D.users.find((x) => x.role === 'parent' && x.phone === s.parentPhone)) D.users.push({ id: `u_ph_${s.parentPhone}`, role: 'parent', username: s.parentPhone, email: '', password: randomPw(), fullName: s.parentName, phone: s.parentPhone, locked: false, mustChangePassword: true });
    return stuView(D, s);
  }),
  update: write((D, id, f) => {
    const u = need(D, ...OPS); const s = stu(D, id); if (!s) fail('Không tìm thấy hồ sơ học viên');
    const e = validateStudent(f);
    if (Object.keys(e).length) { const er = new ApiError('Thông tin không hợp lệ. Vui lòng kiểm tra lại!'); er.fields = e; throw er; }
    if (dupStudent(D, f, id)) { const er = new ApiError('Thông tin trùng với một hồ sơ học viên khác'); er.fields = { fullName: 'Trùng họ tên, ngày sinh và SĐT phụ huynh với hồ sơ khác' }; throw er; }
    const fields = ['fullName', 'dob', 'gender', 'parentName', 'parentPhone', 'program']; let changed = 0;
    fields.forEach((k) => { const nv = typeof f[k] === 'string' ? f[k].trim() : f[k]; if (s[k] !== nv) { log(D, 'student', s.id, u.id, String(s[k]), String(nv), k); s[k] = nv; changed++; } });
    return { changed, student: stuView(D, s) }; // BR-UC6-16: không đổi gì thì không ghi lịch sử
  }),
  reserve: write((D, id) => {
    const u = need(D, ...OPS); const s = stu(D, id);
    if (!s) fail(MSG_SYS); if (s.status === 'Đã bảo lưu') fail('Hồ sơ học viên đã được bảo lưu');
    log(D, 'student', s.id, u.id, s.status, 'Đã bảo lưu', 'Bảo lưu'); s.prevClassIds = [...s.classIds]; s.classIds = []; s.status = 'Đã bảo lưu'; return stuView(D, s);
  }),
  restore: write((D, id) => {
    const u = need(D, ...OPS); const s = stu(D, id);
    if (!s || s.status !== 'Đã bảo lưu') fail('Hồ sơ học viên không ở trạng thái bảo lưu');
    log(D, 'student', s.id, u.id, 'Đã bảo lưu', 'Chờ xếp lớp', 'Khôi phục'); s.status = 'Chờ xếp lớp'; return stuView(D, s);
  }),
  // 3a (UC 6.1): đơn học thử đã tư vấn với quyết định "Đăng ký chính thức" chưa có hồ sơ
  trialCandidates: read((D) => { need(D, ...OPS); return D.trials.filter((t) => t.status === 'Đã tư vấn' && t.consult?.decision === 'Đăng ký chính thức' && !D.students.some((s) => s.trialId === t.id)).map((t) => ({ id: t.id, fullName: t.studentName, dob: t.dob, parentPhone: t.parentPhone, program: t.program || suggestProgram(t.dob) })); }),
  history: read((D, id) => { need(D, ...OPS); return D.history.filter((h) => h.entity === 'student' && h.entityId === id).sort((a, b) => b.at - a.at).map((h) => ({ ...h, byName: usr(D, h.by)?.fullName || h.by })); }),
};

// ============================================================================
// 5. LỚP HỌC  (GET/POST/PUT /api/classes, POST /api/classes/{id}/enroll, POST /api/classes/{id}/teacher)
// ============================================================================
export function validateClass(f, D, exceptId) {
  const e = {};
  if (!f.name?.trim()) e.name = 'Thông tin lớp học không hợp lệ, vui lòng kiểm tra lại';
  else if (D.classes.some((c) => c.id !== exceptId && c.name.trim().toLowerCase() === f.name.trim().toLowerCase())) e.name = 'Tên lớp đã tồn tại, vui lòng chọn tên khác'; // BR-UC7-05
  if (!f.program) e.program = 'Vui lòng chọn chương trình học';
  const days = (f.days || []).map(Number);
  if (!days.length || !f.start || !f.end) e.days = 'Vui lòng chọn lịch học';
  else if (days.includes(5)) e.days = 'Trung tâm nghỉ Thứ 6, không thể tạo lớp vào Thứ 6'; // BR-UC7-04
  else if (!isValidSchedule(days, f.start, f.end)) e.days = 'Lịch học không thuộc khung lịch của trung tâm';
  else if (toMin(f.end) <= toMin(f.start)) e.days = 'Giờ kết thúc phải sau giờ bắt đầu';
  const cap = Number(f.capacity);
  if (!cap || cap < 1) e.capacity = 'Vui lòng nhập sĩ số tối đa'; else if (cap > MAX_CLASS) e.capacity = `Sĩ số tối đa không vượt quá ${MAX_CLASS} học viên`;
  else if (exceptId) { const cur = D.students.filter((s) => s.status === 'Đang học' && s.classIds.includes(exceptId)).length; if (cap < cur) e.capacity = 'Sĩ số tối đa không được nhỏ hơn số học viên hiện có'; }
  return e;
}
const classView = (D, c) => ({ ...c, schedule: schedText(c), code: `LH${String(D.classes.indexOf(c) + 1).padStart(3, '0')}`, teacher: teacherName(D, c.teacherId), size: D.students.filter((s) => s.status === 'Đang học' && s.classIds.includes(c.id)).length, members: D.students.filter((s) => s.status === 'Đang học' && s.classIds.includes(c.id)).map((s) => ({ id: s.id, fullName: s.fullName, code: s.code })) });
export const classes = {
  list: read((D) => { need(D, ...OPS, 'supervisor', 'teacher'); return D.classes.map((c) => classView(D, c)).sort((a, b) => ((daysOf(a)[0] + 6) % 7) - ((daysOf(b)[0] + 6) % 7) || a.start.localeCompare(b.start)); }),
  teachers: read((D) => { need(D, ...OPS); return D.users.filter((u) => u.role === 'teacher' && !u.locked).map((u) => ({ id: u.id, name: teacherName(D, u.id) })); }),
  create: write((D, f) => {
    need(D, ...OPS); const e = validateClass(f, D);
    if (Object.keys(e).length) { const er = new ApiError('Thông tin lớp học không hợp lệ, vui lòng kiểm tra lại'); er.fields = e; throw er; }
    const letter = 'ABCDEFGH'[D.classes.filter((c) => c.program === f.program && shareDay(c, { days: f.days.map(Number) }) && c.start === f.start).length] || 'Z';
    const c = { id: nid('c'), name: f.name.trim(), program: f.program, days: f.days.map(Number), start: f.start, end: f.end, capacity: Number(f.capacity), teacherId: null, letter };
    D.classes.push(c); return classView(D, c);
  }),
  update: write((D, id, f) => {
    need(D, ...OPS); const c = cls(D, id); if (!c) fail(MSG_SYS);
    const e = validateClass(f, D, id);
    if (Object.keys(e).length) { const er = new ApiError('Thông tin lớp học không hợp lệ. Vui lòng kiểm tra lại'); er.fields = e; throw er; }
    Object.assign(c, { name: f.name.trim(), program: f.program, days: f.days.map(Number), start: f.start, end: f.end, capacity: Number(f.capacity) }); return classView(D, c);
  }),
  // Lớp còn chỗ, cùng chương trình, không trùng lịch học của học viên (BR-UC7-09/10/11)
  openFor: read((D, sid) => {
    need(D, ...OPS); const s = stu(D, sid);
    const mine = s.classIds.map((x) => cls(D, x));
    return D.classes.filter((c) => c.program === s.program && classView(D, c).size < c.capacity).map((c) => ({ ...classView(D, c), conflict: mine.some((m) => shareDay(m, c) && overlaps(m, c)) }));
  }),
  enroll: write((D, sid, cid) => {
    const u = need(D, ...OPS); const s = stu(D, sid); const c = cls(D, cid);
    if (!s || !c) fail(MSG_SYS);
    if (s.status !== 'Chờ xếp lớp') fail('Chỉ học viên ở trạng thái Chờ xếp lớp mới được xếp lớp');
    if (classView(D, c).size >= c.capacity) fail('Lớp học đã đủ sĩ số, vui lòng chọn lớp khác');
    if (s.classIds.map((x) => cls(D, x)).some((m) => shareDay(m, c) && overlaps(m, c))) fail('Lịch học bị trùng. Vui lòng chọn lớp khác');
    s.classIds.push(cid); s.status = 'Đang học'; log(D, 'student', s.id, u.id, 'Chờ xếp lớp', 'Đang học', `Xếp vào ${c.name}`); return true;
  }),
  // Giáo viên kèm lịch dạy (UC 7.4)
  teachersFor: read((D, cid) => {
    need(D, ...OPS); const c = cls(D, cid);
    return D.users.filter((u) => u.role === 'teacher' && !u.locked).map((u) => {
      const sched = D.classes.filter((x) => x.teacherId === u.id);
      return { id: u.id, name: teacherName(D, u.id), schedule: sched.map((x) => schedText(x)).join('; ') || 'Chưa có lịch', conflict: sched.some((x) => x.id !== cid && shareDay(x, c) && overlaps(x, c)) };
    });
  }),
  assignTeacher: write((D, cid, tid) => {
    need(D, ...OPS); const c = cls(D, cid);
    if (!tid) fail('Vui lòng chọn giáo viên phụ trách');
    if (D.classes.some((x) => x.id !== cid && x.teacherId === tid && shareDay(x, c) && overlaps(x, c))) fail('Giáo viên đã có lịch dạy trùng, vui lòng chọn giáo viên khác');
    c.teacherId = tid; return classView(D, c);
  }),
  // Lưới lịch tuần (Calendar view)
  week: read((D, from) => {
    need(D, ...OPS, 'supervisor');
    const start = startOfWeek(from || todayISO()); const days = [];
    for (let i = 0; i < 7; i++) {
      const d = addDays(start, i);
      days.push({ date: d, weekday: weekdayOf(d), closed: weekdayOf(d) === 5, sessions: D.classes.filter((c) => meets(c, weekdayOf(d))).sort((a, b) => a.start.localeCompare(b.start)).map((c) => ({ ...info(D, sk(c.id, d)), load: load(D, sk(c.id, d)) })) });
    }
    return { start, days };
  }),
};

// ============================================================================
// 6. ĐIỀU PHỐI LỊCH HỌC BÙ – TRỢ LÝ  (POST /api/absences, GET /api/absences?status=..., POST .../{id}/makeup, .../submit)
// ============================================================================
const absView = (D, a) => { const s = stu(D, a.studentId); const i = info(D, a.sessionKey); return { ...a, student: { id: s.id, fullName: s.fullName, code: s.code, program: s.program, parentPhone: s.parentPhone }, session: i, makeupInfo: a.makeup ? { ...info(D, a.makeup), load: load(D, a.makeup) } : null, daysLeft: diffDays(a.deadline, todayISO()) }; };
function createAbsence(D, s, key, reason, by) {
  if (!D.classes.length || !s.classIds.includes(split(key).classId)) fail('Ca học không thuộc lịch của học viên');
  if (D.absences.some((a) => a.studentId === s.id && a.sessionKey === key)) fail('Buổi học này đã được gửi đơn xin nghỉ trước đó'); // BR-UC3-05
  const m = split(key).date.slice(0, 7);
  if (remaining(D, s.id, m) <= 0) fail('Học viên đã hết số buổi học còn lại. Ba mẹ vui lòng liên hệ Trợ lý để được hỗ trợ'); // BR-UC3-06
  const a = { id: nid('a'), studentId: s.id, sessionKey: key, reason: (reason || '').trim(), status: 'Chờ xếp lịch bù', deadline: addDays(split(key).date, MAKEUP_DAYS), makeup: null, createdAt: Date.now(), createdBy: by };
  D.absences.push(a); return a;
}
export const makeup = {
  students: read((D) => { need(D, ...OPS); return D.students.filter((s) => s.status === 'Đang học').map((s) => ({ id: s.id, code: s.code, fullName: s.fullName, program: s.program, status: s.status, classNames: s.classIds.map((c) => `${s.program} ${patternShort(cls(D, c))}`).join(', ') })); }),
  // Ca có thể ghi nhận nghỉ: chưa diễn ra, hoặc đã diễn ra + điểm danh vắng + chưa quá hạn bù (BR-UC8-02)
  recordable: read((D, sid) => {
    need(D, ...OPS); const s = stu(D, sid); const t = todayISO(); const out = nextSessions(D, s, 14).map((k) => info(D, k));
    Object.entries(D.attendance).forEach(([k, att]) => {
      if (att.finalized && att.records[sid] === 'absent' && s.classIds.includes(split(k).classId) && diffDays(addDays(split(k).date, MAKEUP_DAYS), t) >= 0) out.unshift({ ...info(D, k), unrecorded: true });
    });
    return out.map((i) => ({ ...i, recorded: D.absences.some((a) => a.studentId === sid && a.sessionKey === i.key), remaining: remaining(D, sid, i.date.slice(0, 7)) }));
  }),
  record: write((D, sid, key, reason) => {
    const u = need(D, ...OPS); const s = stu(D, sid); if (!s) fail(MSG_SYS);
    const a = createAbsence(D, s, key, reason, u.id);
    notifyParent(D, s, 'Ghi nhận học viên nghỉ', `Bé ${s.fullName} nghỉ ca ${sessionLabel(D, key)}. Ba mẹ có thể đăng ký học bù trong 30 ngày.`);
    return absView(D, a);
  }),
  pending: read((D) => { need(D, ...OPS); const t = todayISO(); return D.absences.filter((a) => ['Chờ xếp lịch bù', 'Đã đăng ký học bù'].includes(a.status) || (a.status === 'Hết hạn' && diffDays(t, a.deadline) <= 7)).sort((x, y) => x.deadline.localeCompare(y.deadline)).map((a) => absView(D, a)); }),
  options: read((D, id) => { need(D, ...OPS, 'parent'); const a = D.absences.find((x) => x.id === id); if (!a) fail(MSG_SYS); return availableMakeups(D, a); }),
  // Trợ lý chọn ca thay phụ huynh (BR-UC8-08) – giữ chỗ giống phụ huynh tự đăng ký
  pick: write((D, id, key) => {
    need(D, ...OPS); const a = D.absences.find((x) => x.id === id);
    if (!a) fail(MSG_SYS);
    if (a.status === 'Hết hạn') fail('Yêu cầu học bù này đã quá thời hạn học bù nên không thể đăng ký');
    if (a.status !== 'Chờ xếp lịch bù') fail('Yêu cầu này đã được thay đổi, không thể chọn ca');
    if (!availableMakeups(D, a).some((o) => o.key === key)) fail('Ca học này vừa hết chỗ. Vui lòng chọn ca khác');
    a.makeup = key; a.status = 'Đã đăng ký học bù'; return absView(D, a);
  }),
  submit: write((D, id) => {
    const u = need(D, ...OPS); const a = D.absences.find((x) => x.id === id);
    if (!a) fail(MSG_SYS); if (a.status === 'Hết hạn') fail('Yêu cầu học bù này đã quá thời hạn học bù nên không thể xử lý');
    if (a.status !== 'Đã đăng ký học bù') fail('Yêu cầu này đã được thay đổi, không thể trình duyệt');
    a.status = 'Chờ duyệt'; log(D, 'absence', a.id, u.id, 'Đã đăng ký học bù', 'Chờ duyệt', 'Trình duyệt');
    notifyRole(D, 'manager', 'Có đề xuất xếp lịch bù chờ phê duyệt', `${stu(D, a.studentId).fullName} – bù ${sessionLabel(D, a.makeup)}`);
    return absView(D, a);
  }),
};

// ============================================================================
// 7. HỌC PHÍ  (GET /api/tuition?student=&month=&status=, POST /api/tuition/record)
// ============================================================================
export const tuition = {
  search: read((D, { q = '', month = monthKey(todayISO()), status = '' } = {}) => {
    need(D, ...OPS); const k = q.trim().toLowerCase();
    return D.students.filter((s) => s.status === 'Đang học' && (!k || s.fullName.toLowerCase().includes(k) || s.code.toLowerCase().includes(k))).map((s) => {
      const tu = D.tuition.find((x) => x.studentId === s.id && x.month === month);
      return { studentId: s.id, code: s.code, fullName: s.fullName, program: s.program, parentPhone: s.parentPhone, month, amount: PRICE[s.program], status: tu ? tu.status : 'Chưa thanh toán', total: tu?.total ?? 0, remaining: remaining(D, s.id, month) };
    }).filter((r) => !status || r.status === status);
  }),
  record: write((D, sid, month) => {
    const u = need(D, ...OPS); const s = stu(D, sid);
    if (!s) fail(MSG_SYS); if (!month) fail('Vui lòng chọn tháng', 'month');
    let tu = D.tuition.find((x) => x.studentId === sid && x.month === month);
    if (tu?.status === 'Đã thanh toán') fail('Học phí tháng này đã được ghi nhận');
    const total = s.classIds.reduce((acc, cid) => acc + daysOf(cls(D, cid)).reduce((n, w) => n + countWeekdayInMonth(w, month), 0), 0);
    if (!tu) { tu = { studentId: sid, month, amount: PRICE[s.program], total, status: 'Chưa thanh toán', paidAt: null }; D.tuition.push(tu); }
    tu.status = 'Đã thanh toán'; tu.total = total; tu.paidAt = Date.now(); log(D, 'tuition', `${sid}|${month}`, u.id, 'Chưa thanh toán', 'Đã thanh toán', month);
    return true;
  }),
};

// ============================================================================
// 8. TIẾN ĐỘ HỌC TẬP – TRỢ LÝ  (POST /api/progress, GET /api/progress/history, GET /api/progress/need-review)
// ============================================================================
export const progress = {
  openSessions: read((D, sid) => {
    need(D, ...OPS); const s = stu(D, sid); const out = [];
    Object.entries(D.attendance).forEach(([k]) => { if (s.classIds.includes(split(k).classId) && !D.progress.some((p) => p.studentId === sid && p.sessionKey === k)) out.push(info(D, k)); });
    return out.filter((i) => i.ended).sort((a, b) => b.date.localeCompare(a.date));
  }),
  record: write((D, sid, key, evalDate, status) => {
    const u = need(D, ...OPS); const e = {};
    if (!evalDate) e.evalDate = 'Vui lòng nhập đầy đủ thông tin!';
    if (!status) e.status = 'Vui lòng nhập đầy đủ thông tin!';
    if (Object.keys(e).length) { const er = new ApiError('Vui lòng nhập đầy đủ thông tin!'); er.fields = e; throw er; }
    const i = info(D, key); if (!i.ended) fail('Chỉ ghi nhận tiến độ cho ca học đã kết thúc');
    if (evalDate < i.date || evalDate > todayISO()) { const er = new ApiError('Ngày đánh giá không hợp lệ!'); er.fields = { evalDate: 'Ngày đánh giá không hợp lệ!' }; throw er; }
    if (D.progress.some((p) => p.studentId === sid && p.sessionKey === key)) fail('Ca học này đã được ghi nhận tiến độ');
    D.progress.push({ id: nid('p'), studentId: sid, sessionKey: key, evalDate, status, teacherId: i.teacherId, by: u.id, at: Date.now() }); return true;
  }),
  history: read((D, { q = '', program = '', status = '' } = {}) => {
    need(D, ...OPS); const k = q.trim().toLowerCase();
    return D.students.filter((s) => (!k || s.fullName.toLowerCase().includes(k) || s.code.toLowerCase().includes(k)) && (!program || s.program === program) && (!status || s.status === status)).map((s) => ({ id: s.id, code: s.code, fullName: s.fullName, program: s.program, status: s.status, count: D.progress.filter((p) => p.studentId === s.id).length }));
  }),
  historyOf: read((D, sid) => {
    need(D, ...OPS); const s = stu(D, sid);
    return D.progress.filter((p) => p.studentId === sid).sort((a, b) => b.evalDate.localeCompare(a.evalDate)).map((p) => {
      const j = D.journal.find((x) => x.studentId === sid && x.sessionKey === p.sessionKey);
      return { ...p, program: s.program, session: info(D, p.sessionKey), teacher: teacherName(D, p.teacherId), byName: usr(D, p.by)?.fullName, comment: j?.comment || null };
    });
  }),
  needReview: read((D, { program = '', classId = '', teacherId = '' } = {}) => {
    need(D, ...OPS);
    return D.students.filter((s) => s.status === 'Đang học').map((s) => {
      const last = D.progress.filter((p) => p.studentId === s.id).sort((a, b) => b.evalDate.localeCompare(a.evalDate) || b.at - a.at)[0];
      return { s, last };
    }).filter(({ last }) => last && last.status === 'Chậm tiến độ').flatMap(({ s, last }) => s.classIds.map((cid) => ({ s, last, c: cls(D, cid) })))
      .filter(({ s, c }) => (!program || s.program === program) && (!classId || c.id === classId) && (!teacherId || c.teacherId === teacherId))
      .map(({ s, last, c }) => ({ studentId: s.id, fullName: s.fullName, program: s.program, className: c.name, teacher: teacherName(D, c.teacherId), status: last.status, lastEval: last.evalDate }));
  }),
};

// ============================================================================
// 9. QUẢN LÝ – PHÊ DUYỆT & BÁO CÁO  (POST /api/manager/trial-sessions/{key}/approve|reject, /makeups/{id}/approve ...)
// ============================================================================
export const approvals = {
  trialSessions: read((D) => {
    need(D, 'manager'); const g = {};
    D.trials.filter((t) => t.status === 'Chờ duyệt ca học thử').forEach((t) => { (g[t.session] ||= []).push(t); });
    return Object.entries(g).map(([key, ts]) => ({ ...info(D, key), load: load(D, key), students: ts.map((t) => ({ id: t.id, name: t.studentName, dob: t.dob, program: t.program })) })).sort((a, b) => a.date.localeCompare(b.date));
  }),
  approveTrial: write((D, key) => {
    need(D, 'manager'); const ts = D.trials.filter((t) => t.session === key && t.status === 'Chờ duyệt ca học thử');
    if (!ts.length) fail('Ca học thử này đã được thay đổi nên không thể xử lý');
    if (load(D, key).base > MAX_CLASS) fail('Ca học thử vượt sĩ số tối đa nên không thể phê duyệt');
    ts.forEach((t) => {
      t.status = 'Đã xếp ca';
      const p = D.users.find((x) => x.role === 'parent' && x.phone === t.parentPhone);
      if (p) notify(D, p.id, 'Lịch học thử đã được xác nhận', `Bé ${t.studentName}: ${sessionLabel(D, key)}.`);
    });
    notify(D, info(D, key).teacherId, 'Có học viên học thử mới trong ca của bạn', `${ts.map((t) => t.studentName).join(', ')} – ${sessionLabel(D, key)}`);
    return true;
  }),
  rejectTrial: write((D, key) => {
    need(D, 'manager'); const ts = D.trials.filter((t) => t.session === key && t.status === 'Chờ duyệt ca học thử');
    if (!ts.length) fail('Ca học thử này đã được thay đổi nên không thể xử lý');
    ts.forEach((t) => { t.status = 'Đã tiếp nhận'; t.session = null; }); // BR-UC5-07
    notifyRole(D, 'assistant', 'Ca học thử không được duyệt', 'Vui lòng chọn ca đề xuất khác cho các học viên học thử.');
    return true;
  }),
  makeups: read((D) => { need(D, 'manager'); return D.absences.filter((a) => a.status === 'Chờ duyệt').map((a) => absView(D, a)); }),
  approveMakeup: write((D, id) => {
    const u = need(D, 'manager'); const a = D.absences.find((x) => x.id === id);
    if (!a) fail(MSG_SYS);
    if (a.status === 'Hết hạn') fail('Đề xuất này đã quá hạn học bù nên không thể xử lý');
    if (a.status !== 'Chờ duyệt') fail('Đề xuất này đã được thay đổi nên không thể xử lý');
    a.status = 'Đã xếp lịch bù'; log(D, 'absence', a.id, u.id, 'Chờ duyệt', a.status, 'Phê duyệt');
    const s = stu(D, a.studentId); notifyParent(D, s, 'Lịch học bù đã được phê duyệt', `Bé ${s.fullName} học bù: ${sessionLabel(D, a.makeup)}.`);
    notify(D, info(D, a.makeup).teacherId, 'Có học viên học bù trong ca của bạn', `${s.fullName} – ${sessionLabel(D, a.makeup)}`); return true;
  }),
  rejectMakeup: write((D, id) => {
    const u = need(D, 'manager'); const a = D.absences.find((x) => x.id === id);
    if (!a) fail(MSG_SYS); if (a.status === 'Hết hạn') fail('Đề xuất này đã quá hạn học bù nên không thể xử lý');
    if (a.status !== 'Chờ duyệt') fail('Đề xuất này đã được thay đổi nên không thể xử lý');
    a.status = 'Chờ xếp lịch bù'; a.makeup = null; log(D, 'absence', a.id, u.id, 'Chờ duyệt', a.status, 'Không duyệt');
    notifyRole(D, 'assistant', 'Đề xuất học bù không được duyệt', `${stu(D, a.studentId).fullName} cần được chọn lại ca học bù.`); return true;
  }),
};

const rangeOf = ({ mode = 'week', from, to } = {}) => {
  const t = todayISO();
  if (from && to) return { from, to };
  if (mode === 'month') return { from: `${monthKey(t)}-01`, to: t };
  return { from: startOfWeek(t), to: t };
};
export const reports = {
  students: read((D, f) => {
    need(D, 'manager'); const r = rangeOf(f);
    if (r.from > r.to) fail('Khoảng thời gian không hợp lệ');
    const ts = (d) => new Date(`${d}T00:00:00`).getTime();
    const fromTs = ts(r.from), toTs = ts(addDays(r.to, 1));
    const sel = D.students;
    const newC = sel.filter((s) => s.createdAt >= fromTs && s.createdAt < toTs && s.status !== 'Đã bảo lưu').length;
    const reserved = sel.filter((s) => s.status === 'Đã bảo lưu').length;
    const old = sel.filter((s) => s.createdAt < fromTs && s.status !== 'Đã bảo lưu').length;
    const total = sel.length;
    if (!total) fail('Không có dữ liệu thống kê trong khoảng thời gian này');
    const series = []; // học viên (mới + đang theo học) theo từng tuần trong khoảng thời gian (Figma: "Học viên theo tuần trong tháng")
    for (let w0 = r.from, i = 1; w0 <= r.to && i <= 10; w0 = addDays(w0, 7), i++) { const b = ts(addDays(w0, 7)); series.push({ label: `Tuần ${i}`, value: sel.filter((s) => s.createdAt < b && s.status !== 'Đã bảo lưu').length }); }
    return { ...r, newCount: newC, oldCount: old, reservedCount: reserved, total, series };
  }),
  operations: read((D, f = {}) => {
    need(D, 'manager'); const r = rangeOf(f);
    const rows = Object.entries(D.attendance).filter(([k, a]) => a.finalized && split(k).date >= r.from && split(k).date <= r.to && (!f.classId || split(k).classId === f.classId));
    if (!rows.length) fail('Không có dữ liệu báo cáo vận hành trong khoảng thời gian này');
    let present = 0, recs = 0, excused = 0, unexcused = 0; const byClass = {};
    rows.forEach(([k, a]) => {
      const c = cls(D, split(k).classId); const b = (byClass[c.id] ||= { name: `${c.name}`, present: 0, recs: 0, sessions: 0 });
      b.sessions++;
      Object.entries(a.records).forEach(([sid, v]) => {
        recs++; b.recs++;
        if (v === 'present') { present++; b.present++; } else if (D.absences.some((x) => x.studentId === sid && x.sessionKey === k)) excused++; else unexcused++;
      });
    });
    return { ...r, sessions: rows.length, avgSize: recs / rows.length, rate: recs ? (present / recs) * 100 : 0, excused, unexcused, makeups: D.absences.filter((a) => a.status === 'Đã xếp lịch bù').length, byClass: Object.values(byClass).map((b) => ({ ...b, rate: b.recs ? (b.present / b.recs) * 100 : 0 })) };
  }),
  tuitionAlert: read((D, { n = 2, status = '' } = {}) => {
    need(D, 'manager'); const m = monthKey(todayISO());
    const rows = D.students.filter((s) => s.status === 'Đang học').map((s) => {
      const tu = D.tuition.find((x) => x.studentId === s.id && x.month === m);
      return { studentId: s.id, fullName: s.fullName, program: s.program, parentPhone: s.parentPhone, remaining: remaining(D, s.id, m), status: tu ? tu.status : 'Chưa thanh toán', amount: PRICE[s.program] };
    }).filter((r) => r.remaining <= Number(n) && (!status || r.status === status));
    if (!rows.length) fail('Hiện tại không có học viên nào thuộc diện cảnh báo học phí');
    return rows;
  }),
};

// ============================================================================
// 10. TỔNG QUAN (dashboard) cho Trợ lý / Quản lý / Giám sát
// ============================================================================
const sessionsOn = (D, date, teacherId) => D.classes.filter((c) => meets(c, weekdayOf(date)) && (!teacherId || c.teacherId === teacherId)).sort((a, b) => a.start.localeCompare(b.start)).map((c) => ({ ...info(D, sk(c.id, date)), load: load(D, sk(c.id, date)) }));
function tuitionAlertRows(D, n = 2) {
  const m = monthKey(todayISO());
  return D.students.filter((s) => s.status === 'Đang học').map((s) => { const tu = D.tuition.find((x) => x.studentId === s.id && x.month === m); return { id: s.id, fullName: s.fullName, program: s.program, remaining: remaining(D, s.id, m), status: tu ? tu.status : 'Chưa thanh toán', amount: PRICE[s.program] }; }).filter((r) => r.remaining <= n).sort((a, b) => a.remaining - b.remaining);
}
function reviewOf(D, key) {
  const i = info(D, key); const att = D.attendance[key];
  const present = att ? Object.keys(att.records).filter((id) => att.records[id] === 'present') : [];
  const items = D.journal.filter((j) => j.sessionKey === key && present.includes(j.studentId));
  const photoOk = present.length > 0 && present.every((id) => items.some((j) => j.studentId === id && j.photo));
  const commentOk = present.length > 0 && present.every((id) => items.some((j) => j.studentId === id && j.comment));
  const overdue = i.date < todayISO() && (!photoOk || !commentOk);
  const miss = []; if (!photoOk) miss.push('Chưa đăng ảnh tác phẩm'); if (!commentOk) miss.push('Chưa nhập nhận xét');
  return { ...i, size: att ? Object.keys(att.records).length : load(D, key).official, photo: photoOk ? 'Đã đăng' : 'Chưa đăng', comment: commentOk ? 'Đã nhập' : 'Chưa nhập', compliance: overdue ? 'Quá hạn' : 'Đúng hạn', complete: photoOk && commentOk, missing: miss.join(', ').replace('Chưa đăng ảnh tác phẩm, Chưa nhập nhận xét', 'Chưa đăng ảnh tác phẩm, chưa nhập nhận xét'), reminder: D.reminders[key]?.status || 'Chưa gửi nhắc nhở' };
}
export const overview = {
  assistant: read((D) => {
    need(D, ...OPS); const t = todayISO(); const week = [];
    for (let i = 0; i < 7; i++) { const d = addDays(startOfWeek(t), i); if (d <= t) D.classes.filter((c) => meets(c, weekdayOf(d))).forEach((c) => { if (isEnded(d, c.end)) week.push(sk(c.id, d)); }); }
    const needProg = new Set(); week.forEach((k) => { const att = D.attendance[k]; if (att) Object.keys(att.records).forEach((sid) => { if (att.records[sid] === 'present' && !D.progress.some((p) => p.studentId === sid && p.sessionKey === k)) needProg.add(sid); }); });
    return { waiting: D.trials.filter((x) => x.status === 'Chờ tiếp nhận').length, todaySessions: sessionsOn(D, t), tuitionAlerts: tuitionAlertRows(D).length, progressDue: needProg.size, todayLabel: t };
  }),
  manager: read((D) => {
    need(D, 'manager'); const t = todayISO(); const m = monthKey(t);
    const trialS = []; const g = {}; D.trials.filter((x) => x.status === 'Chờ duyệt ca học thử').forEach((x) => { (g[x.session] ||= []).push(x); });
    Object.keys(g).forEach((k) => trialS.push({ type: 'Ca học thử', key: k, info: info(D, k), load: load(D, k) }));
    const mk = D.absences.filter((a) => a.status === 'Chờ duyệt').map((a) => absView(D, a));
    const fromTs = new Date(`${startOfWeek(t)}T00:00:00`).getTime();
    const ops = Object.entries(D.attendance).filter(([k, a]) => a.finalized && split(k).date >= startOfWeek(t) && split(k).date <= t);
    let present = 0, recs = 0, exc = 0, une = 0; ops.forEach(([k, a]) => Object.entries(a.records).forEach(([sid, v]) => { recs++; if (v === 'present') present++; else if (D.absences.some((x) => x.studentId === sid && x.sessionKey === k)) exc++; else une++; }));
    const alerts = tuitionAlertRows(D);
    return {
      trialPending: trialS, makeupPending: mk, tuitionAlerts: alerts.length, alertRows: alerts.slice(0, 5),
      students: { total: D.students.length, fresh: D.students.filter((s) => s.createdAt >= fromTs && s.status !== 'Đã bảo lưu').length, reserved: D.students.filter((s) => s.status === 'Đã bảo lưu').length, old: D.students.filter((s) => s.createdAt < fromTs && s.status !== 'Đã bảo lưu').length },
      ops: { sessions: ops.length, avg: ops.length ? recs / ops.length : 0, rate: recs ? (present / recs) * 100 : 0, exc, une, makeups: D.absences.filter((a) => a.status === 'Đã xếp lịch bù').length }, month: m,
    };
  }),
  supervisor: read((D) => {
    need(D, 'supervisor'); const t = todayISO();
    const endedToday = sessionsOn(D, t).filter((s) => s.ended).map((s) => reviewOf(D, s.key));
    const viol = []; for (let i = 1; i <= 14; i++) { const d = addDays(t, -i); D.classes.filter((c) => meets(c, weekdayOf(d))).forEach((c) => { const r = reviewOf(D, sk(c.id, d)); if (D.attendance[r.key] && r.compliance === 'Quá hạn') viol.push(r); }); }
    return { endedToday, violations: viol.sort((a, b) => b.date.localeCompare(a.date)), noPhoto: endedToday.filter((r) => r.photo === 'Chưa đăng').length, noComment: endedToday.filter((r) => r.comment === 'Chưa nhập').length };
  }),
};

// ============================================================================
// 11. GIÁM SÁT  (GET /api/supervisor/reviews, POST /api/supervisor/reminders)
// ============================================================================
export const supervisor = {
  teachers: read((D) => { need(D, 'supervisor'); return D.users.filter((u) => u.role === 'teacher' && !u.locked).map((u) => ({ id: u.id, name: teacherName(D, u.id) })); }),
  review: read((D, { teacherId = '', range = 'week', state = '' } = {}) => {
    need(D, 'supervisor'); const t = todayISO();
    const from = range === 'today' ? t : range === 'month' ? `${monthKey(t)}-01` : range === 'all' ? addDays(t, -30) : startOfWeek(t);
    const rows = [];
    for (let d = from; d <= t; d = addDays(d, 1)) D.classes.filter((c) => meets(c, weekdayOf(d)) && (!teacherId || c.teacherId === teacherId) && isEnded(d, c.end)).forEach((c) => rows.push(reviewOf(D, sk(c.id, d))));
    const filtered = rows.filter((r) => !state || (state === 'Thiếu ảnh' && r.photo === 'Chưa đăng') || (state === 'Thiếu nhận xét' && r.comment === 'Chưa nhập') || (state === 'Quá hạn' && r.compliance === 'Quá hạn') || (state === 'Đã hoàn thành' && r.complete)).sort((a, b) => b.date.localeCompare(a.date) || a.start.localeCompare(b.start));
    return { rows: filtered, allDone: rows.length === 0 || rows.every((r) => r.complete) };
  }),
  violations: read((D) => {
    need(D, 'supervisor'); const t = todayISO(); const out = [];
    for (let i = 1; i <= 14; i++) { const d = addDays(t, -i); D.classes.filter((c) => meets(c, weekdayOf(d))).forEach((c) => { const r = reviewOf(D, sk(c.id, d)); if (D.attendance[r.key] && r.compliance === 'Quá hạn') out.push({ ...r, responsible: 'Giáo viên', responsibleName: r.teacher }); }); }
    return out.sort((a, b) => b.date.localeCompare(a.date));
  }),
  remind: write((D, keys) => {
    need(D, 'supervisor'); if (!keys?.length) fail('Vui lòng chọn ca học vi phạm cần nhắc nhở');
    keys.forEach((k) => {
      const r = reviewOf(D, k); if (r.compliance !== 'Quá hạn') fail('Ca học này không còn vi phạm tiến độ');
      notify(D, r.teacherId, 'Nhắc nhở vi phạm tiến độ', `Ca ${r.code} (${fmtDate(r.date)}): ${r.missing}.`);
      D.reminders[k] = { status: 'Đã gửi nhắc nhở', at: Date.now() };
    });
    return keys.length;
  }),
};

// ============================================================================
// 12. GIÁO VIÊN  (GET /api/teacher/sessions, POST /api/teacher/attendance/{key}/finalize, POST /api/teacher/journal ...)
// ============================================================================
function ownSession(D, me, key) {
  const c = cls(D, split(key).classId);
  if (!c || c.teacherId !== me.id) throw new ApiError('Bạn không có quyền thực hiện thao tác này.', null, 403); // BR-UC11-01
  return info(D, key);
}
function roster(D, key) {
  const { classId } = split(key); const out = [];
  D.students.filter((s) => s.status === 'Đang học' && s.classIds.includes(classId)).forEach((s) => out.push({ id: s.id, name: s.fullName, kind: 'Chính thức' }));
  D.absences.filter((a) => a.makeup === key && a.status === 'Đã xếp lịch bù').forEach((a) => out.push({ id: a.studentId, name: stu(D, a.studentId).fullName, kind: 'Học bù' }));
  D.trials.filter((t) => t.session === key && ['Đã xếp ca', 'Đã hoàn thành', 'Đã tư vấn'].includes(t.status)).forEach((t) => out.push({ id: t.id, name: t.studentName, kind: 'Học thử' }));
  return out;
}
const presentOf = (D, key) => { const a = D.attendance[key]; return a?.finalized ? Object.keys(a.records).filter((k) => a.records[k] === 'present') : []; };
export const teacher = {
  today: read((D) => { const me = need(D, 'teacher'); return sessionsOn(D, todayISO(), me.id).map((s) => ({ ...s, finalized: !!D.attendance[s.key]?.finalized, count: roster(D, s.key).length })); }),
  roster: read((D, key) => {
    const me = need(D, 'teacher'); const i = ownSession(D, me, key); const att = D.attendance[key];
    return { session: i, finalized: !!att?.finalized, students: roster(D, key).map((r) => ({ ...r, status: att?.records[r.id] || null, remaining: r.kind === 'Chính thức' ? remaining(D, r.id, i.date.slice(0, 7)) : null })) };
  }),
  // Chốt điểm danh (BR-UC11-03..08). Nhận cả dữ liệu đồng bộ từ hàng đợi ngoại tuyến.
  finalize: write((D, key, records) => {
    const me = need(D, 'teacher'); const i = ownSession(D, me, key); const r = roster(D, key);
    if (!r.length) fail('Ca học này chưa có học viên');
    if (D.attendance[key]?.finalized) fail('Ca học này đã chốt điểm danh');
    if (r.some((x) => !['present', 'absent'].includes(records?.[x.id]))) fail('Vui lòng điểm danh đủ học viên trong ca học!');
    const rec = {}; r.forEach((x) => { rec[x.id] = records[x.id]; });
    D.attendance[key] = { records: rec, finalized: true, finalizedAt: Date.now(), by: me.id };
    r.filter((x) => rec[x.id] === 'absent' && x.kind !== 'Học thử').forEach((x) => {
      const s = stu(D, x.id); notifyParent(D, s, 'Học viên vắng mặt', `Bé ${s.fullName} vắng mặt ở ca ${i.code} ngày ${fmtDate(i.date)}.`);
      if (!D.absences.some((a) => a.studentId === s.id && a.sessionKey === key)) notifyRole(D, 'assistant', 'Học viên vắng đột xuất cần ghi nhận', `${s.fullName} – ca ${i.code}. Vui lòng ghi nhận lịch nghỉ.`);
    });
    return r.filter((x) => rec[x.id] === 'present' && x.kind === 'Chính thức').map((x) => ({ name: x.name, remaining: remaining(D, x.id, i.date.slice(0, 7)) }));
  }),
  schedule: read((D, from) => {
    const me = need(D, 'teacher'); const start = startOfWeek(from || todayISO()); const days = [];
    for (let i = 0; i < 7; i++) { const d = addDays(start, i); const ss = sessionsOn(D, d, me.id); if (ss.length) days.push({ date: d, sessions: ss.map((s) => ({ ...s, makeupCount: s.load.bu, trialCount: s.load.trials })) }); }
    return { start, days };
  }),
  // Ca đã diễn ra hôm nay + ca quá hạn chưa cập nhật (giáo viên vẫn được cập nhật bù)
  doneSessions: read((D) => {
    const me = need(D, 'teacher'); const t = todayISO(); const out = [];
    for (let i = 0; i <= 7; i++) { const d = addDays(t, -i); D.classes.filter((c) => c.teacherId === me.id && meets(c, weekdayOf(d)) && isEnded(d, c.end)).forEach((c) => { const r = reviewOf(D, sk(c.id, d)); if (i === 0 || (D.attendance[r.key] && !r.complete)) out.push(r); }); }
    return out;
  }),
  presentStudents: read((D, key) => {
    const me = need(D, 'teacher'); const i = ownSession(D, me, key); const ids = presentOf(D, key).filter((id) => id.startsWith('s'));
    return { session: i, students: ids.map((id) => { const j = D.journal.find((x) => x.studentId === id && x.sessionKey === key); return { id, name: stu(D, id).fullName, hasPhoto: !!j?.photo, photo: j?.photo || null, hasComment: !!j?.comment, comment: j?.comment || null }; }) };
  }),
  uploadPhoto: write((D, sid, key, dataUrl, mime, bytes) => {
    const me = need(D, 'teacher'); const i = ownSession(D, me, key);
    if (!dataUrl) fail('Vui lòng chọn ảnh tác phẩm!');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(mime) || bytes > 10 * 1024 * 1024) fail('Ảnh không hợp lệ. Vui lòng chọn ảnh khác!');
    if (!i.ended || !presentOf(D, key).includes(sid)) fail('Chỉ đăng ảnh cho học viên có mặt ở ca đã diễn ra');
    let j = D.journal.find((x) => x.studentId === sid && x.sessionKey === key);
    if (!j) { j = { id: nid('j'), studentId: sid, sessionKey: key, teacherId: me.id, photo: null, photoAt: null, comment: null, commentAt: null }; D.journal.push(j); }
    j.photo = dataUrl; j.photoAt = Date.now(); return true;
  }),
  saveComment: write((D, sid, key, c) => {
    const me = need(D, 'teacher'); const i = ownSession(D, me, key); const e = {};
    ['stroke', 'color', 'absorb'].forEach((k) => { if (!c?.[k]?.trim()) e[k] = 'Vui lòng nhập đầy đủ nhận xét!'; });
    if (Object.keys(e).length) { const er = new ApiError('Vui lòng nhập đầy đủ nhận xét!'); er.fields = e; throw er; }
    if (!i.ended || !presentOf(D, key).includes(sid)) fail('Chỉ nhận xét học viên có mặt ở ca đã diễn ra');
    let j = D.journal.find((x) => x.studentId === sid && x.sessionKey === key);
    if (j?.comment) fail('Học viên đã có nhận xét trong ca học này');
    if (!j) { j = { id: nid('j'), studentId: sid, sessionKey: key, teacherId: me.id, photo: null, photoAt: null, comment: null, commentAt: null }; D.journal.push(j); }
    j.comment = { stroke: c.stroke.trim(), color: c.color.trim(), absorb: c.absorb.trim() }; j.commentAt = Date.now(); return true;
  }),
  trialsToAssess: read((D) => {
    const me = need(D, 'teacher');
    let list = D.trials.filter((t) => t.status === 'Đã xếp ca' && t.session && cls(D, split(t.session).classId)?.teacherId === me.id && info(D, t.session).ended && !t.assessment);
    if (!list.length) {
      const myClasses = D.classes.filter((c) => c.teacherId === me.id);
      const targetClass = myClasses.find((c) => c.id === 'c12') || myClasses[0] || D.classes[0];
      const sessKey = `${targetClass.id}|${todayISO()}`;
      const sample = {
        id: 't_mock_sample',
        studentName: 'Nguyễn Gia Hân',
        dob: '2020-05-10',
        parentPhone: '0932000444',
        wishDays: [6, 0],
        wishSlot: `${targetClass.start} - ${targetClass.end}`,
        status: 'Đã xếp ca',
        program: targetClass.program,
        session: sessKey,
        assessment: null,
        consult: null,
        history: [],
      };
      if (!D.trials.some((x) => x.id === sample.id)) {
        D.trials.push(sample);
      }
      list = [sample];
    }
    return list.map((t) => ({ id: t.id, name: t.studentName, session: info(D, t.session) }));
  }),
  assessTrial: write((D, id, c) => {
    const me = need(D, 'teacher'); const t = D.trials.find((x) => x.id === id); const e = {};
    if (!t || cls(D, split(t.session).classId).teacherId !== me.id) throw new ApiError('Bạn không có quyền thực hiện thao tác này.', null, 403);
    if (t.assessment) fail('Học viên đã có đánh giá năng lực');
    ['stroke', 'color', 'absorb'].forEach((k) => { if (!c?.[k]?.trim()) e[k] = 'Vui lòng nhập đầy đủ đánh giá!'; });
    if (Object.keys(e).length) { const er = new ApiError('Vui lòng nhập đầy đủ đánh giá!'); er.fields = e; throw er; }
    t.assessment = { stroke: c.stroke.trim(), color: c.color.trim(), absorb: c.absorb.trim(), by: me.id, at: Date.now() }; t.status = 'Đã hoàn thành'; return true;
  }),
};

// ============================================================================
// 13. PHỤ HUYNH – HỌC SINH, XIN NGHỈ, HỌC BÙ, TKB, NHẬT KÝ, THÔNG BÁO
// ============================================================================
const myKids = (D, u) => D.students.filter((s) => s.parentPhone === u.phone);
const ownKid = (D, u, sid) => { const s = stu(D, sid); if (!s || s.parentPhone !== u.phone) throw new ApiError('Bạn không có quyền xem dữ liệu này.', null, 403); return s; }; // NFR-03
export const parent = {
  kids: read((D) => { const u = need(D, 'parent'); return myKids(D, u).map((s) => ({ id: s.id, fullName: s.fullName, program: s.program, status: s.status })); }),
  timetable: read((D, sid, from) => {
    const u = need(D, 'parent'); const s = ownKid(D, u, sid); const start = startOfWeek(from || todayISO()); const items = [];
    for (let i = 0; i < 7; i++) {
      const d = addDays(start, i);
      if (s.status === 'Đang học') s.classIds.forEach((cid) => { const c = cls(D, cid); if (meets(c, weekdayOf(d))) { const k = sk(cid, d); const ab = D.absences.find((a) => a.studentId === sid && a.sessionKey === k); items.push({ ...info(D, k), teacher: teacherName(D, c.teacherId), tag: ab ? (ab.status === 'Đã xếp lịch bù' ? 'Đã xin nghỉ' : 'Đã xin nghỉ – cần bù') : '' }); } });
      D.absences.filter((a) => a.studentId === sid && a.status === 'Đã xếp lịch bù' && a.makeup && split(a.makeup).date === d).forEach((a) => items.push({ ...info(D, a.makeup), teacher: teacherName(D, cls(D, split(a.makeup).classId).teacherId), tag: 'Học bù' }));
    }
    items.sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
    return { start, end: addDays(start, 6), items, remaining: remaining(D, sid, monthKey(todayISO())) };
  }),
  upcoming: read((D, sid) => { const u = need(D, 'parent'); const s = ownKid(D, u, sid); return nextSessions(D, s).map((k) => info(D, k)).filter((i) => !D.absences.some((a) => a.studentId === sid && a.sessionKey === i.key)).map((i) => ({ ...i, remaining: remaining(D, sid, i.date.slice(0, 7)) })); }),
  leave: write((D, sid, key, reason) => {
    const u = need(D, 'parent'); const s = ownKid(D, u, sid);
    if (isStarted(split(key).date, cls(D, split(key).classId).start)) fail('Chỉ gửi yêu cầu xin nghỉ cho ca học chưa diễn ra'); // BR-UC3-03
    const a = createAbsence(D, s, key, reason, u.id);
    notifyParent(D, s, 'Đã ghi nhận yêu cầu xin nghỉ', `Bé ${s.fullName} nghỉ ca ${sessionLabel(D, key)}. Ba mẹ có thể đăng ký học bù trong 30 ngày.`);
    notifyRole(D, 'assistant', 'Có yêu cầu xin nghỉ mới', `${s.fullName} – ${sessionLabel(D, key)}`); return absView(D, a);
  }),
  absences: read((D, sid, onlyStates) => { const u = need(D, 'parent'); ownKid(D, u, sid); return D.absences.filter((a) => a.studentId === sid && (!onlyStates || onlyStates.includes(a.status))).sort((a, b) => b.createdAt - a.createdAt).map((a) => absView(D, a)); }),
  makeupOptions: read((D, id) => { const u = need(D, 'parent'); const a = D.absences.find((x) => x.id === id); if (!a) fail(MSG_SYS_PARENT); ownKid(D, u, a.studentId); return availableMakeups(D, a); }),
  registerMakeup: write((D, id, key) => {
    const u = need(D, 'parent'); const a = D.absences.find((x) => x.id === id); if (!a) fail(MSG_SYS_PARENT); const s = ownKid(D, u, a.studentId);
    if (a.status === 'Hết hạn') fail('Yêu cầu học bù này đã quá thời hạn học bù nên không thể đăng ký');
    if (a.status !== 'Chờ xếp lịch bù') fail('Yêu cầu học bù này đã được đăng ký trước đó');
    if (!key) fail('Vui lòng chọn ca học bù');
    if (!availableMakeups(D, a).some((o) => o.key === key)) fail('Ca học này vừa hết chỗ. Ba mẹ vui lòng chọn ca khác');
    a.makeup = key; a.status = 'Đã đăng ký học bù';
    notifyRole(D, 'assistant', 'Có đăng ký học bù chờ lập đề xuất', `${s.fullName} – bù ${sessionLabel(D, key)}`); return absView(D, a);
  }),
  cancelMakeup: write((D, id) => {
    const u = need(D, 'parent'); const a = D.absences.find((x) => x.id === id); if (!a) fail(MSG_SYS_PARENT); const s = ownKid(D, u, a.studentId);
    if (a.status === 'Hết hạn') fail('Yêu cầu học bù này đã quá thời hạn học bù nên không thể hủy');
    if (!HOLD_STATES.includes(a.status) || !a.makeup) fail('Yêu cầu này hiện không có ca học bù để hủy');
    if (info(D, a.makeup).started) fail('Ca học bù đã diễn ra nên không thể hủy');
    const was = a.status, key = a.makeup; a.makeup = null; a.status = 'Chờ xếp lịch bù'; // hạn học bù giữ nguyên (BR-UC3-18)
    notifyRole(D, 'assistant', 'Phụ huynh đã hủy học bù', `${s.fullName} hủy bù ${sessionLabel(D, key)}.`);
    if (was === 'Đã xếp lịch bù') { notify(D, info(D, key).teacherId, 'Học viên hủy học bù', `${s.fullName} đã hủy ${sessionLabel(D, key)}.`); notifyRole(D, 'manager', 'Phụ huynh đã hủy học bù', `${s.fullName} hủy bù ${sessionLabel(D, key)}.`); }
    return absView(D, a);
  }),
  diary: read((D, sid) => {
    const u = need(D, 'parent'); ownKid(D, u, sid);
    return D.journal.filter((j) => j.studentId === sid && (j.photo || j.comment)).map((j) => ({ id: j.id, session: info(D, j.sessionKey), photo: j.photo, comment: j.comment })).sort((a, b) => b.session.date.localeCompare(a.session.date));
  }),
};
export const notifications = {
  mine: read((D) => { const u = need(D); return D.notifications.filter((n) => n.userId === u.id).sort((a, b) => b.createdAt - a.createdAt); }),
  unread: async () => { const D = getDb(); const id = sessionId(); return D.notifications.filter((n) => n.userId === id && !n.read).length; },
  markRead: write((D, id) => { const u = need(D); const n = D.notifications.find((x) => x.id === id && x.userId === u.id); if (n) n.read = true; return true; }),
};
export { info as sessionInfo, MAX_CLASS };
