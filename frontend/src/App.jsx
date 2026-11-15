import ForgotPassword from './pages/auth/ForgotPassword';
import { Navigate, Outlet, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { useAuth } from './context/AppContext';
import { homeFor, welcomeFor } from './routes';
import AdminLayout from './components/AdminLayout';
import MobileLayout from './components/MobileLayout';
import Login, { useIsMobile } from './pages/auth/Login';
import Welcome from './pages/auth/Welcome';
import ChangePassword from './pages/auth/ChangePassword';
import AssistantOverview from './pages/assistant/Overview';
import { TrialAccept, TrialSchedule, TrialConsult } from './pages/assistant/Trials';
import { StudentCreate, StudentUpdate, StudentLookup, StudentReserve, StudentRestore } from './pages/assistant/StudentPages';
import { ClassCreate, ClassUpdate, ClassEnroll, ClassAssign } from './pages/assistant/ClassPages';
import { MakeupRecord, MakeupPropose } from './pages/assistant/MakeupPages';
import { TuitionRecord, TuitionLookup, ProgressRecord, ProgressHistory, ProgressNeedReview } from './pages/assistant/TuitionProgressPages';
import { ManagerOverview, ApproveTrial, ApproveMakeup, ReportStudents, ReportOps, ReportTuition } from './pages/manager/Manager';
import { SupervisorOverview, ReviewCheck, Reminders } from './pages/supervisor/Supervisor';
import { TrialRegister, ParentHome, TrialMenu, TrialSchedule as ParentTrialSchedule, TrialResult, LeaveMenu, LeaveSend, MakeupRegister, MakeupCancel, ScheduleMenu, Timetable, Diary, Notices } from './pages/parent/Parent';
import { TeacherHome, TeachMenu, TeachSchedule, AttendList, Attend, ProgressMenu, PhotoUpload, CommentPage, TrialAssess } from './pages/teacher/Teacher';

// Chặn truy cập sai vai trò ở Frontend (Backend vẫn kiểm tra lại mọi API)
function Guard({ roles }) {
  const { user } = useAuth(); const loc = useLocation();
  if (user === undefined) return <div className="empty">Đang tải…</div>;
  if (!user) return <Navigate to={loc.pathname.startsWith('/phu-huynh') ? welcomeFor('parent') : loc.pathname.startsWith('/giao-vien') ? welcomeFor('teacher') : '/login'} replace />;
  if (user.mustChangePassword) return <Navigate to="/doi-mat-khau" replace />;
  if (!roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;
  return <Outlet />;
}
function Root() {
  const { user } = useAuth(); const mobile = useIsMobile();
  if (user === undefined) return <div className="empty">Đang tải…</div>;
  return <Navigate to={user ? (user.mustChangePassword ? '/doi-mat-khau' : homeFor(user.role)) : mobile ? welcomeFor('parent') : '/login'} replace />;
}
const AttendRoute = () => { const { key } = useParams(); return <Attend sessionKey={decodeURIComponent(key)} />; };
function RequireAuth() { const { user } = useAuth(); if (user === undefined) return null; return user ? <Outlet /> : <Navigate to="/login" replace />; }

// Các trang vận hành của Trợ lý – Quản lý dùng lại khi vận hành thay Trợ lý
const assistantRoutes = (
  <>
    <Route path="hoc-thu/tiep-nhan" element={<TrialAccept />} />
    <Route path="hoc-thu/xep-ca" element={<TrialSchedule />} />
    <Route path="hoc-thu/tu-van" element={<TrialConsult />} />
    <Route path="ho-so" element={<Navigate to="tra-cuu" replace />} />
    <Route path="ho-so/tao-moi" element={<StudentCreate />} />
    <Route path="ho-so/cap-nhat" element={<StudentUpdate />} />
    <Route path="ho-so/tra-cuu" element={<StudentLookup />} />
    <Route path="ho-so/bao-luu" element={<StudentReserve />} />
    <Route path="ho-so/khoi-phuc" element={<StudentRestore />} />
    <Route path="lop-hoc" element={<Navigate to="cap-nhat" replace />} />
    <Route path="lop-hoc/tao-moi" element={<ClassCreate />} />
    <Route path="lop-hoc/cap-nhat" element={<ClassUpdate />} />
    <Route path="lop-hoc/xep-lop" element={<ClassEnroll />} />
    <Route path="lop-hoc/phan-cong" element={<ClassAssign />} />
    <Route path="hoc-bu" element={<Navigate to="ghi-nhan" replace />} />
    <Route path="hoc-bu/ghi-nhan" element={<MakeupRecord />} />
    <Route path="hoc-bu/de-xuat" element={<MakeupPropose />} />
    <Route path="hoc-phi" element={<Navigate to="ghi-nhan" replace />} />
    <Route path="hoc-phi/ghi-nhan" element={<TuitionRecord />} />
    <Route path="hoc-phi/tra-cuu" element={<TuitionLookup />} />
    <Route path="tien-do" element={<Navigate to="ghi-nhan" replace />} />
    <Route path="tien-do/ghi-nhan" element={<ProgressRecord />} />
    <Route path="tien-do/lich-su" element={<ProgressHistory />} />
    <Route path="tien-do/can-danh-gia" element={<ProgressNeedReview />} />
  </>
);

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Root />} />
      <Route path="/login" element={<Login app="staff" />} />
      <Route path="/phu-huynh/welcome" element={<Welcome app="parent" />} />
      <Route path="/phu-huynh/login" element={<Login app="parent" />} />
      <Route path="/giao-vien/welcome" element={<Welcome app="teacher" />} />
      <Route path="/giao-vien/login" element={<Login app="teacher" />} />
      <Route path="/giao-vien/quen-mat-khau" element={<ForgotPassword app="teacher" />} />
      <Route path="/phu-huynh/quen-mat-khau" element={<ForgotPassword app="parent" />} />
      <Route path="/welcome" element={<Navigate to="/phu-huynh/welcome" replace />} />
      <Route path="/dang-ky-hoc-thu" element={<TrialRegister />} />
      <Route element={<RequireAuth />}><Route path="/doi-mat-khau" element={<ChangePassword />} /></Route>

      <Route element={<Guard roles={['assistant']} />}>
        <Route path="/tro-ly" element={<AdminLayout />}>
          <Route index element={<Navigate to="tong-quan" replace />} />
          <Route path="tong-quan" element={<AssistantOverview />} />
          {assistantRoutes}
        </Route>
      </Route>

      <Route element={<Guard roles={['manager']} />}>
        <Route path="/quan-ly" element={<AdminLayout />}>
          <Route index element={<Navigate to="tong-quan" replace />} />
          <Route path="tong-quan" element={<ManagerOverview />} />
          <Route path="phe-duyet/ca-hoc-thu" element={<ApproveTrial />} />
          <Route path="phe-duyet/de-xuat-bu" element={<ApproveMakeup />} />
          <Route path="bao-cao" element={<Navigate to="hoc-vien" replace />} />
          <Route path="bao-cao/hoc-vien" element={<ReportStudents />} />
          <Route path="bao-cao/van-hanh" element={<ReportOps />} />
          <Route path="bao-cao/hoc-phi" element={<ReportTuition />} />
        </Route>
      </Route>

      <Route element={<Guard roles={['supervisor']} />}>
        <Route path="/giam-sat" element={<AdminLayout />}>
          <Route index element={<Navigate to="tong-quan" replace />} />
          <Route path="tong-quan" element={<SupervisorOverview />} />
          <Route path="kiem-tra" element={<ReviewCheck />} />
          <Route path="nhac-nho" element={<Reminders />} />
        </Route>
      </Route>

      <Route element={<Guard roles={['parent']} />}>
        <Route path="/phu-huynh" element={<MobileLayout />}>
          <Route index element={<Navigate to="trang-chu" replace />} />
          <Route path="trang-chu" element={<ParentHome />} />
          <Route path="hoc-thu" element={<TrialMenu />} />
          <Route path="hoc-thu/dang-ky" element={<TrialRegister />} />
          <Route path="hoc-thu/lich" element={<ParentTrialSchedule />} />
          <Route path="hoc-thu/ket-qua" element={<TrialResult />} />
          <Route path="dang-ky" element={<Navigate to="/phu-huynh/hoc-thu/dang-ky" replace />} />
          <Route path="xin-nghi" element={<LeaveMenu />} />
          <Route path="xin-nghi/gui" element={<LeaveSend />} />
          <Route path="xin-nghi/dang-ky-bu" element={<MakeupRegister />} />
          <Route path="xin-nghi/huy-bu" element={<MakeupCancel />} />
          <Route path="lich-hoc" element={<ScheduleMenu />} />
          <Route path="lich-hoc/tkb" element={<Timetable />} />
          <Route path="lich-hoc/nhat-ky" element={<Diary />} />
          <Route path="thong-bao" element={<Notices />} />
          <Route path="thong-bao/:id" element={<Notices />} />
        </Route>
      </Route>

      <Route element={<Guard roles={['teacher']} />}>
        <Route path="/giao-vien" element={<MobileLayout />}>
          <Route index element={<Navigate to="trang-chu" replace />} />
          <Route path="trang-chu" element={<TeacherHome />} />
          <Route path="lich-day" element={<TeachMenu />} />
          <Route path="lich-giang-day" element={<TeachSchedule />} />
          <Route path="diem-danh" element={<AttendList />} />
          <Route path="diem-danh/:key" element={<AttendRoute />} />
          <Route path="tien-do" element={<ProgressMenu />} />
          <Route path="tien-do/anh" element={<PhotoUpload />} />
          <Route path="tien-do/nhan-xet" element={<CommentPage />} />
          <Route path="tien-do/hoc-thu" element={<TrialAssess />} />
        </Route>
      </Route>
      <Route path="*" element={<Root />} />
    </Routes>
  );
}
