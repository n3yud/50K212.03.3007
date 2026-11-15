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

AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

var builder = WebApplication.CreateBuilder(args);
var cfg = builder.Configuration;

// --- Cơ sở dữ liệu PostgreSQL ---
var rawCs = Environment.GetEnvironmentVariable("ConnectionStrings__Default")
         ?? Environment.GetEnvironmentVariable("ConnectionStrings:Default")
         ?? Environment.GetEnvironmentVariable("DATABASE_URL")
         ?? Environment.GetEnvironmentVariable("POSTGRES_URL")
         ?? cfg.GetConnectionString("Default") 
         ?? "";
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

        // Tự động bù đắp dữ liệu Tiến độ học tập nếu chưa có hoặc quá ít
        if (db.ProgressRecords.Count() < 5 && db.Attendances.Any())
        {
            var tl = db.Users.FirstOrDefault(u => u.Username == "thanhnhi");
            var tlId = tl?.UserId ?? 1;
            var sql = $@"
INSERT INTO ""ProgressRecords"" (""StudentId"", ""ClassId"", ""SessionDate"", ""EvalDate"", ""Status"", ""TeacherId"", ""RecordedBy"")
SELECT x.""StudentId"", x.""ClassId"", x.""SessionDate"", x.""SessionDate"",
       CASE WHEN x.""StudentId"" % 5 = 0 THEN 'Chậm tiến độ' ELSE 'Đúng tiến độ' END, c.""TeacherId"", {tlId}
FROM (SELECT r.""PersonId"" AS ""StudentId"", a.""ClassId"", a.""SessionDate"", ROW_NUMBER() OVER (PARTITION BY r.""PersonId"" ORDER BY a.""SessionDate"" DESC) AS rk
      FROM ""AttendanceRecords"" r
      JOIN ""Attendances"" a ON a.""AttendanceId"" = r.""AttendanceId""
      JOIN ""StudentClasses"" sc ON sc.""StudentId"" = r.""PersonId"" AND sc.""ClassId"" = a.""ClassId""
      WHERE r.""PersonType"" = 'Student' AND r.""Status"" = 'present') x
JOIN ""Classes"" c ON c.""ClassId"" = x.""ClassId""
WHERE x.rk = 1 AND x.""StudentId"" % 2 = 0
ON CONFLICT DO NOTHING;";
            try { db.Database.ExecuteSqlRaw(sql); } catch { /* ignore */ }
        }
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

app.MapGet("/api/diag/seed-journal", async (AppDbContext db) =>
{
    var classes = await db.Classes.ToDictionaryAsync(c => c.ClassId, c => c.Name);
    var journals = await db.Journal.Where(j => j.PhotoPath != null).ToListAsync();

    var stillLifeArts = new[] { "art15.svg", "art17.svg", "art18.svg", "art5.svg" };
    var landscapeArts = new[] { "art19.svg", "art20.svg", "art9.svg", "art14.svg", "art7.svg", "art12.svg", "art1.svg", "art4.svg" };
    var animalArts = new[] { "art10.svg", "art2.svg", "art8.svg", "art13.svg", "art16.svg", "art3.svg" };
    var streetArts = new[] { "art1.svg", "art14.svg", "art19.svg" };
    var colorArts = new[] { "art11.svg", "art4.svg", "art5.svg", "art17.svg" };
    var creativeArts = new[] { "art6.svg", "art1.svg", "art11.svg", "art16.svg" };

    var strokeComments = new[] {
        "Nét vẽ tự tin, dứt khoát và rõ ràng hơn.",
        "Bé cầm cọ rất khéo, nét uốn lượn mềm mại.",
        "Biết quan sát chi tiết, phác thảo hình dáng chuẩn xác.",
        "Nét vẽ phóng khoáng, thể hiện trí tưởng tượng phong phú.",
        "Có nhiều tiến bộ trong cách đi nét và hoàn thiện hình khối."
    };
    var colorComments = new[] {
        "Bé phối màu hài hòa, các mảng màu tương phản đẹp mắt.",
        "Biết cách pha trộn màu sắc tươi sáng, sinh động.",
        "Màu sắc ấm áp, biết dùng sắc độ đậm nhạt tạo chiều sâu.",
        "Tô màu đều tay, không bị lem ra ngoài nét vẽ.",
        "Chọn màu rất sáng tạo, thể hiện cá tính riêng của bé."
    };
    var absorbComments = new[] {
        "Tiếp thu nhanh, chăm chú lắng nghe cô hướng dẫn.",
        "Hoàn thành bài đúng giờ, rất tích cực tương tác trong lớp.",
        "Hào hứng sáng tạo thêm các chi tiết mới cho tranh.",
        "Tập trung cao độ và kiên nhẫn tô từng chi tiết nhỏ.",
        "Tự tin chia sẻ ý nghĩa bức tranh của mình với cô và các bạn."
    };

    var updated = 0;
    foreach (var j in journals)
    {
        var cName = classes.TryGetValue(j.ClassId, out var cn) ? cn : "";
        string[] pool;
        if (cName.Contains("Tĩnh vật", StringComparison.OrdinalIgnoreCase))
            pool = stillLifeArts;
        else if (cName.Contains("Phong cảnh", StringComparison.OrdinalIgnoreCase))
            pool = landscapeArts;
        else if (cName.Contains("động vật", StringComparison.OrdinalIgnoreCase) || cName.Contains("Nét vẽ vui", StringComparison.OrdinalIgnoreCase))
            pool = animalArts;
        else if (cName.Contains("Góc phố", StringComparison.OrdinalIgnoreCase) || cName.Contains("Ký họa", StringComparison.OrdinalIgnoreCase))
            pool = streetArts;
        else if (cName.Contains("Vườn hoa", StringComparison.OrdinalIgnoreCase) || cName.Contains("Màu sắc", StringComparison.OrdinalIgnoreCase) || cName.Contains("sắc màu", StringComparison.OrdinalIgnoreCase) || cName.Contains("diệu kỳ", StringComparison.OrdinalIgnoreCase))
            pool = colorArts;
        else if (cName.Contains("Hình khối", StringComparison.OrdinalIgnoreCase) || cName.Contains("Sáng tạo", StringComparison.OrdinalIgnoreCase))
            pool = creativeArts;
        else
            pool = landscapeArts;

        var h = Math.Abs((j.SessionDate.Day * 31 + j.StudentId * 17 + j.JournalId).GetHashCode());
        var chosenSvg = pool[h % pool.Length];
        j.PhotoPath = $"/uploads/seed/{chosenSvg}";
        j.StrokeComment = strokeComments[h % strokeComments.Length];
        j.ColorComment = colorComments[(h / 3) % colorComments.Length];
        j.AbsorbComment = absorbComments[(h / 7) % absorbComments.Length];
        updated++;
    }

    await db.SaveChangesAsync();
    return Results.Ok(new { updated });
});

app.MapGet("/api/diag/seed-roster", async (AppDbContext db) =>
{
    var studs = await db.Students.Where(s => new[] { 61, 62, 63, 67 }.Contains(s.StudentId)).ToListAsync();
    foreach (var s in studs) s.Status = "Đang học";
    
    var existingSc = await db.StudentClasses.Where(sc => sc.ClassId == 13).Select(sc => sc.StudentId).ToListAsync();
    foreach (var sid in new[] { 61, 62, 63, 67 })
    {
        if (!existingSc.Contains(sid))
            db.StudentClasses.Add(new StudentClass { StudentId = sid, ClassId = 13, IsActive = true });
    }
    
    await db.SaveChangesAsync();
    var count = await db.StudentClasses.CountAsync(sc => sc.ClassId == 13 && sc.IsActive && sc.Student!.Status == "Đang học");
    return Results.Ok(new { classId = 13, activeStudents = count });
});

app.MapGet("/api/diag/seed-progress", async (AppDbContext db) =>
{
    var tl = await db.Users.FirstOrDefaultAsync(u => u.Username == "thanhnhi");
    var tlId = tl?.UserId ?? 1;
    var sql = $@"
INSERT INTO ""ProgressRecords"" (""StudentId"", ""ClassId"", ""SessionDate"", ""EvalDate"", ""Status"", ""TeacherId"", ""RecordedBy"")
SELECT x.""StudentId"", x.""ClassId"", x.""SessionDate"", x.""SessionDate"",
       CASE WHEN x.""StudentId"" % 5 = 0 THEN 'Chậm tiến độ' ELSE 'Đúng tiến độ' END, c.""TeacherId"", {tlId}
FROM (SELECT r.""PersonId"" AS ""StudentId"", a.""ClassId"", a.""SessionDate"", ROW_NUMBER() OVER (PARTITION BY r.""PersonId"" ORDER BY a.""SessionDate"" DESC) AS rk
      FROM ""AttendanceRecords"" r
      JOIN ""Attendances"" a ON a.""AttendanceId"" = r.""AttendanceId""
      JOIN ""StudentClasses"" sc ON sc.""StudentId"" = r.""PersonId"" AND sc.""ClassId"" = a.""ClassId""
      WHERE r.""PersonType"" = 'Student' AND r.""Status"" = 'present') x
JOIN ""Classes"" c ON c.""ClassId"" = x.""ClassId""
WHERE x.rk = 1 AND x.""StudentId"" % 2 = 0
ON CONFLICT DO NOTHING;";
    var inserted = await db.Database.ExecuteSqlRawAsync(sql);
    var count = await db.ProgressRecords.CountAsync();
    var slowCount = await db.ProgressRecords.CountAsync(p => p.Status == "Chậm tiến độ");
    return Results.Ok(new { inserted, total = count, slow = slowCount });
});

app.MapGet("/api/diag", async (AppDbContext db, IConfiguration cfg) =>
{
    var rawCs = Environment.GetEnvironmentVariable("ConnectionStrings__Default")
             ?? Environment.GetEnvironmentVariable("ConnectionStrings:Default")
             ?? Environment.GetEnvironmentVariable("DATABASE_URL")
             ?? Environment.GetEnvironmentVariable("POSTGRES_URL")
             ?? cfg.GetConnectionString("Default") 
             ?? "";
    try
    {
        var canConnect = await db.Database.CanConnectAsync();
        var userCount = canConnect ? await db.Users.CountAsync() : -1;
        var envNames = Environment.GetEnvironmentVariables().Keys.Cast<string>()
            .Where(k => k.Contains("CONN", StringComparison.OrdinalIgnoreCase) || k.Contains("POSTGRES", StringComparison.OrdinalIgnoreCase) || k.Contains("DATABASE", StringComparison.OrdinalIgnoreCase))
            .ToList();
        return Results.Ok(new {
            ok = true,
            version = "v7",
            canConnect,
            userCount,
            matchingEnvKeys = envNames,
            hasCs = !string.IsNullOrWhiteSpace(rawCs),
            csType = rawCs.StartsWith("postgres", StringComparison.OrdinalIgnoreCase) ? "URI" : "Standard",
            parsedHost = ProgramHelpers.ParsePostgresConnection(rawCs).Split(';').FirstOrDefault()
        });
    }
    catch (Exception ex)
    {
        return Results.Json(new { ok = false, error = ex.GetType().Name, message = ex.Message, inner = ex.InnerException?.Message }, statusCode: 500);
    }
});

app.MapGet("/api/diag/seed", async (AppDbContext db) =>
{
    var pw = "$2b$11$/.liJknXJ64GHmqOOyYVuuRvZX.DZuA1JL7HzT42/NNKQLbEA1g.q"; // Nhanho@123
    
    if (!await db.Users.AnyAsync())
    {
        var users = new List<User>
        {
            new() { Username = "thanhnhi", Email = "thanhnhi@ngoinhanho.vn", PasswordHash = pw, Role = "assistant", FullName = "Thanh Nhi", Title = "", Phone = "0901234001", CreatedAt = DateTime.UtcNow },
            new() { Username = "minhchau", Email = "minhchau@ngoinhanho.vn", PasswordHash = pw, Role = "manager", FullName = "Minh Châu", Title = "", Phone = "0901234002", CreatedAt = DateTime.UtcNow },
            new() { Username = "thaibao", Email = "thaibao@ngoinhanho.vn", PasswordHash = pw, Role = "supervisor", FullName = "Thái Bảo", Title = "", Phone = "0901234003", CreatedAt = DateTime.UtcNow },
            new() { Username = "myduyen", Email = "myduyen@ngoinhanho.vn", PasswordHash = pw, Role = "teacher", FullName = "Mỹ Duyên", Title = "Cô", Phone = "0901234004", CreatedAt = DateTime.UtcNow },
            new() { Username = "baochau", Email = "baochau@ngoinhanho.vn", PasswordHash = pw, Role = "teacher", FullName = "Bảo Châu", Title = "Cô", Phone = "0901234005", CreatedAt = DateTime.UtcNow },
            new() { Username = "quynh", Email = "quynh@ngoinhanho.vn", PasswordHash = pw, Role = "teacher", FullName = "Quỳnh", Title = "Cô", Phone = "0901234006", CreatedAt = DateTime.UtcNow },
            new() { Username = "thuha", Email = "thuha@ngoinhanho.vn", PasswordHash = pw, Role = "teacher", FullName = "Thu Hà", Title = "Cô", Phone = "0901234007", CreatedAt = DateTime.UtcNow },
            new() { Username = "minhkhoa", Email = "minhkhoa@ngoinhanho.vn", PasswordHash = pw, Role = "teacher", FullName = "Minh Khoa", Title = "Thầy", Phone = "0901234008", CreatedAt = DateTime.UtcNow },
            new() { Username = "lananh", Email = "lananh@ngoinhanho.vn", PasswordHash = pw, Role = "teacher", FullName = "Lan Anh", Title = "Cô", Phone = "0901234009", CreatedAt = DateTime.UtcNow },
            new() { Username = "0901234567", Email = null, PasswordHash = pw, Role = "parent", FullName = "Nguyễn Văn Hải", Title = null, Phone = "0901234567", CreatedAt = DateTime.UtcNow }
        };
        db.Users.AddRange(users);
        await db.SaveChangesAsync();
    }

    if (!await db.Classes.AnyAsync())
    {
        var myduyen = await db.Users.FirstOrDefaultAsync(u => u.Username == "myduyen");
        var baochau = await db.Users.FirstOrDefaultAsync(u => u.Username == "baochau");
        var quynh = await db.Users.FirstOrDefaultAsync(u => u.Username == "quynh");
        var thuha = await db.Users.FirstOrDefaultAsync(u => u.Username == "thuha");
        var minhkhoa = await db.Users.FirstOrDefaultAsync(u => u.Username == "minhkhoa");
        var lananh = await db.Users.FirstOrDefaultAsync(u => u.Username == "lananh");

        var classes = new List<ClassRoom>
        {
            new() { Name = "Cơ bản - Thế giới màu sắc", Program = "Cơ bản", Weekday = 2, Weekday2 = 4, StartTime = new TimeOnly(17,30), EndTime = new TimeOnly(19,30), TeacherId = myduyen?.UserId, Letter = "A" },
            new() { Name = "Nâng cao - Vẽ tĩnh vật", Program = "Nâng cao", Weekday = 2, Weekday2 = 4, StartTime = new TimeOnly(17,30), EndTime = new TimeOnly(19,30), TeacherId = baochau?.UserId, Letter = "A" },
            new() { Name = "Nâng cao - Góc phố nhỏ", Program = "Nâng cao", Weekday = 2, Weekday2 = 4, StartTime = new TimeOnly(17,30), EndTime = new TimeOnly(19,30), TeacherId = quynh?.UserId, Letter = "B" },
            new() { Name = "Cơ bản - Sắc màu diệu kỳ", Program = "Cơ bản", Weekday = 1, Weekday2 = 3, StartTime = new TimeOnly(17,30), EndTime = new TimeOnly(19,30), TeacherId = thuha?.UserId, Letter = "A" },
            new() { Name = "Nâng cao - Phong cảnh quê hương", Program = "Nâng cao", Weekday = 1, Weekday2 = 3, StartTime = new TimeOnly(17,30), EndTime = new TimeOnly(19,30), TeacherId = baochau?.UserId, Letter = "A" },
            new() { Name = "Cơ bản - Bé vẽ động vật", Program = "Cơ bản", Weekday = 6, Weekday2 = 0, StartTime = new TimeOnly(14,30), EndTime = new TimeOnly(16,30), TeacherId = thuha?.UserId, Letter = "A" },
            new() { Name = "Nâng cao - Ký họa nhanh", Program = "Nâng cao", Weekday = 6, Weekday2 = 0, StartTime = new TimeOnly(14,30), EndTime = new TimeOnly(16,30), TeacherId = minhkhoa?.UserId, Letter = "A" },
            new() { Name = "Cơ bản - Nét vẽ vui", Program = "Cơ bản", Weekday = 6, Weekday2 = 0, StartTime = new TimeOnly(9,40), EndTime = new TimeOnly(11,40), TeacherId = lananh?.UserId, Letter = "A" },
            new() { Name = "Nâng cao - Màu nước cơ bản", Program = "Nâng cao", Weekday = 6, Weekday2 = 0, StartTime = new TimeOnly(9,40), EndTime = new TimeOnly(11,40), TeacherId = quynh?.UserId, Letter = "A" },
            new() { Name = "Cơ bản - Bé tập tô màu", Program = "Cơ bản", Weekday = 1, Weekday2 = 3, StartTime = new TimeOnly(17,30), EndTime = new TimeOnly(19,30), TeacherId = lananh?.UserId, Letter = "B" },
            new() { Name = "Nâng cao - Hình khối", Program = "Nâng cao", Weekday = 1, Weekday2 = 3, StartTime = new TimeOnly(17,30), EndTime = new TimeOnly(19,30), TeacherId = minhkhoa?.UserId, Letter = "B" },
            new() { Name = "Cơ bản - Vẽ cùng bé", Program = "Cơ bản", Weekday = 6, Weekday2 = 0, StartTime = new TimeOnly(7,30), EndTime = new TimeOnly(9,30), TeacherId = myduyen?.UserId, Letter = "A" }
        };
        db.Classes.AddRange(classes);
        await db.SaveChangesAsync();
    }

    var uCount = await db.Users.CountAsync();
    var cCount = await db.Classes.CountAsync();
    return Results.Ok(new { ok = true, userCount = uCount, classCount = cCount });
});

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
