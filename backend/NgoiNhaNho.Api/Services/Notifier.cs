using Microsoft.EntityFrameworkCore;
using NgoiNhaNho.Api.Common;
using NgoiNhaNho.Api.Data;

namespace NgoiNhaNho.Api.Services;

/// <summary>Tạo thông báo trong ứng dụng. Chỉ thêm vào DbContext – nơi gọi sẽ SaveChanges để thông báo và thay đổi nghiệp vụ nằm cùng một giao dịch.</summary>
public class Notifier(AppDbContext db, ISmsService sms, IEmailService email)
{
    public void ToUser(int userId, string title, string body) =>
        db.Notifications.Add(new Notification { UserId = userId, Title = title, Body = body, CreatedAt = Rules.Now });

    public async Task ToParentOfAsync(string parentPhone, string title, string body)
    {
        var u = await db.Users.Where(x => x.Role == "parent" && x.Phone == parentPhone).FirstOrDefaultAsync();
        if (u != null)
        {
            ToUser(u.UserId, title, body);
            _ = sms.SendSmsAsync(parentPhone, $"[Lớp vẽ Ngôi Nhà Nhỏ] {title}: {body}");
            if (!string.IsNullOrEmpty(u.Email))
            {
                _ = email.SendEmailAsync(u.Email, $"[Lớp vẽ Ngôi Nhà Nhỏ] {title}", body);
            }
        }
        else
        {
            _ = sms.SendSmsAsync(parentPhone, $"[Lớp vẽ Ngôi Nhà Nhỏ] {title}: {body}");
        }
    }

    public async Task ToRoleAsync(string role, string title, string body)
    {
        var users = await db.Users.Where(u => u.Role == role && !u.IsLocked).ToListAsync();
        foreach (var u in users)
        {
            ToUser(u.UserId, title, body);
            if (!string.IsNullOrEmpty(u.Phone)) _ = sms.SendSmsAsync(u.Phone, $"[Lớp vẽ Ngôi Nhà Nhỏ] {title}: {body}");
            if (!string.IsNullOrEmpty(u.Email)) _ = email.SendEmailAsync(u.Email, $"[Lớp vẽ Ngôi Nhà Nhỏ] {title}", body);
        }
    }

    public void Audit(string entity, string key, string? by, string? oldV, string? newV, string? note) =>
        db.AuditLog.Add(new AuditLog { Entity = entity, EntityKey = key, ChangedBy = by, ChangedAt = Rules.Now, OldValue = oldV, NewValue = newV, Note = note });
}
