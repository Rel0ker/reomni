import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { PageBrand } from "../components/PageBrand";

type Row = Record<string, unknown>;

function asList(raw: unknown): Row[] {
  if (Array.isArray(raw)) return raw as Row[];
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    for (const key of ["succees", "success", "students", "data", "list"]) {
      if (Array.isArray(o[key])) return o[key] as Row[];
    }
    return Object.values(o).flatMap((v) => (Array.isArray(v) ? (v as Row[]) : []));
  }
  return [];
}

export function TrafficPage({
  onToast,
}: {
  onToast: (t: string, tone?: "good" | "bad" | "neutral") => void;
}) {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentFor, setCommentFor] = useState<string>("");
  const [comment, setComment] = useState("");

  async function load() {
    setLoading(true);
    try {
      const [main, neu] = await Promise.all([
        api.omni<unknown>("traffic", {}),
        api.omni<unknown>("traffic-new", {}).catch(() => ({ data: [] })),
      ]);
      const list = [...asList(neu.data), ...asList(main.data)];
      const seen = new Set<string>();
      const uniq = list.filter((s) => {
        const id = String(s.id_stud || s.id || JSON.stringify(s));
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });
      setItems(uniq);
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

  return (
    <div className="app-shell">
      <PageBrand k="nav.traffic" />
      {loading ? (
        <div className="skeleton" />
      ) : items.length === 0 ? (
        <div className="empty">Пусто</div>
      ) : (
        <div className="stack-tight">
          {items.slice(0, 120).map((s, i) => {
            const id = String(s.id_stud || s.id || i);
            return (
              <div className="student" key={id}>
                <div className="student-name">
                  {String(s.fio_stud || s.name || "—")}
                </div>
                <div className="mute tiny">
                  {[s.status, s.type, s.comment, s.name_tgroups]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
                {commentFor === id ? (
                  <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                    <input
                      className="bare-input"
                      placeholder="Комментарий"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                    />
                    <button
                      className="btn signal block"
                      onClick={async () => {
                        try {
                          await api.mutate("traffic-comment", {
                            id_stud: s.id_stud || id,
                            comment,
                          });
                          onToast("Ок", "good");
                          setCommentFor("");
                          setComment("");
                          await load();
                        } catch (e) {
                          onToast(e instanceof Error ? e.message : "Ошибка", "bad");
                        }
                      }}
                    >
                      Сохранить
                    </button>
                  </div>
                ) : (
                  <button
                    className="btn ghost"
                    style={{ marginTop: 8, padding: "8px 12px" }}
                    onClick={() => setCommentFor(id)}
                  >
                    Коммент
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
