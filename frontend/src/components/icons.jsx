const P = ({ children, size = 20, ...r }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...r}>{children}</svg>
);
export const IconChevronDown = (p) => <P {...p}><path d="m6 9 6 6 6-6" /></P>;
export const IconChevronRight = (p) => <P {...p}><path d="m9 6 6 6-6 6" /></P>;
export const IconBack = (p) => <P {...p}><path d="m15 6-6 6 6 6" /></P>;
export const IconEye = (p) => <P {...p}><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></P>;
export const IconEyeOff = (p) => <P {...p}><path d="M3 3l18 18M10.6 6.1A9.8 9.8 0 0 1 12 6c6.4 0 10 6 10 6a17 17 0 0 1-3.2 3.9M6.3 6.8A17 17 0 0 0 2 12s3.6 7 10 7a9.7 9.7 0 0 0 4-.9M9.9 9.9a3 3 0 0 0 4.2 4.2" /></P>;
export const IconUser = (p) => <P {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></P>;
export const IconInfo = (p) => <P {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></P>;
export const IconCheck = (p) => <P {...p}><path d="m5 12 5 5 9-10" /></P>;
export const IconX = (p) => <P {...p}><path d="M6 6l12 12M18 6 6 18" /></P>;
export const IconCalendar = (p) => <P {...p}><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /></P>;
export const IconClock = (p) => <P {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 4.5v7.5h6" /></P>;
export const IconBell = (p) => <P {...p}><path d="M6 9a6 6 0 0 1 12 0c0 6 2 7 2 7H4s2-1 2-7ZM10 20a2 2 0 0 0 4 0" /></P>;
export const IconFlower = ({ size = 20, ...r }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...r}>
    <mask id="fl-mask">
      <rect width="24" height="24" fill="#fff" />
      <circle cx="12" cy="12" r="1.8" fill="#000" />
    </mask>
    <g mask="url(#fl-mask)">
      <circle cx="12" cy="7.2" r="3.2" />
      <circle cx="16.56" cy="10.52" r="3.2" />
      <circle cx="14.82" cy="15.88" r="3.2" />
      <circle cx="9.18" cy="15.88" r="3.2" />
      <circle cx="7.44" cy="10.52" r="3.2" />
    </g>
  </svg>
);
export const IconPencil = (p) => <P {...p}><path d="M4 20h4L19 9l-4-4L4 16v4ZM13 7l4 4" /></P>;
export const IconUp = (p) => <P {...p}><path d="m6 15 6-6 6 6" /></P>;
export const IconMenu = (p) => <P {...p}><path d="M4 6h16M4 12h16M4 18h16" /></P>;
export const IconArrow = (p) => <P {...p}><path d="M5 12h14M13 6l6 6-6 6" /></P>;
export const IconHome = (p) => <P {...p}><path d="M3 11 12 4l9 7M5 10v10h14V10" /></P>;
export const IconImage = (p) => <P {...p}><rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="9" cy="10" r="2" /><path d="m21 16-5-5-8 8" /></P>;
export const IconAlert = (p) => <P {...p}><path d="M12 3 2 20h20L12 3ZM12 10v4M12 17h.01" /></P>;

export function Logo({ size = 40, text = true, light, dot = true }) {
  const h = Math.round(size * 144 / 260);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <svg width={size} height={h} viewBox="53 21 260 144" fill="none" aria-hidden="true">
        {/* Vòng ngoài xanh da trời nhạt */}
        <path d="M 54 151 A 129 129 0 0 1 312 151 L 274 151 A 91 91 0 0 0 92 151 Z" fill="#A9DEEF" />
        {/* Vòng giữa cam san hô */}
        <path d="M 92 151 A 91 91 0 0 1 274 151 L 244 151 A 61 61 0 0 0 122 151 Z" fill="#F39261" />
        {/* Vòng trong xanh lơ đậm */}
        <path d="M 127 151 A 56 56 0 0 1 239 151 L 213 151 A 30 30 0 0 0 153 151 Z" fill="#3CB5E2" />
        {/* Chấm tròn vàng cam ở tâm đáy */}
        {dot && <circle cx="183" cy="151" r="12.5" fill="#F5C27B" />}
      </svg>
      {text && (
        <div style={{ lineHeight: 1.15 }}>
          <div style={{ color: '#ed986f', fontWeight: 700, fontSize: Math.max(9, Math.round(size * 0.28)), letterSpacing: '0.04em' }}>LỚP VẼ</div>
          <div style={{ color: light ? '#fff' : '#33b5e5', fontWeight: 700, fontSize: Math.max(14, Math.round(size * 0.44)), letterSpacing: '0.02em' }}>NGÔI NHÀ NHỎ</div>
        </div>
      )}
    </div>
  );
}
