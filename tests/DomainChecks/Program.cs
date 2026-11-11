using NgoiNhaNho;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using System.IO.Compression;
using System.Xml.Linq;
using SkiaSharp;

var checks=0;
void Check(bool condition,string name){if(!condition)throw new Exception("FAIL: "+name);checks++;Console.WriteLine("PASS: "+name);}
void Reject(Action action,string name){try{action();}catch(BusinessError){checks++;Console.WriteLine("PASS: "+name);return;}throw new Exception("FAIL: "+name);}
Check(Rules.ProgramFor("Nguyễn An",Rules.Today.AddYears(-5))=="Cơ bản","5 tuổi thuộc Cơ bản");
Check(Rules.ProgramFor("Nguyễn An",Rules.Today.AddYears(-7))=="Nâng cao","7 tuổi thuộc Nâng cao");
Check(Rules.ProgramFor("Nguyễn An",Rules.Today.AddYears(-15))=="Nâng cao","15 tuổi còn được đăng ký");
Reject(()=>Rules.ProgramFor("Nguyễn An",Rules.Today.AddYears(-5).AddDays(1)),"Chưa đủ 5 tuổi bị từ chối");
Reject(()=>Rules.ProgramFor("Nguyễn An",Rules.Today.AddYears(-16)),"16 tuổi bị từ chối");
Reject(()=>Rules.ProgramFor("An 123",Rules.Today.AddYears(-7)),"Tên chứa số bị từ chối");
Reject(()=>Rules.Phone("+84912345678"),"Điện thoại ngoài định dạng đặc tả bị từ chối");
Rules.Phone("0912345678");Check(true,"Điện thoại Việt Nam đúng 10 số");
Reject(()=>Rules.Class(new ArtClass{Name="Lớp A",Program="Cơ bản",Capacity=8,Weekday=1,Start=new(9,0),End=new(10,0)}),"Lớp thường không vượt 7 học viên");
Reject(()=>Rules.Class(new ArtClass{Name="Lớp A",Program="Cơ bản",Capacity=7,Weekday=5,Start=new(9,0),End=new(10,0)}),"Không tạo lớp vào Thứ 6");
Reject(()=>Rules.Class(new ArtClass{Name="Lớp A",Program="Cơ bản",Capacity=7,Weekday=1,Start=new(10,0),End=new(9,0)}),"Giờ kết thúc phải sau giờ bắt đầu");
Check(Rules.At(new(2026,11,11),new(9,0)).Offset==TimeSpan.FromHours(7),"Mốc thời gian ca học dùng UTC+7");
var hasher=new PasswordHasher<UserAccount>();var user=new UserAccount();var hash=hasher.HashPassword(user,"TestPassword!2026");Check(hasher.VerifyHashedPassword(user,hash,"wrong")==PasswordVerificationResult.Failed,"Mật khẩu sai không xác thực");Check(hasher.VerifyHashedPassword(user,hash,"TestPassword!2026")!=PasswordVerificationResult.Failed,"Hash mật khẩu xác thực thành công");
var bytes=Spreadsheet.Create(new[]{new object?[]{"Tên","Giá trị"},new object?[]{"=1+1","<test>&"}});using(var zip=new ZipArchive(new MemoryStream(bytes))){Check(zip.GetEntry("xl/workbook.xml") is not null,"Xuất file XLSX thực");using var sheet=zip.GetEntry("xl/worksheets/sheet1.xml")!.Open();var xml=XDocument.Load(sheet);XNamespace ns="http://schemas.openxmlformats.org/spreadsheetml/2006/main";Check(xml.Descendants(ns+"f").Count()==0&&xml.Descendants(ns+"t").Any(x=>x.Value=="=1+1"),"Dữ liệu Excel được ghi dạng text, không thực thi công thức");}
using(var db=new AppDb(new DbContextOptionsBuilder<AppDb>().UseSqlServer("Server=localhost;Database=SchemaCheck;Integrated Security=true;TrustServerCertificate=true").Options)){var sql=db.Database.GenerateCreateScript();Check(sql.Contains("CK_Leave_Status")&&sql.Contains("FOREIGN KEY")&&sql.Contains("IX_Tuitions_StudentId_Month"),"SQL Server schema có ràng buộc trạng thái, FK và học phí duy nhất theo tháng");}
using(var bitmap=new SKBitmap(100,80)){bitmap.Erase(SKColors.LightBlue);using var image=SKImage.FromBitmap(bitmap);using var encoded=image.Encode(SKEncodedImageFormat.Jpeg,65);Check(encoded.Size<200_000&&encoded.Size>0,"Thư viện ảnh native chạy và tạo JPEG dưới 200KB");Directory.CreateDirectory("artifacts");File.WriteAllBytes("artifacts/test-artwork.jpg",encoded.ToArray());}
Console.WriteLine($"{checks} checks passed. SQL integration not covered by this executable.");
