# Kiểm thử

Kiểm thử dùng SQL Server thật, tách database vận hành và database fixture. Không dùng API giả hay localStorage thay cho database trong các luồng trực tuyến.

## Môi trường đã dùng

- Windows, .NET 8, Node.js 24, SQL Server instance `localhost`.
- `NgoiNhaNho`: database dự án, cơ sở mẫu Hòa Xuân và 5 tài khoản mẫu. Không đưa hồ sơ thử nghiệp vụ vào đây.
- `NgoiNhaNho_Test_20261111_b91a7d`: database fixture của kiểm thử, giữ lại các bản ghi để có thể kiểm tra bằng SSMS.
- API kiểm thử: `http://127.0.0.1:5091`.
- Chrome đã có trên máy, Playwright cấu hình đường dẫn tại `frontend/playwright.config.js`.

## Kết quả đã xác minh

| Kiểm tra | Kết quả |
| --- | --- |
| Backend Release build | Thành công, 0 lỗi / 0 cảnh báo ở lượt build gần nhất |
| Frontend production build | Thành công, React/Vite, font và SVG lưu cục bộ |
| DomainChecks | 18 kiểm tra qua: tuổi, tên/SĐT, sĩ số, Thứ 6, giờ học, UTC+7, hash mật khẩu, XLSX, schema SQL, thư viện ảnh native |
| api_checks.py | 18 kiểm tra qua trên SQL Server: đăng nhập 5 vai trò, quyền API, đăng ký/duyệt học thử, hồ sơ/xếp lớp, phí tháng, nghỉ/bù/hủy, trừ một lần, IDOR phụ huynh, bảo lưu/khôi phục, Excel, thông báo |
| api_deep_checks.py | 7 kiểm tra đầu qua: điểm danh nháp riêng tư, chốt một lần, ảnh/nhận xét/tiến độ thật, ảnh có phân quyền, giữ lịch sử và số buổi đã dùng khi đổi lịch. Bài kiểm tra đồng thời ban đầu phát hiện lỗi deadlock được bọc bởi EF; đã sửa bằng SQL application lock và xử lý lỗi xung đột |
| concurrency_checks.py | Kiểm tra lại sau sửa đã qua: 3 đăng ký đồng thời chỉ giữ 2 chỗ, không trả 500 |
| Playwright | 9/9 bài kiểm tra đã qua, gồm public, 5 vai trò, Việt/Anh, chốt điểm danh ngoại tuyến rồi tự đồng bộ trong 30 giây |
| trial_state_checks.py | Luồng đăng ký → xếp ca → xác nhận → duyệt → điểm danh → đánh giá → tư vấn → hồ sơ chính thức đã qua; phụ huynh không thấy ghi chú nội bộ |
| Mẫu tải 50 yêu cầu đọc đồng thời | 50/50 thành công; thời gian lớn nhất 0,1824s, p95 0,1728s ở lượt đo đầu. Báo cáo đo mới nhất nằm trong `artifacts/load-report.json` |

Lượt đo cuối sau các thay đổi báo cáo: 50/50 thành công, lớn nhất 0,0568s, p95 0,0333s. Database chính kiểm tra cuối có 3 migration, 5 tài khoản, 0 học viên/0 ca học; fixture nằm riêng trong database thử nghiệm.

Đây là mẫu đo cục bộ với dữ liệu fixture nhỏ, không phải bằng chứng SLA hay hiệu năng trên hạ tầng triển khai khác.

Các lỗi tìm được và đã sửa gồm: HTML ở trang chủ thiếu Content-Type; nhãn truy cập input bao gồm dấu bắt buộc/nút hiện mật khẩu; xung đột tên biến với hàm dịch; SQL deadlock khi cùng giữ chỗ; lịch ca cũ bị phụ thuộc giờ hiện tại của lớp. Lỗi được kiểm tra lại ở phạm vi liên quan sau khi sửa.

## Chạy kiểm tra quy tắc

Tại gốc dự án:

```powershell
dotnet run --project tests/DomainChecks -c Release
```

Không cần SQL Server cho nhóm này. Bài tạo schema chỉ sinh SQL từ model, không tạo database. Bài ảnh tạo JPEG nhỏ tại `artifacts/test-artwork.jpg` cho kiểm thử upload.

## Chạy kiểm thử tích hợp từ đầu

Chỉ chạy trên **database thử mới**, không dùng database của cơ sở. Thay tên database cho mỗi bộ fixture mới; script không xóa/reset dữ liệu và không tự đổi lại mật khẩu đã dùng ở lần trước.

```powershell
$env:ConnectionStrings__Default='Server=localhost;Database=NgoiNhaNho_Test_Moi;Integrated Security=true;TrustServerCertificate=true'
$env:Seed__Password='ApiCheck!2026Seed'
Set-Location backend
dotnet bin/Release/net8.0/NgoiNhaNho.Api.dll --seed
dotnet bin/Release/net8.0/NgoiNhaNho.Api.dll --urls http://127.0.0.1:5091
```

Trong cửa sổ PowerShell khác tại gốc dự án:

```powershell
$env:TEST_SEED_PASSWORD='ApiCheck!2026Seed'
$env:TEST_API_URL='http://127.0.0.1:5091'
python tests/api_checks.py
dotnet run --project tests/DomainChecks -c Release
python tests/api_deep_checks.py
python tests/concurrency_checks.py
python tests/load_checks.py
```

`api_checks.py` đổi mật khẩu fixture thành `ApiChecksOnly!2026`, chỉ dùng cho database kiểm thử. Các script sau sử dụng mật khẩu đó. Deep checks tạo lớp/học viên mới; chạy một lần trên bộ fixture mới để tránh đầy lớp do chính các lần thử trước.

## Kiểm tra giao diện

API fixture trên cổng 5091 cần đang chạy, đã chạy `api_checks.py`. Tại `frontend`:

```powershell
$env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:5091'
npm exec playwright test -- --config=playwright.config.js
```

Offline test tạo dữ liệu fixture riêng qua API, mở danh sách ca bằng tài khoản giáo viên, mất mạng, chốt điểm danh và kiểm tra đồng bộ lại trong 30 giây. Ca mẫu 18:00–19:00 nên cần chạy sau 19:00 theo giờ Việt Nam; bài này bỏ qua Thứ 6. Không coi một lần skip là đã kiểm chứng offline.

Ảnh chụp và báo cáo của Playwright ở `artifacts/`, được bỏ qua trong Git. Figma gốc là nguồn đối chiếu hình thức; kiểm thử trình duyệt kiểm tra hành vi và tài nguyên, không tự chứng nhận mọi màn đã khớp pixel.

## Chưa nghiệm thu vận hành

- SLA uptime 99% trong thời gian vận hành.
- Sao lưu tự động hằng ngày 23:30 đã được cài lịch và kiểm thử khôi phục.
- Safari và toàn bộ thiết bị di động thực tế.
- Upload ảnh 2–5MB trong 5 giây trên đường truyền triển khai thật.
- Kiểm thử hồi quy đầy đủ mọi luồng thay thế/ngoại lệ của từng Use Case; phạm vi kiểm tra hiện tại được liệt kê cụ thể ở trên.
