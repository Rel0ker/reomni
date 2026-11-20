import { useEffect, useState } from "react";
import { api } from "../lib/api";

export function DossierPage({
  onToast,
}: {
  onToast: (t: string, tone?: "good" | "bad" | "neutral") => void;
}) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.omni<Record<string, unknown>>("dossier", {});
        setData(res.data || null);
      } catch (e) {
        onToast(e instanceof Error ? e.message : "Ошибка", "bad");
      } finally {
        setLoading(false);
      }
    })();
  }, [onToast]);

  const entries = data ? Object.entries(data) : [];

  return (
    <div className="app-shell">
      <div className="brand">Досье</div>
      {loading ? <div className="skeleton" /> : entries.length === 0 ? (
        <div className="empty">Пусто</div>
      ) : (
        <div className="stack-tight">
          {entries.slice(0, 50).map(([k, v]) => (
            <div className="list-row" key={k}>
              <div className="student-name">{k}</div>
              <div className="list-right mute tiny">
                {typeof v === "object" ? "…" : String(v ?? "—")}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
