using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NgoiNhaNho.Api.Auth;
using NgoiNhaNho.Api.Common;
using NgoiNhaNho.Api.Data;
using NgoiNhaNho.Api.Dtos;
using NgoiNhaNho.Api.Services;

namespace NgoiNhaNho.Api.Controllers;

/// <summary>Lớp học (UC 7.x): danh sách, tạo, cập nhật, xếp học viên, phân công giáo viên, lịch tuần.</summary>
[ApiController, Route("api/classes")]
public class ClassesController(AppDbContext db, ScheduleService sch) : ControllerBase
{
    private async Task<ClassDto> ToDto(ClassRoom c)
    {
        var members = await db.StudentClasses.Where(x => x.ClassId == c.ClassId && x.IsActive && x.Student!.Status == "Đang học")
            .Select(x => new MemberDto(x.StudentId, x.Student!.FullName, x.Student.Code)).ToListAsync();
        return new ClassDto(c.ClassId, $"LH{c.ClassId:D3}", c.Name, c.Program, c.Weekday, c.Weekday2, ScheduleService.Hm(c.StartTime), ScheduleService.Hm(c.EndTime), c.Capacity, c.TeacherId, c.Teacher?.DisplayName ?? "", members.Count, members);
    }

    private async Task<Dictionary<string, string>> ErrorsAsync(ClassRequest f, int? exceptId)
    {
        var e = new Dictionary<string, string>();
        if (string.IsNullOrWhiteSpace(f.Name)) e["name"] = "Thông tin lớp học không hợp lệ, vui lòng kiểm tra lại";
        else if (await db.Classes.AnyAsync(c => c.ClassId != exceptId && c.Name.ToLower() == f.Name.Trim().ToLower())) e["name"] = "Tên lớp đã tồn tại, vui lòng chọn tên khác"; // BR-UC7-05
        if (string.IsNullOrEmpty(f.Program) || !Rules.Programs.Contains(f.Program)) e["program"] = "Vui lòng chọn chương trình học";
        // Lịch học: 1 trong các cặp ngày + khung giờ cố định của trung tâm (Rules.Schedules); Thứ 6 nghỉ (BR-UC7-04)
        if (f.Weekday is null || f.Weekday2 is null || string.IsNullOrEmpty(f.Start) || string.IsNullOrEmpty(f.End)) e["days"] = "Vui lòng chọn lịch học";
        else if (f.Weekday == 5 || f.Weekday2 == 5) e["days"] = "Trung tâm nghỉ Thứ 6, không thể tạo lớp vào Thứ 6";
        else if (!Rules.ValidSchedule(f.Weekday.Value, f.Weekday2.Value, f.Start, f.End)) e["days"] = "Lịch học không thuộc khung lịch của trung tâm";
        if (f.Capacity is null or < 1) e["capacity"] = "Vui lòng nhập sĩ số tối đa";
        else if (f.Capacity > Rules.MaxClass) e["capacity"] = $"Sĩ số tối đa không vượt quá {Rules.MaxClass} học viên";
        else if (exceptId != null)
        {
            var cur = await db.StudentClasses.CountAsync(x => x.ClassId == exceptId && x.IsActive && x.Student!.Status == "Đang học");
            if (f.Capacity < cur) e["capacity"] = "Sĩ số tối đa không được nhỏ hơn số học viên hiện có";
        }
        return e;
    }

    [HttpGet, Authorize(Roles = "assistant,manager,supervisor,teacher")]
    public async Task<List<ClassDto>> List()
    {
        var list = await db.Classes.Include(c => c.Teacher).ToListAsync();
        var res = new List<ClassDto>(); foreach (var c in list.OrderBy(c => (c.Weekday + 6) % 7).ThenBy(c => c.StartTime)) res.Add(await ToDto(c));
        return res;
    }

    [HttpGet("teachers"), Authorize(Roles = Roles.Ops)]
    public async Task<List<TeacherRef>> Teachers() =>
        (await db.Users.Where(u => u.Role == "teacher" && !u.IsLocked).OrderBy(u => u.FullName).ToListAsync()).Select(u => new TeacherRef(u.UserId, u.DisplayName)).ToList();

    [HttpPost, Authorize(Roles = Roles.Ops)]
    public async Task<ClassDto> Create(ClassRequest f)
    {
        var e = await ErrorsAsync(f, null);
        if (e.Count > 0) throw ApiException.Invalid("Thông tin lớp học không hợp lệ, vui lòng kiểm tra lại", e);
        var start = TimeOnly.Parse(f.Start!);
        var same = await db.Classes.CountAsync(c => c.Program == f.Program && c.Weekday == f.Weekday && c.Weekday2 == f.Weekday2 && c.StartTime == start);
        var c = new ClassRoom { Name = f.Name!.Trim(), Program = f.Program!, Weekday = (byte)f.Weekday!.Value, Weekday2 = (byte)f.Weekday2!.Value, StartTime = start, EndTime = TimeOnly.Parse(f.End!), Capacity = (byte)f.Capacity!.Value, Letter = "ABCDEFGH"[Math.Min(same, 7)].ToString() };
        db.Classes.Add(c); await db.SaveChangesAsync();
        return await ToDto(c);
    }

    [HttpPut("{id:int}"), Authorize(Roles = Roles.Ops)]
    public async Task<ClassDto> Update(int id, ClassRequest f)
    {
        var c = await sch.GetClassAsync(id);
        var e = await ErrorsAsync(f, id);
        if (e.Count > 0) throw ApiException.Invalid("Thông tin lớp học không hợp lệ. Vui lòng kiểm tra lại", e);
        c.Name = f.Name!.Trim(); c.Program = f.Program!; c.Weekday = (byte)f.Weekday!.Value; c.Weekday2 = (byte)f.Weekday2!.Value; c.StartTime = TimeOnly.Parse(f.Start!); c.EndTime = TimeOnly.Parse(f.End!); c.Capacity = (byte)f.Capacity!.Value;
        await db.SaveChangesAsync();
        return await ToDto(c);
    }

    /// <summary>Lớp còn chỗ, cùng chương trình; đánh dấu lớp trùng lịch học của học viên (BR-UC7-09/10/11)</summary>
    [HttpGet("open-for/{studentId:int}"), Authorize(Roles = Roles.Ops)]
    public async Task<List<object>> OpenFor(int studentId)
    {
        var s = await db.Students.FindAsync(studentId) ?? throw ApiException.NotFound();
        var mine = await db.StudentClasses.Where(x => x.StudentId == studentId && x.IsActive).Select(x => x.Class!).ToListAsync();
        var res = new List<object>();
        foreach (var c in await db.Classes.Include(c => c.Teacher).Where(c => c.Program == s.Program).ToListAsync())
        {
            var d = await ToDto(c);
            if (d.Size >= c.Capacity) continue;
            var conflict = mine.Any(m => m.SharesDay(c) && Rules.Overlap(m.StartTime, m.EndTime, c.StartTime, c.EndTime));
            res.Add(new { d.Id, d.Code, d.Name, d.Program, d.Weekday, d.Weekday2, d.Start, d.End, d.Capacity, d.Size, d.Teacher, conflict });
        }
        return res;
    }

    [HttpPost("enroll"), Authorize(Roles = Roles.Ops)]
    public async Task<object> Enroll(EnrollRequest req, [FromServices] Notifier nt)
    {
        var s = await db.Students.FindAsync(req.StudentId) ?? throw ApiException.NotFound();
        var c = await sch.GetClassAsync(req.ClassId);
        if (s.Status != "Chờ xếp lớp") throw new ApiException("Chỉ học viên ở trạng thái Chờ xếp lớp mới được xếp lớp");
        if (c.Program != s.Program) throw new ApiException("Lớp không cùng chương trình học với học viên");
        var size = await db.StudentClasses.CountAsync(x => x.ClassId == c.ClassId && x.IsActive && x.Student!.Status == "Đang học");
        if (size >= c.Capacity) throw new ApiException("Lớp học đã đủ sĩ số, vui lòng chọn lớp khác");
        var mine = await db.StudentClasses.Where(x => x.StudentId == s.StudentId && x.IsActive).Select(x => x.Class!).ToListAsync();
        if (mine.Any(m => m.SharesDay(c) && Rules.Overlap(m.StartTime, m.EndTime, c.StartTime, c.EndTime))) throw new ApiException("Lịch học bị trùng. Vui lòng chọn lớp khác");
        var old = await db.StudentClasses.FirstOrDefaultAsync(x => x.StudentId == s.StudentId && x.ClassId == c.ClassId);
        if (old != null) old.IsActive = true; else db.StudentClasses.Add(new StudentClass { StudentId = s.StudentId, ClassId = c.ClassId, IsActive = true, JoinedAt = Rules.Now });
        nt.Audit("student", s.StudentId.ToString(), User.UserId().ToString(), "Chờ xếp lớp", "Đang học", $"Xếp vào {c.Name}");
        s.Status = "Đang học";
        await db.SaveChangesAsync();
        return new { ok = true };
    }

    [HttpGet("{id:int}/teachers"), Authorize(Roles = Roles.Ops)]
    public async Task<List<TeacherSchedule>> TeachersFor(int id)
    {
        var c = await sch.GetClassAsync(id); var all = await db.Classes.ToListAsync();
        var res = new List<TeacherSchedule>();
        foreach (var u in await db.Users.Where(u => u.Role == "teacher" && !u.IsLocked).ToListAsync())
        {
            var mine = all.Where(x => x.TeacherId == u.UserId).ToList();
            res.Add(new TeacherSchedule(u.UserId, u.DisplayName,
                mine.Count == 0 ? "Chưa có lịch" : string.Join("; ", mine.Select(x => $"{Rules.ScheduleLabel(x.Weekday, x.Weekday2)}, {ScheduleService.Hm(x.StartTime)}-{ScheduleService.Hm(x.EndTime)}")),
                mine.Any(x => x.ClassId != id && x.SharesDay(c) && Rules.Overlap(x.StartTime, x.EndTime, c.StartTime, c.EndTime))));
        }
        return res;
    }

    [HttpPost("{id:int}/teacher"), Authorize(Roles = Roles.Ops)]
    public async Task<ClassDto> AssignTeacher(int id, TeacherRequest req)
    {
        var c = await sch.GetClassAsync(id);
        if (req.TeacherId is null) throw new ApiException("Vui lòng chọn giáo viên phụ trách");
        var t = await db.Users.FirstOrDefaultAsync(u => u.UserId == req.TeacherId && u.Role == "teacher" && !u.IsLocked) ?? throw new ApiException("Giáo viên không hợp lệ");
        var others = await db.Classes.Where(x => x.ClassId != id && x.TeacherId == t.UserId && (x.Weekday == c.Weekday || x.Weekday == c.Weekday2 || x.Weekday2 == c.Weekday || x.Weekday2 == c.Weekday2)).ToListAsync();
        if (others.Any(x => Rules.Overlap(x.StartTime, x.EndTime, c.StartTime, c.EndTime))) throw new ApiException("Giáo viên đã có lịch dạy trùng, vui lòng chọn giáo viên khác");
        c.TeacherId = t.UserId; c.Teacher = t;
        await db.SaveChangesAsync();
        return await ToDto(c);
    }

    /// <summary>Lưới lịch tuần (Calendar view)</summary>
    [HttpGet("week"), Authorize(Roles = "assistant,manager,supervisor")]
    public async Task<WeekDto> Week([FromQuery] string? from)
    {
        var start = Rules.StartOfWeek(Validators.TryDate(from, out var f) ? f : Rules.Today);
        var classes = await db.Classes.Include(c => c.Teacher).ToListAsync();
        var map = await sch.LoadMapAsync(start, start.AddDays(6));
        var days = Enumerable.Range(0, 7).Select(i =>
        {
            var d = start.AddDays(i); var wd = Rules.Weekday(d);
            return new WeekDay(d.ToString("yyyy-MM-dd"), wd, wd == 5,
                classes.Where(c => c.Meets(wd)).OrderBy(c => c.StartTime).Select(c => new SessionWithLoad(sch.Info(c, d), map.Get(c.ClassId, d))).ToList());
        }).ToList();
        return new WeekDto(start.ToString("yyyy-MM-dd"), days);
    }
}
