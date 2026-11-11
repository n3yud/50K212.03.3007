using System.ComponentModel.DataAnnotations;

namespace NgoiNhaNho;

public static class Roles
{
    public const string Parent = "Phụ huynh", Assistant = "Trợ lý", Manager = "Quản lý", Teacher = "Giáo viên", Supervisor = "Giám sát";
    public const string Operations = Assistant + "," + Manager;
}
public static class States
{
    public const string Waiting = "Chờ xếp lớp", Studying = "Đang học", Archived = "Đã bảo lưu";
    public const string Received = "Chờ tiếp nhận", Accepted = "Đã tiếp nhận", ParentConfirm = "Chờ phụ huynh xác nhận", TrialApproval = "Chờ duyệt ca học thử", Scheduled = "Đã xếp ca", Completed = "Đã hoàn thành", Consulted = "Đã tư vấn";
    public const string TrialReschedule = "Chờ xếp ca học thử";
    public const string MakeUpWaiting = "Chờ xếp lịch bù", Registered = "Đã đăng ký học bù", Approval = "Chờ duyệt", Approved = "Đã xếp lịch bù", Expired = "Hết hạn";
}
public class UserAccount
{
    public Guid Id { get; set; } = Guid.NewGuid();
    [MaxLength(100)] public string Login { get; set; } = "";
    [MaxLength(200)] public string? Email { get; set; }
    [MaxLength(100)] public string Name { get; set; } = "";
    [MaxLength(30)] public string Role { get; set; } = "";
    [MaxLength(300)] public string PasswordHash { get; set; } = "";
    public bool MustChangePassword { get; set; }
    public bool Locked { get; set; }
    public int SessionVersion { get; set; }
    public Guid BranchId { get; set; }
}
public class Branch
{
    public Guid Id { get; set; } = Guid.NewGuid();
    [MaxLength(100)] public string Name { get; set; } = "";
    [MaxLength(300)] public string Address { get; set; } = "";
}
public class Student
{
    public Guid Id { get; set; } = Guid.NewGuid();
    [MaxLength(30)] public string Code { get; set; } = "HV" + Guid.NewGuid().ToString("N")[..12].ToUpperInvariant();
    [MaxLength(50)] public string Name { get; set; } = "";
    public DateOnly BirthDate { get; set; }
    [MaxLength(20)] public string Gender { get; set; } = "";
    [MaxLength(100)] public string ParentName { get; set; } = "";
    public Guid ParentId { get; set; }
    public Guid BranchId { get; set; }
    [MaxLength(20)] public string Program { get; set; } = "";
    [MaxLength(30)] public string Status { get; set; } = States.Waiting;
    public Guid? TrialId { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
public class Trial
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ParentId { get; set; }
    public Guid BranchId { get; set; }
    [MaxLength(50)] public string StudentName { get; set; } = "";
    public DateOnly BirthDate { get; set; }
    [MaxLength(500)] public string DesiredTime { get; set; } = "";
    [MaxLength(20)] public string Program { get; set; } = "";
    [MaxLength(40)] public string Status { get; set; } = States.Received;
    public Guid? SessionId { get; set; }
    public string? Lines { get; set; }
    public string? Colors { get; set; }
    public string? Learning { get; set; }
    public string? Roadmap { get; set; }
    [MaxLength(40)] public string? Decision { get; set; }
    public string? InternalNote { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
public class ArtClass
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid BranchId { get; set; }
    [MaxLength(100)] public string Name { get; set; } = "";
    [MaxLength(20)] public string Program { get; set; } = "";
    public int Weekday { get; set; }
    public TimeOnly Start { get; set; }
    public TimeOnly End { get; set; }
    public int Capacity { get; set; }
    public Guid? TeacherId { get; set; }
}
public class Enrollment
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid StudentId { get; set; }
    public Guid ClassId { get; set; }
    public DateOnly From { get; set; }
    public DateOnly? Until { get; set; }
}
public class ClassSession
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ClassId { get; set; }
    public Guid TeacherId { get; set; }
    public DateOnly Date { get; set; }
    public TimeOnly Start { get; set; }
    public TimeOnly End { get; set; }
    [MaxLength(20)] public string Program { get; set; } = "";
    public bool Cancelled { get; set; }
    public bool Closed { get; set; }
}
public class ClassScheduleVersion
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ClassId { get; set; }
    public DateOnly EffectiveFrom { get; set; }
    public int Weekday { get; set; }
    public TimeOnly Start { get; set; }
    public TimeOnly End { get; set; }
    [MaxLength(20)] public string Program { get; set; } = "";
}
public class Tuition
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid StudentId { get; set; }
    [MaxLength(7)] public string Month { get; set; } = "";
    public decimal? Amount { get; set; }
    public bool Paid { get; set; }
    public int Lessons { get; set; }
    public int Remaining { get; set; }
    public Guid? RecordedBy { get; set; }
    public DateTimeOffset? RecordedAt { get; set; }
}
public class LeaveRequest
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid StudentId { get; set; }
    public Guid SessionId { get; set; }
    public Guid? MakeUpSessionId { get; set; }
    [MaxLength(1000)] public string? Reason { get; set; }
    public DateOnly Deadline { get; set; }
    [MaxLength(40)] public string Status { get; set; } = States.MakeUpWaiting;
    public Guid CreatedBy { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
public class Attendance
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SessionId { get; set; }
    public Guid StudentId { get; set; }
    public bool Present { get; set; }
}
public class TrialAttendance
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SessionId { get; set; }
    public Guid TrialId { get; set; }
    public bool Present { get; set; }
}
public class Review
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SessionId { get; set; }
    public Guid StudentId { get; set; }
    public string Lines { get; set; } = "";
    public string Colors { get; set; } = "";
    public string Learning { get; set; } = "";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
public class ProgressRecord
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SessionId { get; set; }
    public Guid StudentId { get; set; }
    public DateOnly EvaluationDate { get; set; }
    [MaxLength(30)] public string Status { get; set; } = "";
    public string Note { get; set; } = "";
    public Guid RecordedBy { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
public class Artwork
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid StudentId { get; set; }
    public Guid SessionId { get; set; }
    [MaxLength(100)] public string FileName { get; set; } = "";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
public class Notification
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    [MaxLength(200)] public string Title { get; set; } = "";
    public string Content { get; set; } = "";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
public class AuditEntry
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid? ActorId { get; set; }
    [MaxLength(100)] public string Entity { get; set; } = "";
    public Guid EntityId { get; set; }
    public string Before { get; set; } = "";
    public string After { get; set; } = "";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
