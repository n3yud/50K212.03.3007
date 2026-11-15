// Hình minh họa giá vẽ + bảng màu dùng ở màn hình đăng nhập & chào mừng
export const Easel = ({ width = 320 }) => (
  <svg width={width} viewBox="0 0 290 220" aria-hidden="true">
    <rect x="30" y="20" width="150" height="120" rx="8" fill="#a8dcef" />
    <rect x="40" y="30" width="130" height="100" rx="4" fill="#fff6ee" />
    <circle cx="80" cy="58" r="13" fill="#f6c85f" />
    <path d="M52 112c20-34 40 0 62-22s30-12 38-24" stroke="#33b5e5" strokeWidth="9" fill="none" strokeLinecap="round" />
    <path d="M52 112c26-14 48 4 72-6s28-24 36-30" stroke="#f39261" strokeWidth="6" fill="none" strokeLinecap="round" />
    <rect x="14" y="140" width="182" height="10" rx="4" fill="#b98866" />
    <path d="M60 150 48 200M105 150v50M150 150l12 50" stroke="#b98866" strokeWidth="9" strokeLinecap="round" />
    <g transform="translate(200 92)"><path d="M20 10c28-10 52 6 54 28 1 14-10 18-22 16-16-3-14 14-30 12C6 64-6 40 4 22 8 14 14 12 20 10Z" fill="#fffaf4" stroke="#f3d3bd" strokeWidth="3" /><circle cx="22" cy="28" r="8" fill="#f39261" /><circle cx="42" cy="22" r="7" fill="#33b5e5" /><circle cx="58" cy="36" r="7" fill="#f6c85f" /><circle cx="58" cy="52" r="6" fill="#9fc58c" /></g>
  </svg>
);

// Hình minh họa giá vẽ theo đúng thiết kế Figma màn hình chào mừng Giáo viên & Phụ huynh
export const WelcomeEasel = ({ isParent = false, width = 280, height = 280 }) => (
  <svg width={width} height={height} viewBox="0 0 280 280" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    {/* Vòng tròn trắng mờ nền */}
    <circle cx="58" cy="62" r="16" fill="#FFFFFF" opacity="0.9" />
    <circle cx="222" cy="66" r="10" fill="#FFFFFF" opacity="0.9" />
    {/* Hình thoi / đốm vàng nhỏ trang trí (ở màn phụ huynh) */}
    {isParent && (
      <rect x="44" y="84" width="8" height="8" rx="1.5" transform="rotate(45 48 88)" fill="#F6A847" />
    )}

    {/* Bảng pha màu bên trái */}
    <g transform="translate(36, 142) rotate(-18)">
      <ellipse cx="30" cy="20" rx="30" ry="19" fill="#FFFDF9" stroke="#E8D7C6" strokeWidth="2.5" />
      {isParent ? (
        <>
          <circle cx="16" cy="22" r="4.8" fill="#F38A5A" />
          <circle cx="25" cy="12" r="4.8" fill="#F6C85F" />
          <circle cx="37" cy="14" r="4.8" fill="#30A8E0" />
          <circle cx="23" cy="29" r="4.8" fill="#D883B6" />
          <circle cx="36" cy="27" r="4.8" fill="#67B98A" />
        </>
      ) : (
        <>
          <circle cx="29" cy="12" r="5.5" fill="#30A8E0" />
          <circle cx="28" cy="27" r="5.5" fill="#67B98A" />
        </>
      )}
    </g>

    {/* Chân giá vẽ (2 chân dưới đáy bảng vẽ) */}
    <line x1="114" y1="184" x2="94" y2="242" stroke="#B88661" strokeWidth="8" strokeLinecap="round" />
    <line x1="166" y1="184" x2="186" y2="242" stroke="#B88661" strokeWidth="8" strokeLinecap="round" />
    {/* Chốt đỉnh giá vẽ */}
    <rect x="138" y="70" width="4" height="12" rx="2" fill="#B88661" />

    {/* Bảng tranh vẽ (Canvas) */}
    <rect x="96" y="76" width="88" height="108" rx="10" fill="#FFFDF8" stroke="#F1DECD" strokeWidth="3.5" />

    {/* Nét vẽ trên tranh */}
    {/* Mặt trời vàng cam */}
    <circle cx="132" cy="112" r="14" fill="#F6A847" />
    {/* Sóng xanh dương dạng núi nhấp nhô */}
    <path d="M108 150 C114 132, 124 126, 134 135 C144 144, 148 156, 158 154 C166 152, 172 142, 178 136" stroke="#33A8E2" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    {/* Sóng xanh lá */}
    <path d="M112 168 C120 156, 136 156, 144 166" stroke="#93CE8E" strokeWidth="6.5" strokeLinecap="round" fill="none" />
    {/* Sóng cam */}
    <path d="M140 166 C148 154, 164 154, 174 163" stroke="#E78453" strokeWidth="6.5" strokeLinecap="round" fill="none" />

    {/* Cọ vẽ bên phải tựa vào giá vẽ */}
    <g transform="translate(182, 114) rotate(22)">
      {/* Tia sáng / dấu nhân trang trí bên cạnh đầu cọ */}
      <path d="M-6 8 L-2 12 M-2 8 L-6 12" stroke="#E86D3F" strokeWidth="2" strokeLinecap="round" />
      {/* Đầu lông cọ màu cam */}
      <path d="M0 4 C1 0, 7 0, 8 4 L9 16 L-1 16 Z" fill="#E86D3F" />
      {/* Cổ kim loại xanh */}
      <rect x="-1" y="16" width="10" height="8" rx="1" fill="#71C2E4" />
      {/* Cán cọ bằng gỗ kéo dài xuống chân phải */}
      <path d="M0 24 L2 112 C2 114, 6 114, 6 112 L8 24 Z" fill="#B88661" />
    </g>
  </svg>
);
export const TeacherEasel = (p) => <WelcomeEasel {...p} isParent={false} />;
export const ParentEasel = (p) => <WelcomeEasel {...p} isParent={true} />;

export const Waves = () => (
  <svg className="art" viewBox="0 0 800 260" preserveAspectRatio="none" aria-hidden="true">
    <path d="M0 120C160 60 320 110 480 150S720 150 800 100V260H0Z" fill="#c6e8f4" />
    <path d="M0 190C180 140 360 200 540 210S740 190 800 170V260H0Z" fill="#a8dcef" />
  </svg>
);
