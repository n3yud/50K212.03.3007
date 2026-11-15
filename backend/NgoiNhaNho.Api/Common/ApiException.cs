using System.Text.Json;

namespace NgoiNhaNho.Api.Common;

/// <summary>Lỗi nghiệp vụ: trả về cho giao diện dạng { message, fields?, children? } với mã HTTP phù hợp.</summary>
public class ApiException : Exception
{
    public int Status { get; }
    public Dictionary<string, string>? Fields { get; init; }
    public List<Dictionary<string, string>>? Children { get; init; }
    public object? Extra { get; init; }

    public ApiException(string message, int status = 400) : base(message) { Status = status; }
    public static ApiException Forbidden(string? m = null) => new(m ?? "Bạn không có quyền thực hiện thao tác này", 403);
    public static ApiException NotFound(string m = "Không tìm thấy dữ liệu") => new(m, 404);
    public static ApiException Invalid(string message, Dictionary<string, string> fields) => new(message) { Fields = fields };
}

/// <summary>Bắt mọi lỗi và đổi thành JSON thống nhất; lỗi không lường trước chỉ trả thông báo chung (không lộ chi tiết kỹ thuật).</summary>
public class ErrorMiddleware(RequestDelegate next, ILogger<ErrorMiddleware> log)
{
    private static readonly JsonSerializerOptions Json = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    public async Task Invoke(HttpContext ctx)
    {
        try { await next(ctx); }
        catch (ApiException e)
        {
            ctx.Response.StatusCode = e.Status; ctx.Response.ContentType = "application/json; charset=utf-8";
            await ctx.Response.WriteAsync(JsonSerializer.Serialize(new { message = e.Message, fields = e.Fields, children = e.Children, extra = e.Extra }, Json));
        }
        catch (Exception e)
        {
            log.LogError(e, "Lỗi không xử lý được");
            ctx.Response.StatusCode = 500; ctx.Response.ContentType = "application/json; charset=utf-8";
            await ctx.Response.WriteAsync(JsonSerializer.Serialize(new { message = "Hiện tại đang có sự cố, vui lòng thử lại sau", detail = e.Message, errorType = e.GetType().Name }, Json));
        }
    }
}
