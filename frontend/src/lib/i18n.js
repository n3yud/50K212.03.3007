import english from "./en.json";
let language = localStorage.getItem("NNN.language") || "vi";
export const getLanguage = () => language;
export function setLanguage(value) {
  language = value === "en" ? "en" : "vi";
  localStorage.setItem("NNN.language", language);
  document.documentElement.lang = language;
  window.dispatchEvent(new Event("nnn-language"));
}
export function t(value) {
  if (typeof value !== "string" || language === "vi") return value;
  if (english[value]) return english[value];
  for (const prefix of ["Chưa đủ ảnh (", "Chưa đủ nhận xét (", "Đã lưu lúc "])
    if (value.startsWith(prefix))
      return (english[prefix] ?? prefix) + value.slice(prefix.length);
  return value;
}
