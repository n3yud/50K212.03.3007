using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Data;
namespace NgoiNhaNho;
[ApiController, Authorize(Roles = Roles.Parent + "," + Roles.Teacher + "," + Roles.Operations), Route("api/sessions")]
public class SessionsController(AppDb db, Access access, ScheduleService schedule) : ControllerBase
{
    [HttpGet]
    public async Task<object> List(DateOnly? from = null, DateOnly? to = null, Guid? studentId = null)
    {
        var start = from ?? Rules.Today.AddDays(-(int)Rules.Today.DayOfWeek + 1); var end = to ?? start.AddDays(6); Rules.Require(end >= start && end.DayNumber - start.DayNumber <= 366, "Khoảng thời gian không hợp lệ.");
        var q = from s in db.Sessions.AsNoTracking() join c in db.Classes on s.ClassId equals c.Id where !s.Cancelled && c.BranchId == access.BranchId && s.Date >= start && s.Date <= end select new { s, c };
        if (access.Role == Roles.Teacher) q = q.Where(x => x.s.TeacherId == access.Id);
        if (access.Role == Roles.Parent || studentId.HasValue)
        {
            if (studentId.HasValue) await access.Student(studentId.Value);
            q = q.Where(x => db.Enrollments.Any(e => e.ClassId == x.c.Id && e.From <= x.s.Date && (e.Until == null || e.Until >= x.s.Date) && db.Students.Any(st => st.Id == e.StudentId && (!studentId.HasValue || st.Id == studentId) && (access.Role != Roles.Parent || st.ParentId == access.Id))) || db.Leaves.Any(l => l.MakeUpSessionId == x.s.Id && l.Status == States.Approved && db.Students.Any(st => st.Id == l.StudentId && (!studentId.HasValue || st.Id == studentId) && (access.Role != Roles.Parent || st.ParentId == access.Id))) || db.Trials.Any(t => t.SessionId == x.s.Id && access.Role == Roles.Parent && t.ParentId == access.Id && t.Status != States.Accepted && t.Status != States.Received));
        }
        return await q.OrderBy(x => x.s.Date).ThenBy(x => x.s.Start).Select(x => new { x.s.Id, x.s.Date, x.s.ClassId, x.c.Name, x.s.Program, x.s.Start, x.s.End, x.s.TeacherId, Teacher = db.Users.Where(u => u.Id == x.s.TeacherId).Select(u => u.Name).First(), x.s.Closed }).ToListAsync();
    }
    [Authorize(Roles = Roles.Teacher), HttpGet("{id:guid}/roster")]
    public async Task<object> Roster(Guid id)
    {
        var (s, c) = await access.Session(id, true); var ids = await schedule.Roster(s); var students = await db.Students.Where(st => ids.Contains(st.Id)).Select(st => new { st.Id, st.Name, st.Program }).ToListAsync(); var trials = await db.Trials.Where(t => t.SessionId == id && (t.Status == States.Scheduled || t.Status == States.Completed || t.Status == States.Consulted)).Select(t => new { t.Id, Name = t.StudentName }).ToListAsync(); return new { session = s, students, trials, attendance = await db.Attendances.Where(a => a.SessionId == id).ToListAsync(), trialAttendance = await db.TrialAttendances.Where(a => a.SessionId == id).ToListAsync() };
    }
    public record Mark(Guid StudentId, bool Present);
    public record TrialMark(Guid TrialId, bool Present);
    public record AttendanceInput(Mark[] Students, TrialMark[] Trials, bool Finalize);
    [Authorize(Roles = Roles.Teacher), HttpPost("{id:guid}/attendance")]
    public async Task<object> Attendance(Guid id, AttendanceInput input)
    {
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable); var (s, c) = await access.Session(id, true); Rules.Require(!s.Closed, "Ca học này đã chốt điểm danh."); Rules.Require(Rules.At(s.Date, s.Start) <= Rules.Now, "Ca học chưa bắt đầu."); if (input.Finalize) Rules.Require(Rules.At(s.Date, s.End) <= Rules.Now, "Chốt điểm danh khi ca học kết thúc.");
        var ids = await schedule.Roster(s); var tids = await db.Trials.Where(t => t.SessionId == id && t.Status == States.Scheduled).Select(t => t.Id).ToListAsync();
        Rules.Require(input.Students.Select(a => a.StudentId).Distinct().Count() == input.Students.Length && input.Trials.Select(a => a.TrialId).Distinct().Count() == input.Trials.Length, "Danh sách điểm danh bị trùng.");
        Rules.Require(input.Students.All(a => ids.Contains(a.StudentId)) && input.Trials.All(a => tids.Contains(a.TrialId)), "Danh sách có học viên ngoài ca học.", 403);
        if (input.Finalize) Rules.Require(ids.Count == input.Students.Length && tids.Count == input.Trials.Length, "Vui lòng điểm danh đủ học viên trong ca học!");
        foreach (var a in input.Students) { var row = await db.Attendances.SingleOrDefaultAsync(x => x.SessionId == id && x.StudentId == a.StudentId); if (row is null) { row = new Attendance { SessionId = id, StudentId = a.StudentId }; db.Attendances.Add(row); } row.Present = a.Present; }
        foreach (var a in input.Trials) { var row = await db.TrialAttendances.SingleOrDefaultAsync(x => x.SessionId == id && x.TrialId == a.TrialId); if (row is null) { row = new TrialAttendance { SessionId = id, TrialId = a.TrialId }; db.TrialAttendances.Add(row); } row.Present = a.Present; }
        if (input.Finalize)
        {
            var regular = await schedule.RegularStudents(s); var month = Rules.Month(s.Date);
            foreach (var a in input.Students)
            {
                var st = await db.Students.SingleAsync(x => x.Id == a.StudentId);
                if (a.Present && regular.Contains(a.StudentId))
                {
                    Rules.Require(!await db.Leaves.AnyAsync(l => l.StudentId == a.StudentId && l.SessionId == id), "Học viên đã xin nghỉ không thể chốt Có mặt; vui lòng kiểm tra lịch nghỉ.");
                    var tuition = await db.Tuitions.SingleOrDefaultAsync(t => t.StudentId == a.StudentId && t.Month == month && t.Paid); Rules.Require(tuition is not null && tuition.Remaining > 0, $"Học viên {st.Name} chưa có số buổi khả dụng trong tháng."); tuition!.Remaining--;
                }
                if (!a.Present) db.Notify(st.ParentId, "Thông báo vắng mặt", $"{st.Name} vắng ca {s.Date:dd/MM/yyyy} {s.Start}.");
            }
            s.Closed = true; db.Track(access.Id, s);
        }
        await db.SaveChangesAsync(); await tx.CommitAsync(); return new { message = input.Finalize ? "Chốt điểm danh thành công!" : "Đã lưu tạm điểm danh." };
    }
}
