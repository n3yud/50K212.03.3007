import { t as translate } from "../lib/i18n";
import React, { useState } from "react";
import { api, post, today, addDays } from "../lib/api";
import {
  useData,
  Loader,
  Panel,
  Table,
  Input,
  Select,
  Form,
  Modal,
  Message,
} from "../components/ui";
const days = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
export default function Classes() {
  const r = useData("/classes"),
    teachers = useData("/classes/teachers"),
    students = useData("/students?status=" + encodeURIComponent("Chờ xếp lớp"));
  const [modal, setModal] = useState(null),
    [q, setQ] = useState(""),
    [message, setMessage] = useState("");
  async function submit(d) {
    let result;
    if (modal.type === "edit") {
      const input = {
        ...d,
        effectiveFrom: d.effectiveFrom || null,
        weekday: Number(d.weekday),
        capacity: Number(d.capacity),
        start: d.start.length === 5 ? d.start + ":00" : d.start,
        end: d.end.length === 5 ? d.end + ":00" : d.end,
      };
      result = await api(
        "/classes" + (modal.row?.id ? "/" + modal.row.id : ""),
        {
          method: modal.row?.id ? "PUT" : "POST",
          body: input,
        },
      );
    } else
      result = await post("/classes/" + modal.row.id + "/" + modal.type, d);
    setModal(null);
    r.reload();
    students.reload();
    setMessage(result.message || "Đã lưu lớp học.");
  }
  return (
    <>
      <div className="toolbar">
        <Input
          label="Tìm lớp học"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button
          onClick={() =>
            setModal({
              type: "edit",
            })
          }
        >
          {translate("Tạo lớp học mới")}
        </button>
      </div>
      <Message>{message}</Message>
      <Loader resource={r}>
        <Panel>
          <Table
            rows={(r.data || []).filter((c) =>
              c.name.toLowerCase().includes(q.toLowerCase()),
            )}
            columns={[
              {
                label: "Tên lớp",
                key: "name",
              },
              {
                label: "Chương trình",
                key: "program",
              },
              {
                label: "Lịch học",
                render: (c) =>
                  `${days[c.weekday]} · ${c.start.slice(0, 5)}–${c.end.slice(0, 5)}`,
              },
              {
                label: "Sĩ số",
                render: (c) => c.students + "/" + c.capacity,
              },
              {
                label: "Giáo viên",
                render: (c) => c.teacher || "Chưa phân công",
              },
              {
                label: "Thao tác",
                render: (c) => (
                  <>
                    <button
                      className="secondary"
                      onClick={() =>
                        setModal({
                          type: "edit",
                          row: c,
                        })
                      }
                    >
                      {translate("Cập nhật")}
                    </button>
                    <button
                      className="secondary"
                      onClick={() =>
                        setModal({
                          type: "teacher",
                          row: c,
                        })
                      }
                    >
                      {translate("Phân công")}
                    </button>
                    <button
                      className="secondary"
                      onClick={() =>
                        setModal({
                          type: "enroll",
                          row: c,
                        })
                      }
                    >
                      {translate("Xếp học viên")}
                    </button>
                    <button
                      className="secondary"
                      onClick={() =>
                        setModal({
                          type: "sessions",
                          row: c,
                        })
                      }
                    >
                      {translate("Tạo ca theo lịch")}
                    </button>
                  </>
                ),
              },
            ]}
          />
        </Panel>
      </Loader>
      {modal && (
        <Modal
          title={modal.row?.name || "Tạo lớp học mới"}
          onClose={() => setModal(null)}
        >
          <Form onSubmit={submit} onCancel={() => setModal(null)}>
            {modal.type === "edit" && (
              <div className="form-grid">
                <Input
                  label="Tên lớp"
                  name="name"
                  required
                  defaultValue={modal.row?.name}
                />
                <Select
                  label="Chương trình học"
                  name="program"
                  defaultValue={modal.row?.program || "Cơ bản"}
                  options={["Cơ bản", "Nâng cao"]}
                />
                <Select
                  label="Thứ trong tuần"
                  name="weekday"
                  defaultValue={modal.row?.weekday ?? 1}
                  options={days
                    .map((label, value) => ({
                      label,
                      value,
                    }))
                    .filter((x) => x.value !== 5)}
                />
                <Input
                  label="Sĩ số tối đa"
                  name="capacity"
                  type="number"
                  min={1}
                  max={7}
                  required
                  defaultValue={modal.row?.capacity || 7}
                />
                <Input
                  label="Giờ bắt đầu"
                  name="start"
                  type="time"
                  required
                  defaultValue={modal.row?.start?.slice(0, 5)}
                />
                <Input
                  label="Giờ kết thúc"
                  name="end"
                  type="time"
                  required
                  defaultValue={modal.row?.end?.slice(0, 5)}
                />
                {modal.row?.id && (
                  <Input
                    label="Ngày hiệu lực lịch mới"
                    name="effectiveFrom"
                    type="date"
                    min={today()}
                    defaultValue={today()}
                    hint="Các ca trước ngày này giữ nguyên; ca đã gắn học thử/học bù cần rà soát trước."
                  />
                )}
              </div>
            )}
            {modal.type === "teacher" && (
              <Select
                label="Giáo viên phụ trách"
                name="teacherId"
                required
                options={[
                  {
                    value: "",
                    label: "Chọn giáo viên",
                  },
                  ...(teachers.data || []).map((t) => ({
                    value: t.id,
                    label: t.name,
                  })),
                ]}
              />
            )}{" "}
            {modal.type === "enroll" && (
              <Select
                label="Học viên Chờ xếp lớp"
                name="studentId"
                required
                options={[
                  {
                    value: "",
                    label: "Chọn học viên",
                  },
                  ...(students.data || [])
                    .filter((s) => s.program === modal.row.program)
                    .map((s) => ({
                      value: s.id,
                      label: s.name,
                    })),
                ]}
              />
            )}{" "}
            {modal.type === "sessions" && (
              <>
                <p>
                  {translate(
                    "Hệ thống tạo ca theo thứ và giờ đã thiết lập của lớp, bỏ qua ca đã tồn tại.",
                  )}
                </p>
                <Input
                  label="Từ ngày"
                  name="from"
                  type="date"
                  required
                  defaultValue={today()}
                />
                <Input
                  label="Đến ngày"
                  name="to"
                  type="date"
                  required
                  defaultValue={addDays(today(), 60)}
                />
              </>
            )}
          </Form>
        </Modal>
      )}
    </>
  );
}
