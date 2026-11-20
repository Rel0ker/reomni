import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { PageBrand } from "../components/PageBrand";

type GroupSpec = {
  id_tgroups: string;
  name_tgroups: string;
  order?: string;
  data?: Array<{
    id_tgroups: string;
    source: string;
    id_spec: string | null;
    id_base_spec: string | null;
    name_spec: string;
    order: string;
  }>;
};

type Student = {
  id_stud: string;
  fio_stud: string;
};

type Cell = {
  id_vizit?: string;
  was?: string | number | null;
  mark2?: string | number | null;
  mark3?: string | number | null;
  mark4?: string | number | null;
  theme?: string | null;
  date_vizit?: string;
  nlenta?: string;
};

type HeaderCol = {
  date_vizit: string;
  nlenta: string;
  theme?: string;
};

type Details = {
  data_header: Array<{ date_vizit: string; nlenta: string }>;
  data_body: Record<string, Record<string, Record<string, Cell>>>;
};

const MARK_OPTS = [
  "",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
];

function fmtDate(iso: string) {
  if (!iso || iso.length < 10) return iso;
  const [, m, d] = iso.split("-");
  return `${d}.${m}`;
}

function wasClass(was: string | number | null | undefined) {
  const v = String(was ?? "");
  if (v === "1") return "was-ok";
  if (v === "2") return "was-late";
  if (v === "0") return "was-no";
  return "was-empty";
}

export function JournalPage({
  onToast,
}: {
  onToast: (t: string, tone?: "good" | "bad" | "neutral") => void;
}) {
  const [groups, setGroups] = useState<Record<string, GroupSpec>>({});
  const [groupId, setGroupId] = useState("");
  const [subjectKey, setSubjectKey] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [details, setDetails] = useState<Details | null>(null);
  const [marks, setMarks] = useState<string[]>(MARK_OPTS.slice(1));
  const [markType, setMarkType] = useState<2 | 4>(4);
  const [offset, setOffset] = useState(0);
  const [limit] = useState(6);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const subjects = useMemo(() => groups[groupId]?.data || [], [groups, groupId]);
  const subject = useMemo(
    () =>
      subjects.find(
        (s) => `${s.source}:${s.id_spec || s.id_base_spec}` === subjectKey,
      ),
    [subjects, subjectKey],
  );

  useEffect(() => {
    api
      .omni<string[]>("marks-selects", {})
      .then((r) => {
        if (Array.isArray(r.data) && r.data.length) {
          setMarks(r.data.map(String));
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.omni<{ groups_spec: Record<string, GroupSpec> }>(
          "classwork-index",
          {},
        );
        const gs = res.data.groups_spec || {};
        setGroups(gs);
        const ordered = Object.values(gs).sort(
          (a, b) => Number(b.order || 0) - Number(a.order || 0),
        );
        if (ordered[0]) {
          setGroupId(ordered[0].id_tgroups);
          const specs = [...(ordered[0].data || [])].sort(
            (a, b) => Number(b.order || 0) - Number(a.order || 0),
          );
          if (specs[0]) {
            setSubjectKey(
              `${specs[0].source}:${specs[0].id_spec || specs[0].id_base_spec}`,
            );
          }
        }
      } catch (e) {
        onToast(e instanceof Error ? e.message : "Ошибка", "bad");
      } finally {
        setLoading(false);
      }
    })();
  }, [onToast]);

  useEffect(() => {
    if (!groupId || !subject) return;
    (async () => {
      setLoading(true);
      try {
        const [studRes, detRes] = await Promise.all([
          api.omni<Student[]>("classwork-students", { id_tgroups: groupId }),
          api.omni<Details>("classwork-details", {
            id_tgroups: groupId,
            source: Number(subject.source) === 2 ? 2 : 1,
            id_spec: Number(subject.source) === 2 ? null : subject.id_spec,
            id_base_spec:
              Number(subject.source) === 2 ? subject.id_base_spec : null,
            limit: 40,
            offset: 0,
            year: "",
            month: "",
          }),
        ]);
        setStudents(studRes.data || []);
        setDetails(detRes.data);
        setOffset(0);
      } catch (e) {
        onToast(e instanceof Error ? e.message : "Ошибка", "bad");
      } finally {
        setLoading(false);
      }
    })();
  }, [groupId, subject, onToast]);

  const columns: HeaderCol[] = useMemo(() => {
    const header = details?.data_header || [];
    const body = details?.data_body || {};
    return header.map((h) => {
      let theme = "";
      for (const stud of Object.values(body)) {
        const cell = stud?.[h.date_vizit]?.[h.nlenta];
        if (cell?.theme) {
          theme = String(cell.theme);
          break;
        }
      }
      return { ...h, theme };
    });
  }, [details]);

  const visible = columns.slice(offset, offset + limit);
  const canPrev = offset > 0;
  const canNext = offset + limit < columns.length;

  function getCell(studId: string, col: HeaderCol): Cell | undefined {
    return details?.data_body?.[studId]?.[col.date_vizit]?.[col.nlenta];
  }

  async function saveMark(
    stud: Student,
    col: HeaderCol,
    cell: Cell | undefined,
    value: string,
  ) {
    if (!cell?.id_vizit) {
      onToast("Нет визита — оценку не выставить", "bad");
      return;
    }
    if (markType === 4 && String(cell.was) === "0") {
      onToast("Не был на паре — оценку за урок нельзя", "bad");
      return;
    }
    const key = `${stud.id_stud}:${col.date_vizit}:${col.nlenta}:${markType}`;
    setSaving(key);
    try {
      await api.mutate("classwork-set-mark", {
        type: markType,
        mark: value,
        vizit: cell.id_vizit,
        was: cell.was,
      });
      setDetails((prev) => {
        if (!prev) return prev;
        const next = structuredClone(prev);
        const target =
          next.data_body[stud.id_stud]?.[col.date_vizit]?.[col.nlenta];
        if (target) {
          if (markType === 2) target.mark2 = value || null;
          else target.mark4 = value || null;
        }
        return next;
      });
      onToast("Сохранено", "good");
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Ошибка", "bad");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="app-shell journal-page">
      <PageBrand k="nav.journal" />

      <div className="journal-filters">
        <select
          className="bare-select"
          value={groupId}
          onChange={(e) => {
            setGroupId(e.target.value);
            const specs = groups[e.target.value]?.data || [];
            const sorted = [...specs].sort(
              (a, b) => Number(b.order || 0) - Number(a.order || 0),
            );
            if (sorted[0]) {
              setSubjectKey(
                `${sorted[0].source}:${sorted[0].id_spec || sorted[0].id_base_spec}`,
              );
            }
          }}
        >
          {Object.values(groups).map((g) => (
            <option key={g.id_tgroups} value={g.id_tgroups}>
              {g.name_tgroups}
            </option>
          ))}
        </select>
        <select
          className="bare-select"
          value={subjectKey}
          onChange={(e) => setSubjectKey(e.target.value)}
        >
          {subjects.map((s) => (
            <option
              key={`${s.source}:${s.id_spec || s.id_base_spec}`}
              value={`${s.source}:${s.id_spec || s.id_base_spec}`}
            >
              {s.name_spec}
            </option>
          ))}
        </select>
      </div>

      <div className="journal-toolbar">
        <div className="was journal-type">
          <button
            type="button"
            className={markType === 4 ? "on-cw" : ""}
            onClick={() => setMarkType(4)}
          >
            Урок
          </button>
          <button
            type="button"
            className={markType === 2 ? "on-kw" : ""}
            onClick={() => setMarkType(2)}
          >
            КР
          </button>
        </div>
        <div className="journal-pager">
          <button
            className="icon-btn"
            disabled={!canPrev}
            aria-label="Раньше"
            onClick={() => setOffset((o) => Math.max(0, o - limit))}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
          <span className="mute tiny">
            {columns.length
              ? `${offset + 1}–${Math.min(offset + limit, columns.length)} / ${columns.length}`
              : "0"}
          </span>
          <button
            className="icon-btn"
            disabled={!canNext}
            aria-label="Позже"
            onClick={() =>
              setOffset((o) =>
                Math.min(Math.max(0, columns.length - limit), o + limit),
              )
            }
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="skeleton" />
      ) : !visible.length || !students.length ? (
        <div className="empty">Пусто</div>
      ) : (
        <div className="journal-scroll">
          <table className="journal-table">
            <thead>
              <tr>
                <th className="sticky-col">Студент</th>
                {visible.map((col) => (
                  <th key={`${col.date_vizit}-${col.nlenta}`}>
                    <div className="col-date">
                      {fmtDate(col.date_vizit)}
                      <span className="col-lenta">·{col.nlenta}</span>
                    </div>
                    <div className="col-theme" title={col.theme || ""}>
                      {col.theme || "—"}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map((stud) => (
                <tr key={stud.id_stud}>
                  <th className="sticky-col student-name">{stud.fio_stud}</th>
                  {visible.map((col) => {
                    const cell = getCell(stud.id_stud, col);
                    const value =
                      markType === 2
                        ? cell?.mark2 != null
                          ? String(cell.mark2)
                          : ""
                        : cell?.mark4 != null
                          ? String(cell.mark4)
                          : "";
                    const saveKey = `${stud.id_stud}:${col.date_vizit}:${col.nlenta}:${markType}`;
                    const absent = String(cell?.was ?? "") === "0";
                    const markBlocked =
                      !cell?.id_vizit ||
                      saving === saveKey ||
                      (markType === 4 && absent);
                    return (
                      <td key={`${col.date_vizit}-${col.nlenta}`}>
                        <div className={`journal-cell ${wasClass(cell?.was)}`}>
                          <select
                            className={`mark-select ${markType === 2 ? "mark-kw" : "mark-cw"}`}
                            value={value}
                            disabled={markBlocked}
                            title={
                              markType === 4 && absent
                                ? "Не был на паре"
                                : undefined
                            }
                            onChange={(e) =>
                              saveMark(stud, col, cell, e.target.value)
                            }
                          >
                            {["", ...marks].map((m) => (
                              <option key={m || "empty"} value={m}>
                                {m || "—"}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
