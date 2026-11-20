import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { PageBrand } from "../components/PageBrand";

type ContentForm = {
  filial?: string;
  username?: string;
  corpEmail?: string;
  phone?: string | null;
  material?: Array<{ id?: string | number; name?: string; [k: string]: unknown }>;
  spec?: Array<{ id?: string | number; name?: string; [k: string]: unknown }>;
  [k: string]: unknown;
};

export function ContentAuthorPage({
  onToast,
}: {
  onToast: (t: string, tone?: "good" | "bad" | "neutral") => void;
}) {
  const [form, setForm] = useState<ContentForm | null>(null);
  const [materialId, setMaterialId] = useState("");
  const [specId, setSpecId] = useState("");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.omni<ContentForm>("content-form", {});
        setForm(res.data || null);
      } catch (e) {
        onToast(e instanceof Error ? e.message : "Ошибка", "bad");
      } finally {
        setLoading(false);
      }
    })();
  }, [onToast]);

  const materials = useMemo(
    () => (Array.isArray(form?.material) ? form!.material! : []),
    [form],
  );
  const specs = useMemo(
    () => (Array.isArray(form?.spec) ? form!.spec! : []),
    [form],
  );

  return (
    <div className="app-shell">
      <PageBrand k="nav.contentAuthor" />
      {loading ? (
        <div className="skeleton" />
      ) : !form ? (
        <div className="empty">Нет доступа</div>
      ) : (
        <>
          <div className="profile-hero">
            <div style={{ opacity: 0.55, fontWeight: 650 }}>{form.filial || "—"}</div>
            <div className="who">{form.username || "—"}</div>
            <div className="sub">{form.corpEmail || ""}</div>
          </div>

          <select
            className="bare-select"
            value={materialId}
            onChange={(e) => setMaterialId(e.target.value)}
          >
            <option value="">Материал</option>
            {materials.map((m, i) => (
              <option key={String(m.id ?? i)} value={String(m.id ?? i)}>
                {String(m.name || m.title || m.id || i)}
              </option>
            ))}
          </select>

          <select
            className="bare-select"
            value={specId}
            onChange={(e) => setSpecId(e.target.value)}
          >
            <option value="">Специализация</option>
            {specs.map((s, i) => (
              <option key={String(s.id ?? i)} value={String(s.id ?? i)}>
                {String(s.name || s.title || s.id || i)}
              </option>
            ))}
          </select>

          <textarea
            className="bare-input"
            style={{ minHeight: 120, resize: "vertical" }}
            placeholder="Что исправить"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />

          <button
            className="btn block signal"
            disabled={busy || !comment.trim()}
            onClick={async () => {
              setBusy(true);
              try {
                const payload = {
                  ContentAuthorForm: {
                    ...form,
                    material_id: materialId || undefined,
                    spec_id: specId || undefined,
                    comment: comment.trim(),
                    text: comment.trim(),
                  },
                };
                await api.mutate("content-send", payload);
                onToast("Отправлено", "good");
                setComment("");
              } catch (e) {
                onToast(e instanceof Error ? e.message : "Ошибка", "bad");
              } finally {
                setBusy(false);
              }
            }}
          >
            Отправить
          </button>
        </>
      )}
    </div>
  );
}
