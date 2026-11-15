# Lớp vẽ Ngôi Nhà Nhỏ – Đăng ký khóa học & Quản lý lịch học

```
frontend/   React + Vite (3 ứng dụng web: quản trị, mobile Phụ huynh, mobile Giáo viên)
backend/    ASP.NET Core 8 Web API + Entity Framework Core + JWT
database/   Script SQL Server: 01_schema.sql (tạo bảng), 02_seed.sql (dữ liệu mẫu)
docs/       Đối chiếu Figma, danh sách API, tài khoản thử, báo cáo tiến độ
```

## Cách 1 – Chạy nhanh chỉ có giao diện (không cần Backend/SQL Server)
```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```
Dữ liệu giả lập lưu trong trình duyệt. Xóa: Console → `localStorage.clear()` → F5.

## Cách 2 – Chạy đầy đủ với SQL Server + Backend (CHƯA được kiểm chứng trên máy thật, xem docs/PROGRESS_REPORT.md)

**Yêu cầu:** SQL Server 2019+ (hoặc LocalDB/Developer Edition), .NET SDK 8, Node 18+.

1. **Tạo CSDL:** mở `database/01_schema.sql` trong SSMS/Azure Data Studio → Execute. Sau đó mở `database/02_seed.sql` → Execute. (Chạy lại 01 sẽ xóa và tạo mới database `NgoiNhaNho`.)
2. **Cấu hình Backend:** mở `backend/NgoiNhaNho.Api/appsettings.json`
   - `ConnectionStrings:Default`: sửa `Server=` cho đúng máy của bạn (vd `localhost\SQLEXPRESS` hoặc `(localdb)\MSSQLLocalDB`).
   - `Jwt:Key`: **đổi sang chuỗi bí mật riêng, ≥ 32 ký tự** (đừng dùng chuỗi mặc định khi triển khai thật).
3. **Chạy Backend:**
   ```bash
   cd backend/NgoiNhaNho.Api
   dotnet restore
   dotnet run --urls http://localhost:5000
   ```
   Mở Swagger để thử API: http://localhost:5000/swagger (chỉ ở môi trường Development: `set ASPNETCORE_ENVIRONMENT=Development`).
4. **Nối giao diện với Backend:**
   ```bash
   cd frontend
   copy .env.example .env     # (Mac/Linux: cp .env.example .env)  → để VITE_API_BASE_URL=http://localhost:5000/api
   npm run dev
   ```
   Backend đã cho phép CORS từ `http://localhost:5173` (sửa ở `Cors:Origins`).


## Chạy nhanh bằng file .bat (Windows) – thư mục `tools/`
1. `tao-csdl.bat` – tự xin quyền Administrator, bật SQL Server nếu đang tắt, chạy `01_schema.sql` + `02_seed.sql`, ghi tên server vào `appsettings.json`. Kết quả mở ra trong Notepad (`tools/ket-qua-csdl.txt`).
2. `chay-backend.bat` – biên dịch và chạy Backend ở http://localhost:5000. Lỗi biên dịch (nếu có) ghi vào `tools/ket-qua-build.txt`.
3. `chay-giao-dien.bat that` – chạy giao diện nối Backend thật; `chay-giao-dien.bat` (không tham số) – chạy với dữ liệu giả lập.

## Ba địa chỉ đăng nhập
| Ứng dụng | Địa chỉ | Tài khoản |
|---|---|---|
| Web quản trị (Trợ lý/Quản lý/Giám sát) | `/login` | xem docs/TEST_ACCOUNTS.md |
| Web mobile Phụ huynh | `/phu-huynh/welcome` | SĐT |
| Web mobile Giáo viên | `/giao-vien/welcome` | tên đăng nhập |

Tài khoản chỉ đăng nhập được đúng ứng dụng của mình; mọi API đều kiểm tra vai trò ở Backend bằng JWT.

## Ghi chú vận hành
- Mật khẩu lưu dạng băm BCrypt. Việc cấp/đặt lại mật khẩu do bộ phận Admin làm ngoài hệ thống.
- Giờ hệ thống tính theo múi giờ Việt Nam (Asia/Ho_Chi_Minh).
- Ảnh tác phẩm lưu ở `backend/NgoiNhaNho.Api/wwwroot/uploads/yyyyMM/` (sao lưu thư mục này cùng CSDL).

## Song ngữ Việt / Anh
Giao diện mặc định tiếng Việt. Chuyển sang tiếng Anh: nút **VI | EN** ở màn đăng nhập, hoặc menu tài khoản → "English". Lựa chọn được nhớ trên máy. Dữ liệu nghiệp vụ (tên học viên, tên lớp, nhận xét) giữ nguyên tiếng Việt.

## Điểm danh ngoại tuyến (Giáo viên)
Mất mạng khi điểm danh: kết quả được lưu trên điện thoại. Khi có mạng lại, ứng dụng tự đồng bộ ngay (và quét lại mỗi 15 giây), nên dữ liệu lên hệ thống trong vòng 30 giây.

## Sao lưu dữ liệu hằng ngày
Cần sao lưu **cả CSDL và thư mục ảnh**:
1. CSDL – tạo SQL Server Agent Job chạy lúc 23:30 mỗi ngày (theo NFR: sao lưu ít nhất 1 lần/ngày lúc 23:30):
   ```sql
   BACKUP DATABASE NgoiNhaNho TO DISK = N'D:\Backup\NgoiNhaNho_' + CONVERT(char(8), GETDATE(), 112) + '.bak' WITH INIT, COMPRESSION;
   ```
   (SQL Express không có Agent: dùng Windows Task Scheduler gọi `sqlcmd -S .\SQLEXPRESS -Q "BACKUP DATABASE ..."`.)
2. Ảnh – sao chép `backend/NgoiNhaNho.Api/wwwroot/uploads/` sang ổ khác/đám mây cùng giờ (vd `robocopy ... /MIR`).
3. Giữ tối thiểu 7 bản gần nhất; thử khôi phục định kỳ mỗi tháng.

## Chế độ thử lỗi hệ thống (demo)
Ở chế độ giả lập, nhấn **Ctrl + Alt + E** để bật/tắt giả lập "sự cố hệ thống" – dùng để xem các màn báo lỗi trong Figma.
