using System.Text.RegularExpressions;
using NgoiNhaNho.Api.Dtos;

namespace NgoiNhaNho.Api.Common;

/// <summary>Kiểm tra dữ liệu đầu vào ở Backend (giao diện cũng kiểm tra, nhưng Backend là nơi quyết định).</summary>
public static partial class Validators
{
    [GeneratedRegex(@"^0\d{9}$")] public static partial Regex PhoneRx();
    [GeneratedRegex(@"^[A-Za-zÀ-ỹĐđ\s]+$")] public static partial Regex NameRx();

    public static bool TryDate(string? s, out DateOnly d) => DateOnly.TryParse(s, out d);

    public static Dictionary<string, string> ChildErrors(string? name, string? dob)
    {
        var e = new Dictionary<string, string>();
        var n = (name ?? "").Trim();
        if (n.Length == 0) e["name"] = "Vui lòng nhập họ tên học viên";
        else if (n.Length < 2 || n.Length > 50 || !NameRx().IsMatch(n)) e["name"] = "Họ tên chỉ gồm chữ cái, dài từ 2 đến 50 ký tự";
        if (!TryDate(dob, out var d)) e["dob"] = "Vui lòng chọn ngày sinh";
        else if (d > Rules.Today) e["dob"] = "Ngày sinh không được sau ngày hiện tại";
        else { var a = Rules.Age(d, Rules.Today); if (a < 5 || a > 15) e["dob"] = "Học viên cần từ 5 đến 15 tuổi (Cơ bản 5–6 tuổi, Nâng cao 7–15 tuổi)"; }
        return e;
    }

    public static Dictionary<string, string> StudentErrors(StudentRequest f)
    {
        var e = new Dictionary<string, string>();
        var ce = ChildErrors(f.FullName, f.Dob);
        if (ce.TryGetValue("name", out var m1)) e["fullName"] = m1;
        if (ce.TryGetValue("dob", out var m2)) e["dob"] = m2;
        if (f.Gender is not ("Nam" or "Nữ")) e["gender"] = "Vui lòng chọn giới tính";
        if (string.IsNullOrWhiteSpace(f.ParentName)) e["parentName"] = "Vui lòng nhập họ tên phụ huynh";
        if (!PhoneRx().IsMatch(f.ParentPhone ?? "")) e["parentPhone"] = "Số điện thoại gồm đúng 10 chữ số và bắt đầu bằng số 0";
        if (string.IsNullOrEmpty(f.Program) || !Rules.Programs.Contains(f.Program)) e["program"] = "Vui lòng chọn chương trình học";
        else if (TryDate(f.Dob, out var d) && !ce.ContainsKey("dob") && Rules.SuggestProgram(d) != f.Program) e["program"] = "Chương trình học không phù hợp độ tuổi (Cơ bản 5–6 tuổi, Nâng cao 7–15 tuổi)";
        return e;
    }
}
