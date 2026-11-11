using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Data;
using System.Text.Json;
namespace NgoiNhaNho;
[ApiController, Authorize(Roles = Roles.Parent + "," + Roles.Operations), Route("api/tuition")]
public class TuitionController(AppDb db, Access access, IConfiguration config) : ControllerBase
{
    public record TuitionInput(Guid StudentId, string Month);
    [HttpGet]
    public async Task<object> List(string? month = null)
    {
        month ??= Rules.Month(Rules.Today); ValidateMonth(month);
        var students = await db.Students.Where(s => s.BranchId == access.BranchId && (access.Role != Roles.Parent || s.ParentId == access.Id)).OrderBy(s => s.Name).ToListAsync(); var rows = await db.Tuitions.Where(t => t.Month == month && students.Select(s => s.Id).Contains(t.StudentId)).ToListAsync();
        return students.Select(s => { var t = rows.SingleOrDefault(t => t.StudentId == s.Id); return new { s.Id, s.Name, s.Program, StudentStatus = s.Status, Month = month, Status = t?.Paid == true ? "Đã thanh toán" : "Chưa thanh toán", Amount = t?.Amount ?? Fee(s.Program), Remaining = t?.Remaining ?? 0, Lessons = t?.Lessons }; });
    }
    [Authorize(Roles = Roles.Operations), HttpPost]
    public async Task<object> Record(TuitionInput input)
    {
        ValidateMonth(input.Month); await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable); var s = await access.Student(input.StudentId); Rules.Require(s.Status != States.Archived, "Không ghi nhận học phí cho hồ sơ Đã bảo lưu.");
        var fee = Fee(s.Program); Rules.Require(fee is null or >= 0, "Biểu phí không hợp lệ.");
        var first = DateOnly.ParseExact(input.Month + "-01", "yyyy-MM-dd"); var next = first.AddMonths(1);
        var lessons = await (from session in db.Sessions join enrollment in db.Enrollments on session.ClassId equals enrollment.ClassId where !session.Cancelled && enrollment.StudentId == s.Id && session.Date >= first && session.Date < next && session.Date >= enrollment.From && (enrollment.Until == null || session.Date <= enrollment.Until) select session.Id).Distinct().CountAsync();
        Rules.Require(lessons > 0, "Tháng này chưa có ca học thực tế của học viên. Vui lòng kiểm tra lịch lớp và tạo đủ ca trong tháng trước khi ghi nhận học phí.");
        var t = await db.Tuitions.SingleOrDefaultAsync(t => t.StudentId == s.Id && t.Month == input.Month); Rules.Require(t?.Paid != true, "Học phí tháng này đã được ghi nhận."); var before = t is null ? null : (object)JsonSerializer.SerializeToElement(t);
        if (t is null) { t = new Tuition { StudentId = s.Id, Month = input.Month }; db.Tuitions.Add(t); }
        t.Amount = fee; t.Paid = true; t.Lessons = lessons; t.Remaining = lessons; t.RecordedBy = access.Id; t.RecordedAt = DateTimeOffset.UtcNow; db.Track(access.Id, t, before); await db.SaveChangesAsync(); await tx.CommitAsync(); return new { message = $"Ghi nhận học phí thành công! Tháng có {lessons} ca học thực tế." };
    }
    private decimal? Fee(string program) => config.GetValue<decimal?>(program == "Cơ bản" ? "Business:BasicMonthlyFee" : "Business:AdvancedMonthlyFee");
    private static void ValidateMonth(string month) => Rules.Require(DateOnly.TryParseExact(month + "-01", "yyyy-MM-dd", out _), "Tháng phải có định dạng yyyy-MM.");
}
