import { t as translate } from "../lib/i18n";
import React, { useState } from "react";
import { post, today, money } from "../lib/api";
import {
  useData,
  Loader,
  Panel,
  Input,
  Select,
  Table,
  Badge,
  Modal,
  Form,
  Message,
} from "../components/ui";
export default function Tuition({ user }) {
  const [month, setMonth] = useState(today().slice(0, 7)),
    [q, setQ] = useState(""),
    [status, setStatus] = useState(""),
    [confirm, setConfirm] = useState(null),
    [message, setMessage] = useState("");
  const r = useData("/tuition?month=" + month);
  const ops = ["Trợ lý", "Quản lý"].includes(user.role);
  return (
    <>
      <div className="toolbar">
        <Input
          label="Tháng"
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        />
        <Input
          label="Học viên"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Select
          label="Trạng thái học phí"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={[
            {
              value: "",
              label: "Tất cả",
            },
            "Đã thanh toán",
            "Chưa thanh toán",
          ]}
        />
      </div>
      <Message>{message}</Message>
      <Loader resource={r}>
        <Panel>
          <Table
            rows={(r.data || []).filter(
              (t) =>
                (!status || t.status === status) &&
                t.name.toLowerCase().includes(q.toLowerCase()),
            )}
            columns={[
              {
                label: "Học viên",
                key: "name",
              },
              {
                label: "Chương trình",
                key: "program",
              },
              {
                label: "Tháng",
                key: "month",
              },
              {
                label: "Học phí (VNĐ)",
                render: (t) => money(t.amount),
              },
              {
                label: "Trạng thái",
                render: (t) => <Badge>{t.status}</Badge>,
              },
              {
                label: "Số buổi còn lại",
                key: "remaining",
              },
              ...(ops
                ? [
                    {
                      label: "Thao tác",
                      render: (t) =>
                        t.status === "Chưa thanh toán" &&
                        t.studentStatus !== "Đã bảo lưu" ? (
                          <button onClick={() => setConfirm(t)}>
                            {translate("Ghi nhận học phí")}
                          </button>
                        ) : null,
                    },
                  ]
                : []),
            ]}
          />
        </Panel>
      </Loader>
      {confirm && (
        <Modal title="Ghi nhận học phí" onClose={() => setConfirm(null)}>
          <Form
            submit="Xác nhận đã thanh toán"
            onCancel={() => setConfirm(null)}
            onSubmit={async () => {
              const result = await post("/tuition", {
                studentId: confirm.id,
                month,
              });
              setMessage(result.message);
              setConfirm(null);
              r.reload();
            }}
          >
            <p>
              {confirm.name}
              {translate("· Tháng")}
              {month}
            </p>
            <p>
              {translate("Biểu phí:")}
              {money(confirm.amount)}
            </p>
            <Message>
              {translate(
                "Chỉ ghi nhận khoản phụ huynh đã thanh toán ngoài hệ thống.",
              )}
            </Message>
          </Form>
        </Modal>
      )}
    </>
  );
}
