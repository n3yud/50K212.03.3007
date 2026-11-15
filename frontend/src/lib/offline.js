// Điểm danh ngoại tuyến (BR-UC11-10): lưu nháp trên máy và hàng đợi đồng bộ khi có mạng lại
import { teacher } from '../services/api';
const QK = 'nnn_queue';
const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
export const getDraft = (key) => read(`nnn_draft_${key}`, {});
export const setDraft = (key, v) => { try { localStorage.setItem(`nnn_draft_${key}`, JSON.stringify(v)); } catch { /* ignore */ } };
export const clearDraft = (key) => { try { localStorage.removeItem(`nnn_draft_${key}`); } catch { /* ignore */ } };
export const queued = () => read(QK, []);
export const enqueue = (item) => { const q = queued().filter((x) => x.key !== item.key); q.push(item); localStorage.setItem(QK, JSON.stringify(q)); };
export async function flush() {
  if (!navigator.onLine) return { done: 0, failed: [] };
  let done = 0; const failed = [];
  for (const it of queued()) {
    let drop = true;
    try { await teacher.finalize(it.key, it.records); done++; clearDraft(it.key); }
    catch (e) {
      if (e.message === 'Ca học này đã chốt điểm danh') done++;
      else { failed.push(e.message); drop = !(e.status >= 500 || e.status === 0 || !navigator.onLine); } // lỗi hệ thống/mạng: giữ lại để thử lần sau
    }
    if (drop) localStorage.setItem(QK, JSON.stringify(queued().filter((x) => x.key !== it.key)));
  }
  if (done) window.dispatchEvent(new CustomEvent('nnn-synced', { detail: { done } }));
  return { done, failed };
}

// Tự đồng bộ trong vòng 30 giây khi có mạng trở lại (NFR – điểm danh ngoại tuyến):
// đồng bộ ngay khi trình duyệt báo 'online' và quét lại mỗi 15 giây phòng khi sự kiện bị lỡ.
export function startAutoSync() {
  let busy = false;
  const run = async () => { if (busy || !navigator.onLine || !queued().length) return; busy = true; try { await flush(); } finally { busy = false; } };
  window.addEventListener('online', run); const t = setInterval(run, 15000); run();
  return () => { window.removeEventListener('online', run); clearInterval(t); };
}
