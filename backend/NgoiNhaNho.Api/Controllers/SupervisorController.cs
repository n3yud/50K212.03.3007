using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NgoiNhaNho.Api.Auth;
using NgoiNhaNho.Api.Common;
using NgoiNhaNho.Api.Data;
using NgoiNhaNho.Api.Dtos;
using NgoiNhaNho.Api.Services;

namespace NgoiNhaNho.Api.Controllers;

public record RemindRequest(List<string>? Keys);

/// <summary>Giám sát tiến độ review của giáo viên (UC 15) – CHỈ vai trò Giám sát.</summary>
[ApiController, Route("api/supervisor"), Authorize(Roles = Roles.Supervisor)]
public class SupervisorController(AppDbContext db, ScheduleService sch, ReviewService rev, Notifier nt) : ControllerBase
{
    [HttpGet("teachers")]
    public async Task<List<TeacherRef>> Teachers() =>
        (await db.Users.Where(u => u.Role == "teacher" && !u.IsLocked).OrderBy(u => u.FullName).ToListAsync()).Select(u => new TeacherRef(u.UserId, u.DisplayName)).ToList();

    /// <summary>range: today | week | month | all(30 ngày). state: Đã hoàn thành | Thiếu ảnh | Thiếu nhận xét | Quá hạn</summary>
    [HttpGet("review")]
    public async Task<object> Review([FromQuery] int? teacherId, [FromQuery] string? range, [FromQuery] string? state)
    {
        var t = Rules.Today;
        var from = range switch { "today" => t, "month" => new DateOnly(t.Year, t.Month, 1), "all" => t.AddDays(-30), _ => Rules.StartOfWeek(t) };
        var classes = await db.Classes.Include(c => c.Teacher).Where(c => teacherId == null || c.TeacherId == teacherId).ToListAsync();
        var all = new List<ReviewService.Review>();
        for (var d = from; d <= t; d = d.AddDays(1))
            foreach (var c in classes.Where(c => c.Meets(Rules.Weekday(d)) && Rules.Ended(d, c.EndTime))) all.Add(await rev.ReviewAsync(c, d));
        var rows = all.Where(r => string.IsNullOrEmpty(state)
                || (state == "Thiếu ảnh" && !r.PhotoOk) || (state == "Thiếu nhận xét" && !r.CommentOk) || (state == "Quá hạn" && r.Overdue) || (state == "Đã hoàn thành" && r.Complete))
            .OrderByDescending(r => r.Info.Date).ThenBy(r => r.Info.Start).Select(r => r.ToJson()).ToList();
        return new { rows, allDone = all.Count == 0 || all.All(r => r.Complete) };
    }

    private async Task<List<ReviewService.Review>> ViolationsAsync()
    {
        var t = Rules.Today; var classes = await db.Classes.Include(c => c.Teacher).ToListAsync(); var res = new List<ReviewService.Review>();
        for (var i = 1; i <= 14; i++)
        {
            var d = t.AddDays(-i);
            foreach (var c in classes.Where(c => c.Meets(Rules.Weekday(d))))
            {
                var r = await rev.ReviewAsync(c, d);
                if (r.HasAttendance && r.Overdue) res.Add(r);
            }
        }
        return res;
    }

    [HttpGet("violations")]
    public async Task<List<Dictionary<string, object?>>> Violations() =>
        (await ViolationsAsync()).Select(r => { var j = r.ToJson(); j["responsible"] = "Giáo viên"; j["responsibleName"] = r.Info.Teacher; return j; }).ToList();

    [HttpPost("remind")]
    public async Task<int> Remind(RemindRequest req)
    {
        if (req.Keys is not { Count: > 0 }) throw new ApiException("Vui lòng chọn ca học vi phạm cần nhắc nhở");
        foreach (var key in req.Keys)
        {
            var (cid, date) = ScheduleService.ParseKey(key);
            var r = await rev.ReviewAsync(await sch.GetClassAsync(cid), date);
            if (!r.Overdue) throw new ApiException("Ca học này không còn vi phạm tiến độ");
            if (r.Info.TeacherId != null) nt.ToUser(r.Info.TeacherId.Value, "Nhắc nhở vi phạm tiến độ", $"Ca {r.Info.Code} ({date:dd/MM/yyyy}): {r.Missing}.");
            var rm = await db.Reminders.FindAsync(cid, date);
            if (rm == null) db.Reminders.Add(new Reminder { ClassId = cid, SessionDate = date, Status = "Đã gửi nhắc nhở", SentAt = Rules.Now, SentBy = User.UserId() });
            else { rm.Status = "Đã gửi nhắc nhở"; rm.SentAt = Rules.Now; rm.SentBy = User.UserId(); }
        }
        await db.SaveChangesAsync();
        return req.Keys.Count;
    }
}
