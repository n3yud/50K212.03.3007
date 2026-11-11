# API

Base path `/api`; JSON camelCase, Guid cho ID, ngày `yyyy-MM-dd`, tháng `yyyy-MM`, giờ `HH:mm:ss`. Cookie đăng nhập dùng chung origin. 400: dữ liệu/quy tắc; 401: chưa đăng nhập; 403: sai quyền; 404: không có dữ liệu trong phạm vi; 409: xung đột thao tác. Thông báo lỗi trả `{ "message": "..." }`.

`Vận hành` = Trợ lý hoặc Quản lý. Quản lý kế thừa nghiệp vụ Trợ lý nhưng chỉ Quản lý được duyệt và xem báo cáo điều hành.

| Nhóm | Endpoint | Quyền / chức năng |
| --- | --- | --- |
| Đăng nhập | POST `/auth/login` | Công khai; login/password |
| Tài khoản | GET `/auth/me`, POST `/auth/password`, POST `/auth/logout` | Tài khoản đã đăng nhập; currentPassword/newPassword |
| Hỗ trợ | POST `/support/parent-password` | Vận hành; phone/identityVerified; không cấp mật khẩu nhân viên |
| Cơ sở | GET `/trials/branches` | Công khai; danh sách cơ sở |
| Đăng ký học thử | POST `/trials` | Công khai; phone, children[{name,birthDate,desiredTime}] |
| Danh sách học thử | GET `/trials` | Vận hành/toàn cơ sở, Phụ huynh/con mình, Giáo viên/ca mình |
| Xử lý học thử | POST `/trials/{id}/accept`, `/propose`, `/consult` | Vận hành; propose dùng sessionId; consult dùng roadmap/decision/internalNote |
| Xác nhận học thử | POST `/trials/{id}/confirm` | Phụ huynh sở hữu đơn |
| Duyệt học thử | POST `/trials/{id}/approve` | Quản lý; approve=true/false |
| Đánh giá học thử | POST `/trials/{id}/evaluate` | Giáo viên phụ trách; lines/colors/learning, sau ca có mặt và chốt |
| Hồ sơ | GET `/students?q=&status=`, GET `/students/{id}` | Dữ liệu theo phạm vi tài khoản |
| Ghi hồ sơ | POST `/students`, PUT `/students/{id}` | Vận hành; name/birthDate/gender/parentName/phone/program/trialId |
| Bảo lưu | POST `/students/{id}/archive`, `/restore` | Vận hành; giữ toàn bộ tiến trình |
| Lớp học | GET/POST `/classes`, PUT `/classes/{id}` | Vận hành; name/program/weekday/start/end/capacity/effectiveFrom |
| Giáo viên | GET `/classes/teachers`, POST `/classes/{id}/teacher` | Vận hành; teacherId |
| Xếp lớp | POST `/classes/{id}/enroll` | Vận hành; studentId |
| Tạo ca | POST `/classes/{id}/sessions` | Vận hành; from/to, theo phiên bản lịch có hiệu lực |
| Lịch học | GET `/sessions?from=&to=&studentId=` | Phụ huynh/con mình, Giáo viên/ca mình, Vận hành/cơ sở |
| Danh sách điểm danh | GET `/sessions/{id}/roster` | Giáo viên được phân công |
| Điểm danh | POST `/sessions/{id}/attendance` | Giáo viên; students[{studentId,present}], trials[{trialId,present}], finalize |
| Nghỉ học | GET/POST `/leaves` | Phụ huynh/con mình hoặc Vận hành; studentId/sessionId/reason |
| Ca bù khả dụng | GET `/leaves/{id}/available` | Chủ sở hữu hoặc Vận hành; lọc sĩ số, trình độ, hạn và trùng lịch |
| Giữ chỗ bù | POST `/leaves/{id}/register` | Phụ huynh hoặc Vận hành; sessionId |
| Hủy bù | POST `/leaves/{id}/cancel` | Phụ huynh sở hữu; ca chưa bắt đầu |
| Trình duyệt bù | POST `/leaves/{id}/submit` | Vận hành |
| Duyệt bù | POST `/leaves/{id}/approve` | Quản lý; approve=true/false |
| Học phí | GET `/tuition?month=`, POST `/tuition` | Phụ huynh chỉ đọc của con; Vận hành ghi studentId/month |
| Tiến độ | GET `/progress/{studentId}`, POST `/progress` | Đọc theo phạm vi; ghi bởi Vận hành với sessionId/evaluationDate/status/note |
| Nhận xét | POST `/progress/review` | Giáo viên; studentId/sessionId/lines/colors/learning |
| Cần đánh giá | GET `/progress/needs-evaluation`, `/progress/needs-evaluation/export` | Vận hành; dựa trên bản ghi gần nhất Chậm tiến độ |
| Tác phẩm | POST `/artworks` | Giáo viên; multipart studentId/sessionId/file; JPEG/PNG, tối đa 5MB |
| Xem tác phẩm | GET `/artworks/{id}?thumbnail=true` | Phụ huynh sở hữu, giáo viên phụ trách ca hoặc Vận hành; không public |
| Thông báo | GET `/notifications` | Chỉ thông báo của tài khoản hiện tại |
| Tổng quan | GET `/reports/dashboard` | Vận hành |
| Báo cáo | GET `/reports?from=&to=&threshold=`, `/reports/export` | Quản lý; học viên, chuyên cần, ca học, học bù, cảnh báo phí |
| Giám sát | GET `/supervision?from=&to=`, `/supervision/export` | Giám sát, chỉ ca đã kết thúc |
| Nhắc nhở | POST `/supervision/remind` | Giám sát; sessionIds[], gửi đúng giáo viên/trợ lý còn thiếu cập nhật |
| Health | GET `/health` | Trạng thái tiến trình; không thay cho kiểm tra kết nối SQL |

Ví dụ đăng ký công khai:

```json
{"phone":"0912345678","children":[{"name":"Nguyễn An","birthDate":"2020-03-15","desiredTime":"Thứ 3 và Thứ 5 sau 17 giờ"}]}
```

Các endpoint xuất trả tệp XLSX thực; nội dung ô được ghi dạng text để không thực thi công thức từ dữ liệu nhập.
