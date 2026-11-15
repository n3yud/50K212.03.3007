using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NgoiNhaNho.Api.Auth;
using NgoiNhaNho.Api.Data;

namespace NgoiNhaNho.Api.Controllers;

[ApiController, Route("api/notifications"), Authorize]
public class NotificationsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<List<object>> Mine()
    {
        var me = User.UserId();
        return (await db.Notifications.Where(n => n.UserId == me).OrderByDescending(n => n.CreatedAt).Take(100).ToListAsync())
            .Select(n => (object)new { id = n.NotificationId, title = n.Title, body = n.Body, createdAt = n.CreatedAt.ToString("o"), read = n.IsRead }).ToList();
    }

    [HttpGet("unread")]
    public async Task<int> Unread() { var me = User.UserId(); return await db.Notifications.CountAsync(n => n.UserId == me && !n.IsRead); }

    [HttpPost("{id:int}/read")]
    public async Task<object> MarkRead(int id)
    {
        var me = User.UserId();
        var n = await db.Notifications.FirstOrDefaultAsync(x => x.NotificationId == id && x.UserId == me);
        if (n != null) { n.IsRead = true; await db.SaveChangesAsync(); }
        return new { ok = true };
    }
}
