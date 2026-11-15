import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AppContext';
import { Button, Field, PasswordInput } from '../../components/ui';
import { Logo } from '../../components/icons';
import { auth } from '../../services/api';
import { homeFor, welcomeFor } from '../../routes';

// Đổi mật khẩu (Figma PH-03 "Đổi mật khẩu lần đầu"): bắt buộc ở lần đăng nhập đầu (BR-UC1-05/11), tùy chọn các lần sau
export default function ChangePassword() {
  const { user, setUser, logout } = useAuth(); const nav = useNavigate();
  const [f, setF] = useState({ oldPw: '', newPw: '', again: '' }); const [e, setE] = useState({}); const [msg, setMsg] = useState(null); const [busy, setBusy] = useState(false);
  const forced = user.mustChangePassword; const isParent = user.role === 'parent';
  const submit = async () => {
    const er = {}; setMsg(null);
    if (!f.oldPw || !f.newPw || !f.again) ['oldPw', 'newPw', 'again'].forEach((k) => { if (!f[k]) er[k] = 'Vui lòng điền đầy đủ thông tin!'; });
    else if (f.newPw.length < 6) er.newPw = 'Mật khẩu mới cần có ít nhất 6 ký tự';
    else if (f.again !== f.newPw) er.again = 'Mật khẩu nhập lại không khớp';
    setE(er); if (Object.keys(er).length) return;
    setBusy(true);
    try { const r = await auth.changePassword(f.oldPw, f.newPw); setUser(r); nav(homeFor(r.role), { replace: true }); }
    catch (x) { if (x.field) setE({ [x.field]: x.message }); else setMsg(x.message); }
    finally { setBusy(false); }
  };
  const cancel = async () => { if (forced) { await logout(); nav(welcomeFor(user.role)); } else nav(-1); };
  return (
    <div className="m-root"><div className="m-app"><div className="m-login">
      <div className="top"><Logo size={34} /></div>
      <div className="bd cpw">
        <h1>{forced ? 'Đổi mật khẩu lần đầu' : 'Đổi mật khẩu'}</h1>
        <div className="m-sub2">{forced ? (isParent ? 'Dành cho tài khoản phụ huynh mới' : 'Dành cho tài khoản mới') : 'Cập nhật mật khẩu đăng nhập'}</div>
        {forced && <div className="m-protect"><b>{isParent ? 'Bảo vệ tài khoản của ba mẹ' : 'Bảo vệ tài khoản của bạn'}</b><span>Vui lòng thay mật khẩu tạm trước khi sử dụng</span></div>}
        {msg && <div className="m-lbanner error">{msg}</div>}
        <Field label={forced ? 'Mật khẩu tạm' : 'Mật khẩu hiện tại'} error={e.oldPw}><PasswordInput value={f.oldPw} onChange={(x) => setF({ ...f, oldPw: x.target.value })} /></Field>
        <Field label="Mật khẩu mới" error={e.newPw}><PasswordInput value={f.newPw} onChange={(x) => setF({ ...f, newPw: x.target.value })} /></Field>
        <Field label="Nhập lại mật khẩu mới" error={e.again}><PasswordInput value={f.again} onChange={(x) => setF({ ...f, again: x.target.value })} /></Field>
        <div style={{ height: 16 }} />
        <Button block onClick={submit} disabled={busy}>Đổi mật khẩu</Button>
        <Button block variant="secondary" onClick={cancel}>Huỷ</Button>
      </div>
    </div></div></div>
  );
}
