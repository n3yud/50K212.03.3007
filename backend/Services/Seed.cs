using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
namespace NgoiNhaNho;
public static class Seed
{
    public static readonly Guid BranchId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    public static async Task Run(AppDb db, IPasswordHasher<UserAccount> hasher, IConfiguration config)
    {
        var password = config["Seed:Password"];
        Rules.Require(password is { Length: >= 12 }, "Cần đặt Seed__Password từ 12 ký tự để tạo tài khoản kiểm thử.");
        if (!await db.Branches.AnyAsync(b => b.Id == BranchId)) db.Branches.Add(new Branch { Id = BranchId, Name = "Hòa Xuân", Address = "33–35 Nguyễn Phước Lan, Đà Nẵng" });
        foreach (var (login, name, role) in new[] { ("TL01", "Trợ lý kiểm thử", Roles.Assistant), ("QL01", "Quản lý kiểm thử", Roles.Manager), ("GV01", "Giáo viên kiểm thử", Roles.Teacher), ("GS01", "Giám sát kiểm thử", Roles.Supervisor), ("0900000001", "Phụ huynh kiểm thử", Roles.Parent) })
        {
            if (await db.Users.AnyAsync(x => x.Login == login)) continue;
            var u = new UserAccount { Login = login, Email = role == Roles.Parent ? null : login.ToLowerInvariant() + "@example.test", Name = name, Role = role, BranchId = BranchId, MustChangePassword = true };
            u.PasswordHash = hasher.HashPassword(u, password!); db.Users.Add(u);
        }
        await db.SaveChangesAsync();
        // No invented tuition amounts or monthly lesson counts are seeded.
    }
}
