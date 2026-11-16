/* =====================================================================
   DỮ LIỆU MẪU PostgreSQL – chạy SAU 01_schema_postgres.sql
   Mật khẩu mẫu Nhanho@123 (BCrypt hash)
   ===================================================================== */

-- Hàm hỗ trợ ngày (tính ngày Thứ X tiếp theo / trước từ một ngày)
CREATE OR REPLACE FUNCTION fn_next_weekday(wd INT, from_date DATE) RETURNS DATE AS $$
DECLARE diff INT;
BEGIN
  -- PostgreSQL: EXTRACT(DOW ...) 0=CN,1=T2,...,6=T7
  diff := ((wd - EXTRACT(DOW FROM from_date)::INT + 7) % 7);
  IF diff = 0 THEN diff := 7; END IF;
  RETURN from_date + diff;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_prev_weekday(wd INT, from_date DATE) RETURNS DATE AS $$
DECLARE diff INT;
BEGIN
  diff := ((EXTRACT(DOW FROM from_date)::INT - wd + 7) % 7);
  IF diff = 0 THEN diff := 7; END IF;
  RETURN from_date - diff;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_next_meet(class_id INT, from_date DATE) RETURNS DATE AS $$
DECLARE wd1 INT; wd2 INT; d1 DATE; d2 DATE;
BEGIN
  SELECT "Weekday", "Weekday2" INTO wd1, wd2 FROM "Classes" WHERE "ClassId" = class_id;
  d1 := fn_next_weekday(wd1, from_date);
  d2 := fn_next_weekday(wd2, from_date);
  RETURN LEAST(d1, d2);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_prev_meet(class_id INT, from_date DATE) RETURNS DATE AS $$
DECLARE wd1 INT; wd2 INT; d1 DATE; d2 DATE;
BEGIN
  SELECT "Weekday", "Weekday2" INTO wd1, wd2 FROM "Classes" WHERE "ClassId" = class_id;
  d1 := fn_prev_weekday(wd1, from_date);
  d2 := fn_prev_weekday(wd2, from_date);
  RETURN GREATEST(d1, d2);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_count_weekday_in_month(wd INT, first_of_month DATE) RETURNS INT AS $$
DECLARE cnt INT := 0; d DATE := first_of_month;
BEGIN
  WHILE EXTRACT(MONTH FROM d) = EXTRACT(MONTH FROM first_of_month) LOOP
    IF EXTRACT(DOW FROM d)::INT = wd THEN cnt := cnt + 1; END IF;
    d := d + 1;
  END LOOP;
  RETURN cnt;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  today      DATE := CURRENT_DATE;
  pw         TEXT := '$2b$11$/.liJknXJ64GHmqOOyYVuuRvZX.DZuA1JL7HzT42/NNKQLbEA1g.q';  -- Nhanho@123
  pw2        TEXT := '$2b$11$QFMexYPW7Nvs3isrZJWnBe.7gh7rDSJIIetF4LRmQ9dRC.SdPheZi';  -- 345678
  pwX        TEXT := '$2b$11$GevIc3VVtHQ0CvnRimLaSeGv6EU6m2hcZ6Xm73eL/WUu7VkeaQVGe';
  tl_id      INT;
  ph_id      INT;
  ql_id      INT;
  d          DATE;
  m0         DATE;
  m_prev     DATE;
  m1         DATE;
  att_id     INT;
  rn_val     INT;
BEGIN

-- Xóa dữ liệu cũ và reset ID về 1 trước khi nạp lại
TRUNCATE "AuditLog", "ProgressRecords", "Journal", "Notifications", "Absences", "Trials", "AttendanceRecords", "Attendances", "Tuition", "StudentClasses", "Students", "Classes", "Users" RESTART IDENTITY CASCADE;

/* ---- Nhân sự ---- */
INSERT INTO "Users" ("Username","Email","PasswordHash","Role","FullName","Title","Phone") VALUES
 ('thanhnhi',  'thanhnhi@ngoinhanho.vn',  pw, 'assistant',  'Thanh Nhi',  '',     '0901234001'),
 ('minhchau',  'minhchau@ngoinhanho.vn',  pw, 'manager',    'Minh Châu',  '',     '0901234002'),
 ('thaibao',   'thaibao@ngoinhanho.vn',   pw, 'supervisor', 'Thái Bảo',   '',     '0901234003'),
 ('myduyen',   'myduyen@ngoinhanho.vn',   pw, 'teacher',    'Mỹ Duyên',   'Cô',   '0901234004'),
 ('baochau',   'baochau@ngoinhanho.vn',   pw, 'teacher',    'Bảo Châu',   'Cô',   '0901234005'),
 ('quynh',     'quynh@ngoinhanho.vn',     pw, 'teacher',    'Quỳnh',      'Cô',   '0901234006'),
 ('thuha',     'thuha@ngoinhanho.vn',     pw, 'teacher',    'Thu Hà',     'Cô',   '0901234007'),
 ('minhkhoa',  'minhkhoa@ngoinhanho.vn',  pw, 'teacher',    'Minh Khoa',  'Thầy', '0901234008'),
 ('lananh',    'lananh@ngoinhanho.vn',    pw, 'teacher',    'Lan Anh',    'Cô',   '0901234009');
INSERT INTO "Users" ("Username","Email","PasswordHash","Role","FullName","Title","IsLocked","Phone") VALUES
 ('khoa.tk', 'khoa.tk@ngoinhanho.vn', pw, 'teacher', 'Tài khoản bị khóa', '', TRUE, '0901234010');

/* ---- Lớp học ---- */
INSERT INTO "Classes" ("Name","Program","Weekday","Weekday2","StartTime","EndTime","TeacherId","Letter") VALUES
 ('Cơ bản - Thế giới màu sắc',       'Cơ bản',   2, 4, '17:30', '19:30', (SELECT "UserId" FROM "Users" WHERE "Username"='myduyen'),  'A'),
 ('Nâng cao - Vẽ tĩnh vật',          'Nâng cao', 2, 4, '17:30', '19:30', (SELECT "UserId" FROM "Users" WHERE "Username"='baochau'),  'A'),
 ('Nâng cao - Góc phố nhỏ',          'Nâng cao', 2, 4, '17:30', '19:30', (SELECT "UserId" FROM "Users" WHERE "Username"='quynh'),    'B'),
 ('Cơ bản - Sắc màu diệu kỳ',        'Cơ bản',   1, 3, '17:30', '19:30', (SELECT "UserId" FROM "Users" WHERE "Username"='thuha'),    'A'),
 ('Nâng cao - Phong cảnh quê hương', 'Nâng cao', 1, 3, '17:30', '19:30', (SELECT "UserId" FROM "Users" WHERE "Username"='baochau'),  'A'),
 ('Cơ bản - Bé vẽ động vật',         'Cơ bản',   6, 0, '14:30', '16:30', (SELECT "UserId" FROM "Users" WHERE "Username"='thuha'),    'A'),
 ('Nâng cao - Ký họa nhanh',         'Nâng cao', 6, 0, '14:30', '16:30', (SELECT "UserId" FROM "Users" WHERE "Username"='minhkhoa'), 'A'),
 ('Cơ bản - Nét vẽ vui',             'Cơ bản',   6, 0, '09:40', '11:40', (SELECT "UserId" FROM "Users" WHERE "Username"='lananh'),   'A'),
 ('Nâng cao - Màu nước cơ bản',      'Nâng cao', 6, 0, '09:40', '11:40', (SELECT "UserId" FROM "Users" WHERE "Username"='quynh'),    'A'),
 ('Cơ bản - Bé tập tô màu',          'Cơ bản',   1, 3, '17:30', '19:30', (SELECT "UserId" FROM "Users" WHERE "Username"='lananh'),   'B'),
 ('Nâng cao - Hình khối',            'Nâng cao', 1, 3, '17:30', '19:30', (SELECT "UserId" FROM "Users" WHERE "Username"='minhkhoa'), 'B'),
 ('Cơ bản - Vẽ cùng bé',             'Cơ bản',   6, 0, '07:30', '09:30', (SELECT "UserId" FROM "Users" WHERE "Username"='myduyen'),  'A'),
 ('Cơ bản - Nét vẽ đầu đời',         'Cơ bản',   1, 3, '17:30', '19:30', (SELECT "UserId" FROM "Users" WHERE "Username"='myduyen'),  'C'),
 ('Nâng cao - Tranh cổ tích',        'Nâng cao', 2, 4, '17:30', '19:30', (SELECT "UserId" FROM "Users" WHERE "Username"='thuha'),    'C'),
 ('Cơ bản - Vườn hoa tuổi thơ',      'Cơ bản',   6, 0, '09:40', '11:40', (SELECT "UserId" FROM "Users" WHERE "Username"='baochau'),  'B'),
 ('Nâng cao - Sáng tạo sắc màu',     'Nâng cao', 6, 0, '14:30', '16:30', (SELECT "UserId" FROM "Users" WHERE "Username"='minhkhoa'), 'B');

/* ---- Học viên ---- */
INSERT INTO "Students" ("Code","FullName","DateOfBirth","Gender","ParentName","ParentPhone","Program","Status","CreatedAt") VALUES
 ('HV0001','Nguyễn Gia Hân',   make_date(EXTRACT(YEAR FROM today)::INT-6, 1,3),  'Nữ','Nguyễn Văn Hải','0901234567','Cơ bản','Đang học',NOW()-INTERVAL'60 days'),
 ('HV0002','Phạm Khánh Vy',    make_date(EXTRACT(YEAR FROM today)::INT-5, 2,4),  'Nữ','Phạm Thị Lan','0903111222','Cơ bản','Đang học',NOW()-INTERVAL'59 days'),
 ('HV0003','Trần Thảo Nguyên', make_date(EXTRACT(YEAR FROM today)::INT-6, 3,5),  'Nữ','Trần Văn Nam','0987000111','Cơ bản','Đang học',NOW()-INTERVAL'58 days'),
 ('HV0004','Hoàng Gia Bảo',    make_date(EXTRACT(YEAR FROM today)::INT-5, 4,6),  'Nam','Hoàng Thị Hoa','0905222333','Cơ bản','Đang học',NOW()-INTERVAL'114 days'),
 ('HV0005','Lê Minh Anh',      make_date(EXTRACT(YEAR FROM today)::INT-6, 5,7),  'Nữ','Lê Văn Hải','0912000444','Cơ bản','Đang học',NOW()-INTERVAL'112 days'),
 ('HV0006','Vũ Đức Anh',       make_date(EXTRACT(YEAR FROM today)::INT-5, 6,8),  'Nam','Vũ Thị Lan','0935111555','Cơ bản','Đang học',NOW()-INTERVAL'110 days'),
 ('HV0007','Đặng Hoài Thương', make_date(EXTRACT(YEAR FROM today)::INT-5, 1,9),  'Nữ','Đặng Văn Nam','0944666777','Cơ bản','Đang học',NOW()-INTERVAL'108 days'),
 ('HV0008','Bùi Quốc Bảo',     make_date(EXTRACT(YEAR FROM today)::INT-6, 2,10), 'Nam','Bùi Thị Hoa','0977888999','Cơ bản','Đang học',NOW()-INTERVAL'106 days'),
 ('HV0009','Ngô Khánh Linh',   make_date(EXTRACT(YEAR FROM today)::INT-6, 3,11), 'Nữ','Ngô Văn Hải','0966123123','Cơ bản','Đang học',NOW()-INTERVAL'104 days'),
 ('HV0010','Phan Gia Huy',     make_date(EXTRACT(YEAR FROM today)::INT-5, 4,12), 'Nam','Phan Thị Lan','0988321321','Cơ bản','Đang học',NOW()-INTERVAL'102 days'),
 ('HV0011','Đỗ Bảo Châu',      make_date(EXTRACT(YEAR FROM today)::INT-6, 5,13), 'Nữ','Đỗ Văn Nam','0911555666','Cơ bản','Đang học',NOW()-INTERVAL'100 days'),
 ('HV0012','Lý Minh Khang',    make_date(EXTRACT(YEAR FROM today)::INT-6, 6,14), 'Nam','Lý Thị Hoa','0922444333','Cơ bản','Đang học',NOW()-INTERVAL'98 days'),
 ('HV0013','Trương Mai Chi',   make_date(EXTRACT(YEAR FROM today)::INT-5, 1,15), 'Nữ','Trương Văn Hải','0933777222','Cơ bản','Đang học',NOW()-INTERVAL'96 days'),
 ('HV0014','Huỳnh Tuấn Kiệt',  make_date(EXTRACT(YEAR FROM today)::INT-6, 2,16), 'Nam','Huỳnh Thị Lan','0955999000','Cơ bản','Đang học',NOW()-INTERVAL'94 days'),
 ('HV0015','Võ Ngọc Hân',      make_date(EXTRACT(YEAR FROM today)::INT-5, 3,17), 'Nữ','Võ Văn Nam','0966000111','Cơ bản','Đang học',NOW()-INTERVAL'92 days'),
 ('HV0016','Đinh Anh Thư',     make_date(EXTRACT(YEAR FROM today)::INT-6, 4,18), 'Nữ','Đinh Thị Hoa','0977111000','Cơ bản','Đang học',NOW()-INTERVAL'90 days'),
 ('HV0017','Nguyễn Minh Khôi', make_date(EXTRACT(YEAR FROM today)::INT-8, 5,19), 'Nam','Nguyễn Văn Hải','0901234567','Nâng cao','Đang học',NOW()-INTERVAL'88 days'),
 ('HV0018','Lê Hoàng Long',    make_date(EXTRACT(YEAR FROM today)::INT-9, 6,20), 'Nam','Lê Thị Lan','0902333444','Nâng cao','Đang học',NOW()-INTERVAL'86 days'),
 ('HV0019','Trần Ngọc Diệp',   make_date(EXTRACT(YEAR FROM today)::INT-10,1,21), 'Nữ','Trần Văn Nam','0903444555','Nâng cao','Đang học',NOW()-INTERVAL'84 days'),
 ('HV0020','Phạm Quang Huy',   make_date(EXTRACT(YEAR FROM today)::INT-7, 2,22), 'Nam','Phạm Thị Hoa','0904555666','Nâng cao','Đang học',NOW()-INTERVAL'82 days'),
 ('HV0021','Đoàn Thiên Ân',    make_date(EXTRACT(YEAR FROM today)::INT-8, 3,3),  'Nam','Đoàn Văn Hải','0905666777','Nâng cao','Đang học',NOW()-INTERVAL'80 days'),
 ('HV0022','Mai Khánh Chi',    make_date(EXTRACT(YEAR FROM today)::INT-11,4,4),  'Nữ','Mai Thị Lan','0906777888','Nâng cao','Đang học',NOW()-INTERVAL'78 days'),
 ('HV0023','Cao Bảo Trâm',     make_date(EXTRACT(YEAR FROM today)::INT-12,5,5),  'Nữ','Cao Văn Nam','0907888999','Nâng cao','Đang học',NOW()-INTERVAL'76 days'),
 ('HV0024','Hồ Gia Phúc',      make_date(EXTRACT(YEAR FROM today)::INT-9, 6,6),  'Nam','Hồ Thị Hoa','0908999000','Nâng cao','Đang học',NOW()-INTERVAL'74 days'),
 ('HV0025','Tạ Phương Nhi',    make_date(EXTRACT(YEAR FROM today)::INT-13,1,7),  'Nữ','Tạ Văn Hải','0909000111','Nâng cao','Đang học',NOW()-INTERVAL'72 days'),
 ('HV0026','Lâm Anh Khoa',     make_date(EXTRACT(YEAR FROM today)::INT-7, 2,8),  'Nam','Lâm Thị Lan','0910111222','Nâng cao','Đang học',NOW()-INTERVAL'70 days'),
 ('HV0027','Dương Bảo Ngân',   make_date(EXTRACT(YEAR FROM today)::INT-10,3,9),  'Nữ','Dương Văn Nam','0911222333','Nâng cao','Đang học',NOW()-INTERVAL'68 days'),
 ('HV0028','Kiều Minh Quân',   make_date(EXTRACT(YEAR FROM today)::INT-8, 4,10), 'Nam','Kiều Thị Hoa','0912333444','Nâng cao','Đang học',NOW()-INTERVAL'66 days'),
 ('HV0029','Thái Bảo Hân',     make_date(EXTRACT(YEAR FROM today)::INT-9, 5,11), 'Nữ','Thái Văn Hải','0913444555','Nâng cao','Đang học',NOW()-INTERVAL'64 days'),
 ('HV0030','Tô Gia Bình',      make_date(EXTRACT(YEAR FROM today)::INT-11,6,12), 'Nam','Tô Thị Lan','0914555666','Nâng cao','Đang học',NOW()-INTERVAL'62 days'),
 ('HV0031','Châu Nhật Minh',   make_date(EXTRACT(YEAR FROM today)::INT-12,1,13), 'Nam','Châu Văn Nam','0915666777','Nâng cao','Đang học',NOW()-INTERVAL'60 days'),
 ('HV0032','Quách Thảo Vy',    make_date(EXTRACT(YEAR FROM today)::INT-7, 2,14), 'Nữ','Quách Thị Hoa','0916777888','Nâng cao','Đang học',NOW()-INTERVAL'58 days'),
 ('HV0033','Âu Dương Khải',    make_date(EXTRACT(YEAR FROM today)::INT-13,3,15), 'Nam','Âu Văn Hải','0917888999','Nâng cao','Đang học',NOW()-INTERVAL'56 days'),
 ('HV0034','Lương Bích Ngọc',  make_date(EXTRACT(YEAR FROM today)::INT-11,4,16), 'Nữ','Lương Thị Lan','0918999000','Nâng cao','Đang học',NOW()-INTERVAL'54 days'),
 ('HV0035','Mạc Thiên Phú',    make_date(EXTRACT(YEAR FROM today)::INT-10,5,17), 'Nam','Mạc Văn Nam','0919000111','Nâng cao','Đang học',NOW()-INTERVAL'52 days'),
 ('HV0036','Phùng Khả Hân',    make_date(EXTRACT(YEAR FROM today)::INT-9, 6,18), 'Nữ','Phùng Thị Hoa','0920111222','Nâng cao','Đang học',NOW()-INTERVAL'50 days'),
 ('HV0037','Giang Hải Đăng',   make_date(EXTRACT(YEAR FROM today)::INT-12,1,19), 'Nam','Giang Văn Hải','0921222333','Nâng cao','Đang học',NOW()-INTERVAL'48 days'),
 ('HV0038','Từ Gia Linh',      make_date(EXTRACT(YEAR FROM today)::INT-8, 2,20), 'Nữ','Từ Thị Lan','0922333444','Nâng cao','Đang học',NOW()-INTERVAL'46 days'),
 ('HV0039','Nguyễn Hà My',     make_date(EXTRACT(YEAR FROM today)::INT-5, 3,21), 'Nữ','Nguyễn Văn Nam','0923444555','Cơ bản','Chờ xếp lớp',NOW()-INTERVAL'44 days'),
 ('HV0040','Trần Đức Thịnh',   make_date(EXTRACT(YEAR FROM today)::INT-8, 4,22), 'Nam','Trần Thị Hoa','0924555666','Nâng cao','Chờ xếp lớp',NOW()-INTERVAL'42 days'),
 ('HV0041','Võ Thảo Vi',       make_date(EXTRACT(YEAR FROM today)::INT-6, 5,3),  'Nữ','Võ Văn Hải','0925666777','Cơ bản','Đã bảo lưu',NOW()-INTERVAL'40 days'),
 ('HV0042','Lê Quốc Việt',     make_date(EXTRACT(YEAR FROM today)::INT-9, 6,4),  'Nam','Lê Thị Lan','0926777888','Nâng cao','Đã bảo lưu',NOW()-INTERVAL'38 days'),
 ('HV0043','Hà Bảo An',        make_date(EXTRACT(YEAR FROM today)::INT-5, 1,5),  'Nam','Hà Văn Nam','0927888999','Cơ bản','Đã bảo lưu',NOW()-INTERVAL'36 days'),
 ('HV0044','Hoàng Nhật Nam',   make_date(EXTRACT(YEAR FROM today)::INT-6, 2,12), 'Nam','Hoàng Văn Hải','0938111222','Cơ bản','Đang học',NOW()-INTERVAL'35 days'),
 ('HV0045','Vũ Thùy Linh',     make_date(EXTRACT(YEAR FROM today)::INT-5, 3,14), 'Nữ','Vũ Thị Lan','0938222333','Cơ bản','Đang học',NOW()-INTERVAL'34 days'),
 ('HV0046','Nguyễn Tùng Dương',make_date(EXTRACT(YEAR FROM today)::INT-9, 4,16), 'Nam','Nguyễn Văn Nam','0938333444','Nâng cao','Đang học',NOW()-INTERVAL'33 days'),
 ('HV0047','Phan Bảo Hân',     make_date(EXTRACT(YEAR FROM today)::INT-10,5,18), 'Nữ','Phan Thị Hoa','0938444555','Nâng cao','Đang học',NOW()-INTERVAL'32 days'),
 ('HV0048','Đỗ Minh Trí',      make_date(EXTRACT(YEAR FROM today)::INT-6, 6,20), 'Nam','Đỗ Văn Hải','0938555666','Cơ bản','Đang học',NOW()-INTERVAL'31 days'),
 ('HV0049','Trương Tuệ Mẫn',   make_date(EXTRACT(YEAR FROM today)::INT-5, 7,22), 'Nữ','Trương Thị Lan','0938666777','Cơ bản','Đang học',NOW()-INTERVAL'30 days'),
 ('HV0050','Lê Tuấn Hưng',     make_date(EXTRACT(YEAR FROM today)::INT-11,8,24), 'Nam','Lê Văn Nam','0938777888','Nâng cao','Đang học',NOW()-INTERVAL'29 days'),
 ('HV0051','Ngô Mỹ Uyên',      make_date(EXTRACT(YEAR FROM today)::INT-8, 9,26), 'Nữ','Ngô Thị Hoa','0938888999','Nâng cao','Đang học',NOW()-INTERVAL'28 days'),
 ('HV0052','Trần Đăng Khoa',   make_date(EXTRACT(YEAR FROM today)::INT-6,10,28), 'Nam','Trần Văn Hải','0939111222','Cơ bản','Đang học',NOW()-INTERVAL'27 days'),
 ('HV0053','Bùi Diệu Linh',    make_date(EXTRACT(YEAR FROM today)::INT-5,11,1),  'Nữ','Bùi Thị Lan','0939222333','Cơ bản','Đang học',NOW()-INTERVAL'26 days'),
 ('HV0054','Phạm Minh Quân',   make_date(EXTRACT(YEAR FROM today)::INT-7,12,3),  'Nam','Phạm Văn Nam','0939333444','Nâng cao','Đang học',NOW()-INTERVAL'25 days'),
 ('HV0055','Đặng Thảo Trang',  make_date(EXTRACT(YEAR FROM today)::INT-9, 1,5),  'Nữ','Đặng Thị Hoa','0939444555','Nâng cao','Đang học',NOW()-INTERVAL'24 days'),
 ('HV0056','Lý Quốc Hưng',     make_date(EXTRACT(YEAR FROM today)::INT-6, 2,7),  'Nam','Lý Văn Hải','0939555666','Cơ bản','Đang học',NOW()-INTERVAL'23 days'),
 ('HV0057','Hồ Phương Dung',   make_date(EXTRACT(YEAR FROM today)::INT-5, 3,9),  'Nữ','Hồ Thị Lan','0939666777','Cơ bản','Đang học',NOW()-INTERVAL'22 days'),
 ('HV0058','Võ Đình Phong',    make_date(EXTRACT(YEAR FROM today)::INT-10,4,11), 'Nam','Võ Văn Nam','0939777888','Nâng cao','Đang học',NOW()-INTERVAL'21 days'),
 ('HV0059','Đinh Hồng Hạnh',   make_date(EXTRACT(YEAR FROM today)::INT-8, 5,13), 'Nữ','Đinh Thị Hoa','0939888999','Nâng cao','Đang học',NOW()-INTERVAL'20 days'),
 ('HV0060','Mai Hoàng Bách',   make_date(EXTRACT(YEAR FROM today)::INT-6, 6,15), 'Nam','Mai Văn Hải','0940111222','Cơ bản','Đang học',NOW()-INTERVAL'19 days'),
 ('HV0061','Phan Kim Ngân',    make_date(EXTRACT(YEAR FROM today)::INT-5, 7,17), 'Nữ','Phan Văn Hải','0940222333','Cơ bản','Đang học',NOW()-INTERVAL'18 days'),
 ('HV0062','Trịnh Gia Hưng',   make_date(EXTRACT(YEAR FROM today)::INT-6, 8,19), 'Nam','Trịnh Thị Lan','0940333444','Cơ bản','Đang học',NOW()-INTERVAL'17 days'),
 ('HV0063','Lâm Bảo Ngọc',    make_date(EXTRACT(YEAR FROM today)::INT-5, 9,21), 'Nữ','Lâm Văn Nam','0940444555','Cơ bản','Đang học',NOW()-INTERVAL'16 days'),
 ('HV0064','Dương Thành Đạt',  make_date(EXTRACT(YEAR FROM today)::INT-9,10,23), 'Nam','Dương Thị Hoa','0940555666','Nâng cao','Chờ xếp lớp',NOW()-INTERVAL'15 days'),
 ('HV0065','Kiều Thục Anh',    make_date(EXTRACT(YEAR FROM today)::INT-10,11,25),'Nữ','Kiều Văn Hải','0940666777','Nâng cao','Chờ xếp lớp',NOW()-INTERVAL'14 days'),
 ('HV0066','Châu Minh Long',   make_date(EXTRACT(YEAR FROM today)::INT-8,12,27), 'Nam','Châu Thị Lan','0940777888','Nâng cao','Chờ xếp lớp',NOW()-INTERVAL'13 days'),
 ('HV0067','Vũ Mai Phương',    make_date(EXTRACT(YEAR FROM today)::INT-5, 1,29), 'Nữ','Vũ Văn Nam','0940888999','Cơ bản','Đang học',NOW()-INTERVAL'12 days'),
 ('HV0068','Tạ Minh Khang',    make_date(EXTRACT(YEAR FROM today)::INT-6, 2,2),  'Nam','Tạ Thị Hoa','0941111222','Cơ bản','Đã bảo lưu',NOW()-INTERVAL'30 days'),
 ('HV0069','Lương Hoài An',    make_date(EXTRACT(YEAR FROM today)::INT-5, 3,4),  'Nữ','Lương Văn Hải','0941222333','Cơ bản','Đã bảo lưu',NOW()-INTERVAL'28 days'),
 ('HV0070','Mạc Quốc Dũng',   make_date(EXTRACT(YEAR FROM today)::INT-9, 4,6),  'Nam','Mạc Thị Lan','0941333444','Nâng cao','Đã bảo lưu',NOW()-INTERVAL'26 days'),
 ('HV0071','Phùng Bảo Châu',   make_date(EXTRACT(YEAR FROM today)::INT-10,5,8),  'Nữ','Phùng Văn Nam','0941444555','Nâng cao','Đã bảo lưu',NOW()-INTERVAL'24 days'),
 ('HV0072','Giang Gia Huy',    make_date(EXTRACT(YEAR FROM today)::INT-6, 6,10), 'Nam','Giang Thị Hoa','0941555666','Cơ bản','Đã bảo lưu',NOW()-INTERVAL'22 days'),
 ('HV0073','Từ Ái Linh',       make_date(EXTRACT(YEAR FROM today)::INT-5, 7,12), 'Nữ','Từ Văn Hải','0941666777','Cơ bản','Đã bảo lưu',NOW()-INTERVAL'20 days'),
 ('HV0074','Đoàn Nhật Quang',  make_date(EXTRACT(YEAR FROM today)::INT-8, 8,14), 'Nam','Đoàn Thị Lan','0941777888','Nâng cao','Đã bảo lưu',NOW()-INTERVAL'18 days'),
 ('HV0075','Cao Ngọc Mai',     make_date(EXTRACT(YEAR FROM today)::INT-7, 9,16), 'Nữ','Cao Văn Nam','0941888999','Nâng cao','Đã bảo lưu',NOW()-INTERVAL'16 days');

/* ---- Học viên – lớp ---- */
INSERT INTO "StudentClasses" ("StudentId","ClassId","IsActive") VALUES
 (1,10,TRUE),(1,12,TRUE),(1,8,TRUE),
 (2,1,TRUE),(3,1,TRUE),(3,4,TRUE),(4,1,TRUE),(5,1,TRUE),(6,1,TRUE),
 (7,4,TRUE),(8,4,TRUE),(9,4,TRUE),(9,6,TRUE),
 (10,6,TRUE),(11,6,TRUE),
 (12,8,TRUE),(13,8,TRUE),(13,10,TRUE),
 (14,10,TRUE),(15,12,TRUE),(16,12,TRUE),
 (17,2,TRUE),(17,5,TRUE),(18,2,TRUE),(19,2,TRUE),(19,11,TRUE),
 (20,2,TRUE),(21,2,TRUE),(22,2,TRUE),(23,2,TRUE),(23,7,TRUE),
 (24,3,TRUE),(25,3,TRUE),(25,5,TRUE),(26,3,TRUE),(27,3,TRUE),(28,3,TRUE),(29,3,TRUE),(30,3,TRUE),
 (31,5,TRUE),(31,7,TRUE),(32,5,TRUE),(33,7,TRUE),(34,7,TRUE),(34,9,TRUE),
 (35,9,TRUE),(36,9,TRUE),(36,11,TRUE),(37,11,TRUE),(38,11,TRUE),
 (41,1,FALSE),(42,2,FALSE),(43,4,FALSE),
 (44,13,TRUE),(45,13,TRUE),(61,13,TRUE),(62,13,TRUE),(63,13,TRUE),(67,13,TRUE),(45,8,TRUE),(46,14,TRUE),(47,14,TRUE),(47,3,TRUE),
 (48,15,TRUE),(49,15,TRUE),(49,6,TRUE),(50,16,TRUE),(51,16,TRUE),(51,7,TRUE),
 (52,1,TRUE),(53,4,TRUE),(54,2,TRUE),(55,5,TRUE),(56,10,TRUE),
 (57,12,TRUE),(58,11,TRUE),(59,9,TRUE),(60,8,TRUE),
 (68,1,FALSE),(69,4,FALSE),(70,2,FALSE),(71,5,FALSE),(72,8,FALSE),(73,10,FALSE),(74,9,FALSE),(75,11,FALSE);

/* ---- Tài khoản phụ huynh ---- */
INSERT INTO "Users" ("Username","PasswordHash","Role","FullName","Phone","MustChangePassword")
SELECT s."ParentPhone",
       CASE WHEN s."ParentPhone" = '0901234567' THEN pw ELSE pwX END,
       'parent', MIN(s."ParentName"), s."ParentPhone",
       CASE WHEN s."ParentPhone" = '0901234567' THEN FALSE ELSE TRUE END
FROM "Students" s GROUP BY s."ParentPhone";
INSERT INTO "Users" ("Username","PasswordHash","Role","FullName","Phone","MustChangePassword") VALUES
 ('0912345678',pw2,'parent','Phụ huynh 5678','0912345678',TRUE),
 ('0987654321',pwX,'parent','Phụ huynh 4321','0987654321',TRUE),
 ('0905101222',pwX,'parent','Phụ huynh 1222','0905101222',TRUE),
 ('0942111222',pwX,'parent','Phụ huynh Yến','0942111222',TRUE),
 ('0942222333',pwX,'parent','Phụ huynh Long','0942222333',TRUE),
 ('0942333444',pwX,'parent','Phụ huynh Nga','0942333444',TRUE);

/* ---- Học phí ---- */
m0     := date_trunc('month', today)::DATE;
m_prev := (m0 - INTERVAL'1 month')::DATE;
m1     := (m0 + INTERVAL'1 month')::DATE;

INSERT INTO "Tuition" ("StudentId","Month","Amount","TotalSessions","Status","PaidAt")
SELECT s."StudentId",
       TO_CHAR(m.d,'YYYY-MM'),
       900000,
       COALESCE((SELECT SUM(fn_count_weekday_in_month(c."Weekday", m.d) + fn_count_weekday_in_month(c."Weekday2", m.d))
                 FROM "StudentClasses" sc JOIN "Classes" c ON c."ClassId" = sc."ClassId"
                 WHERE sc."StudentId" = s."StudentId" AND sc."IsActive" = TRUE), 8),
       CASE
         WHEN m.d = m_prev THEN 'Đã thanh toán'
         WHEN (m.d = m0 AND s."StudentId" IN (2,4,19,26,44,48,54)) OR (m.d = m1 AND s."StudentId" % 2 = 0) THEN 'Chưa thanh toán'
         ELSE 'Đã thanh toán'
       END,
       CASE
         WHEN (m.d = m0 AND s."StudentId" IN (2,4,19,26,44,48,54)) OR (m.d = m1 AND s."StudentId" % 2 = 0) THEN NULL
         ELSE NOW() - INTERVAL'5 days'
       END
FROM "Students" s
CROSS JOIN (VALUES (m_prev),(m0),(m1)) AS m(d)
WHERE s."Status" = 'Đang học';

/* ---- Học thử ---- */
tl_id := (SELECT "UserId" FROM "Users" WHERE "Username" = 'thanhnhi');

INSERT INTO "Trials" ("StudentName","DateOfBirth","ParentPhone","WishDays","WishSlot","Program","Status","SessionClassId","SessionDate","CreatedAt") VALUES
 ('Nguyễn Minh An',   make_date(EXTRACT(YEAR FROM today)::INT-6,3,15),  '0912345678','2,4','17:30 - 19:30',NULL,       'Chờ tiếp nhận',         NULL, NULL, NOW()-INTERVAL'2 hours'),
 ('Trần Bảo Ngọc',    make_date(EXTRACT(YEAR FROM today)::INT-7,8,22),  '0987654321','2,4','17:30 - 19:30',NULL,       'Chờ tiếp nhận',         NULL, NULL, NOW()-INTERVAL'5 hours'),
 ('Lê Gia Hân',       make_date(EXTRACT(YEAR FROM today)::INT-8,1,10),  '0905101222','2,4','17:30 - 19:30',NULL,       'Chờ tiếp nhận',         NULL, NULL, NOW()-INTERVAL'8 hours'),
 ('Ngô Hải Yến',      make_date(EXTRACT(YEAR FROM today)::INT-6,2,12),  '0942111222','1,3','17:30 - 19:30',NULL,       'Chờ tiếp nhận',         NULL, NULL, NOW()-INTERVAL'12 hours'),
 ('Trần Bảo Long',    make_date(EXTRACT(YEAR FROM today)::INT-8,4,18),  '0942222333','2,4','17:30 - 19:30',NULL,       'Chờ tiếp nhận',         NULL, NULL, NOW()-INTERVAL'16 hours'),
 ('Phạm Quỳnh Nga',   make_date(EXTRACT(YEAR FROM today)::INT-5,7,20),  '0942333444','6,0','09:40 - 11:40',NULL,       'Chờ tiếp nhận',         NULL, NULL, NOW()-INTERVAL'20 hours'),
 ('Đặng Khánh An',    make_date(EXTRACT(YEAR FROM today)::INT-6,2,11),  '0931000111','2,4','17:30 - 19:30','Cơ bản',   'Đã tiếp nhận',          NULL, NULL, NOW()-INTERVAL'1 day'),
 ('Tạ Minh Thư',      make_date(EXTRACT(YEAR FROM today)::INT-9,4,12),  '0931000222','6,0','14:30 - 16:30','Nâng cao', 'Đã tiếp nhận',          NULL, NULL, NOW()-INTERVAL'1 day'),
 ('Hứa Bảo Nam',      make_date(EXTRACT(YEAR FROM today)::INT-5,5,13),  '0931000333','2,4','17:30 - 19:30','Cơ bản',   'Đã tiếp nhận',          NULL, NULL, NOW()-INTERVAL'1 day'),
 ('Lê Minh Tuấn',     make_date(EXTRACT(YEAR FROM today)::INT-6,6,14),  '0942444555','2,4','17:30 - 19:30','Cơ bản',   'Đã tiếp nhận',          NULL, NULL, NOW()-INTERVAL'2 days'),
 ('Hoàng Lan Nhi',    make_date(EXTRACT(YEAR FROM today)::INT-9,8,16),  '0942555666','6,0','14:30 - 16:30','Nâng cao', 'Đã tiếp nhận',          NULL, NULL, NOW()-INTERVAL'2 days'),
 ('Vương Tuệ Lâm',    make_date(EXTRACT(YEAR FROM today)::INT-6,6,14),  '0931000444','1,3','17:30 - 19:30','Cơ bản',   'Chờ phụ huynh xác nhận', 4,  fn_next_meet(4, today),  NOW()-INTERVAL'2 days'),
 ('Đỗ Tuấn Khang',    make_date(EXTRACT(YEAR FROM today)::INT-6,9,22),  '0942666777','1,3','17:30 - 19:30','Cơ bản',   'Chờ phụ huynh xác nhận', 10, fn_next_meet(10, today), NOW()-INTERVAL'2 days'),
 ('Vũ Diệu Anh',      make_date(EXTRACT(YEAR FROM today)::INT-8,10,25), '0942777888','2,4','17:30 - 19:30','Nâng cao', 'Chờ phụ huynh xác nhận', 3,  fn_next_meet(3, today),  NOW()-INTERVAL'2 days'),
 ('Bạch Gia Khiêm',   make_date(EXTRACT(YEAR FROM today)::INT-6,7,15),  '0931000555','2,4','17:30 - 19:30','Cơ bản',   'Chờ duyệt ca học thử',   1,  fn_next_meet(1, today),  NOW()-INTERVAL'2 days'),
 ('Cát Tường Vi',     make_date(EXTRACT(YEAR FROM today)::INT-6,8,16),  '0931000666','1,3','17:30 - 19:30','Cơ bản',   'Chờ duyệt ca học thử',   4,  fn_next_meet(4, today),  NOW()-INTERVAL'2 days'),
 ('Ông Gia Huy',      make_date(EXTRACT(YEAR FROM today)::INT-10,9,17), '0931000777','1,3','17:30 - 19:30','Nâng cao', 'Chờ duyệt ca học thử',   5,  fn_next_meet(5, today),  NOW()-INTERVAL'2 days'),
 ('Bùi Quốc Anh',     make_date(EXTRACT(YEAR FROM today)::INT-6,3,20),  '0942888999','6,0','09:40 - 11:40','Cơ bản',   'Chờ duyệt ca học thử',   8,  fn_next_meet(8, today),  NOW()-INTERVAL'2 days'),
 ('Hà Phương Linh',   make_date(EXTRACT(YEAR FROM today)::INT-8,5,24),  '0942999000','6,0','14:30 - 16:30','Nâng cao', 'Chờ duyệt ca học thử',   7,  fn_next_meet(7, today),  NOW()-INTERVAL'2 days'),
 ('Khổng Nhã Uyên',   make_date(EXTRACT(YEAR FROM today)::INT-5,10,18), '0931000888','6,0','09:40 - 11:40','Cơ bản',   'Đã xếp ca',              8,  fn_next_meet(8, today),  NOW()-INTERVAL'3 days'),
 ('Nguyễn Đăng Khôi', make_date(EXTRACT(YEAR FROM today)::INT-5,2,10),  '0943111222','6,0','07:30 - 09:30','Cơ bản',   'Đã xếp ca',              12, fn_next_meet(12, today), NOW()-INTERVAL'3 days'),
 ('Trương Cẩm Tú',    make_date(EXTRACT(YEAR FROM today)::INT-10,4,15), '0943222333','1,3','17:30 - 19:30','Nâng cao', 'Đã xếp ca',              11, fn_next_meet(11, today), NOW()-INTERVAL'3 days'),
 ('Thạch Gia Bảo',    make_date(EXTRACT(YEAR FROM today)::INT-5,11,19), '0931000999','6,0','14:30 - 16:30','Cơ bản',   'Đã xếp ca',              6,  fn_prev_meet(6, today),  NOW()-INTERVAL'9 days'),
 ('Lý Bảo Châu',      make_date(EXTRACT(YEAR FROM today)::INT-6,8,12),  '0932000444','2,4','17:30 - 19:30','Cơ bản',   'Đã xếp ca',              1,  fn_prev_meet(1, today),  NOW()-INTERVAL'8 days'),
 ('Ninh Khả Ái',      make_date(EXTRACT(YEAR FROM today)::INT-9,12,20), '0932000111','6,0','14:30 - 16:30','Nâng cao', 'Đã hoàn thành',          7,  fn_prev_meet(7, today),  NOW()-INTERVAL'10 days'),
 ('Phan Hữu Phước',   make_date(EXTRACT(YEAR FROM today)::INT-9,1,15),  '0943444555','6,0','09:40 - 11:40','Nâng cao', 'Đã hoàn thành',          9,  fn_prev_meet(9, today),  NOW()-INTERVAL'10 days'),
 ('Ân Thiên Kim',      make_date(EXTRACT(YEAR FROM today)::INT-6,1,21),  '0932000222','1,3','17:30 - 19:30','Cơ bản',   'Đã tư vấn',              4,  fn_prev_meet(4, today),  NOW()-INTERVAL'12 days'),
 ('Doãn Hải Nam',     make_date(EXTRACT(YEAR FROM today)::INT-8,2,22),  '0932000333','1,3','17:30 - 19:30','Nâng cao', 'Đã tư vấn',              5,  fn_prev_meet(5, today),  NOW()-INTERVAL'13 days'),
 ('Đặng Quỳnh Chi',   make_date(EXTRACT(YEAR FROM today)::INT-6,3,24),  '0943555666','1,3','17:30 - 19:30','Cơ bản',   'Đã tư vấn',              4,  fn_prev_meet(4, today),  NOW()-INTERVAL'14 days'),
 ('Võ Hoàng Nam',     make_date(EXTRACT(YEAR FROM today)::INT-10,5,26), '0943666777','2,4','17:30 - 19:30','Nâng cao', 'Đã tư vấn',              2,  fn_prev_meet(2, today),  NOW()-INTERVAL'15 days');

/* ---- Nghỉ học & học bù ---- */
INSERT INTO "Absences" ("StudentId","ClassId","SessionDate","Reason","Status","Deadline","MakeupClassId","MakeupDate","CreatedBy") VALUES
 (3,  4,  fn_next_meet(4,  today),  'Bé bị ốm',          'Chờ xếp lịch bù',  fn_next_meet(4,today)+30,  NULL, NULL, tl_id),
 (44, 13, fn_next_meet(13, today),  'Bé bị cảm sốt',     'Chờ xếp lịch bù',  fn_next_meet(13,today)+30, NULL, NULL, tl_id),
 (46, 14, fn_next_meet(14, today),  'Bận thi học kỳ',    'Chờ xếp lịch bù',  fn_next_meet(14,today)+30, NULL, NULL, tl_id),
 (52, 1,  fn_next_meet(1,  today),  'Về quê thăm ông bà','Chờ xếp lịch bù',  fn_next_meet(1,today)+30,  NULL, NULL, tl_id),
 (5,  1,  fn_prev_meet(1,  today),  'Gia đình có việc',  'Đã đăng ký học bù', fn_prev_meet(1,today)+30,  4,  fn_next_meet(4,today),  tl_id),
 (54, 2,  fn_prev_meet(2,  today),  'Trùng lịch thi bơi','Đã đăng ký học bù', fn_prev_meet(2,today)+30,  3,  fn_next_meet(3,today),  tl_id),
 (56, 10, fn_prev_meet(10, today),  'Gia đình đi công tác','Đã đăng ký học bù',fn_prev_meet(10,today)+30, 4,  fn_next_meet(4,today),  tl_id),
 (14, 10, fn_prev_meet(10, today),  NULL,                'Chờ duyệt',         fn_prev_meet(10,today)+30, 12, fn_next_meet(12,today), tl_id),
 (20, 2,  fn_prev_meet(2,  today),  NULL,                'Chờ duyệt',         fn_prev_meet(2,today)+30,  3,  fn_next_meet(3,today),  tl_id),
 (18, 2,  fn_prev_meet(2,  today),  'Bận việc riêng',   'Chờ duyệt',         fn_prev_meet(2,today)+30,  5,  fn_next_meet(5,today),  tl_id),
 (24, 3,  fn_prev_meet(3,  today),  'Bị ốm đột xuất',   'Chờ duyệt',         fn_prev_meet(3,today)+30,  2,  fn_next_meet(2,today),  tl_id),
 (12, 8,  fn_prev_meet(8,  today),  NULL,                'Đã xếp lịch bù',   fn_prev_meet(8,today)+30,  4,  fn_next_meet(4,today),  tl_id),
 (29, 3,  fn_prev_meet(3,  today),  NULL,                'Đã xếp lịch bù',   fn_prev_meet(3,today)+30,  9,  fn_next_meet(9,today),  tl_id),
 (48, 15, fn_prev_meet(15, today),  'Cả nhà đi cưới',   'Đã xếp lịch bù',   fn_prev_meet(15,today)+30, 8,  fn_next_meet(8,today),  tl_id),
 (50, 16, fn_prev_meet(16, today),  'Bé mệt',            'Đã xếp lịch bù',   fn_prev_meet(16,today)+30, 7,  fn_next_meet(7,today),  tl_id),
 (8,  4,  fn_prev_meet(4, today-44),'Đi du lịch',        'Hết hạn',           fn_prev_meet(4,today-44)+30,NULL,NULL,tl_id),
 (11, 6,  fn_prev_meet(6, today-46),'Đi nước ngoài',     'Hết hạn',           fn_prev_meet(6,today-46)+30,NULL,NULL,tl_id);

/* ---- Điểm danh 14 ngày qua ---- */
d := today - 14;
WHILE d < today LOOP
  INSERT INTO "Attendances" ("ClassId","SessionDate","FinalizedAt","FinalizedBy")
  SELECT c."ClassId", d, (d::TIMESTAMP WITH TIME ZONE + INTERVAL'20 hours'), c."TeacherId"
  FROM "Classes" c
  WHERE EXTRACT(DOW FROM d)::INT IN (c."Weekday", c."Weekday2");

  INSERT INTO "AttendanceRecords" ("AttendanceId","PersonType","PersonId","Status")
  SELECT a."AttendanceId", 'Student', sc."StudentId",
         CASE WHEN ABS(('x' || md5(a."ClassId"::TEXT || sc."StudentId"::TEXT || EXTRACT(DAY FROM d)::TEXT))::BIT(32)::INT) % 9 = 0 THEN 'absent' ELSE 'present' END
  FROM "Attendances" a
  JOIN "StudentClasses" sc ON sc."ClassId" = a."ClassId" AND sc."IsActive" = TRUE
  JOIN "Students" s ON s."StudentId" = sc."StudentId" AND s."Status" = 'Đang học'
  WHERE a."SessionDate" = d;

  INSERT INTO "Journal" ("StudentId","ClassId","SessionDate","TeacherId","PhotoPath","PhotoAt","StrokeComment","ColorComment","AbsorbComment","CommentAt")
  SELECT r."PersonId", a."ClassId", a."SessionDate", c."TeacherId",
         CASE WHEN ABS(('x'||md5(a."ClassId"::TEXT||EXTRACT(DAY FROM a."SessionDate")::TEXT))::BIT(32)::INT)%4=0 AND ROW_NUMBER() OVER (PARTITION BY a."AttendanceId" ORDER BY r."PersonId") % 3 = 0 THEN NULL
              ELSE CONCAT('/uploads/seed/art', 1 + ABS(('x'||md5(a."ClassId"::TEXT||r."PersonId"::TEXT))::BIT(32)::INT)%5, '.svg') END,
         CASE WHEN ABS(('x'||md5(a."ClassId"::TEXT||EXTRACT(DAY FROM a."SessionDate")::TEXT))::BIT(32)::INT)%4=0 AND ROW_NUMBER() OVER (PARTITION BY a."AttendanceId" ORDER BY r."PersonId") % 3 = 0 THEN NULL
              ELSE a."SessionDate"::TIMESTAMP WITH TIME ZONE + INTERVAL'21 hours' END,
         CASE WHEN ABS(('x'||md5(a."ClassId"::TEXT||EXTRACT(DAY FROM a."SessionDate")::TEXT))::BIT(32)::INT)%4=0 AND ROW_NUMBER() OVER (PARTITION BY a."AttendanceId" ORDER BY r."PersonId") % 4 = 1 THEN NULL ELSE 'Nét vẽ tự tin, rõ ràng hơn.' END,
         CASE WHEN ABS(('x'||md5(a."ClassId"::TEXT||EXTRACT(DAY FROM a."SessionDate")::TEXT))::BIT(32)::INT)%4=0 AND ROW_NUMBER() OVER (PARTITION BY a."AttendanceId" ORDER BY r."PersonId") % 4 = 1 THEN NULL ELSE 'Bé phối màu hài hòa.' END,
         CASE WHEN ABS(('x'||md5(a."ClassId"::TEXT||EXTRACT(DAY FROM a."SessionDate")::TEXT))::BIT(32)::INT)%4=0 AND ROW_NUMBER() OVER (PARTITION BY a."AttendanceId" ORDER BY r."PersonId") % 4 = 1 THEN NULL ELSE 'Tiếp thu nhanh, làm theo hướng dẫn tốt.' END,
         CASE WHEN ABS(('x'||md5(a."ClassId"::TEXT||EXTRACT(DAY FROM a."SessionDate")::TEXT))::BIT(32)::INT)%4=0 AND ROW_NUMBER() OVER (PARTITION BY a."AttendanceId" ORDER BY r."PersonId") % 4 = 1 THEN NULL
              ELSE a."SessionDate"::TIMESTAMP WITH TIME ZONE + INTERVAL'21 hours' END
  FROM "AttendanceRecords" r
  JOIN "Attendances" a ON a."AttendanceId" = r."AttendanceId" AND a."SessionDate" = d
  JOIN "Classes" c ON c."ClassId" = a."ClassId"
  WHERE r."Status" = 'present' AND r."PersonType" = 'Student';

  d := d + 1;
END LOOP;

/* ---- Dữ liệu tác phẩm cần đăng và nhận xét cần cập nhật cho giáo viên ---- */
UPDATE "Journal" SET "PhotoPath" = NULL, "PhotoAt" = NULL
WHERE "ClassId" = 13 AND "SessionDate" = fn_prev_meet(13, today) AND "StudentId" IN (61, 62, 63);

UPDATE "Journal" SET "StrokeComment" = NULL, "ColorComment" = NULL, "AbsorbComment" = NULL, "CommentAt" = NULL
WHERE "ClassId" = 13 AND "SessionDate" = fn_prev_meet(13, today) AND "StudentId" IN (61, 63, 45);

/* ---- Tiến độ học tập (học viên Đang học) ---- */
INSERT INTO "ProgressRecords" ("StudentId", "ClassId", "SessionDate", "EvalDate", "Status", "TeacherId", "RecordedBy")
SELECT x."StudentId", x."ClassId", x."SessionDate", x."SessionDate",
       CASE WHEN x."StudentId" % 5 = 0 THEN 'Chậm tiến độ' ELSE 'Đúng tiến độ' END, c."TeacherId", tl_id
FROM (SELECT r."PersonId" AS "StudentId", a."ClassId", a."SessionDate", ROW_NUMBER() OVER (PARTITION BY r."PersonId" ORDER BY a."SessionDate" DESC) AS rk
      FROM "AttendanceRecords" r
      JOIN "Attendances" a ON a."AttendanceId" = r."AttendanceId"
      JOIN "StudentClasses" sc ON sc."StudentId" = r."PersonId" AND sc."ClassId" = a."ClassId"
      WHERE r."PersonType" = 'Student' AND r."Status" = 'present') x
JOIN "Classes" c ON c."ClassId" = x."ClassId"
WHERE x.rk = 1 AND x."StudentId" % 2 = 0;

/* ---- Thông báo mẫu ---- */
ph_id := (SELECT "UserId" FROM "Users" WHERE "Username" = '0901234567');
ql_id := (SELECT "UserId" FROM "Users" WHERE "Username" = 'minhchau');
INSERT INTO "Notifications" ("UserId","Title","Body","CreatedAt","IsRead") VALUES
 (ph_id,'Lịch học bù đã được phê duyệt','Ca học bù của bé Nguyễn Gia Hân đã được duyệt.',NOW()-INTERVAL'1 hour',FALSE),
 (ph_id,'Học viên vắng mặt','Bé Nguyễn Minh Khôi vắng mặt ở ca học gần nhất.',NOW()-INTERVAL'1 day',TRUE),
 (ph_id,'Nhắc đóng học phí','Học phí tháng này của bé đã được tạo. Ba mẹ vui lòng kiểm tra.',NOW()-INTERVAL'3 days',FALSE),
 (ql_id,'Đề xuất xếp bù mới','Có 4 đề xuất ca học bù mới đang chờ phê duyệt.',NOW()-INTERVAL'2 hours',FALSE),
 (ql_id,'Ca học thử mới','Có 5 ca học thử mới đang chờ phê duyệt.',NOW()-INTERVAL'4 hours',FALSE);

END $$;
