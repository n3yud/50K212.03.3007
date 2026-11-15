/* =====================================================================
   DỮ LIỆU MẪU – chạy SAU 01_schema.sql.  Ngày được tính theo GETDATE() nên luôn khớp lịch thật.
   Mật khẩu mẫu: xem docs/TEST_ACCOUNTS.md (băm BCrypt, không lưu mật khẩu thô).
   ===================================================================== */
USE NgoiNhaNho;
GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET NOCOUNT ON;
GO
/* ---- hàm hỗ trợ ngày ---- */
CREATE OR ALTER FUNCTION dbo.fn_NextDate(@wd TINYINT, @from DATE) RETURNS DATE
AS BEGIN RETURN DATEADD(DAY, ((CAST(@wd AS INT) - CAST(dbo.fn_Weekday(@from) AS INT) + 6) % 7) + 1, @from); END   -- lần xuất hiện KẾ TIẾP (sau @from)
GO
CREATE OR ALTER FUNCTION dbo.fn_PrevDate(@wd TINYINT, @from DATE) RETURNS DATE
AS BEGIN RETURN DATEADD(DAY, -(((CAST(dbo.fn_Weekday(@from) AS INT) - CAST(@wd AS INT) + 6) % 7) + 1), @from); END -- lần xuất hiện TRƯỚC @from
GO
-- ngày học kế tiếp / gần nhất đã qua của một lớp (lớp học 2 ngày/tuần)
CREATE OR ALTER FUNCTION dbo.fn_NextMeet(@classId INT, @from DATE) RETURNS DATE
AS BEGIN
    DECLARE @a DATE, @b DATE;
    SELECT @a = dbo.fn_NextDate(Weekday, @from), @b = dbo.fn_NextDate(Weekday2, @from) FROM dbo.Classes WHERE ClassId = @classId;
    RETURN CASE WHEN @a < @b THEN @a ELSE @b END;
END
GO
CREATE OR ALTER FUNCTION dbo.fn_PrevMeet(@classId INT, @from DATE) RETURNS DATE
AS BEGIN
    DECLARE @a DATE, @b DATE;
    SELECT @a = dbo.fn_PrevDate(Weekday, @from), @b = dbo.fn_PrevDate(Weekday2, @from) FROM dbo.Classes WHERE ClassId = @classId;
    RETURN CASE WHEN @a > @b THEN @a ELSE @b END;
END
GO
CREATE OR ALTER FUNCTION dbo.fn_CountWeekdayInMonth(@wd TINYINT, @first DATE) RETURNS INT
AS BEGIN
    RETURN (SELECT COUNT(*) FROM (SELECT TOP (DAY(EOMONTH(@first))) ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) - 1 AS n FROM sys.all_objects) t
            WHERE dbo.fn_Weekday(DATEADD(DAY, t.n, @first)) = @wd);
END
GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET XACT_ABORT ON;
BEGIN TRAN;
DECLARE @today DATE = CAST(GETDATE() AS DATE);
DECLARE @pw  NVARCHAR(100) = N'$2b$11$/.liJknXJ64GHmqOOyYVuuRvZX.DZuA1JL7HzT42/NNKQLbEA1g.q';   -- Nhanho@123
DECLARE @pw2 NVARCHAR(100) = N'$2b$11$QFMexYPW7Nvs3isrZJWnBe.7gh7rDSJIIetF4LRmQ9dRC.SdPheZi';   -- 345678 (tài khoản phụ huynh mới, bắt đổi mật khẩu)
DECLARE @pwX NVARCHAR(100) = N'$2b$11$GevIc3VVtHQ0CvnRimLaSeGv6EU6m2hcZ6Xm73eL/WUu7VkeaQVGe';   -- mật khẩu ngẫu nhiên: do bộ phận Admin cấp ngoài hệ thống

/* ---- nhân sự ---- */
INSERT dbo.Users (Username, Email, PasswordHash, Role, FullName, Title, Phone) VALUES
 (N'thanhnhi',  N'thanhnhi@ngoinhanho.vn',  @pw, 'assistant',  N'Thanh Nhi',  N'',    N'0901234001'),
 (N'minhchau',  N'minhchau@ngoinhanho.vn',  @pw, 'manager',    N'Minh Châu',  N'',    N'0901234002'),
 (N'thaibao',   N'thaibao@ngoinhanho.vn',   @pw, 'supervisor', N'Thái Bảo',   N'',    N'0901234003'),
 (N'myduyen',   N'myduyen@ngoinhanho.vn',   @pw, 'teacher',    N'Mỹ Duyên',   N'Cô',  N'0901234004'),
 (N'baochau',   N'baochau@ngoinhanho.vn',   @pw, 'teacher',    N'Bảo Châu',   N'Cô',  N'0901234005'),
 (N'quynh',     N'quynh@ngoinhanho.vn',     @pw, 'teacher',    N'Quỳnh',      N'Cô',  N'0901234006'),
 (N'thuha',     N'thuha@ngoinhanho.vn',     @pw, 'teacher',    N'Thu Hà',     N'Cô',  N'0901234007'),
 (N'minhkhoa',  N'minhkhoa@ngoinhanho.vn',  @pw, 'teacher',    N'Minh Khoa',  N'Thầy',N'0901234008'),
 (N'lananh',    N'lananh@ngoinhanho.vn',    @pw, 'teacher',    N'Lan Anh',    N'Cô',  N'0901234009');
INSERT dbo.Users (Username, Email, PasswordHash, Role, FullName, Title, IsLocked, Phone) VALUES (N'khoa.tk', N'khoa.tk@ngoinhanho.vn', @pw, 'teacher', N'Tài khoản bị khóa', N'', 1, N'0901234010');

/* ---- lớp học (ClassId 1..16) ---- */
-- Mỗi lớp học 2 buổi/tuần: Thứ 2 - Thứ 4 (1,3), Thứ 3 - Thứ 5 (2,4) lúc 17:30 - 19:30; Thứ 7 - Chủ nhật (6,0) có 4 khung giờ
INSERT dbo.Classes (Name, Program, Weekday, Weekday2, StartTime, EndTime, TeacherId, Letter) VALUES
 (N'Cơ bản - Thế giới màu sắc',       N'Cơ bản',   2, 4, '17:30', '19:30', (SELECT UserId FROM dbo.Users WHERE Username=N'myduyen'),  'A'),  -- 1  T3-T5
 (N'Nâng cao - Vẽ tĩnh vật',          N'Nâng cao', 2, 4, '17:30', '19:30', (SELECT UserId FROM dbo.Users WHERE Username=N'baochau'),  'A'),  -- 2  T3-T5
 (N'Nâng cao - Góc phố nhỏ',          N'Nâng cao', 2, 4, '17:30', '19:30', (SELECT UserId FROM dbo.Users WHERE Username=N'quynh'),    'B'),  -- 3  T3-T5
 (N'Cơ bản - Sắc màu diệu kỳ',        N'Cơ bản',   1, 3, '17:30', '19:30', (SELECT UserId FROM dbo.Users WHERE Username=N'thuha'),    'A'),  -- 4  T2-T4
 (N'Nâng cao - Phong cảnh quê hương', N'Nâng cao', 1, 3, '17:30', '19:30', (SELECT UserId FROM dbo.Users WHERE Username=N'baochau'),  'A'),  -- 5  T2-T4
 (N'Cơ bản - Bé vẽ động vật',         N'Cơ bản',   6, 0, '14:30', '16:30', (SELECT UserId FROM dbo.Users WHERE Username=N'thuha'),    'A'),  -- 6  T7-CN
 (N'Nâng cao - Ký họa nhanh',         N'Nâng cao', 6, 0, '14:30', '16:30', (SELECT UserId FROM dbo.Users WHERE Username=N'minhkhoa'), 'A'),  -- 7  T7-CN
 (N'Cơ bản - Nét vẽ vui',             N'Cơ bản',   6, 0, '09:40', '11:40', (SELECT UserId FROM dbo.Users WHERE Username=N'lananh'),   'A'),  -- 8  T7-CN
 (N'Nâng cao - Màu nước cơ bản',      N'Nâng cao', 6, 0, '09:40', '11:40', (SELECT UserId FROM dbo.Users WHERE Username=N'quynh'),    'A'),  -- 9  T7-CN
 (N'Cơ bản - Bé tập tô màu',          N'Cơ bản',   1, 3, '17:30', '19:30', (SELECT UserId FROM dbo.Users WHERE Username=N'lananh'),   'B'),  -- 10 T2-T4
 (N'Nâng cao - Hình khối',            N'Nâng cao', 1, 3, '17:30', '19:30', (SELECT UserId FROM dbo.Users WHERE Username=N'minhkhoa'), 'B'),  -- 11 T2-T4
 (N'Cơ bản - Vẽ cùng bé',             N'Cơ bản',   6, 0, '07:30', '09:30', (SELECT UserId FROM dbo.Users WHERE Username=N'myduyen'),  'A'),  -- 12 T7-CN
 (N'Cơ bản - Nét vẽ đầu đời',         N'Cơ bản',   1, 3, '17:30', '19:30', (SELECT UserId FROM dbo.Users WHERE Username=N'myduyen'),  'C'),  -- 13 T2-T4
 (N'Nâng cao - Tranh cổ tích',        N'Nâng cao', 2, 4, '17:30', '19:30', (SELECT UserId FROM dbo.Users WHERE Username=N'thuha'),    'C'),  -- 14 T3-T5
 (N'Cơ bản - Vườn hoa tuổi thơ',      N'Cơ bản',   6, 0, '09:40', '11:40', (SELECT UserId FROM dbo.Users WHERE Username=N'baochau'),  'B'),  -- 15 T7-CN
 (N'Nâng cao - Sáng tạo sắc màu',     N'Nâng cao', 6, 0, '14:30', '16:30', (SELECT UserId FROM dbo.Users WHERE Username=N'minhkhoa'), 'B');  -- 16 T7-CN

/* ---- học viên (StudentId 1..75) ---- */
INSERT dbo.Students (Code, FullName, DateOfBirth, Gender, ParentName, ParentPhone, Program, Status, CreatedAt) VALUES
 ('HV0001', N'Nguyễn Gia Hân', DATEFROMPARTS(YEAR(@today)-6, 1, 3), N'Nữ', N'Nguyễn Văn Hải', '0901234567', N'Cơ bản', N'Đang học', DATEADD(DAY, -60, SYSDATETIME())),
 ('HV0002', N'Phạm Khánh Vy', DATEFROMPARTS(YEAR(@today)-5, 2, 4), N'Nữ', N'Phạm Thị Lan', '0903111222', N'Cơ bản', N'Đang học', DATEADD(DAY, -59, SYSDATETIME())),
 ('HV0003', N'Trần Thảo Nguyên', DATEFROMPARTS(YEAR(@today)-6, 3, 5), N'Nữ', N'Trần Văn Nam', '0987000111', N'Cơ bản', N'Đang học', DATEADD(DAY, -58, SYSDATETIME())),
 ('HV0004', N'Hoàng Gia Bảo', DATEFROMPARTS(YEAR(@today)-5, 4, 6), N'Nam', N'Hoàng Thị Hoa', '0905222333', N'Cơ bản', N'Đang học', DATEADD(DAY, -114, SYSDATETIME())),
 ('HV0005', N'Lê Minh Anh', DATEFROMPARTS(YEAR(@today)-6, 5, 7), N'Nữ', N'Lê Văn Hải', '0912000444', N'Cơ bản', N'Đang học', DATEADD(DAY, -112, SYSDATETIME())),
 ('HV0006', N'Vũ Đức Anh', DATEFROMPARTS(YEAR(@today)-5, 6, 8), N'Nam', N'Vũ Thị Lan', '0935111555', N'Cơ bản', N'Đang học', DATEADD(DAY, -110, SYSDATETIME())),
 ('HV0007', N'Đặng Hoài Thương', DATEFROMPARTS(YEAR(@today)-5, 1, 9), N'Nữ', N'Đặng Văn Nam', '0944666777', N'Cơ bản', N'Đang học', DATEADD(DAY, -108, SYSDATETIME())),
 ('HV0008', N'Bùi Quốc Bảo', DATEFROMPARTS(YEAR(@today)-6, 2, 10), N'Nam', N'Bùi Thị Hoa', '0977888999', N'Cơ bản', N'Đang học', DATEADD(DAY, -106, SYSDATETIME())),
 ('HV0009', N'Ngô Khánh Linh', DATEFROMPARTS(YEAR(@today)-6, 3, 11), N'Nữ', N'Ngô Văn Hải', '0966123123', N'Cơ bản', N'Đang học', DATEADD(DAY, -104, SYSDATETIME())),
 ('HV0010', N'Phan Gia Huy', DATEFROMPARTS(YEAR(@today)-5, 4, 12), N'Nam', N'Phan Thị Lan', '0988321321', N'Cơ bản', N'Đang học', DATEADD(DAY, -102, SYSDATETIME())),
 ('HV0011', N'Đỗ Bảo Châu', DATEFROMPARTS(YEAR(@today)-6, 5, 13), N'Nữ', N'Đỗ Văn Nam', '0911555666', N'Cơ bản', N'Đang học', DATEADD(DAY, -100, SYSDATETIME())),
 ('HV0012', N'Lý Minh Khang', DATEFROMPARTS(YEAR(@today)-6, 6, 14), N'Nam', N'Lý Thị Hoa', '0922444333', N'Cơ bản', N'Đang học', DATEADD(DAY, -98, SYSDATETIME())),
 ('HV0013', N'Trương Mai Chi', DATEFROMPARTS(YEAR(@today)-5, 1, 15), N'Nữ', N'Trương Văn Hải', '0933777222', N'Cơ bản', N'Đang học', DATEADD(DAY, -96, SYSDATETIME())),
 ('HV0014', N'Huỳnh Tuấn Kiệt', DATEFROMPARTS(YEAR(@today)-6, 2, 16), N'Nam', N'Huỳnh Thị Lan', '0955999000', N'Cơ bản', N'Đang học', DATEADD(DAY, -94, SYSDATETIME())),
 ('HV0015', N'Võ Ngọc Hân', DATEFROMPARTS(YEAR(@today)-5, 3, 17), N'Nữ', N'Võ Văn Nam', '0966000111', N'Cơ bản', N'Đang học', DATEADD(DAY, -92, SYSDATETIME())),
 ('HV0016', N'Đinh Anh Thư', DATEFROMPARTS(YEAR(@today)-6, 4, 18), N'Nữ', N'Đinh Thị Hoa', '0977111000', N'Cơ bản', N'Đang học', DATEADD(DAY, -90, SYSDATETIME())),
 ('HV0017', N'Nguyễn Minh Khôi', DATEFROMPARTS(YEAR(@today)-8, 5, 19), N'Nam', N'Nguyễn Văn Hải', '0901234567', N'Nâng cao', N'Đang học', DATEADD(DAY, -88, SYSDATETIME())),
 ('HV0018', N'Lê Hoàng Long', DATEFROMPARTS(YEAR(@today)-9, 6, 20), N'Nam', N'Lê Thị Lan', '0902333444', N'Nâng cao', N'Đang học', DATEADD(DAY, -86, SYSDATETIME())),
 ('HV0019', N'Trần Ngọc Diệp', DATEFROMPARTS(YEAR(@today)-10, 1, 21), N'Nữ', N'Trần Văn Nam', '0903444555', N'Nâng cao', N'Đang học', DATEADD(DAY, -84, SYSDATETIME())),
 ('HV0020', N'Phạm Quang Huy', DATEFROMPARTS(YEAR(@today)-7, 2, 22), N'Nam', N'Phạm Thị Hoa', '0904555666', N'Nâng cao', N'Đang học', DATEADD(DAY, -82, SYSDATETIME())),
 ('HV0021', N'Đoàn Thiên Ân', DATEFROMPARTS(YEAR(@today)-8, 3, 3), N'Nam', N'Đoàn Văn Hải', '0905666777', N'Nâng cao', N'Đang học', DATEADD(DAY, -80, SYSDATETIME())),
 ('HV0022', N'Mai Khánh Chi', DATEFROMPARTS(YEAR(@today)-11, 4, 4), N'Nữ', N'Mai Thị Lan', '0906777888', N'Nâng cao', N'Đang học', DATEADD(DAY, -78, SYSDATETIME())),
 ('HV0023', N'Cao Bảo Trâm', DATEFROMPARTS(YEAR(@today)-12, 5, 5), N'Nữ', N'Cao Văn Nam', '0907888999', N'Nâng cao', N'Đang học', DATEADD(DAY, -76, SYSDATETIME())),
 ('HV0024', N'Hồ Gia Phúc', DATEFROMPARTS(YEAR(@today)-9, 6, 6), N'Nam', N'Hồ Thị Hoa', '0908999000', N'Nâng cao', N'Đang học', DATEADD(DAY, -74, SYSDATETIME())),
 ('HV0025', N'Tạ Phương Nhi', DATEFROMPARTS(YEAR(@today)-13, 1, 7), N'Nữ', N'Tạ Văn Hải', '0909000111', N'Nâng cao', N'Đang học', DATEADD(DAY, -72, SYSDATETIME())),
 ('HV0026', N'Lâm Anh Khoa', DATEFROMPARTS(YEAR(@today)-7, 2, 8), N'Nam', N'Lâm Thị Lan', '0910111222', N'Nâng cao', N'Đang học', DATEADD(DAY, -70, SYSDATETIME())),
 ('HV0027', N'Dương Bảo Ngân', DATEFROMPARTS(YEAR(@today)-10, 3, 9), N'Nữ', N'Dương Văn Nam', '0911222333', N'Nâng cao', N'Đang học', DATEADD(DAY, -68, SYSDATETIME())),
 ('HV0028', N'Kiều Minh Quân', DATEFROMPARTS(YEAR(@today)-8, 4, 10), N'Nam', N'Kiều Thị Hoa', '0912333444', N'Nâng cao', N'Đang học', DATEADD(DAY, -66, SYSDATETIME())),
 ('HV0029', N'Thái Bảo Hân', DATEFROMPARTS(YEAR(@today)-9, 5, 11), N'Nữ', N'Thái Văn Hải', '0913444555', N'Nâng cao', N'Đang học', DATEADD(DAY, -64, SYSDATETIME())),
 ('HV0030', N'Tô Gia Bình', DATEFROMPARTS(YEAR(@today)-11, 6, 12), N'Nam', N'Tô Thị Lan', '0914555666', N'Nâng cao', N'Đang học', DATEADD(DAY, -62, SYSDATETIME())),
 ('HV0031', N'Châu Nhật Minh', DATEFROMPARTS(YEAR(@today)-12, 1, 13), N'Nam', N'Châu Văn Nam', '0915666777', N'Nâng cao', N'Đang học', DATEADD(DAY, -60, SYSDATETIME())),
 ('HV0032', N'Quách Thảo Vy', DATEFROMPARTS(YEAR(@today)-7, 2, 14), N'Nữ', N'Quách Thị Hoa', '0916777888', N'Nâng cao', N'Đang học', DATEADD(DAY, -58, SYSDATETIME())),
 ('HV0033', N'Âu Dương Khải', DATEFROMPARTS(YEAR(@today)-13, 3, 15), N'Nam', N'Âu Văn Hải', '0917888999', N'Nâng cao', N'Đang học', DATEADD(DAY, -56, SYSDATETIME())),
 ('HV0034', N'Lương Bích Ngọc', DATEFROMPARTS(YEAR(@today)-11, 4, 16), N'Nữ', N'Lương Thị Lan', '0918999000', N'Nâng cao', N'Đang học', DATEADD(DAY, -54, SYSDATETIME())),
 ('HV0035', N'Mạc Thiên Phú', DATEFROMPARTS(YEAR(@today)-10, 5, 17), N'Nam', N'Mạc Văn Nam', '0919000111', N'Nâng cao', N'Đang học', DATEADD(DAY, -52, SYSDATETIME())),
 ('HV0036', N'Phùng Khả Hân', DATEFROMPARTS(YEAR(@today)-9, 6, 18), N'Nữ', N'Phùng Thị Hoa', '0920111222', N'Nâng cao', N'Đang học', DATEADD(DAY, -50, SYSDATETIME())),
 ('HV0037', N'Giang Hải Đăng', DATEFROMPARTS(YEAR(@today)-12, 1, 19), N'Nam', N'Giang Văn Hải', '0921222333', N'Nâng cao', N'Đang học', DATEADD(DAY, -48, SYSDATETIME())),
 ('HV0038', N'Từ Gia Linh', DATEFROMPARTS(YEAR(@today)-8, 2, 20), N'Nữ', N'Từ Thị Lan', '0922333444', N'Nâng cao', N'Đang học', DATEADD(DAY, -46, SYSDATETIME())),
 ('HV0039', N'Nguyễn Hà My', DATEFROMPARTS(YEAR(@today)-5, 3, 21), N'Nữ', N'Nguyễn Văn Nam', '0923444555', N'Cơ bản', N'Chờ xếp lớp', DATEADD(DAY, -44, SYSDATETIME())),
 ('HV0040', N'Trần Đức Thịnh', DATEFROMPARTS(YEAR(@today)-8, 4, 22), N'Nam', N'Trần Thị Hoa', '0924555666', N'Nâng cao', N'Chờ xếp lớp', DATEADD(DAY, -42, SYSDATETIME())),
 ('HV0041', N'Võ Thảo Vi', DATEFROMPARTS(YEAR(@today)-6, 5, 3), N'Nữ', N'Võ Văn Hải', '0925666777', N'Cơ bản', N'Đã bảo lưu', DATEADD(DAY, -40, SYSDATETIME())),
 ('HV0042', N'Lê Quốc Việt', DATEFROMPARTS(YEAR(@today)-9, 6, 4), N'Nam', N'Lê Thị Lan', '0926777888', N'Nâng cao', N'Đã bảo lưu', DATEADD(DAY, -38, SYSDATETIME())),
 ('HV0043', N'Hà Bảo An', DATEFROMPARTS(YEAR(@today)-5, 1, 5), N'Nam', N'Hà Văn Nam', '0927888999', N'Cơ bản', N'Đã bảo lưu', DATEADD(DAY, -36, SYSDATETIME())),
 -- Thêm học viên Đang học (44..60)
 ('HV0044', N'Hoàng Nhật Nam', DATEFROMPARTS(YEAR(@today)-6, 2, 12), N'Nam', N'Hoàng Văn Hải', '0938111222', N'Cơ bản', N'Đang học', DATEADD(DAY, -35, SYSDATETIME())),
 ('HV0045', N'Vũ Thùy Linh', DATEFROMPARTS(YEAR(@today)-5, 3, 14), N'Nữ', N'Vũ Thị Lan', '0938222333', N'Cơ bản', N'Đang học', DATEADD(DAY, -34, SYSDATETIME())),
 ('HV0046', N'Nguyễn Tùng Dương', DATEFROMPARTS(YEAR(@today)-9, 4, 16), N'Nam', N'Nguyễn Văn Nam', '0938333444', N'Nâng cao', N'Đang học', DATEADD(DAY, -33, SYSDATETIME())),
 ('HV0047', N'Phan Bảo Hân', DATEFROMPARTS(YEAR(@today)-10, 5, 18), N'Nữ', N'Phan Thị Hoa', '0938444555', N'Nâng cao', N'Đang học', DATEADD(DAY, -32, SYSDATETIME())),
 ('HV0048', N'Đỗ Minh Trí', DATEFROMPARTS(YEAR(@today)-6, 6, 20), N'Nam', N'Đỗ Văn Hải', '0938555666', N'Cơ bản', N'Đang học', DATEADD(DAY, -31, SYSDATETIME())),
 ('HV0049', N'Trương Tuệ Mẫn', DATEFROMPARTS(YEAR(@today)-5, 7, 22), N'Nữ', N'Trương Thị Lan', '0938666777', N'Cơ bản', N'Đang học', DATEADD(DAY, -30, SYSDATETIME())),
 ('HV0050', N'Lê Tuấn Hưng', DATEFROMPARTS(YEAR(@today)-11, 8, 24), N'Nam', N'Lê Văn Nam', '0938777888', N'Nâng cao', N'Đang học', DATEADD(DAY, -29, SYSDATETIME())),
 ('HV0051', N'Ngô Mỹ Uyên', DATEFROMPARTS(YEAR(@today)-8, 9, 26), N'Nữ', N'Ngô Thị Hoa', '0938888999', N'Nâng cao', N'Đang học', DATEADD(DAY, -28, SYSDATETIME())),
 ('HV0052', N'Trần Đăng Khoa', DATEFROMPARTS(YEAR(@today)-6, 10, 28), N'Nam', N'Trần Văn Hải', '0939111222', N'Cơ bản', N'Đang học', DATEADD(DAY, -27, SYSDATETIME())),
 ('HV0053', N'Bùi Diệu Linh', DATEFROMPARTS(YEAR(@today)-5, 11, 1), N'Nữ', N'Bùi Thị Lan', '0939222333', N'Cơ bản', N'Đang học', DATEADD(DAY, -26, SYSDATETIME())),
 ('HV0054', N'Phạm Minh Quân', DATEFROMPARTS(YEAR(@today)-7, 12, 3), N'Nam', N'Phạm Văn Nam', '0939333444', N'Nâng cao', N'Đang học', DATEADD(DAY, -25, SYSDATETIME())),
 ('HV0055', N'Đặng Thảo Trang', DATEFROMPARTS(YEAR(@today)-9, 1, 5), N'Nữ', N'Đặng Thị Hoa', '0939444555', N'Nâng cao', N'Đang học', DATEADD(DAY, -24, SYSDATETIME())),
 ('HV0056', N'Lý Quốc Hưng', DATEFROMPARTS(YEAR(@today)-6, 2, 7), N'Nam', N'Lý Văn Hải', '0939555666', N'Cơ bản', N'Đang học', DATEADD(DAY, -23, SYSDATETIME())),
 ('HV0057', N'Hồ Phương Dung', DATEFROMPARTS(YEAR(@today)-5, 3, 9), N'Nữ', N'Hồ Thị Lan', '0939666777', N'Cơ bản', N'Đang học', DATEADD(DAY, -22, SYSDATETIME())),
 ('HV0058', N'Võ Đình Phong', DATEFROMPARTS(YEAR(@today)-10, 4, 11), N'Nam', N'Võ Văn Nam', '0939777888', N'Nâng cao', N'Đang học', DATEADD(DAY, -21, SYSDATETIME())),
 ('HV0059', N'Đinh Hồng Hạnh', DATEFROMPARTS(YEAR(@today)-8, 5, 13), N'Nữ', N'Đinh Thị Hoa', '0939888999', N'Nâng cao', N'Đang học', DATEADD(DAY, -20, SYSDATETIME())),
 ('HV0060', N'Mai Hoàng Bách', DATEFROMPARTS(YEAR(@today)-6, 6, 15), N'Nam', N'Mai Văn Hải', '0940111222', N'Cơ bản', N'Đang học', DATEADD(DAY, -19, SYSDATETIME())),
 -- Thêm học viên Chờ xếp lớp (61..67)
 ('HV0061', N'Phan Kim Ngân', DATEFROMPARTS(YEAR(@today)-5, 7, 17), N'Nữ', N'Phan Văn Hải', '0940222333', N'Cơ bản', N'Chờ xếp lớp', DATEADD(DAY, -18, SYSDATETIME())),
 ('HV0062', N'Trịnh Gia Hưng', DATEFROMPARTS(YEAR(@today)-6, 8, 19), N'Nam', N'Trịnh Thị Lan', '0940333444', N'Cơ bản', N'Chờ xếp lớp', DATEADD(DAY, -17, SYSDATETIME())),
 ('HV0063', N'Lâm Bảo Ngọc', DATEFROMPARTS(YEAR(@today)-5, 9, 21), N'Nữ', N'Lâm Văn Nam', '0940444555', N'Cơ bản', N'Chờ xếp lớp', DATEADD(DAY, -16, SYSDATETIME())),
 ('HV0064', N'Dương Thành Đạt', DATEFROMPARTS(YEAR(@today)-9, 10, 23), N'Nam', N'Dương Thị Hoa', '0940555666', N'Nâng cao', N'Chờ xếp lớp', DATEADD(DAY, -15, SYSDATETIME())),
 ('HV0065', N'Kiều Thục Anh', DATEFROMPARTS(YEAR(@today)-10, 11, 25), N'Nữ', N'Kiều Văn Hải', '0940666777', N'Nâng cao', N'Chờ xếp lớp', DATEADD(DAY, -14, SYSDATETIME())),
 ('HV0066', N'Châu Minh Long', DATEFROMPARTS(YEAR(@today)-8, 12, 27), N'Nam', N'Châu Thị Lan', '0940777888', N'Nâng cao', N'Chờ xếp lớp', DATEADD(DAY, -13, SYSDATETIME())),
 ('HV0067', N'Vũ Mai Phương', DATEFROMPARTS(YEAR(@today)-5, 1, 29), N'Nữ', N'Vũ Văn Nam', '0940888999', N'Cơ bản', N'Chờ xếp lớp', DATEADD(DAY, -12, SYSDATETIME())),
 -- Thêm học viên Đã bảo lưu (68..75)
 ('HV0068', N'Tạ Minh Khang', DATEFROMPARTS(YEAR(@today)-6, 2, 2), N'Nam', N'Tạ Thị Hoa', '0941111222', N'Cơ bản', N'Đã bảo lưu', DATEADD(DAY, -30, SYSDATETIME())),
 ('HV0069', N'Lương Hoài An', DATEFROMPARTS(YEAR(@today)-5, 3, 4), N'Nữ', N'Lương Văn Hải', '0941222333', N'Cơ bản', N'Đã bảo lưu', DATEADD(DAY, -28, SYSDATETIME())),
 ('HV0070', N'Mạc Quốc Dũng', DATEFROMPARTS(YEAR(@today)-9, 4, 6), N'Nam', N'Mạc Thị Lan', '0941333444', N'Nâng cao', N'Đã bảo lưu', DATEADD(DAY, -26, SYSDATETIME())),
 ('HV0071', N'Phùng Bảo Châu', DATEFROMPARTS(YEAR(@today)-10, 5, 8), N'Nữ', N'Phùng Văn Nam', '0941444555', N'Nâng cao', N'Đã bảo lưu', DATEADD(DAY, -24, SYSDATETIME())),
 ('HV0072', N'Giang Gia Huy', DATEFROMPARTS(YEAR(@today)-6, 6, 10), N'Nam', N'Giang Thị Hoa', '0941555666', N'Cơ bản', N'Đã bảo lưu', DATEADD(DAY, -22, SYSDATETIME())),
 ('HV0073', N'Từ Ái Linh', DATEFROMPARTS(YEAR(@today)-5, 7, 12), N'Nữ', N'Từ Văn Hải', '0941666777', N'Cơ bản', N'Đã bảo lưu', DATEADD(DAY, -20, SYSDATETIME())),
 ('HV0074', N'Đoàn Nhật Quang', DATEFROMPARTS(YEAR(@today)-8, 8, 14), N'Nam', N'Đoàn Thị Lan', '0941777888', N'Nâng cao', N'Đã bảo lưu', DATEADD(DAY, -18, SYSDATETIME())),
 ('HV0075', N'Cao Ngọc Mai', DATEFROMPARTS(YEAR(@today)-7, 9, 16), N'Nữ', N'Cao Văn Nam', '0941888999', N'Nâng cao', N'Đã bảo lưu', DATEADD(DAY, -16, SYSDATETIME()));

/* ---- học viên – lớp ---- */
INSERT dbo.StudentClasses (StudentId, ClassId, IsActive) VALUES
 (1, 10, 1), (1, 12, 1), (1, 8, 1),
 (2, 1, 1), (3, 1, 1), (3, 4, 1), (4, 1, 1), (5, 1, 1), (6, 1, 1),
 (7, 4, 1), (8, 4, 1), (9, 4, 1), (9, 6, 1),
 (10, 6, 1), (11, 6, 1),
 (12, 8, 1), (13, 8, 1), (13, 10, 1),
 (14, 10, 1), (15, 12, 1), (16, 12, 1),
 (17, 2, 1), (17, 5, 1), (18, 2, 1), (19, 2, 1), (19, 11, 1),
 (20, 2, 1), (21, 2, 1), (22, 2, 1), (23, 2, 1), (23, 7, 1),
 (24, 3, 1), (25, 3, 1), (25, 5, 1), (26, 3, 1), (27, 3, 1), (28, 3, 1), (29, 3, 1), (30, 3, 1),
 (31, 5, 1), (31, 7, 1), (32, 5, 1), (33, 7, 1), (34, 7, 1), (34, 9, 1),
 (35, 9, 1), (36, 9, 1), (36, 11, 1), (37, 11, 1), (38, 11, 1),
 -- Lớp bảo lưu của 41..43
 (41, 1, 0), (42, 2, 0), (43, 4, 0),
 -- Học viên mới 44..60 vào lớp
 (44, 13, 1),
 (45, 13, 1), (45, 8, 1),
 (46, 14, 1),
 (47, 14, 1), (47, 3, 1),
 (48, 15, 1),
 (49, 15, 1), (49, 6, 1),
 (50, 16, 1),
 (51, 16, 1), (51, 7, 1),
 (52, 1, 1),
 (53, 4, 1),
 (54, 2, 1),
 (55, 5, 1),
 (56, 10, 1),
 (57, 12, 1),
 (58, 11, 1),
 (59, 9, 1),
 (60, 8, 1),
 -- Lớp bảo lưu của 68..75 (IsActive = 0)
 (68, 1, 0),
 (69, 4, 0),
 (70, 2, 0),
 (71, 5, 0),
 (72, 8, 0),
 (73, 10, 0),
 (74, 9, 0),
 (75, 11, 0);

/* ---- tài khoản phụ huynh (theo SĐT) ---- */
INSERT dbo.Users (Username, PasswordHash, Role, FullName, Phone, MustChangePassword)
SELECT s.ParentPhone, CASE WHEN s.ParentPhone = '0901234567' THEN @pw ELSE @pwX END, 'parent', MIN(s.ParentName), s.ParentPhone, CASE WHEN s.ParentPhone = '0901234567' THEN 0 ELSE 1 END
FROM dbo.Students s GROUP BY s.ParentPhone;
INSERT dbo.Users (Username, PasswordHash, Role, FullName, Phone, MustChangePassword) VALUES
 ('0912345678', @pw2, 'parent', N'Phụ huynh 5678', '0912345678', 1),
 ('0987654321', @pwX, 'parent', N'Phụ huynh 4321', '0987654321', 1),
 ('0905101222', @pwX, 'parent', N'Phụ huynh 1222', '0905101222', 1),
 ('0942111222', @pwX, 'parent', N'Phụ huynh Yến', '0942111222', 1),
 ('0942222333', @pwX, 'parent', N'Phụ huynh Long', '0942222333', 1),
 ('0942333444', @pwX, 'parent', N'Phụ huynh Nga', '0942333444', 1);

/* ---- học phí: tháng trước, tháng này & tháng sau ---- */
DECLARE @m0 DATE = DATEFROMPARTS(YEAR(@today), MONTH(@today), 1);
DECLARE @m_prev DATE = DATEADD(MONTH, -1, @m0);
DECLARE @m1 DATE = DATEADD(MONTH, 1, @m0);

INSERT dbo.Tuition (StudentId, Month, Amount, TotalSessions, Status, PaidAt)
SELECT s.StudentId, m.k, 900000,
       ISNULL((SELECT SUM(w.n) FROM dbo.StudentClasses sc JOIN dbo.Classes c ON c.ClassId = sc.ClassId CROSS APPLY (SELECT dbo.fn_CountWeekdayInMonth(c.Weekday, m.d) + dbo.fn_CountWeekdayInMonth(c.Weekday2, m.d) AS n) w WHERE sc.StudentId = s.StudentId AND sc.IsActive = 1), 8),
       CASE 
         WHEN m.d = @m_prev THEN N'Đã thanh toán'
         WHEN (m.d = @m0 AND s.StudentId IN (2,4,19,26,44,48,54)) OR (m.d = @m1 AND s.StudentId % 2 = 0) THEN N'Chưa thanh toán' 
         ELSE N'Đã thanh toán' 
       END,
       CASE 
         WHEN (m.d = @m0 AND s.StudentId IN (2,4,19,26,44,48,54)) OR (m.d = @m1 AND s.StudentId % 2 = 0) THEN NULL 
         ELSE DATEADD(DAY, -5, SYSDATETIME()) 
       END
FROM dbo.Students s
CROSS JOIN (VALUES 
  (CONVERT(CHAR(7), @m_prev, 23), @m_prev),
  (CONVERT(CHAR(7), @m0, 23), @m0), 
  (CONVERT(CHAR(7), @m1, 23), @m1)
) AS m(k, d)
WHERE s.Status = N'Đang học';

/* ---- đơn học thử (ngày tương đối theo hôm nay) ---- */
INSERT dbo.Trials (StudentName, DateOfBirth, ParentPhone, WishDays, WishSlot, Program, Status, SessionClassId, SessionDate, CreatedAt) VALUES
 -- Chờ tiếp nhận (6 đơn)
 (N'Nguyễn Minh An',   DATEFROMPARTS(YEAR(@today)-6, 3, 15),  '0912345678', '2,4', '17:30 - 19:30', NULL,       N'Chờ tiếp nhận',          NULL, NULL, DATEADD(HOUR, -2, SYSDATETIME())),
 (N'Trần Bảo Ngọc',    DATEFROMPARTS(YEAR(@today)-7, 8, 22),  '0987654321', '2,4', '17:30 - 19:30', NULL,       N'Chờ tiếp nhận',          NULL, NULL, DATEADD(HOUR, -5, SYSDATETIME())),
 (N'Lê Gia Hân',       DATEFROMPARTS(YEAR(@today)-8, 1, 10),  '0905101222', '2,4', '17:30 - 19:30', NULL,       N'Chờ tiếp nhận',          NULL, NULL, DATEADD(HOUR, -8, SYSDATETIME())),
 (N'Ngô Hải Yến',      DATEFROMPARTS(YEAR(@today)-6, 2, 12),  '0942111222', '1,3', '17:30 - 19:30', NULL,       N'Chờ tiếp nhận',          NULL, NULL, DATEADD(HOUR, -12, SYSDATETIME())),
 (N'Trần Bảo Long',    DATEFROMPARTS(YEAR(@today)-8, 4, 18),  '0942222333', '2,4', '17:30 - 19:30', NULL,       N'Chờ tiếp nhận',          NULL, NULL, DATEADD(HOUR, -16, SYSDATETIME())),
 (N'Phạm Quỳnh Nga',   DATEFROMPARTS(YEAR(@today)-5, 7, 20),  '0942333444', '6,0', '09:40 - 11:40', NULL,       N'Chờ tiếp nhận',          NULL, NULL, DATEADD(HOUR, -20, SYSDATETIME())),
 -- Đã tiếp nhận (5 đơn)
 (N'Đặng Khánh An',    DATEFROMPARTS(YEAR(@today)-6, 2, 11),  '0931000111', '2,4', '17:30 - 19:30', N'Cơ bản',   N'Đã tiếp nhận',           NULL, NULL, DATEADD(DAY, -1, SYSDATETIME())),
 (N'Tạ Minh Thư',      DATEFROMPARTS(YEAR(@today)-9, 4, 12),  '0931000222', '6,0', '14:30 - 16:30', N'Nâng cao', N'Đã tiếp nhận',           NULL, NULL, DATEADD(DAY, -1, SYSDATETIME())),
 (N'Hứa Bảo Nam',      DATEFROMPARTS(YEAR(@today)-5, 5, 13),  '0931000333', '2,4', '17:30 - 19:30', N'Cơ bản',   N'Đã tiếp nhận',           NULL, NULL, DATEADD(DAY, -1, SYSDATETIME())),
 (N'Lê Minh Tuấn',     DATEFROMPARTS(YEAR(@today)-6, 6, 14),  '0942444555', '2,4', '17:30 - 19:30', N'Cơ bản',   N'Đã tiếp nhận',           NULL, NULL, DATEADD(DAY, -2, SYSDATETIME())),
 (N'Hoàng Lan Nhi',    DATEFROMPARTS(YEAR(@today)-9, 8, 16),  '0942555666', '6,0', '14:30 - 16:30', N'Nâng cao', N'Đã tiếp nhận',           NULL, NULL, DATEADD(DAY, -2, SYSDATETIME())),
 -- Chờ phụ huynh xác nhận (3 đơn)
 (N'Vương Tuệ Lâm',    DATEFROMPARTS(YEAR(@today)-6, 6, 14),  '0931000444', '1,3', '17:30 - 19:30', N'Cơ bản',   N'Chờ phụ huynh xác nhận', 4, dbo.fn_NextMeet(4, @today), DATEADD(DAY, -2, SYSDATETIME())),
 (N'Đỗ Tuấn Khang',    DATEFROMPARTS(YEAR(@today)-6, 9, 22),  '0942666777', '1,3', '17:30 - 19:30', N'Cơ bản',   N'Chờ phụ huynh xác nhận', 10, dbo.fn_NextMeet(10, @today), DATEADD(DAY, -2, SYSDATETIME())),
 (N'Vũ Diệu Anh',      DATEFROMPARTS(YEAR(@today)-8, 10, 25), '0942777888', '2,4', '17:30 - 19:30', N'Nâng cao', N'Chờ phụ huynh xác nhận', 3, dbo.fn_NextMeet(3, @today), DATEADD(DAY, -2, SYSDATETIME())),
 -- Chờ duyệt ca học thử (5 đơn)
 (N'Bạch Gia Khiêm',   DATEFROMPARTS(YEAR(@today)-6, 7, 15),  '0931000555', '2,4', '17:30 - 19:30', N'Cơ bản',   N'Chờ duyệt ca học thử',   1, dbo.fn_NextMeet(1, @today), DATEADD(DAY, -2, SYSDATETIME())),
 (N'Cát Tường Vi',     DATEFROMPARTS(YEAR(@today)-6, 8, 16),  '0931000666', '1,3', '17:30 - 19:30', N'Cơ bản',   N'Chờ duyệt ca học thử',   4, dbo.fn_NextMeet(4, @today), DATEADD(DAY, -2, SYSDATETIME())),
 (N'Ông Gia Huy',      DATEFROMPARTS(YEAR(@today)-10, 9, 17), '0931000777', '1,3', '17:30 - 19:30', N'Nâng cao', N'Chờ duyệt ca học thử',   5, dbo.fn_NextMeet(5, @today), DATEADD(DAY, -2, SYSDATETIME())),
 (N'Bùi Quốc Anh',     DATEFROMPARTS(YEAR(@today)-6, 3, 20),  '0942888999', '6,0', '09:40 - 11:40', N'Cơ bản',   N'Chờ duyệt ca học thử',   8, dbo.fn_NextMeet(8, @today), DATEADD(DAY, -2, SYSDATETIME())),
 (N'Hà Phương Linh',   DATEFROMPARTS(YEAR(@today)-8, 5, 24),  '0942999000', '6,0', '14:30 - 16:30', N'Nâng cao', N'Chờ duyệt ca học thử',   7, dbo.fn_NextMeet(7, @today), DATEADD(DAY, -2, SYSDATETIME())),
 -- Đã xếp ca (5 đơn: có cả tương lai và quá khứ chờ đánh giá)
 (N'Khổng Nhã Uyên',   DATEFROMPARTS(YEAR(@today)-5, 10, 18), '0931000888', '6,0', '09:40 - 11:40', N'Cơ bản',   N'Đã xếp ca',              8, dbo.fn_NextMeet(8, @today), DATEADD(DAY, -3, SYSDATETIME())),
 (N'Nguyễn Đăng Khôi', DATEFROMPARTS(YEAR(@today)-5, 2, 10),  '0943111222', '6,0', '07:30 - 09:30', N'Cơ bản',   N'Đã xếp ca',              12, dbo.fn_NextMeet(12, @today), DATEADD(DAY, -3, SYSDATETIME())),
 (N'Trương Cẩm Tú',    DATEFROMPARTS(YEAR(@today)-10, 4, 15), '0943222333', '1,3', '17:30 - 19:30', N'Nâng cao', N'Đã xếp ca',              11, dbo.fn_NextMeet(11, @today), DATEADD(DAY, -3, SYSDATETIME())),
 (N'Thạch Gia Bảo',    DATEFROMPARTS(YEAR(@today)-5, 11, 19), '0931000999', '6,0', '14:30 - 16:30', N'Cơ bản',   N'Đã xếp ca',              6, dbo.fn_PrevMeet(6, @today), DATEADD(DAY, -9, SYSDATETIME())),
 (N'Lý Bảo Châu',      DATEFROMPARTS(YEAR(@today)-6, 8, 12),  '0932000444', '2,4', '17:30 - 19:30', N'Cơ bản',   N'Đã xếp ca',              1, dbo.fn_PrevMeet(1, @today), DATEADD(DAY, -8, SYSDATETIME())),
 -- Đã hoàn thành (2 đơn)
 (N'Ninh Khả Ái',      DATEFROMPARTS(YEAR(@today)-9, 12, 20), '0932000111', '6,0', '14:30 - 16:30', N'Nâng cao', N'Đã hoàn thành',          7, dbo.fn_PrevMeet(7, @today), DATEADD(DAY, -10, SYSDATETIME())),
 (N'Phan Hữu Phước',   DATEFROMPARTS(YEAR(@today)-9, 1, 15),  '0943444555', '6,0', '09:40 - 11:40', N'Nâng cao', N'Đã hoàn thành',          9, dbo.fn_PrevMeet(9, @today), DATEADD(DAY, -10, SYSDATETIME())),
 -- Đã tư vấn (4 đơn)
 (N'Ân Thiên Kim',     DATEFROMPARTS(YEAR(@today)-6, 1, 21),  '0932000222', '1,3', '17:30 - 19:30', N'Cơ bản',   N'Đã tư vấn',              4, dbo.fn_PrevMeet(4, @today), DATEADD(DAY, -12, SYSDATETIME())),
 (N'Doãn Hải Nam',     DATEFROMPARTS(YEAR(@today)-8, 2, 22),  '0932000333', '1,3', '17:30 - 19:30', N'Nâng cao', N'Đã tư vấn',              5, dbo.fn_PrevMeet(5, @today), DATEADD(DAY, -13, SYSDATETIME())),
 (N'Đặng Quỳnh Chi',   DATEFROMPARTS(YEAR(@today)-6, 3, 24),  '0943555666', '1,3', '17:30 - 19:30', N'Cơ bản',   N'Đã tư vấn',              4, dbo.fn_PrevMeet(4, @today), DATEADD(DAY, -14, SYSDATETIME())),
 (N'Võ Hoàng Nam',     DATEFROMPARTS(YEAR(@today)-10, 5, 26), '0943666777', '2,4', '17:30 - 19:30', N'Nâng cao', N'Đã tư vấn',              2, dbo.fn_PrevMeet(2, @today), DATEADD(DAY, -15, SYSDATETIME()));

UPDATE dbo.Trials SET AssessStroke = N'Bé cầm bút khá tự tin, nét vẽ rõ.', AssessColor = N'Biết phối các màu sắc hài hòa.', AssessAbsorb = N'Tiếp thu nhanh, làm theo hướng dẫn.', AssessedBy = (SELECT UserId FROM dbo.Users WHERE Username = N'minhkhoa'), AssessedAt = DATEADD(DAY, -1, SYSDATETIME()) WHERE StudentName = N'Ninh Khả Ái';
UPDATE dbo.Trials SET AssessStroke = N'Nắm vững tỷ lệ và hình khối tốt.', AssessColor = N'Màu sắc có chiều sâu và độ chuyển màu mượt.', AssessAbsorb = N'Chăm chú lắng nghe, hoàn thành tác phẩm đúng giờ.', AssessedBy = (SELECT UserId FROM dbo.Users WHERE Username = N'quynh'), AssessedAt = DATEADD(DAY, -2, SYSDATETIME()) WHERE StudentName = N'Phan Hữu Phước';

UPDATE dbo.Trials SET AssessStroke = N'Nét vẽ mềm, bố cục cân đối.', AssessColor = N'Màu tươi sáng.', AssessAbsorb = N'Tiếp thu tốt.', AssessedBy = (SELECT UserId FROM dbo.Users WHERE Username = N'thuha'), AssessedAt = DATEADD(DAY, -4, SYSDATETIME()),
       ConsultRoadmap = N'Lộ trình Cơ bản 6 tháng, 2 buổi/tuần.', ConsultDecision = N'Đăng ký chính thức', ConsultBy = (SELECT UserId FROM dbo.Users WHERE Username = N'thanhnhi'), ConsultAt = DATEADD(DAY, -3, SYSDATETIME()) WHERE StudentName = N'Ân Thiên Kim';
UPDATE dbo.Trials SET AssessStroke = N'Nét vẽ còn rụt rè.', AssessColor = N'Màu tương đối đơn điệu.', AssessAbsorb = N'Cần thêm thời gian làm quen.', AssessedBy = (SELECT UserId FROM dbo.Users WHERE Username = N'baochau'), AssessedAt = DATEADD(DAY, -5, SYSDATETIME()),
       ConsultRoadmap = N'Nâng cao, học 2 buổi/tuần.', ConsultDecision = N'Chưa quyết định', ConsultNote = N'Phụ huynh muốn cân nhắc.', ConsultBy = (SELECT UserId FROM dbo.Users WHERE Username = N'thanhnhi'), ConsultAt = DATEADD(DAY, -4, SYSDATETIME()) WHERE StudentName = N'Doãn Hải Nam';
UPDATE dbo.Trials SET AssessStroke = N'Nét vẽ tự nhiên, dứt khoát.', AssessColor = N'Phối màu rất sáng tạo.', AssessAbsorb = N'Rất tích cực tương tác và đặt câu hỏi.', AssessedBy = (SELECT UserId FROM dbo.Users WHERE Username = N'thuha'), AssessedAt = DATEADD(DAY, -5, SYSDATETIME()),
       ConsultRoadmap = N'Lộ trình Cơ bản 1 năm, lớp T2-T4.', ConsultDecision = N'Đăng ký chính thức', ConsultNote = N'Phụ huynh rất hài lòng và muốn đăng ký ngay.', ConsultBy = (SELECT UserId FROM dbo.Users WHERE Username = N'thanhnhi'), ConsultAt = DATEADD(DAY, -4, SYSDATETIME()) WHERE StudentName = N'Đặng Quỳnh Chi';
UPDATE dbo.Trials SET AssessStroke = N'Nét chì tương đối tốt.', AssessColor = N'Chưa quen sử dụng màu bột.', AssessAbsorb = N'Cần nhiều sự hướng dẫn trực tiếp.', AssessedBy = (SELECT UserId FROM dbo.Users WHERE Username = N'baochau'), AssessedAt = DATEADD(DAY, -6, SYSDATETIME()),
       ConsultRoadmap = N'Lộ trình Nâng cao 6 tháng.', ConsultDecision = N'Không đăng ký', ConsultNote = N'Gia đình chuẩn bị chuyển nhà sang quận khác.', ConsultBy = (SELECT UserId FROM dbo.Users WHERE Username = N'thanhnhi'), ConsultAt = DATEADD(DAY, -5, SYSDATETIME()) WHERE StudentName = N'Võ Hoàng Nam';

/* ---- yêu cầu xin nghỉ / học bù (Absences) ---- */
DECLARE @tl INT = (SELECT UserId FROM dbo.Users WHERE Username = N'thanhnhi');
INSERT dbo.Absences (StudentId, ClassId, SessionDate, Reason, Status, Deadline, MakeupClassId, MakeupDate, CreatedBy) VALUES
 -- Chờ xếp lịch bù
 (3, 4, dbo.fn_NextMeet(4, @today), N'Bé bị ốm',         N'Chờ xếp lịch bù',    DATEADD(DAY, 30, dbo.fn_NextMeet(4, @today)), NULL, NULL, @tl),
 (44, 13, dbo.fn_NextMeet(13, @today), N'Bé bị cảm sốt', N'Chờ xếp lịch bù',    DATEADD(DAY, 30, dbo.fn_NextMeet(13, @today)), NULL, NULL, @tl),
 (46, 14, dbo.fn_NextMeet(14, @today), N'Bận thi học kỳ', N'Chờ xếp lịch bù',    DATEADD(DAY, 30, dbo.fn_NextMeet(14, @today)), NULL, NULL, @tl),
 (52, 1, dbo.fn_NextMeet(1, @today), N'Về quê thăm ông bà', N'Chờ xếp lịch bù', DATEADD(DAY, 30, dbo.fn_NextMeet(1, @today)), NULL, NULL, @tl),
 -- Đã đăng ký học bù
 (5, 1, dbo.fn_PrevMeet(1, @today), N'Gia đình có việc', N'Đã đăng ký học bù',  DATEADD(DAY, 30, dbo.fn_PrevMeet(1, @today)), 4,  dbo.fn_NextMeet(4, @today), @tl),
 (54, 2, dbo.fn_PrevMeet(2, @today), N'Trùng lịch thi bơi', N'Đã đăng ký học bù', DATEADD(DAY, 30, dbo.fn_PrevMeet(2, @today)), 3, dbo.fn_NextMeet(3, @today), @tl),
 (56, 10, dbo.fn_PrevMeet(10, @today), N'Gia đình đi công tác', N'Đã đăng ký học bù', DATEADD(DAY, 30, dbo.fn_PrevMeet(10, @today)), 4, dbo.fn_NextMeet(4, @today), @tl),
 -- Chờ duyệt (cho màn hình Quản lý phê duyệt đề xuất xếp bù)
 (14, 10, dbo.fn_PrevMeet(10, @today), NULL,                N'Chờ duyệt',          DATEADD(DAY, 30, dbo.fn_PrevMeet(10, @today)), 12,  dbo.fn_NextMeet(12, @today), @tl),
 (20, 2, dbo.fn_PrevMeet(2, @today), NULL,                N'Chờ duyệt',          DATEADD(DAY, 30, dbo.fn_PrevMeet(2, @today)), 3,  dbo.fn_NextMeet(3, @today), @tl),
 (18, 2, dbo.fn_PrevMeet(2, @today), N'Bận việc riêng',   N'Chờ duyệt',          DATEADD(DAY, 30, dbo.fn_PrevMeet(2, @today)), 5,  dbo.fn_NextMeet(5, @today), @tl),
 (24, 3, dbo.fn_PrevMeet(3, @today), N'Bị ốm đột xuất',   N'Chờ duyệt',          DATEADD(DAY, 30, dbo.fn_PrevMeet(3, @today)), 2,  dbo.fn_NextMeet(2, @today), @tl),
 -- Đã xếp lịch bù
 (12, 8, dbo.fn_PrevMeet(8, @today), NULL,                N'Đã xếp lịch bù',     DATEADD(DAY, 30, dbo.fn_PrevMeet(8, @today)), 4,  dbo.fn_NextMeet(4, @today), @tl),
 (29, 3, dbo.fn_PrevMeet(3, @today), NULL,                N'Đã xếp lịch bù',     DATEADD(DAY, 30, dbo.fn_PrevMeet(3, @today)), 9,  dbo.fn_NextMeet(9, @today), @tl),
 (48, 15, dbo.fn_PrevMeet(15, @today), N'Cả nhà đi cưới', N'Đã xếp lịch bù',     DATEADD(DAY, 30, dbo.fn_PrevMeet(15, @today)), 8, dbo.fn_NextMeet(8, @today), @tl),
 (50, 16, dbo.fn_PrevMeet(16, @today), N'Bé mệt',          N'Đã xếp lịch bù',     DATEADD(DAY, 30, dbo.fn_PrevMeet(16, @today)), 7, dbo.fn_NextMeet(7, @today), @tl),
 -- Hết hạn
 (8, 4, dbo.fn_PrevMeet(4, DATEADD(DAY, -44, @today)), N'Đi du lịch', N'Hết hạn', DATEADD(DAY, 30, dbo.fn_PrevMeet(4, DATEADD(DAY, -44, @today))), NULL, NULL, @tl),
 (11, 6, dbo.fn_PrevMeet(6, DATEADD(DAY, -46, @today)), N'Đi nước ngoài', N'Hết hạn', DATEADD(DAY, 30, dbo.fn_PrevMeet(6, DATEADD(DAY, -46, @today))), NULL, NULL, @tl);

/* ---- điểm danh 14 ngày qua + nhật ký (một số ca cố ý thiếu ảnh/nhận xét để Giám sát có dữ liệu) ---- */
DECLARE @d DATE = DATEADD(DAY, -14, @today);
WHILE @d < @today
BEGIN
    INSERT dbo.Attendances (ClassId, SessionDate, FinalizedAt, FinalizedBy)
    SELECT c.ClassId, @d, DATEADD(HOUR, 20, CAST(@d AS DATETIME2(0))), c.TeacherId 
    FROM dbo.Classes c 
    WHERE dbo.fn_Weekday(@d) IN (c.Weekday, c.Weekday2);

    INSERT dbo.AttendanceRecords (AttendanceId, PersonType, PersonId, Status)
    SELECT a.AttendanceId, 'Student', sc.StudentId,
           CASE WHEN ABS(CHECKSUM(a.ClassId, sc.StudentId, DAY(@d))) % 9 = 0 THEN 'absent' ELSE 'present' END
    FROM dbo.Attendances a
    JOIN dbo.StudentClasses sc ON sc.ClassId = a.ClassId AND sc.IsActive = 1
    JOIN dbo.Students s ON s.StudentId = sc.StudentId AND s.Status = N'Đang học'
    WHERE a.SessionDate = @d;

    INSERT dbo.Journal (StudentId, ClassId, SessionDate, TeacherId, PhotoPath, PhotoAt, StrokeComment, ColorComment, AbsorbComment, CommentAt)
    SELECT r.PersonId, a.ClassId, a.SessionDate, c.TeacherId,
           CASE WHEN v.viol = 1 AND r.rn % 3 = 0 THEN NULL ELSE CONCAT('/uploads/seed/art', 1 + ABS(CHECKSUM(a.ClassId, r.PersonId)) % 5, '.svg') END,
           CASE WHEN v.viol = 1 AND r.rn % 3 = 0 THEN NULL ELSE DATEADD(HOUR, 21, CAST(a.SessionDate AS DATETIME2(0))) END,
           CASE WHEN v.viol = 1 AND r.rn % 4 = 1 THEN NULL ELSE N'Nét vẽ tự tin, rõ ràng hơn.' END,
           CASE WHEN v.viol = 1 AND r.rn % 4 = 1 THEN NULL ELSE N'Bé phối màu hài hòa.' END,
           CASE WHEN v.viol = 1 AND r.rn % 4 = 1 THEN NULL ELSE N'Tiếp thu nhanh, làm theo hướng dẫn tốt.' END,
           CASE WHEN v.viol = 1 AND r.rn % 4 = 1 THEN NULL ELSE DATEADD(HOUR, 21, CAST(a.SessionDate AS DATETIME2(0))) END
    FROM (SELECT r2.AttendanceId, r2.PersonId, ROW_NUMBER() OVER (PARTITION BY r2.AttendanceId ORDER BY r2.PersonId) - 1 AS rn
          FROM dbo.AttendanceRecords r2 WHERE r2.Status = 'present' AND r2.PersonType = 'Student') r
    JOIN dbo.Attendances a ON a.AttendanceId = r.AttendanceId AND a.SessionDate = @d
    JOIN dbo.Classes c ON c.ClassId = a.ClassId
    CROSS APPLY (SELECT CASE WHEN ABS(CHECKSUM(a.ClassId, DAY(a.SessionDate))) % 4 = 0 THEN 1 ELSE 0 END AS viol) v;

    SET @d = DATEADD(DAY, 1, @d);
END

/* ---- tiến độ học tập (học viên Đang học) ---- */
INSERT dbo.ProgressRecords (StudentId, ClassId, SessionDate, EvalDate, Status, TeacherId, RecordedBy)
SELECT x.StudentId, x.ClassId, x.SessionDate, x.SessionDate,
       CASE WHEN x.StudentId % 5 = 0 THEN N'Chậm tiến độ' ELSE N'Đúng tiến độ' END, c.TeacherId, @tl
FROM (SELECT r.PersonId AS StudentId, a.ClassId, a.SessionDate, ROW_NUMBER() OVER (PARTITION BY r.PersonId ORDER BY a.SessionDate DESC) AS rk
      FROM dbo.AttendanceRecords r
      JOIN dbo.Attendances a ON a.AttendanceId = r.AttendanceId
      JOIN dbo.StudentClasses sc ON sc.StudentId = r.PersonId AND sc.ClassId = a.ClassId
      WHERE r.PersonType = 'Student' AND r.Status = 'present') x
JOIN dbo.Classes c ON c.ClassId = x.ClassId
WHERE x.rk = 1 AND x.StudentId % 2 = 0;

/* ---- thông báo mẫu ---- */
DECLARE @ph INT = (SELECT UserId FROM dbo.Users WHERE Username = '0901234567');
INSERT dbo.Notifications (UserId, Title, Body, CreatedAt, IsRead) VALUES
 (@ph, N'Lịch học bù đã được phê duyệt', N'Ca học bù của bé Nguyễn Gia Hân đã được duyệt.', DATEADD(HOUR, -1, SYSDATETIME()), 0),
 (@ph, N'Học viên vắng mặt', N'Bé Nguyễn Minh Khôi vắng mặt ở ca học gần nhất.', DATEADD(DAY, -1, SYSDATETIME()), 1),
 (@ph, N'Nhắc đóng học phí', N'Học phí tháng này của bé đã được tạo. Ba mẹ vui lòng kiểm tra.', DATEADD(DAY, -3, SYSDATETIME()), 0);

DECLARE @ql INT = (SELECT UserId FROM dbo.Users WHERE Username = 'minhchau');
INSERT dbo.Notifications (UserId, Title, Body, CreatedAt, IsRead) VALUES
 (@ql, N'Đề xuất xếp bù mới', N'Có 4 đề xuất ca học bù mới đang chờ phê duyệt.', DATEADD(HOUR, -2, SYSDATETIME()), 0),
 (@ql, N'Ca học thử mới', N'Có 5 ca học thử mới đang chờ phê duyệt.', DATEADD(HOUR, -4, SYSDATETIME()), 0);

COMMIT;
GO
PRINT N'Đã nạp toàn bộ cơ sở dữ liệu mẫu phong phú thành công.';
