import { t as translate } from "../lib/i18n";
import React, { useState } from "react";
import { api, post, date, today, addDays, sessionLabel } from "../lib/api";
import {
  useData,
  Loader,
  Panel,
  Input,
  Select,
  Modal,
  Message,
} from "../components/ui";
import { readDraft, saveDraft } from "../lib/attendanceQueue";
export default function Schedule({ user }) {
  const [from, setFrom] = useState(today()),
    [mode, setMode] = useState("week"),
    [studentId, setStudentId] = useState(""),
    [attendance, setAttendance] = useState(null),
    [error, setError] = useState("");
  const end = addDays(from, mode === "week" ? 6 : mode === "month" ? 30 : 0);
  const students = useData("/students");
  const r = useData(
    "/sessions?from=" +
      from +
      "&to=" +
      end +
      (studentId ? "&studentId=" + studentId : ""),
    user.role === "Giáo viên"
      ? "NNN.schedule." + user.id + "." + from + "." + end
      : null,
  );
  async function open(s) {
    setError("");
    try {
      const data = await api("/sessions/" + s.id + "/roster");
      localStorage.setItem(
        "NNN.roster." + user.id + "." + s.id,
        JSON.stringify(data),
      );
      setAttendance(data);
    } catch (e) {
      const cached = localStorage.getItem("NNN.roster." + user.id + "." + s.id);
      if (cached) setAttendance(JSON.parse(cached));
      else
        setError(
          e.message +
            " Cần mở danh sách ca học một lần khi có mạng trước khi điểm danh ngoại tuyến.",
        );
    }
  }
  return (
    <>
      <div className="toolbar">
        <Input
          label="Từ ngày"
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
        <Select
          label="Chế độ xem"
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          options={[
            {
              value: "day",
              label: "Ngày",
            },
            {
              value: "week",
              label: "Tuần",
            },
            {
              value: "month",
              label: "Tháng",
            },
          ]}
        />
        {user.role === "Phụ huynh" && (
          <Select
            label="Học viên"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            options={[
              {
                value: "",
                label: "Tất cả các bé",
              },
              ...(students.data || []).map((s) => ({
                value: s.id,
                label: s.name,
              })),
            ]}
          />
        )}
        <button
          className="secondary"
          onClick={() => setFrom(addDays(from, mode === "day" ? -1 : -7))}
        >
          {translate("‹ Trước")}
        </button>
        <button className="secondary" onClick={() => setFrom(today())}>
          {translate("Hôm nay")}
        </button>
        <button
          className="secondary"
          onClick={() => setFrom(addDays(from, mode === "day" ? 1 : 7))}
        >
          {translate("Sau ›")}
        </button>
      </div>
      <Message error>{error}</Message>
      <Loader resource={r}>
        <Panel>
          <h2>
            {date(from)} — {date(end)}
          </h2>
          <div className="calendar">
            <div
              className="calendar-grid"
              style={
                mode === "day"
                  ? {
                      gridTemplateColumns: "1fr",
                    }
                  : undefined
              }
            >
              {Array.from(
                {
                  length: mode === "week" ? 7 : mode === "day" ? 1 : 31,
                },
                (_, i) => addDays(from, i),
              ).map((d) => (
                <section
                  key={d}
                  className={"calendar-day " + (d === today() ? "today" : "")}
                >
                  <strong>
                    {new Intl.DateTimeFormat("vi-VN", {
                      weekday: "short",
                    }).format(new Date(d + "T12:00:00+07:00"))}
                    <br />
                    {date(d)}
                  </strong>
                  {(r.data || [])
                    .filter((s) => s.date === d)
                    .map((s) => (
                      <article key={s.id} className="calendar-event">
                        <strong>
                          {s.start.slice(0, 5)}–{s.end.slice(0, 5)}
                        </strong>
                        <span>{s.name}</span>
                        <small>{s.program}</small>
                        <small>{s.teacher}</small>
                        {user.role === "Giáo viên" && (
                          <button onClick={() => open(s)}>
                            {s.closed ? "Xem điểm danh" : "Điểm danh"}
                          </button>
                        )}
                      </article>
                    ))}
                </section>
              ))}
            </div>
          </div>
          {!r.data?.length && (
            <p className="empty">
              {translate("Chưa có lịch học trong khoảng thời gian này.")}
            </p>
          )}
        </Panel>
      </Loader>
      {attendance && (
        <Modal title="Điểm danh ca học" onClose={() => setAttendance(null)}>
          <Attendance
            user={user}
            data={attendance}
            done={() => {
              r.reload();
              setAttendance(null);
            }}
          />
        </Modal>
      )}
    </>
  );
}
function Attendance({ user, data, done }) {
  const key = user.id + "." + data.session.id;
  const draft = readDraft(user.id, data.session.id);
  const [marks, setMarks] = useState(
      draft?.payload?.students ||
        data.attendance.map((a) => ({
          studentId: a.studentId,
          present: a.present,
        })),
    ),
    [trialMarks, setTrialMarks] = useState(
      draft?.payload?.trials ||
        data.trialAttendance.map((a) => ({
          trialId: a.trialId,
          present: a.present,
        })),
    ),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  function update(id, present, trial = false) {
    const array = trial ? trialMarks : marks;
    const field = trial ? "trialId" : "studentId";
    const next = [
      ...array.filter((a) => a[field] !== id),
      {
        [field]: id,
        present,
      },
    ];
    if (trial) setTrialMarks(next);
    else setMarks(next);
    saveDraft(user.id, data.session.id, {
      students: trial ? marks : next,
      trials: trial ? next : trialMarks,
      finalize: false,
    });
    setMessage("Đã lưu tạm trên thiết bị.");
  }
  async function finish() {
    setError("");
    setBusy(true);
    try {
      if (
        data.students.length !== marks.length ||
        data.trials.length !== trialMarks.length
      )
        throw new Error("Vui lòng điểm danh đủ học viên trong ca học!");
      const payload = {
        students: marks,
        trials: trialMarks,
        finalize: true,
      };
      saveDraft(user.id, data.session.id, payload);
      const r = await post(
        "/sessions/" + data.session.id + "/attendance",
        payload,
      );
      localStorage.removeItem("NNN.attendance." + key);
      setMessage(r.message);
      done();
    } catch (e) {
      setError(
        e.offline
          ? "Đã lưu yêu cầu chốt trên thiết bị, sẽ gửi lại khi có mạng."
          : e.message,
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <p>
        {date(data.session.date)} ·{" "}
        {data.session.closed ? "Đã chốt" : "Chưa chốt"}
      </p>
      <fieldset disabled={data.session.closed || busy}>
        {[
          ...data.students.map((s) => ({
            ...s,
            trial: false,
          })),
          ...data.trials.map((s) => ({
            ...s,
            trial: true,
          })),
        ].map((s) => {
          const mark = (s.trial ? trialMarks : marks).find(
            (a) => (s.trial ? a.trialId : a.studentId) === s.id,
          );
          return (
            <div className="attendance-row" key={s.id}>
              <strong>
                {s.name}
                {s.trial ? " (Học thử)" : ""}
              </strong>
              <div>
                <button
                  aria-pressed={mark?.present === true}
                  onClick={() => update(s.id, true, s.trial)}
                >
                  {translate("Có mặt")}
                </button>
                <button
                  className="absent"
                  aria-pressed={mark?.present === false}
                  onClick={() => update(s.id, false, s.trial)}
                >
                  {translate("Vắng")}
                </button>
              </div>
            </div>
          );
        })}
        <Message>{message}</Message>
        <Message error>{error}</Message>
        {!data.session.closed && (
          <button className="full" onClick={finish}>
            {translate("Chốt điểm danh")}
          </button>
        )}
      </fieldset>
    </>
  );
}
