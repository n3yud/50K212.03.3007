export { vnd, fmtDate, fmtDateTime, dateLabel, weekdayLabel } from './dates';
export const pct = (n) => `${n.toFixed(1).replace('.', ',')}%`;
export const dec = (n) => n.toFixed(1).replace('.', ',');
export const two = (n) => String(n).padStart(2, '0');
export const STATUS_TONE = {
  'Chờ tiếp nhận': 'warn', 'Đã tiếp nhận': 'info', 'Chờ phụ huynh xác nhận': 'warn', 'Chờ duyệt ca học thử': 'warn', 'Đã xếp ca': 'ok', 'Đã hoàn thành': 'ok', 'Đã tư vấn': 'ok',
  'Chờ xếp lịch bù': 'warn', 'Đã đăng ký học bù': 'info', 'Chờ duyệt': 'warn', 'Đã xếp lịch bù': 'ok', 'Hết hạn': 'bad',
  'Chờ xếp lớp': 'warn', 'Đang học': 'ok', 'Đã bảo lưu': 'neutral',
  'Đã thanh toán': 'ok', 'Chưa thanh toán': 'warn', 'Đúng tiến độ': 'ok', 'Chậm tiến độ': 'bad',
  'Đã đăng': 'ok', 'Chưa đăng': 'bad', 'Đã nhập': 'ok', 'Chưa nhập': 'bad', 'Đúng hạn': 'ok', 'Quá hạn': 'bad', 'Chưa gửi nhắc nhở': 'warn', 'Đã gửi nhắc nhở': 'ok',
};
