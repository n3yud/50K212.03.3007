using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NgoiNhaNho.Api.Auth;
using NgoiNhaNho.Api.Common;
using NgoiNhaNho.Api.Data;
using NgoiNhaNho.Api.Dtos;
using NgoiNhaNho.Api.Services;

namespace NgoiNhaNho.Api.Controllers;

/// <summary>Phê duyệt (UC 13) – CHỈ vai trò Quản lý.</summary>
[ApiController, Route("api/manager"), Authorize(Roles = Roles.Manager)]
public class ApprovalsController(AppDbContext db, ScheduleService sch, Notifier nt) : ControllerBase
{
    // ---------- ca học thử ----------
    [HttpGet("trial-sessions")]
    public async Task<List<TrialSessionDto>> TrialSessions()
    {
        var trials = await db.Trials.Where(t => t.Status == "Chờ duyệt ca học thử" && t.SessionClassId != null).ToListAsync();
        var res = new List<TrialSessionDto>();
        foreach (var g in trials.GroupBy(t => t.SessionKey).OrderBy(g => g.First().SessionDate))
        {
            var info = await sch.InfoAsync(g.Key);
            res.Add(new TrialSessionDto(info, await sch.LoadAsync(info.ClassId, DateOnly.Parse(info.Date)),
                g.Select(t => new TrialStudentDto(t.TrialId, t.StudentName, t.DateOfBirth.ToString("yyyy-MM-dd"), t.Program)).ToList()));
        }
        return res;
    }

    [HttpPost("trial-sessions/approve")]
    public async Task<object> ApproveTrial(KeyRequest req)
    {
        var (cid, date) = ScheduleService.ParseKey(req.Key);
        var ts = await db.Trials.Where(t => t.SessionClassId == cid && t.SessionDate == date && t.Status == "Chờ duyệt ca học thử").ToListAsync();
        if (ts.Count == 0) throw new ApiException("Ca học thử này đã được thay đổi nên không thể xử lý");
        if ((await sch.LoadAsync(cid, date)).Base > Rules.MaxClass) throw new ApiException("Ca học thử vượt sĩ số tối đa nên không thể phê duyệt");
        var info = await sch.InfoAsync(req.Key!);
        foreach (var t in ts)
        {
            t.Status = "Đã xếp ca";
            await nt.ToParentOfAsync(t.ParentPhone, "Lịch học thử đã được xác nhận", $"Bé {t.StudentName}: {Rules.WeekdayLabel(info.Weekday)} {info.Date} · {info.Start} - {info.End}.");
            nt.Audit("trial", t.TrialId.ToString(), User.UserId().ToString(), "Chờ duyệt ca học thử", "Đã xếp ca", "Phê duyệt");
        }
        if (info.TeacherId != null) nt.ToUser(info.TeacherId.Value, "Có học viên học thử mới trong ca của bạn", $"{string.Join(", ", ts.Select(t => t.StudentName))} – {info.Date} {info.Start}-{info.End}");
        await db.SaveChangesAsync();
        return new { ok = true };
    }

    [HttpPost("trial-sessions/reject")]
    public async Task<object> RejectTrial(KeyRequest req)
    {
        var (cid, date) = ScheduleService.ParseKey(req.Key);
        var ts = await db.Trials.Where(t => t.SessionClassId == cid && t.SessionDate == date && t.Status == "Chờ duyệt ca học thử").ToListAsync();
        if (ts.Count == 0) throw new ApiException("Ca học thử này đã được thay đổi nên không thể xử lý");
        foreach (var t in ts) { t.Status = "Đã tiếp nhận"; t.SessionClassId = null; t.SessionDate = null; nt.Audit("trial", t.TrialId.ToString(), User.UserId().ToString(), "Chờ duyệt ca học thử", "Đã tiếp nhận", "Không duyệt"); } // BR-UC5-07
        await nt.ToRoleAsync("assistant", "Ca học thử không được duyệt", "Vui lòng chọn ca đề xuất khác cho các học viên học thử.");
        await db.SaveChangesAsync();
        return new { ok = true };
    }

    // ---------- đề xuất xếp bù ----------
    [HttpGet("makeups")]
    public async Task<List<AbsenceDto>> Makeups()
    {
        await sch.ExpireAbsencesAsync();
        var list = await db.Absences.Where(a => a.Status == "Chờ duyệt").OrderBy(a => a.Deadline).ToListAsync();
        var res = new List<AbsenceDto>(); foreach (var a in list) res.Add(await sch.ToDtoAsync(a)); return res;
    }

    private async Task<Absence> Pending(int id)
    {
        await sch.ExpireAbsencesAsync();
        var a = await db.Absences.FindAsync(id) ?? throw ApiException.NotFound();
        if (a.Status == "Hết hạn") throw new ApiException("Đề xuất này đã quá hạn học bù nên không thể xử lý");
        if (a.Status != "Chờ duyệt") throw new ApiException("Đề xuất này đã được thay đổi nên không thể xử lý");
        return a;
    }

    [HttpPost("makeups/{id:int}/approve")]
    public async Task<object> ApproveMakeup(int id)
    {
        var a = await Pending(id);
        var s = await db.Students.FirstAsync(x => x.StudentId == a.StudentId);
        var info = await sch.InfoAsync(a.MakeupKey!);
        a.Status = "Đã xếp lịch bù";
        nt.Audit("absence", id.ToString(), User.UserId().ToString(), "Chờ duyệt", a.Status, "Phê duyệt");
        await nt.ToParentOfAsync(s.ParentPhone, "Lịch học bù đã được phê duyệt", $"Bé {s.FullName} học bù: {Rules.WeekdayLabel(info.Weekday)} {info.Date} · {info.Start} - {info.End}.");
        if (info.TeacherId != null) nt.ToUser(info.TeacherId.Value, "Có học viên học bù trong ca của bạn", $"{s.FullName} – {info.Date} {info.Start}-{info.End}");
        await db.SaveChangesAsync();
        return new { ok = true };
    }

    [HttpPost("makeups/{id:int}/reject")]
    public async Task<object> RejectMakeup(int id)
    {
        var a = await Pending(id);
        var s = await db.Students.FirstAsync(x => x.StudentId == a.StudentId);
        a.Status = "Chờ xếp lịch bù"; a.MakeupClassId = null; a.MakeupDate = null;
        nt.Audit("absence", id.ToString(), User.UserId().ToString(), "Chờ duyệt", a.Status, "Không duyệt");
        await nt.ToRoleAsync("assistant", "Đề xuất học bù không được duyệt", $"{s.FullName} cần được chọn lại ca học bù.");
        await db.SaveChangesAsync();
        return new { ok = true };
    }
}
