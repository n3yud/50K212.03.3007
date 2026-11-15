using BCrypt.Net;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NgoiNhaNho.Api.Auth;
using NgoiNhaNho.Api.Common;
using NgoiNhaNho.Api.Data;
using NgoiNhaNho.Api.Dtos;
using NgoiNhaNho.Api.Services;

namespace NgoiNhaNho.Api.Controllers;

[ApiController]
public class TrialsController(AppDbContext db, ScheduleService sch, Notifier nt) : ControllerBase
{
    private static List<int> Days(string s) => s.Split(',', StringSplitOptions.RemoveEmptyEntries).Select(int.Parse).ToList();

    private async Task<List<TrialDto>> ToDtos(List<Trial> list, bool showSession = true)
    {
        var classes = await db.Classes.Include(c => c.Teacher).ToDictionaryAsync(c => c.ClassId);
        return list.Select(t => new TrialDto(t.TrialId, t.StudentName, t.DateOfBirth.ToString("yyyy-MM-dd"), t.ParentPhone, Days(t.WishDays), t.WishSlot, t.Program, t.Status,
            t.SessionClassId == null ? null : t.SessionKey, t.CreatedAt.ToString("o"), Rules.Age(t.DateOfBirth, Rules.Today), Rules.SuggestProgram(t.DateOfBirth),
            showSession && t.SessionClassId != null ? sch.Info(classes[t.SessionClassId.Value], t.SessionDate!.Value) : null)).ToList();
    }

    // ===================== CÔNG KHAI: đăng ký học thử (không cần đăng nhập) =====================
    [HttpPost("api/trials")]
    public async Task<RegisterTrialResult> Register(RegisterTrialRequest req)
    {
        var kids = req.Children ?? new();
        var fields = new Dictionary<string, string>();
        if (!Validators.PhoneRx().IsMatch(req.ParentPhone ?? "")) fields["parentPhone"] = "Số điện thoại gồm đúng 10 chữ số và bắt đầu bằng số 0";
        if (req.WishDays is not { Count: > 0 } || string.IsNullOrWhiteSpace(req.WishSlot)) fields["wish"] = "Vui lòng chọn khung giờ mong muốn";
        if (kids.Count == 0) fields["children"] = "Vui lòng nhập ít nhất một học viên";
        var childErrs = kids.Select(c => Validators.ChildErrors(c.Name, c.Dob)).ToList();
        if (fields.Count > 0 || childErrs.Any(e => e.Count > 0))
            throw new ApiException("Thông tin đăng ký không hợp lệ. Vui lòng kiểm tra lại!") { Fields = fields, Children = childErrs };

        var phone = req.ParentPhone!;
        // BR-UC2-06: mỗi học viên chỉ có 1 đơn hiệu lực
        for (var i = 0; i < kids.Count; i++)
        {
            var name = kids[i].Name!.Trim().ToLower(); var dob = DateOnly.Parse(kids[i].Dob!);
            var dup = await db.Trials.AnyAsync(t => t.StudentName.ToLower() == name && t.DateOfBirth == dob && t.ParentPhone == phone && t.Status != "Đã tư vấn");
            if (dup)
            {
                var ch = kids.Select((_, j) => j == i ? new Dictionary<string, string> { ["name"] = "Đã có đơn học thử hiệu lực" } : new Dictionary<string, string>()).ToList();
                throw new ApiException($"{kids[i].Name!.Trim()} đã có đơn học thử đang được xử lý") { Children = ch };
            }
        }

        // BR-UC1-05: tự tạo tài khoản theo SĐT. Mật khẩu ngẫu nhiên – bộ phận Admin cấp ngoài hệ thống.
        var isNew = !await db.Users.AnyAsync(u => u.Role == "parent" && u.Phone == phone);
        if (isNew)
            db.Users.Add(new User { Username = phone, Role = "parent", FullName = $"Phụ huynh {phone[^4..]}", Phone = phone, MustChangePassword = true, CreatedAt = Rules.Now,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString("N"), 11) });

        foreach (var c in kids)
            db.Trials.Add(new Trial { StudentName = c.Name!.Trim(), DateOfBirth = DateOnly.Parse(c.Dob!), ParentPhone = phone, WishDays = string.Join(',', req.WishDays!), WishSlot = req.WishSlot!, Status = "Chờ tiếp nhận", CreatedAt = Rules.Now });
        await nt.ToRoleAsync("assistant", "Có đơn đăng ký học thử mới", $"{string.Join(", ", kids.Select(k => k.Name!.Trim()))} – SĐT {phone}");
        await db.SaveChangesAsync();
        return new RegisterTrialResult(isNew, kids.Count);
    }

    // ===================== PHỤ HUYNH =====================
    [HttpGet("api/parent/trials"), Authorize(Roles = Roles.Parent)]
    public async Task<List<TrialDto>> Mine()
    {
        var phone = await db.Users.Where(u => u.UserId == User.UserId()).Select(u => u.Phone).FirstAsync();
        var list = await db.Trials.Where(t => t.ParentPhone == phone).OrderByDescending(t => t.CreatedAt).ToListAsync();
        return await ToDtos(list); // BR-UC2-12: chỉ hiện ca khi đơn đã có ca
    }

    [HttpPost("api/parent/trials/{id:int}/confirm"), Authorize(Roles = Roles.Parent)]
    public async Task<object> Confirm(int id)
    {
        var phone = await db.Users.Where(u => u.UserId == User.UserId()).Select(u => u.Phone).FirstAsync();
        var t = await db.Trials.FirstOrDefaultAsync(x => x.TrialId == id && x.ParentPhone == phone) ?? throw ApiException.Forbidden();
        if (t.Status != "Chờ phụ huynh xác nhận") throw new ApiException("Đơn này không còn ở trạng thái chờ xác nhận");
        t.Status = "Chờ duyệt ca học thử";
        var info = await sch.InfoAsync(t.SessionKey);
        await nt.ToRoleAsync("assistant", "Phụ huynh đã xác nhận lịch học thử", $"{t.StudentName} đã xác nhận ca học thử.");
        await nt.ToRoleAsync("manager", "Có ca học thử chờ phê duyệt", $"{t.StudentName} – {info.Date} {info.Start}-{info.End}");
        nt.Audit("trial", id.ToString(), User.UserId().ToString(), "Chờ phụ huynh xác nhận", t.Status, "Phụ huynh xác nhận lịch");
        await db.SaveChangesAsync();
        return new { ok = true };
    }

    [HttpGet("api/parent/trials/result"), Authorize(Roles = Roles.Parent)]
    public async Task<object> Result()
    {
        var phone = await db.Users.Where(u => u.UserId == User.UserId()).Select(u => u.Phone).FirstAsync();
        var list = await db.Trials.Where(t => t.ParentPhone == phone && t.Status == "Đã tư vấn" && t.ConsultRoadmap != null).ToListAsync();
        var classes = await db.Classes.Include(c => c.Teacher).ToDictionaryAsync(c => c.ClassId);
        // BR-UC2-14: chỉ trả đánh giá + lộ trình, KHÔNG trả ghi chú nội bộ / quyết định
        return list.Select(t => new { id = t.TrialId, studentName = t.StudentName,
            session = t.SessionClassId == null ? null : sch.Info(classes[t.SessionClassId.Value], t.SessionDate!.Value),
            assessment = new AssessmentDto(t.AssessStroke, t.AssessColor, t.AssessAbsorb), roadmap = t.ConsultRoadmap }).ToList();
    }

    /// <summary>UC 2.3: các buổi học thử đã hoàn thành của phụ huynh (kèm kết quả nếu Trợ lý đã cập nhật tư vấn).</summary>
    [HttpGet("api/parent/trials/completed"), Authorize(Roles = Roles.Parent)]
    public async Task<object> Completed()
    {
        var phone = await db.Users.Where(u => u.UserId == User.UserId()).Select(u => u.Phone).FirstAsync();
        var list = await db.Trials.Where(t => t.ParentPhone == phone && t.SessionClassId != null && (t.Status == "Đã hoàn thành" || t.Status == "Đã tư vấn" || t.Status == "Đã xếp ca"))
            .OrderByDescending(t => t.CreatedAt).ToListAsync();
        var classes = await db.Classes.Include(c => c.Teacher).ToDictionaryAsync(c => c.ClassId);
        return list.Select(t => new { t, info = sch.Info(classes[t.SessionClassId!.Value], t.SessionDate!.Value) })
            .Where(x => x.t.Status != "Đã xếp ca" || x.info.Ended)
            .Select(x => new { id = x.t.TrialId, studentName = x.t.StudentName, status = x.t.Status == "Đã tư vấn" ? "Đã tư vấn" : "Đã hoàn thành", session = x.info,
                result = x.t.Status == "Đã tư vấn" && x.t.ConsultRoadmap != null ? new { assessment = new AssessmentDto(x.t.AssessStroke, x.t.AssessColor, x.t.AssessAbsorb), roadmap = x.t.ConsultRoadmap } : null }).ToList();
    }

    // ===================== TRỢ LÝ / QUẢN LÝ (UC 5.1 – 5.3) =====================
    [HttpGet("api/assistant/trials"), Authorize(Roles = Roles.Ops)]
    public async Task<List<TrialDto>> List([FromQuery] string status)
        => await ToDtos(await db.Trials.Where(t => t.Status == status).OrderBy(t => t.CreatedAt).ToListAsync());

    [HttpPost("api/assistant/trials/{id:int}/accept"), Authorize(Roles = Roles.Ops)]
    public async Task<object> Accept(int id, ProgramRequest req)
    {
        var t = await db.Trials.FindAsync(id) ?? throw ApiException.NotFound();
        if (string.IsNullOrEmpty(req.Program) || !Rules.Programs.Contains(req.Program)) throw ApiException.Invalid("Vui lòng chọn chương trình học!", new() { ["program"] = "Vui lòng chọn chương trình học!" });
        if (t.Status != "Chờ tiếp nhận") throw new ApiException("Đơn này đã được xử lý trước đó"); // BR-UC5-03
        t.Program = req.Program; t.Status = "Đã tiếp nhận";
        await nt.ToParentOfAsync(t.ParentPhone, "Đã tiếp nhận đơn học thử", $"Ngôi Nhà Nhỏ đã tiếp nhận đơn học thử của bé {t.StudentName}.");
        nt.Audit("trial", id.ToString(), User.UserId().ToString(), "Chờ tiếp nhận", "Đã tiếp nhận", req.Program);
        await db.SaveChangesAsync();
        return new { ok = true };
    }

    /// <summary>Ca học thử phù hợp: cùng chương trình, chưa diễn ra, còn chỗ (BR-UC5-05/06)</summary>
    [HttpGet("api/assistant/trials/{id:int}/sessions"), Authorize(Roles = Roles.Ops)]
    public async Task<List<SessionWithLoad>> Sessions(int id)
    {
        var t = await db.Trials.FindAsync(id) ?? throw ApiException.NotFound();
        var today = Rules.Today; var end = today.AddDays(28);
        var classes = await db.Classes.Include(c => c.Teacher).Where(c => c.Program == t.Program).ToListAsync();
        var map = await sch.LoadMapAsync(today, end); var res = new List<SessionWithLoad>();
        for (var d = today; d <= end; d = d.AddDays(1))
            foreach (var c in classes.Where(c => c.Meets(Rules.Weekday(d)) && !Rules.Started(d, c.StartTime)))
            {
                var l = map.Get(c.ClassId, d);
                if (l.Base < Rules.MaxClass) res.Add(new SessionWithLoad(sch.Info(c, d), l));
            }
        return res;
    }

    [HttpPost("api/assistant/trials/{id:int}/propose"), Authorize(Roles = Roles.Ops)]
    public async Task<object> Propose(int id, KeyRequest req)
    {
        var t = await db.Trials.FindAsync(id) ?? throw ApiException.NotFound();
        if (t.Status != "Đã tiếp nhận") throw new ApiException("Đơn này không còn ở trạng thái Đã tiếp nhận");
        if (string.IsNullOrEmpty(req.Key)) throw new ApiException("Vui lòng chọn ca học thử");
        var (cid, date) = ScheduleService.ParseKey(req.Key);
        var cls = await sch.GetClassAsync(cid);
        if (cls.Program != t.Program || Rules.Started(date, cls.StartTime) || !cls.Meets(Rules.Weekday(date))) throw new ApiException("Ca học không phù hợp. Vui lòng chọn ca khác");
        if ((await sch.LoadAsync(cid, date)).Base >= Rules.MaxClass) throw new ApiException("Ca học đã đầy, vui lòng chọn ca khác"); // kiểm tra lại sĩ số
        t.SessionClassId = cid; t.SessionDate = date; t.Status = "Chờ phụ huynh xác nhận";
        var i = sch.Info(cls, date);
        await nt.ToParentOfAsync(t.ParentPhone, "Đề xuất lịch học thử", $"Ngôi Nhà Nhỏ đề xuất ca học thử cho bé {t.StudentName}: {Rules.WeekdayLabel(i.Weekday)} {i.Date} · {i.Start} - {i.End}. Ba mẹ vui lòng xác nhận lịch.");
        nt.Audit("trial", id.ToString(), User.UserId().ToString(), "Đã tiếp nhận", t.Status, req.Key);
        await db.SaveChangesAsync();
        return new { ok = true };
    }

    [HttpGet("api/assistant/trials/consult"), Authorize(Roles = Roles.Ops)]
    public async Task<List<object>> ConsultList()
    {
        var list = await db.Trials.Where(t => (t.Status == "Đã xếp ca" || t.Status == "Đã hoàn thành") && t.SessionClassId != null && t.ConsultRoadmap == null).ToListAsync();
        var dtos = await ToDtos(list);
        return dtos.Select((d, i) => (object)new { d.Id, d.StudentName, d.Dob, d.ParentPhone, d.Program, d.Status, d.SessionInfo,
            assessment = list[i].AssessStroke == null ? null : new AssessmentDto(list[i].AssessStroke, list[i].AssessColor, list[i].AssessAbsorb) }).ToList();
    }

    [HttpPost("api/assistant/trials/{id:int}/consult"), Authorize(Roles = Roles.Ops)]
    public async Task<object> SaveConsult(int id, ConsultRequest req)
    {
        var t = await db.Trials.FindAsync(id) ?? throw ApiException.NotFound();
        var si = await sch.InfoAsync(t.SessionKey);
        if (!si.Ended) throw new ApiException("Buổi học thử chưa diễn ra");
        if (t.AssessStroke == null) throw new ApiException("Giáo viên chưa nhập đánh giá năng lực của học viên");
        var e = new Dictionary<string, string>();
        if (string.IsNullOrWhiteSpace(req.Roadmap)) e["roadmap"] = "Vui lòng nhập đầy đủ thông tin!";
        if (req.Decision is not ("Đăng ký chính thức" or "Chưa quyết định" or "Không đăng ký")) e["decision"] = "Vui lòng nhập đầy đủ thông tin!";
        if (e.Count > 0) throw ApiException.Invalid("Vui lòng nhập đầy đủ thông tin!", e);
        t.ConsultRoadmap = req.Roadmap!.Trim(); t.ConsultDecision = req.Decision; t.ConsultNote = req.Note; t.ConsultBy = User.UserId(); t.ConsultAt = Rules.Now;
        nt.Audit("trial", id.ToString(), User.UserId().ToString(), t.Status, "Đã tư vấn", req.Decision);
        t.Status = "Đã tư vấn";
        await nt.ToParentOfAsync(t.ParentPhone, "Kết quả học thử đã sẵn sàng", $"Ba mẹ có thể xem kết quả học thử của bé {t.StudentName}.");
        await db.SaveChangesAsync();
        return new { suggestCreateProfile = req.Decision == "Đăng ký chính thức", trial = new { id = t.TrialId, studentName = t.StudentName, dob = t.DateOfBirth.ToString("yyyy-MM-dd"), parentPhone = t.ParentPhone, program = t.Program } };
    }
}
