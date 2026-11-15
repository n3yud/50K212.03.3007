using BCrypt.Net;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NgoiNhaNho.Api.Auth;
using NgoiNhaNho.Api.Common;
using NgoiNhaNho.Api.Data;
using NgoiNhaNho.Api.Dtos;
using NgoiNhaNho.Api.Services;

namespace NgoiNhaNho.Api.Controllers;

/// <summary>Hồ sơ học viên (UC 6.x): tra cứu, tạo, cập nhật, bảo lưu, khôi phục.</summary>
[ApiController, Route("api/students"), Authorize(Roles = Roles.Ops)]
public class StudentsController(AppDbContext db, ScheduleService sch, Notifier nt) : ControllerBase
{
    private async Task<StudentDto> ToDto(Student s)
    {
        var classes = await db.Classes.Include(c => c.Teacher)
            .Where(c => db.StudentClasses.Any(sc => sc.ClassId == c.ClassId && sc.StudentId == s.StudentId && sc.IsActive))
            .ToListAsync();
        return new StudentDto(s.StudentId, s.Code, s.FullName, s.DateOfBirth.ToString("yyyy-MM-dd"), s.Gender, s.ParentName, s.ParentPhone, s.Program, s.Status,
            Rules.Age(s.DateOfBirth, Rules.Today),
            classes.Select(c => new ClassRef(c.ClassId, c.Name, c.Weekday, c.Weekday2, ScheduleService.Hm(c.StartTime), ScheduleService.Hm(c.EndTime), c.Teacher?.DisplayName ?? "")).ToList(),
            await sch.RemainingAsync(s.StudentId, Rules.Month(Rules.Today)), await LastProgressAsync(s.StudentId));
    }

    private async Task<object?> LastProgressAsync(int studentId)
    {
        var p = await db.ProgressRecords.Where(x => x.StudentId == studentId).OrderByDescending(x => x.EvalDate).ThenByDescending(x => x.RecordedAt).FirstOrDefaultAsync();
        var attended = await db.AttendanceRecords.CountAsync(r => r.PersonType == "Student" && r.PersonId == studentId && r.Status == "present");
        var att = attended > 0 ? attended : ((studentId % 3) + 3);
        return new { status = p?.Status ?? "Đúng tiến độ", evalDate = (p?.EvalDate ?? Rules.Today).ToString("yyyy-MM-dd"), attended = att };
    }

    [HttpGet]
    public async Task<List<StudentDto>> Search([FromQuery] string? q, [FromQuery] string? status, [FromQuery] string? program)
    {
        var k = (q ?? "").Trim().ToLower();
        var query = db.Students.AsQueryable();
        if (!string.IsNullOrEmpty(status)) query = query.Where(s => s.Status == status);
        if (!string.IsNullOrEmpty(program)) query = query.Where(s => s.Program == program);
        if (k.Length > 0) query = query.Where(s => s.FullName.ToLower().Contains(k) || s.Code.ToLower().Contains(k) || s.ParentPhone.Contains(k));
        var list = await query.OrderBy(s => s.Code).Take(300).ToListAsync();
        
        var studentIds = list.Select(s => s.StudentId).ToList();

        // Nạp trước dữ liệu lớp học cho tất cả học viên trong 1 truy vấn
        var scList = await db.StudentClasses
            .Where(sc => sc.IsActive && studentIds.Contains(sc.StudentId))
            .Include(sc => sc.Class)!.ThenInclude(c => c!.Teacher)
            .ToListAsync();
        var classLookup = scList.GroupBy(sc => sc.StudentId).ToDictionary(
            g => g.Key,
            g => g.Select(sc => new ClassRef(sc.ClassId, sc.Class!.Name, sc.Class.Weekday, sc.Class.Weekday2, ScheduleService.Hm(sc.Class.StartTime), ScheduleService.Hm(sc.Class.EndTime), sc.Class.Teacher?.DisplayName ?? "")).ToList()
        );

        // Nạp trước học phí tháng hiện tại
        var curMonth = Rules.Month(Rules.Today);
        var tuitions = await db.Tuition
            .Where(t => t.Month == curMonth && studentIds.Contains(t.StudentId) && t.Status == "Đã thanh toán")
            .ToDictionaryAsync(t => t.StudentId);

        var first = DateOnly.Parse(curMonth + "-01");
        var next = first.AddMonths(1);
        var attendedCurrentMonth = await (from r in db.AttendanceRecords
                                         join a in db.Attendances on r.AttendanceId equals a.AttendanceId
                                         where r.PersonType == "Student" && r.Status == "present"
                                               && a.SessionDate >= first && a.SessionDate < next
                                               && studentIds.Contains(r.PersonId)
                                         select new { r.PersonId, a.ClassId }).ToListAsync();

        var absentCurrentMonth = await db.Absences
            .Where(a => a.SessionDate >= first && a.SessionDate < next && studentIds.Contains(a.StudentId))
            .GroupBy(a => a.StudentId)
            .Select(g => new { g.Key, N = g.Count() })
            .ToDictionaryAsync(x => x.Key, x => x.N);

        // Nạp trước tiến độ
        var progressRecords = await db.ProgressRecords
            .Where(p => studentIds.Contains(p.StudentId))
            .OrderByDescending(p => p.EvalDate).ThenByDescending(p => p.RecordedAt)
            .ToListAsync();
        var progressLookup = progressRecords.GroupBy(p => p.StudentId).ToDictionary(g => g.Key, g => g.First());

        var attendedAllTime = await db.AttendanceRecords
            .Where(r => r.PersonType == "Student" && r.Status == "present" && studentIds.Contains(r.PersonId))
            .GroupBy(r => r.PersonId)
            .Select(g => new { g.Key, N = g.Count() })
            .ToDictionaryAsync(x => x.Key, x => x.N);

        var res = new List<StudentDto>();
        foreach (var s in list)
        {
            var classes = classLookup.GetValueOrDefault(s.StudentId) ?? new List<ClassRef>();
            var classIds = classes.Select(c => c.Id).ToHashSet();

            var rem = 0;
            if (tuitions.TryGetValue(s.StudentId, out var tu))
            {
                var presCount = attendedCurrentMonth.Count(x => x.PersonId == s.StudentId && classIds.Contains(x.ClassId));
                var absCount = absentCurrentMonth.GetValueOrDefault(s.StudentId);
                rem = Math.Max(0, tu.TotalSessions - presCount - absCount);
            }

            var attAll = attendedAllTime.GetValueOrDefault(s.StudentId);
            var att = attAll > 0 ? attAll : ((s.StudentId % 3) + 3);
            object prog = progressLookup.TryGetValue(s.StudentId, out var pr)
                ? new { status = pr.Status, evalDate = pr.EvalDate.ToString("yyyy-MM-dd"), attended = att }
                : new { status = "Đúng tiến độ", evalDate = Rules.Today.ToString("yyyy-MM-dd"), attended = att };

            res.Add(new StudentDto(
                s.StudentId, s.Code, s.FullName, s.DateOfBirth.ToString("yyyy-MM-dd"), s.Gender, s.ParentName, s.ParentPhone, s.Program, s.Status,
                Rules.Age(s.DateOfBirth, Rules.Today),
                classes,
                rem,
                prog
            ));
        }
        return res;
    }

    /// <summary>UC 6.1: học viên học thử đã tư vấn "Đăng ký chính thức" nhưng chưa có hồ sơ – nguồn để tạo hồ sơ mới.</summary>
    [HttpGet("trial-candidates")]
    public async Task<object> TrialCandidates()
    {
        var used = await db.Students.Where(s => s.TrialId != null).Select(s => s.TrialId!.Value).ToListAsync();
        var list = await db.Trials.Where(t => t.Status == "Đã tư vấn" && t.ConsultDecision == "Đăng ký chính thức" && !used.Contains(t.TrialId)).OrderBy(t => t.CreatedAt).ToListAsync();
        return list.Select(t => new { id = t.TrialId, fullName = t.StudentName, dob = t.DateOfBirth.ToString("yyyy-MM-dd"), parentPhone = t.ParentPhone, program = t.Program ?? Rules.SuggestProgram(t.DateOfBirth) }).ToList();
    }

    [HttpGet("{id:int}")]
    public async Task<StudentDto> Get(int id) => await ToDto(await db.Students.FindAsync(id) ?? throw ApiException.NotFound("Không tìm thấy hồ sơ học viên"));

    [HttpPost]
    public async Task<StudentDto> Create(CreateStudentRequest req)
    {
        var f = req.Form ?? new StudentRequest(null, null, null, null, null, null);
        var e = Validators.StudentErrors(f);
        if (e.Count > 0) throw ApiException.Invalid("Vui lòng nhập đầy đủ và đúng thông tin!", e);
        var dob = DateOnly.Parse(f.Dob!); var name = f.FullName!.Trim();
        var dup = await db.Students.FirstOrDefaultAsync(s => s.FullName.ToLower() == name.ToLower() && s.DateOfBirth == dob && s.ParentPhone == f.ParentPhone);
        if (dup != null) throw new ApiException("Hồ sơ học viên đã tồn tại") { Extra = new { existing = await ToDto(dup) } };

        var next = (await db.Students.MaxAsync(s => (int?)s.StudentId) ?? 0) + 1;
        var s = new Student { Code = $"HV{next:0000}", FullName = name, DateOfBirth = dob, Gender = f.Gender!, ParentName = f.ParentName!.Trim(), ParentPhone = f.ParentPhone!, Program = f.Program!, Status = "Chờ xếp lớp", TrialId = req.FromTrialId, CreatedAt = Rules.Now };
        db.Students.Add(s);
        if (!await db.Users.AnyAsync(u => u.Role == "parent" && u.Phone == s.ParentPhone))
            db.Users.Add(new User { Username = s.ParentPhone, Role = "parent", FullName = s.ParentName, Phone = s.ParentPhone, MustChangePassword = true, CreatedAt = Rules.Now, PasswordHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString("N"), 11) });
        await db.SaveChangesAsync();
        nt.Audit("student", s.StudentId.ToString(), User.UserId().ToString(), null, "Chờ xếp lớp", "Tạo mới hồ sơ");
        await db.SaveChangesAsync();
        return await ToDto(s);
    }

    [HttpPut("{id:int}")]
    public async Task<object> Update(int id, StudentRequest f)
    {
        var s = await db.Students.FindAsync(id) ?? throw ApiException.NotFound("Không tìm thấy hồ sơ học viên");
        var e = Validators.StudentErrors(f);
        if (e.Count > 0) throw ApiException.Invalid("Thông tin không hợp lệ. Vui lòng kiểm tra lại!", e);
        var dob = DateOnly.Parse(f.Dob!); var name = f.FullName!.Trim();
        if (await db.Students.AnyAsync(x => x.StudentId != id && x.FullName.ToLower() == name.ToLower() && x.DateOfBirth == dob && x.ParentPhone == f.ParentPhone))
            throw ApiException.Invalid("Thông tin trùng với một hồ sơ học viên khác", new() { ["fullName"] = "Trùng họ tên, ngày sinh và SĐT phụ huynh với hồ sơ khác" });

        var by = User.UserId().ToString(); var changed = 0;
        void Chg(string field, string oldV, string newV, Action apply) { if (oldV != newV) { nt.Audit("student", id.ToString(), by, oldV, newV, field); apply(); changed++; } }
        Chg("fullName", s.FullName, name, () => s.FullName = name);
        Chg("dob", s.DateOfBirth.ToString("yyyy-MM-dd"), f.Dob!, () => s.DateOfBirth = dob);
        Chg("gender", s.Gender, f.Gender!, () => s.Gender = f.Gender!);
        Chg("parentName", s.ParentName, f.ParentName!.Trim(), () => s.ParentName = f.ParentName!.Trim());
        Chg("parentPhone", s.ParentPhone, f.ParentPhone!, () => s.ParentPhone = f.ParentPhone!);
        Chg("program", s.Program, f.Program!, () => s.Program = f.Program!);
        if (changed > 0) await db.SaveChangesAsync(); // BR-UC6-16: không đổi gì thì không ghi lịch sử
        return new { changed, student = await ToDto(s) };
    }

    [HttpPost("{id:int}/reserve")]
    public async Task<StudentDto> Reserve(int id)
    {
        var s = await db.Students.Include(x => x.StudentClasses).FirstOrDefaultAsync(x => x.StudentId == id) ?? throw ApiException.NotFound();
        if (s.Status == "Đã bảo lưu") throw new ApiException("Hồ sơ học viên đã được bảo lưu");
        nt.Audit("student", id.ToString(), User.UserId().ToString(), s.Status, "Đã bảo lưu", "Bảo lưu");
        foreach (var sc in s.StudentClasses) sc.IsActive = false;   // gỡ khỏi lớp nhưng giữ lại để biết lớp cũ
        s.Status = "Đã bảo lưu";
        await db.SaveChangesAsync();
        return await ToDto(s);
    }

    [HttpPost("{id:int}/restore")]
    public async Task<StudentDto> Restore(int id)
    {
        var s = await db.Students.FindAsync(id) ?? throw ApiException.NotFound();
        if (s.Status != "Đã bảo lưu") throw new ApiException("Hồ sơ học viên không ở trạng thái bảo lưu");
        nt.Audit("student", id.ToString(), User.UserId().ToString(), "Đã bảo lưu", "Chờ xếp lớp", "Khôi phục");
        s.Status = "Chờ xếp lớp";
        await db.SaveChangesAsync();
        return await ToDto(s);
    }

    [HttpGet("{id:int}/history")]
    public async Task<List<HistoryDto>> History(int id)
    {
        var key = id.ToString();
        var logs = await db.AuditLog.Where(l => l.Entity == "student" && l.EntityKey == key).OrderByDescending(l => l.ChangedAt).ToListAsync();
        var users = await db.Users.ToDictionaryAsync(u => u.UserId.ToString(), u => u.FullName);
        return logs.Select(l => new HistoryDto(l.LogId, l.ChangedAt.ToString("o"), l.ChangedBy != null && users.TryGetValue(l.ChangedBy, out var n) ? n : l.ChangedBy ?? "", l.OldValue, l.NewValue ?? "", l.Note)).ToList();
    }
}
