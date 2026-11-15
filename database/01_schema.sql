/* =====================================================================
   LỚP VẼ NGÔI NHÀ NHỎ – SCRIPT TẠO CƠ SỞ DỮ LIỆU (SQL Server 2019+)
   Chạy toàn bộ file này trong SSMS / Azure Data Studio (chạy được nhiều lần:
   mỗi lần chạy sẽ XÓA và TẠO LẠI database NgoiNhaNho – chỉ dùng cho môi trường phát triển).
   Ghi chú: đặc tả không quy định tên bảng/trường nên tên dưới đây do nhóm phát triển đặt,
   bám theo thuật ngữ/trạng thái trong đặc tả (Chờ xếp lớp, Đang học, Đã bảo lưu, Chờ xếp lịch bù...).
   Quy ước ngày trong tuần (cột Weekday/Weekday2): 0 = Chủ nhật, 1 = Thứ 2, ... 6 = Thứ 7. Thứ 6 (5) trung tâm nghỉ (BR-UC7-04).
   Mỗi lớp học 2 buổi/tuần theo cặp ngày cố định: Thứ 2 - Thứ 4 (1,3), Thứ 3 - Thứ 5 (2,4), Thứ 7 - Chủ nhật (6,0).
   ===================================================================== */
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;   -- bắt buộc cho chỉ mục có điều kiện WHERE (filtered index); sqlcmd mặc định để OFF
GO
USE master;
GO
IF DB_ID(N'NgoiNhaNho') IS NOT NULL
BEGIN
    ALTER DATABASE NgoiNhaNho SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE NgoiNhaNho;
END
GO
CREATE DATABASE NgoiNhaNho COLLATE Vietnamese_100_CI_AS;
GO
USE NgoiNhaNho;
GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

/* ---------- Hàm tiện ích: thứ trong tuần theo quy ước 0 = Chủ nhật (không phụ thuộc DATEFIRST) ---------- */
CREATE FUNCTION dbo.fn_Weekday(@d DATE) RETURNS TINYINT
AS BEGIN RETURN CAST(DATEDIFF(DAY, '19000107', @d) % 7 AS TINYINT); END   -- 07/01/1900 là Chủ nhật
GO

/* ---------- 1. Tài khoản ---------- */
CREATE TABLE dbo.Users (
    UserId             INT IDENTITY(1,1) CONSTRAINT PK_Users PRIMARY KEY,
    Username           NVARCHAR(50)  NOT NULL CONSTRAINT UQ_Users_Username UNIQUE,   -- Phụ huynh: SĐT
    Email              NVARCHAR(100) NULL,
    PasswordHash       NVARCHAR(100) NOT NULL,                                       -- BCrypt, không lưu mật khẩu thô
    Role               VARCHAR(20)   NOT NULL CONSTRAINT CK_Users_Role CHECK (Role IN ('assistant','manager','supervisor','teacher','parent')),
    FullName           NVARCHAR(100) NOT NULL,
    Title              NVARCHAR(20)  NULL,                                           -- Cô / Thầy
    Phone              VARCHAR(10)   NULL,
    IsLocked           BIT NOT NULL CONSTRAINT DF_Users_IsLocked DEFAULT 0,
    FailedAttempts     INT NOT NULL CONSTRAINT DF_Users_FailedAttempts DEFAULT 0,
    LockoutEnd         DATETIME2(0) NULL,
    MustChangePassword BIT NOT NULL CONSTRAINT DF_Users_MustChange DEFAULT 0,
    CreatedAt          DATETIME2(0) NOT NULL CONSTRAINT DF_Users_CreatedAt DEFAULT SYSDATETIME()
);
CREATE UNIQUE INDEX UX_Users_Email ON dbo.Users(Email) WHERE Email IS NOT NULL;
CREATE INDEX IX_Users_Phone ON dbo.Users(Phone);

/* ---------- 2. Lớp học (lớp lặp hằng tuần) ---------- */
CREATE TABLE dbo.Classes (
    ClassId   INT IDENTITY(1,1) CONSTRAINT PK_Classes PRIMARY KEY,
    Name      NVARCHAR(100) NOT NULL CONSTRAINT UQ_Classes_Name UNIQUE,              -- BR-UC7-05
    Program   NVARCHAR(20)  NOT NULL CONSTRAINT CK_Classes_Program CHECK (Program IN (N'Cơ bản', N'Nâng cao')),
    Weekday   TINYINT       NOT NULL,                                               -- ngày học thứ nhất của cặp
    Weekday2  TINYINT       NOT NULL,                                               -- ngày học thứ hai của cặp
    StartTime TIME(0)       NOT NULL,
    EndTime   TIME(0)       NOT NULL,
    Capacity  TINYINT       NOT NULL CONSTRAINT DF_Classes_Capacity DEFAULT 7 CONSTRAINT CK_Classes_Capacity CHECK (Capacity BETWEEN 1 AND 7), -- BR-UC7-03
    TeacherId INT NULL CONSTRAINT FK_Classes_Teacher REFERENCES dbo.Users(UserId),
    Letter    CHAR(1)       NOT NULL CONSTRAINT DF_Classes_Letter DEFAULT 'A',      -- dùng sinh mã ca: CB/NC + ddMM + Letter
    CONSTRAINT CK_Classes_Time CHECK (EndTime > StartTime),
    -- lịch học của trung tâm: T2-T4 và T3-T5 học 17:30-19:30; T7-CN có 4 khung giờ
    CONSTRAINT CK_Classes_Schedule CHECK (
        ((Weekday = 1 AND Weekday2 = 3) OR (Weekday = 2 AND Weekday2 = 4)) AND StartTime = '17:30' AND EndTime = '19:30'
        OR (Weekday = 6 AND Weekday2 = 0) AND ((StartTime = '07:30' AND EndTime = '09:30') OR (StartTime = '09:40' AND EndTime = '11:40')
                                            OR (StartTime = '14:30' AND EndTime = '16:30') OR (StartTime = '17:00' AND EndTime = '19:00')))
);

/* ---------- 3. Đơn học thử ---------- */
CREATE TABLE dbo.Trials (
    TrialId        INT IDENTITY(1,1) CONSTRAINT PK_Trials PRIMARY KEY,
    StudentName    NVARCHAR(50)  NOT NULL,
    DateOfBirth    DATE          NOT NULL,
    ParentPhone    VARCHAR(10)   NOT NULL,
    WishDays       VARCHAR(20)   NOT NULL,                                          -- vd '2,4' (0 = CN)
    WishSlot       VARCHAR(20)   NOT NULL,                                          -- vd '17:30 - 19:30'
    Program        NVARCHAR(20)  NULL CONSTRAINT CK_Trials_Program CHECK (Program IS NULL OR Program IN (N'Cơ bản', N'Nâng cao')),
    Status         NVARCHAR(30)  NOT NULL CONSTRAINT DF_Trials_Status DEFAULT N'Chờ tiếp nhận'
                   CONSTRAINT CK_Trials_Status CHECK (Status IN (N'Chờ tiếp nhận', N'Đã tiếp nhận', N'Chờ phụ huynh xác nhận', N'Chờ duyệt ca học thử', N'Đã xếp ca', N'Đã hoàn thành', N'Đã tư vấn')),
    SessionClassId INT  NULL CONSTRAINT FK_Trials_Class REFERENCES dbo.Classes(ClassId),
    SessionDate    DATE NULL,
    CreatedAt      DATETIME2(0) NOT NULL CONSTRAINT DF_Trials_CreatedAt DEFAULT SYSDATETIME(),
    AssessStroke   NVARCHAR(500) NULL,  AssessColor NVARCHAR(500) NULL, AssessAbsorb NVARCHAR(500) NULL,
    AssessedBy     INT NULL CONSTRAINT FK_Trials_AssessedBy REFERENCES dbo.Users(UserId),
    AssessedAt     DATETIME2(0) NULL,
    ConsultRoadmap NVARCHAR(1000) NULL,
    ConsultDecision NVARCHAR(30) NULL CONSTRAINT CK_Trials_Decision CHECK (ConsultDecision IS NULL OR ConsultDecision IN (N'Đăng ký chính thức', N'Chưa quyết định', N'Không đăng ký')),
    ConsultNote    NVARCHAR(1000) NULL,                                              -- ghi chú nội bộ, không hiển thị cho phụ huynh (BR-UC2-14)
    ConsultBy      INT NULL CONSTRAINT FK_Trials_ConsultBy REFERENCES dbo.Users(UserId),
    ConsultAt      DATETIME2(0) NULL,
    CONSTRAINT CK_Trials_Session CHECK ((SessionClassId IS NULL AND SessionDate IS NULL) OR (SessionClassId IS NOT NULL AND SessionDate IS NOT NULL))
);
CREATE INDEX IX_Trials_Status ON dbo.Trials(Status);
CREATE INDEX IX_Trials_Parent ON dbo.Trials(ParentPhone);
CREATE INDEX IX_Trials_Session ON dbo.Trials(SessionClassId, SessionDate);

/* ---------- 4. Hồ sơ học viên ---------- */
CREATE TABLE dbo.Students (
    StudentId   INT IDENTITY(1,1) CONSTRAINT PK_Students PRIMARY KEY,
    Code        VARCHAR(10)   NOT NULL CONSTRAINT UQ_Students_Code UNIQUE,           -- HS0001
    FullName    NVARCHAR(50)  NOT NULL,
    DateOfBirth DATE          NOT NULL,
    Gender      NVARCHAR(10)  NOT NULL CONSTRAINT CK_Students_Gender CHECK (Gender IN (N'Nam', N'Nữ')),
    ParentName  NVARCHAR(100) NOT NULL,
    ParentPhone VARCHAR(10)   NOT NULL,
    Program     NVARCHAR(20)  NOT NULL CONSTRAINT CK_Students_Program CHECK (Program IN (N'Cơ bản', N'Nâng cao')),
    Status      NVARCHAR(20)  NOT NULL CONSTRAINT DF_Students_Status DEFAULT N'Chờ xếp lớp'
                CONSTRAINT CK_Students_Status CHECK (Status IN (N'Chờ xếp lớp', N'Đang học', N'Đã bảo lưu')),
    TrialId     INT NULL CONSTRAINT FK_Students_Trial REFERENCES dbo.Trials(TrialId),
    CreatedAt   DATETIME2(0) NOT NULL CONSTRAINT DF_Students_CreatedAt DEFAULT SYSDATETIME(),
    CONSTRAINT UQ_Students_Identity UNIQUE (FullName, DateOfBirth, ParentPhone)       -- BR-UC6: chống trùng hồ sơ
);
CREATE INDEX IX_Students_ParentPhone ON dbo.Students(ParentPhone);
CREATE INDEX IX_Students_Status ON dbo.Students(Status);

/* Học viên – lớp (học viên có thể học nhiều lớp). IsActive = 0: lớp trước khi bảo lưu */
CREATE TABLE dbo.StudentClasses (
    StudentId INT NOT NULL CONSTRAINT FK_SC_Student REFERENCES dbo.Students(StudentId),
    ClassId   INT NOT NULL CONSTRAINT FK_SC_Class   REFERENCES dbo.Classes(ClassId),
    IsActive  BIT NOT NULL CONSTRAINT DF_SC_Active DEFAULT 1,
    JoinedAt  DATETIME2(0) NOT NULL CONSTRAINT DF_SC_Joined DEFAULT SYSDATETIME(),
    CONSTRAINT PK_StudentClasses PRIMARY KEY (StudentId, ClassId)
);
CREATE INDEX IX_SC_Class ON dbo.StudentClasses(ClassId) WHERE IsActive = 1;

/* ---------- 5. Nghỉ học & học bù ---------- */
CREATE TABLE dbo.Absences (
    AbsenceId      INT IDENTITY(1,1) CONSTRAINT PK_Absences PRIMARY KEY,
    StudentId      INT  NOT NULL CONSTRAINT FK_Abs_Student REFERENCES dbo.Students(StudentId),
    ClassId        INT  NOT NULL CONSTRAINT FK_Abs_Class   REFERENCES dbo.Classes(ClassId),
    SessionDate    DATE NOT NULL,
    Reason         NVARCHAR(500) NULL,
    Status         NVARCHAR(30) NOT NULL CONSTRAINT DF_Abs_Status DEFAULT N'Chờ xếp lịch bù'
                   CONSTRAINT CK_Abs_Status CHECK (Status IN (N'Chờ xếp lịch bù', N'Đã đăng ký học bù', N'Chờ duyệt', N'Đã xếp lịch bù', N'Hết hạn')),
    Deadline       DATE NOT NULL,                                                   -- ngày nghỉ + 30 ngày (BR-UC3-08)
    MakeupClassId  INT  NULL CONSTRAINT FK_Abs_MakeupClass REFERENCES dbo.Classes(ClassId),
    MakeupDate     DATE NULL,
    CreatedAt      DATETIME2(0) NOT NULL CONSTRAINT DF_Abs_CreatedAt DEFAULT SYSDATETIME(),
    CreatedBy      INT  NULL CONSTRAINT FK_Abs_CreatedBy REFERENCES dbo.Users(UserId),
    CONSTRAINT UQ_Absences_Session UNIQUE (StudentId, ClassId, SessionDate),          -- BR-UC3-05: 1 buổi chỉ 1 đơn nghỉ
    CONSTRAINT CK_Abs_Makeup CHECK ((MakeupClassId IS NULL AND MakeupDate IS NULL) OR (MakeupClassId IS NOT NULL AND MakeupDate IS NOT NULL))
);
CREATE INDEX IX_Abs_Status ON dbo.Absences(Status);
CREATE INDEX IX_Abs_Makeup ON dbo.Absences(MakeupClassId, MakeupDate) WHERE MakeupClassId IS NOT NULL;

/* ---------- 6. Điểm danh ---------- */
CREATE TABLE dbo.Attendances (
    AttendanceId INT IDENTITY(1,1) CONSTRAINT PK_Attendances PRIMARY KEY,
    ClassId      INT  NOT NULL CONSTRAINT FK_Att_Class REFERENCES dbo.Classes(ClassId),
    SessionDate  DATE NOT NULL,
    FinalizedAt  DATETIME2(0) NOT NULL CONSTRAINT DF_Att_Final DEFAULT SYSDATETIME(),
    FinalizedBy  INT NULL CONSTRAINT FK_Att_By REFERENCES dbo.Users(UserId),
    CONSTRAINT UQ_Attendances_Session UNIQUE (ClassId, SessionDate)                   -- 1 ca chỉ chốt 1 lần
);
CREATE TABLE dbo.AttendanceRecords (
    AttendanceId INT NOT NULL CONSTRAINT FK_AR_Att REFERENCES dbo.Attendances(AttendanceId) ON DELETE CASCADE,
    PersonType   VARCHAR(10) NOT NULL CONSTRAINT CK_AR_Type CHECK (PersonType IN ('Student','Trial')),
    PersonId     INT NOT NULL,                                                       -- StudentId hoặc TrialId (học bù là Student)
    Status       VARCHAR(10) NOT NULL CONSTRAINT CK_AR_Status CHECK (Status IN ('present','absent')),
    CONSTRAINT PK_AttendanceRecords PRIMARY KEY (AttendanceId, PersonType, PersonId)
);

/* ---------- 7. Học phí ---------- */
CREATE TABLE dbo.Tuition (
    StudentId     INT NOT NULL CONSTRAINT FK_Tuition_Student REFERENCES dbo.Students(StudentId),
    Month         CHAR(7) NOT NULL CONSTRAINT CK_Tuition_Month CHECK (Month LIKE '[0-9][0-9][0-9][0-9]-[0-1][0-9]'),   -- 'YYYY-MM'
    Amount        DECIMAL(12,0) NOT NULL,
    TotalSessions INT NOT NULL CONSTRAINT DF_Tuition_Total DEFAULT 0,               -- số buổi của tháng, xác lập khi ghi nhận học phí (BR-UC9-06)
    Status        NVARCHAR(20) NOT NULL CONSTRAINT DF_Tuition_Status DEFAULT N'Chưa thanh toán'
                  CONSTRAINT CK_Tuition_Status CHECK (Status IN (N'Đã thanh toán', N'Chưa thanh toán')),
    PaidAt        DATETIME2(0) NULL,
    RecordedBy    INT NULL CONSTRAINT FK_Tuition_By REFERENCES dbo.Users(UserId),
    CONSTRAINT PK_Tuition PRIMARY KEY (StudentId, Month)
);

/* ---------- 8. Nhật ký học tập (ảnh tác phẩm + nhận xét) ---------- */
CREATE TABLE dbo.Journal (
    JournalId     INT IDENTITY(1,1) CONSTRAINT PK_Journal PRIMARY KEY,
    StudentId     INT  NOT NULL CONSTRAINT FK_Jr_Student REFERENCES dbo.Students(StudentId),
    ClassId       INT  NOT NULL CONSTRAINT FK_Jr_Class   REFERENCES dbo.Classes(ClassId),
    SessionDate   DATE NOT NULL,
    TeacherId     INT  NULL CONSTRAINT FK_Jr_Teacher REFERENCES dbo.Users(UserId),
    PhotoPath     NVARCHAR(300) NULL,                                               -- đường dẫn file ảnh trên máy chủ
    PhotoAt       DATETIME2(0) NULL,
    StrokeComment NVARCHAR(500) NULL, ColorComment NVARCHAR(500) NULL, AbsorbComment NVARCHAR(500) NULL,
    CommentAt     DATETIME2(0) NULL,
    CONSTRAINT UQ_Journal_Session UNIQUE (StudentId, ClassId, SessionDate)
);

/* ---------- 9. Tiến độ học tập do Trợ lý ghi nhận ---------- */
CREATE TABLE dbo.ProgressRecords (
    ProgressId  INT IDENTITY(1,1) CONSTRAINT PK_Progress PRIMARY KEY,
    StudentId   INT  NOT NULL CONSTRAINT FK_Pg_Student REFERENCES dbo.Students(StudentId),
    ClassId     INT  NOT NULL CONSTRAINT FK_Pg_Class   REFERENCES dbo.Classes(ClassId),
    SessionDate DATE NOT NULL,
    EvalDate    DATE NOT NULL,
    Status      NVARCHAR(20) NOT NULL CONSTRAINT CK_Pg_Status CHECK (Status IN (N'Đúng tiến độ', N'Chậm tiến độ')),
    TeacherId   INT NULL CONSTRAINT FK_Pg_Teacher REFERENCES dbo.Users(UserId),
    RecordedBy  INT NULL CONSTRAINT FK_Pg_By REFERENCES dbo.Users(UserId),
    RecordedAt  DATETIME2(0) NOT NULL CONSTRAINT DF_Pg_At DEFAULT SYSDATETIME(),
    CONSTRAINT UQ_Progress_Session UNIQUE (StudentId, ClassId, SessionDate)
);

/* ---------- 10. Thông báo, nhắc nhở, nhật ký thay đổi ---------- */
CREATE TABLE dbo.Notifications (
    NotificationId INT IDENTITY(1,1) CONSTRAINT PK_Notifications PRIMARY KEY,
    UserId    INT NOT NULL CONSTRAINT FK_Nt_User REFERENCES dbo.Users(UserId),
    Title     NVARCHAR(200) NOT NULL,
    Body      NVARCHAR(1000) NOT NULL,
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Nt_At DEFAULT SYSDATETIME(),
    IsRead    BIT NOT NULL CONSTRAINT DF_Nt_Read DEFAULT 0
);
CREATE INDEX IX_Nt_User ON dbo.Notifications(UserId, IsRead, CreatedAt DESC);

CREATE TABLE dbo.Reminders (
    ClassId     INT  NOT NULL CONSTRAINT FK_Rm_Class REFERENCES dbo.Classes(ClassId),
    SessionDate DATE NOT NULL,
    Status      NVARCHAR(30) NOT NULL CONSTRAINT DF_Rm_Status DEFAULT N'Đã gửi nhắc nhở',
    SentAt      DATETIME2(0) NOT NULL CONSTRAINT DF_Rm_At DEFAULT SYSDATETIME(),
    SentBy      INT NULL CONSTRAINT FK_Rm_By REFERENCES dbo.Users(UserId),
    CONSTRAINT PK_Reminders PRIMARY KEY (ClassId, SessionDate)
);

CREATE TABLE dbo.AuditLog (
    LogId     BIGINT IDENTITY(1,1) CONSTRAINT PK_AuditLog PRIMARY KEY,
    Entity    VARCHAR(30)  NOT NULL,             -- student | trial | absence | tuition
    EntityKey VARCHAR(60)  NOT NULL,
    ChangedBy NVARCHAR(50) NULL,
    ChangedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Log_At DEFAULT SYSDATETIME(),
    OldValue  NVARCHAR(500) NULL,
    NewValue  NVARCHAR(500) NULL,
    Note      NVARCHAR(500) NULL
);
CREATE INDEX IX_Log_Entity ON dbo.AuditLog(Entity, EntityKey, ChangedAt DESC);
GO
PRINT N'Đã tạo xong database NgoiNhaNho. Chạy tiếp 02_seed.sql để nạp dữ liệu mẫu.';
