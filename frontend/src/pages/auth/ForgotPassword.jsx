import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui';
import { Logo } from '../../components/icons';
import LangToggle from '../../components/LangToggle';

// Quên mật khẩu (Figma GV-03 / PH-04): hệ thống không tự khôi phục mật khẩu trực tuyến (UC 1 – luồng 3a),
// chỉ hướng dẫn liên hệ người cấp lại: Giáo viên → bộ phận Admin, Phụ huynh → Trợ lý.
export default function ForgotPassword({ app = 'teacher' }) {
  const nav = useNavigate();
  const who = app === 'parent' ? 'Trợ lý' : 'bộ phận Admin';
  return (
    <div className="m-root"><div className="m-app"><div className="m-login">
      <div className="top"><Logo size={34} /><LangToggle className="sm" /></div>
      <div className={`bd m-forgot ${app}`}>
        <h1>Quên mật khẩu?</h1>
        <div className="m-forgot-sub">Hỗ trợ cấp lại mật khẩu</div>
        <div className="m-forgot-box">
          <b>{`Vui lòng liên hệ ${who}`}</b>
          <span>để được hỗ trợ cấp lại mật khẩu</span>
          <small>Hệ thống không tự khôi phục<br />mật khẩu trực tuyến</small>
        </div>
        <Button block onClick={() => nav(app === 'parent' ? '/phu-huynh/login' : '/giao-vien/login')}>Quay lại đăng nhập</Button>
      </div>
    </div></div></div>
  );
}
