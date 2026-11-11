using System.Text.RegularExpressions;

namespace NgoiNhaNho;

public class BusinessError(string message, int status = 400) : Exception(message) { public int Status { get; } = status; }
public static class Rules
{
    public static DateTimeOffset Now => DateTimeOffset.UtcNow.ToOffset(TimeSpan.FromHours(7));
    public static DateOnly Today => DateOnly.FromDateTime(Now.DateTime);
    public static string Month(DateOnly date) => date.ToString("yyyy-MM");
    public static DateTimeOffset At(DateOnly date, TimeOnly time) => new(date.ToDateTime(time), TimeSpan.FromHours(7));
    public static void Require(bool condition, string message, int status = 400) { if (!condition) throw new BusinessError(message, status); }
    public static void Text(string value, string label, int max = 2000) => Require(!string.IsNullOrWhiteSpace(value) && value.Length <= max, $"Vui lòng nhập {label} hợp lệ!");
    public static string ProgramFor(string name, DateOnly birth)
    {
        Require(Regex.IsMatch(name, @"^[\p{L} ]{2,50}$") && !string.IsNullOrWhiteSpace(name), "Họ tên chỉ gồm chữ cái và khoảng trắng, dài 2–50 ký tự.");
        Require(birth <= Today, "Ngày sinh không hợp lệ.");
        int age = Today.Year - birth.Year; if (birth > Today.AddYears(-age)) age--;
        Require(age >= 5 && age <= 15, "Học viên phải từ 5 đến 15 tuổi.");
        return age <= 6 ? "Cơ bản" : "Nâng cao";
    }
    public static void Phone(string phone) => Require(Regex.IsMatch(phone, @"^0[0-9]{9}$"), "Số điện thoại gồm 10 chữ số và bắt đầu bằng 0.");
    public static void Class(ArtClass c)
    {
        Text(c.Name, "tên lớp", 100);
        Require(c.Program is "Cơ bản" or "Nâng cao", "Chương trình học không hợp lệ.");
        Require(c.Capacity is >= 1 and <= 7, "Sĩ số tối đa không vượt quá 7 học viên.");
        Require(c.Weekday is >= 0 and <= 6 && c.Weekday != 5 && c.End > c.Start, "Lịch học không hợp lệ; trung tâm nghỉ Thứ 6.");
    }
}
