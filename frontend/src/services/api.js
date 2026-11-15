// ============================================================================
// ĐIỂM VÀO DUY NHẤT của lớp dữ liệu. Giao diện chỉ import từ file này.
//  - Chưa đặt VITE_API_BASE_URL  → dùng apiMock.js (dữ liệu giả lập trong trình duyệt)
//  - Đã đặt VITE_API_BASE_URL    → dùng apiHttp.js (gọi Backend ASP.NET Core + SQL Server)
// ============================================================================
import * as mock from './apiMock';
import * as http from './apiHttp';

const impl = import.meta.env.VITE_API_BASE_URL ? http : mock;
export const USING_REAL_BACKEND = !!import.meta.env.VITE_API_BASE_URL;

export const { auth, trialsApi, trialMgmt, students, classes, makeup, tuition, progress, approvals, reports, overview, supervisor, teacher, parent, notifications, resetDb, ApiError, MSG_SYS, MSG_SYS_PARENT } = impl;

// Các hàm kiểm tra dữ liệu thuần túy (không gọi mạng) dùng chung cho cả hai chế độ
export { validateChild, validateStudent, validateClass, suggestProgram, NAME_RE, MAX_CLASS, sk, publicUser, sessionInfo } from './apiMock';
