using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NgoiNhaNho.Api.Auth;
using NgoiNhaNho.Api.Common;
using NgoiNhaNho.Api.Data;
using NgoiNhaNho.Api.Dtos;
using NgoiNhaNho.Api.Services;

namespace NgoiNhaNho.Api.Controllers;

public record RecordAbsenceRequest(int StudentId, string? Key, string? Reason);

/// <summary>Điều phối lịch học bù – Trợ lý (UC 8.x)</summary>
[ApiController, Route("api/assistant/makeup"), Authorize(Roles = Roles.Ops)]
public class MakeupController(AppDbContext db, ScheduleService sch, Notifier nt) : ControllerBase
{
    [HttpGet("students")]
    public async Task<List<object>> Students() =>
        (await db.Students.Where(s => s.Status == "Đang học").OrderBy(s => s.FullName).ToListAsync()).Select(s => (object)new { id = s.StudentId, code = s.Code, fullName = s.FullName, program = s.Program, status = s.Status }).ToList();

    /// <summary>Ca có thể ghi nhận nghỉ: chưa diễn ra, hoặc đã diễn ra + điểm danh vắng + chưa quá hạn bù (BR-UC8-02)</summary>
    [HttpGet("recordable/{studentId:int}")]
    public async Task<List<Dictionary<string, object?>>> Recordable(int studentId)
    {
        await sch.ExpireAbsencesAsync();
        _ = await db.Students.FindAsync(studentId) ?? throw ApiException.NotFound();
        var t = Rules.Today;
        var list = (await sch.NextSessionsAsync(studentId)).Select(i => (Info: i, Unrecorded: false)).ToList();
        var activeClasses = await db.StudentClasses.Where(x => x.StudentId == studentId && x.IsActive).Select(x => x.ClassId).ToListAsync();
        var oldest = t.AddDays(-Rules.MakeupDays);
        var missed = await (from r in db.AttendanceRecords
                            join a in db.Attendances on r.AttendanceId equals a.AttendanceId
                            where r.PersonType == "Student" && r.PersonId == studentId && r.Status == "absent" && a.SessionDate >= oldest && activeClasses.Contains(a.ClassId)
                            select new { a.ClassId, a.SessionDate }).ToListAsync();
        foreach (var m in missed) list.Insert(0, (await sch.InfoAsync(ScheduleService.Key(m.ClassId, m.SessionDate)), true));
        var existing = await db.Absences.Where(a => a.StudentId == studentId).Select(a => new { a.ClassId, a.SessionDate }).ToListAsync();
        var res = new List<Dictionary<string, object?>>();
        foreach (var (i, un) in list)
        {
            if (existing.Any(e => e.ClassId == i.ClassId && e.SessionDate.ToString("yyyy-MM-dd") == i.Date)) continue;
            res.Add(Flat.Of(i, ("unrecorded", un), ("remaining", await sch.RemainingAsync(studentId, i.Date[..7]))));
        }
        return res;
    }

    [HttpPost("record")]
    public async Task<AbsenceDto> Record(RecordAbsenceRequest req)
    {
        var s = await db.Students.FindAsync(req.StudentId) ?? throw ApiException.NotFound();
        var a = await sch.CreateAbsenceAsync(s, req.Key, req.Reason, User.UserId());
        await nt.ToParentOfAsync(s.ParentPhone, "Ghi nhận học viên nghỉ", $"Bé {s.FullName} nghỉ ca {await sch.LabelAsync(req.Key!)}. Ba mẹ có thể đăng ký học bù trong 30 ngày.");
        await db.SaveChangesAsync();
        return await sch.ToDtoAsync(a);
    }

    [HttpGet("pending")]
    public async Task<List<AbsenceDto>> Pending()
    {
        await sch.ExpireAbsencesAsync();
        var list = await db.Absences.Where(a => a.Status == "Chờ xếp lịch bù" || a.Status == "Đã đăng ký học bù" || (a.Status == "Hết hạn" && a.Deadline >= Rules.Today.AddDays(-7))).OrderBy(a => a.Deadline).ToListAsync();
        var res = new List<AbsenceDto>(); foreach (var a in list) res.Add(await sch.ToDtoAsync(a)); return res;
    }

    [HttpGet("{id:int}/options")]
    public async Task<List<SessionWithLoad>> Options(int id)
    {
        await sch.ExpireAbsencesAsync();
        return await sch.AvailableMakeupsAsync(await db.Absences.FindAsync(id) ?? throw ApiException.NotFound());
    }

    /// <summary>Trợ lý chọn ca bù thay phụ huynh (BR-UC8-08) – giữ chỗ giống phụ huynh tự đăng ký</summary>
    [HttpPost("{id:int}/pick")]
    public async Task<AbsenceDto> Pick(int id, KeyRequest req)
    {
        await sch.ExpireAbsencesAsync();
        var a = await db.Absences.FindAsync(id) ?? throw ApiException.NotFound();
        if (a.Status == "Hết hạn") throw new ApiException("Yêu cầu học bù này đã quá thời hạn học bù nên không thể đăng ký");
        if (a.Status != "Chờ xếp lịch bù") throw new ApiException("Yêu cầu này đã được thay đổi, không thể chọn ca");
        if (!(await sch.AvailableMakeupsAsync(a)).Any(o => o.Key == req.Key)) throw new ApiException("Ca học này vừa hết chỗ. Vui lòng chọn ca khác");
        var (cid, date) = ScheduleService.ParseKey(req.Key);
        a.MakeupClassId = cid; a.MakeupDate = date; a.Status = "Đã đăng ký học bù";
        await db.SaveChangesAsync();
        return await sch.ToDtoAsync(a);
    }

    [HttpPost("{id:int}/submit")]
    public async Task<AbsenceDto> Submit(int id)
    {
        await sch.ExpireAbsencesAsync();
        var a = await db.Absences.FindAsync(id) ?? throw ApiException.NotFound();
        if (a.Status == "Hết hạn") throw new ApiException("Yêu cầu học bù này đã quá thời hạn học bù nên không thể xử lý");
        if (a.Status != "Đã đăng ký học bù") throw new ApiException("Yêu cầu này đã được thay đổi, không thể trình duyệt");
        var s = await db.Students.FirstAsync(x => x.StudentId == a.StudentId);
        a.Status = "Chờ duyệt";
        nt.Audit("absence", id.ToString(), User.UserId().ToString(), "Đã đăng ký học bù", "Chờ duyệt", "Trình duyệt");
        await nt.ToRoleAsync("manager", "Có đề xuất xếp lịch bù chờ phê duyệt", $"{s.FullName} – bù {await sch.LabelAsync(a.MakeupKey!)}");
        await db.SaveChangesAsync();
        return await sch.ToDtoAsync(a);
    }
}
