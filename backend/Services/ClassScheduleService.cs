using Microsoft.EntityFrameworkCore;
namespace NgoiNhaNho;
public class ClassScheduleService(AppDb db)
{
    public async Task<ClassScheduleVersion> At(ArtClass c, DateOnly date)
    {
        return await db.ClassSchedules.Where(v => v.ClassId == c.Id && v.EffectiveFrom <= date).OrderByDescending(v => v.EffectiveFrom).FirstOrDefaultAsync()
            ?? new ClassScheduleVersion { ClassId = c.Id, EffectiveFrom = DateOnly.MinValue, Weekday = c.Weekday, Start = c.Start, End = c.End, Program = c.Program };
    }
    public async Task<int> Materialize(ArtClass c, DateOnly from, DateOnly to)
    {
        int count = 0; var versions = await db.ClassSchedules.Where(v => v.ClassId == c.Id).OrderBy(v => v.EffectiveFrom).ToListAsync();
        for (var date = from; date <= to; date = date.AddDays(1))
        {
            var v = versions.LastOrDefault(v => v.EffectiveFrom <= date) ?? new ClassScheduleVersion { Weekday = c.Weekday, Start = c.Start, End = c.End, Program = c.Program };
            if ((int)date.DayOfWeek != v.Weekday) continue;
            var row = await db.Sessions.SingleOrDefaultAsync(s => s.ClassId == c.Id && s.Date == date);
            if (row is null) { db.Sessions.Add(new ClassSession { ClassId = c.Id, TeacherId = c.TeacherId!.Value, Date = date, Start = v.Start, End = v.End, Program = v.Program }); count++; }
            else if (row.Cancelled) { row.Cancelled = false; row.Start = v.Start; row.End = v.End; row.Program = v.Program; row.TeacherId = c.TeacherId!.Value; count++; }
        }
        return count;
    }
    public async Task<bool> Conflicts(Guid otherClass, ClassScheduleVersion candidate, DateOnly from, DateOnly? until = null)
    {
        var versions = await db.ClassSchedules.Where(v => v.ClassId == otherClass).OrderBy(v => v.EffectiveFrom).ToListAsync();
        if (versions.Count == 0) { var c = await db.Classes.SingleAsync(c => c.Id == otherClass); versions.Add(new ClassScheduleVersion { Weekday = c.Weekday, Start = c.Start, End = c.End, EffectiveFrom = DateOnly.MinValue }); }
        for (int i = 0; i < versions.Count; i++)
        {
            var v = versions[i]; var start = v.EffectiveFrom > from ? v.EffectiveFrom : from; var end = i + 1 < versions.Count ? versions[i + 1].EffectiveFrom.AddDays(-1) : DateOnly.MaxValue; if (until.HasValue && until < end) end = until.Value;
            if (end < start || v.Weekday != candidate.Weekday || v.Start >= candidate.End || v.End <= candidate.Start) continue;
            int offset = (v.Weekday - (int)start.DayOfWeek + 7) % 7; if (end.DayNumber - start.DayNumber >= offset) return true;
        }
        return false;
    }
    public async Task CheckTeacher(ArtClass c, Guid teacher, ClassScheduleVersion candidate, DateOnly from, DateOnly? until = null)
    {
        var others = await db.Classes.Where(x => x.Id != c.Id && x.TeacherId == teacher).Select(x => x.Id).ToListAsync();
        foreach (var id in others) Rules.Require(!await Conflicts(id, candidate, from, until), "Lịch giảng dạy của giáo viên bị trùng.");
    }
}
