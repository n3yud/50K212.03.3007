import React, { useState } from "react";
import { post } from "../lib/api";
import { Modal, Form, Input, Message } from "./ui";
import { t as translate } from "../lib/i18n";
export default function ParentSupport({ close }) {
  const [result, setResult] = useState(null);
  return (
    <Modal title="Cấp mật khẩu tạm cho phụ huynh" onClose={close}>
      {result ? (
        <>
          <Message>{result.message}</Message>
          <p>
            {translate("Mật khẩu tạm")}: <code>{result.temporaryPassword}</code>
          </p>
          <button onClick={close}>{translate("Đóng")}</button>
        </>
      ) : (
        <Form
          submit="Cấp mật khẩu tạm"
          onCancel={close}
          onSubmit={async (d) =>
            setResult(
              await post("/support/parent-password", {
                phone: d.phone,
                identityVerified: d.verified === "on",
              }),
            )
          }
        >
          <Input
            label="Số điện thoại phụ huynh"
            name="phone"
            required
            pattern="0[0-9]{9}"
            inputMode="tel"
          />
          <label className="inline-check">
            <input type="checkbox" name="verified" required />
            {translate(
              "Đã xác minh danh tính phụ huynh qua kênh liên lạc ngoài hệ thống.",
            )}
          </label>
        </Form>
      )}
    </Modal>
  );
}
