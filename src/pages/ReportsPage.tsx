import { useEffect, useState } from "react";
import { PageBrand } from "../components/PageBrand";
import { api, type ScheduleResponse } from "../lib/api";

type ReportIndex = {
  study_forms?: Array<{ id_form: string; form_name: string }>;
  months?: Record<string, string>;
};

type MarkSlot = {
  date_vizit?: string;
  date?: string;
  nlenta?: string;
  lenta?: string;
  name_tgroups?: string;
  name_spec?: string;
  short_name_spec?: string;
  name?: string;
};

type ReportData = {
  details_report?: Record<string, Record<string, MarkSlot>>;
  status?: number;
  message?: string;
};

type Planned = {
  date: string;
  lenta: string;
  formKey: string;
  formName: string;
  group: string;
  title: string;
  end?: string;
};

type Miss = {
  date: string;
  lenta: string;
  group: string;
  title: string;
};

type Direction = {
  key: string;
  name: string;
  due: number;
  marked: number;
  upcoming: number;
  missing: Miss[];
};

function isoOf(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseISO(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function addDays(d: Date, n: number) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() + n);
  return x;
}

function mondayOf(d: Date) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = x.getDay();
  x.setDate(x.getDate() + (day === 0 ? -6 : 1 - day));
  return x;
}

function weekOffset(d: Date) {
  return Math.round((mondayOf(d).getTime() - mondayOf(new Date()).getTime()) / (7 * 86400000));
}

function monthWeeks(year: number, month: number) {
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);
  const offsets: number[] = [];
  for (let cursor = mondayOf(first); cursor.getTime() <= mondayOf(last).getTime(); cursor = addDays(cursor, 7)) {
    offsets.push(weekOffset(cursor));
  }
  return offsets;
}

function slotKey(date: string, lenta: string) {
  return `${date}|${lenta}`;
}

function isDue(date: string, end?: string) {
  const today = isoOf(new Date());
  if (date < today) return true;
  if (date > today) return false;
  if (!end) return true;
  const [hh, mm] = end.split(":").map(Number);
  const now = new Date();
  return (hh || 0) * 60 + (mm || 0) <= now.getHours() * 60 + now.getMinutes();
}

function fmtDay(iso: string) {
  const d = parseISO(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const wd = new Intl.DateTimeFormat("ru-RU", { weekday: "short" }).format(d);
  return `${dd}.${mm}, ${wd}`;
}

function collectPlanned(
  weeks: ScheduleResponse[],
  year: number,
  month: number,
  formNames: Record<string, string>,
) {
  const prefix = `${year}-${String(month).padStart(2, "0")}`;
  const out: Planned[] = [];
  for (const week of weeks) {
    const body = week.body;
    if (!body || Array.isArray(body)) continue;
    for (const [lenta, days] of Object.entries(body)) {
      if (!days) continue;
      for (const [dayKey, lesson] of Object.entries(days)) {
        if (!lesson || !(lesson.name_spec || lesson.groups || lesson.eventName)) continue;
        const date = week.dates?.[dayKey] || week.dates?.[String(lesson.weekday)];
        if (!date || !date.startsWith(prefix)) continue;
        const formId = lesson.id_form || "";
        const known = formId && formNames[formId];
        const title = lesson.name_spec || lesson.eventName || "Пара";
        out.push({
          date,
          lenta: String(lesson.lenta || lenta),
          formKey: known ? formId : `other:${title}`,
          formName: known ? formNames[formId] : title,
          group: lesson.groups || "",
          title,
          end: lesson.l_end,
        });
      }
    }
  }
  return out;
}

function collectMarks(report: ReportData | null) {
  const keys = new Set<string>();
  const slots = report?.details_report || {};
  for (const byLenta of Object.values(slots)) {
    if (!byLenta) continue;
    for (const [lenta, item] of Object.entries(byLenta)) {
      if (!item) continue;
      const date = item.date_vizit || item.date;
      const n = String(item.nlenta || item.lenta || lenta);
      if (date) keys.add(slotKey(date, n));
    }
  }
  return keys;
}

function analyze(planned: Planned[], marks: Set<string>): Direction[] {
  const map = new Map<string, Direction>();
  for (const lesson of planned) {
    let row = map.get(lesson.formKey);
    if (!row) {
      row = {
        key: lesson.formKey,
        name: lesson.formName,
        due: 0,
        marked: 0,
        upcoming: 0,
        missing: [],
      };
      map.set(lesson.formKey, row);
    }
    if (!isDue(lesson.date, lesson.end)) {
      row.upcoming += 1;
      continue;
    }
    row.due += 1;
    if (marks.has(slotKey(lesson.date, lesson.lenta))) {
      row.marked += 1;
    } else {
      row.missing.push({
        date: lesson.date,
        lenta: lesson.lenta,
        group: lesson.group,
        title: lesson.title,
      });
    }
  }
  return [...map.values()].sort(
    (a, b) => b.due - b.marked - (a.due - a.marked) || a.name.localeCompare(b.name, "ru"),
  );
}

export function ReportsPage({
  onToast,
}: {
  onToast: (t: string, tone?: "good" | "bad" | "neutral") => void;
}) {
  const now = new Date();
  const [index, setIndex] = useState<ReportIndex | null>(null);
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [directions, setDirections] = useState<Direction[] | null>(null);
  const [loading, setLoading] = useState(true);

  async function load(nextMonth: string, nextYear: string) {
    setLoading(true);
    try {
      const y = Number(nextYear);
      const m = Number(nextMonth);
      const offsets = monthWeeks(y, m);
      const [indexRes, reportRes, ...weekRes] = await Promise.all([
        api.omni<ReportIndex>("report-index", {}),
        api.omni<ReportData>(
          "report",
          { month: String(m), year: String(y), activityTypeId: null, entityId: null },
          false,
        ),
        ...offsets.map((week) => api.omni<ScheduleResponse>("schedule", { week })),
      ]);
      const data = reportRes.data;
      if (data && data.status === 500) throw new Error(data.message || "Omni ответил 500");
      const formNames = Object.fromEntries(
        (indexRes.data?.study_forms || []).map((form) => [String(form.id_form), form.form_name]),
      );
      setIndex(indexRes.data || null);
      const planned = collectPlanned(
        weekRes.map((res) => res.data),
        y,
        m,
        formNames,
      );
      setDirections(analyze(planned, collectMarks(data)));
    } catch (e) {
      setDirections(null);
      onToast(e instanceof Error ? e.message : "Ошибка", "bad");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(month, year);
    // first open only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const years = Array.from({ length: 6 }, (_, i) => String(now.getFullYear() - i));
  const due = directions?.reduce((sum, row) => sum + row.due, 0) ?? 0;
  const marked = directions?.reduce((sum, row) => sum + row.marked, 0) ?? 0;
  const gap = due - marked;
  const upcoming = directions?.reduce((sum, row) => sum + row.upcoming, 0) ?? 0;

  return (
    <div className="app-shell">
      <PageBrand k="nav.reports" />
      <div className="journal-filters">
        <select className="bare-select" value={month} onChange={(e) => setMonth(e.target.value)}>
          {Object.entries(index?.months || {}).length
            ? Object.entries(index?.months || {}).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))
            : <option value={month}>{month}</option>}
        </select>
        <select className="bare-select" value={year} onChange={(e) => setYear(e.target.value)}>
          {years.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <button className="btn block" disabled={loading} onClick={() => void load(month, year)}>
          Показать
        </button>
      </div>

      {loading ? (
        <>
          <div className="skeleton" />
          <div className="skeleton" />
        </>
      ) : !directions ? (
        <div className="empty">Нет данных</div>
      ) : (
        <>
          <div className="report-stats">
            <div className="report-stat">
              <div className="n">{due}</div>
              <div className="l">должно было</div>
            </div>
            <div className="report-stat ok">
              <div className="n">{marked}</div>
              <div className="l">отмечено</div>
            </div>
            <div className={`report-stat ${gap ? "gap" : "ok"}`}>
              <div className="n">{gap}</div>
              <div className="l">расхождение</div>
            </div>
          </div>
          {upcoming ? <div className="mute tiny">Ещё {upcoming} пар в этом месяце не наступили</div> : null}

          <div className="stack-tight">
            {directions.map((row) => {
              const rowGap = row.due - row.marked;
              return (
                <section className="report-dir" key={row.key}>
                  <div className="report-dir-head">
                    <div className="student-name">{row.name}</div>
                    <div className={`list-right ${rowGap ? "gap" : ""}`}>
                      {row.marked}/{row.due}
                      {rowGap ? ` · нет ${rowGap}` : " · сходится"}
                    </div>
                  </div>
                  {row.missing.map((miss) => (
                    <div className="report-miss" key={`${miss.date}-${miss.lenta}-${miss.group}`}>
                      <div className="when">
                        {fmtDay(miss.date)} · {miss.lenta} пара
                        {miss.group ? ` · ${miss.group}` : ""}
                      </div>
                      <div className="what">{miss.title}</div>
                    </div>
                  ))}
                </section>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
