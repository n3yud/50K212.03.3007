using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using NgoiNhaNho.Api.Data;

namespace NgoiNhaNho.Api.Auth;

/// <summary>Tạo JWT sau khi đăng nhập. Token chứa mã người dùng và vai trò; Backend kiểm tra quyền dựa trên token này ở MỌI API.</summary>
public class JwtService(IConfiguration cfg)
{
    public string Create(User u)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(cfg["Jwt:Key"]!));
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, u.UserId.ToString()),
            new Claim(ClaimTypes.Role, u.Role),
            new Claim(ClaimTypes.Name, u.FullName),
        };
        var token = new JwtSecurityToken(cfg["Jwt:Issuer"], cfg["Jwt:Audience"], claims,
            expires: DateTime.UtcNow.AddHours(double.Parse(cfg["Jwt:ExpireHours"] ?? "12")),
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}

public static class ClaimsExtensions
{
    public static int UserId(this ClaimsPrincipal p) => int.Parse(p.FindFirstValue(ClaimTypes.NameIdentifier)!);
    public static string UserRole(this ClaimsPrincipal p) => p.FindFirstValue(ClaimTypes.Role)!;
}

/// <summary>Nhóm vai trò dùng trong [Authorize(Roles = ...)]. Quản lý kế thừa quyền Trợ lý (đặc tả 1.3.2).</summary>
public static class Roles
{
    public const string Assistant = "assistant";
    public const string Manager = "manager";
    public const string Supervisor = "supervisor";
    public const string Teacher = "teacher";
    public const string Parent = "parent";
    public const string Ops = "assistant,manager";   // nghiệp vụ vận hành
}
