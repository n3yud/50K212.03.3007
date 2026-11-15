// Song ngữ Việt / Anh (NFR-05). Tiếng Việt là ngôn ngữ gốc của giao diện; khi chọn "EN",
// lớp dịch này thay chữ hiển thị (nhãn, nút, tiêu đề, gợi ý nhập, thông báo thường gặp) bằng từ điển bên dưới.
// Dữ liệu nghiệp vụ (tên học viên, tên lớp, nhận xét…) giữ nguyên. Ngôn ngữ được nhớ trên máy (localStorage).
const KEY = 'nnn_lang';
export const getLang = () => { try { return localStorage.getItem(KEY) === 'en' ? 'en' : 'vi'; } catch { return 'vi'; } };

const D = {
  // --- chung ---
  'Huỷ': 'Cancel', 'Hủy': 'Cancel', 'Lưu': 'Save', 'Đóng': 'Close', 'Quay lại': 'Back', 'Thử lại': 'Try again', 'Tìm kiếm': 'Search', 'Tất cả': 'All',
  'Xác nhận': 'Confirm', 'Chỉnh sửa': 'Edit', 'Xóa': 'Delete', 'Chi tiết': 'Details', 'Xem chi tiết': 'View details', 'Kiểm tra': 'Check', 'Trước': 'Previous', 'Sau': 'Next',
  'Trang trước': 'Previous page', 'Trang sau': 'Next page', 'Đang tải…': 'Loading…', 'Thông báo': 'Notifications', 'Thành công': 'Success', 'Ghi chú': 'Note', 'Nhập ghi chú': 'Enter a note',
  'Hôm nay': 'Today', 'Tuần này': 'This week', 'Tháng này': 'This month', 'Tuần': 'Week', 'Tháng': 'Month', 'Tùy chọn': 'Custom', 'Tuần trước': 'Previous week', 'Tuần sau': 'Next week',
  'Từ ngày': 'From', 'Đến ngày': 'To', 'Khoảng thời gian': 'Time range', 'Giờ': 'Time', 'Thứ': 'Weekday', 'Ngày học': 'Session date', 'Lịch': 'Schedule',
  'Trạng thái': 'Status', 'Trạng thái:': 'Status:', 'Tất cả trạng thái': 'All statuses', 'Mới nhất': 'Latest', 'Xuất Excel': 'Export Excel', 'Xuất báo cáo': 'Export report',
  'Điều hướng chính': 'Main navigation', 'Tài khoản': 'Account', 'Đổi mật khẩu': 'Change password', 'Đăng xuất': 'Log out', 'Trang chủ': 'Home', 'Tổng quan': 'Overview',
  'HỆ THỐNG QUẢN LÝ LỚP VẼ': 'ART CLASS MANAGEMENT SYSTEM', 'Ngôi nhà nhỏ': 'Little House', 'Ngôi Nhà Nhỏ': 'Little House', 'NGÔI NHÀ NHỎ': 'LITTLE HOUSE', 'LỚP VẼ': 'ART CLASS', 'LỚP VẼ NGÔI NHÀ NHỎ': 'LITTLE HOUSE ART CLASS',
  'GIÁO VIÊN': 'TEACHER', 'PHỤ HUYNH': 'PARENT', 'Trợ lý': 'Assistant', 'Quản lý': 'Manager', 'Giám sát': 'Supervisor', 'Giáo viên': 'Teacher', 'Phụ huynh': 'Parent',
  'Hiện tại đang có sự cố, vui lòng thử lại sau': 'Something went wrong, please try again later', 'Hiện tại đang có sự cố. Vui lòng thử lại sau': 'Something went wrong. Please try again later',
  'Hiện tại đang có sự cố. Vui lòng thử lại sau.': 'Something went wrong. Please try again later.', 'Hiện tại đang có sự cố, ba mẹ đợi Ngôi Nhà Nhỏ một xíu nhé!': 'Something went wrong, please give Little House a moment!',
  'Vui lòng điền đầy đủ thông tin!': 'Please fill in all required information!', 'Thông tin không hợp lệ. Vui lòng kiểm tra lại!': 'Invalid information. Please check again!',
  'Vui lòng nhập đầy đủ và đúng thông tin!': 'Please enter complete and valid information!', 'Bạn không có quyền thực hiện thao tác này.': 'You do not have permission to do this.',
  // --- đăng nhập ---
  'Đăng nhập': 'Log in', 'Mật khẩu': 'Password', 'Nhập mật khẩu': 'Enter password', 'Nhập thông tin': 'Enter information', 'Quên mật khẩu?': 'Forgot password?', 'Quên mật khẩu': 'Forgot password',
  'Đã hiểu': 'Got it', 'Chào mừng đến với': 'Welcome to', 'Hệ thống quản lý lớp vẽ': 'Art class management system', 'Mật khẩu mới': 'New password', 'Nhập lại mật khẩu mới': 'Re-enter new password',
  'Mật khẩu tạm': 'Temporary password', 'Mật khẩu hiện tại': 'Current password', 'Đổi mật khẩu lần đầu': 'First-time password change', 'Dành cho tài khoản phụ huynh mới': 'For new parent accounts',
  'Dành cho tài khoản mới': 'For new accounts', 'Cập nhật mật khẩu đăng nhập': 'Update your login password', 'Bảo vệ tài khoản của ba mẹ': "Protect your account", 'Bảo vệ tài khoản của bạn': 'Protect your account',
  'Vui lòng thay mật khẩu tạm trước khi sử dụng': 'Please replace the temporary password before continuing', 'Nơi mỗi nét vẽ là một niềm vui': 'Where every stroke is a joy',
  'Chào mừng ba mẹ!': 'Welcome, parents!', 'Chào mừng thầy cô!': 'Welcome, teachers!', 'Cùng bé khám phá thế giới sắc màu qua những buổi học vẽ thật vui': 'Explore a world of colour with your child through fun art lessons',
  'Đăng ký học thử ngay': 'Book a trial lesson', 'Đã có tài khoản?': 'Already have an account?', 'Đăng nhập tại đây': 'Log in here', 'Tài khoản chưa liên kết': 'Account not linked',
  'Tên đăng nhập hoặc mật khẩu không chính xác. Vui lòng thử lại!': 'Incorrect username or password. Please try again!', 'Tài khoản đã bị khóa. Vui lòng liên hệ bộ phận hỗ trợ': 'This account is locked. Please contact support',
  'Vui lòng liên hệ bộ phận Admin để được hỗ trợ cấp lại mật khẩu': 'Please contact the Admin team to have your password reset', 'Vui lòng liên hệ Trợ lý để được hỗ trợ cấp lại mật khẩu': 'Please contact the Assistant to have your password reset',
  // --- menu quản trị ---
  'Học thử': 'Trial lessons', 'Tiếp nhận đơn học thử': 'Receive trial requests', 'Xếp ca học thử': 'Schedule trial sessions', 'Cập nhật kết quả tư vấn': 'Update consultation results',
  'Hồ sơ học viên': 'Student records', 'Tạo mới hồ sơ học viên': 'Create student record', 'Cập nhật hồ sơ học viên': 'Update student record', 'Tra cứu hồ sơ học viên': 'Look up student records',
  'Bảo lưu hồ sơ học viên': 'Suspend student record', 'Khôi phục hồ sơ học viên': 'Restore student record', 'Khôi phục hồ sơ': 'Restore record', 'Quản lý lớp học': 'Class management',
  'Tạo lớp học mới': 'Create new class', 'Cập nhật thông tin lớp': 'Update class information', 'Xếp học viên vào lớp': 'Assign students to classes', 'Phân công giáo viên phụ trách': 'Assign teachers',
  'Điều phối lịch học bù': 'Make-up coordination', 'Ghi nhận lịch nghỉ': 'Record absences', 'Lập đề xuất ca học bù': 'Propose make-up sessions', 'Quản lý học phí': 'Tuition management',
  'Ghi nhận học phí': 'Record tuition', 'Tra cứu tình trạng học phí': 'Look up tuition status', 'Quản lý tiến độ học tập': 'Learning progress', 'Ghi nhận tiến độ học viên': 'Record student progress',
  'Tra cứu lịch sử tiến độ': 'Progress history', 'Lập danh sách học viên cần đánh giá': 'Students due for review', 'Phê duyệt ca học thử': 'Approve trial sessions', 'Phê duyệt đề xuất xếp bù': 'Approve make-up proposals',
  'Báo cáo thống kê': 'Reports', 'Thống kê tình hình học viên': 'Student statistics', 'Báo cáo vận hành lớp học': 'Class operations report', 'Báo cáo cảnh báo học phí': 'Tuition alert report',
  'Vận hành thay Trợ lý': 'Operate as Assistant', 'Giám sát tiến độ': 'Progress monitoring', 'Kiểm tra tiến độ review của giáo viên': "Check teachers' review progress", 'Gửi nhắc nhở vi phạm tiến độ': 'Send progress reminders',
  // --- học viên / lớp ---
  'Học viên': 'Student', 'Mã học viên': 'Student ID', 'Mã học viên:': 'Student ID:', 'Họ tên học viên': 'Student name', 'Ngày sinh': 'Date of birth', 'Giới tính': 'Gender', 'Chọn giới tính': 'Select gender', 'Nam': 'Male', 'Nữ': 'Female',
  'Họ tên phụ huynh': 'Parent name', 'Nhập họ tên phụ huynh': 'Enter parent name', 'Số điện thoại phụ huynh': 'Parent phone number', 'Thông tin phụ huynh': 'Parent information', 'Thông tin học viên': 'Student information',
  'Chương trình học': 'Programme', 'Chương trình học:': 'Programme:', 'Chương trình': 'Programme', 'Chọn chương trình học': 'Select programme', 'Chọn chương trình': 'Select programme', 'Tất cả chương trình': 'All programmes',
  'Cơ bản': 'Basic', 'Nâng cao': 'Advanced', 'Trạng thái hồ sơ': 'Record status', 'Trạng thái hồ sơ:': 'Record status:', 'Trạng thái học viên': 'Student status', 'Trạng thái hiện tại:': 'Current status:',
  'Đang học': 'Studying', 'Chờ xếp lớp': 'Awaiting class', 'Đã bảo lưu': 'Suspended', 'Bảo lưu': 'Suspend', 'Khôi phục': 'Restore', 'Tìm kiếm học viên': 'Search students', 'Tìm kiếm học viên...': 'Search students...',
  'Nhập họ tên học viên': 'Enter student name', 'Nhập họ tên': 'Enter full name', 'Chọn học viên': 'Select student', 'Chọn học viên...': 'Select student...', 'Danh sách học viên': 'Student list',
  'Chi tiết hồ sơ học viên': 'Student record details', 'Tiến trình học tập': 'Learning progress', 'Số buổi học còn lại': 'Remaining sessions', 'Số buổi còn lại:': 'Remaining sessions:', 'Buổi còn lại': 'Remaining',
  'Tìm kiếm hồ sơ học viên': 'Search student records', 'Nhập tìm kiếm': 'Enter search', 'Danh sách hồ sơ học viên phù hợp': 'Matching student records', 'Không tìm thấy hồ sơ học viên': 'No student record found',
  'Không tìm thấy hồ sơ học viên phù hợp': 'No matching student record found', 'Quay lại danh sách': 'Back to list', 'Quay về danh sách': 'Back to list', 'Lịch sử cập nhật': 'Change history',
  'Chọn hồ sơ để cập nhật thông tin': 'Select a record to update', 'Chỉnh sửa hồ sơ học viên': 'Edit student record', 'Tiến trình trước bảo lưu': 'Progress before suspension', 'Chọn đơn học thử': 'Select trial request',
  'Tạo hồ sơ học viên': 'Create student record', '+ Tạo mới hồ sơ học viên': '+ Create student record', 'Tìm bằng SĐT / mã / tên': 'Search by phone / ID / name',
  'Nhập SĐT, mã học viên hoặc họ tên': 'Enter phone, student ID or name', 'Nhập SĐT phụ huynh, mã học viên hoặc họ tên': 'Enter parent phone, student ID or name', 'Nhập mã học viên, họ tên hoặc SĐT...': 'Enter student ID, name or phone...',
  'Lớp học': 'Class', 'Lớp': 'Class', 'Tên lớp': 'Class name', 'Nhập tên lớp': 'Enter class name', 'Danh sách lớp học': 'Class list', 'Tất cả lớp học': 'All classes', 'Ca học': 'Session', 'Mã ca học': 'Session code',
  'Sĩ số tối đa': 'Maximum size', 'Nhập sĩ số tối đa': 'Enter maximum size', 'Thời khóa biểu tuần': 'Weekly timetable', 'Ngày - giờ học': 'Day - time', 'Thứ trong tuần': 'Day of week', 'Chọn thứ': 'Select day',
  'Giờ bắt đầu': 'Start time', 'Giờ kết thúc': 'End time', 'Tất cả các thứ': 'All days', 'Chọn lịch học': 'Select schedule', 'Lưu lớp học': 'Save class', 'Chọn lớp học': 'Select class', 'Lịch học': 'Schedule',
  'Chọn học viên chờ xếp lớp': 'Select a student awaiting a class', 'Học viên chờ xếp lớp': 'Students awaiting a class', 'Chọn lớp học phù hợp còn chỗ': 'Select a suitable class with free places', 'Chọn lớp học phù hợp': 'Select a suitable class',
  'Lớp học hiện chưa có học viên': 'This class has no students yet', 'Hiện chưa có lớp học nào': 'There are no classes yet', 'Còn chỗ': 'Places available', 'Đã đủ sĩ số': 'Full', 'Trùng lịch học': 'Schedule clash',
  'Chọn lớp học và phân công giáo viên giảng dạy': 'Select a class and assign a teacher', 'Chọn lớp học cần phân công': 'Select a class to assign', 'Chọn lớp học cần phân công giáo viên': 'Select a class to assign a teacher',
  'Chưa phân công': 'Unassigned', 'Chọn giáo viên và kiểm tra lịch dạy': "Select a teacher and check their schedule", 'Trùng lịch dạy': 'Teaching clash', 'Khả dụng': 'Available', 'Lưu phân công': 'Save assignment',
  'Phân công giáo viên': 'Assign teacher', 'Phân công': 'Assign', 'Giáo viên phụ trách': 'Teacher in charge', 'Tất cả giáo viên': 'All teachers', 'Lịch dạy giáo viên': 'Teacher schedule',
  'Danh sách giáo viên và lịch dạy': 'Teachers and schedules', 'Lớp học và giáo viên phụ trách': 'Class and teacher', 'Lớp học vừa tạo': 'Newly created class', 'Thông tin lớp học mới': 'New class information',
  'Thông tin lớp học sau cập nhật': 'Updated class information', 'Lịch học lớp vừa xếp': 'Schedule of the assigned class', 'Thông tin xếp lớp': 'Class assignment', 'Quay về lớp học': 'Back to classes', 'Không thể chọn': 'Unavailable',
  'Ví dụ: Cơ bản - Thế giới màu sắc': 'E.g. Basic - World of colours', 'Lớp người lớn': 'Adult class', 'Trẻ em': 'Children', 'Xem lịch tuần': 'View week', 'Lịch ca học trong tuần': 'Sessions this week',
  // --- học thử ---
  'Đăng ký học thử': 'Book a trial', 'Lịch học thử': 'Trial schedule', 'Chờ xếp ca': 'Awaiting session', 'Chi tiết lịch học thử': 'Trial schedule details', 'Thông tin đơn đăng ký': 'Request information',
  'Chi tiết đơn đăng ký': 'Request details', 'Chọn một đơn ở danh sách bên trái': 'Select a request from the list on the left', 'Tiếp nhận': 'Accept', 'Đề xuất ca học thử': 'Propose trial session',
  'Ca học thử phù hợp (cùng chương trình học, còn chỗ)': 'Suitable trial sessions (same programme, places available)', 'Chưa có học viên cần cập nhật': 'No students to update', 'Kết quả tư vấn sau buổi học thử': 'Consultation result after the trial',
  'Đánh giá của giáo viên (chỉ xem)': "Teacher's assessment (read-only)", 'Quyết định của phụ huynh': "Parent's decision", 'Lộ trình đề xuất': 'Proposed learning path', 'Nhập lộ trình đề xuất cho học viên...': 'Enter a proposed learning path...',
  'Đơn học thử chờ tiếp nhận': 'Trial requests awaiting acceptance', 'Ca học thử chờ phê duyệt': 'Trial sessions awaiting approval', 'Chi tiết ca học thử': 'Trial session details', 'Danh sách học viên học thử': 'Trial students',
  'Sĩ số hiện tại (tính cả học viên học thử)': 'Current size (including trial students)', 'Kết quả kiểm tra sĩ số': 'Size check result', 'Không duyệt ca học thử?': 'Reject trial session?',
  'Chọn một ca học thử ở danh sách bên trái': 'Select a trial session from the list on the left', 'Các đơn trong ca này sẽ quay về trạng thái': 'Requests in this session will return to', 'Đã tiếp nhận': 'Accepted',
  'để Trợ lý đề xuất ca khác.': 'so the Assistant can propose another session.', 'Xác nhận lịch': 'Confirm schedule', 'Đăng ký': 'Register', 'Đã hoàn thành': 'Completed', 'Đã tư vấn': 'Consulted', 'Đã xếp ca': 'Scheduled',
  'Đánh giá năng lực': 'Ability assessment', 'Nét vẽ': 'Line work', 'Màu sắc': 'Colour', 'Khả năng tiếp thu': 'Learning ability', 'Chưa đánh giá': 'Not assessed',
  // --- học bù ---
  'Xin nghỉ': 'Leave', 'Lý do nghỉ': 'Reason', 'Lý do nghỉ (tùy chọn)': 'Reason (optional)', 'Nhập lý do nghỉ (tùy chọn)': 'Enter a reason (optional)', 'Nhập lý do nghỉ của học viên...': "Enter the student's reason...",
  'Ghi nhận lịch nghỉ của học viên': 'Record student absence', 'Chọn học viên để ghi nhận lịch nghỉ': 'Select a student to record an absence', 'Ca học có thể ghi nhận nghỉ': 'Sessions that can be recorded',
  'Học viên hiện không có ca học nào để ghi nhận nghỉ': 'This student has no sessions to record', 'Chọn một học viên ở danh sách bên trái': 'Select a student from the list on the left', 'Chọn ca học cần ghi nhận nghỉ': 'Select the session to record',
  'Vắng chưa ghi nhận': 'Absent, not recorded', 'Chưa diễn ra': 'Upcoming', 'Lưu ghi nhận nghỉ': 'Save absence', 'Lập đề xuất xếp lịch học bù': 'Propose a make-up session', 'Hiện không có yêu cầu học bù nào cần xử lý': 'No make-up requests to handle',
  'Chi tiết yêu cầu học bù': 'Make-up request details', 'Hiện chưa có ca học bù phù hợp trong hạn học bù': 'No suitable make-up sessions before the deadline', 'Yêu cầu vẫn ở trạng thái “Chờ xếp lịch bù”': 'The request stays “Awaiting make-up”',
  'Chọn ca này': 'Choose this session', 'Yêu cầu xin nghỉ': 'Leave request', 'Ca xin nghỉ': 'Missed session', 'Ca học bù': 'Make-up session', 'Sĩ số hiện tại': 'Current size', 'Trình duyệt': 'Submit for approval',
  'Chọn một yêu cầu ở danh sách bên trái': 'Select a request from the list on the left', 'Chọn ca học bù phù hợp còn chỗ': 'Select a suitable make-up session with places', 'Chọn ca bù': 'Select make-up session', 'Trình Quản lý duyệt': 'Send to Manager',
  'Đề xuất xếp bù chờ phê duyệt': 'Make-up proposals awaiting approval', 'Chi tiết đề xuất xếp bù': 'Make-up proposal details', 'Sĩ số ca bù (tính cả học bù)': 'Make-up session size (including make-ups)',
  'Không duyệt đề xuất?': 'Reject proposal?', 'Chọn một đề xuất ở danh sách bên trái': 'Select a proposal from the list on the left', 'Yêu cầu sẽ quay về': 'The request will return to', 'Chờ xếp lịch bù': 'Awaiting make-up',
  'và chỗ đã giữ được trả lại.': 'and the held place will be released.', 'Chờ duyệt': 'Pending approval', 'Không duyệt': 'Reject', 'Phê duyệt': 'Approve', 'Hạn học bù': 'Make-up deadline', 'Ca học bù đã đăng ký': 'Registered make-up session',
  'Đã xếp lịch bù': 'Make-up scheduled', 'Đã đăng ký học bù': 'Make-up registered', 'Hết hạn': 'Expired',
  // --- học phí / tiến độ ---
  'Trạng thái học phí': 'Tuition status', 'Trạng thái học phí:': 'Tuition status:', 'Đã thanh toán': 'Paid', 'Chưa thanh toán': 'Unpaid', 'Tháng thu học phí': 'Tuition month', 'Ghi nhận học phí học viên': 'Record student tuition',
  'Hình thức thanh toán': 'Payment method', 'Đã hoàn tất': 'Completed', 'Xác nhận nộp học phí': 'Confirm tuition payment', 'Xác nhận học viên': 'Confirm student', 'Số tiền thu:': 'Amount:', 'Kỳ học phí:': 'Tuition period:',
  'Kết quả ghi nhận học phí': 'Tuition record result', 'Thông tin học phí của học viên': 'Student tuition information', 'Ghi nhận tình trạng học phí theo tháng': 'Record monthly tuition status', 'Biểu phí': 'Fee schedule',
  'Danh sách kết quả tra cứu học phí': 'Tuition search results', 'Học phí cần nhắc': 'Tuition reminders', 'Cảnh báo học phí': 'Tuition alerts', 'Danh sách cảnh báo học phí': 'Tuition alert list', 'Học viên thuộc diện cảnh báo học phí': 'Students with tuition alerts',
  'Ngưỡng cảnh báo số buổi còn lại (N)': 'Alert threshold for remaining sessions (N)', 'Xem cảnh báo': 'View alerts', 'Tình trạng tiến độ': 'Progress status', 'Trạng thái tiến độ': 'Progress status', 'Chọn trạng thái': 'Select status',
  'Ngày đánh giá': 'Assessment date', 'Ghi nhận tiến độ': 'Record progress', 'Chọn ca học cần ghi nhận': 'Select the session to record', 'Lưu ghi nhận tiến độ': 'Save progress', 'Xem lịch sử': 'View history', 'Lọc danh sách': 'Filter list',
  'Nhập mã học viên hoặc họ tên...': 'Enter student ID or name...', 'Nhập họ tên hoặc mã học viên...': 'Enter name or student ID...', 'Thông tin tiến độ đã lưu': 'Saved progress', 'Ghi nhận tiến độ sau đánh giá của giáo viên': "Record progress after the teacher's assessment",
  'Chọn tình trạng tiến độ': 'Select progress status', 'Danh sách học viên đang học': 'Current students', 'Nhập học viên': 'Enter student', 'Chi tiết lịch sử tiến độ': 'Progress history details', 'Danh sách kết quả': 'Results',
  'Bộ lọc học viên chậm tiến độ': 'Filter for students behind schedule', 'Lập danh sách': 'Build list', 'Tiến độ cần cập nhật': 'Progress to update', 'Đạt': 'On track', 'Chưa đạt': 'Behind', 'Cần theo dõi': 'Needs attention',
  // --- báo cáo / tổng quan ---
  'Việc cần phê duyệt': 'Items to approve', 'Tình hình học viên': 'Student overview', 'Học viên mới tính theo tuần': 'New students per week', 'Vận hành lớp học': 'Class operations', 'Báo cáo tình hình học viên': 'Student report',
  'Học viên theo tuần trong tháng': 'Students per week', 'Khoảng thời gian và bộ lọc': 'Time range and filters', 'Lớp học/Ca học': 'Class/Session', 'So sánh tỷ lệ chuyên cần giữa các ca': 'Attendance rate by session',
  'Thống kê': 'Show statistics', 'Xem báo cáo': 'View report', 'Tổng số học viên': 'Total students', 'Kết quả xử lý': 'Result', 'Kết quả kiểm tra': 'Check result', 'Ca học hôm nay': "Today's sessions",
  'Điều kiện tra cứu': 'Search criteria', 'Điều kiện kiểm tra tiến độ review': 'Review check criteria', 'Thời gian/Ca học': 'Time/Session', 'Trạng thái cập nhật': 'Update status', 'Danh sách ca học đã kết thúc': 'Finished sessions',
  'Trạng thái nhắc nhở': 'Reminder status', 'Thông tin ca học vi phạm': 'Overdue session details', 'Danh sách ca học vi phạm tiến độ': 'Overdue sessions', 'Danh sách các ca học vi phạm tiến độ': 'Overdue sessions',
  'Ca học đã kết thúc hôm nay': 'Sessions finished today', 'Ca vi phạm tiến độ': 'Overdue sessions', 'Người chịu trách nhiệm': 'Responsible', 'Nội dung còn thiếu': 'Missing items', 'Gửi nhắc nhở': 'Send reminder', 'Quá hạn': 'Overdue',
  'Đúng hạn': 'On time', 'Tất cả (30 ngày)': 'All (30 days)', 'Chưa đăng ảnh tác phẩm': 'Artwork photo missing', 'Chưa nhập nhận xét': 'Comment missing', 'Đã đăng': 'Posted', 'Chưa đăng': 'Not posted', 'Đã nhập': 'Entered', 'Chưa nhập': 'Not entered',
  // --- phụ huynh ---
  'Chào mừng ba mẹ đến với Ngôi Nhà Nhỏ!': 'Welcome to Little House!', 'HỌC VIÊN ĐÃ LIÊN KẾT': 'LINKED STUDENT', 'Đăng ký, lịch học và kết quả': 'Booking, schedule and results', 'Xin nghỉ và đăng ký học bù': 'Leave and make-up booking',
  'Thời khóa biểu và nhật ký học tập': 'Timetable and learning diary', 'Thông tin và cập nhật từ lớp vẽ': 'News from the art class', 'Chọn chức năng theo dõi lịch học của bé': "Choose how to follow your child's schedule",
  'Tra cứu thời khoá biểu': 'View timetable', 'Xem lịch học theo tuần của bé': "See your child's weekly schedule", 'Xem nhật ký học tập': 'View learning diary', 'Theo dõi bài vẽ và nhận xét': 'Follow artwork and comments',
  'Nhận thông tin mới từ lớp vẽ': 'Get the latest from the art class', 'Không thể tải thời khóa biểu': 'Could not load the timetable', 'Chưa có lịch học': 'No sessions yet', 'Không thể tải nhật ký': 'Could not load the diary',
  'Chi tiết nhật ký học tập': 'Diary details', 'Tác phẩm và nhận xét': 'Artwork and comments', 'Chưa có nội dung': 'No content yet', 'Nhật ký học tập của bé chưa có nội dung': "Your child's diary has no entries yet",
  'Không thể tải thông báo': 'Could not load notifications', 'Chi tiết thông báo': 'Notification details', 'Bạn chưa có thông báo nào': 'You have no notifications', 'Xem thông báo': 'View notifications', 'Nhập số điện thoại': 'Enter phone number',
  'Chọn buổi học chưa diễn ra': 'Select an upcoming session', 'Gửi yêu cầu xin nghỉ': 'Send leave request', 'Buổi nghỉ cần học bù': 'Missed session to make up', 'Không thể tiếp tục đăng ký': 'Cannot continue booking',
  'Chọn ca học bù khả dụng': 'Choose an available make-up session', 'Còn chỗ - Cùng trình độ': 'Places available - same level', 'Ca học này vừa hết chỗ.': 'This session has just filled up.', 'Ba mẹ vui lòng chọn ca khác': 'Please choose another session',
  'Đăng ký được giữ chỗ, chưa chốt lịch': 'Your place is held, not yet confirmed', 'Lịch chỉ chính thức sau khi Quản lý duyệt': 'The schedule is final once the Manager approves', 'Gửi đăng ký': 'Send booking',
  'Yêu cầu có ca học bù được phép hủy': 'Requests with a make-up session that can be cancelled', 'Thông tin cần xác nhận hủy': 'Cancellation details', 'Buổi học đã xin nghỉ': 'Missed session', 'Xác nhận hủy': 'Confirm cancellation', 'Giữ lại': 'Keep',
  'Số buổi còn lại trong tháng': 'Sessions left this month', 'Giáo viên chưa đăng ảnh tác phẩm': 'The teacher has not posted the artwork yet', 'Nhận xét của giáo viên': "Teacher's comments", 'Giáo viên chưa nhập nhận xét': 'The teacher has not commented yet',
  'Thời khóa biểu': 'Timetable', 'Nhật ký học tập': 'Learning diary',
  // --- giáo viên ---
  'Ca dạy': 'Teaching', 'Lịch dạy': 'Teaching', 'Tiến độ': 'Progress', 'Điểm danh ca học': 'Take attendance', 'Tra cứu lịch giảng dạy': 'Teaching schedule', 'Ghi nhận có mặt hoặc vắng mặt': 'Mark present or absent',
  'Xem lịch dạy theo ngày hoặc tuần': 'View schedule by day or week', 'Không thể tải lịch dạy': 'Could not load the schedule', 'Không có ca dạy': 'No sessions', 'Chưa có ca dạy nào trong khoảng thời gian này.': 'No sessions in this period.',
  'Hôm nay chưa có ca học nào được phân công': 'No sessions assigned today', 'Ca học này chưa có học viên': 'This session has no students', 'Vui lòng điểm danh đủ học viên trong ca học!': 'Please mark every student in the session!',
  'Ca học này đã chốt điểm danh': 'Attendance for this session is already final', 'Chốt điểm danh thành công': 'Attendance finalised', 'Về danh sách ca': 'Back to sessions', 'Quay lại điểm danh': 'Back to attendance', 'Chốt điểm danh': 'Finalise attendance',
  'Có mặt': 'Present', 'Vắng': 'Absent', 'Chưa chốt': 'Not final', 'Đã chốt': 'Final', 'Sắp bắt đầu': 'Starting soon', 'Đang diễn ra': 'In progress', 'Đã diễn ra': 'Finished',
  'Chọn chức năng để quản lý tiến độ học viên': 'Choose a task to manage student progress', 'Đăng tải tác phẩm': 'Upload artwork', 'Chọn ảnh bài vẽ của học viên': "Choose a photo of the student's artwork",
  'Cập nhật nhận xét học viên': 'Update student comments', 'Ghi nhận nét vẽ, màu sắc và tiếp thu': 'Record line work, colour and learning', 'Đánh giá năng lực buổi học thử': 'Trial ability assessment', 'Nhận xét năng lực sau buổi học thử': 'Assess ability after the trial',
  'Cập nhật nhận xét thành công!': 'Comments updated successfully!', 'Chọn học viên có mặt': 'Select a present student', 'Hiện không có học viên học thử nào cần đánh giá.': 'There are no trial students to assess.',
  'Chào mừng cô đến với Ngôi Nhà Nhỏ!': 'Welcome to Little House!', 'Ca học gần nhất': 'Next session', 'Điểm danh ca học, Tra cứu lịch giảng dạy': 'Attendance, teaching schedule', 'Việc cần xử lý hôm nay': 'To do today',
  'Ca chưa điểm danh': 'Sessions without attendance', 'Tác phẩm cần đăng': 'Artwork to upload', 'Nhận xét cần cập nhật': 'Comments to update', 'Theo tuần': 'By week', 'Theo ngày': 'By day', 'Học bù đã duyệt': 'Approved make-up',
  'Ca học đã diễn ra hôm nay': 'Sessions finished today', 'Học viên có mặt trong ca': 'Students present', 'Ảnh đã lưu vào nhật ký học tập': 'Photo saved to the learning diary', 'Về danh sách học viên': 'Back to students',
  'Ảnh tác phẩm': 'Artwork photo', 'Chọn ảnh từ thư viện ảnh': 'Choose from photo library', 'Ảnh sẽ được gắn vào nhật ký học tập của bé': "The photo will be added to the child's diary", 'Đăng tải': 'Upload',
  'Nhập nhận xét sau ca học': 'Enter comments after the session', 'Nhận xét kỹ năng': 'Skill comments', 'Kết quả đánh giá': 'Assessment result', 'Lưu đánh giá năng lực thành công!': 'Assessment saved successfully!',
  'Trạng thái đơn học thử': 'Trial request status', 'Nhập đánh giá cho học viên': 'Enter assessment for the student', 'Học viên học thử cần đánh giá': 'Trial students to assess', 'Đăng tải ảnh tác phẩm': 'Upload artwork photo',
  'Đã huỷ thao tác đăng tải': 'Upload cancelled', 'Đã huỷ thao tác cập nhật': 'Update cancelled', 'Vui lòng chọn ảnh tác phẩm!': 'Please choose an artwork photo!', 'Ảnh không hợp lệ. Vui lòng chọn ảnh khác!': 'Invalid image. Please choose another one!',
  'Chọn ảnh': 'Choose photo', 'Chọn ảnh khác': 'Choose another photo', 'Học viên đã có nhận xét trong ca học này': 'This student already has comments for this session', 'Ca học này chưa có học viên có mặt': 'No students were present in this session',
  'Hôm nay chưa có ca học nào để đăng tải': 'No sessions to upload for today', 'Hôm nay chưa có ca học nào để nhận xét': 'No sessions to comment on today', 'Học viên đã có đánh giá năng lực.': 'This student has already been assessed.',
  'Vui lòng nhập đầy đủ nhận xét!': 'Please complete all comments!', 'Vui lòng nhập đầy đủ đánh giá!': 'Please complete the assessment!', 'Đổi mật khẩu thành công': 'Password changed',
  // --- bổ sung sau khi rà toàn bộ màn hình ---
  'Quản lý học thử': 'Trial management', 'Quản lý hồ sơ học viên': 'Student records', 'Cập nhật thông tin học viên': 'Update student information', 'Chờ tiếp nhận': 'Awaiting acceptance', 'Khung giờ mong muốn': 'Preferred time',
  'Thời điểm đăng ký': 'Registered at', 'Thời gian': 'Time', 'Buổi học thử chưa diễn ra': 'The trial has not taken place yet', 'Chọn đơn học thử đã quyết định đăng ký học chính thức (tùy chọn)': 'Select a trial request that decided to enrol (optional)',
  'Hệ thống tự điền thông tin từ đơn; bạn kiểm tra và bổ sung trước khi lưu': 'Details are filled from the request; please check and complete before saving', 'Gợi ý theo độ tuổi: Cơ bản (5 - 6 tuổi), Nâng cao (7 - 15 tuổi)': 'Age guide: Basic (5 - 6), Advanced (7 - 15)',
  'Nhập mã học viên, số điện thoại phụ huynh hoặc họ tên để bắt đầu': 'Enter a student ID, parent phone or name to start', 'Danh sách hồ sơ chưa bảo lưu': 'Active records', 'Họ tên': 'Full name', 'Hành động': 'Action', 'Chọn': 'Select',
  'Tìm kiếm hồ sơ đã bảo lưu': 'Search suspended records', 'Danh sách hồ sơ đã bảo lưu': 'Suspended records', 'Mã lớp': 'Class code', 'Sĩ số': 'Size', 'Độ tuổi': 'Age', 'Nghỉ:': 'Absent:', 'Chọn yêu cầu nghỉ để lập đề xuất': 'Select an absence to propose a make-up',
  'Ca học / Giáo viên': 'Session / Teacher', 'học viên': 'students', 'Sĩ số tối đa 7 học viên/ca, tối đa 8 nếu có học viên học thử/học bù': 'Max 7 students per session, 8 with trial/make-up students', 'Phê duyệt lịch trình': 'Schedule approvals',
  'Xem báo cáo và thống kê': 'Reports and statistics', 'Loại': 'Type', 'Nội dung': 'Details', 'Sĩ số ca': 'Session size', 'Ca học thử': 'Trial session', 'Xếp học bù': 'Make-up', 'Học viên mới (tuần này)': 'New students (this week)', 'Học viên cũ': 'Existing students',
  'Học viên đã bảo lưu (thống kê riêng)': 'Suspended students (counted separately)', 'Số tiền học phí': 'Tuition amount', 'Tổng số ca học đã diễn ra': 'Sessions held', 'Sĩ số bình quân / ca': 'Average size / session', 'Tỷ lệ chuyên cần': 'Attendance rate',
  'Lượt vắng có phép / không phép': 'Excused / unexcused absences', 'Buổi học bù đã xử lý': 'Make-ups handled', 'Chờ duyệt ca học thử': 'Awaiting trial approval', 'Ca nghỉ': 'Missed session', 'Ca học bù đề xuất': 'Proposed make-up session', 'Giáo viên ca bù': 'Make-up teacher',
  'Báo cáo và thống kê': 'Reports and statistics', 'Khoảng thời gian thống kê': 'Reporting period', 'Điều kiện cảnh báo học phí': 'Tuition alert criteria', 'Nhận xét': 'Comments', 'Tuân thủ': 'Compliance', 'Hôm nay chưa có ca học nào kết thúc': 'No sessions have finished today',
  'Chưa đăng ảnh tác phẩm, chưa nhập nhận xét': 'Artwork photo and comments missing', 'Chưa gửi nhắc nhở': 'No reminder sent', 'Đã gửi nhắc nhở': 'Reminder sent', 'Thiếu ảnh': 'Photo missing', 'Thiếu nhận xét': 'Comments missing', 'Mã ca': 'Session code', 'Người phụ trách': 'In charge',
  'Theo dõi việc học của bé': "Follow your child's learning", 'Chọn chức năng học thử cần sử dụng': 'Choose a trial option', 'Tạo đơn đăng ký cho bé': 'Create a booking for your child', 'Xem lịch học thử': 'View trial schedule', 'Tra cứu lịch đã được xếp': 'See the scheduled trial',
  'Xem kết quả học thử': 'View trial results', 'Theo dõi kết quả và tư vấn': 'Follow results and advice', 'Họ và tên học viên': 'Student full name', 'Chọn khung giờ': 'Choose a time slot', 'Đây là nguyện vọng, lịch chính thức do Lớp vẽ sắp xếp': 'This is a preference; the class arranges the final schedule',
  '+ Thêm bé thứ hai': '+ Add a second child', 'Nhập họ và tên': 'Enter full name', 'Bạn chưa có đơn đăng ký học thử nào': 'You have no trial bookings yet', 'Kết quả học thử': 'Trial results', 'Chưa có kết quả học thử': 'No trial results yet', 'Chọn chức năng nghỉ học cần sử dụng': 'Choose a leave option',
  'Gửi yêu cầu xin nghỉ học': 'Send a leave request', 'Báo nghỉ một buổi học sắp tới': 'Report an upcoming absence', 'Đăng ký ca học bù': 'Book a make-up session', 'Chọn ca học bù phù hợp cho bé': 'Choose a make-up session for your child', 'Huỷ yêu cầu học bù': 'Cancel make-up request',
  'Quản lý và huỷ đăng ký yêu cầu': 'Manage and cancel bookings', 'Chọn buổi học sắp tới của bé': "Choose your child's upcoming session", 'Ba mẹ có thể để trống phần này...': 'You may leave this blank...', 'Chưa có buổi cần học bù': 'No sessions to make up',
  'Học viên hiện không có buổi nghỉ nào cần học bù': 'Your child has no absences to make up', 'Hủy yêu cầu học bù': 'Cancel make-up request', 'Không có ca học bù để hủy': 'No make-up session to cancel', 'Học viên hiện không có ca học bù nào có thể hủy': 'Your child has no make-up sessions that can be cancelled',
  'Tra cứu thời khóa biểu': 'View timetable', 'Lịch học theo tuần': 'Weekly schedule', 'Tuần hiện tại': 'Current week', 'buổi': 'sessions', 'ảnh': 'photos', 'bé': 'children', 'Lịch học bù đã được phê duyệt': 'Make-up session approved', 'Học viên vắng mặt': 'Student absent',
  'Đăng tải tác phẩm, Cập nhật nhận xét, Đánh giá buổi học thử': 'Upload artwork, update comments, assess trials', 'TUẦN HIỆN TẠI': 'CURRENT WEEK', 'TUẦN ĐƯỢC CHỌN': 'SELECTED WEEK', 'NGÀY ĐƯỢC CHỌN': 'SELECTED DAY', 'HÔM NAY': 'TODAY', 'Lịch dạy tuần này': 'Schedule this week',
  'Lịch dạy trong tuần': 'Schedule for the week', 'Ca dạy trong ngày': 'Sessions on this day', 'Đơn học thử đã tiếp nhận': 'Accepted trial requests', 'Học viên cần cập nhật kết quả': 'Students needing results', 'Hồ sơ phù hợp': 'Matching records', 'Yêu cầu cần xử lý': 'Requests to handle',
  'Hỗ trợ cấp lại mật khẩu': 'Password reset support', 'Vui lòng liên hệ bộ phận Admin': 'Please contact the Admin team', 'Vui lòng liên hệ Trợ lý': 'Please contact the Assistant', 'để được hỗ trợ cấp lại mật khẩu': 'to have your password reset', 'Quay lại đăng nhập': 'Back to login', 'Hệ thống không tự khôi phục': 'The system does not recover', 'mật khẩu trực tuyến': 'passwords online',
  'Ca': 'Session', 'ca': 'sessions', 'Chủ Nhật': 'Sunday', 'Thứ Hai': 'Monday', 'Thứ Ba': 'Tuesday', 'Thứ Tư': 'Wednesday', 'Thứ Năm': 'Thursday', 'Thứ Bảy': 'Saturday', 'Chủ nhật': 'Sunday', 'dòng': 'rows', 'Học thử:': 'Trial:', 'Buổi học thử:': 'Trial session:', 'Ngày sinh:': 'Date of birth:', 'Đơn:': 'Request:',
  'Chương trình:': 'Programme:', 'Chọn bộ lọc (nếu cần) và nhấn “Lập danh sách”.': 'Choose filters (optional) and press “Build list”.', 'Chọn khoảng thời gian và nhấn “Thống kê”.': 'Choose a period and press “Show statistics”.',
  'Chọn khoảng thời gian và nhấn “Xem báo cáo”.': 'Choose a period and press “View report”.', 'Chọn điều kiện lọc và nhấn “Kiểm tra”': 'Choose filters and press “Check”', 'Khung giờ mong muốn của phụ huynh:': "Parent's preferred time:",
};

// Mẫu có phần biến (giờ, ngày, số lượng)
const P = [
  [/^Ca (\d\d:\d\d) - (\d\d:\d\d)$/, 'Session $1 - $2'],
  [/^Ca học hôm nay - (.+)$/, "Today's sessions - $1"],
  [/^(\d+) học viên$/, '$1 students'], [/^(\d+) ca$/, '$1 sessions'], [/^(\d+) ảnh$/, '$1 photos'], [/^(\d+) bé$/, '$1 children'],
  [/^còn (\d+) buổi$/, '$1 left'], [/^Lớp (.+)$/, 'Class $1'], [/^Học viên: (.+)$/, 'Student: $1'], [/^Ca học: (.+)$/, 'Session: $1'],
  [/^Thứ hai/, 'Monday'], [/^Thứ ba/, 'Tuesday'], [/^Thứ tư/, 'Wednesday'], [/^Thứ năm/, 'Thursday'], [/^Thứ sáu/, 'Friday'], [/^Thứ bảy/, 'Saturday'], [/^Chủ nhật/, 'Sunday'],
];
const WD = { 'Thứ hai': 'Monday', 'Thứ ba': 'Tuesday', 'Thứ tư': 'Wednesday', 'Thứ năm': 'Thursday', 'Thứ sáu': 'Friday', 'Thứ bảy': 'Saturday', 'Chủ nhật': 'Sunday', 'Thứ 2': 'Monday', 'Thứ 3': 'Tuesday', 'Thứ 4': 'Wednesday', 'Thứ 5': 'Thursday', 'Thứ 6': 'Friday', 'Thứ 7': 'Saturday' };

const WDT = (x) => x.replace(/^(Thứ [2-7]|Chủ nhật|CN)(?=[ ,•]|$)/, (m) => WD[m] || (m === 'CN' ? 'Sunday' : m));
const PREFIX = { 'SĐT': 'Phone', 'Giáo viên': 'Teacher', 'Chương trình': 'Programme', 'Ca bù': 'Make-up', 'Ngày sinh': 'Date of birth', 'Học thử': 'Trial', 'Buổi học thử': 'Trial session', 'Nghỉ': 'Absent' };
function core(t) {
  if (D[t]) return D[t];
  let m = t.match(/^(.+?) \((\d+)\)$/); if (m && D[m[1]]) return `${D[m[1]]} (${m[2]})`;
  m = t.match(/^(.+?) \($/); if (m && D[m[1]]) return `${D[m[1]]} (`;
  m = t.match(/^([^:]{2,20}): (.+)$/); if (m && PREFIX[m[1]]) return `${PREFIX[m[1]]}: ${WDT(D[m[2]] || m[2])}`;
  m = t.match(/^(\d+) tuổi$/); if (m) return `${m[1]} years old`;
  m = t.match(/^(\d+) học viên chính thức$/); if (m) return `${m[1]} enrolled students`;
  if (/^(Thứ [2-7]|Chủ nhật|CN)(?=[ ,•]|$)/.test(t) && !/[à-ỹđ]/i.test(t.replace(/^(Thứ [2-7]|Chủ nhật)/, ''))) return WDT(t);
  m = t.match(/^(Cơ bản|Nâng cao) ((?:T[2-7]|CN)(?:-(?:T[2-7]|CN))*)$/); if (m) return `${D[m[1]]} ${m[2]}`;
  return null;
}
export function tr(text) {
  const t = text.replace(/\u00a0/g, ' ').trim(); if (!t) return null;
  const c = core(t); if (c) return text.replace(t, c);
  for (const [re, to] of P) if (re.test(t)) {
    let out = t.replace(re, to);
    if (/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/.test(out) && /^Thứ|^Chủ nhật/.test(t)) out = t.replace(/^(Thứ (hai|ba|tư|năm|sáu|bảy|\d)|Chủ nhật)/i, (m) => WD[m] || m);
    return text.replace(t, out);
  }
  return null;
}

// Lớp dịch theo DOM: dịch nút văn bản + placeholder/aria-label/title; ghi nhớ bản gốc để chuyển lại tiếng Việt
const ORIG = new WeakMap(); const ATTRS = ['placeholder', 'aria-label', 'title'];
let obs = null; let busy = false;
function apply(root) {
  busy = true;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.parentElement && /SCRIPT|STYLE|TEXTAREA/.test(n.parentElement.tagName) ? 2 : 1) });
  const nodes = []; while (w.nextNode()) nodes.push(w.currentNode);
  nodes.forEach((n) => { const v = n.nodeValue; const o = ORIG.get(n); if (o && v === o.en) return; const e = tr(v); if (e && e !== v) { ORIG.set(n, { vi: v, en: e }); n.nodeValue = e; } });
  (root.querySelectorAll ? root.querySelectorAll('[placeholder],[aria-label],[title]') : []).forEach((el) => ATTRS.forEach((a) => {
    const v = el.getAttribute(a); if (!v) return; const k = `data-vi-${a}`; if (el.getAttribute(k) && tr(el.getAttribute(k)) === v) return;
    const e = tr(v); if (e) { el.setAttribute(k, v); el.setAttribute(a, e); }
  }));
  busy = false;
}
function revert() {
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); while (w.nextNode()) { const n = w.currentNode; const o = ORIG.get(n); if (o && n.nodeValue === o.en) n.nodeValue = o.vi; }
  document.querySelectorAll('[data-vi-placeholder],[data-vi-aria-label],[data-vi-title]').forEach((el) => ATTRS.forEach((a) => { const k = `data-vi-${a}`; if (el.hasAttribute(k)) { el.setAttribute(a, el.getAttribute(k)); el.removeAttribute(k); } }));
}
export function startI18n() {
  const lang = getLang(); document.documentElement.lang = lang;
  if (obs) { obs.disconnect(); obs = null; }
  if (lang !== 'en') { revert(); return; }
  apply(document.body);
  obs = new MutationObserver((ms) => { if (busy) return; ms.forEach((m) => { if (m.type === 'characterData') apply(m.target.parentNode || document.body); else m.addedNodes.forEach((n) => apply(n.nodeType === 3 ? n.parentNode : n)); if (m.type === 'attributes') apply(m.target); }); });
  obs.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
}
export function setLang(l) { try { localStorage.setItem(KEY, l); } catch { /* ignore */ } startI18n(); window.dispatchEvent(new Event('nnn-lang')); }
