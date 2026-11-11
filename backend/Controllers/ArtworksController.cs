using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SkiaSharp;
namespace NgoiNhaNho;
[ApiController, Authorize, Route("api/artworks")]
public class ArtworksController(AppDb db, Access access, IWebHostEnvironment env) : ControllerBase
{
    private string Store => Path.Combine(env.ContentRootPath, "storage");
    [Authorize(Roles = Roles.Teacher), HttpPost, RequestSizeLimit(6_000_000)]
    public async Task<object> Upload([FromForm] Guid studentId, [FromForm] Guid sessionId, IFormFile file)
    {
        await access.Student(studentId); var (s, c) = await access.Session(sessionId, true); Rules.Require(s.Closed && Rules.At(s.Date, s.End) <= Rules.Now && await db.Attendances.AnyAsync(a => a.SessionId == sessionId && a.StudentId == studentId && a.Present), "Chỉ đăng tác phẩm cho học viên có mặt trong ca đã kết thúc.");
        Rules.Require(file.Length is > 0 and <= 5_000_000, "Ảnh phải có dung lượng không quá 5MB.");
        using var buffer = new MemoryStream(); await file.CopyToAsync(buffer); buffer.Position = 0;
        using var codec = SKCodec.Create(buffer); Rules.Require(codec is not null, "Ảnh không hợp lệ.");
        var info = codec!.Info; Rules.Require((long)info.Width * info.Height <= 30_000_000, "Ảnh vượt quá 30 megapixel.");
        var format = codec.EncodedFormat; Rules.Require(format is SKEncodedImageFormat.Jpeg or SKEncodedImageFormat.Png, "Chỉ nhận ảnh JPEG hoặc PNG.");
        using var bitmap = SKBitmap.Decode(codec); Rules.Require(bitmap is not null, "Không thể đọc ảnh.");
        var a = new Artwork { StudentId = studentId, SessionId = sessionId }; a.FileName = a.Id.ToString("N") + (format == SKEncodedImageFormat.Png ? ".png" : ".jpg"); Directory.CreateDirectory(Store); var original = Path.Combine(Store, a.FileName); var thumb = Path.Combine(Store, a.Id.ToString("N") + ".thumb.jpg");
        try
        {
            await System.IO.File.WriteAllBytesAsync(original, buffer.ToArray());
            var scale = Math.Min(1, 600.0 / Math.Max(info.Width, info.Height));
            using var surface = SKSurface.Create(new SKImageInfo(Math.Max(1, (int)(info.Width * scale)), Math.Max(1, (int)(info.Height * scale))));
            surface.Canvas.Clear(SKColors.White);
            using var image = SKImage.FromBitmap(bitmap!);
            surface.Canvas.DrawImage(image, new SKRect(0, 0, surface.Canvas.DeviceClipBounds.Width, surface.Canvas.DeviceClipBounds.Height), new SKSamplingOptions(SKFilterMode.Linear));
            using var snapshot = surface.Snapshot(); using var encoded = snapshot.Encode(SKEncodedImageFormat.Jpeg, 65); await System.IO.File.WriteAllBytesAsync(thumb, encoded.ToArray());
            Rules.Require(new FileInfo(thumb).Length < 200_000, "Ảnh thu nhỏ vượt giới hạn; vui lòng chọn ảnh khác."); db.Artworks.Add(a); db.Track(access.Id, a); await db.SaveChangesAsync(); return new { a.Id, url = "/api/artworks/" + a.Id };
        }
        catch { if (System.IO.File.Exists(original)) System.IO.File.Delete(original); if (System.IO.File.Exists(thumb)) System.IO.File.Delete(thumb); throw; }
    }
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Download(Guid id, bool thumbnail = false)
    {
        var a = await db.Artworks.FindAsync(id); Rules.Require(a is not null, "Không tìm thấy tác phẩm.", 404); await access.Student(a!.StudentId);
        if (access.Role == Roles.Teacher) await access.Session(a.SessionId, true);
        var path = Path.Combine(Store, thumbnail ? a.Id.ToString("N") + ".thumb.jpg" : a.FileName); Rules.Require(System.IO.File.Exists(path), "Ảnh chưa có trong kho lưu trữ.", 404);
        Response.Headers.CacheControl = "private, no-store"; return PhysicalFile(path, thumbnail || a.FileName.EndsWith(".jpg") ? "image/jpeg" : "image/png");
    }
}
