// Lịch học cố định của trung tâm (theo lịch phụ huynh được công bố):
//   Thứ 2 - Thứ 4: 17:30 - 19:30
//   Thứ 3 - Thứ 5: 17:30 - 19:30
//   Thứ 7 - Chủ nhật: 07:30 - 09:30, 09:40 - 11:40, 14:30 - 16:30, 17:00 - 19:00
// Mỗi lớp học 2 buổi/tuần vào cặp ngày của lịch đã chọn. Thứ 6 trung tâm nghỉ (BR-UC7-04).
// Quy ước số thứ theo JS getDay(): 0 = Chủ nhật, 1 = Thứ 2, ... 6 = Thứ 7.
import { weekdayLabel } from './dates';

export const PATTERNS = [
  { id: 'T2-T4', days: [1, 3], label: 'Thứ 2 - Thứ 4', short: 'T2-T4', slots: [['17:30', '19:30']] },
  { id: 'T3-T5', days: [2, 4], label: 'Thứ 3 - Thứ 5', short: 'T3-T5', slots: [['17:30', '19:30']] },
  { id: 'T7-CN', days: [6, 0], label: 'Thứ 7 - Chủ nhật', short: 'T7-CN', slots: [['07:30', '09:30'], ['09:40', '11:40'], ['14:30', '16:30'], ['17:00', '19:00']] },
];
// Các lựa chọn "Lịch học" (cặp ngày + khung giờ)
export const SCHED_CHOICES = PATTERNS.flatMap((p) => p.slots.map(([start, end]) => ({ value: `${p.id}|${start}|${end}`, label: `${p.label} • ${start} - ${end}`, days: p.days, start, end })));
export const daysOf = (c) => (Array.isArray(c?.days) ? c.days : [c?.weekday, c?.weekday2].filter((x) => x !== null && x !== undefined && x !== ''));
export const meets = (c, wd) => daysOf(c).includes(wd);
export const shareDay = (a, b) => daysOf(a).some((d) => daysOf(b).includes(d));
export const patternOf = (c) => { const d = daysOf(c); return PATTERNS.find((p) => p.days.length === d.length && p.days.every((x) => d.includes(x))); };
export const patternLabel = (c) => patternOf(c)?.label || daysOf(c).map(weekdayLabel).join(' - ');
export const patternShort = (c) => patternOf(c)?.short || daysOf(c).map((w) => (w === 0 ? 'CN' : `T${w + 1}`)).join('-');
export const schedText = (c) => `${patternLabel(c)}, ${c.start} - ${c.end}`;
export const isValidSchedule = (days, start, end) => SCHED_CHOICES.some((o) => o.start === start && o.end === end && o.days.length === days.length && o.days.every((x) => days.includes(x)));
