using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NgoiNhaNho.Api.Auth;
using NgoiNhaNho.Api.Common;
using NgoiNhaNho.Api.Data;
using NgoiNhaNho.Api.Dtos;
using NgoiNhaNho.Api.Services;

namespace NgoiNhaNho.Api.Controllers;

public record LeaveRequest(int StudentId, string? Key, string? Reason);

/// <summary>Phụ huynh (UC 3–4): chỉ xem/ghi dữ liệu của CON MÌNH (NFR-03).</summary>
[ApiController, Route("api/parent"), Authorize(Roles = Roles.Parent)]
public class ParentController(AppDbContext db, ScheduleService sch, Notifier nt) : ControllerBase
{
    private async Task<string> MyPhone() => (await db.Users.Where(u => u.UserId == User.UserId()).Select(u => u.Phone).FirstAsync()) ?? "";
    private async Task<Student> OwnKid(int studentId)
    {
        var phone = await MyPhone();
        var s = await db.Students.FindAsync(studentId);
        if (s == null || s.ParentPhone != phone) throw ApiException.Forbidden("Bạn không có quyền xem dữ liệu này");
        return s;
    }

    [HttpGet("kids")]
    public async Task<List<object>> Kids()
    {
        var phone = await MyPhone();
        return (await db.Students.Where(s => s.ParentPhone == phone).OrderBy(s => s.Code).ToListAsync()).Select(s => (object)new { id = s.StudentId, fullName = s.FullName, program = s.Program, status = s.Status }).ToList();
    }

    [HttpGet("timetable/{studentId:int}")]
    public async Task<object> Timetable(int studentId, [FromQuery] string? from)
    {
        var s = await OwnKid(studentId); await sch.ExpireAbsencesAsync();
        var start = Rules.StartOfWeek(Validators.TryDate(from, out var f) ? f : Rules.Today); var items = new List<Dictionary<string, object?>>();
        var classes = s.Status == "Đang học"
            ? await db.Classes.Include(c => c.Teacher)
                .Where(c => db.StudentClasses.Any(sc => sc.ClassId == c.ClassId && sc.StudentId == studentId && sc.IsActive))
                .ToListAsync()
            : new List<ClassRoom>();
        var absences = await db.Absences.Where(a => a.StudentId == studentId).ToListAsync();
        for (var i = 0; i < 7; i++)
        {
            var d = start.AddDays(i);
            foreach (var c in classes.Where(c => c.Meets(Rules.Weekday(d))))
            {
                var ab = absences.FirstOrDefault(a => a.ClassId == c.ClassId && a.SessionDate == d);
                items.Add(Flat.Of(sch.Info(c, d), ("tag", ab == null ? "" : ab.Status == "Đã xếp lịch bù" ? "Đã xin nghỉ" : "Đã xin nghỉ – cần bù")));
            }
            foreach (var a in absences.Where(a => a.Status == "Đã xếp lịch bù" && a.MakeupDate == d))
                items.Add(Flat.Of(await sch.InfoAsync(a.MakeupKey!), ("tag", "Học bù")));
        }
        return new { start = start.ToString("yyyy-MM-dd"), end = start.AddDays(6).ToString("yyyy-MM-dd"), items = items.OrderBy(x => (string)x["date"]!).ThenBy(x => (string)x["start"]!).ToList(), remaining = await sch.RemainingAsync(studentId, Rules.Month(Rules.Today)) };
    }

    [HttpGet("upcoming/{studentId:int}")]
    public async Task<List<Dictionary<string, object?>>> Upcoming(int studentId)
    {
        await OwnKid(studentId);
        var existing = await db.Absences.Where(a => a.StudentId == studentId).Select(a => new { a.ClassId, a.SessionDate }).ToListAsync();
        var res = new List<Dictionary<string, object?>>();
        foreach (var i in await sch.NextSessionsAsync(studentId))
            if (!existing.Any(e => e.ClassId == i.ClassId && e.SessionDate.ToString("yyyy-MM-dd") == i.Date)) res.Add(Flat.Of(i, ("remaining", await sch.RemainingAsync(studentId, i.Date[..7]))));
        return res;
    }

    [HttpPost("leave")]
    public async Task<AbsenceDto> Leave(LeaveRequest req)
    {
        var s = await OwnKid(req.StudentId);
        var (cid, date) = ScheduleService.ParseKey(req.Key);
        var c = await sch.GetClassAsync(cid);
        if (Rules.Started(date, c.StartTime)) throw new ApiException("Chỉ gửi yêu cầu xin nghỉ cho ca học chưa diễn ra"); // BR-UC3-03
        var a = await sch.CreateAbsenceAsync(s, req.Key, req.Reason, User.UserId());
        var label = await sch.LabelAsync(req.Key!);
        await nt.ToParentOfAsync(s.ParentPhone, "Đã ghi nhận yêu cầu xin nghỉ", $"Bé {s.FullName} nghỉ ca {label}. Ba mẹ có thể đăng ký học bù trong 30 ngày.");
        await nt.ToRoleAsync("assistant", "Có yêu cầu xin nghỉ mới", $"{s.FullName} – {label}");
        await db.SaveChangesAsync();
        return await sch.ToDtoAsync(a);
    }

    [HttpGet("absences/{studentId:int}")]
    public async Task<List<AbsenceDto>> Absences(int studentId)
    {
        await OwnKid(studentId); await sch.ExpireAbsencesAsync();
        var res = new List<AbsenceDto>();
        foreach (var a in await db.Absences.Where(a => a.StudentId == studentId).OrderByDescending(a => a.CreatedAt).ToListAsync()) res.Add(await sch.ToDtoAsync(a));
        return res;
    }

    private async Task<Absence> OwnAbsence(int id)
    {
        await sch.ExpireAbsencesAsync();
        var a = await db.Absences.FindAsync(id) ?? throw ApiException.NotFound(MsgSys);
        await OwnKid(a.StudentId); return a;
    }
    private const string MsgSys = "Hiện tại đang có sự cố, ba mẹ đợi Ngôi Nhà Nhỏ một xíu nhé!";

    [HttpGet("makeup/{id:int}/options")]
    public async Task<List<SessionWithLoad>> Options(int id) => await sch.AvailableMakeupsAsync(await OwnAbsence(id));

    [HttpPost("makeup/{id:int}/register")]
    public async Task<AbsenceDto> Register(int id, KeyRequest req)
    {
        var a = await OwnAbsence(id); var s = await db.Students.FirstAsync(x => x.StudentId == a.StudentId);
        if (a.Status == "Hết hạn") throw new ApiException("Yêu cầu học bù này đã quá thời hạn học bù nên không thể đăng ký");
        if (a.Status != "Chờ xếp lịch bù") throw new ApiException("Yêu cầu học bù này đã được đăng ký trước đó");
        if (string.IsNullOrEmpty(req.Key)) throw new ApiException("Vui lòng chọn ca học bù");
        if (!(await sch.AvailableMakeupsAsync(a)).Any(o => o.Key == req.Key)) throw new ApiException("Ca học này vừa hết chỗ. Ba mẹ vui lòng chọn ca khác");
        var (cid, date) = ScheduleService.ParseKey(req.Key);
        a.MakeupClassId = cid; a.MakeupDate = date; a.Status = "Đã đăng ký học bù";
        await nt.ToRoleAsync("assistant", "Có đăng ký học bù chờ lập đề xuất", $"{s.FullName} – bù {await sch.LabelAsync(req.Key)}");
        await db.SaveChangesAsync();
        return await sch.ToDtoAsync(a);
    }

    [HttpPost("makeup/{id:int}/cancel")]
    public async Task<AbsenceDto> Cancel(int id)
    {
        var a = await OwnAbsence(id); var s = await db.Students.FirstAsync(x => x.StudentId == a.StudentId);
        if (a.Status == "Hết hạn") throw new ApiException("Yêu cầu học bù này đã quá thời hạn học bù nên không thể hủy");
        if (!Rules.HoldStates.Contains(a.Status) || a.MakeupClassId == null) throw new ApiException("Yêu cầu này hiện không có ca học bù để hủy");
        var info = await sch.InfoAsync(a.MakeupKey!);
        if (info.Started) throw new ApiException("Ca học bù đã diễn ra nên không thể hủy");
        var was = a.Status; var label = await sch.LabelAsync(a.MakeupKey!);
        a.MakeupClassId = null; a.MakeupDate = null; a.Status = "Chờ xếp lịch bù"; // hạn học bù giữ nguyên (BR-UC3-18)
        await nt.ToRoleAsync("assistant", "Phụ huynh đã hủy học bù", $"{s.FullName} hủy bù {label}.");
        if (was == "Đã xếp lịch bù")
        {
            if (info.TeacherId != null) nt.ToUser(info.TeacherId.Value, "Học viên hủy học bù", $"{s.FullName} đã hủy {label}.");
            await nt.ToRoleAsync("manager", "Phụ huynh đã hủy học bù", $"{s.FullName} hủy bù {label}.");
        }
        await db.SaveChangesAsync();
        return await sch.ToDtoAsync(a);
    }

    [HttpGet("diary/{studentId:int}")]
    public async Task<List<object>> Diary(int studentId)
    {
        await OwnKid(studentId);
        var list = await db.Journal.Where(j => j.StudentId == studentId && (j.PhotoPath != null || j.StrokeComment != null)).OrderByDescending(j => j.SessionDate).ToListAsync();
        var res = new List<object>();
        foreach (var j in list)
            res.Add(new { id = j.JournalId, session = await sch.InfoAsync(ScheduleService.Key(j.ClassId, j.SessionDate)), photo = j.PhotoPath,
                comment = j.StrokeComment == null ? null : new { stroke = j.StrokeComment, color = j.ColorComment, absorb = j.AbsorbComment } });
        return res;
    }
}
