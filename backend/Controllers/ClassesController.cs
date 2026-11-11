using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Data;
using System.Text.Json;

namespace NgoiNhaNho;
[ApiController, Authorize(Roles = Roles.Operations), Route("api/classes")]
public class ClassesController(AppDb db, Access access, ClassScheduleService schedules) : ControllerBase
{
    public record ClassInput(string Name, string Program, int Weekday, TimeOnly Start, TimeOnly End, int Capacity, DateOnly? EffectiveFrom = null);
    public record TeacherInput(Guid TeacherId);
    public record EnrollmentInput(Guid StudentId);
    public record RangeInput(DateOnly From, DateOnly To);
    [HttpGet]
    public async Task<object> List() => await db.Classes.AsNoTracking().Where(c => c.BranchId == access.BranchId).Select(c => new { c.Id, c.Name, c.Program, c.Weekday, c.Start, c.End, c.Capacity, c.TeacherId, EffectiveFrom = db.ClassSchedules.Where(v => v.ClassId == c.Id).OrderByDescending(v => v.EffectiveFrom).Select(v => (DateOnly?)v.EffectiveFrom).FirstOrDefault(), Teacher = db.Users.Where(u => u.Id == c.TeacherId).Select(u => u.Name).FirstOrDefault(), Students = db.Enrollments.Count(e => e.ClassId == c.Id && e.Until == null) }).ToListAsync();
    [HttpGet("teachers")]
    public async Task<object> Teachers() => await db.Users.Where(u => u.BranchId == access.BranchId && u.Role == Roles.Teacher && !u.Locked).Select(u => new { u.Id, u.Name }).ToListAsync();
    [HttpPost]
    public async Task<object> Create(ClassInput input)
    {
        var c = new ArtClass { BranchId = access.BranchId, Name = input.Name.Trim(), Program = input.Program, Weekday = input.Weekday, Start = input.Start, End = input.End, Capacity = input.Capacity }; Rules.Class(c);
        Rules.Require(!await db.Classes.AnyAsync(x => x.BranchId == access.BranchId && x.Name == c.Name), "Tên lớp đã tồn tại."); db.Classes.Add(c); db.ClassSchedules.Add(new ClassScheduleVersion { ClassId = c.Id, EffectiveFrom = DateOnly.MinValue, Weekday = c.Weekday, Start = c.Start, End = c.End, Program = c.Program }); db.Track(access.Id, c); await db.SaveChangesAsync(); return c;
    }
    [HttpPut("{id:guid}")]
    public async Task<object> Update(Guid id, ClassInput input)
    {
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        var c = await Find(id); var before = JsonSerializer.SerializeToElement(c);
        var changing = c.Weekday != input.Weekday || c.Start != input.Start || c.End != input.End || c.Program != input.Program;
        var effective = input.EffectiveFrom ?? Rules.Today;
        if (changing) { Rules.Require(input.EffectiveFrom.HasValue && effective >= Rules.Today, "Vui lòng chọn ngày hiệu lực từ hôm nay trở đi."); var latest = await db.ClassSchedules.Where(v => v.ClassId == id).MaxAsync(v => (DateOnly?)v.EffectiveFrom); Rules.Require(latest is null || effective > latest, "Ngày hiệu lực phải sau phiên bản lịch đã lưu gần nhất."); }
        Rules.Require(c.Program == input.Program || !await db.Enrollments.AnyAsync(e => e.ClassId == id && e.Until == null), "Không đổi chương trình khi lớp đang có học viên. Vui lòng rà soát xếp lớp trước.");
        c.Name = input.Name.Trim(); c.Program = input.Program; c.Weekday = input.Weekday; c.Start = input.Start; c.End = input.End; c.Capacity = input.Capacity; Rules.Class(c);
        Rules.Require(!await db.Classes.AnyAsync(x => x.BranchId == access.BranchId && x.Id != id && x.Name == c.Name), "Tên lớp đã tồn tại.");
        Rules.Require(await db.Enrollments.CountAsync(e => e.ClassId == id && e.Until == null) <= c.Capacity, "Sĩ số tối đa không nhỏ hơn sĩ số hiện tại.");
        if (changing)
        {
            var candidate = new ClassScheduleVersion { ClassId = id, EffectiveFrom = effective, Weekday = c.Weekday, Start = c.Start, End = c.End, Program = c.Program };
            if (c.TeacherId.HasValue) await schedules.CheckTeacher(c, c.TeacherId.Value, candidate, effective);
            var future = await db.Sessions.Where(s => s.ClassId == id && s.Date >= effective && !s.Cancelled).ToListAsync(); var sessionIds = future.Select(s => s.Id).ToList();
            Rules.Require(future.All(s => !s.Closed && Rules.At(s.Date, s.Start) > Rules.Now), "Có ca đã bắt đầu/chốt điểm danh trong khoảng thay đổi. Vui lòng chọn ngày hiệu lực sau ca đó.");
            Rules.Require(!await db.Attendances.AnyAsync(a => sessionIds.Contains(a.SessionId)) && !await db.TrialAttendances.AnyAsync(a => sessionIds.Contains(a.SessionId)) && !await db.Trials.AnyAsync(t => t.SessionId.HasValue && sessionIds.Contains(t.SessionId.Value)) && !await db.Leaves.AnyAsync(l => sessionIds.Contains(l.SessionId) || (l.MakeUpSessionId.HasValue && sessionIds.Contains(l.MakeUpSessionId.Value))), "Có ca tương lai đã gắn học thử, lịch nghỉ, học bù hoặc điểm danh. Vui lòng rà soát các ca này trước khi đổi lịch; dữ liệu chưa được thay đổi.");
            foreach (var e in await db.Enrollments.Where(e => e.ClassId == id && (e.Until == null || e.Until >= effective)).ToListAsync()) foreach (var other in await db.Enrollments.Where(x => x.StudentId == e.StudentId && x.ClassId != id && (x.Until == null || x.Until >= effective)).ToListAsync()) Rules.Require(!await schedules.Conflicts(other.ClassId, candidate, effective, other.Until), "Lịch mới trùng với lịch học khác của học viên.");
            db.ClassSchedules.Add(candidate); await db.SaveChangesAsync();
            foreach (var s in future) { var original = System.Text.Json.JsonSerializer.SerializeToElement(s); s.Cancelled = true; db.Track(access.Id, s, original); }
            await db.SaveChangesAsync();
            if (future.Count > 0 && c.TeacherId.HasValue) await schedules.Materialize(c, effective, future.Max(s => s.Date));
            await db.SaveChangesAsync();
            var affectedStudents = await db.Enrollments.Where(e => e.ClassId == id && (e.Until == null || e.Until >= effective)).Select(e => e.StudentId).Distinct().ToListAsync();
            var effectiveMonth = Rules.Month(effective);
            foreach (var tuition in await db.Tuitions.Where(t => affectedStudents.Contains(t.StudentId) && t.Paid && string.Compare(t.Month, effectiveMonth) >= 0).ToListAsync())
            {
                var first = DateOnly.ParseExact(tuition.Month + "-01", "yyyy-MM-dd"); var next = first.AddMonths(1);
                var total = await (from session in db.Sessions join enrollment in db.Enrollments on session.ClassId equals enrollment.ClassId where !session.Cancelled && enrollment.StudentId == tuition.StudentId && session.Date >= first && session.Date < next && session.Date >= enrollment.From && (enrollment.Until == null || session.Date <= enrollment.Until) select session.Id).Distinct().CountAsync();
                var used = tuition.Lessons - tuition.Remaining; Rules.Require(total >= used, "Lịch mới có ít ca hơn số buổi đã sử dụng của tháng đã thanh toán. Vui lòng rà soát trước khi thay đổi; dữ liệu chưa được thay đổi.");
                var original = JsonSerializer.SerializeToElement(tuition); tuition.Lessons = total; tuition.Remaining = total - used; db.Track(access.Id, tuition, original);
            }
            foreach (var parent in await db.Enrollments.Where(e => e.ClassId == id && e.Until == null).Join(db.Students, e => e.StudentId, s => s.Id, (e, s) => s.ParentId).Distinct().ToListAsync()) db.Notify(parent, "Cập nhật lịch lớp", $"Lớp {c.Name} đổi lịch từ {effective:dd/MM/yyyy}: thứ {c.Weekday}, {c.Start}–{c.End}. Các ca trước ngày hiệu lực giữ nguyên.");
            if (c.TeacherId.HasValue) db.Notify(c.TeacherId.Value, "Cập nhật lịch giảng dạy", $"Lớp {c.Name} đổi lịch từ {effective:dd/MM/yyyy}.");
        }
        db.Track(access.Id, c, before); await db.SaveChangesAsync(); await tx.CommitAsync(); return c;
    }
    [HttpPost("{id:guid}/teacher")]
    public async Task<object> Assign(Guid id, TeacherInput input)
    {
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable); var c = await Find(id);
        Rules.Require(await db.Users.AnyAsync(u => u.Id == input.TeacherId && u.BranchId == access.BranchId && u.Role == Roles.Teacher && !u.Locked), "Giáo viên không hợp lệ."); await TeacherConflict(c, input.TeacherId);
        var before = JsonSerializer.SerializeToElement(c); c.TeacherId = input.TeacherId;
        foreach (var s in await db.Sessions.Where(s => s.ClassId == id && s.Date >= Rules.Today && !s.Closed).ToListAsync()) s.TeacherId = input.TeacherId;
        db.Track(access.Id, c, before); db.Notify(input.TeacherId, "Phân công lớp học", $"Bạn được phân công phụ trách lớp {c.Name}."); await db.SaveChangesAsync(); await tx.CommitAsync(); return new { message = "Phân công giáo viên thành công!" };
    }
    [HttpPost("{id:guid}/enroll")]
    public async Task<object> Enroll(Guid id, EnrollmentInput input)
    {
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable); var c = await Find(id); var s = await access.Student(input.StudentId);
        Rules.Require(s.Status == States.Waiting, "Chỉ xếp lớp cho học viên Chờ xếp lớp."); Rules.Require(Rules.ProgramFor(s.Name, s.BirthDate) == c.Program && s.Program == c.Program, "Chương trình học không phù hợp.");
        Rules.Require(await db.Enrollments.CountAsync(e => e.ClassId == id && e.Until == null) < c.Capacity, "Lớp đã đủ sĩ số.");
        Rules.Require(!await db.Enrollments.AnyAsync(e => e.StudentId == s.Id && e.Until == null && db.Classes.Any(x => x.Id == e.ClassId && x.Weekday == c.Weekday && x.Start < c.End && x.End > c.Start)), "Lịch học bị trùng.");
        db.Enrollments.Add(new Enrollment { StudentId = s.Id, ClassId = id, From = Rules.Today }); var before = JsonSerializer.SerializeToElement(s); s.Status = States.Studying; db.Track(access.Id, s, before); await db.SaveChangesAsync(); await tx.CommitAsync(); return new { message = "Xếp lớp thành công!" };
    }
    [HttpPost("{id:guid}/sessions")]
    public async Task<object> Materialize(Guid id, RangeInput input)
    {
        var c = await Find(id); Rules.Require(c.TeacherId.HasValue, "Vui lòng phân công giáo viên trước."); Rules.Require(input.To >= input.From && input.To.DayNumber - input.From.DayNumber <= 366, "Khoảng ngày tối đa một năm.");
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable); var count = 0;
        count = await schedules.Materialize(c, input.From, input.To);
        await db.SaveChangesAsync(); await tx.CommitAsync(); return new { message = $"Đã tạo {count} ca theo lịch lớp." };
    }
    private async Task<ArtClass> Find(Guid id) { var c = await db.Classes.SingleOrDefaultAsync(x => x.Id == id && x.BranchId == access.BranchId); Rules.Require(c is not null, "Không tìm thấy lớp học.", 404); return c!; }
    private async Task TeacherConflict(ArtClass c, Guid teacher) { var versions = await db.ClassSchedules.Where(v => v.ClassId == c.Id).OrderBy(v => v.EffectiveFrom).ToListAsync(); for (int i = 0; i < versions.Count; i++) { var v = versions[i]; var end = i + 1 < versions.Count ? versions[i + 1].EffectiveFrom.AddDays(-1) : DateOnly.MaxValue; if (end < Rules.Today) continue; await schedules.CheckTeacher(c, teacher, v, v.EffectiveFrom < Rules.Today ? Rules.Today : v.EffectiveFrom, end); } }
}
