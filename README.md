# Lớp vẽ Ngôi Nhà Nhỏ

Hệ thống đăng ký học thử, quản lý học viên và lịch học. Bản hiện tại chạy cục bộ trên Windows với **React + ASP.NET Core 8 + SQL Server**, dùng chung API và database cho 5 vai trò.

Xem [báo cáo tiến độ](docs/PROGRESS.md), [ma trận Use Case](docs/USE_CASES.md), [quyết định nghiệp vụ](docs/DECISIONS.md), [kiến trúc](docs/ARCHITECTURE.md), [danh sách API](docs/API.md) và [kiểm thử](docs/TESTING.md). Những mục chưa nghiệm thu được ghi riêng, không coi là đã hoàn thành chỉ vì có giao diện.

## Khởi động trên máy này

Đảm bảo dịch vụ **SQL Server (MSSQLSERVER)** đang chạy. Cấu hình mặc định dùng `localhost`, Windows Authentication, database `NgoiNhaNho`.

```powershell
.\scripts\start.ps1
```

Mở **http://127.0.0.1:5080**. Script chạy bản Release trong thư mục Backend; Ctrl+C để dừng. Nếu đang mở một phiên Debug cũ trong Visual Studio, hãy khởi động lại phiên đó để nhận mã Backend mới.

## Cài đặt lại từ mã nguồn

Cần .NET SDK 8, Node.js/npm và SQL Server. Trên máy đã xác minh có .NET 8 và Node.js 24.

Chạy các lệnh tại thư mục dự án:

```powershell
dotnet tool restore
dotnet restore backend/NgoiNhaNho.Api.csproj
Set-Location frontend
npm ci
npm run build
Set-Location ..
dotnet build backend/NgoiNhaNho.Api.csproj -c Release --no-restore
dotnet tool run dotnet-ef database update --project backend/NgoiNhaNho.Api.csproj --configuration Release --no-build
```

Migration chỉ áp dụng thay đổi chưa có. **Không dùng `database drop`, migration về `0`, `EnsureDeleted` hoặc xóa bảng để cài lại.** Nếu database đã có các bảng cùng tên được tạo ngoài EF, cần đối chiếu/baseline trước, không chạy ghi đè.

Có thể cấu hình kết nối bằng cách sao chép `backend/appsettings.Local.example.json` thành `backend/appsettings.Local.json`, hoặc biến môi trường `ConnectionStrings__Default`. File Local được bỏ qua trong Git. Không đưa mật khẩu database thật vào Git.

## Tài khoản kiểm thử

Trên database `NgoiNhaNho` mới đã tạo 5 tài khoản sau, mật khẩu ban đầu **`NgoiNhaNho!Demo2026`**, bắt buộc đổi khi đăng nhập lần đầu:

| Vai trò | ID / số điện thoại | Email kiểm thử |
| --- | --- | --- |
| Quản lý | QL01 | ql01@example.test |
| Trợ lý | TL01 | tl01@example.test |
| Giáo viên | GV01 | gv01@example.test |
| Giám sát | GS01 | gs01@example.test |
| Phụ huynh | 0900000001 | Không dùng email |

Để tạo tài khoản mẫu ở database mới khác, tự chọn mật khẩu rồi chạy:

```powershell
$env:Seed__Password='MatKhauKiemThuTu12KyTu!'
Set-Location backend
dotnet bin/Release/net8.0/NgoiNhaNho.Api.dll --seed
Set-Location ..
```

Seed chỉ thêm cơ sở/tài khoản mẫu chưa tồn tại, không đổi mật khẩu tài khoản đã có. Mật khẩu bạn đặt khi seed mới sẽ thay cho mật khẩu mẫu trong bảng trên. Phần mềm không có màn tạo/khóa tài khoản nhân viên cho Quản lý.

Phụ huynh mới đăng ký học thử công khai tại trang chào mừng. Tài khoản được liên kết theo số điện thoại; Trợ lý dùng **Hồ sơ học viên → Cấp mật khẩu phụ huynh** sau khi xác minh danh tính ngoài hệ thống. Mật khẩu tạm chỉ hiển thị trong lần cấp và phụ huynh phải đổi khi đăng nhập.

## Luồng chạy thử

1. Phụ huynh đăng ký học thử mà không cần đăng nhập.
2. Trợ lý tạo lớp, phân công giáo viên và tạo ca theo lịch cho đủ khoảng thời gian cần dùng.
3. Trợ lý tiếp nhận đơn và gửi đề xuất ca; phụ huynh xác nhận; Quản lý duyệt. Khi không duyệt, đơn về **Chờ xếp ca học thử**.
4. Giáo viên điểm danh và đánh giá sau ca học thử; Trợ lý ghi tư vấn. Chỉ khi quyết định là **Đăng ký chính thức** mới tạo hồ sơ từ đơn.
5. Hồ sơ mới **Chờ xếp lớp**; xếp lớp thành công chuyển **Đang học**.
6. Ghi nhận học phí tháng sau khi đã tạo đủ ca học thực tế. Tổng số buổi là số ca thường trong tháng thuộc thời gian ghi danh của học viên. Giá niêm yết chưa được cung cấp thì hiển thị **Chưa cấu hình**; vẫn ghi nhận được trạng thái đã thanh toán.
7. Xin nghỉ trừ 1 buổi ở tháng của ca nghỉ; đăng ký/hủy học bù không trừ thêm. Ca bù được giữ chỗ, Trợ lý trình duyệt, Quản lý phê duyệt.
8. Giáo viên chỉ điểm danh ca mình phụ trách; có mặt trong ca thường mới trừ buổi lúc chốt. Buổi học thử và học bù không trừ buổi.

Trong **Cập nhật lớp**, chọn ngày hiệu lực nếu đổi thứ/giờ/chương trình. Ca đã qua giữ nguyên. Ca tương lai đã gắn học thử/nghỉ/học bù/điểm danh sẽ chặn việc đổi để rà soát trước; không tự hủy lịch đã xác nhận. Nếu lịch mới thay đổi số ca của tháng đã thanh toán, hệ thống tính lại số buổi còn lại và giữ số buổi đã dùng; không chấp nhận tổng mới nhỏ hơn số đã dùng.

## Học phí và ảnh

Biểu phí Cơ bản/Nâng cao để `null` cho đến khi cơ sở cung cấp giá. Đặt `Business__BasicMonthlyFee` / `Business__AdvancedMonthlyFee` hoặc cấu hình Local khi đã có thông tin. Không có cổng thanh toán, quét QR đối soát hay tính doanh thu.

Ảnh lưu tại `backend/storage`, nằm ngoài `wwwroot`. Mọi lần xem ảnh đi qua API kiểm tra quyền; thumbnail JPEG dưới 200KB. Cần sao lưu cả database và thư mục ảnh. Người dùng đã chọn **giữ bản chạy cục bộ để kiểm thử, tích hợp cloud sau**.

## Điểm danh khi mất mạng

Giáo viên cần mở lịch và danh sách ca một lần khi có mạng. Giao diện và danh sách đã mở được lưu để dùng trên cùng trình duyệt/phiên làm việc; điểm danh lưu theo tài khoản và ca. Khi có mạng, hệ thống thử đồng bộ ngay và sau mỗi 10 giây. Dữ liệu chỉ thành chính thức sau khi Backend chấp nhận chốt. Nếu dữ liệu đã thay đổi hoặc hết buổi, thông báo được hiển thị để xử lý; không bỏ bản lưu tạm âm thầm.

## SQL và kiểm thử

- `database/000-create-database.sql`: tạo database nếu chưa tồn tại.
- `database/001-schema.sql`: script migration idempotent do EF sinh; chọn database `NgoiNhaNho` trong SSMS trước khi chạy.
- `database/002-seed.sql`: cơ sở Hòa Xuân mẫu; tài khoản tạo bằng seed C# có hash mật khẩu.
- `database/backup.sql`: mẫu backup không ghi đè file, cần cấu hình thư mục và lịch SQL Server Agent lúc 23:30. Chưa cài lịch tự động trên máy này.
- Các thao tác ghi trong kiểm thử dùng database riêng, không dùng dữ liệu cơ sở đang vận hành. Hướng dẫn và kết quả ở [TESTING.md](docs/TESTING.md).

## Cấu trúc

```text
backend/Controllers/       API theo nhóm nghiệp vụ
backend/Domain/            Vai trò, trạng thái và mô hình dữ liệu
backend/Data/              EF Core, khóa/ràng buộc, migrations
backend/Services/          Quy tắc, lịch phiên bản, khóa SQL, seed, Excel
frontend/src/pages/        Màn hình theo nghiệp vụ
frontend/src/components/   Biểu mẫu, bảng, modal, ngôn ngữ, hỗ trợ tài khoản
frontend/src/lib/          API, dịch nhãn Việt/Anh, hàng đợi điểm danh
frontend/src/styles/       Tokens, CSS dùng chung, layout, mobile
frontend/public/assets/    SVG gốc đã tải từ Figma
database/                  Script SQL
tests/                     Kiểm thử quy tắc và tích hợp SQL/API
docs/                      Tài liệu phân tích, đối chiếu và bàn giao
```
