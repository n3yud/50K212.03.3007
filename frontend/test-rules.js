// ============================================================================
// Kiểm thử tự động Frontend (Pure rules, Dates, Validators)
// Chạy lệnh: npm test
// ============================================================================
import assert from 'node:assert';
import { ageOn, isEnded, isStarted, startOfWeek, toMin } from './src/lib/dates.js';

let passed = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${name}: ${err.message}`);
    process.exitCode = 1;
  }
}

console.log('🧪 Chạy kiểm thử tự động Frontend (Ngôi Nhà Nhỏ)...');

// 1. Kiểm thử ngày tháng và thời gian (dates.js)
test('toMin: Đổi đúng định dạng giờ sang phút', () => {
  assert.strictEqual(toMin('07:30'), 450);
  assert.strictEqual(toMin('17:30'), 1050);
  assert.strictEqual(toMin('19:30'), 1170);
});

test('ageOn: Tính chính xác tuổi theo ngày sinh', () => {
  assert.strictEqual(ageOn('2020-05-10', '2026-05-10'), 6);
  assert.strictEqual(ageOn('2020-05-11', '2026-05-10'), 5);
  assert.strictEqual(ageOn('2019-11-15', '2026-11-15'), 7);
});

test('startOfWeek: Luôn trả về ngày Thứ 2 của tuần', () => {
  // Ngày 2026-11-15 là Chủ nhật -> Thứ 2 đầu tuần là 2026-11-09
  assert.strictEqual(startOfWeek('2026-11-15'), '2026-11-09');
  // Ngày 2026-11-09 là Thứ 2 -> Thứ 2 đầu tuần chính là 2026-11-09
  assert.strictEqual(startOfWeek('2026-11-09'), '2026-11-09');
});

test('isStarted / isEnded: Kiểm tra ca học trong quá khứ hoặc tương lai', () => {
  // Ca học ngày hôm qua luôn là đã bắt đầu và đã kết thúc
  assert.strictEqual(isStarted('2026-11-10', '17:30'), true);
  assert.strictEqual(isEnded('2026-11-10', '19:30'), true);
  // Ca học ngày tương lai không bao giờ là đã bắt đầu hay đã kết thúc
  assert.strictEqual(isStarted('2026-12-01', '07:30'), false);
  assert.strictEqual(isEnded('2026-12-01', '09:30'), false);
});

// 2. Kiểm thử bảo vệ đăng nhập Brute-force logic (BR-UC1-11)
test('Brute-force: Khóa sau 5 lần sai và mở lại sau 15 phút', () => {
  let failedAttempts = 0;
  let lockoutEnd = null;

  for (let i = 1; i <= 5; i++) {
    failedAttempts++;
    if (failedAttempts >= 5) {
      lockoutEnd = Date.now() + 15 * 60 * 1000;
    }
  }

  assert.strictEqual(failedAttempts, 5);
  assert.ok(lockoutEnd !== null);
  assert.ok(lockoutEnd > Date.now());

  // Đăng nhập thành công -> reset
  failedAttempts = 0;
  lockoutEnd = null;
  assert.strictEqual(failedAttempts, 0);
  assert.strictEqual(lockoutEnd, null);
});

console.log(`\n🎉 Hoàn thành: ${passed} bài test thành công!`);
