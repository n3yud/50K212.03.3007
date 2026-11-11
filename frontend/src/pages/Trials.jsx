import { t as translate } from "../lib/i18n";
import React, { useState } from "react";
import { api, post, date, today, addDays, sessionLabel } from "../lib/api";
import {
  useData,
  Loader,
  Panel,
  Empty,
  Badge,
  Form,
  Input,
  Select,
  Field,
  Message,
} from "../components/ui";
export default function Trials({ user, navigate }) {
  const r = useData("/trials"),
    sessions = useData(
      "/sessions?from=" + today() + "&to=" + addDays(today(), 60),
    );
  const [selected, setSelected] = useState(""),
    [filter, setFilter] = useState(""),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const ops = ["Trợ lý", "Quản lý"].includes(user.role),
    parent = user.role === "Phụ huynh",
    teacher = user.role === "Giáo viên";
  const list = (r.data || []).filter((t) => !filter || t.status === filter);
  const t = list.find((x) => x.id === selected) || list[0];
  async function act(action, body = {}) {
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const result = await post("/trials/" + t.id + "/" + action, body);
      setMessage(result.message);
      r.reload();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const matching = (sessions.data || []).filter(
    (s) => s.program === t?.program,
  );
  return (
    <>
      <div className="toolbar">
        <Select
          label="Trạng thái đơn"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          options={[
            {
              value: "",
              label: "Tất cả",
            },
            "Chờ tiếp nhận",
            "Đã tiếp nhận",
            "Chờ xếp ca học thử",
            "Chờ phụ huynh xác nhận",
            "Chờ duyệt ca học thử",
            "Đã xếp ca",
            "Đã hoàn thành",
            "Đã tư vấn",
          ]}
        />
        {parent && (
          <p className="note">
            {translate(
              "Đăng ký cho bé tiếp theo qua biểu mẫu học thử tại trang chào mừng.",
            )}
          </p>
        )}
      </div>
      <Message>{message}</Message>
      <Message error>{error}</Message>
      <Loader resource={r}>
        {list.length ? (
          <div className="split">
            <Panel className="list">
              <h2>
                {translate("Đơn học thử (")}
                {list.length})
              </h2>
              {list.map((x) => (
                <button
                  key={x.id}
                  className={"item " + (x.id === t?.id ? "active" : "")}
                  onClick={() => setSelected(x.id)}
                >
                  <strong>{x.studentName}</strong>
                  <small>{date(x.birthDate)}</small>
                  <Badge>{x.status}</Badge>
                </button>
              ))}
            </Panel>
            <Panel>
              {t && (
                <>
                  <h2>{translate("Thông tin đơn đăng ký")}</h2>
                  <Badge>{t.status}</Badge>
                  <dl className="details">
                    <div>
                      <dt>{translate("Họ tên học viên")}</dt>
                      <dd>{t.studentName}</dd>
                    </div>
                    <div>
                      {ops && (
                        <>
                          <dt>{translate("Số điện thoại phụ huynh")}</dt>
                          <dd>{t.phone}</dd>
                        </>
                      )}
                    </div>
                    <div>
                      <dt>{translate("Ngày sinh")}</dt>
                      <dd>{date(t.birthDate)}</dd>
                    </div>
                    <div>
                      <dt>{translate("Khung giờ mong muốn")}</dt>
                      <dd>{t.desiredTime}</dd>
                    </div>
                    <div>
                      <dt>{translate("Thời điểm đăng ký")}</dt>
                      <dd>{date(t.createdAt)}</dd>
                    </div>
                    <div>
                      <dt>{translate("Chương trình học")}</dt>
                      <dd>{translate(t.program)}</dd>
                    </div>
                    <div>
                      <dt>{translate("Lịch học thử")}</dt>
                      <dd>
                        {t.sessionId
                          ? sessionLabel(
                              t.session ||
                                (sessions.data || []).find(
                                  (s) => s.id === t.sessionId,
                                ) || {
                                  name: "Đang tải lịch đã xếp",
                                },
                            )
                          : "Chờ xếp ca"}
                      </dd>
                    </div>
                  </dl>
                  <fieldset disabled={busy}>
                    {ops && t.status === "Chờ tiếp nhận" && (
                      <button onClick={() => act("accept")}>
                        {translate("Tiếp nhận")}
                      </button>
                    )}
                    {ops &&
                      ["Đã tiếp nhận", "Chờ xếp ca học thử"].includes(
                        t.status,
                      ) && (
                        <Form
                          submit="Gửi đề xuất cho phụ huynh"
                          onSubmit={(d) => act("propose", d)}
                        >
                          <Select
                            label="Ca học thử phù hợp"
                            name="sessionId"
                            required
                            options={[
                              {
                                value: "",
                                label: "Chọn ca học",
                              },
                              ...matching.map((s) => ({
                                value: s.id,
                                label: sessionLabel(s),
                              })),
                            ]}
                          />
                          {!matching.length && (
                            <Message>
                              {translate("Hiện chưa có ca học thử phù hợp.")}
                            </Message>
                          )}
                        </Form>
                      )}
                    {parent && t.status === "Chờ phụ huynh xác nhận" && (
                      <button onClick={() => act("confirm")}>
                        {translate("Xác nhận lịch")}
                      </button>
                    )}
                    {user.role === "Quản lý" &&
                      t.status === "Chờ duyệt ca học thử" && (
                        <div className="actions">
                          <button
                            onClick={() =>
                              act("approve", {
                                approve: true,
                              })
                            }
                          >
                            {translate("Phê duyệt ca học thử")}
                          </button>
                          <button
                            className="danger"
                            onClick={() =>
                              act("approve", {
                                approve: false,
                              })
                            }
                          >
                            {translate("Không duyệt")}
                          </button>
                        </div>
                      )}
                    {teacher && t.status === "Đã xếp ca" && (
                      <Form
                        key={t.id}
                        submit="Lưu đánh giá năng lực"
                        onSubmit={(d) => act("evaluate", d)}
                      >
                        <Input label="Nét vẽ" name="lines" required />
                        <Input label="Màu sắc" name="colors" required />
                        <Input
                          label="Khả năng tiếp thu"
                          name="learning"
                          required
                        />
                      </Form>
                    )}
                    {t.lines && (
                      <>
                        <h3>{translate("Đánh giá năng lực")}</h3>
                        <p>
                          {translate("Nét vẽ:")}
                          {t.lines}
                        </p>
                        <p>
                          {translate("Màu sắc:")}
                          {t.colors}
                        </p>
                        <p>
                          {translate("Khả năng tiếp thu:")}
                          {t.learning}
                        </p>
                      </>
                    )}
                    {ops &&
                      ["Đã hoàn thành", "Đã tư vấn"].includes(t.status) && (
                        <Form
                          key={t.id}
                          submit="Lưu kết quả tư vấn"
                          onSubmit={(d) => act("consult", d)}
                        >
                          <Input
                            label="Lộ trình đề xuất"
                            name="roadmap"
                            required
                            defaultValue={t.roadmap || ""}
                          />
                          <Select
                            label="Quyết định của phụ huynh"
                            name="decision"
                            defaultValue={t.decision || "Chưa quyết định"}
                            options={[
                              "Đăng ký chính thức",
                              "Chưa quyết định",
                              "Không đăng ký",
                            ]}
                          />
                          <Field label="Ghi chú nội bộ">
                            <textarea
                              name="internalNote"
                              defaultValue={t.internalNote || ""}
                            />
                          </Field>
                        </Form>
                      )}
                    {parent && t.roadmap && (
                      <>
                        <h3>{translate("Lộ trình đề xuất")}</h3>
                        <p>{t.roadmap}</p>
                      </>
                    )}
                    {ops && t.decision === "Đăng ký chính thức" && (
                      <div className="actions">
                        <button
                          className="secondary"
                          onClick={() => navigate("students")}
                        >
                          {translate("Tạo hồ sơ từ đơn học thử")}
                        </button>
                      </div>
                    )}
                  </fieldset>
                </>
              )}
            </Panel>
          </div>
        ) : (
          <Empty>{translate("Bạn chưa có đơn học thử nào phù hợp.")}</Empty>
        )}
      </Loader>
    </>
  );
}
