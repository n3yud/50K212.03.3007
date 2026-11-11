import LanguageSwitch from "./components/LanguageSwitch";
import { t as translate, getLanguage, setLanguage } from "./lib/i18n";
import React, { useEffect, useState } from "react";
import { api, post, date, today } from "./lib/api";
import { Form, Input, Message, Field } from "./components/ui";
import Trials from "./pages/Trials";
import Students from "./pages/Students";
import Classes from "./pages/Classes";
import Leaves from "./pages/Leaves";
import Schedule from "./pages/Schedule";
import Progress from "./pages/Progress";
import Tuition from "./pages/Tuition";
import Reports from "./pages/Reports";
import Supervision from "./pages/Supervision";
import Notifications from "./pages/Notifications";
import Register from "./pages/Register";
import Account from "./pages/Account";
import { watchSync } from "./lib/attendanceQueue";
export const operations = (u) => ["Trợ lý", "Quản lý"].includes(u.role);
export function Brand({ mobile = false, role = null }) {
  return (
    <div className={"brand " + (mobile ? "mobile-brand" : "")}>
      <span className={mobile ? "brand-mark small-mark" : "brand-mark"}>
        {mobile ? (
          <img src="/assets/parent-trial/74e34.svg" alt="" />
        ) : (
          <>
            <img src="/assets/admin-trial/7d92f.svg" alt="" />
            <img src="/assets/admin-trial/c1e64.svg" alt="" />
            <img src="/assets/admin-trial/ff01c.svg" alt="" />
          </>
        )}
      </span>
      <span>
        {role ? (
          <>
            <strong>Ngôi nhà nhỏ</strong>
            <small>{translate(role).toUpperCase()}</small>
          </>
        ) : (
          <>
            <small>{translate("LỚP VẼ")}</small>
            <strong>{translate("NGÔI NHÀ NHỎ")}</strong>
          </>
        )}
      </span>
    </div>
  );
}
function Login({ done, cancel }) {
  const [show, setShow] = useState(false),
    [help, setHelp] = useState(false);
  return (
    <div className="auth-screen" data-node-id="1:394">
      <header>
        <Brand mobile />
        <LanguageSwitch />
      </header>
      <main>
        <h1>{translate("Đăng nhập")}</h1>
        <Form
          submit="Đăng nhập"
          onCancel={cancel}
          onSubmit={async (d) => done(await post("/auth/login", d))}
        >
          <Input
            label="Tài khoản"
            name="login"
            required
            placeholder="ID, Email công việc hoặc số điện thoại"
            autoComplete="username"
          />
          <Field label="Mật khẩu" required>
            <div className="password">
              <input
                aria-label={translate("Mật khẩu")}
                required
                name="password"
                type={show ? "text" : "password"}
                placeholder={translate("Nhập mật khẩu")}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="ghost"
                aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                onClick={() => setShow(!show)}
              >
                <img
                  src="/assets/login/00231.svg"
                  alt=""
                  width="22"
                  height="22"
                />
              </button>
            </div>
          </Field>
          <button
            type="button"
            className="help-button"
            onClick={() => setHelp(!help)}
          >
            {translate("Quên mật khẩu?")}
          </button>
          {help && (
            <Message>
              {translate(
                "Phụ huynh vui lòng liên hệ Trợ lý để được hỗ trợ cấp lại mật khẩu. Nhân viên vui lòng liên hệ bộ phận Admin.",
              )}
            </Message>
          )}
        </Form>
      </main>
    </div>
  );
}
function Password({ done, cancel }) {
  return (
    <div className="auth-screen">
      <header>
        <Brand mobile />
        <LanguageSwitch />
      </header>
      <main>
        <h1>{translate("Đổi mật khẩu lần đầu")}</h1>
        <Message>
          {translate("Vui lòng thay mật khẩu tạm trước khi sử dụng.")}
        </Message>
        <Form
          submit="Đổi mật khẩu"
          onCancel={cancel}
          onSubmit={async (d) => {
            if (d.newPassword !== d.confirm)
              throw new Error("Hai mật khẩu mới chưa khớp.");
            const r = await post("/auth/password", d);
            done();
            return r;
          }}
        >
          <Input
            label="Mật khẩu tạm"
            name="currentPassword"
            type="password"
            required
            autoComplete="current-password"
          />
          <Input
            label="Mật khẩu mới"
            name="newPassword"
            type="password"
            minLength={8}
            maxLength={128}
            required
            autoComplete="new-password"
          />
          <Input
            label="Nhập lại mật khẩu mới"
            name="confirm"
            type="password"
            required
            autoComplete="new-password"
          />
        </Form>
      </main>
    </div>
  );
}
function Welcome({ navigate }) {
  const root = "/assets/node-1-267/";
  return (
    <main className="welcome" data-node-id="1:267">
      <LanguageSwitch />
      <img className="welcome-circle one" src={root + "47d41.svg"} alt="" />
      <img className="welcome-circle two" src={root + "0aa95.svg"} alt="" />
      <div className="welcome-logo">
        <img src={root + "3d5e0.svg"} alt="" />
        <p>{translate("LỚP VẼ")}</p>
        <h1>{translate("NGÔI NHÀ NHỎ")}</h1>
        <small>{translate("Nơi mỗi nét vẽ là một niềm vui")}</small>
      </div>
      <div className="welcome-art" aria-label="Giá vẽ và bảng màu">
        <img className="art-bg" src={root + "3e36e.svg"} alt="" />
        <img className="art-circle left" src={root + "edd92.svg"} alt="" />
        <img className="art-circle right" src={root + "ef5dd.svg"} alt="" />
        <img className="easel" src={root + "b24d1.svg"} alt="Giá vẽ" />
        <img className="palette" src={root + "7336a.svg"} alt="Bảng màu" />
        <img className="brush" src={root + "ee56c.svg"} alt="Cọ vẽ" />
        <img className="spark left" src={root + "5b513.svg"} alt="" />
        <img className="spark right" src={root + "8484a.svg"} alt="" />
      </div>
      <h2>{translate("Chào mừng ba mẹ!")}</h2>
      <p>
        {translate("Cùng bé khám phá thế giới sắc màu")}
        <br />
        {translate("qua những buổi học vẽ thật vui")}
      </p>
      <button onClick={() => navigate("register")}>
        {translate("Đăng ký học thử ngay")}
      </button>
      <p className="welcome-login">
        {translate("Đã có tài khoản?")}
        <br />
        <button className="help-button" onClick={() => navigate("login")}>
          {translate("Đăng nhập tại đây")}
        </button>
      </p>
    </main>
  );
}
const pageTitles = {
  account: "Tài khoản",
  dashboard: "Tổng quan",
  trials: "Quản lý học thử",
  students: "Hồ sơ học viên",
  classes: "Quản lý lớp học",
  leaves: "Nghỉ học và học bù",
  schedule: "Lịch học",
  progress: "Tiến độ học tập",
  tuition: "Tình trạng học phí",
  reports: "Báo cáo và thống kê",
  supervision: "Kiểm tra tiến độ review",
  notifications: "Thông báo",
  register: "Đăng ký học thử",
};
function menu(u) {
  if (operations(u))
    return [
      "dashboard",
      "trials",
      "students",
      "classes",
      "leaves",
      "schedule",
      "tuition",
      "progress",
      ...(u.role === "Quản lý" ? ["reports"] : []),
      "notifications",
    ];
  if (u.role === "Giáo viên")
    return ["schedule", "progress", "trials", "notifications"];
  if (u.role === "Giám sát") return ["supervision", "notifications"];
  return [
    "trials",
    "leaves",
    "schedule",
    "progress",
    "tuition",
    "notifications",
  ];
}
export default function App() {
  const [language, updateLanguage] = useState(getLanguage());
  const [syncErrors, setSyncErrors] = useState([]);
  useEffect(() => {
    const update = () => updateLanguage(getLanguage());
    window.addEventListener("nnn-language", update);
    return () => window.removeEventListener("nnn-language", update);
  }, []);
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
  const [user, setUser] = useState(null),
    [loading, setLoading] = useState(true),
    [page, setPage] = useState("welcome"),
    [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    api("/auth/me")
      .then((u) => {
        setUser(u);
        setPage(menu(u)[0]);
      })
      .catch((e) => {
        if (e.offline) {
          try {
            const u = JSON.parse(
              sessionStorage.getItem("NNN.teacher-session") || "null",
            );
            if (u?.role === "Giáo viên") {
              setUser(u);
              setPage("schedule");
            }
          } catch {}
        }
      })
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (user?.role === "Giáo viên") {
      sessionStorage.setItem("NNN.teacher-session", JSON.stringify(user));
      return watchSync(user.id, setSyncErrors);
    }
  }, [user?.id, user?.mustChangePassword]);
  const logout = async () => {
    await post("/auth/logout");
    sessionStorage.removeItem("NNN.teacher-session");
    if (user)
      for (const key of Object.keys(localStorage))
        if (
          key.startsWith("NNN.roster." + user.id) ||
          key.startsWith("NNN.schedule." + user.id)
        )
          localStorage.removeItem(key);
    setUser(null);
    setPage("welcome");
  };
  const navigate = (p) => {
    setPage(p);
    setMenuOpen(false);
    window.scrollTo(0, 0);
  };
  if (loading)
    return <p className="empty">{translate("Đang mở Ngôi Nhà Nhỏ…")}</p>;
  if (user?.mustChangePassword)
    return (
      <Password
        done={async () => setUser(await api("/auth/me"))}
        cancel={logout}
      />
    );
  if (!user) {
    if (page === "login")
      return (
        <Login
          cancel={() => navigate("welcome")}
          done={(u) => {
            setUser(u);
            navigate(menu(u)[0]);
          }}
        />
      );
    if (page === "register")
      return (
        <Register
          back={() => navigate("welcome")}
          login={() => navigate("login")}
        />
      );
    return <Welcome navigate={navigate} />;
  }
  const pages = [...menu(user), "account"];
  const current = pages.includes(page) ? page : pages[0];
  const mobile = ["Phụ huynh", "Giáo viên"].includes(user.role);
  const body = () => {
    const props = {
      user,
      navigate,
    };
    switch (current) {
      case "account":
        return <Account {...props} />;
      case "dashboard":
        return <Reports {...props} dashboard />;
      case "trials":
        return <Trials {...props} />;
      case "students":
        return <Students {...props} />;
      case "classes":
        return <Classes {...props} />;
      case "leaves":
        return <Leaves {...props} />;
      case "schedule":
        return <Schedule {...props} />;
      case "progress":
        return <Progress {...props} />;
      case "tuition":
        return <Tuition {...props} />;
      case "reports":
        return <Reports {...props} />;
      case "supervision":
        return <Supervision {...props} />;
      case "notifications":
        return <Notifications {...props} />;
      default:
        return null;
    }
  };
  return (
    <div className={mobile ? "app mobile-app" : "app admin-app"}>
      <aside className={menuOpen ? "open" : ""}>
        <Brand />
        <nav aria-label="Chức năng">
          {pages.map((p) => (
            <button
              key={p}
              className={p === current ? "active" : ""}
              aria-current={p === current ? "page" : undefined}
              onClick={() => navigate(p)}
            >
              {translate(pageTitles[p])}
            </button>
          ))}
        </nav>
        <div className="user-card">
          <span className="avatar">{user.name.slice(0, 2).toUpperCase()}</span>
          <div>
            <strong>{user.name}</strong>
            <small>{translate(user.role)}</small>
            <button className="help-button" onClick={logout}>
              {translate("Đăng xuất")}
            </button>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="app-header">
          <button
            className="menu-toggle ghost"
            aria-label="Mở chức năng"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            ☰
          </button>
          {mobile ? (
            <Brand mobile />
          ) : (
            <strong>{translate("HỆ THỐNG QUẢN LÝ LỚP VẼ")}</strong>
          )}
          <small>{mobile ? translate(user.role) : date(today())}</small>
          <LanguageSwitch />
        </header>
        <main className="app-content">
          <div className="breadcrumb">
            {translate("Ngôi Nhà Nhỏ ›")}
            {translate(user.role)} › {translate(pageTitles[current])}
          </div>
          <h1>{translate(pageTitles[current])}</h1>
          {syncErrors.length > 0 && (
            <Message error>{syncErrors.join(" ")}</Message>
          )}
          <div key={current}>{body()}</div>
        </main>
      </div>
      {mobile && (
        <nav className="bottom-nav" aria-label="Điều hướng nhanh">
          {(user.role === "Giáo viên"
            ? ["schedule", "progress", "trials", "notifications"]
            : ["trials", "leaves", "schedule", "notifications"]
          ).map((p, i) => (
            <button
              key={p}
              className={p === current ? "active" : ""}
              onClick={() => navigate(p)}
            >
              <img
                src={
                  "/assets/parent-trial/" +
                  ["122b3.svg", "1d9df.svg", "07274.svg", "4c93c.svg"][i]
                }
                alt=""
              />
              {translate(
                p === "trials"
                  ? "Học thử"
                  : p === "leaves"
                    ? "Xin nghỉ"
                    : pageTitles[p],
              )}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
