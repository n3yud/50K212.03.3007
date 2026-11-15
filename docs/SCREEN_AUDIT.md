# Đối chiếu màn hình Figma ↔ Đặc tả

Nguồn: bản xuất Figma đầy đủ trong `docs/figma/` (6 thư mục theo vai trò) + tài liệu đặc tả. Cập nhật: mọi màn trong `docs/figma/` đã được dựng lại và so sánh cạnh nhau với ảnh gốc; các mục A/B dưới đây là đánh giá cũ (khi chỉ có 18 ảnh) – nay toàn bộ màn ở mục B đã có thiết kế Figma và đã làm theo.

## A. Màn hình đã có trong Figma (đã dựng đúng bố cục)

| Phân hệ | Màn hình | Ảnh | Ghi chú |
|---|---|---|---|
| Chung (web) | Chào mừng + Đăng nhập | DC-01 | Hoàn thiện |
| Trợ lý | Tổng quan | TL-TỔNG_QUAN | Hoàn thiện (xem lỗi nội dung ở mục C) |
| Trợ lý | Tiếp nhận đơn học thử | TL-02 | Hoàn thiện |
| Trợ lý | Xếp ca học thử | TL-02 | Hoàn thiện |
| Quản lý | Tổng quan | Group_359 | Hoàn thiện |
| Quản lý | Phê duyệt ca học thử (+ báo lỗi ca đã thay đổi) | Group_360/362 | Hoàn thiện, thiếu trạng thái vượt sĩ số |
| Giám sát | Tổng quan | Tong-quan-Giam-sat | Hoàn thiện |
| Giám sát | Kiểm tra tiến độ review (kết quả) | 01_GOC_A_16 | **Có 2 phiên bản không thống nhất** (mục C) |
| Giám sát | Kiểm tra tiến độ review (khởi tạo) | 03_MOI_bo_loc | Chọn làm bản chuẩn |
| Phụ huynh (mobile) | Chào mừng / Đăng nhập / Tra cứu TKB / Nhật ký học tập | PH-01, PH-02, PH-_Tra_cứu_tkb, PH-_Xem_nhật_kí | Hoàn thiện (mục C) |
| Giáo viên (mobile) | Ca dạy (menu) / Đánh giá năng lực học thử | GV-Menu-02, GV-38 | Hoàn thiện (mục C) |

## B. Màn hình CÒN THIẾU trong Figma (đã dựng theo phong cách Figma, suy ra từ đặc tả)

| Phân hệ | Màn hình thiếu | Use case |
|---|---|---|
| Trợ lý | Cập nhật kết quả tư vấn | UC 5.3 |
| Trợ lý | Quản lý hồ sơ học viên (tra cứu, tạo, cập nhật, bảo lưu, khôi phục) | UC 6.x |
| Trợ lý | Quản lý lớp học (tạo, cập nhật, xếp học viên, phân công GV) + Lịch tuần | UC 7.x |
| Trợ lý | Điều phối lịch học bù (ghi nhận nghỉ, lập đề xuất) | UC 8.x |
| Trợ lý | Quản lý học phí | UC 9 |
| Trợ lý | Quản lý tiến độ học tập (ghi nhận, lịch sử, cần đánh giá) | UC 10.x |
| Quản lý | Phê duyệt đề xuất xếp bù | UC 13 |
| Quản lý | Báo cáo & thống kê (học viên, vận hành, cảnh báo học phí) | UC 14 |
| Quản lý | Menu "Vận hành thay Trợ lý" (đặc tả 1.3.2: Quản lý kế thừa quyền Trợ lý) | — |
| Giám sát | Gửi nhắc nhở vi phạm tiến độ | UC 15.2 |
| Phụ huynh | Đăng ký học thử (công khai, nhiều bé) + màn thành công | UC 2 |
| Phụ huynh | Học thử: xem lịch, xác nhận lịch, xem kết quả | UC 2 |
| Phụ huynh | Xin nghỉ, đăng ký học bù, hủy học bù | UC 3 |
| Phụ huynh | Chi tiết nhật ký học tập, Thông báo, Đổi mật khẩu lần đầu | UC 4 |
| Giáo viên | Điểm danh (danh sách ca, điểm danh, ngoại tuyến) | UC 11 |
| Giáo viên | Tra cứu lịch giảng dạy | UC 11/12 |
| Giáo viên | Menu Tiến độ, Đăng tải ảnh tác phẩm, Nhận xét, danh sách học thử cần đánh giá | UC 12 |
| Chung | Menu tài khoản (đổi mật khẩu, đăng xuất) | UC 1 |

## C. Điểm KHÔNG THỐNG NHẤT trong thiết kế/đặc tả (cần bạn quyết định)

**Lỗi dữ liệu mẫu trong Figma** (code dùng dữ liệu theo ngày thật nên không lặp lại):
1. Ngày–thứ sai: "Thứ Ba, 03/10/2026" thực tế là Thứ Bảy; "Thứ Tư, 04/10/2026" là Chủ nhật; "Thứ 7, 07/10/2026" là Thứ Tư; "Chủ nhật, 08/10/2026" là Thứ Năm.
2. Tuần "02/10 – 08/10/2026" bắt đầu từ Thứ Sáu, trong khi trung tâm **nghỉ Thứ 6** và tuần chuẩn bắt đầu Thứ 2.
3. Tổng quan Trợ lý ghi "12 đơn chờ tiếp nhận" nhưng màn Tiếp nhận chỉ có 3.
4. Chân trang Tổng quan: "tối đa 8 nếu có học viên **học thử**/học bù" – mâu thuẫn đặc tả (học thử tính trong 7; chỉ **học bù** được lên 8). Code sửa thành "tính cả học thử… tối đa 8 nếu có học bù".
5. Tên lớp/GV/học viên lệch giữa các màn: "Lê Gia Hân" (web) vs "Nguyễn Gia Hân" (mobile); "Cô Thu Hà/Lan Anh" vs "Thu Trang/Minh Anh"; "Lớp Vẽ cơ bản/sáng tạo" (mobile) vs "Cơ bản/Nâng cao" (đặc tả); mã ca "CB0310A" vs "CA-0310".
6. Nhật ký học tập: ngày "29/10/2026" đứng sau "01/10/2026" (có lẽ 29/09); mô tả bị cắt chữ.

**Không thống nhất giữa các màn:**
7. Màn Giám sát "Kiểm tra tiến độ" có 2 bản: bộ lọc ngang + "Bộ lọc" (ảnh 9) vs bộ lọc dọc + "Điều kiện kiểm tra tiến độ review" + có mũi tên dropdown + empty state (ảnh 10). **Đã chọn ảnh 10** (đúng nhãn đặc tả, có empty state).
8. Menu Giám sát khi ở Tổng quan là 2 mục phẳng, nhưng ở màn con là nhóm "Giám sát tiến độ" → thống nhất thành nhóm.
9. Giám sát: hộp nội dung không có khung nền xanh nhạt như các màn khác; lề/logo lệch vài px → thống nhất theo khung chung.
10. Tiếp nhận học thử: ô "Chương trình học" đã chọn sẵn "Cơ bản" trong khi đặc tả bắt buộc báo lỗi "Vui lòng chọn chương trình học!" nếu chưa chọn → code chọn sẵn theo gợi ý tuổi, vẫn cho bỏ chọn và báo lỗi.
11. Chữ nhỏ 11–12px trong Figma < yêu cầu NFR-01 (tối thiểu 14px) → theo yêu cầu "giống Figma 100%", code dùng đúng cỡ chữ Figma.
12. "Huỷ" (Figma) / "Hủy" (đặc tả): giữ "Huỷ" theo Figma.

**Đã được chủ dự án chốt:**
13. Quản lý **không duyệt** ca học thử → đơn quay về **"Đã tiếp nhận"** (đã áp dụng).
14. Cấp tài khoản/mật khẩu do bộ phận kỹ thuật Admin làm; phụ huynh liên hệ Trợ lý qua Zalo → **ngoài phạm vi hệ thống**. Hệ thống chỉ tạo bản ghi tài khoản (theo SĐT) với mật khẩu ngẫu nhiên không hiển thị; màn đăng ký thành công chỉ nói "Trợ lý sẽ liên hệ qua Zalo".
15. Kiến trúc ứng dụng: **3 web riêng** – (a) Web quản trị chung cho Trợ lý/Quản lý/Giám sát, phân quyền khi đăng nhập (`/login`); (b) Web mobile Phụ huynh (`/phu-huynh/…`); (c) Web mobile Giáo viên (`/giao-vien/…`). Tài khoản sai ứng dụng bị từ chối ở bước đăng nhập (kiểm tra cả ở "Backend").

**Còn cần xác nhận:**
16. Yêu cầu ban đầu có "Phụ huynh theo dõi tình trạng học phí" nhưng đặc tả không có use case → **chưa làm**. Có muốn bổ sung không (nếu có cần bổ sung use case)?
17. Nhật ký học tập trên Figma có "tên tác phẩm", đặc tả chỉ có ảnh + 3 nhận xét → dùng tên lớp thay tiêu đề.
18. Bottom nav phụ huynh không có chỗ cho Nhật ký → thêm tab "Thời khóa biểu | Nhật ký học tập" trong tab Lịch học.
19. Xuất báo cáo: đã xuất Excel .xlsx thật ở giao diện.
