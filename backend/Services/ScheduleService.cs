using Microsoft.EntityFrameworkCore;
namespace NgoiNhaNho;
public class ScheduleService(AppDb db)
{
    public async Task<List<Guid>> RegularStudents(ClassSession s)
    {
        return await db.Enrollments.Where(e => e.ClassId == s.ClassId && e.From <= s.Date && (e.Until == null || e.Until >= s.Date) && db.Students.Any(x => x.Id == e.StudentId && x.Status == States.Studying)).Select(e => e.StudentId).ToListAsync();
    }
    public async Task<List<Guid>> Roster(ClassSession s)
    {
        if (s.Closed) return await db.Attendances.Where(a => a.SessionId == s.Id).Select(a => a.StudentId).ToListAsync();
        var regular = await RegularStudents(s);
        var makeup = await db.Leaves.Where(l => l.MakeUpSessionId == s.Id && l.Status == States.Approved && db.Students.Any(x => x.Id == l.StudentId && x.Status == States.Studying)).Select(l => l.StudentId).ToListAsync();
        return regular.Concat(makeup).Distinct().ToList();
    }
    public async Task<int> TrialCount(Guid sessionId, Guid? except = null) => await db.Trials.CountAsync(t => t.SessionId == sessionId && t.Id != except && t.Status != States.Accepted && t.Status != States.Received);
    public async Task<bool> Conflict(Guid studentId, ClassSession target, ArtClass targetClass)
    {
        if (await db.Enrollments.AnyAsync(e => e.StudentId == studentId && e.From <= target.Date && (e.Until == null || e.Until >= target.Date) && db.Sessions.Any(s => s.ClassId == e.ClassId && !s.Cancelled && s.Date == target.Date && s.Start < target.End && s.End > target.Start))) return true;
        return await (from l in db.Leaves join s in db.Sessions on l.MakeUpSessionId equals s.Id where l.StudentId == studentId && l.MakeUpSessionId != target.Id && (l.Status == States.Registered || l.Status == States.Approval || l.Status == States.Approved) && s.Date == target.Date && !s.Cancelled && s.Start < target.End && s.End > target.Start select l).AnyAsync();
    }
    public async Task MakeUpAvailable(LeaveRequest leave, ClassSession session, ArtClass c, Student student, bool includeSelf = false)
    {
        Rules.Require(student.Status == States.Studying, "Học viên không ở trạng thái Đang học.");
        Rules.Require(!session.Cancelled && c.BranchId == student.BranchId && session.Program == student.Program, "Ca học phải cùng cơ sở và chương trình học.");
        Rules.Require(Rules.At(session.Date, session.Start) > Rules.Now && session.Date <= leave.Deadline && session.Date >= (await db.Sessions.SingleAsync(x => x.Id == leave.SessionId)).Date, "Ca học không nằm trong thời hạn học bù.");
        Rules.Require(!await Conflict(student.Id, session, c), "Ca học trùng lịch của học viên.");
        var held = await db.Leaves.CountAsync(l => l.MakeUpSessionId == session.Id && (includeSelf || l.Id != leave.Id) && (l.Status == States.Registered || l.Status == States.Approval || l.Status == States.Approved));
        var regular = (await RegularStudents(session)).Count;
        var trials = await TrialCount(session.Id);
        Rules.Require(held < 2 && regular + trials + held < 8, "Ca học này vừa hết chỗ. Vui lòng chọn ca khác.");
    }
}
