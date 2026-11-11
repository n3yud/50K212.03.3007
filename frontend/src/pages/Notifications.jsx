import { t as translate } from "../lib/i18n";
import React, { useState } from "react";
import { date } from "../lib/api";
import { useData, Loader, Panel, Empty, Modal } from "../components/ui";
export default function Notifications() {
  const r = useData("/notifications"),
    [selected, setSelected] = useState(null);
  return (
    <Loader resource={r}>
      <Panel>
        {r.data?.length ? (
          r.data.map((n) => (
            <button key={n.id} className="item" onClick={() => setSelected(n)}>
              <strong>{n.title}</strong>
              <small>{date(n.createdAt)}</small>
            </button>
          ))
        ) : (
          <Empty>{translate("Bạn chưa có thông báo nào.")}</Empty>
        )}
      </Panel>
      {selected && (
        <Modal title={selected.title} onClose={() => setSelected(null)}>
          <small>{date(selected.createdAt)}</small>
          <p>{selected.content}</p>
        </Modal>
      )}
    </Loader>
  );
}
