import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

type Spec = {
  id_tgroups: string;
  source: string;
  id_spec: string | null;
  id_base_spec: string | null;
  name_spec: string;
  order: string;
};

type GroupSpec = {
  id_tgroups: string;
  name_tgroups: string;
  order?: string;
  data?: Spec[];
};

type Student = {
  id_stud: string;
  fio_stud: string;
  photo_pas?: string;
  mv_stud?: string | number;
  price?: string | number;
  message_deptor?: string;
  class_price?: string;
};

type HeaderCol = {
  date_vizit: string;
  nlenta: string;
  name_spec?: string;
  theme?: string;
};

type Cell = {
  id_vizit?: string;
  was?: string | number | null;
  mark2?: string | number | null;
  mark4?: string | number | null;
  mark5?: string | number | null;
  home_work?: string | number | null;
  lab_work?: string | number | null;
  theme?: string | null;
  comments?: string | null;
  name_spec?: string | null;
};

type TableData = {
  data_header: HeaderCol[];
  data_body: Record<string, Record<string, Record<string, Cell>>>;
};

function subjectKeyOf(s: Spec) {
  return `${s.source}:${s.id_spec || s.id_base_spec || ""}`;
}

function fmtDate(iso: string) {
  if (!iso || iso.length < 10) return iso || "—";
  const [, m, d] = iso.split("-");
  return `${d}.${m}`;
}

function wasClass(was: string | number | null | undefined) {
  const v = String(was ?? "");
  if (v === "1") return "att-was";
  if (v === "2") return "att-late";
  if (v === "0") return "att-no";
  return "att-empty";
}

function markVal(v: string | number | null | undefined) {
  if (v == null || v === "" || Number(v) <= 0) return null;
  return String(v);
}

export function GroupsPage({
  onToast,
}: {
  onToast: (t: string, tone?: "good" | "bad" | "neutral") => void;
}) {
  const [groups, setGroups] = useState<Record<string, GroupSpec>>({});
  const [groupId, setGroupId] = useState("");
  const [subjectKey, setSubjectKey] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [table, setTable] = useState<TableData | null>(null);
  const [offset, setOffset] = useState(0);
  const [limit] = useState(6);
  const [loading, setLoading] = useState(true);
  const [transferred, setTransferred] = useState(false);

  const subjects = useMemo(() => groups[groupId]?.data || [], [groups, groupId]);
  const subject = useMemo(
    () => subjects.find((s) => subjectKeyOf(s) === subjectKey),
    [subjects, subjectKey],
  );

  const visibleStudents = useMemo(() => {
    if (transferred) return students;
    return students.filter((s) => String(s.mv_stud ?? "1") !== "0");
  }, [students, transferred]);

  const hasTransferred = useMemo(
    () => students.some((s) => String(s.mv_stud ?? "1") === "0"),
    [students],
  );

  const columns = useMemo(() => {
    const header = table?.data_header || [];
    const body = table?.data_body || {};
    return header.map((h) => {
      let theme = h.theme || "";
      let nameSpec = h.name_spec || "";
      if (!theme || !nameSpec) {
        for (const stud of Object.values(body)) {
          const cell = stud?.[h.date_vizit]?.[h.nlenta];
          if (!theme && cell?.theme) theme = String(cell.theme);
          if (!nameSpec && cell?.name_spec) nameSpec = String(cell.name_spec);
          if (theme && nameSpec) break;
        }
      }
      return { ...h, theme, name_spec: nameSpec };
    });
  }, [table]);

  const visible = columns.slice(offset, offset + limit);
  const canPrev = offset > 0;
  const canNext = offset + limit < columns.length;

  useEffect(() => {
    (async () => {
      setLoading(true);
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
          setSubjectKey(specs[0] ? subjectKeyOf(specs[0]) : "");
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
        const src = Number(subject.source) === 2 ? 2 : 1;
        const [studs, tbl] = await Promise.all([
          api.omni<Student[]>("groups-students", {
            id_tgroups: groupId,
            spec: subject,
          }),
          api.omni<TableData>("groups-table", {
            id_tgroups: groupId,
            source: src,
            id_spec: src === 2 ? null : subject.id_spec,
            id_base_spec: src === 2 ? subject.id_base_spec : null,
            limit: 40,
            offset: 0,
          }),
        ]);
        setStudents(Array.isArray(studs.data) ? studs.data : []);
        setTable(tbl.data || null);
        setOffset(0);
      } catch (e) {
        onToast(e instanceof Error ? e.message : "Ошибка", "bad");
      } finally {
        setLoading(false);
      }
    })();
  }, [groupId, subject, onToast]);

  function getCell(studId: string, col: HeaderCol): Cell | undefined {
    return table?.data_body?.[studId]?.[col.date_vizit]?.[col.nlenta];
  }

  return (
    <div className="app-shell journal-page att-page">
      <div className="brand">Посещаемость</div>

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
            setSubjectKey(sorted[0] ? subjectKeyOf(sorted[0]) : "");
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
            <option key={subjectKeyOf(s)} value={subjectKeyOf(s)}>
              {s.name_spec}
            </option>
          ))}
        </select>
      </div>

      <div className="att-legend">
        <span>
          <i className="att-chip att-was" /> Был
        </span>
        <span>
          <i className="att-chip att-late" /> Опоздал
        </span>
        <span>
          <i className="att-chip att-no" /> Не был
        </span>
        <span className="att-mark-legend">
          <b className="m-hw">ДЗ</b>
          <b className="m-kw">КР</b>
          <b className="m-cw">Урок</b>
          <b className="m-lw">ЛР</b>
        </span>
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
      ) : !visible.length || !visibleStudents.length ? (
        <div className="empty">Пусто</div>
      ) : (
        <div className="journal-scroll">
          <table className="journal-table att-table">
            <thead>
              <tr>
                <th className="sticky-col">Студент</th>
                {visible.map((col, i) => (
                  <th key={`${col.date_vizit}-${col.nlenta}`}>
                    <div className="col-date">
                      {fmtDate(col.date_vizit)}
                      <span className="col-lenta">
                        ·{col.nlenta} пара
                      </span>
                    </div>
                    <div className="col-pair-num mute tiny">
                      №{columns.length - offset - i}
                    </div>
                    <div
                      className="col-theme"
                      title={[col.name_spec, col.theme].filter(Boolean).join(" · ")}
                    >
                      {col.theme || col.name_spec || "—"}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(() => {
                let activeIdx = 0;
                return visibleStudents.map((stud) => {
                  const isOld = String(stud.mv_stud ?? "1") === "0";
                  const num = isOld ? "" : String(++activeIdx);
                  return (
                <tr
                  key={stud.id_stud}
                  className={isOld ? "att-old" : undefined}
                >
                  <th className="sticky-col student-name">
                    <span className="hw-stud-idx">{num}</span>
                    <span
                      className={
                        Number(stud.price) === 2
                          ? "att-debt-hard"
                          : Number(stud.price) === 1
                            ? "att-debt-soft"
                            : undefined
                      }
                    >
                      {stud.fio_stud}
                    </span>
                    {stud.message_deptor ? (
                      <div className="mute tiny">({stud.message_deptor})</div>
                    ) : null}
                  </th>
                  {visible.map((col) => {
                    const cell = getCell(stud.id_stud, col);
                    const marks = [
                      { cls: "m-hw", v: markVal(cell?.home_work) },
                      { cls: "m-kw", v: markVal(cell?.mark2) },
                      { cls: "m-cw", v: markVal(cell?.mark4) },
                      { cls: "m-lw", v: markVal(cell?.lab_work || cell?.mark5) },
                    ].filter((m) => m.v);
                    return (
                      <td key={`${col.date_vizit}-${col.nlenta}`}>
                        <div
                          className={`att-cell ${wasClass(cell?.was)}`}
                          title={cell?.comments || ""}
                        >
                          {marks.length ? (
                            <div className="att-marks">
                              {marks.map((m) => (
                                <span key={m.cls} className={`att-mark ${m.cls}`}>
                                  {m.v}
                                </span>
                              ))}
                            </div>
                          ) : null}
                          {cell?.comments ? <span className="att-comment-dot" /> : null}
                        </div>
                      </td>
                    );
                  })}
                </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
      )}

      {!loading && hasTransferred ? (
        <button
          type="button"
          className="text-link att-transferred-toggle"
          onClick={() => setTransferred((v) => !v)}
        >
          {transferred
            ? "Скрыть переведённых студентов"
            : "Показать переведённых студентов"}
        </button>
      ) : null}
    </div>
  );
}
