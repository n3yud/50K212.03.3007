import { t as translate } from "../lib/i18n";
import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
export function useData(path, offlineKey = null) {
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [version, setVersion] = useState(0);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    api(path)
      .then((d) => {
        if (alive) {
          setData(d);
          if (offlineKey) localStorage.setItem(offlineKey, JSON.stringify(d));
        }
      })
      .catch((e) => {
        if (alive) {
          const cached =
            offlineKey && e.offline ? localStorage.getItem(offlineKey) : null;
          if (cached) setData(JSON.parse(cached));
          else setError(e.message);
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [path, version, offlineKey]);
  return {
    data,
    error,
    loading,
    reload: () => setVersion((v) => v + 1),
  };
}
export function Message({ children, error = false }) {
  return children ? (
    <div
      role={error ? "alert" : "status"}
      className={"message " + (error ? "error" : "")}
    >
      {translate(children)}
    </div>
  ) : null;
}
export function Field({ label, children, required = false, hint }) {
  return (
    <label className="field">
      <span>
        {translate(label)}
        {required && (
          <b className="required" aria-hidden="true">
            {" "}
            *
          </b>
        )}
      </span>
      {children}
      {hint && <small>{translate(hint)}</small>}
    </label>
  );
}
export function Input({ label, hint, ...props }) {
  return (
    <Field label={label} required={props.required} hint={hint}>
      <input
        aria-label={translate(label)}
        {...props}
        placeholder={translate(props.placeholder)}
      />
    </Field>
  );
}
export function Select({ label, options = [], hint, ...props }) {
  return (
    <Field label={label} required={props.required} hint={hint}>
      <select aria-label={translate(label)} {...props}>
        {options.map((o) => (
          <option key={o.value ?? o} value={o.value ?? o}>
            {translate(o.label ?? o)}
          </option>
        ))}
      </select>
    </Field>
  );
}
export function Panel({ children, className = "" }) {
  return <section className={"panel " + className}>{children}</section>;
}
export function Badge({ children }) {
  return (
    <span
      className={
        "badge " +
        (/Chờ|Chưa/.test(children)
          ? "waiting"
          : /Hết|Vắng|Chậm/.test(children)
            ? "danger"
            : "")
      }
    >
      {translate(children)}
    </span>
  );
}
export function Loader({ resource, children }) {
  return resource.loading ? (
    <p role="status">{translate("Đang tải dữ liệu…")}</p>
  ) : resource.error ? (
    <>
      <Message error>{resource.error}</Message>
      <button onClick={resource.reload}>{translate("Thử lại")}</button>
    </>
  ) : (
    children
  );
}
export function Empty({ children = "Chưa có dữ liệu phù hợp." }) {
  return <p className="empty">{translate(children)}</p>;
}
export function Table({ columns, rows, keyField = "id" }) {
  const [page, setPage] = useState(0);
  useEffect(() => setPage(0), [rows]);
  const size = 10,
    count = Math.ceil(rows.length / size);
  return rows.length ? (
    <>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.label}>{translate(c.label)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(page * size, (page + 1) * size).map((row, i) => (
              <tr key={row[keyField] ?? i}>
                {columns.map((c) => (
                  <td key={c.label}>
                    {c.render
                      ? c.render(row)
                      : ["program", "status"].includes(c.key)
                        ? translate(row[c.key])
                        : row[c.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {count > 1 && (
        <div className="pagination">
          <button disabled={!page} onClick={() => setPage((p) => p - 1)}>
            {translate("Trước")}
          </button>
          <span>
            {translate("Trang")}
            {page + 1}/{count}
          </span>
          <button
            disabled={page >= count - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            {translate("Sau")}
          </button>
        </div>
      )}
    </>
  ) : (
    <Empty />
  );
}
export function Modal({ title, children, onClose }) {
  useEffect(() => {
    const key = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", key);
    const previous = document.activeElement;
    const target = document.querySelector("dialog");
    target?.showModal();
    return () => {
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, []);
  return (
    <dialog onCancel={onClose}>
      <div className="dialog-head">
        <h2>{translate(title)}</h2>
        <button aria-label={translate("Đóng")} onClick={onClose}>
          {translate("×")}
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Form({ onSubmit, children, submit = "Lưu", onCancel }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        setError("");
        setMessage("");
        try {
          const result = await onSubmit(
            Object.fromEntries(new FormData(e.currentTarget)),
          );
          if (result?.message) setMessage(result.message);
        } catch (err) {
          setError(err.message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <fieldset disabled={busy}>
        {children}
        <Message error>{error}</Message>
        <Message>{message}</Message>
        <div className="actions">
          <button type="submit">
            {translate(busy ? "Đang lưu…" : submit)}
          </button>
          {onCancel && (
            <button type="button" className="secondary" onClick={onCancel}>
              {translate("Hủy")}
            </button>
          )}
        </div>
      </fieldset>
    </form>
  );
}
