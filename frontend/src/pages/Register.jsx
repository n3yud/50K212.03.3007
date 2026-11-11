import LanguageSwitch from "../components/LanguageSwitch";
import { t as translate } from "../lib/i18n";
import React, { useState } from "react";
import { post } from "../lib/api";
import { Form, Input, Panel, Message } from "../components/ui";
import { Brand } from "../App";
export default function Register({ back, login }) {
  const [count, setCount] = useState(1),
    [success, setSuccess] = useState("");
  return (
    <div className="registration-screen" data-node-id="1:5119">
      <header>
        <Brand mobile role="Phụ huynh" />
        <span className="avatar">{translate("PH")}</span>
        <LanguageSwitch />
      </header>
      <main>
        <h1>
          <button className="ghost" aria-label="Quay lại" onClick={back}>
            ‹
          </button>
          {translate("Đăng ký học thử")}
        </h1>
        {success ? (
          <Panel>
            <Message>{success}</Message>
            <button onClick={login}>{translate("Đăng nhập")}</button>
            <button className="ghost" onClick={back}>
              {translate("Về trang chào mừng")}
            </button>
          </Panel>
        ) : (
          <Panel>
            <Form
              submit="Đăng ký"
              onSubmit={async (d) => {
                const children = Array.from(
                  {
                    length: count,
                  },
                  (_, i) => ({
                    name: d["name" + i],
                    birthDate: d["birthDate" + i],
                    desiredTime: d["time" + i],
                  }),
                );
                const r = await post("/trials", {
                  phone: d.phone,
                  children,
                });
                setSuccess(r.message);
              }}
            >
              {Array.from(
                {
                  length: count,
                },
                (_, i) => (
                  <div key={i}>
                    <h2>
                      {translate("Thông tin học viên")}
                      {count > 1 ? " " + (i + 1) : ""}
                    </h2>
                    <Input
                      label="Họ và tên học viên"
                      name={"name" + i}
                      required
                      minLength={2}
                      maxLength={50}
                      placeholder="Nhập họ và tên"
                    />
                    <Input
                      label="Ngày sinh"
                      name={"birthDate" + i}
                      required
                      type="date"
                    />
                  </div>
                ),
              )}
              <h2>{translate("Thông tin phụ huynh")}</h2>
              <Input
                label="Số điện thoại phụ huynh"
                name="phone"
                required
                pattern="0[0-9]{9}"
                inputMode="tel"
                maxLength={10}
                placeholder="Nhập số điện thoại"
              />
              {Array.from(
                {
                  length: count,
                },
                (_, i) => (
                  <Input
                    key={i}
                    label={
                      count > 1
                        ? translate("Khung giờ mong muốn") + " " + (i + 1)
                        : "Khung giờ mong muốn"
                    }
                    name={"time" + i}
                    required
                    maxLength={500}
                    placeholder="Nhập thứ và khung giờ"
                    hint="Đây là nguyện vọng, lịch chính thức do Lớp vẽ sắp xếp"
                  />
                ),
              )}
              {count === 1 ? (
                <button
                  type="button"
                  className="secondary full"
                  onClick={() => setCount(2)}
                >
                  {translate("+ Thêm bé thứ hai")}
                </button>
              ) : (
                <button
                  type="button"
                  className="ghost"
                  onClick={() => setCount(1)}
                >
                  {translate("Bỏ bé thứ hai")}
                </button>
              )}
            </Form>
          </Panel>
        )}
      </main>
    </div>
  );
}
