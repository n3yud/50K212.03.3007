import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { startAutoSync } from '../lib/offline';
import LangToggle from './LangToggle';
import { useAuth } from '../context/AppContext';
import { Logo, IconFlower, IconClock, IconCalendar, IconBell, IconPencil, IconBack } from './icons';
import { notifications } from '../services/api';

const NAVS = {
  parent: [
    { to: '/phu-huynh/hoc-thu', label: 'Học thử', icon: IconFlower },
    { to: '/phu-huynh/xin-nghi', label: 'Xin nghỉ', icon: IconClock },
    { to: '/phu-huynh/lich-hoc', label: 'Lịch học', icon: IconCalendar },
    { to: '/phu-huynh/thong-bao', label: 'Thông báo', icon: IconBell, badge: true },
  ],
  teacher: [
    { to: '/giao-vien/lich-day', label: 'Lịch dạy', icon: IconCalendar, also: ['/giao-vien/trang-chu', '/giao-vien/diem-danh', '/giao-vien/lich-giang-day'] },
    { to: '/giao-vien/tien-do', label: 'Tiến độ', icon: IconPencil, badge: true },
  ],
};

export default function MobileLayout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [menu, setMenu] = useState(false);
  const [unread, setUnread] = useState(0);
  const loc = useLocation();
  useEffect(() => (user.role === 'teacher' ? startAutoSync() : undefined), [user.role]);
  useEffect(() => { const f = () => notifications.unread().then(setUnread); f(); const t = setInterval(f, 4000); return () => clearInterval(t); }, []);
  const role = user.role; const items = NAVS[role];
  return (
    <div className="m-root">
      <div className="m-app">
        <header className="m-head">
          <Logo size={32} text={false} />
          <div><div className="brand-t">Ngôi nhà nhỏ</div><div className="brand-r">{role === 'parent' ? 'PHỤ HUYNH' : 'GIÁO VIÊN'}</div></div>
          <button className="avatar" onClick={() => setMenu(!menu)} aria-label="Tài khoản" aria-expanded={menu}>{role === 'parent' ? 'PH' : 'GV'}</button>
          {menu && (
            <div className="m-menu" role="menu">
              <div style={{ padding: '8px 14px', fontWeight: 800 }}>{user.fullName}</div>
              <button role="menuitem" onClick={() => { setMenu(false); nav('/doi-mat-khau'); }}>Đổi mật khẩu</button>
              <LangToggle asMenuItem />
              <button role="menuitem" onClick={async () => { await logout(); nav(role === 'parent' ? '/phu-huynh/welcome' : '/giao-vien/welcome'); }}>Đăng xuất</button>
            </div>
          )}
        </header>
        <Outlet />
        <nav className="m-nav" aria-label="Điều hướng chính">
          {items.map((i) => (
            <NavLink key={i.to} to={i.to} className={({ isActive }) => (isActive || (i.also || []).some((p) => loc.pathname.startsWith(p)) ? 'active' : '')}>
              <i.icon size={22} />{i.label}
              {i.badge && unread > 0 && <span className="dot">{unread > 9 ? '9+' : unread}</span>}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}

// Tiêu đề trang con có nút quay lại (theo Figma)
export function MTitle({ title, sub, back = true, onBack }) {
  const nav = useNavigate();
  return (
    <>
      <div className="m-title">{back && <button onClick={() => (onBack ? onBack() : nav(-1))} aria-label="Quay lại"><IconBack size={26} /></button>}{title}</div>
      {sub && <div className="m-sub">{sub}</div>}
    </>
  );
}
