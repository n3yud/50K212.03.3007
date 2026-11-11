using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using NgoiNhaNho;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);
builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true).AddEnvironmentVariables();
builder.Services.AddDbContext<AppDb>(o => o.UseSqlServer(builder.Configuration.GetConnectionString("Default")));
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<Access>();
builder.Services.AddScoped<ScheduleService>();
builder.Services.AddScoped<ClassScheduleService>();
builder.Services.AddScoped<IPasswordHasher<UserAccount>, PasswordHasher<UserAccount>>();
builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme).AddCookie(o =>
{
    o.Cookie.Name = "NNN.Session"; o.Cookie.HttpOnly = true; o.Cookie.SameSite = SameSiteMode.Strict; o.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
    o.ExpireTimeSpan = TimeSpan.FromHours(8); o.SlidingExpiration = true;
    o.Events.OnRedirectToLogin = c => { c.Response.StatusCode = 401; return Task.CompletedTask; };
    o.Events.OnRedirectToAccessDenied = c => { c.Response.StatusCode = 403; return Task.CompletedTask; };
    o.Events.OnValidatePrincipal = async c =>
    {
        var db = c.HttpContext.RequestServices.GetRequiredService<AppDb>();
        if (!Guid.TryParse(c.Principal?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value, out var id)) { c.RejectPrincipal(); return; }
        var user = await db.Users.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id);
        if (user is null || user.Locked || user.Role != c.Principal!.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value || user.SessionVersion.ToString() != c.Principal.FindFirst("version")?.Value) c.RejectPrincipal();
    };
});
builder.Services.AddAuthorization();
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = 429;
    o.AddPolicy("auth", c => RateLimitPartition.GetFixedWindowLimiter(c.Connection.RemoteIpAddress?.ToString() ?? "local", _ => new FixedWindowRateLimiterOptions { PermitLimit = 15, Window = TimeSpan.FromMinutes(1) }));
});
builder.Services.AddControllers().ConfigureApiBehaviorOptions(o => o.InvalidModelStateResponseFactory = _ => new Microsoft.AspNetCore.Mvc.BadRequestObjectResult(new { message = "Thông tin không hợp lệ. Vui lòng kiểm tra các trường bắt buộc, ngày tháng và định dạng dữ liệu." }));
builder.Services.AddHostedService<ExpiryWorker>();
var app = builder.Build();
if (args.Contains("--schema"))
{
    using var scope = app.Services.CreateScope();
    var script = scope.ServiceProvider.GetRequiredService<AppDb>().Database.GenerateCreateScript();
    var path = Path.GetFullPath(Path.Combine(app.Environment.ContentRootPath, "../database/001-schema.sql"));
    Directory.CreateDirectory(Path.GetDirectoryName(path)!); await File.WriteAllTextAsync(path, script); return;
}
if (args.Contains("--init") || args.Contains("--seed"))
{
    using var scope = app.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<AppDb>();
    await db.Database.MigrateAsync();
    if (args.Contains("--seed")) await Seed.Run(db, scope.ServiceProvider.GetRequiredService<IPasswordHasher<UserAccount>>(), builder.Configuration);
    return;
}
app.Use(async (ctx, next) =>
{
    try
    {
        ctx.Response.Headers["X-Content-Type-Options"] = "nosniff";
        ctx.Response.Headers["Referrer-Policy"] = "same-origin";
        if (ctx.Request.Path.StartsWithSegments("/api")) ctx.Response.Headers.CacheControl = "no-store";
        // All modifying browser requests must come from this site's origin.
        if (ctx.Request.Path.StartsWithSegments("/api") && ctx.Request.Method is not ("GET" or "HEAD" or "OPTIONS"))
        {
            var origin = ctx.Request.Headers.Origin.ToString();
            if (origin.Length > 0 && (!Uri.TryCreate(origin, UriKind.Absolute, out var uri) || uri.Authority != ctx.Request.Host.Value)) throw new BusinessError("Yêu cầu không hợp lệ.", 403);
            if (ctx.Request.Headers["Sec-Fetch-Site"] == "cross-site") throw new BusinessError("Yêu cầu không hợp lệ.", 403);
        }
        await next();
    }
    catch (BusinessError e) { ctx.Response.StatusCode = e.Status; await ctx.Response.WriteAsJsonAsync(new { message = e.Message }); }
    catch (DbUpdateConcurrencyException) { ctx.Response.StatusCode = 409; await ctx.Response.WriteAsJsonAsync(new { message = "Dữ liệu vừa thay đổi. Vui lòng tải lại và thử lại." }); }
    catch (Microsoft.Data.SqlClient.SqlException e) when (e.Number is 1205 or 2601 or 2627) { ctx.Response.StatusCode = 409; await ctx.Response.WriteAsJsonAsync(new { message = "Dữ liệu vừa thay đổi. Vui lòng tải lại và thử lại." }); }
    catch (DbUpdateException e) when (e.InnerException is Microsoft.Data.SqlClient.SqlException sql && sql.Number is 1205 or 2601 or 2627) { ctx.Response.StatusCode = 409; await ctx.Response.WriteAsJsonAsync(new { message = "Dữ liệu vừa thay đổi. Vui lòng tải lại và thử lại." }); }
    catch (Exception e) when (e.GetBaseException() is Microsoft.Data.SqlClient.SqlException { Number: 1205 or 2601 or 2627 }) { ctx.Response.StatusCode = 409; await ctx.Response.WriteAsJsonAsync(new { message = "Dữ liệu vừa thay đổi. Vui lòng tải lại và thử lại." }); }
    catch (Exception e) { app.Logger.LogError(e, "Request failed"); ctx.Response.StatusCode = 500; await ctx.Response.WriteAsJsonAsync(new { message = "Hiện tại đang có sự cố, ba mẹ đợi Ngôi Nhà Nhỏ một xíu nhé!" }); }
});
app.UseRateLimiter(); app.UseAuthentication(); app.UseAuthorization();
app.Use(async (ctx, next) =>
{
    if (ctx.User.Identity?.IsAuthenticated == true && ctx.Request.Path.StartsWithSegments("/api") && !ctx.Request.Path.StartsWithSegments("/api/auth"))
    {
        var id = Guid.Parse(ctx.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)!.Value);
        if (await ctx.RequestServices.GetRequiredService<AppDb>().Users.AnyAsync(u => u.Id == id && u.MustChangePassword)) { ctx.Response.StatusCode = 403; await ctx.Response.WriteAsJsonAsync(new { message = "Vui lòng đổi mật khẩu ở lần đăng nhập đầu tiên." }); return; }
    }
    await next();
});
app.UseDefaultFiles(); app.UseStaticFiles(); app.MapControllers();
app.MapGet("/api/health", () => new { status = "ok" });
app.MapFallback(async ctx =>
{
    if (ctx.Request.Path.StartsWithSegments("/api")) { ctx.Response.StatusCode = 404; await ctx.Response.WriteAsJsonAsync(new { message = "Không tìm thấy chức năng này." }); return; }
    var index = Path.Combine(app.Environment.WebRootPath ?? "wwwroot", "index.html");
    if (File.Exists(index) && !Path.HasExtension(ctx.Request.Path)) { ctx.Response.ContentType = "text/html; charset=utf-8"; await ctx.Response.SendFileAsync(index); } else ctx.Response.StatusCode = 404;
});
app.Run();
