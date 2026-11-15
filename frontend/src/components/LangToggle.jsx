import { useEffect, useState } from 'react';
import { getLang, setLang } from '../lib/i18n';

// Nút chuyển ngôn ngữ Tiếng Việt / English (NFR-05)
export default function LangToggle({ className = '', asMenuItem = false }) {
  const [l, setL] = useState(getLang());
  useEffect(() => { const f = () => setL(getLang()); window.addEventListener('nnn-lang', f); return () => window.removeEventListener('nnn-lang', f); }, []);
  if (asMenuItem) return <button role="menuitem" onClick={() => setLang(l === 'en' ? 'vi' : 'en')}>{l === 'en' ? 'Tiếng Việt' : 'English'}</button>;
  return (
    <div className={`lang-toggle ${className}`} role="group" aria-label="Ngôn ngữ / Language">
      <button className={l === 'vi' ? 'on' : ''} onClick={() => setLang('vi')}>VI</button>
      <button className={l === 'en' ? 'on' : ''} onClick={() => setLang('en')}>EN</button>
    </div>
  );
}
