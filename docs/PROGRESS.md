# Tiến độ triển khai

Đã có bản chạy cục bộ với React, ASP.NET Core và SQL Server thật. Chưa coi là nghiệm thu đầy đủ mọi điều kiện vận hành hoặc mọi frame Figma. Không dùng dữ liệu minh họa thay cho API/Database.

## Nguồn và đối chiếu

- Đã trích xuất văn bản của 3 tệp DOCX người dùng nêu trong yêu cầu vào `docs/sources`. Hai bản tên tương tự khác trong Downloads cũng đã được trích xuất trong lần đọc đầu; dùng đúng ba bản có tên tương ứng yêu cầu khi đối chiếu.
- Tệp văn bản yêu cầu là chỉ dẫn của người dùng; mẫu “Cho mượn sách”, chỗ trống và hướng dẫn soạn báo cáo trong DOCX là nội dung tài liệu, không phải yêu cầu thêm chức năng.
- Figma: `sZEIksrotgRWObJPLMG3Vm`, trang `0:1`. Đọc metadata thành công qua MCP; trang có màn hình PH/GV/TL/QL/GS và nhiều biến thể thành công, trống, lỗi. Không sửa file Figma.
- Frontend ban đầu chỉ có package.json, index.html, vite.config.js; chưa có UI cũ để ghi đè. Giữ lại Backend đã viết.

## Đã có mã nguồn và kiểm chứng cục bộ

- Đăng nhập cookie HttpOnly, kiểm tra vai trò tại API, đổi mật khẩu lần đầu, kiểm tra tài khoản bị khóa.
- Luồng học thử: đăng ký công khai nhiều bé, tiếp nhận, đề xuất, phụ huynh xác nhận, quản lý duyệt, giáo viên đánh giá, trợ lý tư vấn.
- Hồ sơ: tạo/cập nhật/tra cứu/bảo lưu/khôi phục, lịch sử thay đổi; không có API xóa hồ sơ.
- Lớp: tạo/cập nhật/phân công giáo viên/xếp lớp, tạo ca theo lịch tuần.
- Nghỉ/học bù: trừ buổi tại lúc ghi nghỉ, giữ chỗ, trình duyệt, duyệt/từ chối/hủy/hết hạn; kiểm tra tối đa 2 học viên bù và 8 tổng sĩ số.
- Điểm danh giáo viên, lưu tạm/chốt, kiểm tra phạm vi lớp, phân biệt buổi thường/học bù/học thử.
- Tiến độ, nhận xét, tác phẩm lưu riêng tư; thông báo nội bộ; báo cáo và giám sát.
- Frontend đã có các trang theo vai trò, biểu mẫu/tra cứu/bảng/phân trang/modal, API thật và nhãn Việt/Anh. Dùng tokens CSS, font Inter/Nunito lưu cục bộ, SVG gốc Figma.
- Đổi lịch có ngày hiệu lực, snapshot ca học và phiên bản lịch. Không xóa ca cũ; ca đã qua giữ nguyên. Kiểm tra các ca tương lai có ràng buộc trước khi thay đổi. Tính lại buổi tháng đã trả phí, giữ nguyên số buổi đã dùng theo xác nhận người dùng.
- Điểm danh ngoại tuyến: cache giao diện và danh sách đã mở, lưu nháp theo tài khoản/ca, tự đồng bộ khi có mạng; đã kiểm tra bằng Chrome.
- Build Backend Release không lỗi/cảnh báo; build Frontend thành công. Npm audit sau vá Vite: 0 lỗ hổng tại lúc cài đặt.
- Kiểm thử: 18 domain checks; 18 kiểm tra API cơ bản; 7 kiểm tra sâu qua trước ca thử đồng thời; lỗi đồng thời đã sửa và bài kiểm tra lại qua; 2 kiểm tra trọn vòng đời học thử; 9 bài Playwright qua. Chi tiết ở TESTING.md.

## Quyết định đã xác nhận và dữ liệu còn thiếu

1. Đã xác nhận: hồ sơ mới “Chờ xếp lớp”, chuyển “Đang học” sau khi xếp lớp thành công.
2. Đã xác nhận: khi từ chối ca học thử, trả đơn về “Chờ xếp ca học thử”. Đã bổ sung vào danh mục trạng thái, ràng buộc SQL và luồng xếp ca lại.
3. Số buổi cấp theo các ca thường thực tế của lớp trong tháng và khoảng thời gian ghi danh; không dùng 8–10 buổi trung bình làm định mức. Biểu phí chưa có số tiền: lưu null/hiển thị “Chưa cấu hình”, không tự gán giá; vẫn ghi nhận được trạng thái học phí.
4. Đổi lịch từ ngày hiệu lực Trợ lý chọn và giữ lịch sử. Nếu số ca tháng đã thanh toán đổi, cập nhật tổng/số còn lại nhưng giữ số đã dùng; chặn tổng mới nhỏ hơn số đã dùng.
5. Người dùng chọn giữ ảnh/thông báo cục bộ để kiểm thử, tích hợp cloud sau. Không còn coi cloud là việc phải tự triển khai trong lượt bàn giao cục bộ này.

## Giới hạn kiểm chứng và phần còn lại

- Database NgoiNhaNho đã tạo và áp dụng 3 migration tăng dần. Không chạy rollback/drop/reset. Các kiểm thử ghi nghiệp vụ dùng NgoiNhaNho_Test_20261111_b91a7d riêng, dữ liệu thử được giữ lại.
- Đã có README, kiến trúc, API inventory, script SQL idempotent/seed/backup và tài khoản kiểm thử. Chạy bản mới bằng scripts/start.ps1.
- Mẫu tải 50 yêu cầu đọc đồng thời đã qua với mức lớn nhất khoảng 0,18s ở lượt đo đầu; không suy rộng thành SLA triển khai thật.
- Chưa nghiệm thu toàn bộ frame Figma ở mức pixel và mọi luồng thay thế của từng Use Case. Giao diện dùng component chung có chức năng, không tạo bản sao dữ liệu giả cho từng ảnh trạng thái.
- Chưa cài lịch backup tự động 23:30 hoặc kiểm thử khôi phục; có script backup để cấu hình trên SQL Server.
- Chưa nghiệm thu SLA 99%, Safari, thiết bị di động thực tế và tốc độ upload trên đường truyền triển khai thật.
- Nhãn giao diện có Việt/Anh; nội dung do nhân viên nhập và một số thông báo nghiệp vụ động vẫn giữ ngôn ngữ gốc, cần rà soát dịch tiếp nếu nghiệm thu song ngữ toàn bộ thông báo.

## Tiếp tục

1. Cơ sở cung cấp mức biểu phí Cơ bản/Nâng cao để điền cấu hình thật.
2. Nghiệm thu chi tiết các màn Figma còn lại và các luồng ngoại lệ chưa tự động hóa; xem danh mục docs/figma-frames.json.
3. Chốt mâu thuẫn về học nhiều lớp đồng thời so với điều kiện chỉ xếp lớp khi “Chờ xếp lớp” nếu cần hỗ trợ nghiệp vụ đó.
4. Cấu hình lịch sao lưu, thử khôi phục và hạ tầng cloud khi người dùng yêu cầu bước triển khai tiếp theo.
