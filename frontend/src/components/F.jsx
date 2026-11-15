// Bộ thành phần giao diện web quản trị dựng theo đúng mẫu Figma
// (thẻ trắng viền xanh, hộp thông báo góc phải, banner kết quả, ô thông tin, bảng có "Chọn")
import { useEffect, useState } from 'react';
import { STATUS_TONE } from '../lib/format';

const IcoCheck = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-10" /></svg>;
const IcoX = ({ c = '#fff', s = 16 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="3" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>;
const IcoBang = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><path d="M12 5v9M12 19h.01" /></svg>;
// Figma: thành công = dấu tick, lỗi = dấu X, cảnh báo (cam vàng) = dấu chấm than
const Ico = ({ type }) => <span className={`f-ico ${type}`}>{type === 'success' ? <IcoCheck /> : type === 'warn' ? <IcoBang /> : <IcoX />}</span>;
// Ô thông báo tự ẩn khi bấm nút đóng (kể cả nơi gọi không truyền onClose); thông báo mới thì hiện lại
const useOpen = (msg) => { const [open, setOpen] = useState(true); useEffect(() => setOpen(true), [msg]); return [open, setOpen]; };
const Close = ({ type, onClick }) => <button className={`f-close ${type}`} onClick={onClick} aria-label="Đóng"><IcoX s={12} /></button>;

// Hộp thông báo góc phải tiêu đề trang (Figma: "Hồ sơ học viên đã tồn tại", "Tạo hồ sơ học viên thành công!")
export function Notice({ type = 'success', msg, onClose }) {
  const [open, setOpen] = useOpen(msg);
  if (!msg || !open) return null;
  const text = typeof msg === 'string' && type === 'error' ? msg.replace(/\.+$/, '') : msg;
  return <div className={`f-notice ${type}`} role="status"><Ico type={type} /><span>{text}</span><Close type={type} onClick={() => { setOpen(false); onClose?.(); }} /></div>;
}

// Banner kết quả nằm trong trang. variant 'big' = chấm than tròn lớn (Figma "Không tìm thấy học viên phù hợp")
export function Alert({ type = 'error', msg, sub, onClose, big, className = '' }) {
  const [open, setOpen] = useOpen(msg);
  if (!msg || !open) return null;
  const text = typeof msg === 'string' && type === 'error' ? msg.replace(/\.+$/, '') : msg;
  return (
    <div className={`f-alert ${type} ${big ? 'big' : ''} ${className}`} role={type === 'error' ? 'alert' : 'status'}>
      <Ico type={type} />
      <div className="tx"><div className="m">{text}</div>{sub && <div className="s">{sub}</div>}</div>
      <Close type={type} onClick={() => { setOpen(false); onClose?.(); }} />
    </div>
  );
}

export function PageHead({ crumbs = [], title, notice, onCloseNotice }) {
  return (
    <div className="f-head">
      <div>
        <div className="crumbs">{crumbs.map((c, i) => <span key={c}>{i > 0 && ' > '}{i === crumbs.length - 1 ? <b>{c}</b> : c}</span>)}</div>
        <h1 className="page-title">{title}</h1>
      </div>
      {notice && <Notice {...notice} onClose={onCloseNotice} />}
    </div>
  );
}

export const FCard = ({ title, children, className = '', right, ...p }) => (
  <section className={`f-card ${className}`} {...p}>
    {(title || right) && <div className="f-card-h"><h2>{title}</h2>{right}</div>}
    {children}
  </section>
);

export const Tiles = ({ items, cols = 3 }) => (
  <div className="f-tiles" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
    {items.filter(Boolean).map(([k, v]) => <div key={k} className="f-tile"><div className="k">{k}</div><div className="v">{v ?? '—'}</div></div>)}
  </div>
);

export const Pill = ({ children, tone }) => <span className={`f-pill ${tone || STATUS_TONE[children] || 'neutral'}`}>{children}</span>;

// Bảng kiểu Figma: tiêu đề nền xanh nhạt, cột cuối "Hành động" với liên kết "Chọn"
export function FTable({ cols, rows, rowKey = 'id', selected, onRow, empty, pageSize = 8 }) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const cur = rows.slice((page - 1) * pageSize, page * pageSize);
  return (
    <>
      <div className="f-table">
        <table>
          <thead><tr>{cols.map((c) => <th key={c.h} style={{ width: c.w }}>{c.h}</th>)}</tr></thead>
          <tbody>
            {cur.length === 0 && <tr><td colSpan={cols.length} className="f-empty-cell">{empty}</td></tr>}
            {cur.map((r) => {
              const k = typeof rowKey === 'function' ? rowKey(r) : r[rowKey];
              return <tr key={k} className={`${selected === k ? 'sel' : ''} ${onRow ? 'click' : ''}`} onClick={onRow ? () => onRow(r) : undefined}>{cols.map((c) => <td key={c.h} className={c.b ? 'b' : ''}>{c.r ? c.r(r) : r[c.k]}</td>)}</tr>;
            })}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="pager">
          <span>Trang {page}/{pages}</span>
          <button disabled={page === 1} onClick={() => setPage(page - 1)} aria-label="Trang trước">‹</button>
          {Array.from({ length: pages }, (_, i) => <button key={i} className={page === i + 1 ? 'on' : ''} onClick={() => setPage(i + 1)}>{i + 1}</button>)}
          <button disabled={page === pages} onClick={() => setPage(page + 1)} aria-label="Trang sau">›</button>
        </div>
      )}
    </>
  );
}
export const PickLink = ({ children = 'Chọn', onClick, disabled }) => (
  disabled ? <span className="f-pick off">{children}</span> : <button className="f-pick" onClick={(e) => { e.stopPropagation(); onClick?.(); }}>{children}</button>
);
// Ô trống giữa khung (Figma: dấu + tròn + dòng chữ)
export const EmptyPlus = ({ children, style }) => (
  <div className="f-emptyplus" style={style}><span className="plus">+</span><div>{children}</div></div>
);
export const Note = ({ children }) => <p className="f-note">{children}</p>;
