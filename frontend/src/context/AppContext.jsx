import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { auth } from '../services/api';
import { IconAlert, IconCheck, IconX, IconInfo } from '../components/icons';
import DemoFault from '../components/DemoFault';
import { startI18n } from '../lib/i18n';

const AuthCtx = createContext(null);
const ToastCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);
export const useToast = () => useContext(ToastCtx);

export function AppProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = đang tải
  const [toasts, setToasts] = useState([]);
  useEffect(() => { auth.me().then(setUser); startI18n(); }, []);
  const push = useCallback((type, msg) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, type, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
  }, []);
  const toast = useMemo(() => ({ success: (m) => push('success', m), error: (m) => push('error', m), info: (m) => push('info', m), warn: (m) => push('info', m) }), [push]);
  const authValue = useMemo(() => ({
    user, setUser,
    async login(u, p, app) { const me = await auth.login(u, p, app); setUser(me); return me; },
    async logout() { await auth.logout(); setUser(null); },
  }), [user]);
  return (
    <AuthCtx.Provider value={authValue}>
      <ToastCtx.Provider value={toast}>
        {children}
        <DemoFault />
        <div className="toast-host" role="status" aria-live="polite">
          {toasts.map((t) => (
            <div key={t.id} className={`toast ${t.type}`}>
              <span className="ico">{t.type === 'error' ? <IconX size={18} /> : t.type === 'success' ? <IconCheck size={18} /> : <b style={{ fontSize: 20, lineHeight: 1 }}>!</b>}</span>
              <span className="msg">{t.msg}</span>
              <button aria-label="Đóng" onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}><IconX size={13} /></button>
            </div>
          ))}
        </div>
      </ToastCtx.Provider>
    </AuthCtx.Provider>
  );
}
