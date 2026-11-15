using System.Net;
using System.Net.Http.Headers;
using System.Net.Mail;
using System.Text;

namespace NgoiNhaNho.Api.Services;

public interface ISmsService
{
    Task<bool> SendSmsAsync(string phone, string message);
}

public interface IEmailService
{
    Task<bool> SendEmailAsync(string toEmail, string subject, string body);
}

/// <summary>
/// Dịch vụ gửi SMS: Hỗ trợ chế độ giả lập hiển thị log (Simulated) và gửi qua cổng SMS Twilio thật khi có cấu hình.
/// </summary>
public class SmsService(IConfiguration config, IHttpClientFactory httpFactory, ILogger<SmsService> logger) : ISmsService
{
    public async Task<bool> SendSmsAsync(string phone, string message)
    {
        var provider = config["Notification:Sms:Provider"] ?? "Simulated";
        var cleanPhone = (phone ?? "").Trim();
        if (string.IsNullOrEmpty(cleanPhone)) return false;

        if (provider.Equals("Twilio", StringComparison.OrdinalIgnoreCase))
        {
            var sid = config["Notification:Sms:Twilio:AccountSid"];
            var token = config["Notification:Sms:Twilio:AuthToken"];
            var from = config["Notification:Sms:Twilio:FromNumber"];

            if (!string.IsNullOrEmpty(sid) && !string.IsNullOrEmpty(token) && !string.IsNullOrEmpty(from))
            {
                try
                {
                    // Chuyển SĐT Việt Nam 090... sang dạng quốc tế +8490...
                    var toPhone = cleanPhone.StartsWith("0") ? "+84" + cleanPhone[1..] : cleanPhone;
                    var client = httpFactory.CreateClient();
                    var authBytes = Encoding.ASCII.GetBytes($"{sid}:{token}");
                    client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", Convert.ToBase64String(authBytes));

                    var url = $"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json";
                    var content = new FormUrlEncodedContent(new[]
                    {
                        new KeyValuePair<string, string>("To", toPhone),
                        new KeyValuePair<string, string>("From", from),
                        new KeyValuePair<string, string>("Body", message),
                    });

                    var resp = await client.PostAsync(url, content);
                    if (resp.IsSuccessStatusCode)
                    {
                        logger.LogInformation("✅ [TWILIO SMS SENT] Đã gửi SMS thật tới {Phone}", toPhone);
                        return true;
                    }
                    var errBody = await resp.Content.ReadAsStringAsync();
                    logger.LogWarning("⚠️ [TWILIO SMS ERROR] Không gửi được tới {Phone}: {Error}", toPhone, errBody);
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "❌ [TWILIO SMS EXCEPTION] Lỗi khi gửi SMS tới {Phone}", cleanPhone);
                }
            }
        }

        // Chế độ Simulated mặc định (phù hợp demo/đồ án, không tốn chi phí và chạy tốt cả khi offline)
        logger.LogInformation("\n================== [SMS NOTIFICATION] ==================\n📱 GỬI ĐẾN: {Phone}\n💬 NỘI DUNG: {Message}\n========================================================", cleanPhone, message);
        return true;
    }
}

/// <summary>
/// Dịch vụ gửi Email: Hỗ trợ chế độ giả lập hiển thị log (Simulated) và gửi qua máy chủ SMTP (Gmail, SendGrid...) khi có cấu hình.
/// </summary>
public class EmailService(IConfiguration config, ILogger<EmailService> logger) : IEmailService
{
    public async Task<bool> SendEmailAsync(string toEmail, string subject, string body)
    {
        var provider = config["Notification:Email:Provider"] ?? "Simulated";
        var cleanEmail = (toEmail ?? "").Trim();
        if (string.IsNullOrEmpty(cleanEmail)) return false;

        if (provider.Equals("Smtp", StringComparison.OrdinalIgnoreCase))
        {
            var host = config["Notification:Email:Smtp:Host"];
            var portStr = config["Notification:Email:Smtp:Port"] ?? "587";
            var username = config["Notification:Email:Smtp:Username"];
            var password = config["Notification:Email:Smtp:Password"];
            var from = config["Notification:Email:Smtp:FromAddress"] ?? "no-reply@ngoinhanho.vn";
            var fromName = config["Notification:Email:Smtp:FromName"] ?? "Lớp vẽ Ngôi Nhà Nhỏ";
            var ssl = bool.Parse(config["Notification:Email:Smtp:EnableSsl"] ?? "true");

            if (!string.IsNullOrEmpty(host) && !string.IsNullOrEmpty(username) && !string.IsNullOrEmpty(password))
            {
                try
                {
                    using var smtp = new SmtpClient(host, int.Parse(portStr))
                    {
                        EnableSsl = ssl,
                        Credentials = new NetworkCredential(username, password)
                    };

                    using var mail = new MailMessage
                    {
                        From = new MailAddress(from, fromName),
                        Subject = subject,
                        Body = body,
                        IsBodyHtml = false
                    };
                    mail.To.Add(cleanEmail);

                    await smtp.SendMailAsync(mail);
                    logger.LogInformation("✅ [SMTP EMAIL SENT] Đã gửi Email thật tới {Email}", cleanEmail);
                    return true;
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "❌ [SMTP EMAIL EXCEPTION] Lỗi khi gửi Email tới {Email}", cleanEmail);
                }
            }
        }

        // Chế độ Simulated mặc định
        logger.LogInformation("\n================= [EMAIL NOTIFICATION] =================\n📧 GỬI ĐẾN: {Email}\n📌 TIÊU ĐỀ: {Subject}\n📝 NỘI DUNG:\n{Body}\n========================================================", cleanEmail, subject, body);
        return true;
    }
}
