import { useCallback, useEffect, useMemo, useState } from "react";
import { PageBrand } from "../components/PageBrand";
import type { DictKey } from "../i18n/dict";
import { useT } from "../i18n/PrefsContext";
import { api } from "../lib/api";

type ExamBrief = {
  id: string;
  group?: string;
  spec?: string;
  start?: string;
  end?: string;
  attestation_type?: string | number;
  countMark?: string | number;
  id_spec?: string | null;
  id_base_spec?: string | null;
  source?: string;
};

type ExamStudent = {
  id_stud: string;
  fio_stud: string;
  mark?: string | number | null;
  mark_day?: string | null;
  access_mark?: string | number | null;
  need_access?: string | number | null;
  attestation_type?: string | number | null;
  mark_type__id?: string | number | null;
  filename?: string | null;
  download_url?: string | null;
  id_exam?: string;
  photo_pas?: string;
  message_deptor?: string;
  class_price?: string;
};

type ExamDetails = {
  date: string;
  attestation_type?: string | number | null;
  exam: ExamStudent[];
  access_mark: false | Record<string, string>;
};

type CourseWork = {
  course_work_id: string;
  fio_stud?: string;
  group_name?: string;
  name_spec?: string;
  date?: string;
  theme?: string | null;
  mark?: string | number | null;
  photo_pas?: string;
  message_deptor?: string;
  class_price?: string;
};

type Diploma = {
  id: string;
  fio_stud?: string;
  group_name?: string;
  name_spec?: string;
  date?: string;
  theme?: string | null;
  mark?: string | number | null;
  grade?: string | number | null;
  photo_pas?: string;
  message_deptor?: string;
  class_price?: string;
};

type Tab = "current" | "future" | "past" | "course" | "diploma";

const TAB_LABEL: Record<Tab, DictKey> = {
  current: "exams.current",
  future: "exams.future",
  past: "exams.past",
  course: "exams.course",
  diploma: "exams.diploma",
};

function asList<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (raw && typeof raw === "object") {
    return Object.values(raw as Record<string, unknown>).filter(
      (v): v is T => !!v && typeof v === "object",
    ) as T[];
  }
  return [];
}

function parseExamBuckets(raw: unknown): {
  past: ExamBrief[];
  current: ExamBrief[];
  future: ExamBrief[];
} {
  if (!raw || typeof raw !== "object") {
    return { past: [], current: [], future: [] };
  }
  const obj = raw as Record<string, unknown>;
  // Omni: {0: old, 1: current, 2: future} — sometimes a real array of 3 lists
  if (Array.isArray(raw) && raw.length === 3 && Array.isArray(raw[0])) {
    return {
      past: raw[0] as ExamBrief[],
      current: (raw[1] as ExamBrief[]) || [],
      future: (raw[2] as ExamBrief[]) || [],
    };
  }
  return {
    past: asList<ExamBrief>(obj["0"] ?? obj.old ?? obj.old_exams),
    current: asList<ExamBrief>(obj["1"] ?? obj.current ?? obj.current_exams),
    future: asList<ExamBrief>(obj["2"] ?? obj.future ?? obj.future_exams),
  };
}

function fmtDate(iso?: string | null) {
  if (!iso || iso.length < 10) return iso || "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}.${m}.${y.slice(2)}`;
}

function dayValue(iso?: string | null) {
  if (!iso || iso.length < 10) return null;
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return null;
  return Date.UTC(y, m - 1, d);
}

function markLocked(serverDate: string | null, markDay?: string | null) {
  const s = dayValue(serverDate);
  const e = dayValue(markDay);
  if (s == null || e == null) return false;
  return e < s;
}

function normalizeMark(v: string | number | null | undefined) {
  if (v == null || v === "") return "";
  const s = String(v);
  if (s === "0") return "-0";
  return s;
}

function buildMarkOptions(
  attestationType: string | number | null | undefined,
  scale: string[],
  currentMark?: string | number | null,
) {
  const credit = String(attestationType) === "1";
  const opts: { value: string; label: string }[] = [
    { value: "", label: "—" },
    { value: "-0", label: "Н" },
  ];
  if (credit) {
    opts.push(
      { value: "-13", label: "З" },
      { value: "-14", label: "Нз" },
    );
  } else {
    for (const m of scale) {
      opts.push({ value: String(m), label: String(m) });
    }
    const cur = normalizeMark(currentMark);
    if (cur && Number(cur) < 0 && cur !== "-0" && !opts.some((o) => o.value === cur)) {
      opts.push({ value: cur, label: "Авт" });
    }
  }
  return opts;
}

export function ExamsPage({
  onToast,
}: {
  onToast: (t: string, tone?: "good" | "bad" | "neutral") => void;
}) {
  const tr = useT();
  const [tab, setTab] = useState<Tab>("current");
  const [past, setPast] = useState<ExamBrief[]>([]);
  const [current, setCurrent] = useState<ExamBrief[]>([]);
  const [future, setFuture] = useState<ExamBrief[]>([]);
  const [courseWorks, setCourseWorks] = useState<CourseWork[]>([]);
  const [diplomas, setDiplomas] = useState<Diploma[]>([]);
  const [scale, setScale] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [details, setDetails] = useState<ExamDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

  const exams = useMemo(() => {
    if (tab === "past") return past;
    if (tab === "future") return future;
    return current;
  }, [tab, past, current, future]);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const [exRes, marksRes] = await Promise.all([
        api.omni<unknown>("exams", {}),
        api.omni<unknown>("marks-selects", {}),
      ]);
      const buckets = parseExamBuckets(exRes.data);
      setPast(buckets.past);
      setCurrent(buckets.current);
      setFuture(buckets.future);

      const marksRaw = marksRes.data;
      const marks = Array.isArray(marksRaw)
        ? marksRaw.map(String)
        : Object.values((marksRaw as Record<string, unknown>) || {}).map(String);
      setScale(marks.filter((m) => m && !Number.isNaN(Number(m))).sort((a, b) => Number(a) - Number(b)));

      // default tab: current → future → past
      if (buckets.current.length) setTab("current");
      else if (buckets.future.length) setTab("future");
      else if (buckets.past.length) setTab("past");
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Ошибка", "bad");
    } finally {
      setLoading(false);
    }
  }, [onToast]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (tab !== "course" && tab !== "diploma") return;
    let cancelled = false;
    (async () => {
      try {
        if (tab === "course") {
          const res = await api.omni<unknown>("course-works", {});
          if (!cancelled) setCourseWorks(asList<CourseWork>(res.data));
        } else {
          const res = await api.omni<unknown>("diploma-projects", {});
          if (!cancelled) setDiplomas(asList<Diploma>(res.data));
        }
      } catch (e) {
        if (!cancelled) {
          onToast(e instanceof Error ? e.message : "Ошибка", "bad");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, onToast]);

  async function toggleExam(exam: ExamBrief) {
    if (openId === exam.id) {
      setOpenId(null);
      setDetails(null);
      return;
    }
    setOpenId(exam.id);
    setDetails(null);
    setDetailsLoading(true);
    try {
      const res = await api.omni<ExamDetails>("exam-info", { id: exam.id }, false);
      setDetails(res.data);
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Ошибка", "bad");
      setOpenId(null);
    } finally {
      setDetailsLoading(false);
    }
  }

  async function saveExamMark(stud: ExamStudent, value: string) {
    if (!openId) return;
    if (tab === "future") {
      onToast("Будущий экзамен — оценки ещё нельзя", "neutral");
      return;
    }
    if (markLocked(details?.date ?? null, stud.mark_day)) {
      onToast("Оценка уже зафиксирована", "bad");
      return;
    }
    const key = stud.id_stud;
    setSaving(key);
    try {
      await api.mutate("exam-set-mark", {
        mark: value === "" ? null : value,
        id_stud: stud.id_stud,
        id: openId,
      });
      setDetails((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          exam: prev.exam.map((s) =>
            s.id_stud === stud.id_stud
              ? { ...s, mark: value === "" ? null : value }
              : s,
          ),
        };
      });
      onToast("Сохранено", "good");
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Ошибка", "bad");
    } finally {
      setSaving(null);
    }
  }

  async function saveCourseMark(row: CourseWork, value: string) {
    setSaving(row.course_work_id);
    try {
      await api.mutate("exam-set-course-mark", {
        mark: value === "" ? null : value,
        id: row.course_work_id,
      });
      setCourseWorks((prev) =>
        prev.map((r) =>
          r.course_work_id === row.course_work_id
            ? { ...r, mark: value === "" ? null : value }
            : r,
        ),
      );
      onToast("Сохранено", "good");
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Ошибка", "bad");
    } finally {
      setSaving(null);
    }
  }

  async function saveCourseTheme(row: CourseWork, theme: string) {
    try {
      await api.mutate("exam-set-theme", {
        theme,
        id: row.course_work_id,
      });
      setCourseWorks((prev) =>
        prev.map((r) =>
          r.course_work_id === row.course_work_id ? { ...r, theme } : r,
        ),
      );
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Ошибка темы", "bad");
    }
  }

  async function saveDiplomaGrade(row: Diploma, value: string) {
    setSaving(row.id);
    try {
      await api.mutate("exam-set-diploma-grade", {
        grade: value === "" ? null : value,
        id: row.id,
      });
      setDiplomas((prev) =>
        prev.map((r) =>
          r.id === row.id
            ? { ...r, grade: value === "" ? null : value, mark: value === "" ? null : value }
            : r,
        ),
      );
      onToast("Сохранено", "good");
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Ошибка", "bad");
    } finally {
      setSaving(null);
    }
  }

  async function saveDiplomaTheme(row: Diploma, theme: string) {
    try {
      await api.mutate("exam-set-diploma-theme", {
        theme,
        id: row.id,
      });
      setDiplomas((prev) =>
        prev.map((r) => (r.id === row.id ? { ...r, theme } : r)),
      );
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Ошибка темы", "bad");
    }
  }

  const counts: Record<Tab, number> = {
    current: current.length,
    future: future.length,
    past: past.length,
    course: courseWorks.length,
    diploma: diplomas.length,
  };

  return (
    <div className="app-shell exams-page">
      <PageBrand k="nav.exams" />

      <div className="admin-tabs exams-tabs">
        {(Object.keys(TAB_LABEL) as Tab[]).map((tabKey) => (
          <button
            key={tabKey}
            type="button"
            className={`admin-tab${tab === tabKey ? " on" : ""}`}
            onClick={() => {
              setTab(tabKey);
              setOpenId(null);
              setDetails(null);
            }}
          >
            {tr(TAB_LABEL[tabKey])}
            {counts[tabKey] > 0 ? (
              <span className="exams-tab-count">{counts[tabKey]}</span>
            ) : null}
          </button>
        ))}
      </div>

      {loading ? <div className="skeleton" /> : null}

      {!loading && (tab === "current" || tab === "future" || tab === "past") ? (
        exams.length === 0 ? (
          <div className="empty">{tr("exams.empty")}</div>
        ) : (
          <div className="stack-tight">
            {exams.map((exam) => {
              const open = openId === exam.id;
              return (
                <div key={exam.id} className={`exam-card${open ? " open" : ""}`}>
                  <button
                    type="button"
                    className="exam-card-head"
                    onClick={() => void toggleExam(exam)}
                  >
                    <div>
                      <div className="student-name">
                        {exam.group || "—"}
                        <span className="mute"> · </span>
                        <span
                          dangerouslySetInnerHTML={{
                            __html: exam.spec || "—",
                          }}
                        />
                      </div>
                      <div className="mute tiny">
                        {[
                          `${fmtDate(exam.start)} – ${fmtDate(exam.end)}`,
                          exam.countMark != null && exam.countMark !== ""
                            ? `оценок: ${exam.countMark}`
                            : null,
                          String(exam.attestation_type) === "1" ? "зачёт" : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    </div>
                    <div className="list-right mute">{open ? "▾" : "▸"}</div>
                  </button>

                  {open ? (
                    <div className="exam-card-body">
                      {detailsLoading || !details ? (
                        <div className="skeleton" />
                      ) : details.exam.length === 0 ? (
                        <div className="empty">{tr("exams.noStudents")}</div>
                      ) : (
                        <div className="exam-studs">
                          {details.exam.map((stud, idx) => {
                            const locked =
                              tab === "future" ||
                              markLocked(details.date, stud.mark_day) ||
                              saving === stud.id_stud;
                            const opts = buildMarkOptions(
                              details.attestation_type ??
                                stud.attestation_type ??
                                exam.attestation_type,
                              scale,
                              stud.mark,
                            );
                            const value = normalizeMark(stud.mark);
                            return (
                              <div className="exam-stud-row" key={stud.id_stud}>
                                <div className="exam-stud-meta">
                                  <span className="mute tiny">{idx + 1}</span>
                                  <div>
                                    <div className="student-name">
                                      {stud.fio_stud}
                                    </div>
                                    {stud.message_deptor ? (
                                      <div className="mute tiny">
                                        {stud.message_deptor}
                                      </div>
                                    ) : null}
                                    {stud.download_url ? (
                                      <a
                                        className="text-link tiny"
                                        href={stud.download_url}
                                        target="_blank"
                                        rel="noreferrer"
                                      >
                                        работа
                                      </a>
                                    ) : null}
                                  </div>
                                </div>
                                <select
                                  className="mark-select mark-cw"
                                  value={value}
                                  disabled={locked}
                                  title={
                                    tab === "future"
                                      ? "Будущий экзамен"
                                      : markLocked(details.date, stud.mark_day)
                                        ? "Оценка зафиксирована"
                                        : undefined
                                  }
                                  onChange={(e) =>
                                    void saveExamMark(stud, e.target.value)
                                  }
                                >
                                  {opts.map((o) => (
                                    <option key={o.value || "empty"} value={o.value}>
                                      {o.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )
      ) : null}

      {!loading && tab === "course" ? (
        courseWorks.length === 0 ? (
          <div className="empty">{tr("exams.noCourse")}</div>
        ) : (
          <div className="stack-tight">
            {courseWorks.map((row) => {
              const opts = buildMarkOptions("2", scale, row.mark);
              return (
                <div className="exam-card" key={row.course_work_id}>
                  <div className="exam-card-head static">
                    <div>
                      <div className="student-name">{row.fio_stud || "—"}</div>
                      <div className="mute tiny">
                        {[row.group_name, row.name_spec, fmtDate(row.date)]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    </div>
                    <select
                      className="mark-select mark-cw"
                      value={normalizeMark(row.mark)}
                      disabled={saving === row.course_work_id}
                      onChange={(e) => void saveCourseMark(row, e.target.value)}
                    >
                      {opts.map((o) => (
                        <option key={o.value || "empty"} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="exam-card-body">
                    <input
                      className="bare-input"
                      defaultValue={row.theme || ""}
                      placeholder="Тема курсовой"
                      onBlur={(e) => {
                        const theme = e.target.value.trim();
                        if (theme !== (row.theme || "")) {
                          void saveCourseTheme(row, theme);
                        }
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : null}

      {!loading && tab === "diploma" ? (
        diplomas.length === 0 ? (
          <div className="empty">{tr("exams.noDiploma")}</div>
        ) : (
          <div className="stack-tight">
            {diplomas.map((row) => {
              const grade = row.grade ?? row.mark;
              const opts = buildMarkOptions("2", scale, grade);
              return (
                <div className="exam-card" key={row.id}>
                  <div className="exam-card-head static">
                    <div>
                      <div className="student-name">{row.fio_stud || "—"}</div>
                      <div className="mute tiny">
                        {[row.group_name, row.name_spec, fmtDate(row.date)]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    </div>
                    <select
                      className="mark-select mark-cw"
                      value={normalizeMark(grade)}
                      disabled={saving === row.id}
                      onChange={(e) =>
                        void saveDiplomaGrade(row, e.target.value)
                      }
                    >
                      {opts.map((o) => (
                        <option key={o.value || "empty"} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="exam-card-body">
                    <input
                      className="bare-input"
                      defaultValue={row.theme || ""}
                      placeholder="Тема диплома"
                      onBlur={(e) => {
                        const theme = e.target.value.trim();
                        if (theme !== (row.theme || "")) {
                          void saveDiplomaTheme(row, theme);
                        }
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : null}
    </div>
  );
}
