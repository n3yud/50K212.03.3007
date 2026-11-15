import LangToggle from './LangToggle';
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AppContext';
import { Logo, IconChevronDown, IconMenu } from './icons';
import { longToday } from '../lib/dates';

const OPS_MENU = (b) => [
  { label: 'Quản lý học thử', children: [
    { label: 'Tiếp nhận đơn học thử', to: `${b}/hoc-thu/tiep-nhan` },
    { label: 'Xếp ca học thử', to: `${b}/hoc-thu/xep-ca` },
    { label: 'Cập nhật kết quả tư vấn', to: `${b}/hoc-thu/tu-van` } ] },
  { label: 'Quản lý hồ sơ học viên', children: [
    { label: 'Tạo mới hồ sơ học viên', to: `${b}/ho-so/tao-moi` },
    { label: 'Cập nhật thông tin học viên', to: `${b}/ho-so/cap-nhat` },
    { label: 'Tra cứu hồ sơ học viên', to: `${b}/ho-so/tra-cuu` },
    { label: 'Bảo lưu hồ sơ học viên', to: `${b}/ho-so/bao-luu` },
    { label: 'Khôi phục hồ sơ học viên', to: `${b}/ho-so/khoi-phuc` } ] },
  { label: 'Quản lý lớp học', children: [
    { label: 'Tạo lớp học mới', to: `${b}/lop-hoc/tao-moi` },
    { label: 'Cập nhật thông tin lớp', to: `${b}/lop-hoc/cap-nhat` },
    { label: 'Xếp học viên vào lớp', to: `${b}/lop-hoc/xep-lop` },
    { label: 'Phân công giáo viên phụ trách', to: `${b}/lop-hoc/phan-cong` } ] },
  { label: 'Điều phối lịch học bù', children: [
    { label: 'Ghi nhận lịch nghỉ', to: `${b}/hoc-bu/ghi-nhan` },
    { label: 'Lập đề xuất ca học bù', to: `${b}/hoc-bu/de-xuat` } ] },
  { label: 'Quản lý học phí', children: [
    { label: 'Ghi nhận học phí', to: `${b}/hoc-phi/ghi-nhan` },
    { label: 'Tra cứu tình trạng học phí', to: `${b}/hoc-phi/tra-cuu` } ] },
  { label: 'Quản lý tiến độ học tập', children: [
    { label: 'Ghi nhận tiến độ học viên', to: `${b}/tien-do/ghi-nhan` },
    { label: 'Tra cứu lịch sử tiến độ', to: `${b}/tien-do/lich-su` },
    { label: 'Lập danh sách học viên cần đánh giá', to: `${b}/tien-do/can-danh-gia` } ] },
];
export const MENUS = {
  assistant: (b) => [{ label: 'Tổng quan', to: `${b}/tong-quan` }, ...OPS_MENU(b)],
  manager: () => [
    { label: 'Tổng quan', to: '/quan-ly/tong-quan' },
    { label: 'Phê duyệt lịch trình', children: [
      { label: 'Phê duyệt ca học thử', to: '/quan-ly/phe-duyet/ca-hoc-thu' },
      { label: 'Phê duyệt đề xuất xếp bù', to: '/quan-ly/phe-duyet/de-xuat-bu' } ] },
    { label: 'Xem báo cáo và thống kê', children: [
      { label: 'Thống kê tình hình học viên', to: '/quan-ly/bao-cao/hoc-vien' },
      { label: 'Báo cáo vận hành lớp học', to: '/quan-ly/bao-cao/van-hanh' },
      { label: 'Báo cáo cảnh báo học phí', to: '/quan-ly/bao-cao/hoc-phi' } ] },
  ],
  supervisor: () => [
    { label: 'Tổng quan', to: '/giam-sat/tong-quan' },
    { label: 'Giám sát tiến độ', children: [
      { label: 'Kiểm tra tiến độ review của giáo viên', to: '/giam-sat/kiem-tra' },
      { label: 'Gửi nhắc nhở vi phạm tiến độ', to: '/giam-sat/nhac-nho' } ] },
  ],
};
export const ROLE_LABEL = { assistant: 'Trợ lý', manager: 'Quản lý', supervisor: 'Giám sát', teacher: 'Giáo viên', parent: 'Phụ huynh' };
const initials = (n) => n.split(' ').map((w) => w[0]).slice(-2).join('').toUpperCase();
const ROLE_ABBR = { assistant: 'TN', manager: 'QL', supervisor: 'TB' };

function Group({ item, pathname, close }) {
  const hasActive = item.children.some((c) => pathname.startsWith(c.to));
  const [open, setOpen] = useState(hasActive);
  const go = useNavigate();
  useEffect(() => { setOpen(hasActive); }, [hasActive]);
  return (
    <div className="nav-group">
      <button className={`nav-item ${open ? 'active' : ''}`} onClick={() => { if (open) setOpen(false); else { setOpen(true); if (!hasActive) go(item.children[0].to); } }} aria-expanded={open}>
        <span>{item.label}</span>{open && <IconChevronDown size={18} />}
      </button>
      {open && <div className="nav-children">{item.children.map((c) => <NavLink key={c.to} to={c.to} onClick={close} className={({ isActive }) => `nav-sub ${isActive ? 'active' : ''}`}>{c.label}</NavLink>)}</div>}
    </div>
  );
}

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const base = user.role === 'assistant' ? '/tro-ly' : '';
  const items = MENUS[user.role](base);
  useEffect(() => { setOpen(false); }, [pathname]);
  return (
    <div className="admin">
      <aside className={`sidebar ${open ? 'open' : ''}`} aria-label="Menu chính">
        <div className="brand"><img src="/assets/logo-side.png" alt="Lớp vẽ Ngôi Nhà Nhỏ" /></div>
        <nav>
          {items.map((it) => it.children
            ? <Group key={it.label} item={it} pathname={pathname} close={() => setOpen(false)} />
            : <NavLink key={it.to} to={it.to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>{it.label}</NavLink>)}
        </nav>
        <button className={`user-card ${user.role !== 'assistant' ? 'compact' : ''}`} onClick={() => setMenu(!menu)} aria-haspopup="menu" aria-expanded={menu}>
          <span className="avatar">{ROLE_ABBR[user.role] || initials(user.fullName)}</span>
          <span className="tx"><div className="nm">{user.fullName}</div><div className="rl">{ROLE_LABEL[user.role]}</div></span>
          {menu && (
            <div className="user-menu" role="menu" onClick={(e) => e.stopPropagation()}>
              <button role="menuitem" onClick={() => nav('/doi-mat-khau')}>Đổi mật khẩu</button>
              <LangToggle asMenuItem />
              <button role="menuitem" onClick={async () => { await logout(); nav('/login'); }}>Đăng xuất</button>
            </div>
          )}
        </button>
      </aside>
      <div>
        <header className="topbar">
          <button className="menu-toggle" onClick={() => setOpen(!open)} aria-label="Mở menu"><IconMenu /></button>
          <h1>HỆ THỐNG QUẢN LÝ LỚP VẼ</h1>
          <span className="date">{longToday()}</span>
        </header>
        <main className="content"><Outlet /></main>
      </div>
    </div>
  );
}

export function PageHeader({ crumbs = [], title }) {
  return (
    <>
      <div className="crumbs">{crumbs.map((c, i) => <span key={c}>{i > 0 && ' > '}{i === crumbs.length - 1 ? <b>{c}</b> : c}</span>)}</div>
      <h1 className="page-title">{title}</h1>
    </>
  );
}
