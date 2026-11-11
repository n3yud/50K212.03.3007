# Quyết định và đối chiếu tài liệu

Các quyết định dưới đây áp dụng theo xác nhận trực tiếp của người dùng trong cuộc trò chuyện, ưu tiên hơn các đoạn mâu thuẫn trong DOCX.

| Nội dung | Quyết định |
| --- | --- |
| Hồ sơ mới | “Chờ xếp lớp”; sau khi xếp lớp thành công chuyển “Đang học”. |
| Quản lý không duyệt ca học thử | Đơn về “Chờ xếp ca học thử”; gỡ ca cũ, Trợ lý có thể đề xuất ca khác, Phụ huynh xác nhận lại. |
| Học phí | Chỉ cờ “Đã thanh toán” / “Chưa thanh toán” theo tháng và biểu phí VNĐ; không thu tiền, thanh toán trực tuyến, đối soát hoặc kế toán. |
| Số buổi khi ghi nhận học phí | Đếm các ca học thường thực tế đã tạo trong tháng, thuộc lớp học viên được xếp và nằm trong khoảng thời gian ghi danh. Chụp số buổi tại lúc ghi nhận; không lấy 8–10 buổi trung bình làm định mức. Cần tạo đủ lịch tháng trước khi ghi nhận học phí. |
| Biểu phí | Chưa có số tiền do cơ sở cung cấp; cấu hình để null và hiển thị “Chưa cấu hình”, không gán 0 hoặc giá giả. |
| Hạn học bù | Theo đặc tả BR-UC3-08: hết ngày thứ 30 tính từ ngày ca nghỉ; đăng ký/hủy không gia hạn. |
| Bảo lưu | Dùng đúng “Đã bảo lưu”, giữ lịch sử; không có chức năng xóa vĩnh viễn học viên. |
| Sĩ số | Lớp thường tối đa 7; ca ghép bù tối đa 8 và không quá 2 học viên bù, tính cả chỗ giữ. |
| Nhân sự | Quản lý không có API tạo/khóa tài khoản nhân viên. Tài khoản mẫu được tạo bằng seed dành cho kiểm thử. |

## Đối chiếu Figma

Đọc bằng Figma MCP với các context có ảnh tham chiếu: `1:267` (chào mừng), `1:394` (đăng nhập), `1:5119` (đăng ký học thử), `1:4247` (tiếp nhận đơn), `1:3267` (tạo hồ sơ), `1:1039` (điểm danh), `1:5894` (học bù), `1:15944` (báo cáo), `1:17113` (giám sát), `1:4048` (lịch tổng quan). Danh mục frame đã lưu ở `figma-frames.json`.

- Các màn chào mừng/đăng nhập/đăng ký/tiếp nhận/hồ sơ/điểm danh có bố cục đủ để triển khai. Đây là đánh giá mức đầy đủ để xây dựng, chưa phải xác nhận đã khớp pixel.
- Nhiều biến thể thể hiện kết quả thành công, thiếu dữ liệu, lỗi truy xuất, không có kết quả. Frontend dùng trạng thái từ API và component thông báo chung, không tạo mỗi biến thể thành một trang dữ liệu giả.
- Một số nhóm “01_GOC_A”, “02_GOC_B”, “Group...” chưa có tên chức năng rõ ràng; không thể kết luận bản nào là thiết kế cuối chỉ từ tên. Chọn màn có tên nghiệp vụ rõ để làm cơ sở.
- `1:4048` có vùng trống lớn và chữ bị xuống dòng dọc ngoài khung chính trong ảnh tham chiếu. Dùng nội dung lịch trong khung chính làm đối chiếu; phần dư này không phải chức năng.
- Lịch mẫu có lớp người lớn và ca vào Thứ 6, mâu thuẫn phạm vi 5–15 tuổi/BR-UC7-04. Không thêm lớp người lớn hay bỏ kiểm tra nghỉ Thứ 6 theo dữ liệu mẫu trên ảnh.
- Ngày trong ảnh như “Thứ Ba, 03/10/2026” chỉ là nội dung mẫu. Ngày hiển thị trong phần mềm lấy từ dữ liệu thật và múi giờ Việt Nam.
- Một số chữ Figma nhỏ hơn 14px. Thông tin nghiệp vụ chính dùng từ 14px; một số chi tiết thương hiệu giữ cỡ nhỏ theo Figma. Cần đối chiếu/duyệt điểm khác biệt này khi nghiệm thu giao diện.
- SVG được tải về dự án; không dùng ảnh chụp toàn màn hình để thay giao diện và không dùng URL Figma tạm ở runtime.

## Chưa chốt

- Đã xác nhận và triển khai: lịch mới từ ngày Trợ lý chọn, giữ nguyên lịch sử; ca tương lai có học thử/nghỉ/học bù/điểm danh phải rà soát trước. Số buổi tháng đã trả phí được tính lại và giữ số đã dùng; không chấp nhận tổng mới nhỏ hơn số đã dùng.
- Người dùng xác nhận giữ bản chạy cục bộ để kiểm thử; cloud triển khai sau khi có yêu cầu/cấu hình riêng.
- Cách theo dõi học viên học nhiều lớp đồng thời trong khi BR-UC7-08 chỉ xếp lớp cho hồ sơ “Chờ xếp lớp”. Mã hiện theo BR-UC7-08; chưa tự mở rộng sang ghi danh bổ sung cho hồ sơ “Đang học”.
