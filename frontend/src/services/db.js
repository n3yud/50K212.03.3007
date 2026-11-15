// ============================================================================
// CƠ SỞ DỮ LIỆU GIẢ LẬP (chạy trên trình duyệt, lưu trong localStorage)
// ----------------------------------------------------------------------------
// Giai đoạn này chỉ làm Frontend, nên "Backend" được mô phỏng trong thư mục
// src/services. Cấu trúc bảng bên dưới bám sát đặc tả để sau này chuyển sang
// SQL Server: users, students, classes, trials, absences, attendance,
// tuition, journal, progress, notifications, reminders, history.
// Ngày mẫu được sinh theo ngày hiện tại nên luôn khớp lịch thật.
// ============================================================================
import { iso, today, addDays, prevDateForWeekday, nextDateForWeekday, monthKey, countWeekdayInMonth, parse, weekdayOf } from '../lib/dates';
import { meets } from '../lib/schedule';

export const PROGRAMS = ['Cơ bản', 'Nâng cao'];
export const PRICE = { 'Cơ bản': 900000, 'Nâng cao': 900000 };
export const MAX_CLASS = 7;          // BR-UC7-03
export const MAX_WITH_MAKEUP = 8;    // BR-UC3-12
export const MAX_MAKEUP = 2;         // BR-UC3-12
export const MAKEUP_DAYS = 30;       // BR-UC3-08
export const TRIAL_STATUS = ['Chờ tiếp nhận', 'Đã tiếp nhận', 'Chờ phụ huynh xác nhận', 'Chờ duyệt ca học thử', 'Đã xếp ca', 'Đã hoàn thành', 'Đã tư vấn'];

const KEY = 'nnn_db_v4'; // đổi phiên bản khi dữ liệu mẫu thay đổi để trình duyệt tự tạo lại
let db = null;

export function getDb() {
  if (!db) {
    let raw = null;
    try { raw = localStorage.getItem(KEY); } catch { /* ignore */ }
    if (raw) db = JSON.parse(raw);
    else { db = seed(); save(); }
  }
  return db;
}
export function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* đầy bộ nhớ */ } }
export function resetDb() { try { localStorage.removeItem(KEY); } catch { /* ignore */ } db = null; return getDb(); }
export function nid(prefix) { const d = getDb(); d.meta.seq += 1; return `${prefix}${d.meta.seq}`; }

// ---------- ảnh minh họa tác phẩm (SVG nhúng) ----------
const svgUri = (bg, body) => 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240"><rect width="240" height="240" fill="${bg}"/>${body}</svg>`);
export const ART = [
  svgUri('#ffe7d0', '<polygon points="50,120 120,60 190,120" fill="#e8756a"/><rect x="66" y="120" width="108" height="80" fill="#f4b26b"/><rect x="108" y="150" width="24" height="50" fill="#8fc7e6"/><rect x="78" y="134" width="20" height="20" fill="#fff" opacity=".8"/>'),
  svgUri('#e4f1d8', '<polygon points="70,80 84,40 108,70" fill="#f6c58f"/><polygon points="170,80 156,40 132,70" fill="#f6c58f"/><circle cx="120" cy="120" r="56" fill="#f9d4a6"/><circle cx="100" cy="112" r="5" fill="#444"/><circle cx="140" cy="112" r="5" fill="#444"/><path d="M104 134 q16 14 32 0" stroke="#e8756a" stroke-width="4" fill="none"/>'),
  svgUri('#dcecf8', '<ellipse cx="120" cy="120" rx="60" ry="34" fill="#f7a35c"/><polygon points="176,120 218,90 218,150" fill="#f7a35c"/><circle cx="92" cy="112" r="5" fill="#333"/><path d="M20 190 q30 -24 60 0 t60 0 t60 0" stroke="#7fbfe6" stroke-width="5" fill="none"/>'),
  svgUri('#fdf1c9', '<circle cx="120" cy="110" r="42" fill="#f6c85f"/><g stroke="#f39261" stroke-width="6" stroke-linecap="round"><path d="M120 40v22M120 158v22M50 110h22M168 110h22M70 60l16 16M154 144l16 16M170 60l-16 16M86 144l-16 16"/></g><rect x="0" y="190" width="240" height="50" fill="#9fd08a"/>'),
  svgUri('#fde4ef', '<circle cx="120" cy="100" r="16" fill="#f6c85f"/><g fill="#f58fb0"><circle cx="120" cy="64" r="22"/><circle cx="154" cy="90" r="22"/><circle cx="142" cy="130" r="22"/><circle cx="98" cy="130" r="22"/><circle cx="86" cy="90" r="22"/></g><circle cx="120" cy="100" r="16" fill="#f6c85f"/><rect x="116" y="150" width="8" height="70" fill="#6fae52"/>'),
];

const hash = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };

function seed() {
  const t = iso(today());
  const now = Date.now();
  const D = { meta: { seq: 1000, seededOn: t }, users: [], students: [], classes: [], trials: [], absences: [], attendance: {}, tuition: [], journal: [], progress: [], notifications: [], reminders: {}, history: [] };
  const id = (p) => `${p}${++D.meta.seq}`;

  // ---- nhân sự ----
  const staff = [
    ['u_tl1', 'assistant', 'thanhnhi', 'Thanh Nhi', ''],
    ['u_ql1', 'manager', 'minhchau', 'Minh Châu', ''],
    ['u_gs1', 'supervisor', 'thaibao', 'Thái Bảo', ''],
    ['u_gv1', 'teacher', 'myduyen', 'Mỹ Duyên', 'Cô'],
    ['u_gv2', 'teacher', 'baochau', 'Bảo Châu', 'Cô'],
    ['u_gv3', 'teacher', 'quynh', 'Quỳnh', 'Cô'],
    ['u_gv4', 'teacher', 'thuha', 'Thu Hà', 'Cô'],
    ['u_gv5', 'teacher', 'minhkhoa', 'Minh Khoa', 'Thầy'],
    ['u_gv6', 'teacher', 'lananh', 'Lan Anh', 'Cô'],
  ];
  staff.forEach(([uid, role, username, fullName, title]) => D.users.push({ id: uid, role, username, email: `${username}@ngoinhanho.vn`, password: 'Nhanho@123', fullName, title, locked: false, mustChangePassword: false }));
  D.users.push({ id: 'u_gv_locked', role: 'teacher', username: 'khoa.tk', email: 'khoa.tk@ngoinhanho.vn', password: 'Nhanho@123', fullName: 'Tài khoản bị khóa', title: '', locked: true, mustChangePassword: false });

  // ---- lớp học: mỗi lớp học 2 buổi/tuần theo lịch của trung tâm ----
  // Thứ 2 - Thứ 4 / Thứ 3 - Thứ 5: 17:30 - 19:30; Thứ 7 - Chủ nhật: 07:30 - 09:30, 09:40 - 11:40, 14:30 - 16:30, 17:00 - 19:00
  // days theo JS getDay(): 0 = Chủ nhật, 1 = Thứ 2 ... 6 = Thứ 7 (Thứ 6 = 5: trung tâm nghỉ)
  const T24 = [1, 3], T35 = [2, 4], T7CN = [6, 0];
  const cls = [
    ['c1', 'Cơ bản - Thế giới màu sắc', 'Cơ bản', T35, '17:30', '19:30', 'u_gv1', 'A'],
    ['c2', 'Nâng cao - Vẽ tĩnh vật', 'Nâng cao', T35, '17:30', '19:30', 'u_gv2', 'A'],
    ['c3', 'Nâng cao - Góc phố nhỏ', 'Nâng cao', T35, '17:30', '19:30', 'u_gv3', 'B'],
    ['c4', 'Cơ bản - Sắc màu diệu kỳ', 'Cơ bản', T24, '17:30', '19:30', 'u_gv4', 'A'],
    ['c5', 'Nâng cao - Phong cảnh quê hương', 'Nâng cao', T24, '17:30', '19:30', 'u_gv2', 'A'],
    ['c6', 'Cơ bản - Bé vẽ động vật', 'Cơ bản', T7CN, '14:30', '16:30', 'u_gv4', 'A'],
    ['c7', 'Nâng cao - Ký họa nhanh', 'Nâng cao', T7CN, '14:30', '16:30', 'u_gv5', 'A'],
    ['c8', 'Cơ bản - Nét vẽ vui', 'Cơ bản', T7CN, '09:40', '11:40', 'u_gv6', 'A'],
    ['c9', 'Nâng cao - Màu nước cơ bản', 'Nâng cao', T7CN, '09:40', '11:40', 'u_gv3', 'A'],
    ['c10', 'Cơ bản - Bé tập tô màu', 'Cơ bản', T24, '17:30', '19:30', 'u_gv6', 'B'],
    ['c11', 'Nâng cao - Hình khối', 'Nâng cao', T24, '17:30', '19:30', 'u_gv5', 'B'],
    ['c12', 'Cơ bản - Vẽ cùng bé', 'Cơ bản', T7CN, '07:30', '09:30', 'u_gv1', 'A'],
    ['c13', 'Cơ bản - Nét vẽ đầu đời', 'Cơ bản', T24, '17:30', '19:30', 'u_gv1', 'C'],
    ['c14', 'Nâng cao - Tranh cổ tích', 'Nâng cao', T35, '17:30', '19:30', 'u_gv4', 'C'],
    ['c15', 'Cơ bản - Vườn hoa tuổi thơ', 'Cơ bản', T7CN, '09:40', '11:40', 'u_gv2', 'B'],
    ['c16', 'Nâng cao - Sáng tạo sắc màu', 'Nâng cao', T7CN, '14:30', '16:30', 'u_gv5', 'B'],
  ];
  cls.forEach(([cid, name, program, days, start, end, teacherId, letter]) => D.classes.push({ id: cid, name, program, days, start, end, capacity: MAX_CLASS, teacherId, letter }));
  // ngày học kế tiếp / gần nhất đã qua của một lớp (lớp học 2 ngày/tuần)
  const nextMeet = (c, from) => c.days.map((w) => nextDateForWeekday(w, from)).sort()[0];
  const prevMeet = (c, from) => c.days.map((w) => prevDateForWeekday(w, from)).sort().pop();

  // ---- học viên: tên|giới|tuổi|sđt|lớp ----
  const rows = `Nguyễn Gia Hân|Nữ|6|0901234567|c10,c12,c8
Phạm Khánh Vy|Nữ|5|0903111222|c1
Trần Thảo Nguyên|Nữ|6|0987000111|c1,c4
Hoàng Gia Bảo|Nam|5|0905222333|c1
Lê Minh Anh|Nữ|6|0912000444|c1
Vũ Đức Anh|Nam|5|0935111555|c1
Đặng Hoài Thương|Nữ|5|0944666777|c4
Bùi Quốc Bảo|Nam|6|0977888999|c4
Ngô Khánh Linh|Nữ|6|0966123123|c4,c6
Phan Gia Huy|Nam|5|0988321321|c6
Đỗ Bảo Châu|Nữ|6|0911555666|c6
Lý Minh Khang|Nam|6|0922444333|c8
Trương Mai Chi|Nữ|5|0933777222|c8,c10
Huỳnh Tuấn Kiệt|Nam|6|0955999000|c10
Võ Ngọc Hân|Nữ|5|0966000111|c12
Đinh Anh Thư|Nữ|6|0977111000|c12
Nguyễn Minh Khôi|Nam|8|0901234567|c2,c5
Lê Hoàng Long|Nam|9|0902333444|c2
Trần Ngọc Diệp|Nữ|10|0903444555|c2,c11
Phạm Quang Huy|Nam|7|0904555666|c2
Đoàn Thiên Ân|Nam|8|0905666777|c2
Mai Khánh Chi|Nữ|11|0906777888|c2
Cao Bảo Trâm|Nữ|12|0907888999|c2,c7
Hồ Gia Phúc|Nam|9|0908999000|c3
Tạ Phương Nhi|Nữ|13|0909000111|c3,c5
Lâm Anh Khoa|Nam|7|0910111222|c3
Dương Bảo Ngân|Nữ|10|0911222333|c3
Kiều Minh Quân|Nam|8|0912333444|c3
Thái Bảo Hân|Nữ|9|0913444555|c3
Tô Gia Bình|Nam|11|0914555666|c3
Châu Nhật Minh|Nam|12|0915666777|c5,c7
Quách Thảo Vy|Nữ|7|0916777888|c5
Âu Dương Khải|Nam|13|0917888999|c7
Lương Bích Ngọc|Nữ|11|0918999000|c7,c9
Mạc Thiên Phú|Nam|10|0919000111|c9
Phùng Khả Hân|Nữ|9|0920111222|c9,c11
Giang Hải Đăng|Nam|12|0921222333|c11
Từ Gia Linh|Nữ|8|0922333444|c11
Nguyễn Hà My|Nữ|5|0923444555|WAIT
Trần Đức Thịnh|Nam|8|0924555666|WAIT
Võ Thảo Vi|Nữ|6|0925666777|HOLD:c1
Lê Quốc Việt|Nam|9|0926777888|HOLD:c2
Hà Bảo An|Nam|5|0927888999|HOLD:c4
Hoàng Nhật Nam|Nam|6|0938111222|c13
Vũ Thùy Linh|Nữ|5|0938222333|c13,c8
Nguyễn Tùng Dương|Nam|9|0938333444|c14
Phan Bảo Hân|Nữ|10|0938444555|c14,c3
Đỗ Minh Trí|Nam|6|0938555666|c15
Trương Tuệ Mẫn|Nữ|5|0938666777|c15,c6
Lê Tuấn Hưng|Nam|11|0938777888|c16
Ngô Mỹ Uyên|Nữ|8|0938888999|c16,c7
Trần Đăng Khoa|Nam|6|0939111222|c1
Bùi Diệu Linh|Nữ|5|0939222333|c4
Phạm Minh Quân|Nam|7|0939333444|c2
Đặng Thảo Trang|Nữ|9|0939444555|c5
Lý Quốc Hưng|Nam|6|0939555666|c10
Hồ Phương Dung|Nữ|5|0939666777|c12
Võ Đình Phong|Nam|10|0939777888|c11
Đinh Hồng Hạnh|Nữ|8|0939888999|c9
Mai Hoàng Bách|Nam|6|0940111222|c8
Phan Kim Ngân|Nữ|5|0940222333|WAIT
Trịnh Gia Hưng|Nam|6|0940333444|WAIT
Lâm Bảo Ngọc|Nữ|5|0940444555|WAIT
Dương Thành Đạt|Nam|9|0940555666|WAIT
Kiều Thục Anh|Nữ|10|0940666777|WAIT
Châu Minh Long|Nam|8|0940777888|WAIT
Vũ Mai Phương|Nữ|5|0940888999|WAIT
Tạ Minh Khang|Nam|6|0941111222|HOLD:c1
Lương Hoài An|Nữ|5|0941222333|HOLD:c4
Mạc Quốc Dũng|Nam|9|0941333444|HOLD:c2
Phùng Bảo Châu|Nữ|10|0941444555|HOLD:c5
Giang Gia Huy|Nam|6|0941555666|HOLD:c8
Từ Ái Linh|Nữ|5|0941666777|HOLD:c10
Đoàn Nhật Quang|Nam|8|0941777888|HOLD:c9
Cao Ngọc Mai|Nữ|7|0941888999|HOLD:c11`.split('\n');
  const mids = ['Văn Hải', 'Thị Lan', 'Văn Nam', 'Thị Hoa'];
  const yr = today().getFullYear();
  rows.forEach((r, i) => {
    const [name, gender, age, phone, cl] = r.split('|');
    const m = 1 + (i % 6), d = 3 + (i % 20);
    const dob = `${yr - Number(age)}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    let status = 'Đang học', classIds = [], prev = [];
    if (cl === 'WAIT') status = 'Chờ xếp lớp';
    else if (cl.startsWith('HOLD')) { status = 'Đã bảo lưu'; prev = cl.slice(5).split(','); }
    else classIds = cl.split(',');
    const program = Number(age) <= 6 ? 'Cơ bản' : 'Nâng cao';
    D.students.push({ id: `s${i + 1}`, code: `HV${String(i + 1).padStart(4, '0')}`, fullName: name, dob, gender, parentName: `${name.split(' ')[0]} ${mids[i % 4]}`, parentPhone: phone, program, status, classIds, prevClassIds: prev, createdAt: now - (60 - i) * 86400000 * (i < 3 ? 1 : 2), trialId: null });
  });

  // ---- tài khoản phụ huynh (theo SĐT) ----
  const phones = [...new Set(D.students.map((s) => s.parentPhone))];
  phones.forEach((p) => {
    const demo = p === '0901234567';
    D.users.push({ id: `u_ph_${p}`, role: 'parent', username: p, email: '', password: demo ? 'Nhanho@123' : p.slice(-6), fullName: D.students.find((s) => s.parentPhone === p).parentName, phone: p, locked: false, mustChangePassword: !demo });
  });
  // phụ huynh của các đơn học thử đầu tiên (BR-UC1-05)
  ['0912345678', '0987654321', '0905101222', '0942111222', '0942222333', '0942333444'].forEach((p) => D.users.push({ id: `u_ph_${p}`, role: 'parent', username: p, email: '', password: p.slice(-6), fullName: `Phụ huynh ${p.slice(-4)}`, phone: p, locked: false, mustChangePassword: true }));

  // ---- học phí theo tháng ----
  const m0 = monthKey(t), m1 = monthKey(addDays(t, 31));
  const unpaidNow = new Set(['s2', 's4', 's19', 's26']);
  D.students.filter((s) => s.status === 'Đang học').forEach((s) => {
    [m0, m1].forEach((m) => {
      const total = s.classIds.reduce((a, cid) => a + D.classes.find((c) => c.id === cid).days.reduce((n, w) => n + countWeekdayInMonth(w, m), 0), 0);
      const paid = !(m === m0 && unpaidNow.has(s.id)) && !(m === m1 && hash(s.id) % 3 === 0);
      D.tuition.push({ studentId: s.id, month: m, status: paid ? 'Đã thanh toán' : 'Chưa thanh toán', amount: PRICE[s.program], total, paidAt: paid ? now - 5 * 86400000 : null });
    });
  });

  // ---- điểm danh quá khứ + nhật ký ----
  const start = addDays(t, -14);
  const comments = [['Nét vẽ tự tin, rõ ràng hơn.', 'Bé phối màu hài hòa.', 'Tiếp thu nhanh, làm theo hướng dẫn tốt.'], ['Bé cầm bút vững, nét mềm mại.', 'Màu sắc tươi sáng, mạnh dạn.', 'Chú ý nghe giảng, hoàn thành đúng giờ.'], ['Có tiến bộ trong cách chọn màu.', 'Biết dùng màu đậm nhạt tạo chiều sâu.', 'Cần nhắc bé tập trung hơn ở cuối buổi.']];
  for (let d = start; d < t; d = addDays(d, 1)) {
    D.classes.filter((c) => meets(c, weekdayOf(d))).forEach((c) => {
      const sk = `${c.id}|${d}`;
      const rec = {};
      D.students.filter((s) => s.status === 'Đang học' && s.classIds.includes(c.id)).forEach((s) => { rec[s.id] = hash(sk + s.id) % 9 === 0 ? 'absent' : 'present'; });
      D.attendance[sk] = { records: rec, finalized: true, finalizedAt: parse(d).getTime() + 20 * 3600000, by: c.teacherId };
      const violate = hash(sk) % 4 === 0; // một số ca bị thiếu ảnh/nhận xét để Giám sát có dữ liệu kiểm tra
      Object.entries(rec).filter(([, v]) => v === 'present').forEach(([sid], k) => {
        const miss = violate && k % 3 === 0;
        const missC = violate && k % 4 === 1;
        const art = ART[hash(sk + sid) % ART.length];
        const cm = comments[hash(sid) % 3];
        D.journal.push({ id: id('j'), studentId: sid, sessionKey: sk, teacherId: c.teacherId, photo: miss ? null : art, photoAt: miss ? null : parse(d).getTime() + 21 * 3600000, comment: missC ? null : { stroke: cm[0], color: cm[1], absorb: cm[2] }, commentAt: missC ? null : parse(d).getTime() + 21 * 3600000 });
      });
    });
  }
  // ---- tiến độ học tập do Trợ lý ghi nhận ----
  D.students.filter((s) => s.status === 'Đang học').forEach((s, i) => {
    const last = Object.keys(D.attendance).filter((k) => D.attendance[k].records[s.id] === 'present').sort().pop();
    if (last && i % 2 === 0) D.progress.push({ id: id('p'), studentId: s.id, sessionKey: last, evalDate: last.split('|')[1], status: hash(s.id) % 5 === 0 ? 'Chậm tiến độ' : 'Đúng tiến độ', teacherId: D.classes.find((c) => c.id === last.split('|')[0]).teacherId, by: 'u_tl1', at: now - 86400000 });
  });

  // ---- đơn học thử ----
  const T = (name, age, phone, status, extra = {}) => {
    const dob = `${yr - age}-${String(2 + (D.trials.length % 8)).padStart(2, '0')}-1${D.trials.length % 9}`;
    const tr = { id: id('t'), studentName: name, dob, parentPhone: phone, wishDays: [2, 4], wishSlot: '17:30 - 19:30', createdAt: now - (D.trials.length + 1) * 3600000 * 5, status, program: null, session: null, assessment: null, consult: null, history: [], ...extra };
    D.trials.push(tr); return tr;
  };
  const nxt = (cid) => `${cid}|${nextMeet(D.classes.find((c) => c.id === cid), t)}`;
  const prv = (cid) => `${cid}|${prevMeet(D.classes.find((c) => c.id === cid), t)}`;
  T('Nguyễn Minh An', 6, '0912345678', 'Chờ tiếp nhận', { createdAt: now - 2 * 3600000 });
  T('Trần Bảo Ngọc', 7, '0987654321', 'Chờ tiếp nhận');
  T('Lê Gia Hân', 8, '0905101222', 'Chờ tiếp nhận');
  T('Ngô Hải Yến', 6, '0942111222', 'Chờ tiếp nhận', { wishDays: [1, 3] });
  T('Trần Bảo Long', 8, '0942222333', 'Chờ tiếp nhận');
  T('Phạm Quỳnh Nga', 5, '0942333444', 'Chờ tiếp nhận', { wishDays: [6, 0], wishSlot: '09:40 - 11:40' });
  T('Đặng Khánh An', 6, '0931000111', 'Đã tiếp nhận', { program: 'Cơ bản' });
  T('Tạ Minh Thư', 9, '0931000222', 'Đã tiếp nhận', { program: 'Nâng cao', wishDays: [6, 0], wishSlot: '14:30 - 16:30' });
  T('Hứa Bảo Nam', 5, '0931000333', 'Đã tiếp nhận', { program: 'Cơ bản' });
  T('Lê Minh Tuấn', 6, '0942444555', 'Đã tiếp nhận', { program: 'Cơ bản' });
  T('Hoàng Lan Nhi', 9, '0942555666', 'Đã tiếp nhận', { program: 'Nâng cao', wishDays: [6, 0], wishSlot: '14:30 - 16:30' });
  T('Vương Tuệ Lâm', 6, '0931000444', 'Chờ phụ huynh xác nhận', { program: 'Cơ bản', session: nxt('c4') });
  T('Đỗ Tuấn Khang', 6, '0942666777', 'Chờ phụ huynh xác nhận', { program: 'Cơ bản', session: nxt('c10') });
  T('Vũ Diệu Anh', 8, '0942777888', 'Chờ phụ huynh xác nhận', { program: 'Nâng cao', session: nxt('c3') });
  T('Bạch Gia Khiêm', 6, '0931000555', 'Chờ duyệt ca học thử', { program: 'Cơ bản', session: nxt('c1') });
  T('Cát Tường Vi', 6, '0931000666', 'Chờ duyệt ca học thử', { program: 'Cơ bản', session: nxt('c4') });
  T('Ông Gia Huy', 10, '0931000777', 'Chờ duyệt ca học thử', { program: 'Nâng cao', session: nxt('c5') });
  T('Bùi Quốc Anh', 6, '0942888999', 'Chờ duyệt ca học thử', { program: 'Cơ bản', session: nxt('c8') });
  T('Hà Phương Linh', 8, '0942999000', 'Chờ duyệt ca học thử', { program: 'Nâng cao', session: nxt('c7') });
  T('Khổng Nhã Uyên', 5, '0931000888', 'Đã xếp ca', { program: 'Cơ bản', session: nxt('c8') });
  T('Nguyễn Đăng Khôi', 5, '0943111222', 'Đã xếp ca', { program: 'Cơ bản', session: nxt('c12') });
  T('Trương Cẩm Tú', 10, '0943222333', 'Đã xếp ca', { program: 'Nâng cao', session: nxt('c11') });
  T('Thạch Gia Bảo', 5, '0931000999', 'Đã xếp ca', { program: 'Cơ bản', session: prv('c6') });
  T('Lý Bảo Châu', 6, '0932000444', 'Đã xếp ca', { program: 'Cơ bản', session: prv('c1') }); // học thử đã diễn ra, chờ cô Mỹ Duyên đánh giá
  T('Ninh Khả Ái', 9, '0932000111', 'Đã hoàn thành', { program: 'Nâng cao', session: prv('c7'), assessment: { stroke: 'Bé cầm bút khá tự tin, nét vẽ rõ.', color: 'Biết phối các màu sắc hài hòa.', absorb: 'Tiếp thu nhanh, làm theo hướng dẫn.', by: 'u_gv5', at: now - 86400000 } });
  T('Phan Hữu Phước', 9, '0943444555', 'Đã hoàn thành', { program: 'Nâng cao', session: prv('c9'), assessment: { stroke: 'Nắm vững tỷ lệ và hình khối tốt.', color: 'Màu sắc có chiều sâu và độ chuyển màu mượt.', absorb: 'Chăm chú lắng nghe, hoàn thành tác phẩm đúng giờ.', by: 'u_gv3', at: now - 2 * 86400000 } });
  T('Ân Thiên Kim', 6, '0932000222', 'Đã tư vấn', { program: 'Cơ bản', session: prv('c4'), assessment: { stroke: 'Nét vẽ mềm, bố cục cân đối.', color: 'Màu tươi sáng.', absorb: 'Tiếp thu tốt.', by: 'u_gv4', at: now - 4 * 86400000 }, consult: { roadmap: 'Lộ trình Cơ bản 6 tháng, 2 buổi/tuần.', decision: 'Đăng ký chính thức', note: '', by: 'u_tl1', at: now - 3 * 86400000 } });
  T('Doãn Hải Nam', 8, '0932000333', 'Đã tư vấn', { program: 'Nâng cao', session: prv('c5'), assessment: { stroke: 'Nét vẽ còn rụt rè.', color: 'Màu tương đối đơn điệu.', absorb: 'Cần thêm thời gian làm quen.', by: 'u_gv2', at: now - 5 * 86400000 }, consult: { roadmap: 'Nâng cao, học 2 buổi/tuần.', decision: 'Chưa quyết định', note: 'Phụ huynh muốn cân nhắc.', by: 'u_tl1', at: now - 4 * 86400000 } });
  T('Đặng Quỳnh Chi', 6, '0943555666', 'Đã tư vấn', { program: 'Cơ bản', session: prv('c4'), assessment: { stroke: 'Nét vẽ tự nhiên, dứt khoát.', color: 'Phối màu rất sáng tạo.', absorb: 'Rất tích cực tương tác và đặt câu hỏi.', by: 'u_gv4', at: now - 5 * 86400000 }, consult: { roadmap: 'Lộ trình Cơ bản 1 năm, lớp T2-T4.', decision: 'Đăng ký chính thức', note: 'Phụ huynh rất hài lòng và muốn đăng ký ngay.', by: 'u_tl1', at: now - 4 * 86400000 } });
  T('Võ Hoàng Nam', 10, '0943666777', 'Đã tư vấn', { program: 'Nâng cao', session: prv('c2'), assessment: { stroke: 'Nét chì tương đối tốt.', color: 'Chưa quen sử dụng màu bột.', absorb: 'Cần nhiều sự hướng dẫn trực tiếp.', by: 'u_gv2', at: now - 6 * 86400000 }, consult: { roadmap: 'Lộ trình Nâng cao 6 tháng.', decision: 'Không đăng ký', note: 'Gia đình chuẩn bị chuyển nhà sang quận khác.', by: 'u_tl1', at: now - 5 * 86400000 } });

  // ---- yêu cầu xin nghỉ / học bù ----
  const A = (sid, cid, dateOffsetFn, status, extra = {}) => {
    const c = D.classes.find((x) => x.id === cid);
    const date = dateOffsetFn(c);
    D.absences.push({ id: id('a'), studentId: sid, sessionKey: `${cid}|${date}`, reason: '', status, deadline: addDays(date, MAKEUP_DAYS), makeup: null, createdAt: now - 86400000, createdBy: 'u_tl1', ...extra });
  };
  const past = (c) => prevMeet(c, t);
  const fut = (c) => nextMeet(c, t);
  A('s3', 'c4', fut, 'Chờ xếp lịch bù', { reason: 'Bé bị ốm' });
  A('s44', 'c13', fut, 'Chờ xếp lịch bù', { reason: 'Bé bị cảm sốt' });
  A('s46', 'c14', fut, 'Chờ xếp lịch bù', { reason: 'Bận thi học kỳ' });
  A('s52', 'c1', fut, 'Chờ xếp lịch bù', { reason: 'Về quê thăm ông bà' });
  A('s5', 'c1', past, 'Đã đăng ký học bù', { makeup: nxt('c4'), reason: 'Gia đình có việc' });
  A('s54', 'c2', past, 'Đã đăng ký học bù', { makeup: nxt('c3'), reason: 'Trùng lịch thi bơi' });
  A('s56', 'c10', past, 'Đã đăng ký học bù', { makeup: nxt('c4'), reason: 'Gia đình đi công tác' });
  A('s14', 'c10', past, 'Chờ duyệt', { makeup: nxt('c12') });
  A('s20', 'c2', past, 'Chờ duyệt', { makeup: nxt('c3') });
  A('s18', 'c2', past, 'Chờ duyệt', { makeup: nxt('c5'), reason: 'Bận việc riêng' });
  A('s24', 'c3', past, 'Chờ duyệt', { makeup: nxt('c2'), reason: 'Bị ốm đột xuất' });
  A('s12', 'c8', past, 'Đã xếp lịch bù', { makeup: nxt('c4') });
  A('s29', 'c3', past, 'Đã xếp lịch bù', { makeup: nxt('c9'), reason: '' });
  A('s48', 'c15', past, 'Đã xếp lịch bù', { makeup: nxt('c8'), reason: 'Cả nhà đi cưới' });
  A('s50', 'c16', past, 'Đã xếp lịch bù', { makeup: nxt('c7'), reason: 'Bé mệt' });
  A('s8', 'c4', (c) => prevMeet(c, addDays(t, -44)), 'Hết hạn', { reason: 'Đi du lịch' });
  A('s11', 'c6', (c) => prevMeet(c, addDays(t, -46)), 'Hết hạn', { reason: 'Đi nước ngoài' });

  D.notifications.push({ id: id('n'), userId: 'u_ph_0901234567', title: 'Lịch học bù đã được phê duyệt', body: 'Ca học bù của bé Nguyễn Gia Hân đã được duyệt.', createdAt: now - 3600000, read: false });
  D.notifications.push({ id: id('n'), userId: 'u_ph_0901234567', title: 'Học viên vắng mặt', body: 'Bé Nguyễn Minh Khôi vắng mặt ở ca học gần nhất.', createdAt: now - 86400000, read: true });
  D.notifications.push({ id: id('n'), userId: 'u_ph_0901234567', title: 'Nhắc đóng học phí', body: 'Học phí tháng này của bé đã được tạo. Ba mẹ vui lòng kiểm tra.', createdAt: now - 3 * 86400000, read: false });
  D.notifications.push({ id: id('n'), userId: 'u_ql1', title: 'Đề xuất xếp bù mới', body: 'Có 4 đề xuất ca học bù mới đang chờ phê duyệt.', createdAt: now - 2 * 3600000, read: false });
  D.notifications.push({ id: id('n'), userId: 'u_ql1', title: 'Ca học thử mới', body: 'Có 5 ca học thử mới đang chờ phê duyệt.', createdAt: now - 4 * 3600000, read: false });
  return D;
}
