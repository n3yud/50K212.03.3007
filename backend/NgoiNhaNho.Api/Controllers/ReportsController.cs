using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NgoiNhaNho.Api.Auth;
using NgoiNhaNho.Api.Common;
using NgoiNhaNho.Api.Data;
using NgoiNhaNho.Api.Services;

namespace NgoiNhaNho.Api.Controllers;

/// <summary>Báo cáo & thống kê (UC 14) – CHỈ vai trò Quản lý.</summary>
[ApiController, Route("api/manager/reports"), Authorize(Roles = Roles.Manager)]
public class ReportsController(AppDbContext db, ScheduleService sch) : ControllerBase
{
    private static (DateOnly From, DateOnly To) Range(string? mode, string? from, string? to)
    {
        var t = Rules.Today;
        if (Validators.TryDate(from, out var f) && Validators.TryDate(to, out var e)) return (f, e); // khoảng ngày tự chọn luôn được ưu tiên
        if (mode == "month") return (new DateOnly(t.Year, t.Month, 1), t);
        return (Rules.StartOfWeek(t), t);
    }

    [HttpGet("students")]
    public async Task<object> Students([FromQuery] string? mode, [FromQuery] string? from, [FromQuery] string? to)
    {
        var (f, e) = Range(mode, from, to);
        if (f > e) throw new ApiException("Khoảng thời gian không hợp lệ");
        var all = await db.Students.ToListAsync();
        if (all.Count == 0) throw new ApiException("Không có dữ liệu thống kê trong khoảng thời gian này");
        var fromDt = f.ToDateTime(TimeOnly.MinValue); var toDt = e.AddDays(1).ToDateTime(TimeOnly.MinValue);
        // Học viên (mới + đang theo học) theo từng tuần trong khoảng thời gian – Figma "Học viên theo tuần"
        var series = new List<object>();
        for (int i = 1; i <= 10 && f.AddDays(7 * (i - 1)) <= e; i++)
        {
            var b = f.AddDays(7 * i).ToDateTime(TimeOnly.MinValue);
            series.Add(new { label = $"Tuần {i}", value = all.Count(s => s.CreatedAt < b && s.Status != "Đã bảo lưu") });
        }
        return new { from = f.ToString("yyyy-MM-dd"), to = e.ToString("yyyy-MM-dd"),
            newCount = all.Count(s => s.CreatedAt >= fromDt && s.CreatedAt < toDt && s.Status != "Đã bảo lưu"),
            oldCount = all.Count(s => s.CreatedAt < fromDt && s.Status != "Đã bảo lưu"),
            reservedCount = all.Count(s => s.Status == "Đã bảo lưu"), total = all.Count, series };
    }

    [HttpGet("operations")]
    public async Task<object> Operations([FromQuery] string? mode, [FromQuery] string? from, [FromQuery] string? to, [FromQuery] int? classId)
    {
        var (f, e) = Range(mode, from, to);
        var atts = await db.Attendances.Include(a => a.Records).Where(a => a.SessionDate >= f && a.SessionDate <= e && (classId == null || a.ClassId == classId)).ToListAsync();
        if (atts.Count == 0) throw new ApiException("Không có dữ liệu báo cáo vận hành trong khoảng thời gian này");
        var absences = await db.Absences.Select(a => new { a.StudentId, a.ClassId, a.SessionDate }).ToListAsync();
        var names = await db.Classes.ToDictionaryAsync(c => c.ClassId, c => c.Name);
        int present = 0, recs = 0, exc = 0, une = 0; var by = new Dictionary<int, (int P, int R)>();
        foreach (var a in atts)
            foreach (var r in a.Records)
            {
                recs++; var cur = by.GetValueOrDefault(a.ClassId);
                if (r.Status == "present") { present++; by[a.ClassId] = (cur.P + 1, cur.R + 1); continue; }
                by[a.ClassId] = (cur.P, cur.R + 1);
                if (r.PersonType == "Student" && absences.Any(x => x.StudentId == r.PersonId && x.ClassId == a.ClassId && x.SessionDate == a.SessionDate)) exc++; else une++;
            }
        return new { from = f.ToString("yyyy-MM-dd"), to = e.ToString("yyyy-MM-dd"), sessions = atts.Count, avgSize = (double)recs / atts.Count, rate = recs == 0 ? 0 : present * 100.0 / recs,
            excused = exc, unexcused = une, makeups = await db.Absences.CountAsync(a => a.Status == "Đã xếp lịch bù"),
            byClass = by.Select(kv => new { name = names[kv.Key], present = kv.Value.P, recs = kv.Value.R, rate = kv.Value.R == 0 ? 0 : kv.Value.P * 100.0 / kv.Value.R }).ToList() };
    }

    [HttpGet("tuition-alert")]
    public async Task<List<object>> TuitionAlert([FromQuery] int n = 2, [FromQuery] string? status = null)
    {
        var rows = await TuitionAlertRows(db, sch, n);
        var res = rows.Where(r => string.IsNullOrEmpty(status) || r.Status == status).Select(r => (object)new { studentId = r.Id, fullName = r.FullName, program = r.Program, parentPhone = r.ParentPhone, remaining = r.Remaining, status = r.Status, amount = r.Amount }).ToList();
        if (res.Count == 0) throw new ApiException("Hiện tại không có học viên nào thuộc diện cảnh báo học phí");
        return res;
    }

    public record AlertRow(int Id, string FullName, string Program, string ParentPhone, int Remaining, string Status, decimal Amount);
    public static async Task<List<AlertRow>> TuitionAlertRows(AppDbContext db, ScheduleService sch, int n = 2)
    {
        var m = Rules.Month(Rules.Today); var res = new List<AlertRow>();
        var students = await db.Students.Where(s => s.Status == "Đang học").ToListAsync();
        var tuition = await db.Tuition.Where(t => t.Month == m).ToDictionaryAsync(t => t.StudentId);
        
        var studentIds = students.Select(s => s.StudentId).ToList();
        var first = DateOnly.Parse(m + "-01");
        var next = first.AddMonths(1);
        
        var studentClasses = await db.StudentClasses.Where(x => x.IsActive && studentIds.Contains(x.StudentId)).ToListAsync();
        var studentClassMap = studentClasses.GroupBy(x => x.StudentId).ToDictionary(g => g.Key, g => g.Select(x => x.ClassId).ToHashSet());

        var attendedMonth = await (from r in db.AttendanceRecords
                                   join a in db.Attendances on r.AttendanceId equals a.AttendanceId
                                   where r.PersonType == "Student" && r.Status == "present"
                                         && a.SessionDate >= first && a.SessionDate < next
                                         && studentIds.Contains(r.PersonId)
                                   select new { r.PersonId, a.ClassId }).ToListAsync();

        var absentMonth = await db.Absences
            .Where(a => a.SessionDate >= first && a.SessionDate < next && studentIds.Contains(a.StudentId))
            .GroupBy(a => a.StudentId)
            .ToDictionaryAsync(g => g.Key, g => g.Count());

        foreach (var s in students)
        {
            var rem = 0;
            if (tuition.TryGetValue(s.StudentId, out var tu) && tu.Status == "Đã thanh toán")
            {
                var cids = studentClassMap.GetValueOrDefault(s.StudentId) ?? new HashSet<int>();
                var presCount = attendedMonth.Count(x => x.PersonId == s.StudentId && cids.Contains(x.ClassId));
                var absCount = absentMonth.GetValueOrDefault(s.StudentId);
                rem = Math.Max(0, tu.TotalSessions - presCount - absCount);
            }
            if (rem <= n)
                res.Add(new AlertRow(s.StudentId, s.FullName, s.Program, s.ParentPhone, rem, tu?.Status ?? "Chưa thanh toán", Rules.Price[s.Program]));
        }
        return res.OrderBy(r => r.Remaining).ToList();
    }
}
