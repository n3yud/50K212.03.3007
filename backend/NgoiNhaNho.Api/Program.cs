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
builder.Services.AddDbContext<AppDbContext>(o => o.UseNpgsql(cfg.GetConnectionString("Default")));

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
