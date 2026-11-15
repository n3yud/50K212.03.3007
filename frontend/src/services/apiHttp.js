// ============================================================================
// LỚP API THẬT – gọi Backend ASP.NET Core qua HTTP (bật khi có VITE_API_BASE_URL).
// Tên hàm và dạng dữ liệu trả về giống hệt apiMock.js nên giao diện không phải sửa.
// ============================================================================
const BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');   // ví dụ https://localhost:7001/api
const ORIGIN = BASE.replace(/\/api$/, '');
const TOKEN = 'nnn_token';
const getToken = () => { try { return localStorage.getItem(TOKEN); } catch { return null; } };
const setToken = (t) => { try { t ? localStorage.setItem(TOKEN, t) : localStorage.removeItem(TOKEN); } catch { /* ignore */ } };

export class ApiError extends Error {
  constructor(message, status = 400, body = {}) { super(message); this.status = status; this.fields = body.fields || undefined; this.children = body.children || undefined; this.existing = body.extra?.existing; }
}
export const MSG_SYS = 'Hiện tại đang có sự cố, vui lòng thử lại sau';
export const MSG_SYS_PARENT = 'Hiện tại đang có sự cố, ba mẹ đợi Ngôi Nhà Nhỏ một xíu nhé!';

// ảnh tác phẩm trả về dạng "/uploads/..." -> ghép địa chỉ máy chủ
const fixUrls = (v) => {
  if (typeof v === 'string') return v.startsWith('/uploads/') ? ORIGIN + v : v;
  if (Array.isArray(v)) return v.map(fixUrls);
  if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v)) o[k] = fixUrls(v[k]); return o; }
  return v;
};
const qs = (o = {}) => { const p = new URLSearchParams(); Object.entries(o).forEach(([k, v]) => { if (v !== '' && v != null) p.set(k, v); }); const s = p.toString(); return s ? `?${s}` : ''; };

async function call(method, path, body, isForm) {
  const headers = {}; const t = getToken();
  if (t) headers.Authorization = `Bearer ${t}`;
  if (body && !isForm) headers['Content-Type'] = 'application/json';
  let res;
  try { res = await fetch(BASE + path, { method, headers, body: body ? (isForm ? body : JSON.stringify(body)) : undefined }); }
  catch { throw new ApiError('Không kết nối được máy chủ. Vui lòng kiểm tra mạng và thử lại', 0); }
  const text = await res.text(); let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (!res.ok) {
    if (res.status === 401 && path !== '/auth/login') setToken(null);
    throw new ApiError(data?.message || MSG_SYS, res.status, data || {});
  }
  return fixUrls(data);
}
const get = (p) => call('GET', p);
const post = (p, b) => call('POST', p, b ?? {});
const put = (p, b) => call('PUT', p, b ?? {});

// ---------- 1. đăng nhập ----------
export const auth = {
  login: async (username, password, app = 'staff') => { const r = await post('/auth/login', { username, password, app }); setToken(r.token); return r.user; },
  logout: async () => { setToken(null); },
  me: async () => { if (!getToken()) return null; try { return await get('/auth/me'); } catch { return null; } },
  changePassword: (oldPw, newPw) => post('/auth/change-password', { oldPw, newPw }),
  forgotMessage: (role) => (role === 'parent' ? 'Vui lòng liên hệ Trợ lý (qua Zalo) để được hỗ trợ cấp lại mật khẩu' : 'Vui lòng liên hệ bộ phận Admin để được hỗ trợ cấp lại mật khẩu'),
};

// ---------- 2. học thử ----------
export const trialsApi = {
  register: (p) => post('/trials', p),
  mine: () => get('/parent/trials'),
  confirm: (id) => post(`/parent/trials/${id}/confirm`),
  result: () => get('/parent/trials/result'),
  completed: () => get('/parent/trials/completed'),
};
export const trialMgmt = {
  list: (status) => get(`/assistant/trials${qs({ status })}`),
  accept: (id, program) => post(`/assistant/trials/${id}/accept`, { program }),
  sessionsFor: (id) => get(`/assistant/trials/${id}/sessions`),
  propose: (id, key) => post(`/assistant/trials/${id}/propose`, { key }),
  consultList: () => get('/assistant/trials/consult'),
  saveConsult: (id, f) => post(`/assistant/trials/${id}/consult`, f),
};

// ---------- 3. hồ sơ, lớp ----------
export const students = {
  search: (f) => get(`/students${qs(f)}`),
  get: (id) => get(`/students/${id}`),
  create: (form, fromTrialId) => post('/students', { form, fromTrialId: fromTrialId || null }),
  update: (id, f) => put(`/students/${id}`, f),
  reserve: (id) => post(`/students/${id}/reserve`),
  restore: (id) => post(`/students/${id}/restore`),
  history: (id) => get(`/students/${id}/history`),
  trialCandidates: () => get('/students/trial-candidates'),
};
export const classes = {
  list: () => get('/classes'),
  teachers: () => get('/classes/teachers'),
  create: (f) => post('/classes', f),
  update: (id, f) => put(`/classes/${id}`, f),
  openFor: (sid) => get(`/classes/open-for/${sid}`),
  enroll: (studentId, classId) => post('/classes/enroll', { studentId, classId }),
  teachersFor: (cid) => get(`/classes/${cid}/teachers`),
  assignTeacher: (cid, teacherId) => post(`/classes/${cid}/teacher`, { teacherId }),
  week: (from) => get(`/classes/week${qs({ from })}`),
};

// ---------- 4. học bù, học phí, tiến độ ----------
export const makeup = {
  students: () => get('/assistant/makeup/students'),
  recordable: (sid) => get(`/assistant/makeup/recordable/${sid}`),
  record: (studentId, key, reason) => post('/assistant/makeup/record', { studentId, key, reason }),
  pending: () => get('/assistant/makeup/pending'),
  options: (id) => get(`/assistant/makeup/${id}/options`),
  pick: (id, key) => post(`/assistant/makeup/${id}/pick`, { key }),
  submit: (id) => post(`/assistant/makeup/${id}/submit`),
};
export const tuition = {
  search: (f) => get(`/assistant/tuition${qs(f)}`),
  record: (studentId, month) => post('/assistant/tuition/record', { studentId, month }),
};
export const progress = {
  openSessions: (sid) => get(`/assistant/progress/open-sessions/${sid}`),
  record: (studentId, key, evalDate, status) => post('/assistant/progress/record', { studentId, key, evalDate, status }),
  history: (f) => get(`/assistant/progress/history${qs(f)}`),
  historyOf: (sid) => get(`/assistant/progress/history/${sid}`),
  needReview: (f) => get(`/assistant/progress/need-review${qs(f)}`),
};

// ---------- 5. quản lý, giám sát, tổng quan ----------
export const approvals = {
  trialSessions: () => get('/manager/trial-sessions'),
  approveTrial: (key) => post('/manager/trial-sessions/approve', { key }),
  rejectTrial: (key) => post('/manager/trial-sessions/reject', { key }),
  makeups: () => get('/manager/makeups'),
  approveMakeup: (id) => post(`/manager/makeups/${id}/approve`),
  rejectMakeup: (id) => post(`/manager/makeups/${id}/reject`),
};
export const reports = {
  students: (f) => get(`/manager/reports/students${qs(f)}`),
  operations: (f) => get(`/manager/reports/operations${qs(f)}`),
  tuitionAlert: (f) => get(`/manager/reports/tuition-alert${qs(f)}`),
};
export const overview = {
  assistant: () => get('/overview/assistant'),
  manager: () => get('/overview/manager'),
  supervisor: () => get('/overview/supervisor'),
};
export const supervisor = {
  teachers: () => get('/supervisor/teachers'),
  review: (f) => get(`/supervisor/review${qs(f)}`),
  violations: () => get('/supervisor/violations'),
  remind: (keys) => post('/supervisor/remind', { keys }),
};

// ---------- 6. giáo viên ----------
export const teacher = {
  today: () => get('/teacher/today'),
  roster: (key) => get(`/teacher/roster${qs({ key })}`),
  finalize: (key, records) => post('/teacher/attendance/finalize', { key, records }),
  schedule: (from) => get(`/teacher/schedule${qs({ from })}`),
  doneSessions: () => get('/teacher/done-sessions'),
  presentStudents: (key) => get(`/teacher/present${qs({ key })}`),
  // ảnh gửi dạng file thật (multipart); giao diện đưa vào dataURL đã nén nên đổi lại thành Blob
  uploadPhoto: async (studentId, key, dataUrl, mime) => {
    const blob = await (await fetch(dataUrl)).blob();
    const fd = new FormData(); fd.append('studentId', studentId); fd.append('key', key); fd.append('file', new File([blob], 'photo.jpg', { type: blob.type || mime }));
    return call('POST', '/teacher/journal/photo', fd, true);
  },
  saveComment: (studentId, key, c) => post('/teacher/journal/comment', { studentId, key, ...c }),
  trialsToAssess: () => get('/teacher/trials-to-assess'),
  assessTrial: (id, c) => post(`/teacher/trials/${id}/assess`, c),
};

// ---------- 7. phụ huynh, thông báo ----------
export const parent = {
  kids: () => get('/parent/kids'),
  timetable: (sid, from) => get(`/parent/timetable/${sid}${qs({ from })}`),
  upcoming: (sid) => get(`/parent/upcoming/${sid}`),
  leave: (studentId, key, reason) => post('/parent/leave', { studentId, key, reason }),
  absences: (sid) => get(`/parent/absences/${sid}`),
  makeupOptions: (id) => get(`/parent/makeup/${id}/options`),
  registerMakeup: (id, key) => post(`/parent/makeup/${id}/register`, { key }),
  cancelMakeup: (id) => post(`/parent/makeup/${id}/cancel`),
  diary: (sid) => get(`/parent/diary/${sid}`),
};
export const notifications = {
  mine: () => get('/notifications'),
  unread: async () => { try { return await get('/notifications/unread'); } catch { return 0; } },
  markRead: (id) => post(`/notifications/${id}/read`),
};
export const resetDb = () => {};
