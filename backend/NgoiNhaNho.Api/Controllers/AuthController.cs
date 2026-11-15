using BCrypt.Net;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NgoiNhaNho.Api.Auth;
using NgoiNhaNho.Api.Common;
using NgoiNhaNho.Api.Data;
using NgoiNhaNho.Api.Dtos;

namespace NgoiNhaNho.Api.Controllers;

[ApiController, Route("api/auth")]
public class AuthController(AppDbContext db, JwtService jwt) : ControllerBase
{
    private static UserDto ToDto(User u) => new(u.UserId, u.Role, u.FullName, u.Title, u.Username, u.Phone, u.MustChangePassword);

    /// <summary>Đăng nhập. app = staff (web quản trị) | parent | teacher (2 web mobile riêng).</summary>
    [HttpPost("login")]
    public async Task<LoginResult> Login(LoginRequest req)
    {
        var f = new Dictionary<string, string>();
        if (string.IsNullOrWhiteSpace(req.Username)) f["username"] = "Vui lòng điền đầy đủ thông tin!";
        if (string.IsNullOrEmpty(req.Password)) f["password"] = "Vui lòng điền đầy đủ thông tin!";
        if (f.Count > 0) throw ApiException.Invalid("Vui lòng điền đầy đủ thông tin!", f);

        var q = req.Username!.Trim().ToLower();
        var u = await db.Users.FirstOrDefaultAsync(x => x.Username.ToLower() == q || (x.Email != null && x.Email.ToLower() == q));

        if (u != null)
        {
            if (u.IsLocked) throw new ApiException("Tài khoản đã bị khóa. Vui lòng liên hệ bộ phận hỗ trợ", 403);
            if (u.LockoutEnd != null && u.LockoutEnd > Rules.Now)
            {
                var mins = Math.Max(1, (int)Math.Ceiling((u.LockoutEnd.Value - Rules.Now).TotalMinutes));
                throw new ApiException($"Tài khoản tạm thời bị khóa do nhập sai mật khẩu quá 5 lần. Vui lòng thử lại sau {mins} phút hoặc liên hệ hỗ trợ", 403);
            }
            if (u.LockoutEnd != null && u.LockoutEnd <= Rules.Now)
            {
                u.LockoutEnd = null;
                u.FailedAttempts = 0;
            }
        }

        // BR-UC1-10, BR-UC1-11: bảo vệ chống tấn công dò mật khẩu (brute-force) sau 5 lần
        if (u == null || !BCrypt.Net.BCrypt.Verify(req.Password!, u.PasswordHash))
        {
            if (u != null)
            {
                u.FailedAttempts++;
                if (u.FailedAttempts >= 5)
                {
                    u.LockoutEnd = Rules.Now.AddMinutes(15);
                    await db.SaveChangesAsync();
                    throw new ApiException("Tài khoản đã bị tạm khóa 15 phút do nhập sai mật khẩu quá 5 lần. Vui lòng thử lại sau hoặc liên hệ hỗ trợ", 403);
                }
                await db.SaveChangesAsync();
                var left = 5 - u.FailedAttempts;
                throw new ApiException($"Tên đăng nhập hoặc mật khẩu không chính xác. Bạn còn {left} lần thử trước khi tài khoản bị khóa tạm thời!", 401);
            }
            throw new ApiException("Tên đăng nhập hoặc mật khẩu không chính xác. Vui lòng thử lại!", 401);
        }

        u.FailedAttempts = 0;
        u.LockoutEnd = null;
        await db.SaveChangesAsync();

        var allowed = (req.App ?? "staff") switch { "parent" => new[] { "parent" }, "teacher" => new[] { "teacher" }, _ => new[] { "assistant", "manager", "supervisor" } };
        if (!allowed.Contains(u.Role)) throw new ApiException("Tài khoản không có quyền truy cập ứng dụng này", 403);
        return new LoginResult(jwt.Create(u), ToDto(u));
    }

    [HttpGet("me"), Authorize]
    public async Task<UserDto> Me() => ToDto(await db.Users.FirstAsync(u => u.UserId == User.UserId()));

    [HttpPost("change-password"), Authorize]
    public async Task<UserDto> ChangePassword(ChangePasswordRequest req)
    {
        var u = await db.Users.FirstAsync(x => x.UserId == User.UserId());
        if (string.IsNullOrEmpty(req.NewPw) || req.NewPw.Length < 6) throw ApiException.Invalid("Mật khẩu mới cần có ít nhất 6 ký tự", new() { ["newPw"] = "Mật khẩu mới cần có ít nhất 6 ký tự" });
        if (BCrypt.Net.BCrypt.Verify(req.NewPw, u.PasswordHash)) throw ApiException.Invalid("Mật khẩu mới phải khác mật khẩu hiện tại", new() { ["newPw"] = "Mật khẩu mới phải khác mật khẩu hiện tại" });
        if (!u.MustChangePassword && !BCrypt.Net.BCrypt.Verify(req.OldPw ?? "", u.PasswordHash)) throw ApiException.Invalid("Mật khẩu hiện tại không đúng", new() { ["oldPw"] = "Mật khẩu hiện tại không đúng" });
        u.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.NewPw, 11);
        u.MustChangePassword = false;
        await db.SaveChangesAsync();
        return ToDto(u);
    }
}
