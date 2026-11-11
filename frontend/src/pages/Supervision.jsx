import { t as translate } from "../lib/i18n";
import React, { useState } from "react";
import { api, post, date, today, addDays } from "../lib/api";
import {
  useData,
  Loader,
  Panel,
  Form,
  Input,
  Select,
  Table,
  Badge,
  Message,
} from "../components/ui";
import { download } from "./Progress";
export default function Supervision() {
  const [from, setFrom] = useState(addDays(today(), -7)),
    [to, setTo] = useState(today()),
    [query, setQuery] = useState("from=" + from + "&to=" + to),
    [teacher, setTeacher] = useState(""),
    [status, setStatus] = useState(""),
    [selected, setSelected] = useState([]),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const r = useData("/supervision?" + query);
  const rows = (r.data || []).filter(
    (x) =>
      (!teacher || x.teacherId === teacher) &&
      (!status ||
        (status === "overdue"
          ? x.overdue
          : x.missingArtworks === 0 &&
            x.missingReviews === 0 &&
            x.missingProgress === 0)),
  );
  async function remind(ids) {
    setError("");
    try {
      const result = await post("/supervision/remind", {
        sessionIds: ids,
      });
      setMessage(result.message);
      setSelected([]);
    } catch (e) {
      setError(e.message);
    }
  }
  return (
    <>
      <Panel>
        <h2>{translate("Bộ lọc")}</h2>
        <Form
          submit="Kiểm tra"
          onSubmit={() => setQuery("from=" + from + "&to=" + to)}
        >
          <div className="form-grid">
            <Input
              label="Từ ngày"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
            <Input
              label="Đến ngày"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
            <Select
              label="Giáo viên phụ trách"
              value={teacher}
              onChange={(e) => setTeacher(e.target.value)}
              options={[
                {
                  value: "",
                  label: "Tất cả",
                },
                ...[
                  ...new Map(
                    (r.data || []).map((x) => [
                      x.teacherId,
                      {
                        value: x.teacherId,
                        label: x.teacher,
                      },
                    ]),
                  ).values(),
                ],
              ]}
            />
            <Select
              label="Trạng thái cập nhật"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={[
                {
                  value: "",
                  label: "Tất cả",
                },
                {
                  value: "overdue",
                  label: "Quá hạn",
                },
                {
                  value: "complete",
                  label: "Đã cập nhật đầy đủ",
                },
              ]}
            />
          </div>
        </Form>
      </Panel>
      <Message>{message}</Message>
      <Message error>{error}</Message>
      <Loader resource={r}>
        <Panel>
          <h2>{translate("Danh sách ca học đã kết thúc")}</h2>
          <Table
            rows={rows}
            keyField="sessionId"
            columns={[
              {
                label: "Chọn",
                render: (x) =>
                  x.overdue && (
                    <input
                      aria-label={"Chọn ca " + x.className}
                      type="checkbox"
                      checked={selected.includes(x.sessionId)}
                      onChange={(e) =>
                        setSelected((a) =>
                          e.target.checked
                            ? [...a, x.sessionId]
                            : a.filter((id) => id !== x.sessionId),
                        )
                      }
                    />
                  ),
              },
              {
                label: "Lớp học",
                key: "className",
              },
              {
                label: "Ngày học",
                render: (x) => date(x.date),
              },
              {
                label: "Giáo viên",
                key: "teacher",
              },
              {
                label: "Có mặt",
                key: "present",
              },
              {
                label: "Ảnh tác phẩm",
                render: (x) => (
                  <Badge>
                    {x.missingArtworks
                      ? "Chưa đủ ảnh (" + x.missingArtworks + ")"
                      : "Đã đăng"}
                  </Badge>
                ),
              },
              {
                label: "Nhận xét",
                render: (x) => (
                  <Badge>
                    {x.missingReviews
                      ? "Chưa đủ nhận xét (" + x.missingReviews + ")"
                      : "Đã nhập"}
                  </Badge>
                ),
              },
              {
                label: "Tiến độ do Trợ lý ghi nhận",
                render: (x) => <span>{x.missingProgress ?? 0}</span>,
              },
              {
                label: "Tuân thủ",
                render: (x) => (
                  <Badge>
                    {x.overdue
                      ? "Quá hạn"
                      : x.lateCompletion
                        ? "Hoàn thành muộn"
                        : "Trong hạn"}
                  </Badge>
                ),
              },
              {
                label: "Thao tác",
                render: (x) =>
                  x.overdue ? (
                    <button onClick={() => remind([x.sessionId])}>
                      {translate("Gửi nhắc nhở")}
                    </button>
                  ) : null,
              },
            ]}
          />
        </Panel>
        <div className="actions">
          <button disabled={!selected.length} onClick={() => remind(selected)}>
            {translate("Gửi nhắc nhở các ca đã chọn")}
          </button>
          <button
            className="secondary"
            onClick={async () =>
              download(
                await api("/supervision/export?" + query),
                "giam-sat-tien-do.xlsx",
              )
            }
          >
            {translate("Xuất báo cáo Excel")}
          </button>
        </div>
      </Loader>
    </>
  );
}
