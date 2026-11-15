namespace NgoiNhaNho.Api.Dtos;

// Dạng dữ liệu trả về – trùng tên/cấu trúc với những gì giao diện (frontend/src/services/api.js) đang dùng.
public record UserDto(int Id, string Role, string FullName, string? Title, string Username, string? Phone, bool MustChangePassword);
public record LoginResult(string Token, UserDto User);
public record LoginRequest(string? Username, string? Password, string? App);
public record ChangePasswordRequest(string? OldPw, string? NewPw);

public record SessionInfo(string Key, int ClassId, string Date, string Name, string Program, string Start, string End,
                          int Weekday, string Code, int? TeacherId, string Teacher, bool Ended, bool Started);
public record LoadInfo(int Official, int Trials, int Bu, int Base, int Total, int Max);
/// <summary>Thông tin ca + sĩ số, JSON dạng phẳng (key, name, date, ..., load) giống giao diện đang dùng.</summary>
public class SessionWithLoad
{
    public SessionWithLoad(SessionInfo i, LoadInfo l)
    {
        Key = i.Key; ClassId = i.ClassId; Date = i.Date; Name = i.Name; Program = i.Program; Start = i.Start; End = i.End; Weekday = i.Weekday;
        Code = i.Code; TeacherId = i.TeacherId; Teacher = i.Teacher; Ended = i.Ended; Started = i.Started; Load = l;
    }
    public string Key { get; } public int ClassId { get; } public string Date { get; } public string Name { get; } public string Program { get; }
    public string Start { get; } public string End { get; } public int Weekday { get; } public string Code { get; } public int? TeacherId { get; }
    public string Teacher { get; } public bool Ended { get; } public bool Started { get; } public LoadInfo Load { get; }
}

public record ChildInput(string? Name, string? Dob);
public record RegisterTrialRequest(List<ChildInput>? Children, string? ParentPhone, List<int>? WishDays, string? WishSlot);
public record RegisterTrialResult(bool IsNew, int Count);

public record TrialDto(int Id, string StudentName, string Dob, string ParentPhone, List<int> WishDays, string WishSlot, string? Program,
                       string Status, string? Session, string CreatedAt, int Age, string? Suggested, SessionInfo? SessionInfo);
public record AssessmentDto(string? Stroke, string? Color, string? Absorb);
public record ConsultRequest(string? Roadmap, string? Decision, string? Note);
public record ProgramRequest(string? Program);
public record KeyRequest(string? Key);

public record StudentRequest(string? FullName, string? Dob, string? Gender, string? ParentName, string? ParentPhone, string? Program);
public record CreateStudentRequest(StudentRequest? Form, int? FromTrialId);
public record ClassRef(int Id, string Name, int Weekday, int Weekday2, string Start, string End, string Teacher);
public record StudentDto(int Id, string Code, string FullName, string Dob, string Gender, string ParentName, string ParentPhone,
                         string Program, string Status, int Age, List<ClassRef> Classes, int Remaining, object? Progress);
public record HistoryDto(long Id, string At, string ByName, string? From, string To, string? Note);

public record ClassRequest(string? Name, string? Program, int? Weekday, int? Weekday2, string? Start, string? End, int? Capacity);
public record ClassDto(int Id, string Code, string Name, string Program, int Weekday, int Weekday2, string Start, string End, int Capacity, int? TeacherId, string Teacher, int Size, List<MemberDto> Members);
public record MemberDto(int Id, string FullName, string Code);
public record TeacherRef(int Id, string Name);
public record TeacherSchedule(int Id, string Name, string Schedule, bool Conflict);
public record TeacherRequest(int? TeacherId);
public record EnrollRequest(int StudentId, int ClassId);
public record WeekDay(string Date, int Weekday, bool Closed, List<SessionWithLoad> Sessions);
public record WeekDto(string Start, List<WeekDay> Days);

public record StudentRef(int Id, string FullName, string Code, string Program, string ParentPhone);
public record AbsenceDto(int Id, string Status, string? Reason, string Deadline, int DaysLeft, StudentRef Student, SessionInfo Session, SessionWithLoad? MakeupInfo);

public class TrialSessionDto(SessionInfo i, LoadInfo l, List<TrialStudentDto> students) : SessionWithLoad(i, l)
{
    public List<TrialStudentDto> Students { get; } = students;
}
public record TrialStudentDto(int Id, string Name, string Dob, string? Program);
