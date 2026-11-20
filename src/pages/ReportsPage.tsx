import { useEffect, useState } from "react";
import { api } from "../lib/api";

type ReportIndex = {
  study_forms?: Array<{ id_form: string; form_name: string }>;
  months?: Record<string, string>;
  events?: unknown[];
  activity_types?: Record<string, string>;
};

export function ReportsPage({
  onToast,
}: {
  onToast: (t: string, tone?: "good" | "bad" | "neutral") => void;
}) {
  const [index, setIndex] = useState<ReportIndex | null>(null);
  const [formId, setFormId] = useState("");
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [report, setReport] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.omni<ReportIndex>("report-index", {});
        setIndex(res.data || null);
        const forms = res.data?.study_forms || [];
        if (forms[0]) setFormId(forms[0].id_form);
      } catch (e) {
        onToast(e instanceof Error ? e.message : "Ошибка", "bad");
      } finally {
        setLoading(false);
      }
    })();
  }, [onToast]);

  async function loadReport() {
    setLoading(true);
    try {
      const res = await api.omni<unknown>(
        "report",
        { id_form: formId, month: Number(month) },
        false,
      );
      setReport(res.data);
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Ошибка", "bad");
    } finally {
      setLoading(false);
    }
  }

  const rows =
    report && typeof report === "object"
      ? Array.isArray(report)
        ? (report as unknown[])
        : Object.entries(report as Record<string, unknown>)
      : [];

  return (
    <div className="app-shell">
      <div className="brand">Контроль</div>
      <div className="journal-filters">
        <select
          className="bare-select"
          value={formId}
          onChange={(e) => setFormId(e.target.value)}
        >
          {(index?.study_forms || []).map((f) => (
            <option key={f.id_form} value={f.id_form}>
              {f.form_name}
            </option>
          ))}
        </select>
        <select
          className="bare-select"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        >
          {Object.entries(index?.months || {}).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <button className="btn block" disabled={!formId || loading} onClick={loadReport}>
          Показать
        </button>
      </div>

      {loading ? (
        <div className="skeleton" />
      ) : rows.length === 0 ? (
        <div className="empty">Выберите фильтры</div>
      ) : (
        <div className="stack-tight">
          {rows.slice(0, 80).map((row, i) => {
            if (Array.isArray(row)) {
              const [k, v] = row as [string, unknown];
              return (
                <div className="list-row" key={k}>
                  <div className="student-name">{k}</div>
                  <div className="list-right mute tiny">
                    {typeof v === "object" ? "…" : String(v ?? "")}
                  </div>
                </div>
              );
            }
            const r = row as Record<string, unknown>;
            return (
              <div className="list-row" key={i}>
                <div className="student-name">
                  {String(r.name || r.fio_stud || r.form_name || r.title || i)}
                </div>
                <div className="list-right mute tiny">
                  {String(r.value ?? r.count ?? r.mark ?? "")}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
