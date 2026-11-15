using Microsoft.EntityFrameworkCore;
using NgoiNhaNho.Api.Common;
using NgoiNhaNho.Api.Data;
using NgoiNhaNho.Api.Dtos;

namespace NgoiNhaNho.Api.Services;

/// <summary>Tình trạng cập nhật ảnh tác phẩm + nhận xét của một ca (dùng cho Giám sát, Giáo viên, Tổng quan).</summary>
public class ReviewService(AppDbContext db, ScheduleService sch)
{
    public record Review(SessionInfo Info, int Size, bool PhotoOk, bool CommentOk, bool Overdue, bool HasAttendance, string Reminder)
    {
        public bool Complete => PhotoOk && CommentOk;
        public string Missing => (PhotoOk, CommentOk) switch
        {
            (false, false) => "Chưa đăng ảnh tác phẩm, chưa nhập nhận xét",
            (false, true) => "Chưa đăng ảnh tác phẩm",
            (true, false) => "Chưa nhập nhận xét",
            _ => "",
        };
        public Dictionary<string, object?> ToJson() => Flat.Of(Info,
            ("size", Size), ("photo", PhotoOk ? "Đã đăng" : "Chưa đăng"), ("comment", CommentOk ? "Đã nhập" : "Chưa nhập"),
            ("compliance", Overdue ? "Quá hạn" : "Đúng hạn"), ("complete", Complete), ("missing", Missing), ("reminder", Reminder));
    }

    public async Task<Review> ReviewAsync(ClassRoom c, DateOnly date)
    {
        var info = sch.Info(c, date);
        var att = await db.Attendances.Include(a => a.Records).FirstOrDefaultAsync(a => a.ClassId == c.ClassId && a.SessionDate == date);
        var present = att?.Records.Where(r => r.PersonType == "Student" && r.Status == "present").Select(r => r.PersonId).ToList() ?? new List<int>();
        var items = await db.Journal.Where(j => j.ClassId == c.ClassId && j.SessionDate == date && present.Contains(j.StudentId)).ToListAsync();
        var photoOk = present.Count > 0 && present.All(id => items.Any(j => j.StudentId == id && j.PhotoPath != null));
        var commentOk = present.Count > 0 && present.All(id => items.Any(j => j.StudentId == id && j.StrokeComment != null));
        var overdue = date < Rules.Today && !(photoOk && commentOk);
        var size = att?.Records.Count ?? (await sch.LoadAsync(c.ClassId, date)).Official;
        var rem = (await db.Reminders.FirstOrDefaultAsync(r => r.ClassId == c.ClassId && r.SessionDate == date))?.Status ?? "Chưa gửi nhắc nhở";
        return new Review(info, size, photoOk, commentOk, overdue, att != null, rem);
    }
}
