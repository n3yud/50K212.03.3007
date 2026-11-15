namespace NgoiNhaNho.Api.Common;

/// <summary>Các quy tắc nghiệp vụ cố định lấy từ đặc tả (BR-UC...). Sửa số ở đây là đổi cho toàn hệ thống.</summary>
public static class Rules
{
    public const int MaxClass = 7;        // BR-UC7-03: tối đa 7 học viên/lớp (tính cả học thử)
    public const int MaxWithMakeup = 8;   // BR-UC3-12: tối đa 8 khi có học bù
    public const int MaxMakeup = 2;       // BR-UC3-12: tối đa 2 học viên bù/ca
    public const int MakeupDays = 30;     // BR-UC3-08: hạn học bù 30 ngày

    public static readonly string[] Programs = { "Cơ bản", "Nâng cao" };
    public static readonly Dictionary<string, decimal> Price = new() { ["Cơ bản"] = 900_000m, ["Nâng cao"] = 900_000m };

    // Trạng thái đơn học thử được tính là "đang giữ chỗ" trong sĩ số ca
    public static readonly string[] ActiveTrial = { "Chờ phụ huynh xác nhận", "Chờ duyệt ca học thử", "Đã xếp ca", "Đã hoàn thành", "Đã tư vấn" };
    // Trạng thái yêu cầu học bù đang giữ chỗ ở ca bù
    public static readonly string[] HoldStates = { "Đã đăng ký học bù", "Chờ duyệt", "Đã xếp lịch bù" };

    // ---- thời gian: dùng giờ Việt Nam, không phụ thuộc múi giờ máy chủ ----
    private static readonly TimeZoneInfo Vn = FindVn();
    private static TimeZoneInfo FindVn()
    {
        foreach (var id in new[] { "Asia/Ho_Chi_Minh", "SE Asia Standard Time" })
        {
            try { return TimeZoneInfo.FindSystemTimeZoneById(id); }
            catch (TimeZoneNotFoundException) { /* thử tên tiếp theo */ }
        }
        return TimeZoneInfo.Local;
    }
    public static DateTime Now => DateTime.UtcNow;
    public static DateOnly Today => DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, Vn));

    /// <summary>0 = Chủ nhật, 1 = Thứ 2 ... 6 = Thứ 7 (trùng với cột Weekday trong CSDL)</summary>
    public static int Weekday(DateOnly d) => (int)d.DayOfWeek;
    public static string WeekdayLabel(int wd) => wd == 0 ? "Chủ nhật" : $"Thứ {wd + 1}";
    /// <summary>Lịch học cố định của trung tâm: (thứ 1, thứ 2, giờ bắt đầu, giờ kết thúc)</summary>
    public static readonly (int W1, int W2, string Start, string End)[] Schedules =
    {
        (1, 3, "17:30", "19:30"), (2, 4, "17:30", "19:30"),
        (6, 0, "07:30", "09:30"), (6, 0, "09:40", "11:40"), (6, 0, "14:30", "16:30"), (6, 0, "17:00", "19:00"),
    };
    public static bool ValidSchedule(int w1, int w2, string start, string end) => Schedules.Any(s => s.W1 == w1 && s.W2 == w2 && s.Start == start && s.End == end);
    public static string ScheduleLabel(int w1, int w2) => $"{WeekdayLabel(w1)} - {WeekdayLabel(w2)}";
    public static DateOnly StartOfWeek(DateOnly d) => d.AddDays(-(((int)d.DayOfWeek + 6) % 7)); // Thứ 2

    public static int Age(DateOnly dob, DateOnly on)
    {
        var a = on.Year - dob.Year;
        if (on < dob.AddYears(a)) a--;
        return a;
    }
    public static string? SuggestProgram(DateOnly dob)
    {
        var a = Age(dob, Today);
        return a is >= 5 and <= 6 ? "Cơ bản" : a is >= 7 and <= 15 ? "Nâng cao" : null;
    }
    public static bool Started(DateOnly date, TimeOnly start)
    {
        var t = Today;
        return date < t || (date == t && TimeOnly.FromDateTime(Now) >= start);
    }
    public static bool Ended(DateOnly date, TimeOnly end)
    {
        var t = Today;
        return date < t || (date == t && TimeOnly.FromDateTime(Now) >= end);
    }
    public static bool Overlap(TimeOnly s1, TimeOnly e1, TimeOnly s2, TimeOnly e2) => s1 < e2 && s2 < e1;
    public static int CountWeekdayInMonth(int wd, string month) // month = "YYYY-MM"
    {
        var y = int.Parse(month[..4]); var m = int.Parse(month[5..]); var c = 0;
        for (var d = 1; d <= DateTime.DaysInMonth(y, m); d++) if ((int)new DateOnly(y, m, d).DayOfWeek == wd) c++;
        return c;
    }
    public static string Month(DateOnly d) => d.ToString("yyyy-MM");
}
