import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { PageBrand } from "../components/PageBrand";

type NewsItem = Record<string, unknown>;

export function NewsPage({
  onToast,
}: {
  onToast: (t: string, tone?: "good" | "bad" | "neutral") => void;
}) {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [deps, setDeps] = useState<Array<{ id: number | string; name: string }>>([]);
  const [depId, setDepId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .omni<Array<{ id: number | string; name: string }>>("news-departments", {})
      .then((r) => setDeps(Array.isArray(r.data) ? r.data : []))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const body = depId ? { department_id: depId } : {};
        const res = await api.omni<NewsItem[]>("news-cc", body, false);
        if (Array.isArray(res.data) && res.data.length) {
          setItems(res.data);
        } else {
          const start = await api.omni<{ news?: NewsItem[] }>("start-info", {});
          setItems(start.data?.news || []);
        }
      } catch (e) {
        onToast(e instanceof Error ? e.message : "Ошибка", "bad");
      } finally {
        setLoading(false);
      }
    })();
  }, [depId, onToast]);

  return (
    <div className="app-shell">
      <PageBrand k="nav.news" />
      {deps.length > 0 ? (
        <select
          className="bare-select"
          value={depId}
          onChange={(e) => setDepId(e.target.value)}
        >
          <option value="">Все отделы</option>
          {deps.map((d) => (
            <option key={String(d.id)} value={String(d.id)}>
              {d.name}
            </option>
          ))}
        </select>
      ) : null}
      {loading ? (
        <div className="skeleton" />
      ) : items.length === 0 ? (
        <div className="empty">Пусто</div>
      ) : (
        <div className="stack-tight">
          {items.map((n, i) => (
            <article className="news-card" key={String(n.id || n.id_bbs || i)}>
              <div className="student-name">
                {String(n.title || n.theme || "Новость")}
              </div>
              <div className="mute tiny" style={{ marginTop: 4 }}>
                {[n.department_name, n.fio_teach, n.time, n.created_at]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
              <div
                className="news-body"
                dangerouslySetInnerHTML={{
                  __html: String(n.text || n.text_bbs || "").slice(0, 1200),
                }}
              />
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
