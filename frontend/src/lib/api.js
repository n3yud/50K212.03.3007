import { getLanguage } from "./i18n";
export async function api(path, options = {}) {
  const multipart = options.body instanceof FormData;
  let response;
  try {
    response = await fetch("/api" + path, {
      credentials: "same-origin",
      ...options,
      headers: {
        ...(!multipart && options.body
          ? { "Content-Type": "application/json" }
          : {}),
        ...options.headers,
      },
      body:
        options.body && !multipart
          ? JSON.stringify(options.body)
          : options.body,
    });
  } catch {
    const error = new Error(
      "Hiện tại đang có sự cố, ba mẹ đợi Ngôi Nhà Nhỏ một xíu nhé!",
    );
    error.offline = true;
    throw error;
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const error = new Error(
      body.message ||
        Object.values(body.errors || {})
          .flat()
          .join(" ") ||
        (response.status === 401
          ? "Vui lòng đăng nhập lại."
          : response.status === 403
            ? "Bạn không có quyền sử dụng chức năng này."
            : "Hiện tại đang có sự cố, vui lòng thử lại sau."),
    );
    error.status = response.status;
    throw error;
  }
  return response.headers.get("content-type")?.includes("json")
    ? response.json()
    : response.blob();
}
export const post = (path, body = {}) => api(path, { method: "POST", body });
export function today() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
export function addDays(value, days) {
  const d = new Date(value + "T12:00:00+07:00");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export const date = (value) =>
  value
    ? new Intl.DateTimeFormat(getLanguage() === "en" ? "en-GB" : "vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
      }).format(
        new Date(value.length === 10 ? value + "T12:00:00+07:00" : value),
      )
    : "—";
export const money = (value) =>
  value == null
    ? "Chưa cấu hình"
    : new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
      }).format(value);
export const sessionLabel = (s) =>
  `${date(s.date)} · ${s.start?.slice(0, 5)}–${s.end?.slice(0, 5)} · ${s.name}`;
