using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using System.Data;
using System.Security.Cryptography;
using System.Text.Json;

namespace NgoiNhaNho;
[ApiController, Route("api/trials")]
public class TrialsController(AppDb db, Access access, ScheduleService schedule, IPasswordHasher<UserAccount> hasher) : ControllerBase
{
    public record ChildInput(string Name, DateOnly BirthDate, string DesiredTime);
    public record Registration(string Phone, ChildInput[] Children);
    public record SessionInput(Guid SessionId);
    public record Evaluation(string Lines, string Colors, string Learning);
    public record Consultation(string Roadmap, string Decision, string? InternalNote);
    [AllowAnonymous, HttpGet("branches")]
    public async Task<object> Branches() => await db.Branches.AsNoTracking().ToListAsync();
    [AllowAnonymous, HttpPost, EnableRateLimiting("auth")]
    public async Task<object> Register(Registration input)
    {
        Rules.Phone(input.Phone); Rules.Require(input.Children.Length is >= 1 and <= 2, "Vui lòng nhập thông tin một hoặc hai bé.");
        foreach (var c in input.Children) { Rules.ProgramFor(c.Name.Trim(), c.BirthDate); Rules.Text(c.DesiredTime, "khung giờ mong muốn", 500); }
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        var branch = await db.Branches.OrderBy(x => x.Name).FirstAsync();
        var parent = await db.Users.SingleOrDefaultAsync(x => x.Login == input.Phone);
        if (parent is null)
        {
            parent = new UserAccount { Login = input.Phone, Name = "Phụ huynh", Role = Roles.Parent, BranchId = branch.Id, MustChangePassword = true };
            parent.PasswordHash = hasher.HashPassword(parent, Convert.ToBase64String(RandomNumberGenerator.GetBytes(24))); db.Users.Add(parent);
        }
        Rules.Require(parent.Role == Roles.Parent && parent.BranchId == branch.Id, "Thông tin đăng ký không hợp lệ. Vui lòng liên hệ Trợ lý.");
        var keys = new HashSet<string>();
        foreach (var c in input.Children)
        {
            var name = c.Name.Trim(); Rules.Require(keys.Add(name.ToUpperInvariant() + c.BirthDate), "Thông tin học viên bị trùng.");
            Rules.Require(!await db.Trials.AnyAsync(t => t.ParentId == parent.Id && t.StudentName == name && t.BirthDate == c.BirthDate && t.Status != States.Consulted), "Học viên đã có một đơn học thử đang hiệu lực.");
            var t = new Trial { ParentId = parent.Id, BranchId = branch.Id, StudentName = name, BirthDate = c.BirthDate, DesiredTime = c.DesiredTime, Program = Rules.ProgramFor(name, c.BirthDate) };
            db.Trials.Add(t); db.Track(null, t);
        }
        foreach (var u in await db.Users.Where(x => x.BranchId == branch.Id && (x.Role == Roles.Assistant || x.Role == Roles.Manager)).ToListAsync()) db.Notify(u.Id, "Đơn học thử mới", "Có đơn học thử mới đang Chờ tiếp nhận.");
        await db.SaveChangesAsync(); await tx.CommitAsync();
        return new { message = "Đăng ký học thử thành công! Vui lòng liên hệ Trợ lý để nhận mật khẩu tạm qua kênh liên lạc đã xác minh." };
    }
    [Authorize(Roles = Roles.Operations + "," + Roles.Parent + "," + Roles.Teacher), HttpGet]
    public async Task<object> List()
    {
        var q = db.Trials.AsNoTracking().Where(t => t.BranchId == access.BranchId);
        if (access.Role == Roles.Parent) q = q.Where(t => t.ParentId == access.Id);
        if (access.Role == Roles.Teacher) q = q.Where(t => db.Sessions.Any(s => s.Id == t.SessionId && s.TeacherId == access.Id) && (t.Status == States.Scheduled || t.Status == States.Completed || t.Status == States.Consulted));
        var list = await q.OrderByDescending(t => t.CreatedAt).ToListAsync();
        var parentIds = list.Select(t => t.ParentId).Distinct().ToList(); var phones = access.Operations ? await db.Users.Where(u => parentIds.Contains(u.Id)).ToDictionaryAsync(u => u.Id, u => u.Login) : new Dictionary<Guid, string>();
        var sessionIds = list.Where(t => t.SessionId.HasValue).Select(t => t.SessionId!.Value).ToList();
        var sessions = await (from s in db.Sessions join c in db.Classes on s.ClassId equals c.Id join u in db.Users on s.TeacherId equals u.Id where sessionIds.Contains(s.Id) select new { s.Id, s.Date, s.Start, s.End, c.Name, Teacher = u.Name }).ToListAsync();
        return list.Select(t => new { t.Id, t.StudentName, t.BirthDate, t.Program, t.Status, t.DesiredTime, t.CreatedAt, t.SessionId, Session = sessions.FirstOrDefault(s => s.Id == t.SessionId), Phone = phones.GetValueOrDefault(t.ParentId), Lines = (access.Role != Roles.Parent || t.Status == States.Consulted) ? t.Lines : null, Colors = (access.Role != Roles.Parent || t.Status == States.Consulted) ? t.Colors : null, Learning = (access.Role != Roles.Parent || t.Status == States.Consulted) ? t.Learning : null, Roadmap = (access.Role != Roles.Parent || t.Status == States.Consulted) ? t.Roadmap : null, Decision = access.Operations ? t.Decision : null, InternalNote = access.Operations ? t.InternalNote : null });
    }
    private async Task<Trial> Get(Guid id)
    {
        var t = await db.Trials.SingleOrDefaultAsync(t => t.Id == id && t.BranchId == access.BranchId); Rules.Require(t is not null, "Không tìm thấy đơn học thử.", 404);
        if (access.Role == Roles.Parent) Rules.Require(t!.ParentId == access.Id, "Bạn không có quyền truy cập đơn này.", 403);
        return t!;
    }
    [Authorize(Roles = Roles.Operations), HttpPost("{id:guid}/accept")]
    public async Task<object> Accept(Guid id)
    {
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable); var t = await Get(id); Rules.Require(t.Status == States.Received, "Đơn không còn ở trạng thái Chờ tiếp nhận.");
        var before = JsonSerializer.SerializeToElement(t); t.Status = States.Accepted; t.Program = Rules.ProgramFor(t.StudentName, t.BirthDate); db.Track(access.Id, t, before); db.Notify(t.ParentId, "Tiếp nhận học thử", $"Đã tiếp nhận đơn học thử của {t.StudentName}."); await db.SaveChangesAsync(); await tx.CommitAsync(); return new { message = "Tiếp nhận thành công!" };
    }
    [Authorize(Roles = Roles.Operations), HttpPost("{id:guid}/propose")]
    public async Task<object> Propose(Guid id, SessionInput input)
    {
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable); await SqlLocks.HoldSession(db, input.SessionId); var t = await Get(id); var (s, c) = await access.Session(input.SessionId);
        Rules.Require(t.Status is States.Accepted or States.TrialReschedule, "Đơn không còn ở trạng thái được xếp ca học thử.");
        Rules.Require(s.Program == t.Program && Rules.At(s.Date, s.Start) > Rules.Now, "Ca học thử không phù hợp.");
        var regular = (await schedule.RegularStudents(s)).Count; var held = await db.Leaves.CountAsync(l => l.MakeUpSessionId == s.Id && (l.Status == States.Registered || l.Status == States.Approval || l.Status == States.Approved));
        Rules.Require(regular + held + await schedule.TrialCount(s.Id) < 7, "Ca học đã đầy.");
        var before = JsonSerializer.SerializeToElement(t); t.SessionId = s.Id; t.Status = States.ParentConfirm; db.Track(access.Id, t, before); db.Notify(t.ParentId, "Đề xuất lịch học thử", $"Mời xác nhận ca học thử cho {t.StudentName} vào {s.Date:dd/MM/yyyy}, {s.Start}."); await db.SaveChangesAsync(); await tx.CommitAsync(); return new { message = "Đã gửi đề xuất lịch học thử." };
    }
    [Authorize(Roles = Roles.Parent), HttpPost("{id:guid}/confirm")]
    public async Task<object> Confirm(Guid id)
    {
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable); var t = await Get(id); Rules.Require(t.Status == States.ParentConfirm, "Đơn không chờ xác nhận."); var (s, c) = await access.Session(t.SessionId!.Value); Rules.Require(Rules.At(s.Date, s.Start) > Rules.Now, "Ca học đã diễn ra.");
        var before = JsonSerializer.SerializeToElement(t); t.Status = States.TrialApproval; db.Track(access.Id, t, before); foreach (var u in await db.Users.Where(x => x.BranchId == access.BranchId && (x.Role == Roles.Assistant || x.Role == Roles.Manager)).ToListAsync()) db.Notify(u.Id, "Xác nhận học thử", $"Phụ huynh đã xác nhận lịch của {t.StudentName}."); await db.SaveChangesAsync(); await tx.CommitAsync(); return new { message = "Xác nhận lịch học thử thành công!" };
    }
    public record Approval(bool Approve);
    [Authorize(Roles = Roles.Manager), HttpPost("{id:guid}/approve")]
    public async Task<object> Approve(Guid id, Approval input)
    {
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable); var t = await Get(id); Rules.Require(t.Status == States.TrialApproval, "Đơn không chờ duyệt."); var before = JsonSerializer.SerializeToElement(t);
        var (s, c) = await access.Session(t.SessionId!.Value); Rules.Require(Rules.At(s.Date, s.Start) > Rules.Now, "Ca học đã diễn ra.");
        if (input.Approve) { var held = await db.Leaves.CountAsync(l => l.MakeUpSessionId == s.Id && (l.Status == States.Registered || l.Status == States.Approval || l.Status == States.Approved)); Rules.Require((await schedule.RegularStudents(s)).Count + held + await schedule.TrialCount(s.Id) <= 7, "Ca học vượt sĩ số."); t.Status = States.Scheduled; db.Notify(t.ParentId, "Lịch học thử đã duyệt", $"Lịch của {t.StudentName}: {s.Date:dd/MM/yyyy} {s.Start}."); db.Notify(s.TeacherId, "Học viên học thử", $"Ca {s.Date:dd/MM/yyyy} có học viên học thử {t.StudentName}."); }
        else { t.Status = States.TrialReschedule; t.SessionId = null;foreach(var assistant in await db.Users.Where(u=>u.BranchId==access.BranchId&&u.Role==Roles.Assistant&&!u.Locked).Select(u=>u.Id).ToListAsync())db.Notify(assistant,"Cần xếp lại ca học thử",$"Đơn của {t.StudentName} đã về Chờ xếp ca học thử."); }
        db.Track(access.Id, t, before); await db.SaveChangesAsync(); await tx.CommitAsync(); return new { message = input.Approve ? "Đã duyệt ca học thử." : "Đã trả đơn về Chờ xếp ca học thử." };
    }
    [Authorize(Roles = Roles.Teacher), HttpPost("{id:guid}/evaluate")]
    public async Task<object> Evaluate(Guid id, Evaluation input)
    {
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable); var t = await Get(id); Rules.Require(t.Status == States.Scheduled, "Đơn không ở trạng thái Đã xếp ca."); var (s, c) = await access.Session(t.SessionId!.Value, true);
        Rules.Require(Rules.At(s.Date, s.End) <= Rules.Now && await db.TrialAttendances.AnyAsync(a => a.TrialId == id && a.SessionId == s.Id && a.Present) && s.Closed, "Buổi học thử chưa hoàn thành hoặc học viên không có mặt.");
        Rules.Text(input.Lines, "nét vẽ"); Rules.Text(input.Colors, "màu sắc"); Rules.Text(input.Learning, "khả năng tiếp thu"); var before = JsonSerializer.SerializeToElement(t); t.Lines = input.Lines; t.Colors = input.Colors; t.Learning = input.Learning; t.Status = States.Completed; db.Track(access.Id, t, before); await db.SaveChangesAsync(); await tx.CommitAsync(); return new { message = "Đã lưu đánh giá học thử." };
    }
    [Authorize(Roles = Roles.Operations), HttpPost("{id:guid}/consult")]
    public async Task<object> Consult(Guid id, Consultation input)
    {
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable); var t = await Get(id); Rules.Require(t.Status is States.Completed or States.Consulted, "Giáo viên chưa nhập đánh giá năng lực."); Rules.Text(input.Roadmap, "lộ trình đề xuất"); Rules.Require(input.Decision is "Đăng ký chính thức" or "Chưa quyết định" or "Không đăng ký", "Quyết định không hợp lệ.");
        var before = JsonSerializer.SerializeToElement(t); t.Roadmap = input.Roadmap; t.Decision = input.Decision; t.InternalNote = input.InternalNote; t.Status = States.Consulted; db.Track(access.Id, t, before); await db.SaveChangesAsync(); await tx.CommitAsync(); return new { message = "Cập nhật kết quả tư vấn thành công!" };
    }
}
