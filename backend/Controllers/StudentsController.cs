using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Data;
using System.Security.Cryptography;
using System.Text.Json;

namespace NgoiNhaNho;
[ApiController, Authorize, Route("api/students")]
public class StudentsController(AppDb db, Access access, IPasswordHasher<UserAccount> hasher) : ControllerBase
{
    public record StudentInput(string Name, DateOnly BirthDate, string Gender, string ParentName, string Phone, string Program, Guid? TrialId);
    [HttpGet]
    public async Task<object> List(string? q = null, string? status = null)
    {
        var query = db.Students.AsNoTracking().Where(s => s.BranchId == access.BranchId);
        if (access.Role == Roles.Parent) query = query.Where(s => s.ParentId == access.Id);
        else if (access.Role == Roles.Teacher) query = query.Where(s => db.Enrollments.Any(e => e.StudentId == s.Id && e.Until == null && db.Classes.Any(c => c.Id == e.ClassId && c.TeacherId == access.Id)) || db.Leaves.Any(l => l.StudentId == s.Id && l.Status == States.Approved && db.Sessions.Any(c => c.Id == l.MakeUpSessionId && c.TeacherId == access.Id)));
        else Rules.Require(access.Operations, "Bạn không có quyền xem hồ sơ học viên.", 403);
        if (!string.IsNullOrWhiteSpace(q)) query = query.Where(s => s.Name.Contains(q) || s.Code.Contains(q) || db.Users.Any(u => u.Id == s.ParentId && u.Login.Contains(q)));
        if (!string.IsNullOrWhiteSpace(status)) query = query.Where(s => s.Status == status);
        return await query.OrderBy(s => s.Name).Select(s => new { s.Id, s.Code, s.Name, s.BirthDate, s.Gender, s.ParentName, Phone = db.Users.Where(u => u.Id == s.ParentId).Select(u => u.Login).First(), s.Program, s.Status, s.CreatedAt }).ToListAsync();
    }
    [HttpGet("{id:guid}")]
    public async Task<object> Detail(Guid id)
    {
        var s = await access.Student(id);
        return new { student = s, tuitions = await db.Tuitions.Where(t => t.StudentId == id).OrderByDescending(t => t.Month).ToListAsync(), progress = await db.Progress.Where(t => t.StudentId == id).OrderByDescending(t => t.EvaluationDate).ToListAsync(), attendance = await db.Attendances.Where(t => t.StudentId == id && db.Sessions.Any(session => session.Id == t.SessionId && session.Closed)).ToListAsync() };
    }
    [Authorize(Roles = Roles.Operations), HttpPost]
    public async Task<object> Create(StudentInput input)
    {
        // Initial status remains the explicit BR-UC6-11 value; conflict is documented for owner confirmation.
        Validate(input); await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        var parent = await Parent(input.Phone, input.ParentName);
        Rules.Require(!await db.Students.AnyAsync(s => s.ParentId == parent.Id && s.Name == input.Name.Trim() && s.BirthDate == input.BirthDate), "Hồ sơ học viên đã tồn tại.");
        if (input.TrialId.HasValue) Rules.Require(await db.Trials.AnyAsync(t => t.Id == input.TrialId && t.BranchId == access.BranchId && t.ParentId == parent.Id && t.StudentName == input.Name.Trim() && t.BirthDate == input.BirthDate && t.Decision == "Đăng ký chính thức"), "Đơn học thử chưa có quyết định Đăng ký chính thức hoặc không khớp học viên.");
        var s = new Student { BranchId = access.BranchId, ParentId = parent.Id, Name = input.Name.Trim(), BirthDate = input.BirthDate, Gender = input.Gender, ParentName = input.ParentName, Program = input.Program, TrialId = input.TrialId }; db.Students.Add(s); db.Track(access.Id, s); await db.SaveChangesAsync(); await tx.CommitAsync(); return s;
    }
    [Authorize(Roles = Roles.Operations), HttpPut("{id:guid}")]
    public async Task<object> Update(Guid id, StudentInput input)
    {
        Validate(input); await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable); var s = await access.Student(id); var before = JsonSerializer.SerializeToElement(s);
        Rules.Require(s.Program == input.Program || !await db.Enrollments.AnyAsync(e => e.StudentId == id && e.Until == null), "Không đổi chương trình khi học viên đang thuộc lớp; cần xử lý xếp lớp phù hợp trước.");
        var parent = await Parent(input.Phone, input.ParentName); Rules.Require(!await db.Students.AnyAsync(x => x.Id != id && x.ParentId == parent.Id && x.Name == input.Name.Trim() && x.BirthDate == input.BirthDate), "Hồ sơ học viên đã tồn tại.");
        s.Name = input.Name.Trim(); s.BirthDate = input.BirthDate; s.Gender = input.Gender; s.ParentName = input.ParentName; s.ParentId = parent.Id; s.Program = input.Program;
        if (before.GetRawText() != JsonSerializer.Serialize(s)) db.Track(access.Id, s, before); await db.SaveChangesAsync(); await tx.CommitAsync(); return s;
    }
    [Authorize(Roles = Roles.Operations), HttpPost("{id:guid}/archive")]
    public async Task<object> Archive(Guid id)
    {
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable); var s = await access.Student(id); Rules.Require(s.Status != States.Archived, "Hồ sơ đã được bảo lưu."); var before = JsonSerializer.SerializeToElement(s); s.Status = States.Archived;
        foreach (var e in await db.Enrollments.Where(e => e.StudentId == id && e.Until == null).ToListAsync()) e.Until = Rules.Today.AddDays(-1);
        db.Track(access.Id, s, before); await db.SaveChangesAsync(); await tx.CommitAsync(); return new { message = "Bảo lưu hồ sơ học viên thành công!" };
    }
    [Authorize(Roles = Roles.Operations), HttpPost("{id:guid}/restore")]
    public async Task<object> Restore(Guid id)
    {
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable); var s = await access.Student(id); Rules.Require(s.Status == States.Archived, "Chỉ khôi phục hồ sơ Đã bảo lưu."); var before = JsonSerializer.SerializeToElement(s); s.Status = States.Waiting; db.Track(access.Id, s, before); await db.SaveChangesAsync(); await tx.CommitAsync(); return new { message = "Khôi phục hồ sơ học viên thành công!" };
    }
    private static void Validate(StudentInput x) { Rules.Require(Rules.ProgramFor(x.Name.Trim(), x.BirthDate) == x.Program, "Chương trình phải phù hợp độ tuổi."); Rules.Phone(x.Phone); Rules.Text(x.ParentName, "họ tên phụ huynh", 100); Rules.Text(x.Gender, "giới tính", 20); }
    private async Task<UserAccount> Parent(string phone, string name)
    {
        var u = await db.Users.SingleOrDefaultAsync(u => u.Login == phone); if (u is not null) { Rules.Require(u.Role == Roles.Parent && u.BranchId == access.BranchId, "Số điện thoại thuộc tài khoản không hợp lệ."); return u; }
        u = new UserAccount { Login = phone, Name = name, Role = Roles.Parent, BranchId = access.BranchId, MustChangePassword = true }; u.PasswordHash = hasher.HashPassword(u, Convert.ToBase64String(RandomNumberGenerator.GetBytes(24))); db.Users.Add(u); return u;
    }
}
