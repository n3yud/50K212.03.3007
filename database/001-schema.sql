IF OBJECT_ID(N'[__EFMigrationsHistory]') IS NULL
BEGIN
    CREATE TABLE [__EFMigrationsHistory] (
        [MigrationId] nvarchar(150) NOT NULL,
        [ProductVersion] nvarchar(32) NOT NULL,
        CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY ([MigrationId])
    );
END;
GO

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111133859_InitialSchema'
)
BEGIN
    CREATE TABLE [Branches] (
        [Id] uniqueidentifier NOT NULL,
        [Name] nvarchar(100) NOT NULL,
        [Address] nvarchar(300) NOT NULL,
        CONSTRAINT [PK_Branches] PRIMARY KEY ([Id])
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111133859_InitialSchema'
)
BEGIN
    CREATE TABLE [Users] (
        [Id] uniqueidentifier NOT NULL,
        [Login] nvarchar(100) NOT NULL,
        [Email] nvarchar(200) NULL,
        [Name] nvarchar(100) NOT NULL,
        [Role] nvarchar(30) NOT NULL,
        [PasswordHash] nvarchar(300) NOT NULL,
        [MustChangePassword] bit NOT NULL,
        [Locked] bit NOT NULL,
        [SessionVersion] int NOT NULL,
        [BranchId] uniqueidentifier NOT NULL,
        CONSTRAINT [PK_Users] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_User_Role] CHECK ([Role] IN (N'Phụ huynh',N'Trợ lý',N'Quản lý',N'Giáo viên',N'Giám sát')),
        CONSTRAINT [FK_Users_Branches_BranchId] FOREIGN KEY ([BranchId]) REFERENCES [Branches] ([Id]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111133859_InitialSchema'
)
BEGIN
    CREATE TABLE [Audit] (
        [Id] uniqueidentifier NOT NULL,
        [ActorId] uniqueidentifier NULL,
        [Entity] nvarchar(100) NOT NULL,
        [EntityId] uniqueidentifier NOT NULL,
        [Before] nvarchar(max) NOT NULL,
        [After] nvarchar(max) NOT NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        CONSTRAINT [PK_Audit] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Audit_Users_ActorId] FOREIGN KEY ([ActorId]) REFERENCES [Users] ([Id]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111133859_InitialSchema'
)
BEGIN
    CREATE TABLE [Classes] (
        [Id] uniqueidentifier NOT NULL,
        [BranchId] uniqueidentifier NOT NULL,
        [Name] nvarchar(100) NOT NULL,
        [Program] nvarchar(20) NOT NULL,
        [Weekday] int NOT NULL,
        [Start] time NOT NULL,
        [End] time NOT NULL,
        [Capacity] int NOT NULL,
        [TeacherId] uniqueidentifier NULL,
        CONSTRAINT [PK_Classes] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_Class_Capacity] CHECK ([Capacity] BETWEEN 1 AND 7 AND [Weekday] BETWEEN 0 AND 6 AND [Weekday] <> 5 AND [End] > [Start]),
        CONSTRAINT [FK_Classes_Branches_BranchId] FOREIGN KEY ([BranchId]) REFERENCES [Branches] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_Classes_Users_TeacherId] FOREIGN KEY ([TeacherId]) REFERENCES [Users] ([Id]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111133859_InitialSchema'
)
BEGIN
    CREATE TABLE [Notifications] (
        [Id] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [Title] nvarchar(200) NOT NULL,
        [Content] nvarchar(max) NOT NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        CONSTRAINT [PK_Notifications] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Notifications_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111133859_InitialSchema'
)
BEGIN
    CREATE TABLE [Sessions] (
        [Id] uniqueidentifier NOT NULL,
        [ClassId] uniqueidentifier NOT NULL,
        [TeacherId] uniqueidentifier NOT NULL,
        [Date] date NOT NULL,
        [Closed] bit NOT NULL,
        CONSTRAINT [PK_Sessions] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Sessions_Classes_ClassId] FOREIGN KEY ([ClassId]) REFERENCES [Classes] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_Sessions_Users_TeacherId] FOREIGN KEY ([TeacherId]) REFERENCES [Users] ([Id]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111133859_InitialSchema'
)
BEGIN
    CREATE TABLE [Trials] (
        [Id] uniqueidentifier NOT NULL,
        [ParentId] uniqueidentifier NOT NULL,
        [BranchId] uniqueidentifier NOT NULL,
        [StudentName] nvarchar(50) NOT NULL,
        [BirthDate] date NOT NULL,
        [DesiredTime] nvarchar(500) NOT NULL,
        [Program] nvarchar(20) NOT NULL,
        [Status] nvarchar(40) NOT NULL,
        [SessionId] uniqueidentifier NULL,
        [Lines] nvarchar(max) NULL,
        [Colors] nvarchar(max) NULL,
        [Learning] nvarchar(max) NULL,
        [Roadmap] nvarchar(max) NULL,
        [Decision] nvarchar(40) NULL,
        [InternalNote] nvarchar(max) NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        CONSTRAINT [PK_Trials] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_Trial_Status] CHECK ([Status] IN (N'Chờ tiếp nhận',N'Đã tiếp nhận',N'Chờ xếp ca học thử',N'Chờ phụ huynh xác nhận',N'Chờ duyệt ca học thử',N'Đã xếp ca',N'Đã hoàn thành',N'Đã tư vấn')),
        CONSTRAINT [FK_Trials_Branches_BranchId] FOREIGN KEY ([BranchId]) REFERENCES [Branches] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_Trials_Sessions_SessionId] FOREIGN KEY ([SessionId]) REFERENCES [Sessions] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_Trials_Users_ParentId] FOREIGN KEY ([ParentId]) REFERENCES [Users] ([Id]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111133859_InitialSchema'
)
BEGIN
    CREATE TABLE [Students] (
        [Id] uniqueidentifier NOT NULL,
        [Code] nvarchar(30) NOT NULL,
        [Name] nvarchar(50) NOT NULL,
        [BirthDate] date NOT NULL,
        [Gender] nvarchar(20) NOT NULL,
        [ParentName] nvarchar(100) NOT NULL,
        [ParentId] uniqueidentifier NOT NULL,
        [BranchId] uniqueidentifier NOT NULL,
        [Program] nvarchar(20) NOT NULL,
        [Status] nvarchar(30) NOT NULL,
        [TrialId] uniqueidentifier NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        CONSTRAINT [PK_Students] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_Student_Program] CHECK ([Program] IN (N'Cơ bản',N'Nâng cao')),
        CONSTRAINT [CK_Student_Status] CHECK ([Status] IN (N'Chờ xếp lớp',N'Đang học',N'Đã bảo lưu')),
        CONSTRAINT [FK_Students_Branches_BranchId] FOREIGN KEY ([BranchId]) REFERENCES [Branches] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_Students_Trials_TrialId] FOREIGN KEY ([TrialId]) REFERENCES [Trials] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_Students_Users_ParentId] FOREIGN KEY ([ParentId]) REFERENCES [Users] ([Id]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111133859_InitialSchema'
)
BEGIN
    CREATE TABLE [TrialAttendances] (
        [Id] uniqueidentifier NOT NULL,
        [SessionId] uniqueidentifier NOT NULL,
        [TrialId] uniqueidentifier NOT NULL,
        [Present] bit NOT NULL,
        CONSTRAINT [PK_TrialAttendances] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_TrialAttendances_Sessions_SessionId] FOREIGN KEY ([SessionId]) REFERENCES [Sessions] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_TrialAttendances_Trials_TrialId] FOREIGN KEY ([TrialId]) REFERENCES [Trials] ([Id]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111133859_InitialSchema'
)
BEGIN
    CREATE TABLE [Artworks] (
        [Id] uniqueidentifier NOT NULL,
        [StudentId] uniqueidentifier NOT NULL,
        [SessionId] uniqueidentifier NOT NULL,
        [FileName] nvarchar(100) NOT NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        CONSTRAINT [PK_Artworks] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Artworks_Sessions_SessionId] FOREIGN KEY ([SessionId]) REFERENCES [Sessions] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_Artworks_Students_StudentId] FOREIGN KEY ([StudentId]) REFERENCES [Students] ([Id]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111133859_InitialSchema'
)
BEGIN
    CREATE TABLE [Attendances] (
        [Id] uniqueidentifier NOT NULL,
        [SessionId] uniqueidentifier NOT NULL,
        [StudentId] uniqueidentifier NOT NULL,
        [Present] bit NOT NULL,
        CONSTRAINT [PK_Attendances] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Attendances_Sessions_SessionId] FOREIGN KEY ([SessionId]) REFERENCES [Sessions] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_Attendances_Students_StudentId] FOREIGN KEY ([StudentId]) REFERENCES [Students] ([Id]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111133859_InitialSchema'
)
BEGIN
    CREATE TABLE [Enrollments] (
        [Id] uniqueidentifier NOT NULL,
        [StudentId] uniqueidentifier NOT NULL,
        [ClassId] uniqueidentifier NOT NULL,
        [From] date NOT NULL,
        [Until] date NULL,
        CONSTRAINT [PK_Enrollments] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Enrollments_Classes_ClassId] FOREIGN KEY ([ClassId]) REFERENCES [Classes] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_Enrollments_Students_StudentId] FOREIGN KEY ([StudentId]) REFERENCES [Students] ([Id]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111133859_InitialSchema'
)
BEGIN
    CREATE TABLE [Leaves] (
        [Id] uniqueidentifier NOT NULL,
        [StudentId] uniqueidentifier NOT NULL,
        [SessionId] uniqueidentifier NOT NULL,
        [MakeUpSessionId] uniqueidentifier NULL,
        [Reason] nvarchar(1000) NULL,
        [Deadline] date NOT NULL,
        [Status] nvarchar(40) NOT NULL,
        [CreatedBy] uniqueidentifier NOT NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        CONSTRAINT [PK_Leaves] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_Leave_Status] CHECK ([Status] IN (N'Chờ xếp lịch bù',N'Đã đăng ký học bù',N'Chờ duyệt',N'Đã xếp lịch bù',N'Hết hạn')),
        CONSTRAINT [FK_Leaves_Sessions_MakeUpSessionId] FOREIGN KEY ([MakeUpSessionId]) REFERENCES [Sessions] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_Leaves_Sessions_SessionId] FOREIGN KEY ([SessionId]) REFERENCES [Sessions] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_Leaves_Students_StudentId] FOREIGN KEY ([StudentId]) REFERENCES [Students] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_Leaves_Users_CreatedBy] FOREIGN KEY ([CreatedBy]) REFERENCES [Users] ([Id]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111133859_InitialSchema'
)
BEGIN
    CREATE TABLE [Progress] (
        [Id] uniqueidentifier NOT NULL,
        [SessionId] uniqueidentifier NOT NULL,
        [StudentId] uniqueidentifier NOT NULL,
        [EvaluationDate] date NOT NULL,
        [Status] nvarchar(30) NOT NULL,
        [Note] nvarchar(max) NOT NULL,
        [RecordedBy] uniqueidentifier NOT NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        CONSTRAINT [PK_Progress] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_Progress_Status] CHECK ([Status] IN (N'Đúng tiến độ',N'Chậm tiến độ')),
        CONSTRAINT [FK_Progress_Sessions_SessionId] FOREIGN KEY ([SessionId]) REFERENCES [Sessions] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_Progress_Students_StudentId] FOREIGN KEY ([StudentId]) REFERENCES [Students] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_Progress_Users_RecordedBy] FOREIGN KEY ([RecordedBy]) REFERENCES [Users] ([Id]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111133859_InitialSchema'
)
BEGIN
    CREATE TABLE [Reviews] (
        [Id] uniqueidentifier NOT NULL,
        [SessionId] uniqueidentifier NOT NULL,
        [StudentId] uniqueidentifier NOT NULL,
        [Lines] nvarchar(max) NOT NULL,
        [Colors] nvarchar(max) NOT NULL,
        [Learning] nvarchar(max) NOT NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        CONSTRAINT [PK_Reviews] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Reviews_Sessions_SessionId] FOREIGN KEY ([SessionId]) REFERENCES [Sessions] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_Reviews_Students_StudentId] FOREIGN KEY ([StudentId]) REFERENCES [Students] ([Id]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111133859_InitialSchema'
)
BEGIN
    CREATE TABLE [Tuitions] (
        [Id] uniqueidentifier NOT NULL,
        [StudentId] uniqueidentifier NOT NULL,
        [Month] nvarchar(7) NOT NULL,
        [Amount] decimal(18,0) NULL,
        [Paid] bit NOT NULL,
        [Lessons] int NOT NULL,
        [Remaining] int NOT NULL,
        [RecordedBy] uniqueidentifier NULL,
        [RecordedAt] datetimeoffset NULL,
        CONSTRAINT [PK_Tuitions] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_Tuition_Remaining] CHECK ([Remaining] >= 0 AND [Remaining] <= [Lessons] AND [Amount] >= 0),
        CONSTRAINT [FK_Tuitions_Students_StudentId] FOREIGN KEY ([StudentId]) REFERENCES [Students] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_Tuitions_Users_RecordedBy] FOREIGN KEY ([RecordedBy]) REFERENCES [Users] ([Id]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111133859_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_Artworks_SessionId] ON [Artworks] ([SessionId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111133859_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_Artworks_StudentId] ON [Artworks] ([StudentId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111133859_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_Attendances_SessionId] ON [Attendances] ([SessionId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111133859_InitialSchema'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Attendances_StudentId_SessionId] ON [Attendances] ([StudentId], [SessionId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111133859_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_Audit_ActorId] ON [Audit] ([ActorId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111133859_InitialSchema'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Classes_BranchId_Name] ON [Classes] ([BranchId], [Name]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111133859_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_Classes_TeacherId] ON [Classes] ([TeacherId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111133859_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_Enrollments_ClassId] ON [Enrollments] ([ClassId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111133859_InitialSchema'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_Enrollments_StudentId_ClassId] ON [Enrollments] ([StudentId], [ClassId]) WHERE [Until] IS NULL');
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111133859_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_Leaves_CreatedBy] ON [Leaves] ([CreatedBy]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111133859_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_Leaves_MakeUpSessionId] ON [Leaves] ([MakeUpSessionId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111133859_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_Leaves_SessionId] ON [Leaves] ([SessionId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111133859_InitialSchema'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Leaves_StudentId_SessionId] ON [Leaves] ([StudentId], [SessionId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111133859_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_Notifications_UserId] ON [Notifications] ([UserId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111133859_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_Progress_RecordedBy] ON [Progress] ([RecordedBy]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111133859_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_Progress_SessionId] ON [Progress] ([SessionId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111133859_InitialSchema'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Progress_StudentId_SessionId] ON [Progress] ([StudentId], [SessionId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111133859_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_Reviews_SessionId] ON [Reviews] ([SessionId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111133859_InitialSchema'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Reviews_StudentId_SessionId] ON [Reviews] ([StudentId], [SessionId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111133859_InitialSchema'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Sessions_ClassId_Date] ON [Sessions] ([ClassId], [Date]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111133859_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_Sessions_TeacherId] ON [Sessions] ([TeacherId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111133859_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_Students_BranchId] ON [Students] ([BranchId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111133859_InitialSchema'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Students_Code] ON [Students] ([Code]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111133859_InitialSchema'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Students_ParentId_Name_BirthDate] ON [Students] ([ParentId], [Name], [BirthDate]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111133859_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_Students_TrialId] ON [Students] ([TrialId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111133859_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_TrialAttendances_SessionId] ON [TrialAttendances] ([SessionId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111133859_InitialSchema'
)
BEGIN
    CREATE UNIQUE INDEX [IX_TrialAttendances_TrialId_SessionId] ON [TrialAttendances] ([TrialId], [SessionId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111133859_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_Trials_BranchId] ON [Trials] ([BranchId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111133859_InitialSchema'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_Trials_ParentId_StudentName_BirthDate] ON [Trials] ([ParentId], [StudentName], [BirthDate]) WHERE [Status] <> N''Đã tư vấn''');
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111133859_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_Trials_SessionId] ON [Trials] ([SessionId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111133859_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_Tuitions_RecordedBy] ON [Tuitions] ([RecordedBy]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111133859_InitialSchema'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Tuitions_StudentId_Month] ON [Tuitions] ([StudentId], [Month]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111133859_InitialSchema'
)
BEGIN
    CREATE INDEX [IX_Users_BranchId] ON [Users] ([BranchId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111133859_InitialSchema'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_Users_Email] ON [Users] ([Email]) WHERE [Email] IS NOT NULL');
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111133859_InitialSchema'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Users_Login] ON [Users] ([Login]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111133859_InitialSchema'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261111133859_InitialSchema', N'8.0.11');
END;
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111135721_PreserveScheduleHistory'
)
BEGIN
    ALTER TABLE [Sessions] ADD [Cancelled] bit NOT NULL DEFAULT CAST(0 AS bit);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111135721_PreserveScheduleHistory'
)
BEGIN
    ALTER TABLE [Sessions] ADD [End] time NOT NULL DEFAULT '00:00:00';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111135721_PreserveScheduleHistory'
)
BEGIN
    ALTER TABLE [Sessions] ADD [Program] nvarchar(20) NOT NULL DEFAULT N'';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111135721_PreserveScheduleHistory'
)
BEGIN
    ALTER TABLE [Sessions] ADD [Start] time NOT NULL DEFAULT '00:00:00';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111135721_PreserveScheduleHistory'
)
BEGIN
    CREATE TABLE [ClassSchedules] (
        [Id] uniqueidentifier NOT NULL,
        [ClassId] uniqueidentifier NOT NULL,
        [EffectiveFrom] date NOT NULL,
        [Weekday] int NOT NULL,
        [Start] time NOT NULL,
        [End] time NOT NULL,
        CONSTRAINT [PK_ClassSchedules] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_Schedule_Times] CHECK ([Weekday] BETWEEN 0 AND 6 AND [Weekday] <> 5 AND [End] > [Start]),
        CONSTRAINT [FK_ClassSchedules_Classes_ClassId] FOREIGN KEY ([ClassId]) REFERENCES [Classes] ([Id]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111135721_PreserveScheduleHistory'
)
BEGIN
    CREATE UNIQUE INDEX [IX_ClassSchedules_ClassId_EffectiveFrom] ON [ClassSchedules] ([ClassId], [EffectiveFrom]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111135721_PreserveScheduleHistory'
)
BEGIN
    UPDATE s SET s.[Start]=c.[Start], s.[End]=c.[End], s.[Program]=c.[Program] FROM [Sessions] s INNER JOIN [Classes] c ON c.[Id]=s.[ClassId];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111135721_PreserveScheduleHistory'
)
BEGIN
    INSERT INTO [ClassSchedules] ([Id],[ClassId],[EffectiveFrom],[Weekday],[Start],[End]) SELECT NEWID(),[Id],CONVERT(date,'00010101',112),[Weekday],[Start],[End] FROM [Classes];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111135721_PreserveScheduleHistory'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261111135721_PreserveScheduleHistory', N'8.0.11');
END;
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111142006_SnapshotScheduleProgram'
)
BEGIN
    ALTER TABLE [ClassSchedules] ADD [Program] nvarchar(20) NOT NULL DEFAULT N'';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111142006_SnapshotScheduleProgram'
)
BEGIN
    UPDATE v SET v.[Program]=c.[Program] FROM [ClassSchedules] v INNER JOIN [Classes] c ON c.[Id]=v.[ClassId];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111142006_SnapshotScheduleProgram'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261111142006_SnapshotScheduleProgram', N'8.0.11');
END;
GO

COMMIT;
GO

