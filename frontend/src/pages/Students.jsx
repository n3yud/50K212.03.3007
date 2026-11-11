import { t as translate } from "../lib/i18n";
import React, { useState } from "react";
import ParentSupport from "../components/ParentSupport";
import { api, post, date } from "../lib/api";
import {
  useData,
  Loader,
  Panel,
  Table,
  Badge,
  Input,
  Select,
  Form,
  Modal,
  Message,
} from "../components/ui";
export default function Students() {
  const r = useData("/students"),
    trials = useData("/trials");
  const [q, setQ] = useState(""),
    [status, setStatus] = useState(""),
    [edit, setEdit] = useState(null),
    [confirm, setConfirm] = useState(null),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [detail, setDetail] = useState(null),
    [support, setSupport] = useState(false);
  const rows = (r.data || []).filter(
    (s) =>
      (!status || s.status === status) &&
      (s.name.toLowerCase().includes(q.toLowerCase()) ||
        s.code.toLowerCase().includes(q.toLowerCase()) ||
        s.phone.includes(q)),
  );
  async function change() {
    try {
      const result = await post(
        "/students/" +
          confirm.id +
          "/" +
          (confirm.status === "Đã bảo lưu" ? "restore" : "archive"),
      );
      setMessage(result.message);
      setConfirm(null);
      r.reload();
    } catch (e) {
      setError(e.message);
    }
  }
  const eligible = (trials.data || []).filter(
    (t) => t.decision === "Đăng ký chính thức",
  );
  return (
    <>
      <div className="toolbar">
        <Input
          label="Tìm kiếm học viên"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Họ tên, mã học viên, số điện thoại"
        />
        <Select
          label="Trạng thái hồ sơ"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={[
            {
              value: "",
              label: "Tất cả",
            },
            "Chờ xếp lớp",
            "Đang học",
            "Đã bảo lưu",
          ]}
        />
        <button onClick={() => setEdit({})}>
          {translate("Tạo hồ sơ học viên")}
        </button>
        <button className="secondary" onClick={() => setSupport(true)}>
          {translate("Cấp mật khẩu phụ huynh")}
        </button>
      </div>
      <Message>{message}</Message>
      {support && <ParentSupport close={() => setSupport(false)} />}
      <Message error>{error}</Message>
      <Loader resource={r}>
        <Panel>
          <Table
            rows={rows}
            columns={[
              {
                label: "Mã học viên",
                key: "code",
              },
              {
                label: "Học viên",
                key: "name",
              },
              {
                label: "Ngày sinh",
                render: (s) => date(s.birthDate),
              },
              {
                label: "Phụ huynh",
                key: "parentName",
              },
              {
                label: "Số điện thoại",
                key: "phone",
              },
              {
                label: "Chương trình",
                key: "program",
              },
              {
                label: "Trạng thái",
                render: (s) => <Badge>{s.status}</Badge>,
              },
              {
                label: "Thao tác",
                render: (s) => (
                  <>
                    <button
                      className="secondary"
                      onClick={async () => {
                        try {
                          setDetail(await api("/students/" + s.id));
                        } catch (e) {
                          setError(e.message);
                        }
                      }}
                    >
                      {translate("Chi tiết")}
                    </button>
                    <button className="secondary" onClick={() => setEdit(s)}>
                      {translate("Cập nhật")}
                    </button>
                    <button className="secondary" onClick={() => setConfirm(s)}>
                      {s.status === "Đã bảo lưu" ? "Khôi phục" : "Bảo lưu"}
                    </button>
                  </>
                ),
              },
            ]}
          />
        </Panel>
      </Loader>
      {edit && (
        <Modal
          title={edit.id ? "Cập nhật hồ sơ học viên" : "Tạo mới hồ sơ học viên"}
          onClose={() => setEdit(null)}
        >
          <Form
            key={edit.id || edit.trialId || "new"}
            onCancel={() => setEdit(null)}
            onSubmit={async (d) => {
              await api("/students" + (edit.id ? "/" + edit.id : ""), {
                method: edit.id ? "PUT" : "POST",
                body: {
                  ...d,
                  trialId: edit.trialId || null,
                },
              });
              setEdit(null);
              r.reload();
              setMessage("Đã lưu hồ sơ học viên.");
            }}
          >
            {!edit.id && (
              <Select
                label="Tạo từ đơn học thử (tùy chọn)"
                value={edit.trialId || ""}
                onChange={(e) => {
                  const t = eligible.find((t) => t.id === e.target.value);
                  setEdit(
                    t
                      ? {
                          trialId: t.id,
                          name: t.studentName,
                          birthDate: t.birthDate,
                          phone: t.phone,
                          program: t.program,
                        }
                      : {},
                  );
                }}
                options={[
                  {
                    value: "",
                    label: "Nhập hồ sơ mới",
                  },
                  ...eligible.map((t) => ({
                    value: t.id,
                    label: t.studentName,
                  })),
                ]}
              />
            )}
            <div className="form-grid">
              <Input
                label="Họ tên học viên"
                name="name"
                defaultValue={edit.name}
                required
                maxLength={50}
              />
              <Input
                label="Ngày sinh"
                name="birthDate"
                defaultValue={edit.birthDate}
                type="date"
                required
              />
              <Select
                label="Giới tính"
                name="gender"
                defaultValue={edit.gender || "Nam"}
                options={["Nam", "Nữ", "Khác"]}
              />
              <Select
                label="Chương trình học"
                name="program"
                defaultValue={edit.program || "Cơ bản"}
                options={["Cơ bản", "Nâng cao"]}
              />
              <Input
                label="Họ tên phụ huynh"
                name="parentName"
                defaultValue={edit.parentName}
                required
                maxLength={100}
              />
              <Input
                label="Số điện thoại phụ huynh"
                name="phone"
                defaultValue={edit.phone}
                required
                pattern="0[0-9]{9}"
                inputMode="tel"
              />
            </div>
          </Form>
        </Modal>
      )}
      {confirm && (
        <Modal
          title={
            confirm.status === "Đã bảo lưu"
              ? "Khôi phục hồ sơ"
              : "Xác nhận bảo lưu"
          }
          onClose={() => setConfirm(null)}
        >
          <p>
            {confirm.name}:{" "}
            {confirm.status === "Đã bảo lưu"
              ? "Khôi phục về Chờ xếp lớp và giữ nguyên tiến trình đã lưu."
              : "Vui lòng xác nhận đã trao đổi với phụ huynh ngoài hệ thống. Hồ sơ và kết quả học tập được giữ lại."}
          </p>
          <div className="actions">
            <button onClick={change}>{translate("Xác nhận")}</button>
            <button className="secondary" onClick={() => setConfirm(null)}>
              {translate("Hủy")}
            </button>
          </div>
        </Modal>
      )}
      {detail && (
        <Modal title={detail.student.name} onClose={() => setDetail(null)}>
          <p>
            {detail.student.code} · {detail.student.program} ·{" "}
            {detail.student.status}
          </p>
          <h3>{translate("Học phí và số buổi")}</h3>
          {detail.tuitions.map((t) => (
            <p key={t.id}>
              {t.month}: {t.remaining}/{t.lessons}
              {translate("buổi")}
            </p>
          ))}
          <h3>{translate("Lịch sử tiến độ")}</h3>
          {detail.progress.map((p) => (
            <p key={p.id}>
              {date(p.evaluationDate)}: {p.status} — {p.note}
            </p>
          ))}
        </Modal>
      )}
    </>
  );
}
