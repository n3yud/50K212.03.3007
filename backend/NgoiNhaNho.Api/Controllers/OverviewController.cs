using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NgoiNhaNho.Api.Auth;
using NgoiNhaNho.Api.Common;
using NgoiNhaNho.Api.Data;
using NgoiNhaNho.Api.Services;

namespace NgoiNhaNho.Api.Controllers;

/// <summary>Màn hình Tổng quan cho Trợ lý / Quản lý / Giám sát.</summary>
[ApiController, Route("api/overview")]
public class OverviewController(AppDbContext db, ScheduleService sch, ReviewService rev) : ControllerBase
{
    private async Task<List<Dictionary<string, object?>>> SessionsOn(DateOnly date)
    {
        var map = await sch.LoadMapAsync(date, date); var res = new List<Dictionary<string, object?>>();
        foreach (var c in await db.Classes.Include(c => c.Teacher).Where(c => c.Weekday == (byte)Rules.Weekday(date) || c.Weekday2 == (byte)Rules.Weekday(date)).OrderBy(c => c.StartTime).ToListAsync())
            res.Add(Flat.Of(sch.Info(c, date), ("load", map.Get(c.ClassId, date))));
        return res;
    }

    [HttpGet("assistant"), Authorize(Roles = Roles.Ops)]
    public async Task<object> Assistant()
    {
        var t = Rules.Today;
        var weekStart = Rules.StartOfWeek(t);
        var recs = await (from r in db.AttendanceRecords join a in db.Attendances on r.AttendanceId equals a.AttendanceId
                          where r.PersonType == "Student" && r.Status == "present" && a.SessionDate >= weekStart && a.SessionDate <= t
                          select new { r.PersonId, a.ClassId, a.SessionDate }).ToListAsync();
        var done = await db.ProgressRecords.Where(p => p.SessionDate >= weekStart).Select(p => new { p.StudentId, p.ClassId, p.SessionDate }).ToListAsync();
        var due = recs.Where(r => !done.Any(d => d.StudentId == r.PersonId && d.ClassId == r.ClassId && d.SessionDate == r.SessionDate)).Select(r => r.PersonId).Distinct().Count();
        return new { waiting = await db.Trials.CountAsync(x => x.Status == "Chờ tiếp nhận"), todaySessions = await SessionsOn(t),
            tuitionAlerts = (await ReportsController.TuitionAlertRows(db, sch)).Count, progressDue = due, todayLabel = t.ToString("yyyy-MM-dd") };
    }

    [HttpGet("manager"), Authorize(Roles = Roles.Manager)]
    public async Task<object> Manager()
    {
        await sch.ExpireAbsencesAsync();
        var t = Rules.Today; var weekStart = Rules.StartOfWeek(t); var wsDt = weekStart.ToDateTime(TimeOnly.MinValue);
        var trials = await db.Trials.Where(x => x.Status == "Chờ duyệt ca học thử" && x.SessionClassId != null).ToListAsync();
        var trialPending = new List<object>();
        foreach (var g in trials.GroupBy(x => x.SessionKey))
        {
            var info = await sch.InfoAsync(g.Key);
            trialPending.Add(new { type = "Ca học thử", key = g.Key, info, load = await sch.LoadAsync(info.ClassId, DateOnly.Parse(info.Date)) });
        }
        var mk = new List<object>(); foreach (var a in await db.Absences.Where(a => a.Status == "Chờ duyệt").ToListAsync()) mk.Add(await sch.ToDtoAsync(a));
        var alerts = await ReportsController.TuitionAlertRows(db, sch);
        var students = await db.Students.ToListAsync();
        var atts = await db.Attendances.Include(a => a.Records).Where(a => a.SessionDate >= weekStart && a.SessionDate <= t).ToListAsync();
        var absences = await db.Absences.Select(a => new { a.StudentId, a.ClassId, a.SessionDate }).ToListAsync();
        int present = 0, recs = 0, exc = 0, une = 0;
        foreach (var a in atts) foreach (var r in a.Records)
        {
            recs++;
            if (r.Status == "present") present++;
            else if (r.PersonType == "Student" && absences.Any(x => x.StudentId == r.PersonId && x.ClassId == a.ClassId && x.SessionDate == a.SessionDate)) exc++; else une++;
        }
        return new { trialPending, makeupPending = mk, tuitionAlerts = alerts.Count, alertRows = alerts.Take(5),
            students = new { total = students.Count, fresh = students.Count(s => s.CreatedAt >= wsDt && s.Status != "Đã bảo lưu"), reserved = students.Count(s => s.Status == "Đã bảo lưu"), old = students.Count(s => s.CreatedAt < wsDt && s.Status != "Đã bảo lưu") },
            ops = new { sessions = atts.Count, avg = atts.Count == 0 ? 0 : (double)recs / atts.Count, rate = recs == 0 ? 0 : present * 100.0 / recs, exc, une, makeups = await db.Absences.CountAsync(a => a.Status == "Đã xếp lịch bù") },
            month = Rules.Month(t) };
    }

    [HttpGet("supervisor"), Authorize(Roles = Roles.Supervisor)]
    public async Task<object> Supervisor()
    {
        var t = Rules.Today; var classes = await db.Classes.Include(c => c.Teacher).ToListAsync();
        var endedToday = new List<ReviewService.Review>();
        foreach (var c in classes.Where(c => c.Meets(Rules.Weekday(t)) && Rules.Ended(t, c.EndTime))) endedToday.Add(await rev.ReviewAsync(c, t));
        var viol = new List<ReviewService.Review>();
        for (var i = 1; i <= 14; i++)
        {
            var d = t.AddDays(-i);
            foreach (var c in classes.Where(c => c.Meets(Rules.Weekday(d))))
            {
                var r = await rev.ReviewAsync(c, d);
                if (r.HasAttendance && r.Overdue) viol.Add(r);
            }
        }
        return new { endedToday = endedToday.Select(r => r.ToJson()).ToList(), violations = viol.Select(r => r.ToJson()).ToList(),
            noPhoto = endedToday.Count(r => !r.PhotoOk), noComment = endedToday.Count(r => !r.CommentOk) };
    }
}
