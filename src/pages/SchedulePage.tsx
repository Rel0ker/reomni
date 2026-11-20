import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageBrand } from "../components/PageBrand";
import { usePrefs } from "../i18n/PrefsContext";
import { api, type ScheduleLesson, type ScheduleResponse } from "../lib/api";

type View = "day" | "week" | "month";

const VIEW_KEY = "omni_fast_sched_view";

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
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

function weekOffset(d: Date) {
  const target = mondayOf(d).getTime();
  const now = mondayOf(new Date()).getTime();
  return Math.round((target - now) / (7 * 86400000));
}

function monthWeekOffsets(anchor: Date) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  const start = mondayOf(first);
  const end = mondayOf(last);
  const offsets: number[] = [];
  for (let cursor = start; cursor.getTime() <= end.getTime(); cursor = addDays(cursor, 7)) {
    offsets.push(weekOffset(cursor));
  }
  return offsets;
}

function localeOf(lang: string) {
  return lang === "en" ? "en-GB" : "ru-RU";
}

function monthName(d: Date, lang: string) {
  const sample = new Intl.DateTimeFormat(localeOf(lang), {
    day: "numeric",
    month: "long",
  }).format(new Date(d.getFullYear(), d.getMonth(), 1));
  return sample.replace(/^\d+[\s\u00a0]*/, "");
}

function monthTitle(d: Date, lang: string) {
  const raw = new Intl.DateTimeFormat(localeOf(lang), {
    month: "long",
    year: "numeric",
  }).format(d);
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function dayTitle(iso: string, lang: string) {
  return new Intl.DateTimeFormat(localeOf(lang), {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(parseISO(iso));
}

function dotDate(d: Date) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(2);
  return `${dd}.${mm}.${yy}`;
}

function shortDay(iso: string) {
  const d = parseISO(iso);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function lessonAt(data: ScheduleResponse | undefined, lenta: string, dayKey: string) {
  const body = data?.body;
  if (!body || Array.isArray(body)) return null;
  const lesson = body[lenta]?.[dayKey];
  if (!lesson || !(lesson.name_spec || lesson.groups || lesson.eventName)) return null;
  return lesson;
}

function lentaNumbers(data: ScheduleResponse | undefined) {
  const nums = new Set<number>();
  for (const row of data?.lents || []) {
    for (const slot of Object.values(row || {})) {
      const n = Number(slot?.n_lenta);
      if (Number.isFinite(n)) nums.add(n);
    }
  }
  const body = data?.body;
  if (body && !Array.isArray(body)) {
    for (const key of Object.keys(body)) {
      const n = Number(key);
      if (Number.isFinite(n)) nums.add(n);
    }
  }
  const sorted = [...nums].sort((a, b) => a - b);
  if (!sorted.length || !body || Array.isArray(body)) return sorted;
  let last = sorted[0];
  for (const [lenta, days] of Object.entries(body)) {
    const has = Object.values(days || {}).some(
      (lesson) => lesson && (lesson.name_spec || lesson.groups || lesson.eventName),
    );
    if (has) last = Math.max(last, Number(lenta));
  }
  const rows: number[] = [];
  for (let n = sorted[0]; n <= last; n += 1) rows.push(n);
  return rows;
}

function lessonsOf(data: ScheduleResponse | undefined, dayKey: string) {
  const body = data?.body;
  if (!body || Array.isArray(body)) return [] as Array<{ lenta: string; lesson: ScheduleLesson }>;
  const out: Array<{ lenta: string; lesson: ScheduleLesson }> = [];
  for (const [lenta, days] of Object.entries(body)) {
    const lesson = days?.[dayKey];
    if (lesson?.name_spec || lesson?.groups) out.push({ lenta, lesson });
  }
  return out.sort((a, b) => Number(a.lenta) - Number(b.lenta));
}

function findDay(
  byWeek: Record<number, ScheduleResponse>,
  offsets: number[],
  iso: string,
) {
  for (const offset of offsets) {
    const data = byWeek[offset];
    if (!data?.dates) continue;
    const key = Object.entries(data.dates).find(([, value]) => value === iso)?.[0];
    if (key) return { data, key };
  }
  return null;
}

function monthGroups(days: Array<{ iso: string }>, lang: string) {
  const groups: Array<{ name: string; count: number; key: string }> = [];
  days.forEach((day, index) => {
    const name = monthName(parseISO(day.iso), lang);
    const last = groups[groups.length - 1];
    if (last && last.name === name) last.count += 1;
    else groups.push({ name, count: 1, key: `${name}-${index}` });
  });
  return groups;
}

function lessonTitle(lesson: ScheduleLesson) {
  if (lesson.scheduleType === "event" && lesson.eventName) return lesson.eventName;
  return lesson.name_spec;
}

function explainOmni(
  message: string | undefined,
  cached: boolean,
  tr: (key: "omni.offline" | "omni.offlineCached" | "omni.session") => string,
) {
  if (/сессия/i.test(message || "")) return tr("omni.session");
  return cached ? tr("omni.offlineCached") : tr("omni.offline");
}

function lessonPassed(iso: string, end?: string) {
  if (!iso) return false;
  const today = isoOf(new Date());
  if (iso < today) return true;
  if (iso > today || !end) return false;
  const [hh, mm] = end.split(":").map(Number);
  const now = new Date();
  return (hh || 0) * 60 + (mm || 0) <= now.getHours() * 60 + now.getMinutes();
}

function readView(): View {
  try {
    const v = localStorage.getItem(VIEW_KEY);
    if (v === "day" || v === "week" || v === "month") return v;
  } catch {
    /* ignore */
  }
  return "day";
}

export function SchedulePage({
  onToast,
}: {
  onToast: (t: string, tone?: "good" | "bad" | "neutral") => void;
}) {
  const nav = useNavigate();
  const { t, lang } = usePrefs();
  const today = isoOf(new Date());
  const [view, setView] = useState<View>(readView);
  const [anchor, setAnchor] = useState(today);
  const [byWeek, setByWeek] = useState<Record<number, ScheduleResponse>>({});
  const [staleNote, setStaleNote] = useState<Record<number, string>>({});
  const [linkError, setLinkError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const anchorDate = parseISO(anchor);
  const offsets = useMemo(
    () => (view === "month" ? monthWeekOffsets(anchorDate) : [weekOffset(anchorDate)]),
    [view, anchor],
  );
  const loadKey = offsets.join(",");

  useEffect(() => {
    let cancelled = false;
    const missing = offsets.filter((offset) => byWeek[offset] == null);
    if (missing.length === 0) {
      setLoading(false);
      setLinkError(null);
      return;
    }
    setLoading(true);
    (async () => {
      try {
        const results = await Promise.all(
          missing.map((week) => api.omni<ScheduleResponse>("schedule", { week })),
        );
        if (cancelled) return;
        setByWeek((prev) => {
          const next = { ...prev };
          missing.forEach((offset, i) => {
            next[offset] = results[i].data;
          });
          return next;
        });
        setStaleNote((prev) => {
          const next = { ...prev };
          missing.forEach((offset, i) => {
            if (results[i].stale) next[offset] = explainOmni(results[i].warning, true, t);
            else delete next[offset];
          });
          return next;
        });
        setLinkError(null);
      } catch (e) {
        if (!cancelled) {
          setLinkError(
            explainOmni(e instanceof Error ? e.message : "", false, t),
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadKey, byWeek, offsets, t]);

  const weekData = byWeek[offsets[0]];
  const weekDays = useMemo(() => {
    if (view === "month" || !weekData?.dates) return [];
    return Object.entries(weekData.dates)
      .map(([key, iso]) => ({ key, iso }))
      .sort((a, b) => a.iso.localeCompare(b.iso));
  }, [view, weekData]);

  const monthCells = useMemo(() => {
    if (view !== "month") return [];
    const first = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
    const start = mondayOf(first);
    const cells = Array.from({ length: 42 }, (_, i) => addDays(start, i));
    let count = 42;
    while (
      count > 28 &&
      cells[count - 7].getMonth() !== anchorDate.getMonth()
    ) {
      count -= 7;
    }
    return cells.slice(0, count);
  }, [view, anchor]);

  const weekdayHeads = useMemo(() => {
    const monday = mondayOf(new Date(2026, 0, 5));
    const fmt = new Intl.DateTimeFormat(localeOf(lang), { weekday: "short" });
    return Array.from({ length: 7 }, (_, i) => fmt.format(addDays(monday, i)));
  }, [lang]);

  function chooseView(next: View) {
    setView(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {
      /* ignore */
    }
  }

  function shift(dir: -1 | 1) {
    if (view !== "month") {
      setAnchor(isoOf(addDays(anchorDate, dir * 7)));
      return;
    }
    const next = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + dir, 1);
    const last = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
    next.setDate(Math.min(anchorDate.getDate(), last));
    setAnchor(isoOf(next));
  }

  function openLesson(iso: string, lenta: string, lesson: ScheduleLesson) {
    const q = new URLSearchParams({ date: iso, lenta });
    if (lesson.groups) q.set("label", lesson.groups);
    nav(`/pair?${q.toString()}`);
  }

  function lessonList(iso: string, items: Array<{ lenta: string; lesson: ScheduleLesson }>) {
    if (items.length === 0) return <div className="sched-day-empty">{t("schedule.empty")}</div>;
    return items.map(({ lenta, lesson }) => (
      <button
        key={`${iso}-${lenta}-${lesson.groups}`}
        className={`lesson${lessonPassed(iso, lesson.l_end) ? " past" : ""}`}
        onClick={() => openLesson(iso, lenta, lesson)}
      >
        <span className="rail" />
        <span className="body">
          <span className="time">
            {lesson.l_start}–{lesson.l_end}
          </span>
          <span className="spec">{lesson.name_spec}</span>
          <span className="meta">
            {lesson.groups}
            {lesson.num_rooms ? ` · ${lesson.num_rooms}` : ""}
          </span>
        </span>
        <span className="num">{lenta}</span>
      </button>
    ));
  }

  const linkBanner =
    linkError || offsets.map((offset) => staleNote[offset]).find(Boolean) || null;

  const weekMonday = mondayOf(anchorDate);
  const weekSunday = addDays(weekMonday, 6);
  const weekStartIso = isoOf(weekMonday);
  const weekEndIso = isoOf(weekSunday);
  const focusIso =
    today >= weekStartIso && today <= weekEndIso ? today : weekStartIso;
  const rows = lentaNumbers(weekData);
  const groups = monthGroups(weekDays, lang);

  const picked =
    view === "month" ? findDay(byWeek, offsets, anchor) : null;
  const pickedLessons = picked ? lessonsOf(picked.data, picked.key) : [];
  const dayLessons = lessonsOf(
    weekData,
    weekDays.find((day) => day.iso === anchor)?.key || "",
  );

  const prevBtn = (
    <button className="icon-btn" aria-label={t("schedule.prev")} onClick={() => shift(-1)}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
        <path d="M15 5l-7 7 7 7" />
      </svg>
    </button>
  );
  const nextBtn = (
    <button className="icon-btn" aria-label={t("schedule.next")} onClick={() => shift(1)}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
        <path d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );

  return (
    <div className={`app-shell sched-page ${view === "week" ? "week-mode" : ""}`}>
      <div className="brand-desktop-hide">
        <PageBrand k="nav.schedule" />
      </div>

      <div className="prefs-seg sched-view">
        <button
          type="button"
          className={view === "day" ? "on" : undefined}
          onClick={() => chooseView("day")}
        >
          {t("schedule.day")}
        </button>
        <button
          type="button"
          className={view === "week" ? "on" : undefined}
          onClick={() => chooseView("week")}
        >
          {t("schedule.week")}
        </button>
        <button
          type="button"
          className={view === "month" ? "on" : undefined}
          onClick={() => chooseView("month")}
        >
          {t("schedule.month")}
        </button>
      </div>

      {linkBanner ? <div className="omni-offline">{linkBanner}</div> : null}

      {view === "day" ? (
        <>
          <h1 className="page-date schedule-date">{dayTitle(anchor, lang)}</h1>
          <div className="day-strip">
            {prevBtn}
            <div className="days-board">
              {groups.map((group) => (
                <div key={group.key} className="month-cap" style={{ gridColumn: `span ${group.count}` }}>
                  {group.name}
                </div>
              ))}
              {weekDays.map(({ key, iso }) => (
                <button
                  key={key}
                  type="button"
                  className={iso === anchor ? "active" : undefined}
                  onClick={() => setAnchor(iso)}
                >
                  <div className="d">{weekData?.daysShort?.[key] || ""}</div>
                  <div className="n">{parseISO(iso).getDate()}</div>
                </button>
              ))}
            </div>
            {nextBtn}
          </div>
          {loading && !weekData ? (
            <>
              <div className="skeleton" />
              <div className="skeleton" />
            </>
          ) : (
            lessonList(anchor, dayLessons)
          )}
        </>
      ) : null}

      {view === "week" ? (
        <>
          <div className="week-top">
            <h1 className="week-curdate">{dayTitle(focusIso, lang)}</h1>
            <div className="week-range-nav">
              {prevBtn}
              <div className="week-range">
                {dotDate(weekMonday)} – {dotDate(weekSunday)}
              </div>
              {nextBtn}
            </div>
          </div>
          {loading && !weekData ? (
            <div className="skeleton" />
          ) : (
            <div className="week-scroll">
              <table className="week-grid">
                <thead>
                  <tr>
                    <th className="pair-col">{t("schedule.pair")}</th>
                    {weekDays.map(({ key, iso }) => (
                      <th
                        key={key}
                        className={[iso === today ? "today" : "", key === "6" || key === "7" ? "weekend" : ""]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {weekData?.daysShort?.[key] || ""} {shortDay(iso)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((lenta) => (
                    <tr key={lenta}>
                      <th className="pair-col">{lenta}</th>
                      {weekDays.map(({ key, iso }) => {
                        const lesson = lessonAt(weekData, String(lenta), key);
                        const weekend = key === "6" || key === "7";
                        return (
                          <td
                            key={key}
                            className={[iso === today ? "today" : "", weekend ? "weekend" : ""]
                              .filter(Boolean)
                              .join(" ")}
                          >
                            {lesson ? (
                              <button
                                type="button"
                                className={`week-cell${lessonPassed(iso, lesson.l_end) ? " past" : ""}`}
                                onClick={() => openLesson(iso, String(lenta), lesson)}
                              >
                                <span className="week-spec">{lessonTitle(lesson)}</span>
                                {lesson.groups ? <span className="week-group">{lesson.groups}</span> : null}
                                {lesson.num_rooms ? <span className="week-room">{lesson.num_rooms}</span> : null}
                                <span className="week-time">
                                  {lesson.l_start}–{lesson.l_end}
                                </span>
                              </button>
                            ) : null}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : null}

      {view === "month" ? (
        <>
          <div className="sched-nav">
            {prevBtn}
            <h1 className="page-date schedule-date sched-range">{monthTitle(anchorDate, lang)}</h1>
            {nextBtn}
          </div>
          <div className="sched-cal">
            {weekdayHeads.map((label) => (
              <div key={label} className="wd">
                {label}
              </div>
            ))}
            {monthCells.map((date, index) => {
              const iso = isoOf(date);
              const outside = date.getMonth() !== anchorDate.getMonth();
              const showMonth = date.getDate() === 1 || index === 0;
              const found = findDay(byWeek, offsets, iso);
              const count = found ? lessonsOf(found.data, found.key).length : 0;
              return (
                <button
                  key={iso}
                  type="button"
                  className={[
                    iso === anchor ? "active" : "",
                    iso === today ? "today" : "",
                    outside ? "out" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => setAnchor(iso)}
                >
                  {showMonth ? <span className="m">{monthName(date, lang)}</span> : null}
                  <span className="n">{date.getDate()}</span>
                  {count > 0 ? <span className="pip" /> : null}
                </button>
              );
            })}
          </div>
          <div className="sched-picked">
            <h2>{dayTitle(anchor, lang)}</h2>
            {loading && !picked ? <div className="skeleton" /> : lessonList(anchor, pickedLessons)}
          </div>
        </>
      ) : null}
    </div>
  );
}
