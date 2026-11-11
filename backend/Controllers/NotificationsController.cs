using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
namespace NgoiNhaNho;
[ApiController, Authorize, Route("api/notifications")]
public class NotificationsController(AppDb db, Access access) : ControllerBase
{
    [HttpGet] public async Task<object> List() => await db.Notifications.AsNoTracking().Where(n => n.UserId == access.Id).OrderByDescending(n => n.CreatedAt).ToListAsync();
}
