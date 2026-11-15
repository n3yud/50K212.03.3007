# Báo cáo tiến độ (trung thực)

## Đã làm
**Frontend** – dựng lại theo bản xuất Figma trong `docs/figma/` (web 1440×900, mobile 390×844):
- Web quản trị: đăng nhập (banner lỗi trong thẻ), khung menu và toàn bộ màn Trợ lý theo menu con của Figma (học thử, hồ sơ học viên 5 màn, lớp học 4 màn, học bù 2 màn, học phí 2 màn, tiến độ 3 màn), lịch tuần; Quản lý: tổng quan, 2 màn phê duyệt, 3 màn báo cáo; Giám sát: kiểm tra tiến độ review, gửi nhắc nhở.
- Mobile Phụ huynh: chào mừng, đăng nhập (banner đỏ/xanh), đổi mật khẩu lần đầu, trang chủ, học thử (đăng ký nhiều bé, lịch, kết quả), xin nghỉ / đăng ký bù / huỷ bù, thời khoá biểu, nhật ký, thông báo – kèm các màn ngoại lệ.
- Trang "Quên mật khẩu?" riêng cho Giáo viên (GV-03) và Phụ huynh (PH-04).
- Lựa chọn lịch học khi tạo lớp không còn Thứ 6 (trung tâm nghỉ Thứ 6 – BR-UC7-04).
- Mobile Giáo viên (GV-01 → GV-44): trang chủ, ca dạy, điểm danh (+ ngoại tuyến tự đồng bộ ≤ 30 giây), tra cứu lịch theo tuần/ngày, đăng tải ảnh tác phẩm (ảnh nén < 200KB), nhận xét, đánh giá học thử – kèm toàn bộ màn ngoại lệ.
- Xuất Excel .xlsx thật (không cần thư viện). Song ngữ Việt/Anh (NFR-05). Chế độ giả lập sự cố hệ thống (Ctrl+Alt+E) để xem màn lỗi.
- Mã học viên đổi sang dạng **HV0001** (đồng bộ Frontend, Backend, dữ liệu mẫu).

**Backend** – bổ sung: `GET /students/trial-candidates`, `GET /parent/trials/completed`; huỷ học bù kiểm tra "Hết hạn" trước; danh sách học bù cần xử lý gồm cả yêu cầu vừa hết hạn trong 7 ngày; báo cáo dùng khoảng ngày tự chọn và chia "Tuần 1, 2, …".

## Mức độ kiểm chứng
| Hạng mục | Đã kiểm chứng | Chưa kiểm chứng |
|---|---|---|
| Frontend | build + chạy trình duyệt headless ở chế độ giả lập; mọi trang của 5 vai trò không lỗi JS; so sánh cạnh nhau với ảnh Figma; đã chạy trọn luồng Đánh giá năng lực học thử (danh sách → thiếu đánh giá → lưu thành công → danh sách rỗng → lỗi hệ thống) | chế độ nối Backend thật |
| Backend C# | đã đối chiếu từng chỗ sửa với Entities/Dtos/Services (tên thuộc tính, kiểu dữ liệu, thông báo lỗi khớp với giao diện) | chưa biên dịch: .NET trên máy đang hỏng (`host\fxr does not exist`), cần cài lại .NET 8 SDK rồi chạy `tools/chay-backend.bat` |
| SQL | – | chưa chạy: dịch vụ SQL Server (MSSQLSERVER) trên máy đang tắt; `tools/tao-csdl.bat` sẽ tự bật và tạo CSDL |

## Lịch học của trung tâm
- Mỗi lớp học 2 buổi/tuần theo cặp ngày cố định: Thứ 2 - Thứ 4 (17:30 - 19:30), Thứ 3 - Thứ 5 (17:30 - 19:30), Thứ 7 - Chủ nhật (07:30 - 09:30, 09:40 - 11:40, 14:30 - 16:30, 17:00 - 19:00). Thứ 6 nghỉ. Ô "Lịch học" khi tạo lớp và ô "Khung giờ mong muốn" khi đăng ký học thử chỉ cho chọn đúng các lịch này; CSDL có thêm cột Weekday2 và ràng buộc CK_Classes_Schedule.

## Khác biệt có chủ đích so với Figma
- Cỡ chữ theo Figma nên một số chữ nhỏ hơn 14px của NFR-01.
- Phòng học ("Phòng 01") chỉ xuất hiện trong ví dụ hiển thị của màn Giáo viên; form tạo lớp (Figma + đặc tả) không có ô nhập phòng và CSDL không có cột phòng, nên chưa hiển thị.

## Chưa làm / hạn chế
- Thông báo đẩy thật (FCM), email/SMS.
- Song ngữ dịch theo từ điển giao diện; thông báo do máy chủ trả về và dữ liệu nghiệp vụ vẫn tiếng Việt.
- Kiểm thử tự động; tối ưu truy vấn N+1; giới hạn số lần đăng nhập sai.
