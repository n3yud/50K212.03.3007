using System.Security.Claims;
using Microsoft.EntityFrameworkCore;

namespace NgoiNhaNho;
public class Access(AppDb db, IHttpContextAccessor http)
{
    public Guid Id => Guid.Parse(http.HttpContext!.User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    public string Role => http.HttpContext!.User.FindFirstValue(ClaimTypes.Role)!;
    public Guid BranchId => Guid.Parse(http.HttpContext!.User.FindFirstValue("branch")!);
    public bool Operations => Role is Roles.Assistant or Roles.Manager;
    public async Task<Student> Student(Guid id)
    {
        var s = await db.Students.SingleOrDefaultAsync(x => x.Id == id && x.BranchId == BranchId);
        Rules.Require(s is not null, "Không tìm thấy hồ sơ học viên.", 404);
        if (Role == Roles.Parent) Rules.Require(s!.ParentId == Id, "Bạn không có quyền truy cập dữ liệu này.", 403);
        else if (Role == Roles.Teacher) Rules.Require(await db.Enrollments.AnyAsync(e => e.StudentId == id && e.Until == null && db.Classes.Any(c => c.Id == e.ClassId && c.TeacherId == Id)) || await db.Attendances.AnyAsync(a => a.StudentId == id && db.Sessions.Any(s => s.Id == a.SessionId && s.TeacherId == Id)) || await db.Leaves.AnyAsync(l => l.StudentId == id && l.Status == States.Approved && db.Sessions.Any(c => c.Id == l.MakeUpSessionId && c.TeacherId == Id)), "Bạn không phụ trách học viên này.", 403);
        else Rules.Require(Operations, "Bạn không có quyền truy cập dữ liệu này.", 403);
        return s!;
    }
    public async Task<(ClassSession Session, ArtClass Class)> Session(Guid id, bool teacherOnly = false)
    {
        var s = await db.Sessions.FindAsync(id); Rules.Require(s is not null && !s.Cancelled, "Không tìm thấy ca học.", 404);
        var c = await db.Classes.SingleAsync(x => x.Id == s!.ClassId);
        Rules.Require(c.BranchId == BranchId, "Bạn không có quyền truy cập ca học này.", 403);
        if (teacherOnly) Rules.Require(Role == Roles.Teacher && s!.TeacherId == Id, "Bạn không phụ trách ca học này.", 403);
        return (s!, c);
    }
}
