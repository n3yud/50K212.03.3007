using Microsoft.EntityFrameworkCore;
using NgoiNhaNho.Api.Common;
using NgoiNhaNho.Api.Data;
using NgoiNhaNho.Api.Dtos;

namespace NgoiNhaNho.Api.Services;

/// <summary>Quy tắc dùng chung về ca học: thông tin ca, sĩ số, số buổi còn lại, ca học bù khả dụng.</summary>
public class ScheduleService(AppDbContext db)
{
    public static string Key(int classId, DateOnly date) => $"{classId}|{date:yyyy-MM-dd}";
    public static (int ClassId, DateOnly Date) ParseKey(string? key)
    {
        var p = (key ?? "").Split('|');
        if (p.Length != 2 || !int.TryParse(p[0], out var c) || !DateOnly.TryParse(p[1], out var d))
            throw new ApiException("Mã ca học không hợp lệ");
        return (c, d);
    }
    public static string Hm(TimeOnly t) => t.ToString("HH:mm");

    public SessionInfo Info(ClassRoom c, DateOnly date)
    {
        var code = $"{(c.Program == "Cơ bản" ? "CB" : "NC")}{date:dd}{date:MM}{c.Letter}";
        return new SessionInfo(Key(c.ClassId, date), c.ClassId, date.ToString("yyyy-MM-dd"), c.Name, c.Program, Hm(c.StartTime), Hm(c.EndTime),
            Rules.Weekday(date), code, c.TeacherId, c.Teacher?.DisplayName ?? "", Rules.Ended(date, c.EndTime), Rules.Started(date, c.StartTime));
    }

    public async Task<ClassRoom> GetClassAsync(int id) =>
        await db.Classes.Include(c => c.Teacher).FirstOrDefaultAsync(c => c.ClassId == id) ?? throw ApiException.NotFound("Không tìm thấy lớp học");

    public async Task<SessionInfo> InfoAsync(string key)
    {
        var (cid, date) = ParseKey(key);
        return Info(await GetClassAsync(cid), date);
    }

    // ---------- sĩ số ----------
    /// <summary>Nạp sẵn số liệu sĩ số của mọi ca trong khoảng ngày bằng vài truy vấn (tránh gọi CSDL cho từng ca).</summary>
    public async Task<LoadMap> LoadMapAsync(DateOnly from, DateOnly to)
    {
        var official = await db.StudentClasses.Where(x => x.IsActive && x.Student!.Status == "Đang học")
            .GroupBy(x => x.ClassId).Select(g => new { g.Key, N = g.Count() }).ToDictionaryAsync(x => x.Key, x => x.N);
        var trials = await db.Trials.Where(t => t.SessionClassId != null && Rules.ActiveTrial.Contains(t.Status) && t.SessionDate >= from && t.SessionDate <= to)
            .GroupBy(t => new { t.SessionClassId, t.SessionDate }).Select(g => new { g.Key.SessionClassId, g.Key.SessionDate, N = g.Count() }).ToListAsync();
        var bus = await db.Absences.Where(a => a.MakeupClassId != null && Rules.HoldStates.Contains(a.Status) && a.MakeupDate >= from && a.MakeupDate <= to)
            .GroupBy(a => new { a.MakeupClassId, a.MakeupDate }).Select(g => new { g.Key.MakeupClassId, g.Key.MakeupDate, N = g.Count() }).ToListAsync();
        return new LoadMap(official,
            trials.ToDictionary(x => (x.SessionClassId!.Value, x.SessionDate!.Value), x => x.N),
            bus.ToDictionary(x => (x.MakeupClassId!.Value, x.MakeupDate!.Value), x => x.N));
    }
    public async Task<LoadInfo> LoadAsync(int classId, DateOnly date) => (await LoadMapAsync(date, date)).Get(classId, date);

    // ---------- số buổi còn lại theo tháng (BR-UC9-06, BR-UC3-06, BR-UC11-06/07) ----------
    public async Task<int> RemainingAsync(int studentId, string month)
    {
        var tu = await db.Tuition.FirstOrDefaultAsync(t => t.StudentId == studentId && t.Month == month && t.Status == "Đã thanh toán");
        if (tu == null) return 0;
        var first = DateOnly.Parse(month + "-01"); var next = first.AddMonths(1);
        var classIds = await db.StudentClasses.Where(x => x.StudentId == studentId && x.IsActive).Select(x => x.ClassId).ToListAsync();
        var present = await (from r in db.AttendanceRecords
                             join a in db.Attendances on r.AttendanceId equals a.AttendanceId
                             where r.PersonType == "Student" && r.PersonId == studentId && r.Status == "present"
                                   && a.SessionDate >= first && a.SessionDate < next && classIds.Contains(a.ClassId)
                             select r).CountAsync();
        var absent = await db.Absences.CountAsync(a => a.StudentId == studentId && a.SessionDate >= first && a.SessionDate < next);
        return Math.Max(0, tu.TotalSessions - present - absent);
    }

    // ---------- các ca chưa diễn ra của học viên ----------
    public async Task<List<SessionInfo>> NextSessionsAsync(int studentId, int days = 35)
    {
        var classes = await db.Classes.Include(c => c.Teacher)
            .Where(c => db.StudentClasses.Any(sc => sc.ClassId == c.ClassId && sc.StudentId == studentId && sc.IsActive))
            .ToListAsync();
        var res = new List<SessionInfo>(); var t = Rules.Today;
        for (var i = 0; i <= days; i++)
        {
            var d = t.AddDays(i);
            foreach (var c in classes.Where(c => c.Meets(Rules.Weekday(d)) && !Rules.Started(d, c.StartTime))) res.Add(Info(c, d));
        }
        return res.OrderBy(s => s.Date).ThenBy(s => s.Start).ToList();
    }

    // ---------- ca học bù khả dụng (BR-UC3-11, BR-UC3-12) ----------
    public async Task<List<SessionWithLoad>> AvailableMakeupsAsync(Absence a)
    {
        var s = await db.Students.FirstAsync(x => x.StudentId == a.StudentId);
        var t = Rules.Today; var last = a.Deadline < t.AddDays(Rules.MakeupDays) ? a.Deadline : t.AddDays(Rules.MakeupDays);
        var all = await db.Classes.Include(c => c.Teacher).ToListAsync();
        var own = await db.StudentClasses.Where(x => x.StudentId == s.StudentId && x.IsActive).Select(x => x.Class!).ToListAsync();
        var map = await LoadMapAsync(t, last);
        var res = new List<SessionWithLoad>();
        for (var d = t; d <= last; d = d.AddDays(1))
        {
            foreach (var c in all.Where(c => c.Program == s.Program && c.Meets(Rules.Weekday(d)) && !Rules.Started(d, c.StartTime)))
            {
                if (c.ClassId == a.ClassId && d == a.SessionDate) continue;
                if (own.Any(o => o.SharesDay(c) && Rules.Overlap(o.StartTime, o.EndTime, c.StartTime, c.EndTime))) continue; // trùng lịch của chính bé
                var l = map.Get(c.ClassId, d);
                if (l.Bu < Rules.MaxMakeup && l.Base + l.Bu + 1 <= Rules.MaxWithMakeup) res.Add(new SessionWithLoad(Info(c, d), l));
            }
        }
        return res;
    }

    /// <summary>Hết hạn học bù tự động (BR-UC3-16): gọi trước khi đọc/ghi các yêu cầu học bù.</summary>
    public async Task ExpireAbsencesAsync()
    {
        var t = Rules.Today;
        var list = await db.Absences.Where(a => a.Deadline < t && (a.Status == "Chờ xếp lịch bù" || a.Status == "Đã đăng ký học bù" || a.Status == "Chờ duyệt")).ToListAsync();
        if (list.Count == 0) return;
        foreach (var a in list) { a.Status = "Hết hạn"; a.MakeupClassId = null; a.MakeupDate = null; }
        await db.SaveChangesAsync();
    }


    /// <summary>Tạo yêu cầu nghỉ (dùng chung cho Phụ huynh gửi và Trợ lý ghi nhận). Chưa SaveChanges.</summary>
    public async Task<Absence> CreateAbsenceAsync(Student s, string? key, string? reason, int by)
    {
        var (cid, date) = ParseKey(key);
        if (!await db.StudentClasses.AnyAsync(x => x.StudentId == s.StudentId && x.ClassId == cid && x.IsActive)) throw new ApiException("Ca học không thuộc lịch của học viên");
        if (await db.Absences.AnyAsync(a => a.StudentId == s.StudentId && a.ClassId == cid && a.SessionDate == date)) throw new ApiException("Buổi học này đã được gửi đơn xin nghỉ trước đó"); // BR-UC3-05
        if (await RemainingAsync(s.StudentId, Rules.Month(date)) <= 0) throw new ApiException("Học viên đã hết số buổi học còn lại. Vui lòng liên hệ Trợ lý để được hỗ trợ"); // BR-UC3-06
        var a = new Absence { StudentId = s.StudentId, ClassId = cid, SessionDate = date, Reason = string.IsNullOrWhiteSpace(reason) ? null : reason.Trim(), Status = "Chờ xếp lịch bù", Deadline = date.AddDays(Rules.MakeupDays), CreatedAt = Rules.Now, CreatedBy = by };
        db.Absences.Add(a);
        return a;
    }

    public async Task<string> LabelAsync(string key)
    {
        var i = await InfoAsync(key);
        return $"{Rules.WeekdayLabel(i.Weekday)} {i.Date} · {i.Start} - {i.End}";
    }

    public async Task<AbsenceDto> ToDtoAsync(Absence a)
    {
        var s = await db.Students.FirstAsync(x => x.StudentId == a.StudentId);
        var cls = await GetClassAsync(a.ClassId);
        SessionWithLoad? mk = null;
        if (a.MakeupClassId != null) { var mc = await GetClassAsync(a.MakeupClassId.Value); mk = new SessionWithLoad(Info(mc, a.MakeupDate!.Value), await LoadAsync(mc.ClassId, a.MakeupDate.Value)); }
        return new AbsenceDto(a.AbsenceId, a.Status, a.Reason, a.Deadline.ToString("yyyy-MM-dd"), a.Deadline.DayNumber - Rules.Today.DayNumber,
            new StudentRef(s.StudentId, s.FullName, s.Code, s.Program, s.ParentPhone), Info(cls, a.SessionDate), mk);
    }
}

/// <summary>Bảng tra sĩ số đã nạp sẵn.</summary>
public class LoadMap(Dictionary<int, int> official, Dictionary<(int, DateOnly), int> trials, Dictionary<(int, DateOnly), int> bu)
{
    public LoadInfo Get(int classId, DateOnly date)
    {
        var o = official.GetValueOrDefault(classId); var t = trials.GetValueOrDefault((classId, date)); var b = bu.GetValueOrDefault((classId, date));
        var baseN = o + t;
        return new LoadInfo(o, t, b, baseN, baseN + b, b > 0 ? Rules.MaxWithMakeup : Rules.MaxClass);
    }
}
