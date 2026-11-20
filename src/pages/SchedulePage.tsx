import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, type ScheduleLesson, type ScheduleResponse } from "../lib/api";

function localISODate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function weekdayToday(dates: Record<string, string>) {
  const today = localISODate();
  for (const [k, v] of Object.entries(dates || {})) {
    if (v === today) return k;
  }
  return "5";
}

function fmtDay(iso?: string) {
  if (!iso) return "";
  const d = iso.slice(8, 10);
  return d.startsWith("0") ? d.slice(1) : d;
}

export function SchedulePage({
  onToast,
}: {
  onToast: (t: string, tone?: "good" | "bad" | "neutral") => void;
}) {
  const nav = useNavigate();
  const [week, setWeek] = useState(0);
  const [day, setDay] = useState("5");
  const [data, setData] = useState<ScheduleResponse | null>(null);
  const [stale, setStale] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await api.omni<ScheduleResponse>("schedule", { week });
        if (cancelled) return;
        setData(res.data);
        setStale(Boolean(res.stale || res.cached));
        if (res.warning) onToast(res.warning, "bad");
        setDay(weekdayToday(res.data.dates));
      } catch (e) {
        onToast(e instanceof Error ? e.message : "Ошибка", "bad");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [week, onToast]);

  const lessons = useMemo(() => {
    const body = data?.body;
    if (!body || Array.isArray(body)) return [] as Array<{ lenta: string; lesson: ScheduleLesson }>;
    const out: Array<{ lenta: string; lesson: ScheduleLesson }> = [];
    for (const [lenta, days] of Object.entries(body)) {
      const lesson = days?.[day];
      if (lesson?.name_spec || lesson?.groups) out.push({ lenta, lesson });
    }
    return out.sort((a, b) => Number(a.lenta) - Number(b.lenta));
  }, [data, day]);

  const title =
    data?.days?.[day] && data?.dates?.[day]
      ? `${data.daysShort?.[day] || ""} ${fmtDay(data.dates[day])}`
      : data?.curdate || "…";

  return (
    <div className="app-shell">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 12 }}>
        <div>
          <div className="brand">Omni</div>
          <h1 className="page-date" style={{ marginTop: 8 }}>
            {title}
          </h1>
        </div>
        <span className={`dot ${stale ? "warn" : ""}`} title={stale ? "кэш" : "live"} />
      </div>

      <div className="day-strip">
        <button className="icon-btn" aria-label="Назад" onClick={() => setWeek((w) => w - 1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
        <div className="days">
          {Object.entries(data?.daysShort || {}).map(([k, label]) => (
            <button
              key={k}
              className={day === k ? "active" : undefined}
              onClick={() => setDay(k)}
            >
              <div className="d">{label}</div>
              <div className="n">{fmtDay(data?.dates?.[k])}</div>
            </button>
          ))}
        </div>
        <button className="icon-btn" aria-label="Вперёд" onClick={() => setWeek((w) => w + 1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
            <path d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {loading ? (
        <>
          <div className="skeleton" />
          <div className="skeleton" />
          <div className="skeleton" />
        </>
      ) : lessons.length === 0 ? (
        <div className="empty">Нет пар</div>
      ) : (
        lessons.map(({ lenta, lesson }) => (
          <button
            key={`${lenta}-${lesson.groups}`}
            className="lesson"
            onClick={() => {
              const q = new URLSearchParams({
                date: data!.dates[day],
                lenta,
              });
              // schedule.groups is always a display name (even "1211") — never an id
              if (lesson.groups) q.set("label", lesson.groups);
              nav(`/pair?${q.toString()}`);
            }}
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
        ))
      )}
    </div>
  );
}
