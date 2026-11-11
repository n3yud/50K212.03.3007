# Ma trận triển khai và phạm vi kiểm chứng

Tất cả 15 nhóm Use Case có phần xử lý Backend và giao diện gọi API. “Đã có mã” không đồng nghĩa mọi nhánh đã được tự động kiểm thử hoặc đã nghiệm thu hình thức.

| Nhóm | Mã xử lý chính | Giao diện | Bằng chứng / giới hạn |
| --- | --- | --- | --- |
| 1. Đăng nhập | AuthController, SupportController, Access | App, Account, ParentSupport | 5 vai trò, đổi mật khẩu lần đầu, API sai quyền và IDOR đã thử |
| 2. Học thử phụ huynh | TrialsController | Register, Trials | Đăng ký công khai, xác nhận, xem kết quả đã kiểm thử qua API và trình duyệt |
| 3. Xin nghỉ / học bù | LeavesController, ScheduleService, ExpiryWorker | Leaves | Ghi nghỉ, giữ chỗ, trình/duyệt/hủy, không trừ thêm buổi đã thử; hết hạn có mã, chưa mô phỏng hết hạn trong E2E hiện tại |
| 4. Theo dõi quá trình | SessionsController, ProgressController, NotificationsController | Schedule, Progress, Notifications | Quyền phụ huynh, nhật ký riêng tư và thông báo thật đã thử |
| 5. Quản lý học thử | TrialsController | Trials | Trọn luồng tới đánh giá/tư vấn/hồ sơ chính thức đã qua; từ chối về trạng thái người dùng chọn |
| 6. Hồ sơ học viên | StudentsController | Students | Tạo, xếp lớp, bảo lưu, khôi phục và giữ dữ liệu đã qua; cập nhật có validation/audit |
| 7. Lớp học | ClassesController, ClassScheduleService | Classes | Tạo/phân công/xếp lớp/tạo ca/đổi lịch; kiểm thử snapshot lịch cũ và bảo toàn số buổi đã dùng |
| 8. Điều phối học bù | LeavesController, SqlLocks | Leaves | Giữ chỗ/trình duyệt/duyệt thật; thử đồng thời 3 yêu cầu giữ đúng 2 chỗ |
| 9. Học phí | TuitionController | Tuition | Trạng thái theo tháng, số buổi từ ca thực tế, chống ghi lại. Chưa có giá niêm yết do cơ sở cung cấp |
| 10. Tiến độ Trợ lý | ProgressController | Progress | Ghi/tra cứu/lọc chậm tiến độ và XLSX; đã thử lưu cùng nhật ký thật |
| 11. Ca dạy / điểm danh | SessionsController | Schedule, attendanceQueue, service worker | Chốt một lần, trừ một lần, nháp riêng tư, offline tự đồng bộ đã thử bằng Chrome |
| 12. Chuyên môn Giáo viên | ArtworksController, ProgressController, TrialsController | Progress, Trials | Ảnh gốc/thumbnail/nhận xét/đánh giá thử, quyền truy cập ảnh đã thử |
| 13. Phê duyệt | TrialsController, LeavesController | Trials, Leaves | Backend chỉ Quản lý được duyệt; chuỗi trạng thái đã thử |
| 14. Báo cáo | ReportsController, Spreadsheet | Reports | SQL tổng hợp học viên/ca/chuyên cần/bù/phí, biểu đồ dữ liệu thật và XLSX; hiển thị hiện trạng hồ sơ, chưa dựng báo cáo lịch sử biến động trạng thái đầy đủ từ Audit |
| 15. Giám sát | SupervisionController | Supervision | Ca đã kết thúc, thiếu ảnh/nhận xét/tiến độ, gửi đúng giáo viên/trợ lý; mở màn theo vai trò đã thử, nhánh quá hạn/nhắc hàng loạt chưa E2E đầy đủ |

Các trạng thái trống/lỗi ở UI dùng thông báo và dữ liệu API. Không có nút chỉ để trang trí; thao tác cần điều kiện nghiệp vụ có thể bị Backend từ chối với thông báo, thay vì tự tạo dữ liệu minh họa.

## Các mục còn lại để nghiệm thu toàn bộ yêu cầu ban đầu

1. Điền biểu phí thật sau khi cơ sở cung cấp.
2. Đối chiếu chi tiết từng frame Figma, các màn/biến thể có tên chưa rõ và các kích thước thiết bị khác; hiện đã đối chiếu các khung chính và kiểm tra hành vi trên Chrome.
3. Mở rộng hồi quy các nhánh ngoại lệ chưa có bài E2E, nhất là hết hạn học bù và nhắc nhở quá hạn.
4. Dịch nốt thông báo nghiệp vụ động khi cần nghiệm thu tiếng Anh đầy đủ; không dịch tự động nội dung nhận xét do nhân viên nhập.
5. Cài và xác minh lịch backup/khôi phục. Xác minh SLA/Safari/tải ảnh trên hạ tầng triển khai.
6. Cloud để giai đoạn sau theo lựa chọn của người dùng; không phải kết nối giả trong bản cục bộ này.
