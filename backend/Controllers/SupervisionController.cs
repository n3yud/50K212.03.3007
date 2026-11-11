using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
namespace NgoiNhaNho;
[ApiController, Authorize(Roles = Roles.Supervisor), Route("api/supervision")]
public class SupervisionController(AppDb db, Access access) : ControllerBase
{
    [HttpGet("export")]
    public async Task<IActionResult> Export(DateOnly from, DateOnly to)
    {
        var list = await Inspect(from, to); var rows = new List<object?[]> { new object?[] { "Ca học", "Ngày", "Lớp", "Giáo viên", "Có mặt", "Thiếu ảnh", "Thiếu nhận xét", "Thiếu tiến độ", "Quá hạn" } };
        rows.AddRange(list.Select(x => new object?[] { x.SessionId, x.Date, x.ClassName, x.Teacher, x.Present, x.MissingArtworks, x.MissingReviews, x.MissingProgress, x.Overdue })); return File(Spreadsheet.Create(rows), Spreadsheet.ContentType, "giam-sat-tien-do.xlsx");
    }
    public record Inspection(Guid SessionId, DateOnly Date, string ClassName, Guid TeacherId, string Teacher, int Present, int MissingArtworks, int MissingReviews, int MissingProgress, bool Overdue, bool LateCompletion);
    private async Task<List<Inspection>> Inspect(DateOnly from, DateOnly to)
    {
        Rules.Require(to >= from && to.DayNumber - from.DayNumber <= 366, "Khoảng ngày không hợp lệ."); var list = await (from s in db.Sessions join c in db.Classes on s.ClassId equals c.Id join u in db.Users on s.TeacherId equals u.Id where !s.Cancelled && c.BranchId == access.BranchId && s.Date >= @from && s.Date <= to select new { s, c, u.Name }).ToListAsync(); var result = new List<Inspection>();
        foreach (var x in list)
        {
            if (Rules.At(x.s.Date, x.s.End) > Rules.Now) continue;
            var ids = await db.Attendances.Where(a => a.SessionId == x.s.Id && a.Present && x.s.Closed).Select(a => a.StudentId).ToListAsync(); var a = await db.Artworks.Where(a => a.SessionId == x.s.Id && ids.Contains(a.StudentId)).ToListAsync(); var r = await db.Reviews.Where(a => a.SessionId == x.s.Id && ids.Contains(a.StudentId)).ToListAsync();
            var missingArt = ids.Count(id => !a.Any(y => y.StudentId == id)); var missingReview = ids.Count(id => !r.Any(y => y.StudentId == id)); var progressIds = await db.Progress.Where(p => p.SessionId == x.s.Id).Select(p => p.StudentId).ToListAsync(); var missingProgress = ids.Count(id => !progressIds.Contains(id)); var deadline = Rules.At(x.s.Date.AddDays(1), TimeOnly.MinValue);
            result.Add(new Inspection(x.s.Id, x.s.Date, x.c.Name, x.s.TeacherId, x.Name, ids.Count, missingArt, missingReview, missingProgress, Rules.Now >= deadline && (missingArt > 0 || missingReview > 0 || missingProgress > 0), a.Any(y => y.CreatedAt >= deadline) || r.Any(y => y.CreatedAt >= deadline)));
        }
        return result;
    }
    [HttpGet]
    public async Task<object> List(DateOnly from, DateOnly to) => await Inspect(from, to);
    public record ReminderInput(Guid[] SessionIds);
    [HttpPost("remind")]
    public async Task<object> Remind(ReminderInput input)
    {
        Rules.Require(input.SessionIds.Length is > 0 and <= 100, "Vui lòng chọn 1–100 ca học."); var rows = await db.Sessions.Where(s => input.SessionIds.Contains(s.Id)).ToListAsync(); Rules.Require(rows.Count == input.SessionIds.Distinct().Count(), "Ca học không tồn tại.");
        var inspected = await Inspect(rows.Min(x => x.Date), rows.Max(x => x.Date)); var selected = inspected.Where(x => input.SessionIds.Contains(x.SessionId)).ToList(); Rules.Require(selected.Count == rows.Count && selected.All(x => x.Overdue), "Chỉ nhắc nhở ca học vi phạm thời hạn tại cơ sở của bạn.");
        var assistants = await db.Users.Where(u => u.BranchId == access.BranchId && u.Role == Roles.Assistant && !u.Locked).Select(u => u.Id).ToListAsync();
        foreach (var r in selected) { if (r.MissingArtworks > 0 || r.MissingReviews > 0) db.Notify(r.TeacherId, "Nhắc nhở cập nhật buổi học", $"Ca {r.SessionId}, {r.Date:dd/MM/yyyy}, lớp {r.ClassName}: thiếu ảnh của {r.MissingArtworks} học viên, thiếu nhận xét của {r.MissingReviews} học viên."); if (r.MissingProgress > 0) foreach (var id in assistants) db.Notify(id, "Nhắc nhở cập nhật tiến độ", $"Ca {r.SessionId}, {r.Date:dd/MM/yyyy}, lớp {r.ClassName}: còn {r.MissingProgress} học viên chưa được ghi nhận tiến độ."); }
        await db.SaveChangesAsync(); return new { message = "Gửi nhắc nhở vi phạm tiến độ thành công!" };
    }
}
