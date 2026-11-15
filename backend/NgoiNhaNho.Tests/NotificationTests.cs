using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using NgoiNhaNho.Api.Services;
using Xunit;

namespace NgoiNhaNho.Tests;

public class NotificationTests
{
    [Fact]
    public async Task SimulatedSms_SendsSuccessfully()
    {
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Notification:Sms:Provider"] = "Simulated"
        }).Build();

        var sms = new SmsService(config, null!, NullLogger<SmsService>.Instance);
        var res = await sms.SendSmsAsync("0901234567", "Xin chào phụ huynh!");
        Assert.True(res);
    }

    [Fact]
    public async Task SimulatedSms_EmptyPhone_ReturnsFalse()
    {
        var config = new ConfigurationBuilder().Build();
        var sms = new SmsService(config, null!, NullLogger<SmsService>.Instance);
        var res = await sms.SendSmsAsync("", "Test");
        Assert.False(res);
    }

    [Fact]
    public async Task SimulatedEmail_SendsSuccessfully()
    {
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Notification:Email:Provider"] = "Simulated"
        }).Build();

        var email = new EmailService(config, NullLogger<EmailService>.Instance);
        var res = await email.SendEmailAsync("parent@example.com", "Thông báo học bù", "Bé đã được xếp lịch bù vào Thứ Bảy");
        Assert.True(res);
    }

    [Fact]
    public async Task SimulatedEmail_EmptyEmail_ReturnsFalse()
    {
        var config = new ConfigurationBuilder().Build();
        var email = new EmailService(config, NullLogger<EmailService>.Instance);
        var res = await email.SendEmailAsync("", "Test", "Test body");
        Assert.False(res);
    }
}
