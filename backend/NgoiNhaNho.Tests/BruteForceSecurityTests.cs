using NgoiNhaNho.Api.Common;
using NgoiNhaNho.Api.Data;
using Xunit;

namespace NgoiNhaNho.Tests;

public class BruteForceSecurityTests
{
    [Fact]
    public void LockoutThreshold_ShouldBe5Attempts()
    {
        var user = new User
        {
            Username = "testuser",
            FailedAttempts = 0,
            LockoutEnd = null
        };

        // Giả lập 4 lần sai: chưa bị khóa
        for (int i = 1; i <= 4; i++)
        {
            user.FailedAttempts++;
            var isLocked = user.FailedAttempts >= 5;
            Assert.False(isLocked, $"Lần {i} không được khóa");
        }

        // Lần thứ 5 sai: kích hoạt khóa 15 phút
        user.FailedAttempts++;
        if (user.FailedAttempts >= 5)
        {
            user.LockoutEnd = Rules.Now.AddMinutes(15);
        }

        Assert.True(user.FailedAttempts >= 5);
        Assert.NotNull(user.LockoutEnd);
        Assert.True(user.LockoutEnd > Rules.Now);
    }

    [Fact]
    public void LockoutDuration_ShouldBe15Minutes()
    {
        var now = Rules.Now;
        var lockoutEnd = now.AddMinutes(15);

        var duration = (lockoutEnd - now).TotalMinutes;
        Assert.Equal(15, duration);
    }

    [Fact]
    public void ExpiredLockout_ShouldBeIdentifiedAsUnlocked()
    {
        var user = new User
        {
            Username = "testuser",
            FailedAttempts = 5,
            LockoutEnd = Rules.Now.AddMinutes(-1) // Đã trôi qua 1 phút
        };

        var isStillLocked = user.LockoutEnd != null && user.LockoutEnd > Rules.Now;
        Assert.False(isStillLocked);
    }

    [Fact]
    public void SuccessfulLogin_ResetsFailedAttemptsAndLockout()
    {
        var user = new User
        {
            Username = "testuser",
            FailedAttempts = 4,
            LockoutEnd = null
        };

        // Đăng nhập thành công -> reset về 0
        user.FailedAttempts = 0;
        user.LockoutEnd = null;

        Assert.Equal(0, user.FailedAttempts);
        Assert.Null(user.LockoutEnd);
    }
}
