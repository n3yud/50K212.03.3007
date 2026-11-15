using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NgoiNhaNho.Api.Auth;
using NgoiNhaNho.Api.Common;
using NgoiNhaNho.Api.Data;
using NgoiNhaNho.Api.Services;

namespace NgoiNhaNho.Api.Controllers;

public record RecordProgressRequest(int StudentId, string? Key, string? EvalDate, string? Status);

/// <summary>Tiến độ học tập do Trợ lý ghi nhận (UC 10.x)</summary>
[ApiController, Route("api/assistant/progress"), Authorize(Roles = Roles.Ops)]
public class ProgressController(AppDbContext db, ScheduleService sch) : ControllerBase
{
    /// <summary>Ca đã kết thúc mà học viên có mặt nhưng chưa được ghi nhận tiến độ</summary>
    [HttpGet("open-sessions/{studentId:int}")]
    public async Task<List<Dictionary<string, object?>>> OpenSessions(int studentId)
    {
        var done = await db.ProgressRecords.Where(p => p.StudentId == studentId).Select(p => new { p.ClassId, p.SessionDate }).ToListAsync();
        var classIds = await db.StudentClasses.Where(x => x.StudentId == studentId && x.IsActive).Select(x => x.ClassId).ToListAsync();
        var present = await (from r in db.AttendanceRecords
                             join a in db.Attendances on r.AttendanceId equals a.AttendanceId
                             where r.PersonType == "Student" && r.PersonId == studentId && r.Status == "present" && classIds.Contains(a.ClassId)
                             select new { a.ClassId, a.SessionDate }).ToListAsync();
        var res = new List<Dictionary<string, object?>>();
        foreach (var p in present.Where(p => !done.Any(d => d.ClassId == p.ClassId && d.SessionDate == p.SessionDate)).OrderByDescending(p => p.SessionDate))
        {
            var i = await sch.InfoAsync(ScheduleService.Key(p.ClassId, p.SessionDate));
            if (i.Ended) res.Add(Flat.Of(i));
        }
        return res;
    }

    [HttpPost("record")]
    public async Task<object> Record(RecordProgressRequest req)
    {
        var e = new Dictionary<string, string>();
        if (!Validators.TryDate(req.EvalDate, out var eval)) e["evalDate"] = "Vui lòng nhập đầy đủ thông tin!";
        if (req.Status is not ("Đúng tiến độ" or "Chậm tiến độ")) e["status"] = "Vui lòng nhập đầy đủ thông tin!";
        if (e.Count > 0) throw ApiException.Invalid("Vui lòng nhập đầy đủ thông tin!", e);
        var s = await db.Students.FindAsync(req.StudentId) ?? throw ApiException.NotFound();
        var (cid, date) = ScheduleService.ParseKey(req.Key);
        var info = await sch.InfoAsync(req.Key!);
        if (!info.Ended) throw new ApiException("Chỉ ghi nhận tiến độ cho ca học đã kết thúc");
        if (eval < date || eval > Rules.Today) throw ApiException.Invalid("Ngày đánh giá không hợp lệ!", new() { ["evalDate"] = "Ngày đánh giá không hợp lệ!" });
        if (await db.ProgressRecords.AnyAsync(p => p.StudentId == s.StudentId && p.ClassId == cid && p.SessionDate == date)) throw new ApiException("Ca học này đã được ghi nhận tiến độ");
        db.ProgressRecords.Add(new ProgressRecord { StudentId = s.StudentId, ClassId = cid, SessionDate = date, EvalDate = eval, Status = req.Status!, TeacherId = info.TeacherId, RecordedBy = User.UserId(), RecordedAt = Rules.Now });
        await db.SaveChangesAsync();
        return new { ok = true };
    }

    [HttpGet("history")]
    public async Task<List<object>> History([FromQuery] string? q, [FromQuery] string? program, [FromQuery] string? status)
    {
        var k = (q ?? "").Trim().ToLower();
        var counts = await db.ProgressRecords.GroupBy(p => p.StudentId).Select(g => new { g.Key, N = g.Count() }).ToDictionaryAsync(x => x.Key, x => x.N);
        var list = await db.Students.Where(s => (k == "" || s.FullName.ToLower().Contains(k) || s.Code.ToLower().Contains(k)) && (string.IsNullOrEmpty(program) || s.Program == program) && (string.IsNullOrEmpty(status) || s.Status == status)).OrderBy(s => s.Code).ToListAsync();
        return list.Select(s => (object)new { id = s.StudentId, code = s.Code, fullName = s.FullName, program = s.Program, status = s.Status, count = counts.GetValueOrDefault(s.StudentId) }).ToList();
    }

    [HttpGet("history/{studentId:int}")]
    public async Task<List<object>> HistoryOf(int studentId)
    {
        var s = await db.Students.FindAsync(studentId) ?? throw ApiException.NotFound();
        var list = await db.ProgressRecords.Where(p => p.StudentId == studentId).OrderByDescending(p => p.EvalDate).ToListAsync();
        var users = await db.Users.ToDictionaryAsync(u => u.UserId);
        var res = new List<object>();
        foreach (var p in list)
        {
            var j = await db.Journal.FirstOrDefaultAsync(x => x.StudentId == studentId && x.ClassId == p.ClassId && x.SessionDate == p.SessionDate);
            res.Add(new { id = p.ProgressId, status = p.Status, evalDate = p.EvalDate.ToString("yyyy-MM-dd"), program = s.Program, session = await sch.InfoAsync(ScheduleService.Key(p.ClassId, p.SessionDate)),
                teacher = p.TeacherId != null && users.TryGetValue(p.TeacherId.Value, out var t) ? t.DisplayName : "", byName = p.RecordedBy != null && users.TryGetValue(p.RecordedBy.Value, out var b) ? b.FullName : "",
                comment = j?.StrokeComment == null ? null : new { stroke = j.StrokeComment, color = j.ColorComment, absorb = j.AbsorbComment } });
        }
        return res;
    }

    /// <summary>Danh sách học viên cần đánh giá lại: tiến độ gần nhất là "Chậm tiến độ"</summary>
    [HttpGet("need-review")]
    public async Task<List<object>> NeedReview([FromQuery] string? program, [FromQuery] int? classId, [FromQuery] int? teacherId)
    {
        var all = await db.ProgressRecords.ToListAsync();
        var latest = all.GroupBy(p => p.StudentId).Select(g => g.OrderByDescending(p => p.EvalDate).ThenByDescending(p => p.RecordedAt).First()).Where(p => p.Status == "Chậm tiến độ").ToList();
        var res = new List<object>();
        foreach (var p in latest)
        {
            var s = await db.Students.FirstAsync(x => x.StudentId == p.StudentId);
            if (s.Status != "Đang học" || (!string.IsNullOrEmpty(program) && s.Program != program)) continue;
            var classes = await db.Classes.Include(c => c.Teacher)
                .Where(c => db.StudentClasses.Any(sc => sc.ClassId == c.ClassId && sc.StudentId == s.StudentId && sc.IsActive))
                .ToListAsync();
            foreach (var c in classes.Where(c => (classId == null || c.ClassId == classId) && (teacherId == null || c.TeacherId == teacherId)))
                res.Add(new { studentId = s.StudentId, fullName = s.FullName, program = s.Program, className = c.Name, teacher = c.Teacher?.DisplayName ?? "", status = p.Status, lastEval = p.EvalDate.ToString("yyyy-MM-dd") });
        }
        return res;
    }
}
