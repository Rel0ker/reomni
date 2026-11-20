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

export function PresentsPage({
  onToast,
}: {
  onToast: (t: string, tone?: "good" | "bad" | "neutral") => void;
}) {
  const nav = useNavigate();
  const [week, setWeek] = useState(0);
  const [data, setData] = useState<ScheduleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const today = localISODate();

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await api.omni<ScheduleResponse>("schedule", { week });
        setData(res.data);
      } catch (e) {
        onToast(e instanceof Error ? e.message : "Ошибка", "bad");
      } finally {
        setLoading(false);
      }
    })();
  }, [week, onToast]);

  const dayKey = useMemo(() => {
    const dates = data?.dates || {};
    return Object.keys(dates).find((k) => dates[k] === today) || "";
  }, [data, today]);

  const lessons = useMemo(() => {
    const body = data?.body;
    if (!body || Array.isArray(body) || !dayKey) return [];
    const out: Array<{ lenta: string; lesson: ScheduleLesson }> = [];
    for (const [lenta, days] of Object.entries(body)) {
      const lesson = days?.[dayKey];
      if (lesson?.name_spec || lesson?.groups) out.push({ lenta, lesson });
    }
    return out.sort((a, b) => Number(a.lenta) - Number(b.lenta));
  }, [data, dayKey]);

  return (
    <div className="app-shell">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end" }}>
        <div>
          <div className="brand">Присутствие</div>
          <div className="mute" style={{ marginTop: 6, fontWeight: 650 }}>
            {today}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="icon-btn" aria-label="Назад" onClick={() => setWeek((w) => w - 1)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
          <button className="icon-btn" aria-label="Вперёд" onClick={() => setWeek((w) => w + 1)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="skeleton" />
      ) : lessons.length === 0 ? (
        <div className="empty">Нет пар на сегодня</div>
      ) : (
        lessons.map(({ lenta, lesson }) => (
          <button
            key={`${lenta}-${lesson.groups}`}
            className="lesson"
            onClick={() => {
              const q = new URLSearchParams({ date: today, lenta });
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
