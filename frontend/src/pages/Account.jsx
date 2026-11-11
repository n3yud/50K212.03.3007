import { t as translate } from "../lib/i18n";
import React from "react";
import { post } from "../lib/api";
import { Panel, Form, Input } from "../components/ui";
export default function Account({ user }) {
  return (
    <Panel>
      <h2>{translate("Tài khoản của tôi")}</h2>
      <p>
        {user.name} · {user.role} · {user.login}
      </p>
      <Form
        submit="Đổi mật khẩu"
        onSubmit={async (d) => {
          if (d.newPassword !== d.confirm)
            throw new Error("Hai mật khẩu mới chưa khớp.");
          return post("/auth/password", d);
        }}
      >
        <Input
          label="Mật khẩu hiện tại"
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
    </Panel>
  );
}
