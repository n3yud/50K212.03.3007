// Tiện ích ngày giờ. Mọi ngày lưu dạng chuỗi ISO "YYYY-MM-DD" để dễ so sánh và gửi lên API.
export const pad = (n) => String(n).padStart(2, '0');
export const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const today = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); };
export const todayISO = () => iso(today());
export const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
export const diffDays = (a, b) => Math.round((parse(a) - parse(b)) / 86400000);
export const fmtDate = (s) => { if (!s) return ''; const [y, m, d] = s.slice(0, 10).split('-'); return `${d}/${m}/${y}`; };
export const fmtDateTime = (ts) => { const d = new Date(ts); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
export const fmtShort = (s) => { const [, m, d] = s.split('-'); return `${d}/${m}`; };
// getDay(): 0 = Chủ nhật, 1 = Thứ 2 ... 6 = Thứ 7
export const weekdayLabel = (wd) => (wd === 0 ? 'Chủ nhật' : `Thứ ${wd + 1}`);
export const weekdayOf = (s) => parse(s).getDay();
export const dateLabel = (s) => `${weekdayLabel(weekdayOf(s))}, ${fmtDate(s)}`;
export const monthKey = (s) => s.slice(0, 7);
export const monthLabel = (k) => `Tháng ${k.slice(5)}/${k.slice(0, 4)}`;
export const addMonths = (k, n) => { const [y, m] = k.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };
export const startOfWeek = (s) => { const d = parse(s); const wd = (d.getDay() + 6) % 7; d.setDate(d.getDate() - wd); return iso(d); }; // Thứ 2
export const nextDateForWeekday = (wd, fromISO, includeFrom = false) => {
  let d = includeFrom ? fromISO : addDays(fromISO, 1);
  for (let i = 0; i < 8; i++) { if (weekdayOf(d) === wd) return d; d = addDays(d, 1); }
  return d;
};
export const prevDateForWeekday = (wd, fromISO) => {
  let d = addDays(fromISO, -1);
  for (let i = 0; i < 8; i++) { if (weekdayOf(d) === wd) return d; d = addDays(d, -1); }
  return d;
};
export const countWeekdayInMonth = (wd, key) => {
  const [y, m] = key.split('-').map(Number); let c = 0;
  const n = new Date(y, m, 0).getDate();
  for (let d = 1; d <= n; d++) if (new Date(y, m - 1, d).getDay() === wd) c++;
  return c;
};
export const ageOn = (dobISO, onISO = todayISO()) => {
  const b = parse(dobISO), t = parse(onISO);
  let a = t.getFullYear() - b.getFullYear();
  if (t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) a--;
  return a;
};
export const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
export const timeRange = (c) => `${c.start} - ${c.end}`;
export const isEnded = (dateISO, endHHMM, now = new Date()) => {
  const t = todayISO();
  if (dateISO < t) return true;
  if (dateISO > t) return false;
  return now.getHours() * 60 + now.getMinutes() >= toMin(endHHMM);
};
export const isStarted = (dateISO, startHHMM, now = new Date()) => {
  const t = todayISO();
  if (dateISO < t) return true;
  if (dateISO > t) return false;
  return now.getHours() * 60 + now.getMinutes() >= toMin(startHHMM);
};
export const vnd = (n) => `${new Intl.NumberFormat('vi-VN').format(n)} VNĐ`;
export const longToday = () => `${weekdayLabel(today().getDay())}, ${fmtDate(todayISO())}`;
