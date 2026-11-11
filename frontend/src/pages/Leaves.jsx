import { t as translate } from "../lib/i18n";
import React, { useState } from "react";
import { api, post, date, today, addDays, sessionLabel } from "../lib/api";
import {
  useData,
  Loader,
  Panel,
  Table,
  Input,
  Select,
  Form,
  Modal,
  Badge,
  Message,
  Empty,
  Field,
} from "../components/ui";
export default function Leaves({ user }) {
  const r = useData("/leaves"),
    students = useData("/students"),
    sessions = useData(
      "/sessions?from=" + addDays(today(), -30) + "&to=" + addDays(today(), 60),
    );
  const [modal, setModal] = useState(null),
    [choices, setChoices] = useState([]),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [studentId, setStudentId] = useState("");
  const ops = ["Trợ lý", "Quản lý"].includes(user.role);
  async function act(l, action, body = {}) {
    setError("");
    try {
      const result = await post("/leaves/" + l.id + "/" + action, body);
      setMessage(result.message);
      r.reload();
    } catch (e) {
      setError(e.message);
    }
  }
  async function choose(l) {
    setError("");
    try {
      const data = await api("/leaves/" + l.id + "/available");
      setChoices(data);
      setModal({
        type: "register",
        leave: l,
      });
    } catch (e) {
      setError(e.message);
    }
  }
  return (
    <>
      <div className="toolbar">
        <Select
          label="Học viên"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          options={[
            {
              value: "",
              label: "Tất cả học viên",
            },
            ...(students.data || []).map((s) => ({
              value: s.id,
              label: s.name,
            })),
          ]}
        />
        <button
          onClick={() =>
            setModal({
              type: "leave",
            })
          }
        >
          {ops ? "Ghi nhận lịch nghỉ" : "Gửi yêu cầu xin nghỉ"}
        </button>
      </div>
      <Message>{message}</Message>
      <Message error>{error}</Message>
      <Loader resource={r}>
        <Panel>
          <Table
            rows={(r.data || []).filter(
              (l) => !studentId || l.studentId === studentId,
            )}
            columns={[
              {
                label: "Học viên",
                key: "studentName",
              },
              {
                label: "Ca nghỉ",
                render: (l) => date(l.date),
              },
              {
                label: "Hạn học bù",
                render: (l) => date(l.deadline),
              },
              {
                label: "Trạng thái",
                render: (l) => <Badge>{l.status}</Badge>,
              },
              {
                label: "Ca bù đã chọn",
                render: (l) =>
                  l.makeUpSessionId
                    ? sessionLabel(
                        (sessions.data || []).find(
                          (s) => s.id === l.makeUpSessionId,
                        ) || {
                          name: "Ngoài khoảng ngày đang xem",
                        },
                      )
                    : "Chưa chọn ca",
              },
              {
                label: "Thao tác",
                render: (l) => (
                  <>
                    {l.status === "Chờ xếp lịch bù" && (
                      <button onClick={() => choose(l)}>
                        {translate("Chọn ca bù")}
                      </button>
                    )}
                    {ops && l.status === "Đã đăng ký học bù" && (
                      <button onClick={() => act(l, "submit")}>
                        {translate("Trình duyệt")}
                      </button>
                    )}
                    {user.role === "Quản lý" && l.status === "Chờ duyệt" && (
                      <>
                        <button
                          onClick={() =>
                            act(l, "approve", {
                              approve: true,
                            })
                          }
                        >
                          {translate("Duyệt")}
                        </button>
                        <button
                          className="danger"
                          onClick={() =>
                            act(l, "approve", {
                              approve: false,
                            })
                          }
                        >
                          {translate("Không duyệt")}
                        </button>
                      </>
                    )}
                    {user.role === "Phụ huynh" &&
                      [
                        "Đã đăng ký học bù",
                        "Chờ duyệt",
                        "Đã xếp lịch bù",
                      ].includes(l.status) && (
                        <button
                          className="danger"
                          onClick={() =>
                            setModal({
                              type: "cancel",
                              leave: l,
                            })
                          }
                        >
                          {translate("Hủy ca bù")}
                        </button>
                      )}
                  </>
                ),
              },
            ]}
          />
        </Panel>
      </Loader>
      {modal && (
        <Modal
          title={
            modal.type === "leave"
              ? "Ghi nhận lịch nghỉ"
              : modal.type === "cancel"
                ? "Hủy ca học bù"
                : "Đăng ký ca học bù"
          }
          onClose={() => setModal(null)}
        >
          {modal.type === "leave" && (
            <LeaveForm
              students={students.data || []}
              defaultStudentId={studentId}
              ops={ops}
              done={() => {
                setModal(null);
                r.reload();
                setMessage("Gửi yêu cầu xin nghỉ thành công!");
              }}
            />
          )}
          {modal.type === "register" && (
            <>
              <p>
                {translate("Học viên:")}
                <strong>{modal.leave.studentName}</strong>
              </p>
              <Message>
                {translate("Hạn học bù:")}
                {date(modal.leave.deadline)}
                {translate(
                  ". Đăng ký được giữ chỗ, lịch chính thức sau khi Quản lý duyệt.",
                )}
              </Message>
              {choices.length ? (
                <Form
                  submit="Gửi đăng ký"
                  onCancel={() => setModal(null)}
                  onSubmit={async (d) => {
                    const result = await post(
                      "/leaves/" + modal.leave.id + "/register",
                      d,
                    );
                    setMessage(result.message);
                    setModal(null);
                    r.reload();
                  }}
                >
                  <Select
                    label="Chọn ca học bù khả dụng"
                    name="sessionId"
                    required
                    options={choices.map((s) => ({
                      value: s.id,
                      label: sessionLabel(s),
                    }))}
                  />
                </Form>
              ) : (
                <Empty>
                  {translate(
                    "Hiện chưa có ca học bù phù hợp trong hạn học bù.",
                  )}
                </Empty>
              )}
            </>
          )}
          {modal.type === "cancel" && (
            <Form
              submit="Xác nhận hủy"
              onCancel={() => setModal(null)}
              onSubmit={async () => {
                const result = await post(
                  "/leaves/" + modal.leave.id + "/cancel",
                );
                setMessage(result.message);
                setModal(null);
                r.reload();
              }}
            >
              <p>
                {translate(
                  "Chỗ đã giữ được trả lại. Hạn học bù và số buổi còn lại giữ nguyên.",
                )}
              </p>
            </Form>
          )}
        </Modal>
      )}
    </>
  );
}
function LeaveForm({ students, defaultStudentId, ops, done }) {
  const [id, setId] = useState(defaultStudentId || students[0]?.id || "");
  const sessions = useData(
    "/sessions?studentId=" +
      id +
      "&from=" +
      addDays(today(), ops ? -30 : 0) +
      "&to=" +
      addDays(today(), 60),
  );
  return (
    <Form
      submit="Gửi yêu cầu"
      onSubmit={async (d) => {
        await post("/leaves", {
          ...d,
          studentId: id,
        });
        done();
      }}
    >
      <Select
        label="Học viên"
        value={id}
        onChange={(e) => setId(e.target.value)}
        options={students
          .filter((s) => s.status === "Đang học")
          .map((s) => ({
            value: s.id,
            label: s.name,
          }))}
      />
      <Select
        label="Ca học cần xin nghỉ"
        name="sessionId"
        required
        options={[
          {
            value: "",
            label: "Chọn ca học",
          },
          ...(sessions.data || []).map((s) => ({
            value: s.id,
            label: sessionLabel(s),
          })),
        ]}
      />
      <Field label="Lý do nghỉ (không bắt buộc)">
        <textarea name="reason" maxLength={1000} />
      </Field>
      <Message error>{sessions.error}</Message>
    </Form>
  );
}
