using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
namespace NgoiNhaNho;
[ApiController, Authorize(Roles = Roles.Operations), Route("api/reports")]
public class ReportsController(AppDb db, Access access) : ControllerBase
{
    [Authorize(Roles = Roles.Manager), HttpGet("export")]
    public async Task<IActionResult> Export(DateOnly from, DateOnly to, int threshold = 2)
    {
        var result = System.Text.Json.JsonSerializer.SerializeToElement(await Summary(from, to, threshold));
        var rows = new List<object?[]> { new object?[] { "Chỉ tiêu", "Giá trị" } };
        foreach (var p in result.EnumerateObject()) if (p.Value.ValueKind != System.Text.Json.JsonValueKind.Array) rows.Add(new object?[] { p.Name, p.Value.ToString() });
        rows.Add(new object?[] { "Cảnh báo học phí" }); rows.Add(new object?[] { "Học viên", "Tháng", "Học phí VNĐ", "Số buổi còn lại", "Trạng thái" });
        foreach (var fee in result.GetProperty("feeWarnings").EnumerateArray()) rows.Add(new object?[] { fee.GetProperty("Name").GetString(), fee.GetProperty("Month").GetString(), fee.GetProperty("Amount").ValueKind == System.Text.Json.JsonValueKind.Null ? null : fee.GetProperty("Amount").GetDecimal(), fee.GetProperty("Remaining").GetInt32(), fee.GetProperty("Status").GetString() });
        return File(Spreadsheet.Create(rows), Spreadsheet.ContentType, "bao-cao-lop-ve.xlsx");
    }
    [HttpGet("dashboard")]
    public async Task<object> Dashboard()
    {
        var today = Rules.Today; var weekStart = today.AddDays(-(((int)today.DayOfWeek + 6) % 7)); var week = Rules.At(weekStart, TimeOnly.MinValue);var month=Rules.Month(today);
        return new { students = await db.Students.CountAsync(s => s.BranchId == access.BranchId), warningStudents=await db.Students.CountAsync(s=>s.BranchId==access.BranchId&&s.Status==States.Studying&&!db.Tuitions.Any(t=>t.StudentId==s.Id&&t.Month==month&&t.Paid&&t.Remaining>2)), newStudents = await db.Students.CountAsync(s => s.BranchId == access.BranchId && s.CreatedAt >= week), archived = await db.Students.CountAsync(s => s.BranchId == access.BranchId && s.Status == States.Archived), todaySessions = await db.Sessions.CountAsync(s => !s.Cancelled && s.Date == today && db.Classes.Any(c => c.Id == s.ClassId && c.BranchId == access.BranchId)), pendingTrials = await db.Trials.CountAsync(t => t.BranchId == access.BranchId && t.Status == States.Received), pendingMakeUps = await db.Leaves.CountAsync(l => l.Status == States.Approval && db.Students.Any(s => s.Id == l.StudentId && s.BranchId == access.BranchId)) };
    }
    [Authorize(Roles = Roles.Manager), HttpGet]
    public async Task<object> Summary(DateOnly from, DateOnly to, int threshold = 2)
    {
        Rules.Require(to >= from && to.DayNumber - from.DayNumber <= 366 && threshold >= 0, "Bộ lọc không hợp lệ.");
        var students = await db.Students.Where(s => s.BranchId == access.BranchId && s.CreatedAt < Rules.At(to.AddDays(1), TimeOnly.MinValue)).ToListAsync();
        var ids = await db.Sessions.Where(s => !s.Cancelled && s.Date >= from && s.Date <= to && s.Closed && db.Classes.Any(c => c.Id == s.ClassId && c.BranchId == access.BranchId)).Select(s => s.Id).ToListAsync(); var marks = await db.Attendances.Where(a => ids.Contains(a.SessionId)).ToListAsync();
        var month = Rules.Month(to);
        var fees=await (from student in db.Students join fee in db.Tuitions.Where(t=>t.Month==month) on student.Id equals fee.StudentId into monthly from fee in monthly.DefaultIfEmpty() where student.BranchId==access.BranchId&&student.Status==States.Studying&&(fee==null||fee.Remaining<=threshold) select new{Name=student.Name,Month=month,Amount=fee==null?(decimal?)null:fee.Amount,Remaining=fee==null?0:fee.Remaining,Status=fee!=null&&fee.Paid?"Đã thanh toán":"Chưa thanh toán"}).ToListAsync();
        var createdFrom = Rules.At(from, TimeOnly.MinValue);
        var weekly=new List<object>();
        for(var d=from;d<=to;d=d.AddDays(7)) {var end=d.AddDays(Math.Min(6,to.DayNumber-d.DayNumber));var startAt=Rules.At(d,TimeOnly.MinValue);var endAt=Rules.At(end.AddDays(1),TimeOnly.MinValue);weekly.Add(new{label=$"{d:dd/MM}–{end:dd/MM}",count=students.Count(s=>s.CreatedAt>=startAt&&s.CreatedAt<endAt)});}
        return new { from, to, weekly, totalStudents = students.Count, newStudents = students.Count(s => s.CreatedAt >= createdFrom), oldStudents = students.Count(s => s.CreatedAt < createdFrom), archived = students.Count(s => s.Status == States.Archived), sessions = await db.Sessions.CountAsync(s => !s.Cancelled && s.Date >= from && s.Date <= to && db.Classes.Any(c => c.Id == s.ClassId && c.BranchId == access.BranchId)), finalizedSessions = ids.Count, attendanceRate = marks.Count == 0 ? (double?)null : 100.0 * marks.Count(a => a.Present) / marks.Count, averageAttendance = ids.Count == 0 ? (double?)null : (double)marks.Count(a => a.Present) / ids.Count, makeUps = await db.Leaves.CountAsync(l => l.Status == States.Approved && db.Sessions.Any(s => s.Id == l.MakeUpSessionId && s.Date >= from && s.Date <= to) && db.Students.Any(s => s.Id == l.StudentId && s.BranchId == access.BranchId)), feeWarnings = fees };
    }
}
