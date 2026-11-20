import { useEffect, useState } from "react";
import { api } from "../lib/api";

export function PortfolioPage({
  onToast,
}: {
  onToast: (t: string, tone?: "good" | "bad" | "neutral") => void;
}) {
  const [groups, setGroups] = useState<Array<Record<string, unknown>>>([]);
  const [requests, setRequests] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [g, r] = await Promise.all([
          api.omni<unknown>("portfolio-groups", {}),
          api.omni<unknown>("portfolio-requests", {}),
        ]);
        const gRaw = g.data;
        const gList = Array.isArray(gRaw)
          ? gRaw
          : Array.isArray((gRaw as { groups?: unknown[] })?.groups)
            ? (gRaw as { groups: unknown[] }).groups
            : [];
        const rRaw = r.data;
        const rList = Array.isArray(rRaw)
          ? rRaw
          : Array.isArray((rRaw as { requests?: unknown[] })?.requests)
            ? (rRaw as { requests: unknown[] }).requests
            : [];
        setGroups(gList as Array<Record<string, unknown>>);
        setRequests(rList as Array<Record<string, unknown>>);
      } catch (e) {
        onToast(e instanceof Error ? e.message : "Ошибка", "bad");
      } finally {
        setLoading(false);
      }
    })();
  }, [onToast]);

  return (
    <div className="app-shell">
      <div className="brand">Портфолио</div>
      {loading ? <div className="skeleton" /> : (
        <>
          {requests.length > 0 ? (
            <div className="stack-tight">
              {requests.slice(0, 40).map((r, i) => (
                <div className="list-row" key={i}>
                  <div className="student-name">{String(r.fio_stud || r.name || `Заявка ${i + 1}`)}</div>
                  <button
                    className="btn signal"
                    style={{ padding: "8px 12px" }}
                    onClick={async () => {
                      try {
                        await api.mutate("portfolio-approve", r);
                        onToast("Ок", "good");
                      } catch (e) {
                        onToast(e instanceof Error ? e.message : "Ошибка", "bad");
                      }
                    }}
                  >
                    OK
                  </button>
                </div>
              ))}
            </div>
          ) : null}
          {groups.length === 0 && requests.length === 0 ? (
            <div className="empty">Пусто</div>
          ) : (
            <div className="stack-tight">
              {groups.map((g, i) => (
                <div className="list-row" key={i}>
                  <div className="student-name">{String(g.name_tgroups || g.name || g.id_tgroups || i)}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
