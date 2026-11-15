using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NgoiNhaNho.Api.Data;

// Mỗi class tương ứng 1 bảng trong 01_schema.sql (tên cột trùng tên thuộc tính).

[Table("Users")]
public class User
{
    [Key] public int UserId { get; set; }
    public string Username { get; set; } = "";
    public string? Email { get; set; }
    public string PasswordHash { get; set; } = "";
    public string Role { get; set; } = "";          // assistant | manager | supervisor | teacher | parent
    public string FullName { get; set; } = "";
    public string? Title { get; set; }
    public string? Phone { get; set; }
    public bool IsLocked { get; set; }
    public int FailedAttempts { get; set; }
    public DateTime? LockoutEnd { get; set; }
    public bool MustChangePassword { get; set; }
    public DateTime CreatedAt { get; set; }
    [NotMapped] public string DisplayName => string.IsNullOrWhiteSpace(Title) ? FullName : $"{Title} {FullName}";
}

[Table("Classes")]
public class ClassRoom
{
    [Key] public int ClassId { get; set; }
    public string Name { get; set; } = "";
    public string Program { get; set; } = "";
    public byte Weekday { get; set; }   // ngày học thứ nhất của cặp (0 = CN, 1 = Thứ 2 ... 6 = Thứ 7)
    public byte Weekday2 { get; set; }  // ngày học thứ hai: lớp học 2 buổi/tuần (T2-T4, T3-T5, T7-CN)
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }
    public byte Capacity { get; set; } = 7;
    public int? TeacherId { get; set; }
    public string Letter { get; set; } = "A";
    public User? Teacher { get; set; }

    /// <summary>Lớp có học vào thứ này không</summary>
    public bool Meets(int wd) => Weekday == wd || Weekday2 == wd;
    /// <summary>Hai lớp có chung ít nhất một ngày học trong tuần</summary>
    public bool SharesDay(ClassRoom o) => Meets(o.Weekday) || Meets(o.Weekday2);
}

[Table("Trials")]
public class Trial
{
    [Key] public int TrialId { get; set; }
    public string StudentName { get; set; } = "";
    public DateOnly DateOfBirth { get; set; }
    public string ParentPhone { get; set; } = "";
    public string WishDays { get; set; } = "";
    public string WishSlot { get; set; } = "";
    public string? Program { get; set; }
    public string Status { get; set; } = "Chờ tiếp nhận";
    public int? SessionClassId { get; set; }
    public DateOnly? SessionDate { get; set; }
    public DateTime CreatedAt { get; set; }
    public string? AssessStroke { get; set; }
    public string? AssessColor { get; set; }
    public string? AssessAbsorb { get; set; }
    public int? AssessedBy { get; set; }
    public DateTime? AssessedAt { get; set; }
    public string? ConsultRoadmap { get; set; }
    public string? ConsultDecision { get; set; }
    public string? ConsultNote { get; set; }
    public int? ConsultBy { get; set; }
    public DateTime? ConsultAt { get; set; }
    public string SessionKey => SessionClassId is null ? "" : $"{SessionClassId}|{SessionDate:yyyy-MM-dd}";
}

[Table("Students")]
public class Student
{
    [Key] public int StudentId { get; set; }
    public string Code { get; set; } = "";
    public string FullName { get; set; } = "";
    public DateOnly DateOfBirth { get; set; }
    public string Gender { get; set; } = "";
    public string ParentName { get; set; } = "";
    public string ParentPhone { get; set; } = "";
    public string Program { get; set; } = "";
    public string Status { get; set; } = "Chờ xếp lớp";
    public int? TrialId { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<StudentClass> StudentClasses { get; set; } = new();
}

[Table("StudentClasses")]
public class StudentClass
{
    public int StudentId { get; set; }
    public int ClassId { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime JoinedAt { get; set; }
    public Student? Student { get; set; }
    public ClassRoom? Class { get; set; }
}

[Table("Absences")]
public class Absence
{
    [Key] public int AbsenceId { get; set; }
    public int StudentId { get; set; }
    public int ClassId { get; set; }
    public DateOnly SessionDate { get; set; }
    public string? Reason { get; set; }
    public string Status { get; set; } = "Chờ xếp lịch bù";
    public DateOnly Deadline { get; set; }
    public int? MakeupClassId { get; set; }
    public DateOnly? MakeupDate { get; set; }
    public DateTime CreatedAt { get; set; }
    public int? CreatedBy { get; set; }
    public Student? Student { get; set; }
    public string SessionKey => $"{ClassId}|{SessionDate:yyyy-MM-dd}";
    public string? MakeupKey => MakeupClassId is null ? null : $"{MakeupClassId}|{MakeupDate:yyyy-MM-dd}";
}

[Table("Attendances")]
public class Attendance
{
    [Key] public int AttendanceId { get; set; }
    public int ClassId { get; set; }
    public DateOnly SessionDate { get; set; }
    public DateTime FinalizedAt { get; set; }
    public int? FinalizedBy { get; set; }
    public List<AttendanceRecord> Records { get; set; } = new();
}

[Table("AttendanceRecords")]
public class AttendanceRecord
{
    public int AttendanceId { get; set; }
    public string PersonType { get; set; } = "Student";  // Student | Trial
    public int PersonId { get; set; }
    public string Status { get; set; } = "present";       // present | absent
    public Attendance? Attendance { get; set; }
}

[Table("Tuition")]
public class TuitionRecord
{
    public int StudentId { get; set; }
    public string Month { get; set; } = "";
    public decimal Amount { get; set; }
    public int TotalSessions { get; set; }
    public string Status { get; set; } = "Chưa thanh toán";
    public DateTime? PaidAt { get; set; }
    public int? RecordedBy { get; set; }
}

[Table("Journal")]
public class JournalEntry
{
    [Key] public int JournalId { get; set; }
    public int StudentId { get; set; }
    public int ClassId { get; set; }
    public DateOnly SessionDate { get; set; }
    public int? TeacherId { get; set; }
    public string? PhotoPath { get; set; }
    public DateTime? PhotoAt { get; set; }
    public string? StrokeComment { get; set; }
    public string? ColorComment { get; set; }
    public string? AbsorbComment { get; set; }
    public DateTime? CommentAt { get; set; }
}

[Table("ProgressRecords")]
public class ProgressRecord
{
    [Key] public int ProgressId { get; set; }
    public int StudentId { get; set; }
    public int ClassId { get; set; }
    public DateOnly SessionDate { get; set; }
    public DateOnly EvalDate { get; set; }
    public string Status { get; set; } = "";
    public int? TeacherId { get; set; }
    public int? RecordedBy { get; set; }
    public DateTime RecordedAt { get; set; }
}

[Table("Notifications")]
public class Notification
{
    [Key] public int NotificationId { get; set; }
    public int UserId { get; set; }
    public string Title { get; set; } = "";
    public string Body { get; set; } = "";
    public DateTime CreatedAt { get; set; }
    public bool IsRead { get; set; }
}

[Table("Reminders")]
public class Reminder
{
    public int ClassId { get; set; }
    public DateOnly SessionDate { get; set; }
    public string Status { get; set; } = "Đã gửi nhắc nhở";
    public DateTime SentAt { get; set; }
    public int? SentBy { get; set; }
}

[Table("AuditLog")]
public class AuditLog
{
    [Key] public long LogId { get; set; }
    public string Entity { get; set; } = "";
    public string EntityKey { get; set; } = "";
    public string? ChangedBy { get; set; }
    public DateTime ChangedAt { get; set; }
    public string? OldValue { get; set; }
    public string? NewValue { get; set; }
    public string? Note { get; set; }
}
