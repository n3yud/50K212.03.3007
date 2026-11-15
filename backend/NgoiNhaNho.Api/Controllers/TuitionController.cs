using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NgoiNhaNho.Api.Auth;
using NgoiNhaNho.Api.Common;
using NgoiNhaNho.Api.Data;
using NgoiNhaNho.Api.Services;

namespace NgoiNhaNho.Api.Controllers;

public record RecordTuitionRequest(int StudentId, string? Month);

/// <summary>Học phí (UC 9): tra cứu và ghi nhận.</summary>
[ApiController, Route("api/assistant/tuition"), Authorize(Roles = Roles.Ops)]
public class TuitionController(AppDbContext db, ScheduleService sch, Notifier nt) : ControllerBase
{
    [HttpGet]
    public async Task<List<object>> Search([FromQuery] string? q, [FromQuery] string? month, [FromQuery] string? status)
    {
        var m = string.IsNullOrEmpty(month) ? Rules.Month(Rules.Today) : month;
        var k = (q ?? "").Trim().ToLower();
        var students = await db.Students.Where(s => s.Status == "Đang học" && (k == "" || s.FullName.ToLower().Contains(k) || s.Code.ToLower().Contains(k))).OrderBy(s => s.Code).ToListAsync();
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
            .Select(g => new { g.Key, N = g.Count() })
            .ToDictionaryAsync(x => x.Key, x => x.N);

        var res = new List<object>();
        foreach (var s in students)
        {
            tuition.TryGetValue(s.StudentId, out var tu);
            var st = tu?.Status ?? "Chưa thanh toán";
            if (!string.IsNullOrEmpty(status) && st != status) continue;
            
            var rem = 0;
            if (tu != null && tu.Status == "Đã thanh toán")
            {
                var cids = studentClassMap.GetValueOrDefault(s.StudentId) ?? new HashSet<int>();
                var presCount = attendedMonth.Count(x => x.PersonId == s.StudentId && cids.Contains(x.ClassId));
                var absCount = absentMonth.GetValueOrDefault(s.StudentId);
                rem = Math.Max(0, tu.TotalSessions - presCount - absCount);
            }
            
            res.Add(new { studentId = s.StudentId, code = s.Code, fullName = s.FullName, program = s.Program, parentPhone = s.ParentPhone, month = m, amount = Rules.Price[s.Program], status = st, total = tu?.TotalSessions ?? 0, remaining = rem });
        }
        return res;
    }

    [HttpPost("record")]
    public async Task<object> Record(RecordTuitionRequest req)
    {
        var s = await db.Students.FindAsync(req.StudentId) ?? throw ApiException.NotFound();
        if (string.IsNullOrEmpty(req.Month) || req.Month.Length != 7) throw ApiException.Invalid("Vui lòng chọn tháng", new() { ["month"] = "Vui lòng chọn tháng" });
        var tu = await db.Tuition.FirstOrDefaultAsync(t => t.StudentId == s.StudentId && t.Month == req.Month);
        if (tu?.Status == "Đã thanh toán") throw new ApiException("Học phí tháng này đã được ghi nhận");
        var classes = await db.StudentClasses.Where(x => x.StudentId == s.StudentId && x.IsActive).Select(x => new { x.Class!.Weekday, x.Class!.Weekday2 }).ToListAsync();
        var total = classes.Sum(x => Rules.CountWeekdayInMonth(x.Weekday, req.Month) + Rules.CountWeekdayInMonth(x.Weekday2, req.Month)); // xác lập số buổi của tháng (BR-UC9-06)
        if (tu == null) { tu = new TuitionRecord { StudentId = s.StudentId, Month = req.Month, Amount = Rules.Price[s.Program] }; db.Tuition.Add(tu); }
        tu.TotalSessions = total; tu.Status = "Đã thanh toán"; tu.PaidAt = Rules.Now; tu.RecordedBy = User.UserId();
        nt.Audit("tuition", $"{s.StudentId}|{req.Month}", User.UserId().ToString(), "Chưa thanh toán", "Đã thanh toán", req.Month);
        await db.SaveChangesAsync();
        return new { ok = true };
    }
}
