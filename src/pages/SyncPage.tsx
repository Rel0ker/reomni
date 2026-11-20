import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

export function SyncPage({
  onToast,
}: {
  onToast: (t: string, tone?: "good" | "bad" | "neutral") => void;
}) {
  const [counts, setCounts] = useState<Array<{ status: string; n: number }>>(
    [],
  );
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await api.syncStatus();
      setCounts(res.counts || []);
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Ошибка", "bad");
    }
  }, [onToast]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const map = useMemo(() => {
    const m: Record<string, number> = { pending: 0, synced: 0, error: 0 };
    for (const c of counts) m[c.status] = Number(c.n) || 0;
    return m;
  }, [counts]);

  async function flush() {
    setLoading(true);
    try {
      const res = await api.flush();
      onToast(`${res.flushed}`, "good");
      await refresh();
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Ошибка", "bad");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <div className="brand">Синк</div>

      <div className="sync-stat">
        <div className="cell">
          <div className="n">{map.pending}</div>
          <div className="l">очередь</div>
        </div>
        <div className="cell">
          <div className="n">{map.synced}</div>
          <div className="l">ok</div>
        </div>
        <div className="cell">
          <div className="n">{map.error}</div>
          <div className="l">ошибки</div>
        </div>
      </div>

      <button className="btn signal block" disabled={loading} onClick={flush}>
        {loading ? "…" : "Отправить"}
      </button>
    </div>
  );
}
