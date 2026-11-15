# Tài khoản kiểm thử (dữ liệu giả lập, mật khẩu chung `Nhanho@123`)

Ba ứng dụng riêng, mỗi tài khoản chỉ đăng nhập được đúng ứng dụng của mình.

| Vai trò | Tài khoản | Mật khẩu | Địa chỉ đăng nhập |
|---|---|---|---|
| Trợ lý | `thanhnhi` | Nhanho@123 | /login |
| Quản lý | `minhchau` | Nhanho@123 | /login |
| Giám sát (Thái Bảo) | `thaibao` | Nhanho@123 | /login |
| Giáo viên | `myduyen`, `baochau`, `quynh`, `thuha`, `minhkhoa`, `lananh` | Nhanho@123 | /giao-vien/welcome |
| Phụ huynh (2 bé: Gia Hân, Minh Khôi) | `0901234567` | Nhanho@123 | /phu-huynh/welcome |
| Phụ huynh mới (bắt đổi mật khẩu lần đầu) | `0912345678` | `345678` | /phu-huynh/login |
| Tài khoản bị khóa | `khoa.tk` | Nhanho@123 | thử thông báo khóa |

Phụ huynh đăng ký học thử mới trên hệ thống sẽ có tài khoản mật khẩu ngẫu nhiên; bộ phận Admin cấp mật khẩu ngoài hệ thống (không thử đăng nhập được trong bản giả lập).

Lưu ý: giáo viên chỉ có ca vào Thứ 2–7/CN theo lịch lớp nên một số ngày danh sách điểm danh sẽ trống (ví dụ `myduyen` dạy Thứ 3 & Thứ 4).
Chế độ giả lập: xóa dữ liệu bằng (gõ `localStorage.clear()` trong console rồi tải lại) để khôi phục dữ liệu mẫu.


Khi chạy với SQL Server thật: các tài khoản trên được tạo bởi `database/02_seed.sql` (cùng mật khẩu). Để nạp lại dữ liệu mẫu, chạy lại 01_schema.sql rồi 02_seed.sql.
