using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
namespace NgoiNhaNho;
[ApiController, Authorize, Route("api/progress")]
public class ProgressController(AppDb db, Access access) : ControllerBase
{
    [Authorize(Roles = Roles.Operations), HttpGet("needs-evaluation/export")]
    public async Task<IActionResult> Export()
    {
        var result = System.Text.Json.JsonSerializer.SerializeToElement(await NeedsEvaluation()); var rows = new List<object?[]> { new object?[] { "Mã học viên", "Họ tên", "Chương trình", "Trạng thái" } };
        foreach (var s in result.EnumerateArray()) rows.Add(new object?[] { s.GetProperty("Code").GetString(), s.GetProperty("Name").GetString(), s.GetProperty("Program").GetString(), s.GetProperty("Status").GetString() }); return File(Spreadsheet.Create(rows), Spreadsheet.ContentType, "hoc-vien-can-danh-gia.xlsx");
    }
    public record ProgressInput(Guid StudentId, Guid SessionId, DateOnly EvaluationDate, string Status, string Note);
    public record ReviewInput(Guid StudentId, Guid SessionId, string Lines, string Colors, string Learning);
    [HttpGet("{studentId:guid}")]
    public async Task<object> History(Guid studentId)
    {
        await access.Student(studentId);
        return new { progress = await db.Progress.Where(p => p.StudentId == studentId).OrderByDescending(p => p.EvaluationDate).ToListAsync(), reviews = await db.Reviews.Where(p => p.StudentId == studentId).OrderByDescending(p => p.CreatedAt).ToListAsync(), artworks = await db.Artworks.Where(p => p.StudentId == studentId).OrderByDescending(p => p.CreatedAt).Select(a => new { a.Id, a.SessionId, a.CreatedAt, url = "/api/artworks/" + a.Id }).ToListAsync() };
    }
    [Authorize(Roles = Roles.Operations), HttpPost]
    public async Task<object> Record(ProgressInput input)
    {
        var st = await access.Student(input.StudentId); var (s, c) = await access.Session(input.SessionId);
        Rules.Require(st.Status == States.Studying, "Chỉ ghi nhận tiến độ cho học viên Đang học.");
        Rules.Require(await db.Attendances.AnyAsync(a => a.StudentId == st.Id && a.SessionId == s.Id) && s.Closed && Rules.At(s.Date, s.End) <= Rules.Now, "Ca học chưa kết thúc hoặc học viên không thuộc ca học.");
        Rules.Require(input.EvaluationDate >= s.Date && input.EvaluationDate <= Rules.Today, "Ngày đánh giá không hợp lệ!"); Rules.Require(input.Status is "Đúng tiến độ" or "Chậm tiến độ", "Tình trạng tiến độ không hợp lệ."); Rules.Text(input.Note, "nhận xét tiến độ");
        Rules.Require(!await db.Progress.AnyAsync(p => p.StudentId == st.Id && p.SessionId == s.Id), "Ca học này đã được ghi nhận tiến độ.");
        var p = new ProgressRecord { StudentId = st.Id, SessionId = s.Id, EvaluationDate = input.EvaluationDate, Status = input.Status, Note = input.Note, RecordedBy = access.Id }; db.Progress.Add(p); db.Track(access.Id, p); await db.SaveChangesAsync(); return p;
    }
    [Authorize(Roles = Roles.Teacher), HttpPost("review")]
    public async Task<object> Review(ReviewInput input)
    {
        await access.Student(input.StudentId); var (s, c) = await access.Session(input.SessionId, true); Rules.Require(Rules.At(s.Date, s.End) <= Rules.Now && s.Closed && await db.Attendances.AnyAsync(a => a.StudentId == input.StudentId && a.SessionId == s.Id && a.Present), "Chỉ nhận xét cho học viên có mặt trong ca đã kết thúc.");
        Rules.Text(input.Lines, "nét vẽ"); Rules.Text(input.Colors, "màu sắc"); Rules.Text(input.Learning, "khả năng tiếp thu"); Rules.Require(await db.Artworks.AnyAsync(a => a.StudentId == input.StudentId && a.SessionId == s.Id), "Vui lòng đăng tác phẩm trước khi lưu nhận xét.");
        Rules.Require(!await db.Reviews.AnyAsync(r => r.StudentId == input.StudentId && r.SessionId == s.Id), "Học viên đã có nhận xét trong ca này.");
        var r = new Review { StudentId = input.StudentId, SessionId = s.Id, Lines = input.Lines, Colors = input.Colors, Learning = input.Learning }; db.Reviews.Add(r); db.Track(access.Id, r); await db.SaveChangesAsync(); return r;
    }
    [Authorize(Roles = Roles.Operations), HttpGet("needs-evaluation")]
    public async Task<object> NeedsEvaluation() => await db.Students.Where(s => s.BranchId == access.BranchId && s.Status == States.Studying && db.Progress.Where(p => p.StudentId == s.Id).OrderByDescending(p => p.EvaluationDate).ThenByDescending(p => p.CreatedAt).Select(p => p.Status).FirstOrDefault() == "Chậm tiến độ").Select(s => new { s.Id, s.Code, s.Name, s.Program, s.Status }).ToListAsync();
}
