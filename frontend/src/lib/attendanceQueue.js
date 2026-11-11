import { api, post } from "./api";
const prefix = "NNN.attendance.";
export const readDraft = (userId, sessionId) => {
  try {
    return JSON.parse(
      localStorage.getItem(prefix + userId + "." + sessionId) || "null",
    );
  } catch {
    return null;
  }
};
export function saveDraft(userId, sessionId, payload) {
  localStorage.setItem(
    prefix + userId + "." + sessionId,
    JSON.stringify({
      sessionId,
      payload,
      updatedAt: Date.now(),
      pending: true,
    }),
  );
}
export async function syncDrafts(userId) {
  const keys = Object.keys(localStorage).filter((k) =>
    k.startsWith(prefix + userId + "."),
  );
  let errors = [];
  for (const key of keys) {
    const row = JSON.parse(localStorage.getItem(key) || "null");
    if (!row?.pending) continue;
    try {
      await post("/sessions/" + row.sessionId + "/attendance", row.payload);
      row.pending = false;
      localStorage.setItem(key, JSON.stringify(row));
    } catch (e) {
      // A second tab may already have finalized the exact same payload.
      // Confirm against the official roster instead of submitting it forever.
      if (row.payload.finalize && [400, 409].includes(e.status)) {
        try {
          const official = await api("/sessions/" + row.sessionId + "/roster");
          const same =
            official.session.closed &&
            row.payload.students.every((x) =>
              official.attendance.some(
                (a) => a.studentId === x.studentId && a.present === x.present,
              ),
            ) &&
            row.payload.trials.every((x) =>
              official.trialAttendance.some(
                (a) => a.trialId === x.trialId && a.present === x.present,
              ),
            );
          if (same) {
            row.pending = false;
            localStorage.setItem(key, JSON.stringify(row));
            continue;
          }
        } catch {}
      }
      errors.push(e.message);
    }
  }
  return errors;
}
export function watchSync(userId, report) {
  let running = false;
  const run = async () => {
    if (running || !navigator.onLine) return;
    running = true;
    try {
      const errors = await syncDrafts(userId);
      report(errors);
    } finally {
      running = false;
    }
  };
  const timer = setInterval(run, 10000);
  window.addEventListener("online", run);
  run();
  return () => {
    clearInterval(timer);
    window.removeEventListener("online", run);
  };
}
