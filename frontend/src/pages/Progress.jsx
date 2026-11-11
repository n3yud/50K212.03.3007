import { t as translate } from "../lib/i18n";
import React, { useState } from "react";
import { api, post, date, today, addDays, sessionLabel } from "../lib/api";
import {
  useData,
  Loader,
  Panel,
  Select,
  Input,
  Form,
  Modal,
  Message,
  Empty,
  Field,
  Badge,
} from "../components/ui";
export default function Progress({ user }) {
  const students = useData("/students"),
    sessions = useData(
      "/sessions?from=" + addDays(today(), -60) + "&to=" + today(),
    );
  const [id, setId] = useState(""),
    [modal, setModal] = useState(null),
    [message, setMessage] = useState("");
  const studentId = id || students.data?.[0]?.id;
  const teacher = user.role === "Giáo viên",
    ops = ["Trợ lý", "Quản lý"].includes(user.role);
  return (
    <>
      <div className="toolbar">
        <Select
          label="Học viên"
          value={studentId || ""}
          onChange={(e) => setId(e.target.value)}
          options={[
            {
              value: "",
              label: "Chọn học viên",
            },
            ...(students.data || []).map((s) => ({
              value: s.id,
              label: s.name + " · " + s.program,
            })),
          ]}
        />
        {studentId && teacher && (
          <>
            <button onClick={() => setModal("artwork")}>
              {translate("Đăng tải tác phẩm")}
            </button>
            <button className="secondary" onClick={() => setModal("review")}>
              {translate("Nhập nhận xét")}
            </button>
          </>
        )}
        {studentId && ops && (
          <button onClick={() => setModal("progress")}>
            {translate("Ghi nhận tiến độ")}
          </button>
        )}
      </div>
      <Message>{message}</Message>
      <Message error>{students.error}</Message>
      {studentId ? (
        <History key={studentId + message} id={studentId} />
      ) : (
        <Empty>{translate("Tài khoản chưa có học viên liên kết.")}</Empty>
      )}
      {ops && <NeedsEvaluation />}
      {modal && (
        <Modal
          title={
            modal === "artwork"
              ? "Đăng tải tác phẩm"
              : modal === "review"
                ? "Nhận xét chuyên môn"
                : "Ghi nhận tiến độ học viên"
          }
          onClose={() => setModal(null)}
        >
          <Form
            submit={modal === "artwork" ? "Đăng tải" : "Lưu"}
            onCancel={() => setModal(null)}
            onSubmit={async (d) => {
              if (modal === "artwork") {
                const body = new FormData();
                body.append("studentId", studentId);
                body.append("sessionId", d.sessionId);
                body.append("file", d.file);
                await api("/artworks", {
                  method: "POST",
                  body,
                });
              } else
                await post(
                  "/progress" + (modal === "review" ? "/review" : ""),
                  {
                    ...d,
                    studentId,
                  },
                );
              setModal(null);
              setMessage(
                "Đã lưu lúc " + new Date().toLocaleTimeString("vi-VN"),
              );
            }}
          >
            <Select
              label="Ca học"
              name="sessionId"
              required
              options={[
                {
                  value: "",
                  label: "Chọn ca đã hoàn thành",
                },
                ...(sessions.data || [])
                  .filter((s) => s.closed)
                  .map((s) => ({
                    value: s.id,
                    label: sessionLabel(s),
                  })),
              ]}
            />
            {modal === "artwork" ? (
              <Input
                label="Ảnh tác phẩm (JPEG/PNG, tối đa 5MB)"
                name="file"
                type="file"
                accept="image/jpeg,image/png"
                required
              />
            ) : modal === "review" ? (
              <>
                <Input label="Nét vẽ" name="lines" required />
                <Input label="Màu sắc" name="colors" required />
                <Input label="Khả năng tiếp thu" name="learning" required />
              </>
            ) : (
              <>
                <Input
                  label="Ngày đánh giá"
                  name="evaluationDate"
                  type="date"
                  required
                  defaultValue={today()}
                />
                <Select
                  label="Tình trạng tiến độ"
                  name="status"
                  options={["Đúng tiến độ", "Chậm tiến độ"]}
                />
                <Field label="Nhận xét tiến độ" required>
                  <textarea name="note" required />
                </Field>
              </>
            )}
          </Form>
        </Modal>
      )}
    </>
  );
}
function History({ id }) {
  const r = useData("/progress/" + id);
  return (
    <Loader resource={r}>
      <Panel>
        <h2>{translate("Nhật ký học tập")}</h2>
        {!r.data?.artworks.length && !r.data?.reviews.length ? (
          <Empty>{translate("Nhật ký học tập của bé chưa có nội dung.")}</Empty>
        ) : (
          <>
            <div className="artwork-grid">
              {r.data?.artworks.map((a) => (
                <a key={a.id} href={a.url} target="_blank" rel="noreferrer">
                  <img
                    src={a.url + "?thumbnail=true"}
                    alt={"Tác phẩm ngày " + date(a.createdAt)}
                    loading="lazy"
                  />
                  <small>{date(a.createdAt)}</small>
                </a>
              ))}
            </div>
            {r.data?.reviews.map((review) => (
              <article className="panel" key={review.id}>
                <strong>{date(review.createdAt)}</strong>
                <p>
                  {translate("Nét vẽ:")}
                  {review.lines}
                </p>
                <p>
                  {translate("Màu sắc:")}
                  {review.colors}
                </p>
                <p>
                  {translate("Khả năng tiếp thu:")}
                  {review.learning}
                </p>
              </article>
            ))}
          </>
        )}
        <h2>{translate("Lịch sử tiến độ")}</h2>
        {r.data?.progress.length ? (
          r.data.progress.map((p) => (
            <article key={p.id}>
              <p>
                {date(p.evaluationDate)} · <Badge>{p.status}</Badge>
              </p>
              <p>{p.note}</p>
            </article>
          ))
        ) : (
          <Empty>{translate("Học viên chưa có lịch sử tiến độ.")}</Empty>
        )}
      </Panel>
    </Loader>
  );
}
function NeedsEvaluation() {
  const r = useData("/progress/needs-evaluation");
  return (
    <Panel>
      <h2>{translate("Học viên cần đánh giá")}</h2>
      <Loader resource={r}>
        {r.data?.length ? (
          <>
            <button
              className="secondary"
              onClick={async () => {
                const blob = await api("/progress/needs-evaluation/export");
                download(blob, "hoc-vien-can-danh-gia.xlsx");
              }}
            >
              {translate("Xuất Excel")}
            </button>
            {r.data.map((s) => (
              <p key={s.id}>
                {s.name} · {s.program}
              </p>
            ))}
          </>
        ) : (
          <Empty>
            {translate("Hiện tại không có học viên nào cần đánh giá.")}
          </Empty>
        )}
      </Loader>
    </Panel>
  );
}
export function download(blob, name) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
