using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace NgoiNhaNho;

public class AppDb(DbContextOptions<AppDb> options) : DbContext(options)
{
    public DbSet<Branch> Branches => Set<Branch>();
    public DbSet<UserAccount> Users => Set<UserAccount>();
    public DbSet<Student> Students => Set<Student>();
    public DbSet<Trial> Trials => Set<Trial>();
    public DbSet<ArtClass> Classes => Set<ArtClass>();
    public DbSet<ClassSession> Sessions => Set<ClassSession>();
    public DbSet<ClassScheduleVersion> ClassSchedules => Set<ClassScheduleVersion>();
    public DbSet<Enrollment> Enrollments => Set<Enrollment>();
    public DbSet<Tuition> Tuitions => Set<Tuition>();
    public DbSet<LeaveRequest> Leaves => Set<LeaveRequest>();
    public DbSet<Attendance> Attendances => Set<Attendance>();
    public DbSet<TrialAttendance> TrialAttendances => Set<TrialAttendance>();
    public DbSet<Review> Reviews => Set<Review>();
    public DbSet<ProgressRecord> Progress => Set<ProgressRecord>();
    public DbSet<Artwork> Artworks => Set<Artwork>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<AuditEntry> Audit => Set<AuditEntry>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<UserAccount>().HasIndex(x => x.Login).IsUnique();
        b.Entity<UserAccount>().HasIndex(x => x.Email).IsUnique().HasFilter("[Email] IS NOT NULL");
        b.Entity<Student>().HasIndex(x => x.Code).IsUnique();
        b.Entity<Student>().HasIndex(x => new { x.ParentId, x.Name, x.BirthDate }).IsUnique();
        b.Entity<Trial>().HasIndex(x => new { x.ParentId, x.StudentName, x.BirthDate }).IsUnique().HasFilter("[Status] <> N'Đã tư vấn'");
        b.Entity<ArtClass>().HasIndex(x => new { x.BranchId, x.Name }).IsUnique();
        b.Entity<ClassSession>().HasIndex(x => new { x.ClassId, x.Date }).IsUnique();
        b.Entity<ClassScheduleVersion>().HasIndex(x => new { x.ClassId, x.EffectiveFrom }).IsUnique();
        b.Entity<ClassScheduleVersion>().HasOne<ArtClass>().WithMany().HasForeignKey(x => x.ClassId);
        b.Entity<ClassScheduleVersion>().ToTable(t => t.HasCheckConstraint("CK_Schedule_Times", "[Weekday] BETWEEN 0 AND 6 AND [Weekday] <> 5 AND [End] > [Start]"));
        b.Entity<Tuition>().HasIndex(x => new { x.StudentId, x.Month }).IsUnique();
        b.Entity<Tuition>().Property(x => x.Amount).HasPrecision(18, 0);
        b.Entity<LeaveRequest>().HasIndex(x => new { x.StudentId, x.SessionId }).IsUnique();
        b.Entity<Attendance>().HasIndex(x => new { x.StudentId, x.SessionId }).IsUnique();
        b.Entity<TrialAttendance>().HasIndex(x => new { x.TrialId, x.SessionId }).IsUnique();
        b.Entity<Review>().HasIndex(x => new { x.StudentId, x.SessionId }).IsUnique();
        b.Entity<ProgressRecord>().HasIndex(x => new { x.StudentId, x.SessionId }).IsUnique();
        b.Entity<Enrollment>().HasIndex(x => new { x.StudentId, x.ClassId }).IsUnique().HasFilter("[Until] IS NULL");
        b.Entity<ArtClass>().ToTable(t => t.HasCheckConstraint("CK_Class_Capacity", "[Capacity] BETWEEN 1 AND 7 AND [Weekday] BETWEEN 0 AND 6 AND [Weekday] <> 5 AND [End] > [Start]"));
        b.Entity<Tuition>().ToTable(t => t.HasCheckConstraint("CK_Tuition_Remaining", "[Remaining] >= 0 AND [Remaining] <= [Lessons] AND [Amount] >= 0"));
        b.Entity<UserAccount>().ToTable(t => t.HasCheckConstraint("CK_User_Role", "[Role] IN (N'Phụ huynh',N'Trợ lý',N'Quản lý',N'Giáo viên',N'Giám sát')"));
        b.Entity<Student>().ToTable(t => t.HasCheckConstraint("CK_Student_Status", "[Status] IN (N'Chờ xếp lớp',N'Đang học',N'Đã bảo lưu')"));
        b.Entity<Student>().ToTable(t => t.HasCheckConstraint("CK_Student_Program", "[Program] IN (N'Cơ bản',N'Nâng cao')"));
        b.Entity<Trial>().ToTable(t => t.HasCheckConstraint("CK_Trial_Status", "[Status] IN (N'Chờ tiếp nhận',N'Đã tiếp nhận',N'Chờ xếp ca học thử',N'Chờ phụ huynh xác nhận',N'Chờ duyệt ca học thử',N'Đã xếp ca',N'Đã hoàn thành',N'Đã tư vấn')"));
        b.Entity<ProgressRecord>().ToTable(t => t.HasCheckConstraint("CK_Progress_Status", "[Status] IN (N'Đúng tiến độ',N'Chậm tiến độ')"));
        b.Entity<LeaveRequest>().ToTable(t => t.HasCheckConstraint("CK_Leave_Status", "[Status] IN (N'Chờ xếp lịch bù',N'Đã đăng ký học bù',N'Chờ duyệt',N'Đã xếp lịch bù',N'Hết hạn')"));
        b.Entity<UserAccount>().HasOne<Branch>().WithMany().HasForeignKey(x => x.BranchId);
        b.Entity<Student>().HasOne<Branch>().WithMany().HasForeignKey(x => x.BranchId);
        b.Entity<Student>().HasOne<UserAccount>().WithMany().HasForeignKey(x => x.ParentId);
        b.Entity<Student>().HasOne<Trial>().WithMany().HasForeignKey(x => x.TrialId);
        b.Entity<Trial>().HasOne<Branch>().WithMany().HasForeignKey(x => x.BranchId);
        b.Entity<Trial>().HasOne<UserAccount>().WithMany().HasForeignKey(x => x.ParentId);
        b.Entity<Trial>().HasOne<ClassSession>().WithMany().HasForeignKey(x => x.SessionId);
        b.Entity<ArtClass>().HasOne<Branch>().WithMany().HasForeignKey(x => x.BranchId);
        b.Entity<ArtClass>().HasOne<UserAccount>().WithMany().HasForeignKey(x => x.TeacherId);
        b.Entity<ClassSession>().HasOne<ArtClass>().WithMany().HasForeignKey(x => x.ClassId);
        b.Entity<ClassSession>().HasOne<UserAccount>().WithMany().HasForeignKey(x => x.TeacherId);
        b.Entity<Enrollment>().HasOne<Student>().WithMany().HasForeignKey(x => x.StudentId);
        b.Entity<Enrollment>().HasOne<ArtClass>().WithMany().HasForeignKey(x => x.ClassId);
        b.Entity<Tuition>().HasOne<Student>().WithMany().HasForeignKey(x => x.StudentId);
        b.Entity<Tuition>().HasOne<UserAccount>().WithMany().HasForeignKey(x => x.RecordedBy);
        b.Entity<LeaveRequest>().HasOne<Student>().WithMany().HasForeignKey(x => x.StudentId);
        b.Entity<LeaveRequest>().HasOne<ClassSession>().WithMany().HasForeignKey(x => x.SessionId);
        b.Entity<LeaveRequest>().HasOne<ClassSession>().WithMany().HasForeignKey(x => x.MakeUpSessionId);
        b.Entity<LeaveRequest>().HasOne<UserAccount>().WithMany().HasForeignKey(x => x.CreatedBy);
        b.Entity<Attendance>().HasOne<Student>().WithMany().HasForeignKey(x => x.StudentId);
        b.Entity<Attendance>().HasOne<ClassSession>().WithMany().HasForeignKey(x => x.SessionId);
        b.Entity<TrialAttendance>().HasOne<Trial>().WithMany().HasForeignKey(x => x.TrialId);
        b.Entity<TrialAttendance>().HasOne<ClassSession>().WithMany().HasForeignKey(x => x.SessionId);
        b.Entity<Review>().HasOne<Student>().WithMany().HasForeignKey(x => x.StudentId);
        b.Entity<Review>().HasOne<ClassSession>().WithMany().HasForeignKey(x => x.SessionId);
        b.Entity<ProgressRecord>().HasOne<Student>().WithMany().HasForeignKey(x => x.StudentId);
        b.Entity<ProgressRecord>().HasOne<ClassSession>().WithMany().HasForeignKey(x => x.SessionId);
        b.Entity<ProgressRecord>().HasOne<UserAccount>().WithMany().HasForeignKey(x => x.RecordedBy);
        b.Entity<Artwork>().HasOne<Student>().WithMany().HasForeignKey(x => x.StudentId);
        b.Entity<Artwork>().HasOne<ClassSession>().WithMany().HasForeignKey(x => x.SessionId);
        b.Entity<Notification>().HasOne<UserAccount>().WithMany().HasForeignKey(x => x.UserId);
        b.Entity<AuditEntry>().HasOne<UserAccount>().WithMany().HasForeignKey(x => x.ActorId);
        foreach (var fk in b.Model.GetEntityTypes().SelectMany(x => x.GetForeignKeys())) fk.DeleteBehavior = DeleteBehavior.Restrict;
    }
    public void Track(Guid? actor, object entity, object? before = null)
    {
        var id = (Guid)entity.GetType().GetProperty("Id")!.GetValue(entity)!;
        Audit.Add(new AuditEntry { ActorId = actor, Entity = entity.GetType().Name, EntityId = id, Before = before is null ? "" : JsonSerializer.Serialize(before), After = JsonSerializer.Serialize(entity) });
    }
    public void Notify(Guid user, string title, string content) => Notifications.Add(new Notification { UserId = user, Title = title, Content = content });
}
