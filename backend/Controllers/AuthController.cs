using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace NgoiNhaNho;
[ApiController, Route("api/auth")]
public class AuthController(AppDb db, IPasswordHasher<UserAccount> hasher, Access access) : ControllerBase
{
    public record LoginInput(string Login, string Password);
    public record PasswordInput(string CurrentPassword, string NewPassword);
    [HttpPost("login"), EnableRateLimiting("auth")]
    public async Task<object> Login(LoginInput input)
    {
        var login = input.Login.Trim();
        var user = await db.Users.SingleOrDefaultAsync(x => x.Login == login || (x.Role != Roles.Parent && x.Email == login));
        var dummy = new UserAccount();
        var hash = user?.PasswordHash ?? hasher.HashPassword(dummy, "Dummy password only");
        Rules.Require(hasher.VerifyHashedPassword(user ?? dummy, hash, input.Password) != PasswordVerificationResult.Failed && user is not null, "Tên đăng nhập hoặc mật khẩu không chính xác. Vui lòng thử lại!", 401);
        Rules.Require(!user!.Locked, "Tài khoản đã bị khóa. Vui lòng liên hệ bộ phận hỗ trợ", 401);
        await SignIn(user);
        return Public(user);
    }
    [Authorize, HttpGet("me")]
    public async Task<object> Me() => Public(await db.Users.SingleAsync(x => x.Id == access.Id));
    [Authorize, HttpPost("password")]
    public async Task<object> Password(PasswordInput input)
    {
        var u = await db.Users.SingleAsync(x => x.Id == access.Id);
        Rules.Require(hasher.VerifyHashedPassword(u, u.PasswordHash, input.CurrentPassword) != PasswordVerificationResult.Failed, "Mật khẩu hiện tại không chính xác.");
        Rules.Require(input.NewPassword.Length >= 8 && input.NewPassword.Length <= 128 && input.NewPassword != input.CurrentPassword, "Mật khẩu mới dài 8–128 ký tự và phải khác mật khẩu hiện tại.");
        u.PasswordHash = hasher.HashPassword(u, input.NewPassword); u.MustChangePassword = false; u.SessionVersion++; await db.SaveChangesAsync(); await SignIn(u); return new { message = "Đổi mật khẩu thành công!" };
    }
    [Authorize, HttpPost("logout")]
    public async Task<object> Logout() { await HttpContext.SignOutAsync(); return new { message = "Đã đăng xuất." }; }
    private static object Public(UserAccount u) => new { u.Id, u.Login, u.Name, u.Role, u.MustChangePassword };
    private Task SignIn(UserAccount u)
    {
        var claims = new[] { new Claim(ClaimTypes.NameIdentifier, u.Id.ToString()), new Claim(ClaimTypes.Name, u.Name), new Claim(ClaimTypes.Role, u.Role), new Claim("branch", u.BranchId.ToString()), new Claim("version", u.SessionVersion.ToString()) };
        return HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, new ClaimsPrincipal(new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme)));
    }
}
