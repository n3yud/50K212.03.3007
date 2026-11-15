using NgoiNhaNho.Api.Dtos;

namespace NgoiNhaNho.Api.Common;

/// <summary>Gộp thông tin ca + vài trường phụ thành một đối tượng JSON phẳng (khóa camelCase).</summary>
public static class Flat
{
    public static Dictionary<string, object?> Of(SessionInfo i, params (string Key, object? Value)[] extra)
    {
        var d = new Dictionary<string, object?>
        {
            ["key"] = i.Key, ["classId"] = i.ClassId, ["date"] = i.Date, ["name"] = i.Name, ["program"] = i.Program, ["start"] = i.Start, ["end"] = i.End,
            ["weekday"] = i.Weekday, ["code"] = i.Code, ["teacherId"] = i.TeacherId, ["teacher"] = i.Teacher, ["ended"] = i.Ended, ["started"] = i.Started,
        };
        foreach (var (k, v) in extra) d[k] = v;
        return d;
    }
}
