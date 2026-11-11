using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Data;
using System.Text.Json;
namespace NgoiNhaNho;
[ApiController, Authorize(Roles = Roles.Parent + "," + Roles.Operations), Route("api/leaves")]
public class LeavesController(AppDb db, Access access, ScheduleService schedule) : ControllerBase
{
    public record LeaveInput(Guid StudentId, Guid SessionId, string? Reason);
    public record MakeUpInput(Guid SessionId);
    public record ApprovalInput(bool Approve);
    [HttpGet]
    public async Task<object> List()
    {
        await ExpiryWorker.Expire(db);
        return await (from l in db.Leaves.AsNoTracking() join s in db.Students on l.StudentId equals s.Id join session in db.Sessions on l.SessionId equals session.Id where s.BranchId == access.BranchId && (access.Role != Roles.Parent || s.ParentId == access.Id) orderby l.CreatedAt descending select new { l.Id, l.StudentId, StudentName = s.Name, l.SessionId, Date = session.Date, l.Reason, l.Deadline, l.Status, l.MakeUpSessionId }).ToListAsync();
    }
    [HttpPost]
    public async Task<object> Create(LeaveInput input)
    {
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable); var student = await access.Student(input.StudentId); var (session, c) = await access.Session(input.SessionId);
        Rules.Require(student.Status == States.Studying, "Học viên không ở trạng thái Đang học.");
        Rules.Require((await schedule.RegularStudents(session)).Contains(student.Id), "Học viên không thuộc ca học thường này.");
        var future = Rules.At(session.Date, session.Start) > Rules.Now;
        if (access.Role == Roles.Parent) Rules.Require(future, "Chỉ gửi yêu cầu cho ca học chưa diễn ra.");
        else Rules.Require(future || (session.Date.AddDays(30) >= Rules.Today && await db.Attendances.AnyAsync(a => a.StudentId == student.Id && a.SessionId == session.Id && !a.Present)), "Ca học không đủ điều kiện ghi nhận lịch nghỉ.");
        Rules.Require(!await db.Leaves.AnyAsync(l => l.StudentId == student.Id && l.SessionId == session.Id), "Buổi học này đã được gửi đơn xin nghỉ trước đó.");
        var month = Rules.Month(session.Date); var tuition = await db.Tuitions.SingleOrDefaultAsync(t => t.StudentId == student.Id && t.Month == month && t.Paid);
        Rules.Require(tuition is not null && tuition.Remaining > 0, "Học viên đã hết số buổi học còn lại. Ba mẹ vui lòng liên hệ Trợ lý để được hỗ trợ.");
        Rules.Require(input.Reason is null || input.Reason.Length <= 1000, "Lý do tối đa 1000 ký tự.");
        tuition!.Remaining--; var leave = new LeaveRequest { StudentId = student.Id, SessionId = session.Id, Reason = input.Reason, Deadline = session.Date.AddDays(30), CreatedBy = access.Id }; db.Leaves.Add(leave); db.Track(access.Id, leave); db.Notify(student.ParentId, "Xác nhận xin nghỉ", $"Đã ghi nhận lịch nghỉ {student.Name}, {session.Date:dd/MM/yyyy}. Hạn học bù: {leave.Deadline:dd/MM/yyyy}."); await db.SaveChangesAsync(); await tx.CommitAsync(); return leave;
    }
    [HttpGet("{id:guid}/available")]
    public async Task<object> Available(Guid id)
    {
        await ExpiryWorker.Expire(db); var l = await Find(id); var student = await access.Student(l.StudentId); Rules.Require(l.Status == States.MakeUpWaiting, "Yêu cầu không ở trạng thái Chờ xếp lịch bù.");
        var candidates = await (from s in db.Sessions join c in db.Classes on s.ClassId equals c.Id where c.BranchId == access.BranchId && s.Program == student.Program && !s.Cancelled && s.Date >= Rules.Today && s.Date <= l.Deadline select new { s, c }).ToListAsync();
        var result = new List<object>(); foreach (var item in candidates) { try { await schedule.MakeUpAvailable(l, item.s, item.c, student); result.Add(new { item.s.Id, item.s.Date, item.c.Name, item.s.Start, item.s.End, item.s.Program }); } catch (BusinessError) { } }
        return result;
    }
    [HttpPost("{id:guid}/register")]
    public async Task<object> Register(Guid id, MakeUpInput input)
    {
        await ExpiryWorker.Expire(db); await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable); await SqlLocks.HoldSession(db, input.SessionId); var l = await Find(id); Rules.Require(l.Status == States.MakeUpWaiting && l.Deadline >= Rules.Today, "Yêu cầu không còn được đăng ký học bù."); var student = await access.Student(l.StudentId); var (s, c) = await access.Session(input.SessionId); await schedule.MakeUpAvailable(l, s, c, student);
        var before = JsonSerializer.SerializeToElement(l); l.MakeUpSessionId = s.Id; l.Status = States.Registered; db.Track(access.Id, l, before); await db.SaveChangesAsync(); await tx.CommitAsync(); return new { message = "Đăng ký học bù thành công! Ca học đang được giữ chỗ, chờ phê duyệt." };
    }
    [Authorize(Roles = Roles.Parent), HttpPost("{id:guid}/cancel")]
    public async Task<object> Cancel(Guid id)
    {
        await ExpiryWorker.Expire(db); await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable); var l = await Find(id); Rules.Require(l.Status is States.Registered or States.Approval or States.Approved, "Không còn ca học bù có thể hủy."); var (s, c) = await access.Session(l.MakeUpSessionId!.Value); Rules.Require(Rules.At(s.Date, s.Start) > Rules.Now, "Ca học bù đã diễn ra.");
        var before = JsonSerializer.SerializeToElement(l); var approved = l.Status == States.Approved; l.MakeUpSessionId = null; l.Status = States.MakeUpWaiting; db.Track(access.Id, l, before);
        if(approved){var content=$"Học viên đã hủy ca học bù {s.Date:dd/MM/yyyy}, {s.Start}.";db.Notify(s.TeacherId,"Hủy học bù",content);foreach(var manager in await db.Users.Where(u=>u.BranchId==access.BranchId&&u.Role==Roles.Manager&&!u.Locked).Select(u=>u.Id).ToListAsync())db.Notify(manager,"Hủy học bù đã duyệt",content);}
        await db.SaveChangesAsync(); await tx.CommitAsync(); return new { message = "Hủy học bù thành công! Hạn học bù giữ nguyên." };
    }
    [Authorize(Roles = Roles.Operations), HttpPost("{id:guid}/submit")]
    public async Task<object> Submit(Guid id)
    {
        await ExpiryWorker.Expire(db); await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable); var l = await Find(id); Rules.Require(l.Status == States.Registered && l.Deadline >= Rules.Today, "Yêu cầu không còn ở trạng thái Đã đăng ký học bù."); var (s, c) = await access.Session(l.MakeUpSessionId!.Value); Rules.Require(Rules.At(s.Date, s.Start) > Rules.Now, "Ca học bù đã diễn ra."); var before = JsonSerializer.SerializeToElement(l); l.Status = States.Approval; db.Track(access.Id, l, before); await db.SaveChangesAsync(); await tx.CommitAsync(); return new { message = "Đã trình Quản lý phê duyệt." };
    }
    [Authorize(Roles = Roles.Manager), HttpPost("{id:guid}/approve")]
    public async Task<object> Approve(Guid id, ApprovalInput input)
    {
        await ExpiryWorker.Expire(db); await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable); var l = await Find(id); Rules.Require(l.Status == States.Approval && l.Deadline >= Rules.Today, "Đề xuất không còn chờ duyệt hoặc đã hết hạn."); var student = await access.Student(l.StudentId); var (s, c) = await access.Session(l.MakeUpSessionId!.Value); var before = JsonSerializer.SerializeToElement(l);
        if (input.Approve) { await schedule.MakeUpAvailable(l, s, c, student); l.Status = States.Approved; db.Notify(student.ParentId, "Lịch học bù đã duyệt", $"{student.Name}: {s.Date:dd/MM/yyyy} {s.Start}, lớp {c.Name}."); db.Notify(s.TeacherId, "Học viên học bù", $"Ca {s.Date:dd/MM/yyyy} {s.Start} có học viên bù {student.Name}."); }
        else { l.Status = States.MakeUpWaiting; l.MakeUpSessionId = null; foreach (var u in await db.Users.Where(u => u.BranchId == access.BranchId && u.Role == Roles.Assistant).ToListAsync()) db.Notify(u.Id, "Không duyệt học bù", $"Vui lòng chọn lại ca cho {student.Name}."); }
        db.Track(access.Id, l, before); await db.SaveChangesAsync(); await tx.CommitAsync(); return new { message = input.Approve ? "Đã phê duyệt lịch học bù." : "Đã trả về Chờ xếp lịch bù." };
    }
    private async Task<LeaveRequest> Find(Guid id) { var l = await db.Leaves.FindAsync(id); Rules.Require(l is not null, "Không tìm thấy yêu cầu xin nghỉ.", 404); await access.Student(l!.StudentId); return l; }
}
