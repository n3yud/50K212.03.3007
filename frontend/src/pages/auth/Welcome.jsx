import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '../../components/icons';
import { TeacherEasel, ParentEasel } from '../../components/Art';

// Màn chào mừng của 2 web mobile riêng: Phụ huynh (có Đăng ký học thử) và Giáo viên
export default function Welcome({ app = 'parent' }) {
  const nav = useNavigate();
  const parent = app === 'parent';

  return (
    <div className="m-root">
      <div className="m-app">
        <div className={`welcome welcome-${app}`}>
          <Logo size={62} text={false} />
          <div className="welcome-brand">
            <div className="brand-l">LỚP VẼ</div>
            <div className="brand-n">NGÔI NHÀ NHỎ</div>
            <div className="brand-s">Nơi mỗi nét vẽ là một niềm vui</div>
          </div>

          <div className="hero">
            {parent ? <ParentEasel width={280} height={280} /> : <TeacherEasel width={280} height={280} />}
          </div>

          <h2>{parent ? 'Chào mừng ba mẹ!' : 'Chào mừng thầy cô!'}</h2>
          {parent && (
            <p className="welcome-sub">
              Cùng bé khám phá thế giới sắc màu<br />
              qua những buổi học vẽ thật vui
            </p>
          )}

          {parent ? (
            <>
              <button className="btn-welcome" onClick={() => nav('/dang-ky-hoc-thu')}>
                Đăng ký học thử ngay
              </button>
              <div className="welcome-login-link">
                <div>Đã có tài khoản?</div>
                <Link to="/phu-huynh/login">Đăng nhập tại đây</Link>
              </div>
            </>
          ) : (
            <button className="btn-welcome" onClick={() => nav('/giao-vien/login')}>
              Đăng nhập
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
