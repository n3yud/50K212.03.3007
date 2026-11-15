import { useEffect, useId, useState } from 'react';
import { STATUS_TONE } from '../lib/format';
import { IconEye, IconEyeOff, IconInfo, IconUser } from './icons';

export const Button = ({ variant = '', size = '', block, className = '', ...p }) => <button type="button" className={`btn ${variant} ${size} ${block ? 'block' : ''} ${className}`} {...p} />;

export function Field({ label, required, error, hint, children, className = '' }) {
  const id = useId();
  const child = children && typeof children === 'object' && children.type ? { ...children, props: { ...children.props, id } } : children;
  return (
    <div className={`field ${error ? 'invalid' : ''} ${className}`}>
      {label && <label htmlFor={id}>{label}{required && <span className="req">*</span>}</label>}
      {child}
      {error ? <div className="field-error" role="alert">{error}</div> : hint ? <div className="field-hint">{hint}</div> : null}
    </div>
  );
}
export const Input = (p) => <input className="input" {...p} />;
export const Textarea = (p) => <textarea className="textarea" {...p} />;
export const Select = ({ options = [], placeholder, value, ...p }) => (
  <select className="select" value={value ?? ''} {...p}>
    {placeholder !== undefined && <option value="">{placeholder}</option>}
    {options.map((o) => (typeof o === 'object' ? <option key={o.value} value={o.value}>{o.label}</option> : <option key={o} value={o}>{o}</option>))}
  </select>
);
export function PasswordInput(p) {
  const [show, setShow] = useState(false);
  return (
    <div className="pw">
      <input className="input" type={show ? 'text' : 'password'} {...p} />
      <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>{show ? <IconEyeOff /> : <IconEye />}</button>
    </div>
  );
}
export function CheckChips({ options, value, onChange }) {
  const toggle = (v) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  return (
    <div className="check-row">
      {options.map((o) => (
        <label key={o.value} className={`chip-check ${value.includes(o.value) ? 'on' : ''}`}>
          <input type="checkbox" checked={value.includes(o.value)} onChange={() => toggle(o.value)} />{o.label}
        </label>
      ))}
    </div>
  );
}
export const Badge = ({ tone, children }) => <span className={`badge ${tone || STATUS_TONE[children] || 'neutral'}`}>{children}</span>;
export const Card = ({ title, sub, children, className = '', ...p }) => (
  <section className={`card ${className}`} {...p}>{title && <h2 className="card-title">{title}</h2>}{sub && <p className="card-sub">{sub}</p>}{children}</section>
);
export const Empty = ({ children }) => <div className="empty">{children}</div>;
export const Loading = () => <div className="empty" role="status">Đang tải dữ liệu…</div>;
export const ErrorBox = ({ error, onRetry }) => <div className="empty" role="alert">{error?.message || 'Hiện tại đang có sự cố, vui lòng thử lại sau'} {onRetry && <button className="link-btn" onClick={onRetry}>Thử lại</button>}</div>;
export const Async = ({ q, children, empty }) => {
  if (q.error) return <ErrorBox error={q.error} onRetry={q.reload} />;
  if (q.data == null) return <Loading />; // chưa có dữ liệu (đang tải hoặc vừa đổi tham số)
  if (empty && (!q.data || q.data.length === 0)) return <Empty>{empty}</Empty>;
  return children(q.data);
};
export const InfoLine = ({ children }) => <div className="info-line"><IconInfo size={16} />{children}</div>;
export const Summary = ({ children }) => <div className="summary-bar"><IconUser size={20} /><span>{children}</span></div>;
export const DL = ({ rows }) => <div className="dl">{rows.map(([k, v]) => <div key={k}><span className="k">{k}</span><span>{v}</span></div>)}</div>;

export function Modal({ title, onClose, children, actions }) {
  useEffect(() => { const f = (e) => e.key === 'Escape' && onClose?.(); window.addEventListener('keydown', f); return () => window.removeEventListener('keydown', f); }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <h3>{title}</h3>{children}
        {actions && <div className="actions">{actions}</div>}
      </div>
    </div>
  );
}
export function Confirm({ title, children, onYes, onNo, yes = 'Xác nhận', no = 'Hủy', danger, busy }) {
  return <Modal title={title} onClose={onNo} actions={<><Button variant="secondary" onClick={onNo}>{no}</Button><Button variant={danger ? 'danger-outline' : ''} onClick={onYes} disabled={busy}>{yes}</Button></>}>{children}</Modal>;
}

// Bảng có phân trang (mặc định 8 dòng/trang)
export function Table({ columns, rows, rowKey = 'id', selected, onRow, pageSize = 8, empty = 'Không có dữ liệu' }) {
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [rows?.length]);
  const pages = Math.max(1, Math.ceil((rows?.length || 0) / pageSize));
  const cur = (rows || []).slice((page - 1) * pageSize, page * pageSize);
  return (
    <>
      <div className="table-wrap">
        <table className="tbl">
          <thead><tr>{columns.map((c) => <th key={c.header} style={{ width: c.width, color: '#60747E', ...c.headerStyle }}>{c.header}</th>)}</tr></thead>
          <tbody>
            {cur.length === 0 && <tr><td colSpan={columns.length}><Empty>{empty}</Empty></td></tr>}
            {cur.map((r, i) => {
              const k = typeof rowKey === 'function' ? rowKey(r) : r[rowKey];
              return <tr key={k ?? i} className={`${onRow ? 'clickable' : ''} ${selected === k ? 'selected' : ''}`} onClick={onRow ? () => onRow(r) : undefined}>{columns.map((c) => <td key={c.header}>{c.render ? c.render(r) : r[c.key]}</td>)}</tr>;
            })}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="pager">
          <span>Trang {page}/{pages} · {rows.length} dòng</span>
          <button disabled={page === 1} onClick={() => setPage(page - 1)} aria-label="Trang trước">‹</button>
          {Array.from({ length: pages }, (_, i) => <button key={i} className={page === i + 1 ? 'on' : ''} onClick={() => setPage(i + 1)}>{i + 1}</button>)}
          <button disabled={page === pages} onClick={() => setPage(page + 1)} aria-label="Trang sau">›</button>
        </div>
      )}
    </>
  );
}
export const RadioDot = ({ on }) => <span className={`radio-dot ${on ? 'on' : ''}`} />;
export const Tabs = ({ items, value, onChange }) => <div className="tabs" role="tablist">{items.map((t) => <button key={t.value} role="tab" aria-selected={value === t.value} className={`tab ${value === t.value ? 'on' : ''}`} onClick={() => onChange(t.value)}>{t.label}</button>)}</div>;

// Tải file CSV (UTF-8 BOM để Excel đọc đúng tiếng Việt)
export function downloadCsv(name, head, rows) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = '\ufeff' + [head, ...rows].map((r) => r.map(esc).join(',')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = name; a.click(); URL.revokeObjectURL(a.href);
}
