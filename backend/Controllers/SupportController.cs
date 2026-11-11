using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
namespace NgoiNhaNho;
[ApiController, Authorize(Roles = Roles.Operations), Route("api/support")]
public class SupportController(AppDb db, Access access, IPasswordHasher<UserAccount> hasher) : ControllerBase
{
    public record ResetInput(string Phone, bool IdentityVerified);
    [HttpPost("parent-password"), EnableRateLimiting("auth")]
    public async Task<object> Reset(ResetInput input)
    {
        Rules.Phone(input.Phone); Rules.Require(input.IdentityVerified, "Cần xác minh phụ huynh qua kênh liên lạc trước khi cấp mật khẩu tạm.");
        var u = await db.Users.SingleOrDefaultAsync(u => u.Login == input.Phone && u.Role == Roles.Parent && u.BranchId == access.BranchId); Rules.Require(u is not null, "Không tìm thấy tài khoản phụ huynh.", 404);
        var password = Convert.ToHexString(RandomNumberGenerator.GetBytes(9)) + "a!";
        u!.PasswordHash = hasher.HashPassword(u, password); u.MustChangePassword = true; u.SessionVersion++;
        db.Audit.Add(new AuditEntry { ActorId = access.Id, Entity = "ParentPasswordReset", EntityId = u.Id, After = "Cấp mật khẩu tạm sau xác minh ngoài hệ thống" }); await db.SaveChangesAsync();
        Response.Headers.CacheControl = "no-store"; return new { temporaryPassword = password, message = "Chuyển mật khẩu tạm cho phụ huynh qua kênh đã xác minh. Phụ huynh bắt buộc đổi mật khẩu khi đăng nhập." };
    }
}
