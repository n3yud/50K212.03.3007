using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using NgoiNhaNho.Api.Auth;
using NgoiNhaNho.Api.Common;
using NgoiNhaNho.Api.Data;
using NgoiNhaNho.Api.Services;

var builder = WebApplication.CreateBuilder(args);
var cfg = builder.Configuration;

// --- Cơ sở dữ liệu PostgreSQL ---
var rawCs = cfg.GetConnectionString("Default") ?? "";
var connStr = ProgramHelpers.ParsePostgresConnection(rawCs);
builder.Services.AddDbContext<AppDbContext>(o => o.UseNpgsql(connStr));

// --- Dịch vụ nghiệp vụ ---
builder.Services.AddHttpClient();
builder.Services.AddScoped<ISmsService, SmsService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<ScheduleService>();
builder.Services.AddScoped<ReviewService>();
builder.Services.AddScoped<Notifier>();
builder.Services.AddSingleton<JwtService>();

// --- Xác thực JWT + phân quyền theo vai trò (kiểm tra ở Backend, không chỉ ẩn nút ở giao diện) ---
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(o =>
{
    o.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true, ValidIssuer = cfg["Jwt:Issuer"],
        ValidateAudience = true, ValidAudience = cfg["Jwt:Audience"],
        ValidateIssuerSigningKey = true, IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(cfg["Jwt:Key"]!)),
        ValidateLifetime = true, ClockSkew = TimeSpan.FromMinutes(1),
    };
    o.MapInboundClaims = true;
});
builder.Services.AddAuthorization();

// --- JSON camelCase, ngày dạng yyyy-MM-dd, giờ HH:mm ---
builder.Services.AddControllers().AddJsonOptions(o =>
{
    o.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    o.JsonSerializerOptions.Converters.Add(new DateOnlyConverter());
    o.JsonSerializerOptions.NumberHandling = JsonNumberHandling.AllowReadingFromString; // giao diện có thể gửi số dạng chuỗi (giá trị từ ô chọn)
});
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p.WithOrigins(cfg.GetSection("Cors:Origins").Get<string[]>() ?? Array.Empty<string>()).AllowAnyHeader().AllowAnyMethod()));
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// --- Tự động áp dụng Migration (tạo bảng PostgreSQL) khi chạy trên Cloud ---
using (var scope = app.Services.CreateScope())
{
    try
    {
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Database.Migrate();
    }
    catch (Exception ex)
    {
        app.Logger.LogWarning("Chưa kết nối được DB để tự động Migrate: {Msg}", ex.Message);
    }
}

app.UseMiddleware<ErrorMiddleware>();
if (app.Environment.IsDevelopment()) { app.UseSwagger(); app.UseSwaggerUI(); }
app.UseStaticFiles();            // ảnh tác phẩm: /uploads/...
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();

public class DateOnlyConverter : JsonConverter<DateOnly>
{
    public override DateOnly Read(ref Utf8JsonReader r, Type t, JsonSerializerOptions o) => DateOnly.Parse(r.GetString()!);
    public override void Write(Utf8JsonWriter w, DateOnly v, JsonSerializerOptions o) => w.WriteStringValue(v.ToString("yyyy-MM-dd"));
}

public static partial class ProgramHelpers
{
    public static string ParsePostgresConnection(string cs)
    {
        if (string.IsNullOrWhiteSpace(cs)) return cs;
        if (cs.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) || 
            cs.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
        {
            try
            {
                var uri = new Uri(cs);
                var userInfo = uri.UserInfo.Split(':');
                var username = Uri.UnescapeDataString(userInfo[0]);
                var password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : "";
                var db = uri.AbsolutePath.TrimStart('/');
                var port = uri.Port > 0 ? uri.Port : 5432;
                return $"Host={uri.Host};Port={port};Database={db};Username={username};Password={password};SSL Mode=Require;Trust Server Certificate=true";
            }
            catch { }
        }
        return cs;
    }
}
