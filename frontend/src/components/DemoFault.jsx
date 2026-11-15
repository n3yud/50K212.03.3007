import { useEffect, useState } from 'react';
import { USING_REAL_BACKEND } from '../services/api';

// Công cụ trình diễn (chỉ ở chế độ giả lập): Ctrl + Alt + E bật/tắt "giả lập sự cố hệ thống"
// để xem các màn ngoại lệ "Hiện tại đang có sự cố..." đúng như Figma/đặc tả.
export default function DemoFault() {
  const read = () => { try { return localStorage.getItem('nnn_fault') === '1'; } catch { return false; } };
  const [on, setOn] = useState(read);
  useEffect(() => {
    if (USING_REAL_BACKEND) return undefined;
    const f = (e) => {
      if (e.ctrlKey && e.altKey && (e.key === 'e' || e.key === 'E')) {
        const v = !read(); try { v ? localStorage.setItem('nnn_fault', '1') : localStorage.removeItem('nnn_fault'); } catch { /* ignore */ }
        setOn(v);
      }
    };
    window.addEventListener('keydown', f); return () => window.removeEventListener('keydown', f);
  }, []);
  if (USING_REAL_BACKEND || !on) return null;
  return <div className="demo-fault" title="Ctrl + Alt + E để tắt">Đang giả lập sự cố hệ thống</div>;
}
