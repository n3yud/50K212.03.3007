import { t as translate } from "../lib/i18n";
import React, { useEffect, useState } from "react";
import { api, date, today, addDays, money } from "../lib/api";
import { useData, Loader, Panel, Input, Form, Table } from "../components/ui";
import { download } from "./Progress";
import Schedule from "./Schedule";
export default function Reports({ dashboard = false, user, navigate }) {
  const [from, setFrom] = useState(today().slice(0, 8) + "01"),
    [to, setTo] = useState(today()),
    [threshold, setThreshold] = useState(2),
    [query, setQuery] = useState("from=" + from + "&to=" + to + "&threshold=2");
  const r = useData(dashboard ? "/reports/dashboard" : "/reports?" + query);
  useEffect(() => {
    if (!dashboard) return;
    const timer = setInterval(r.reload, 15000);
    return () => clearInterval(timer);
  }, [dashboard]);
  return (
    <>
      {!dashboard && (
        <Panel>
          <h2>{translate("Khoảng thời gian và bộ lọc")}</h2>
          <Form
            submit="Thống kê"
            onSubmit={() =>
              setQuery("from=" + from + "&to=" + to + "&threshold=" + threshold)
            }
          >
            <div className="form-grid">
              <Input
                label="Từ ngày"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                required
              />
              <Input
                label="Đến ngày"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                required
              />
              <Input
                label="Ngưỡng cảnh báo N buổi"
                type="number"
                min={0}
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
              />
            </div>
          </Form>
        </Panel>
      )}
      <Loader resource={r}>
        {r.data && (
          <>
            <div className="stat-grid">
              {(dashboard
                ? [
                    ["Học viên mới trong tuần", r.data.newStudents, "students"],
                    ["Ca học hôm nay", r.data.todaySessions, "schedule"],
                    ["Đã bảo lưu", r.data.archived, "students"],
                    ["Sắp hết buổi", r.data.warningStudents, "tuition"],
                  ]
                : [
                    ["Học viên mới", r.data.newStudents],
                    ["Học viên cũ", r.data.oldStudents],
                    ["Đã bảo lưu", r.data.archived],
                    ["Tổng số học viên", r.data.totalStudents],
                  ]
              ).map(([label, value, target]) => (
                <div className="stat" key={translate(label)}>
                  {translate(label)}
                  <strong>{value}</strong>
                  {target && (
                    <button
                      className="help-button"
                      onClick={() => navigate(target)}
                    >
                      {translate("Xem chi tiết")}
                    </button>
                  )}
                </div>
              ))}
            </div>
            {dashboard ? (
              <>
                <Panel>
                  <h2>{translate("Công việc cần xử lý")}</h2>
                  <p>
                    {translate("Đơn học thử Chờ tiếp nhận:")}
                    <strong>{r.data.pendingTrials}</strong>
                  </p>
                  <p>
                    {translate("Đề xuất học bù Chờ duyệt:")}
                    <strong>{r.data.pendingMakeUps}</strong>
                  </p>
                </Panel>
                <Schedule user={user} />
              </>
            ) : (
              <>
                <Panel>
                  <h2>{translate("Thống kê học viên")}</h2>
                  <div className="chart">
                    {(r.data.weekly || []).map(({ label, count: v }) => (
                      <div key={translate(label)}>
                        <span>{v}</span>
                        <div
                          className="bar"
                          style={{
                            height: Math.max(
                              2,
                              (150 * v) / Math.max(1, r.data.totalStudents),
                            ),
                          }}
                        />
                        <small>{translate(label)}</small>
                      </div>
                    ))}
                  </div>
                </Panel>
                <Panel>
                  <h2>{translate("Vận hành lớp học")}</h2>
                  <p>
                    {translate("Tổng số ca học:")}
                    {r.data.sessions}
                    {translate("· Đã chốt:")}
                    {r.data.finalizedSessions}
                  </p>
                  <p>
                    {translate("Tỷ lệ chuyên cần:")}
                    {r.data.attendanceRate == null
                      ? "Chưa có dữ liệu điểm danh"
                      : r.data.attendanceRate.toFixed(1) + "%"}
                  </p>
                  <p>
                    {translate("Sĩ số có mặt trung bình:")}
                    {r.data.averageAttendance?.toFixed(1) ?? "—"}
                  </p>
                  <p>
                    {translate("Ca học bù đã duyệt:")}
                    {r.data.makeUps}
                  </p>
                </Panel>
                <Panel>
                  <h2>{translate("Cảnh báo học phí")}</h2>
                  <Table
                    rows={r.data.feeWarnings || []}
                    keyField="name"
                    columns={[
                      {
                        label: "Học viên",
                        key: "name",
                      },
                      {
                        label: "Tháng",
                        key: "month",
                      },
                      {
                        label: "Số buổi còn lại",
                        key: "remaining",
                      },
                      {
                        label: "Học phí (VNĐ)",
                        render: (t) => money(t.amount),
                      },
                      {
                        label: "Trạng thái",
                        key: "status",
                      },
                    ]}
                  />
                </Panel>
                <button
                  className="secondary"
                  onClick={async () =>
                    download(
                      await api("/reports/export?" + query),
                      "bao-cao-lop-ve.xlsx",
                    )
                  }
                >
                  {translate("Xuất báo cáo Excel")}
                </button>
              </>
            )}
          </>
        )}
      </Loader>
    </>
  );
}
