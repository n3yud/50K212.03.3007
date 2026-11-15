/* =====================================================================
   LỚP VẼ NGÔI NHÀ NHỎ – SCHEMA PostgreSQL
   Tương thích: PostgreSQL 14+, Neon.tech, Supabase, Render
   Chạy trong psql hoặc bảng điều khiển SQL của Neon/Supabase.
   Script có thể chạy lại nhiều lần (DROP + CREATE).
   ===================================================================== */

-- Xóa và tạo lại (chỉ dùng môi trường phát triển / seed ban đầu)
DROP TABLE IF EXISTS "AuditLog"      CASCADE;
DROP TABLE IF EXISTS "Reminders"     CASCADE;
DROP TABLE IF EXISTS "Notifications" CASCADE;
DROP TABLE IF EXISTS "ProgressRecords" CASCADE;
DROP TABLE IF EXISTS "Journal"       CASCADE;
DROP TABLE IF EXISTS "Tuition"       CASCADE;
DROP TABLE IF EXISTS "AttendanceRecords" CASCADE;
DROP TABLE IF EXISTS "Attendances"   CASCADE;
DROP TABLE IF EXISTS "Absences"      CASCADE;
DROP TABLE IF EXISTS "StudentClasses" CASCADE;
DROP TABLE IF EXISTS "Students"      CASCADE;
DROP TABLE IF EXISTS "Trials"        CASCADE;
DROP TABLE IF EXISTS "Classes"       CASCADE;
DROP TABLE IF EXISTS "Users"         CASCADE;

-- Hàm tiện ích: thứ trong tuần theo quy ước 0 = Chủ nhật
-- PostgreSQL: EXTRACT(DOW FROM date) trả 0=CN, 1=T2 ... 6=T7 (giống hệt)
-- Không cần hàm riêng, dùng EXTRACT(DOW FROM ...) trực tiếp.

/* ---------- 1. Tài khoản ---------- */
CREATE TABLE "Users" (
    "UserId"             SERIAL       PRIMARY KEY,
    "Username"           VARCHAR(50)  NOT NULL UNIQUE,
    "Email"              VARCHAR(100) NULL,
    "PasswordHash"       VARCHAR(100) NOT NULL,
    "Role"               VARCHAR(20)  NOT NULL CHECK ("Role" IN ('assistant','manager','supervisor','teacher','parent')),
    "FullName"           VARCHAR(100) NOT NULL,
    "Title"              VARCHAR(20)  NULL,
    "Phone"              VARCHAR(10)  NULL,
    "IsLocked"           BOOLEAN      NOT NULL DEFAULT FALSE,
    "FailedAttempts"     INTEGER      NOT NULL DEFAULT 0,
    "LockoutEnd"         TIMESTAMP WITH TIME ZONE NULL,
    "MustChangePassword" BOOLEAN      NOT NULL DEFAULT FALSE,
    "CreatedAt"          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX "UX_Users_Email" ON "Users"("Email") WHERE "Email" IS NOT NULL;
CREATE INDEX "IX_Users_Phone" ON "Users"("Phone");

/* ---------- 2. Lớp học ---------- */
CREATE TABLE "Classes" (
    "ClassId"   SERIAL      PRIMARY KEY,
    "Name"      VARCHAR(100) NOT NULL UNIQUE,
    "Program"   VARCHAR(20)  NOT NULL CHECK ("Program" IN ('Cơ bản', 'Nâng cao')),
    "Weekday"   SMALLINT     NOT NULL,
    "Weekday2"  SMALLINT     NOT NULL,
    "StartTime" TIME         NOT NULL,
    "EndTime"   TIME         NOT NULL,
    "Capacity"  SMALLINT     NOT NULL DEFAULT 7 CHECK ("Capacity" BETWEEN 1 AND 7),
    "TeacherId" INTEGER      NULL REFERENCES "Users"("UserId"),
    "Letter"    CHAR(1)      NOT NULL DEFAULT 'A',
    CONSTRAINT "CK_Classes_Time" CHECK ("EndTime" > "StartTime"),
    CONSTRAINT "CK_Classes_Schedule" CHECK (
        (("Weekday" = 1 AND "Weekday2" = 3) OR ("Weekday" = 2 AND "Weekday2" = 4))
            AND "StartTime" = '17:30' AND "EndTime" = '19:30'
        OR ("Weekday" = 6 AND "Weekday2" = 0) AND (
            ("StartTime" = '07:30' AND "EndTime" = '09:30')
            OR ("StartTime" = '09:40' AND "EndTime" = '11:40')
            OR ("StartTime" = '14:30' AND "EndTime" = '16:30')
            OR ("StartTime" = '17:00' AND "EndTime" = '19:00')
        )
    )
);

/* ---------- 3. Đơn học thử ---------- */
CREATE TABLE "Trials" (
    "TrialId"         SERIAL       PRIMARY KEY,
    "StudentName"     VARCHAR(50)  NOT NULL,
    "DateOfBirth"     DATE         NOT NULL,
    "ParentPhone"     VARCHAR(10)  NOT NULL,
    "WishDays"        VARCHAR(20)  NOT NULL,
    "WishSlot"        VARCHAR(20)  NOT NULL,
    "Program"         VARCHAR(20)  NULL CHECK ("Program" IS NULL OR "Program" IN ('Cơ bản', 'Nâng cao')),
    "Status"          VARCHAR(30)  NOT NULL DEFAULT 'Chờ tiếp nhận'
                      CHECK ("Status" IN ('Chờ tiếp nhận','Đã tiếp nhận','Chờ phụ huynh xác nhận',
                                          'Chờ duyệt ca học thử','Đã xếp ca','Đã hoàn thành','Đã tư vấn')),
    "SessionClassId"  INTEGER      NULL REFERENCES "Classes"("ClassId"),
    "SessionDate"     DATE         NULL,
    "CreatedAt"       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "AssessStroke"    TEXT         NULL,
    "AssessColor"     TEXT         NULL,
    "AssessAbsorb"    TEXT         NULL,
    "AssessedBy"      INTEGER      NULL REFERENCES "Users"("UserId"),
    "AssessedAt"      TIMESTAMP WITH TIME ZONE NULL,
    "ConsultRoadmap"  TEXT         NULL,
    "ConsultDecision" VARCHAR(30)  NULL CHECK ("ConsultDecision" IS NULL
                                   OR "ConsultDecision" IN ('Đăng ký chính thức','Chưa quyết định','Không đăng ký')),
    "ConsultNote"     TEXT         NULL,
    "ConsultBy"       INTEGER      NULL REFERENCES "Users"("UserId"),
    "ConsultAt"       TIMESTAMP WITH TIME ZONE NULL,
    CONSTRAINT "CK_Trials_Session" CHECK (
        ("SessionClassId" IS NULL AND "SessionDate" IS NULL)
        OR ("SessionClassId" IS NOT NULL AND "SessionDate" IS NOT NULL)
    )
);
CREATE INDEX "IX_Trials_Status"  ON "Trials"("Status");
CREATE INDEX "IX_Trials_Parent"  ON "Trials"("ParentPhone");
CREATE INDEX "IX_Trials_Session" ON "Trials"("SessionClassId", "SessionDate");

/* ---------- 4. Hồ sơ học viên ---------- */
CREATE TABLE "Students" (
    "StudentId"   SERIAL      PRIMARY KEY,
    "Code"        VARCHAR(10) NOT NULL UNIQUE,
    "FullName"    VARCHAR(50) NOT NULL,
    "DateOfBirth" DATE        NOT NULL,
    "Gender"      VARCHAR(10) NOT NULL CHECK ("Gender" IN ('Nam','Nữ')),
    "ParentName"  VARCHAR(100) NOT NULL,
    "ParentPhone" VARCHAR(10) NOT NULL,
    "Program"     VARCHAR(20) NOT NULL CHECK ("Program" IN ('Cơ bản','Nâng cao')),
    "Status"      VARCHAR(20) NOT NULL DEFAULT 'Chờ xếp lớp'
                  CHECK ("Status" IN ('Chờ xếp lớp','Đang học','Đã bảo lưu')),
    "TrialId"     INTEGER     NULL REFERENCES "Trials"("TrialId"),
    "CreatedAt"   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT "UQ_Students_Identity" UNIQUE ("FullName", "DateOfBirth", "ParentPhone")
);
CREATE INDEX "IX_Students_ParentPhone" ON "Students"("ParentPhone");
CREATE INDEX "IX_Students_Status"      ON "Students"("Status");

/* ---------- StudentClasses ---------- */
CREATE TABLE "StudentClasses" (
    "StudentId" INTEGER NOT NULL REFERENCES "Students"("StudentId"),
    "ClassId"   INTEGER NOT NULL REFERENCES "Classes"("ClassId"),
    "IsActive"  BOOLEAN NOT NULL DEFAULT TRUE,
    "JoinedAt"  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY ("StudentId", "ClassId")
);
CREATE INDEX "IX_SC_Class" ON "StudentClasses"("ClassId") WHERE "IsActive" = TRUE;

/* ---------- 5. Nghỉ học & học bù ---------- */
CREATE TABLE "Absences" (
    "AbsenceId"     SERIAL      PRIMARY KEY,
    "StudentId"     INTEGER     NOT NULL REFERENCES "Students"("StudentId"),
    "ClassId"       INTEGER     NOT NULL REFERENCES "Classes"("ClassId"),
    "SessionDate"   DATE        NOT NULL,
    "Reason"        TEXT        NULL,
    "Status"        VARCHAR(30) NOT NULL DEFAULT 'Chờ xếp lịch bù'
                    CHECK ("Status" IN ('Chờ xếp lịch bù','Đã đăng ký học bù','Chờ duyệt','Đã xếp lịch bù','Hết hạn')),
    "Deadline"      DATE        NOT NULL,
    "MakeupClassId" INTEGER     NULL REFERENCES "Classes"("ClassId"),
    "MakeupDate"    DATE        NULL,
    "CreatedAt"     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "CreatedBy"     INTEGER     NULL REFERENCES "Users"("UserId"),
    CONSTRAINT "UQ_Absences_Session" UNIQUE ("StudentId", "ClassId", "SessionDate"),
    CONSTRAINT "CK_Abs_Makeup" CHECK (
        ("MakeupClassId" IS NULL AND "MakeupDate" IS NULL)
        OR ("MakeupClassId" IS NOT NULL AND "MakeupDate" IS NOT NULL)
    )
);
CREATE INDEX "IX_Abs_Status" ON "Absences"("Status");
CREATE INDEX "IX_Abs_Makeup" ON "Absences"("MakeupClassId", "MakeupDate") WHERE "MakeupClassId" IS NOT NULL;

/* ---------- 6. Điểm danh ---------- */
CREATE TABLE "Attendances" (
    "AttendanceId" SERIAL  PRIMARY KEY,
    "ClassId"      INTEGER NOT NULL REFERENCES "Classes"("ClassId"),
    "SessionDate"  DATE    NOT NULL,
    "FinalizedAt"  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "FinalizedBy"  INTEGER NULL REFERENCES "Users"("UserId"),
    CONSTRAINT "UQ_Attendances_Session" UNIQUE ("ClassId", "SessionDate")
);
CREATE TABLE "AttendanceRecords" (
    "AttendanceId" INTEGER     NOT NULL REFERENCES "Attendances"("AttendanceId") ON DELETE CASCADE,
    "PersonType"   VARCHAR(10) NOT NULL CHECK ("PersonType" IN ('Student','Trial')),
    "PersonId"     INTEGER     NOT NULL,
    "Status"       VARCHAR(10) NOT NULL CHECK ("Status" IN ('present','absent')),
    PRIMARY KEY ("AttendanceId", "PersonType", "PersonId")
);

/* ---------- 7. Học phí ---------- */
CREATE TABLE "Tuition" (
    "StudentId"     INTEGER          NOT NULL REFERENCES "Students"("StudentId"),
    "Month"         CHAR(7)          NOT NULL CHECK ("Month" ~ '^\d{4}-\d{2}$'),
    "Amount"        NUMERIC(12,0)    NOT NULL,
    "TotalSessions" INTEGER          NOT NULL DEFAULT 0,
    "Status"        VARCHAR(20)      NOT NULL DEFAULT 'Chưa thanh toán'
                    CHECK ("Status" IN ('Đã thanh toán','Chưa thanh toán')),
    "PaidAt"        TIMESTAMP WITH TIME ZONE NULL,
    "RecordedBy"    INTEGER          NULL REFERENCES "Users"("UserId"),
    PRIMARY KEY ("StudentId", "Month")
);

/* ---------- 8. Nhật ký học tập ---------- */
CREATE TABLE "Journal" (
    "JournalId"      SERIAL   PRIMARY KEY,
    "StudentId"      INTEGER  NOT NULL REFERENCES "Students"("StudentId"),
    "ClassId"        INTEGER  NOT NULL REFERENCES "Classes"("ClassId"),
    "SessionDate"    DATE     NOT NULL,
    "TeacherId"      INTEGER  NULL REFERENCES "Users"("UserId"),
    "PhotoPath"      TEXT     NULL,
    "PhotoAt"        TIMESTAMP WITH TIME ZONE NULL,
    "StrokeComment"  TEXT     NULL,
    "ColorComment"   TEXT     NULL,
    "AbsorbComment"  TEXT     NULL,
    "CommentAt"      TIMESTAMP WITH TIME ZONE NULL,
    CONSTRAINT "UQ_Journal_Session" UNIQUE ("StudentId", "ClassId", "SessionDate")
);

/* ---------- 9. Tiến độ học tập ---------- */
CREATE TABLE "ProgressRecords" (
    "ProgressId"  SERIAL      PRIMARY KEY,
    "StudentId"   INTEGER     NOT NULL REFERENCES "Students"("StudentId"),
    "ClassId"     INTEGER     NOT NULL REFERENCES "Classes"("ClassId"),
    "SessionDate" DATE        NOT NULL,
    "EvalDate"    DATE        NOT NULL,
    "Status"      VARCHAR(20) NOT NULL CHECK ("Status" IN ('Đúng tiến độ','Chậm tiến độ')),
    "TeacherId"   INTEGER     NULL REFERENCES "Users"("UserId"),
    "RecordedBy"  INTEGER     NULL REFERENCES "Users"("UserId"),
    "RecordedAt"  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT "UQ_Progress_Session" UNIQUE ("StudentId", "ClassId", "SessionDate")
);

/* ---------- 10. Thông báo, nhắc nhở, audit log ---------- */
CREATE TABLE "Notifications" (
    "NotificationId" SERIAL   PRIMARY KEY,
    "UserId"         INTEGER  NOT NULL REFERENCES "Users"("UserId"),
    "Title"          TEXT     NOT NULL,
    "Body"           TEXT     NOT NULL,
    "CreatedAt"      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "IsRead"         BOOLEAN  NOT NULL DEFAULT FALSE
);
CREATE INDEX "IX_Nt_User" ON "Notifications"("UserId", "IsRead", "CreatedAt" DESC);

CREATE TABLE "Reminders" (
    "ClassId"     INTEGER     NOT NULL REFERENCES "Classes"("ClassId"),
    "SessionDate" DATE        NOT NULL,
    "Status"      VARCHAR(30) NOT NULL DEFAULT 'Đã gửi nhắc nhở',
    "SentAt"      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "SentBy"      INTEGER     NULL REFERENCES "Users"("UserId"),
    PRIMARY KEY ("ClassId", "SessionDate")
);

CREATE TABLE "AuditLog" (
    "LogId"      BIGSERIAL    PRIMARY KEY,
    "Entity"     VARCHAR(30)  NOT NULL,
    "EntityKey"  VARCHAR(60)  NOT NULL,
    "ChangedBy"  VARCHAR(50)  NULL,
    "ChangedAt"  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "OldValue"   TEXT         NULL,
    "NewValue"   TEXT         NULL,
    "Note"       TEXT         NULL
);
CREATE INDEX "IX_Log_Entity" ON "AuditLog"("Entity", "EntityKey", "ChangedAt" DESC);

-- Xong! Tiếp theo chạy 02_seed_postgres.sql để nạp dữ liệu mẫu.
