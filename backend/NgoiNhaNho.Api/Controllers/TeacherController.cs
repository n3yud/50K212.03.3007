using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NgoiNhaNho.Api.Auth;
using NgoiNhaNho.Api.Common;
using NgoiNhaNho.Api.Data;
using NgoiNhaNho.Api.Dtos;
using NgoiNhaNho.Api.Services;

namespace NgoiNhaNho.Api.Controllers;

public record FinalizeRequest(string? Key, Dictionary<string, string>? Records);
public record CommentRequest(int StudentId, string? Key, string? Stroke, string? Color, string? Absorb);
public record AssessRequest(string? Stroke, string? Color, string? Absorb);

/// <summary>Giáo viên (UC 11–12): CHỈ thao tác trên ca được phân công cho chính mình (BR-UC11-01).</summary>
[ApiController, Route("api/teacher"), Authorize(Roles = Roles.Teacher)]
public class TeacherController(AppDbContext db, ScheduleService sch, ReviewService rev, Notifier nt, IConfiguration cfg, IWebHostEnvironment env) : ControllerBase
{
    private async Task<(ClassRoom Cls, DateOnly Date, SessionInfo Info)> Own(string? key)
    {
        var (cid, date) = ScheduleService.ParseKey(key);
        var c = await sch.GetClassAsync(cid);
        if (c.TeacherId != User.UserId()) throw ApiException.Forbidden();
        return (c, date, sch.Info(c, date));
    }

    private record RosterItem(string Id, string Name, string Kind);
    /// <summary>Danh sách điểm danh: học viên chính thức + học bù đã duyệt + học thử đã xếp ca. Id dạng "s12" / "t5" để không trùng giữa học viên và đơn học thử.</summary>
    private async Task<List<RosterItem>> RosterAsync(int classId, DateOnly date)
    {
        var res = new List<RosterItem>();
        var official = await db.StudentClasses.Where(x => x.ClassId == classId && x.IsActive && x.Student!.Status == "Đang học").Select(x => new { x.Student!.StudentId, x.Student.FullName }).ToListAsync();
        res.AddRange(official.Select(s => new RosterItem($"s{s.StudentId}", s.FullName, "Chính thức")));
        var bu = await db.Absences.Where(a => a.MakeupClassId == classId && a.MakeupDate == date && a.Status == "Đã xếp lịch bù").Select(a => new { a.Student!.StudentId, a.Student.FullName }).ToListAsync();
        res.AddRange(bu.Select(s => new RosterItem($"s{s.StudentId}", s.FullName, "Học bù")));
        var trials = await db.Trials.Where(t => t.SessionClassId == classId && t.SessionDate == date && (t.Status == "Đã xếp ca" || t.Status == "Đã hoàn thành" || t.Status == "Đã tư vấn")).ToListAsync();
        res.AddRange(trials.Select(t => new RosterItem($"t{t.TrialId}", t.StudentName, "Học thử")));
        return res;
    }

    [HttpGet("today")]
    public async Task<List<Dictionary<string, object?>>> Today()
    {
        var t = Rules.Today; var me = User.UserId(); var res = new List<Dictionary<string, object?>>();
        foreach (var c in await db.Classes.Include(c => c.Teacher).Where(c => c.TeacherId == me && (c.Weekday == (byte)Rules.Weekday(t) || c.Weekday2 == (byte)Rules.Weekday(t))).OrderBy(c => c.StartTime).ToListAsync())
            res.Add(Flat.Of(sch.Info(c, t), ("load", await sch.LoadAsync(c.ClassId, t)), ("finalized", await db.Attendances.AnyAsync(a => a.ClassId == c.ClassId && a.SessionDate == t)), ("count", (await RosterAsync(c.ClassId, t)).Count)));
        return res;
    }

    [HttpGet("roster")]
    public async Task<object> Roster([FromQuery] string key)
    {
        var (c, date, info) = await Own(key);
        var att = await db.Attendances.Include(a => a.Records).FirstOrDefaultAsync(a => a.ClassId == c.ClassId && a.SessionDate == date);
        var month = date.ToString("yyyy-MM"); var list = new List<object>();
        foreach (var r in await RosterAsync(c.ClassId, date))
        {
            var type = r.Id[0] == 's' ? "Student" : "Trial"; var pid = int.Parse(r.Id[1..]);
            list.Add(new { id = r.Id, name = r.Name, kind = r.Kind, status = att?.Records.FirstOrDefault(x => x.PersonType == type && x.PersonId == pid)?.Status,
                remaining = r.Kind == "Chính thức" ? await sch.RemainingAsync(pid, month) : (int?)null });
        }
        return new { session = info, finalized = att != null, students = list };
    }

    /// <summary>Chốt điểm danh (BR-UC11-03..08). Cũng dùng cho dữ liệu đồng bộ từ chế độ ngoại tuyến.</summary>
    [HttpPost("attendance/finalize")]
    public async Task<List<object>> Finalize(FinalizeRequest req)
    {
        var (c, date, info) = await Own(req.Key);
        var roster = await RosterAsync(c.ClassId, date);
        if (roster.Count == 0) throw new ApiException("Ca học này chưa có học viên");
        if (await db.Attendances.AnyAsync(a => a.ClassId == c.ClassId && a.SessionDate == date)) throw new ApiException("Ca học này đã chốt điểm danh");
        var rec = req.Records ?? new();
        if (roster.Any(r => !rec.TryGetValue(r.Id, out var v) || v is not ("present" or "absent"))) throw new ApiException("Vui lòng điểm danh đủ học viên trong ca học!");

        var att = new Attendance { ClassId = c.ClassId, SessionDate = date, FinalizedAt = Rules.Now, FinalizedBy = User.UserId() };
        foreach (var r in roster) att.Records.Add(new AttendanceRecord { PersonType = r.Id[0] == 's' ? "Student" : "Trial", PersonId = int.Parse(r.Id[1..]), Status = rec[r.Id] });
        db.Attendances.Add(att);
        await db.SaveChangesAsync();

        foreach (var r in roster.Where(r => rec[r.Id] == "absent" && r.Kind != "Học thử"))
        {
            var sid = int.Parse(r.Id[1..]); var s = await db.Students.FirstAsync(x => x.StudentId == sid);
            await nt.ToParentOfAsync(s.ParentPhone, "Học viên vắng mặt", $"Bé {s.FullName} vắng mặt ở ca {info.Code} ngày {info.Date}.");
            if (!await db.Absences.AnyAsync(a => a.StudentId == sid && a.ClassId == c.ClassId && a.SessionDate == date))
                await nt.ToRoleAsync("assistant", "Học viên vắng đột xuất cần ghi nhận", $"{s.FullName} – ca {info.Code}. Vui lòng ghi nhận lịch nghỉ.");
        }
        await db.SaveChangesAsync();
        var month = date.ToString("yyyy-MM"); var res = new List<object>();
        foreach (var r in roster.Where(r => rec[r.Id] == "present" && r.Kind == "Chính thức")) res.Add(new { name = r.Name, remaining = await sch.RemainingAsync(int.Parse(r.Id[1..]), month) });
        return res;
    }

    [HttpGet("schedule")]
    public async Task<object> Schedule([FromQuery] string? from)
    {
        var start = Rules.StartOfWeek(Validators.TryDate(from, out var f) ? f : Rules.Today); var me = User.UserId();
        var classes = await db.Classes.Include(c => c.Teacher).Where(c => c.TeacherId == me).ToListAsync();
        var map = await sch.LoadMapAsync(start, start.AddDays(6)); var days = new List<object>();
        for (var i = 0; i < 7; i++)
        {
            var d = start.AddDays(i); var ss = classes.Where(c => c.Meets(Rules.Weekday(d))).OrderBy(c => c.StartTime).ToList();
            if (ss.Count == 0) continue;
            days.Add(new { date = d.ToString("yyyy-MM-dd"), sessions = ss.Select(c => { var l = map.Get(c.ClassId, d); return new SessionWithLoad(sch.Info(c, d), l); }).Select(s => new { s.Key, s.Name, s.Code, s.Start, s.End, s.Load, makeupCount = s.Load.Bu, trialCount = s.Load.Trials }).ToList() });
        }
        return new { start = start.ToString("yyyy-MM-dd"), days };
    }

    /// <summary>Ca đã diễn ra hôm nay + các ca quá hạn còn thiếu ảnh/nhận xét trong 7 ngày (giáo viên vẫn được cập nhật bù)</summary>
    [HttpGet("done-sessions")]
    public async Task<List<Dictionary<string, object?>>> DoneSessions()
    {
        var t = Rules.Today; var me = User.UserId(); var classes = await db.Classes.Include(c => c.Teacher).Where(c => c.TeacherId == me).ToListAsync();
        var res = new List<Dictionary<string, object?>>();
        for (var i = 0; i <= 7; i++)
        {
            var d = t.AddDays(-i);
            foreach (var c in classes.Where(c => c.Meets(Rules.Weekday(d)) && Rules.Ended(d, c.EndTime)))
            {
                var r = await rev.ReviewAsync(c, d);
                if (i == 0 || (r.HasAttendance && !r.Complete)) res.Add(r.ToJson());
            }
        }
        return res;
    }

    [HttpGet("present")]
    public async Task<object> Present([FromQuery] string key)
    {
        var (c, date, info) = await Own(key);
        var att = await db.Attendances.Include(a => a.Records).FirstOrDefaultAsync(a => a.ClassId == c.ClassId && a.SessionDate == date);
        var ids = att?.Records.Where(r => r.PersonType == "Student" && r.Status == "present").Select(r => r.PersonId).ToList() ?? new();
        var res = new List<object>();
        foreach (var id in ids)
        {
            var s = await db.Students.FirstAsync(x => x.StudentId == id);
            var j = await db.Journal.FirstOrDefaultAsync(x => x.StudentId == id && x.ClassId == c.ClassId && x.SessionDate == date);
            res.Add(new { id, name = s.FullName, hasPhoto = j?.PhotoPath != null, photo = j?.PhotoPath, hasComment = j?.StrokeComment != null,
                comment = j?.StrokeComment == null ? null : new { stroke = j.StrokeComment, color = j.ColorComment, absorb = j.AbsorbComment } });
        }
        return new { session = info, students = res };
    }

    private async Task<JournalEntry> EntryAsync(ClassRoom c, DateOnly date, int studentId)
    {
        var info = sch.Info(c, date);
        var present = await db.AttendanceRecords.AnyAsync(r => r.Attendance!.ClassId == c.ClassId && r.Attendance.SessionDate == date && r.PersonType == "Student" && r.PersonId == studentId && r.Status == "present");
        if (!info.Ended || !present) throw new ApiException("Chỉ cập nhật cho học viên có mặt ở ca học đã diễn ra");
        var j = await db.Journal.FirstOrDefaultAsync(x => x.StudentId == studentId && x.ClassId == c.ClassId && x.SessionDate == date);
        if (j == null) { j = new JournalEntry { StudentId = studentId, ClassId = c.ClassId, SessionDate = date, TeacherId = User.UserId() }; db.Journal.Add(j); }
        return j;
    }

    /// <summary>Đăng ảnh tác phẩm: nhận file thật (multipart), lưu vào wwwroot/uploads/yyyyMM/ (UC 12)</summary>
    [HttpPost("journal/photo"), RequestSizeLimit(11 * 1024 * 1024)]
    public async Task<object> UploadPhoto([FromForm] int studentId, [FromForm] string key, IFormFile? file)
    {
        var (c, date, _) = await Own(key);
        string[] okTypes = { "image/jpeg", "image/png", "image/webp" };
        if (file == null || file.Length == 0) throw new ApiException("Vui lòng chọn ảnh tác phẩm!");
        if (!okTypes.Contains(file.ContentType) || file.Length > 10 * 1024 * 1024) throw new ApiException("Ảnh không hợp lệ. Vui lòng chọn ảnh khác!");
        var j = await EntryAsync(c, date, studentId);
        var ext = file.ContentType switch { "image/png" => ".png", "image/webp" => ".webp", _ => ".jpg" };
        var folder = Path.Combine(env.ContentRootPath, cfg["Uploads:Folder"] ?? "wwwroot/uploads", Rules.Now.ToString("yyyyMM"));
        Directory.CreateDirectory(folder);
        var name = $"{Guid.NewGuid():N}{ext}";
        await using (var fs = System.IO.File.Create(Path.Combine(folder, name))) await file.CopyToAsync(fs);
        j.PhotoPath = $"/uploads/{Rules.Now:yyyyMM}/{name}"; j.PhotoAt = Rules.Now; j.TeacherId ??= User.UserId();
        await db.SaveChangesAsync();
        return new { ok = true, photo = j.PhotoPath };
    }

    [HttpPost("journal/comment")]
    public async Task<object> SaveComment(CommentRequest req)
    {
        var (c, date, _) = await Own(req.Key);
        var e = new Dictionary<string, string>();
        if (string.IsNullOrWhiteSpace(req.Stroke)) e["stroke"] = "Vui lòng nhập đầy đủ nhận xét!";
        if (string.IsNullOrWhiteSpace(req.Color)) e["color"] = "Vui lòng nhập đầy đủ nhận xét!";
        if (string.IsNullOrWhiteSpace(req.Absorb)) e["absorb"] = "Vui lòng nhập đầy đủ nhận xét!";
        if (e.Count > 0) throw ApiException.Invalid("Vui lòng nhập đầy đủ nhận xét!", e);
        var j = await EntryAsync(c, date, req.StudentId);
        if (j.StrokeComment != null) throw new ApiException("Học viên đã có nhận xét trong ca học này");
        j.StrokeComment = req.Stroke!.Trim(); j.ColorComment = req.Color!.Trim(); j.AbsorbComment = req.Absorb!.Trim(); j.CommentAt = Rules.Now;
        await db.SaveChangesAsync();
        return new { ok = true };
    }

    // ---------- đánh giá năng lực buổi học thử ----------
    [HttpGet("trials-to-assess")]
    public async Task<List<object>> TrialsToAssess()
    {
        var me = User.UserId(); var res = new List<object>();
        foreach (var t in await db.Trials.Where(t => t.Status == "Đã xếp ca" && t.SessionClassId != null && t.AssessStroke == null).ToListAsync())
        {
            var info = await sch.InfoAsync(t.SessionKey);
            if (info.TeacherId == me && info.Ended) res.Add(new { id = t.TrialId, name = t.StudentName, session = info });
        }
        return res;
    }

    [HttpPost("trials/{id:int}/assess")]
    public async Task<object> Assess(int id, AssessRequest req)
    {
        var t = await db.Trials.FindAsync(id) ?? throw ApiException.NotFound();
        if (t.SessionClassId == null) throw ApiException.Forbidden();
        await Own(t.SessionKey);
        if (t.AssessStroke != null) throw new ApiException("Học viên đã có đánh giá năng lực");
        var e = new Dictionary<string, string>();
        if (string.IsNullOrWhiteSpace(req.Stroke)) e["stroke"] = "Vui lòng nhập đầy đủ đánh giá!";
        if (string.IsNullOrWhiteSpace(req.Color)) e["color"] = "Vui lòng nhập đầy đủ đánh giá!";
        if (string.IsNullOrWhiteSpace(req.Absorb)) e["absorb"] = "Vui lòng nhập đầy đủ đánh giá!";
        if (e.Count > 0) throw ApiException.Invalid("Vui lòng nhập đầy đủ đánh giá!", e);
        t.AssessStroke = req.Stroke!.Trim(); t.AssessColor = req.Color!.Trim(); t.AssessAbsorb = req.Absorb!.Trim(); t.AssessedBy = User.UserId(); t.AssessedAt = Rules.Now; t.Status = "Đã hoàn thành";
        await db.SaveChangesAsync();
        return new { ok = true };
    }
}
