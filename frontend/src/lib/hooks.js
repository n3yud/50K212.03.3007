import { useCallback, useEffect, useRef, useState } from 'react';
import { useToast } from '../context/AppContext';

// Gọi API khi mở trang / khi tham số đổi. Trả về {data, loading, error, reload}
export function useApi(fn, deps = [], { skip = false } = {}) {
  const [state, setState] = useState({ data: null, loading: !skip, error: null });
  const seq = useRef(0);
  const run = useCallback(() => {
    if (skip) return Promise.resolve();
    const my = ++seq.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    return fn().then((data) => { if (my === seq.current) setState({ data, loading: false, error: null }); })
      .catch((e) => { if (my === seq.current) setState({ data: null, loading: false, error: e }); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, skip]);
  useEffect(() => { run(); }, [run]);
  return { ...state, reload: run };
}

// Gọi thao tác ghi: tự báo lỗi bằng toast, trả về kết quả hoặc undefined khi lỗi
export function useAction() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const act = useCallback(async (fn, { ok, okType = 'success', onError, silent } = {}) => {
    setBusy(true);
    try {
      const r = await fn();
      if (ok) {
        if (okType === 'info' || okType === 'warn') toast.info(ok);
        else toast.success(ok);
      }
      return r === undefined ? true : r;
    }
    catch (e) {
      if (onError) onError(e);
      if (!silent || !e.fields) toast.error(e.status === 401 || e.status === 403 || e.message ? e.message : 'Hiện tại đang có sự cố, vui lòng thử lại sau');
      return undefined;
    } finally { setBusy(false); }
  }, [toast]);
  return [act, busy];
}
