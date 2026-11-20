import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

type Task = Record<string, unknown>;

export function TasksPage({
  onToast,
}: {
  onToast: (t: string, tone?: "good" | "bad" | "neutral") => void;
}) {
  const [tab, setTab] = useState<"admin" | "zavhoz">("admin");
  const [admin, setAdmin] = useState<Task[]>([]);
  const [zavhoz, setZavhoz] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await api.omni<{
        admin_tasks?: Task[];
        zavhoz_tasks?: Task[];
      }>("tasks", {});
      setAdmin(Array.isArray(res.data?.admin_tasks) ? res.data.admin_tasks : []);
      setZavhoz(Array.isArray(res.data?.zavhoz_tasks) ? res.data.zavhoz_tasks : []);
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Ошибка", "bad");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const items = useMemo(
    () => (tab === "admin" ? admin : zavhoz),
    [tab, admin, zavhoz],
  );

  return (
    <div className="app-shell">
      <div className="brand">Задачи</div>
      <div className="was">
        <button className={tab === "admin" ? "on-p" : ""} onClick={() => setTab("admin")}>
          Админ
        </button>
        <button className={tab === "zavhoz" ? "on-p" : ""} onClick={() => setTab("zavhoz")}>
          Завхоз
        </button>
        <button className="" disabled>
          {items.length}
        </button>
      </div>

      <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr auto" }}>
        <input
          className="bare-input"
          placeholder="Новая задача"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button
          className="btn signal"
          disabled={busy || !text.trim()}
          onClick={async () => {
            setBusy(true);
            try {
              await api.mutate("task-add", {
                text: text.trim(),
                type: tab === "admin" ? 0 : 1,
              });
              setText("");
              onToast("Добавлено", "good");
              await load();
            } catch (e) {
              onToast(e instanceof Error ? e.message : "Ошибка", "bad");
            } finally {
              setBusy(false);
            }
          }}
        >
          +
        </button>
      </div>

      {loading ? (
        <div className="skeleton" />
      ) : items.length === 0 ? (
        <div className="empty">Пусто</div>
      ) : (
        <div className="stack-tight">
          {items.slice(0, 100).map((t, i) => (
            <div className="list-row" key={String(t.id_w || t.id || i)}>
              <div>
                <div className="student-name">
                  {String(t.name || t.title || t.text || `Задача ${i + 1}`)}
                </div>
                <div className="mute tiny">
                  {[t.status, t.room, t.date, t.end_date].filter(Boolean).join(" · ")}
                </div>
              </div>
              <button
                className="btn ghost"
                style={{ padding: "8px 12px" }}
                onClick={async () => {
                  try {
                    await api.mutate("task-status", {
                      id: t.id_w || t.id,
                      status: 1,
                      type: tab === "admin" ? 0 : 1,
                    });
                    onToast("Ок", "good");
                    await load();
                  } catch (e) {
                    onToast(e instanceof Error ? e.message : "Ошибка", "bad");
                  }
                }}
              >
                ✓
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
