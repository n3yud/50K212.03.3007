# Danh sách API (Backend ASP.NET Core) – tiền tố `/api`

Quyền: **Công khai** · **Đã đăng nhập** · vai trò cụ thể. Lỗi trả về JSON `{ message, fields?, children?, extra? }` với mã 400/401/403/404/500.

| Nhóm | Endpoint | Quyền | Use case |
|---|---|---|---|
| Auth | `POST /auth/login` (username, password, app) · `GET /auth/me` · `POST /auth/change-password` | công khai / đã đăng nhập | UC1 |
| Học thử – công khai | `POST /trials` | **Công khai** | UC2 |
| Học thử – Phụ huynh | `GET /parent/trials` · `POST /parent/trials/{id}/confirm` · `GET /parent/trials/result` · `GET /parent/trials/completed` | Phụ huynh | UC2 |
| Học thử – Trợ lý | `GET /assistant/trials?status=` · `POST …/{id}/accept` · `GET …/{id}/sessions` · `POST …/{id}/propose` · `GET …/consult` · `POST …/{id}/consult` | Trợ lý, Quản lý | UC 5.1–5.3 |
| Hồ sơ học viên | `GET/POST /students` · `GET /students/trial-candidates` · `GET/PUT /students/{id}` · `POST …/reserve` · `POST …/restore` · `GET …/history` | Trợ lý, Quản lý | UC 6.x |
| Lớp học | `GET /classes` · `POST/PUT /classes` · `GET /classes/teachers` · `GET /classes/open-for/{studentId}` · `POST /classes/enroll` · `GET /classes/{id}/teachers` · `POST /classes/{id}/teacher` · `GET /classes/week` | Trợ lý, Quản lý (list: + Giám sát, Giáo viên) | UC 7.x |
| Học bù – Trợ lý | `/assistant/makeup/students, recordable/{id}, record, pending, {id}/options, {id}/pick, {id}/submit` | Trợ lý, Quản lý | UC 8.x |
| Học phí | `GET /assistant/tuition` · `POST /assistant/tuition/record` | Trợ lý, Quản lý | UC 9 |
| Tiến độ | `/assistant/progress/open-sessions/{id}, record, history, history/{id}, need-review` | Trợ lý, Quản lý | UC 10.x |
| Phê duyệt | `/manager/trial-sessions (+approve/reject)` · `/manager/makeups (+{id}/approve|reject)` | **Quản lý** | UC 13 |
| Báo cáo | `/manager/reports/students, operations, tuition-alert` | **Quản lý** | UC 14 |
| Tổng quan | `/overview/assistant|manager|supervisor` | theo vai trò | — |
| Giám sát | `/supervisor/teachers, review, violations, remind` | **Giám sát** | UC 15 |
| Giáo viên | `/teacher/today, roster, attendance/finalize, schedule, done-sessions, present, journal/photo (multipart), journal/comment, trials-to-assess, trials/{id}/assess` | **Giáo viên** (chỉ ca của mình) | UC 11–12 |
| Phụ huynh | `/parent/kids, timetable/{id}, upcoming/{id}, leave, absences/{id}, makeup/{id}/options|register|cancel, diary/{id}` | **Phụ huynh** (chỉ con mình) | UC 3–4 |
| Thông báo | `GET /notifications` · `GET /notifications/unread` · `POST /notifications/{id}/read` | Đã đăng nhập | — |
