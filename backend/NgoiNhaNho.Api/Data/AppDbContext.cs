using Microsoft.EntityFrameworkCore;

namespace NgoiNhaNho.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<ClassRoom> Classes => Set<ClassRoom>();
    public DbSet<Trial> Trials => Set<Trial>();
    public DbSet<Student> Students => Set<Student>();
    public DbSet<StudentClass> StudentClasses => Set<StudentClass>();
    public DbSet<Absence> Absences => Set<Absence>();
    public DbSet<Attendance> Attendances => Set<Attendance>();
    public DbSet<AttendanceRecord> AttendanceRecords => Set<AttendanceRecord>();
    public DbSet<TuitionRecord> Tuition => Set<TuitionRecord>();
    public DbSet<JournalEntry> Journal => Set<JournalEntry>();
    public DbSet<ProgressRecord> ProgressRecords => Set<ProgressRecord>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<Reminder> Reminders => Set<Reminder>();
    public DbSet<AuditLog> AuditLog => Set<AuditLog>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        // Khóa kép (khớp PRIMARY KEY trong 01_schema.sql)
        b.Entity<StudentClass>().HasKey(x => new { x.StudentId, x.ClassId });
        b.Entity<AttendanceRecord>().HasKey(x => new { x.AttendanceId, x.PersonType, x.PersonId });
        b.Entity<TuitionRecord>().HasKey(x => new { x.StudentId, x.Month });
        b.Entity<Reminder>().HasKey(x => new { x.ClassId, x.SessionDate });

        b.Entity<StudentClass>().HasOne(x => x.Student).WithMany(s => s.StudentClasses).HasForeignKey(x => x.StudentId);
        b.Entity<StudentClass>().HasOne(x => x.Class).WithMany().HasForeignKey(x => x.ClassId);
        b.Entity<ClassRoom>().HasOne(x => x.Teacher).WithMany().HasForeignKey(x => x.TeacherId);
        b.Entity<Absence>().HasOne(x => x.Student).WithMany().HasForeignKey(x => x.StudentId);
        b.Entity<Attendance>().HasMany(x => x.Records).WithOne(r => r.Attendance).HasForeignKey(r => r.AttendanceId);

        // Cột tính toán/chỉ-đọc ở C# không có trong bảng
        b.Entity<Trial>().Ignore(x => x.SessionKey);
        b.Entity<Absence>().Ignore(x => x.SessionKey).Ignore(x => x.MakeupKey);

        // Cột TIME / DATE – PostgreSQL dùng "time" (không có precision suffix)
        b.Entity<ClassRoom>().Property(x => x.StartTime).HasColumnType("time");
        b.Entity<ClassRoom>().Property(x => x.EndTime).HasColumnType("time");
        b.Entity<TuitionRecord>().Property(x => x.Amount).HasColumnType("numeric(12,0)");
    }
}
