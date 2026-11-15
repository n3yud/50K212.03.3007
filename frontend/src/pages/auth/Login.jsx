import LangToggle from '../../components/LangToggle';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useToast } from '../../context/AppContext';
import { Button, Field, Input, Modal, PasswordInput } from '../../components/ui';
import { Easel, Waves } from '../../components/Art';
import { Logo, IconHome } from '../../components/icons';
import { auth } from '../../services/api';
import { homeFor } from '../../routes';

export const useIsMobile = (bp = 900) => {
  const [m, setM] = useState(() => window.innerWidth < bp);
  useEffect(() => { const f = () => setM(window.innerWidth < bp); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f); }, [bp]);
  return m;
};

// app: 'staff' = web quản trị dùng chung (Trợ lý/Quản lý/Giám sát, phân quyền khi đăng nhập)
//      'parent' | 'teacher' = hai web mobile riêng
const HouseIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M3.5 10.5 12 4l8.5 6.5V20a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-9.5Z" stroke="#33b5e5" strokeWidth="2" strokeLinejoin="round" />
    <rect x="9.5" y="14" width="5" height="7" rx="1" fill="#ed986f" />
  </svg>
);

export default function Login({ app = 'staff' }) {
  const { login } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const narrow = useIsMobile();
  const mobile = app !== 'staff' || narrow;
  const welcome = app === 'parent' ? '/phu-huynh/welcome' : '/giao-vien/welcome';
  const [f, setF] = useState({ username: '', password: '' });
  const [err, setErr] = useState({});
  const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [banner, setBanner] = useState(null); // {type:'error'|'info', msg}

  const submit = async (e) => {
    e.preventDefault(); setErr({}); setBanner(null); setBusy(true);
    try { const u = await login(f.username, f.password, app); nav(u.mustChangePassword ? '/doi-mat-khau' : homeFor(u.role), { replace: true }); }
    catch (ex) {
      if (ex.fields) setErr(ex.fields);
      else setBanner({ type: 'error', msg: ex.message || 'Hiện tại đang có sự cố. Vui lòng thử lại sau' });
    }
    finally { setBusy(false); }
  };
  const cancel = () => { if (app !== 'staff') nav(welcome); else { setF({ username: '', password: '' }); setErr({}); } };

  const form = (
    <form onSubmit={submit} className={`stack ${banner?.type === "error" && /không chính xác/.test(banner.msg) ? "bad-cred" : ""}`} style={{ gap: 18 }} noValidate>
      <Field label="Tài khoản" error={err.username}><Input value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} placeholder="Nhập thông tin" autoComplete="username" /></Field>
      <Field label="Mật khẩu" error={err.password}><PasswordInput value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} placeholder="Nhập mật khẩu" autoComplete="current-password" /></Field>
      {mobile && <button type="button" className="link-btn" style={{ textAlign: 'left' }} onClick={() => (app === 'staff' ? (setErr({}), setBanner({ type: 'info', msg: auth.forgotMessage('staff') })) : nav(app === 'parent' ? '/phu-huynh/quen-mat-khau' : '/giao-vien/quen-mat-khau'))}>Quên mật khẩu?</button>}
      <div className="stack" style={{ gap: 12 }}>
        <Button type="submit" block disabled={busy}>Đăng nhập</Button>
        <Button variant="secondary" block onClick={cancel}>Huỷ</Button>
      </div>
      {!mobile && <div className="login-links"><button type="button" className="link-btn" onClick={() => { setErr({}); setBanner({ type: 'info', msg: auth.forgotMessage('staff') }); }}>Quên mật khẩu?</button></div>}
    </form>
  );
  const modal = forgot && <Modal title="Quên mật khẩu" onClose={() => setForgot(false)} actions={<Button onClick={() => setForgot(false)}>Đã hiểu</Button>}><p>{auth.forgotMessage(app === 'parent' ? 'parent' : 'staff')}.</p></Modal>;

  if (mobile) return (
    <div className="m-root"><div className="m-app"><div className="m-login">
      <div className="top"><Logo size={34} /><LangToggle className="sm" /></div>
      <div className="bd"><h1>Đăng nhập</h1>{banner && <div className={`m-lbanner ${banner.type}`} role="alert">{banner.msg}</div>}{form}</div>
    </div></div>{modal}</div>
  );
  return (
    <div className="login">
      <div className="login-hero">
        <img src="/assets/logo-full.png" alt="Lớp vẽ Ngôi Nhà Nhỏ" className="logo-img" />
        <div className="h1">Chào mừng đến với</div>
        <div className="h2">Ngôi Nhà Nhỏ</div>
        <div className="h3">Hệ thống quản lý lớp vẽ</div>
        <img src="/assets/login-hero-art.png" alt="" className="art-img" />
      </div>
      <div className="login-side">
        <div className="login-card"><LangToggle className="corner" />
          <div className="ttl"><span className="ico"><HouseIcon /></span>Đăng nhập</div>
          {banner && <div className={`login-banner ${banner.type}`} role="alert">{banner.msg}</div>}
          {form}
        </div>
      </div>
      {modal}
    </div>
  );
}
