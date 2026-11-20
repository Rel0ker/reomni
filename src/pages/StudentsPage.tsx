import { useEffect, useState } from "react";
import { api } from "../lib/api";

type Group = { id_tgroups: string; name_tgroups: string };
type Student = Record<string, unknown>;

export function StudentsPage({
  onToast,
}: {
  onToast: (t: string, tone?: "good" | "bad" | "neutral") => void;
}) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupId, setGroupId] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [selected, setSelected] = useState<Student | null>(null);
  const [comments, setComments] = useState<unknown[]>([]);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.omni<unknown>("students-groups", {});
        const raw = res.data;
        const list = Array.isArray(raw)
          ? raw
          : Array.isArray((raw as { groups?: unknown[] })?.groups)
            ? (raw as { groups: unknown[] }).groups
            : Object.values((raw as Record<string, unknown>) || {});
        const normalized = (list as Array<Record<string, unknown>>)
          .map((g) => ({
            id_tgroups: String(g.id_tgroups || g.id || ""),
            name_tgroups: String(g.name_tgroups || g.name || g.id_tgroups || ""),
          }))
          .filter((g) => g.id_tgroups);
        setGroups(normalized);
        if (normalized[0]) setGroupId(normalized[0].id_tgroups);
      } catch (e) {
        onToast(e instanceof Error ? e.message : "Ошибка", "bad");
      } finally {
        setLoading(false);
      }
    })();
  }, [onToast]);

  useEffect(() => {
    if (!groupId) return;
    (async () => {
      setLoading(true);
      setSelected(null);
      try {
        const res = await api.omni<unknown>("students-list", { id_tgroups: groupId });
        const raw = res.data;
        const list = Array.isArray(raw)
          ? raw
          : Array.isArray((raw as { students?: unknown[] })?.students)
            ? (raw as { students: unknown[] }).students
            : [];
        const rows = (list as Student[]).filter(
          (s) => !s.id_tgroups || String(s.id_tgroups) === groupId,
        );
        setStudents(rows.length ? rows : (list as Student[]));
      } catch (e) {
        onToast(e instanceof Error ? e.message : "Ошибка", "bad");
      } finally {
        setLoading(false);
      }
    })();
  }, [groupId, onToast]);

  async function openStudent(s: Student) {
    setSelected(s);
    try {
      const [det, com] = await Promise.all([
        api.omni<unknown>("student-details", { id_stud: s.id_stud }),
        api.omni<unknown>("student-comments", { id_stud: s.id_stud }),
      ]);
      if (det.data && typeof det.data === "object") {
        setSelected({ ...s, ...(det.data as object) });
      }
      const c = com.data;
      setComments(
        Array.isArray(c)
          ? c
          : Array.isArray((c as { comments?: unknown[] })?.comments)
            ? (c as { comments: unknown[] }).comments
            : [],
      );
    } catch {
      setComments([]);
    }
  }

  return (
    <div className="app-shell">
      <div className="brand">Студенты</div>
      <select
        className="bare-select"
        value={groupId}
        onChange={(e) => setGroupId(e.target.value)}
      >
        {groups.map((g) => (
          <option key={g.id_tgroups} value={g.id_tgroups}>
            {g.name_tgroups}
          </option>
        ))}
      </select>

      {selected ? (
        <div className="stack-tight">
          <button className="btn ghost block" onClick={() => setSelected(null)}>
            ← К списку
          </button>
          <div className="profile-hero">
            <div className="who">{String(selected.fio_stud || "—")}</div>
            <div className="sub">
              {[selected.st_login, selected.phone_stud, selected.st_email]
                .filter(Boolean)
                .join(" · ")}
            </div>
          </div>
          <div className="mute tiny">
            визиты {String(selected.percent_vizit ?? "—")}% · GPA{" "}
            {String(selected.gpa ?? "—")}
          </div>
          <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr auto" }}>
            <input
              className="bare-input"
              placeholder="Комментарий"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <button
              className="btn signal"
              disabled={!comment.trim()}
              onClick={async () => {
                try {
                  await api.mutate("student-set-comment", {
                    id_stud: selected.id_stud,
                    comment: comment.trim(),
                  });
                  setComment("");
                  onToast("Ок", "good");
                  await openStudent(selected);
                } catch (e) {
                  onToast(e instanceof Error ? e.message : "Ошибка", "bad");
                }
              }}
            >
              +
            </button>
          </div>
          {comments.slice(0, 30).map((c, i) => {
            const row = c as Record<string, unknown>;
            return (
              <div className="list-row" key={i}>
                <div>
                  <div className="student-name">
                    {String(row.comment || row.text || row.message || "—")}
                  </div>
                  <div className="mute tiny">
                    {[row.fio_teach, row.date].filter(Boolean).join(" · ")}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : loading ? (
        <div className="skeleton" />
      ) : students.length === 0 ? (
        <div className="empty">Пусто</div>
      ) : (
        <div className="stack-tight">
          {students.map((s, i) => (
            <button
              className="list-row"
              key={String(s.id_stud || i)}
              style={{ textAlign: "left", border: 0, width: "100%", cursor: "pointer" }}
              onClick={() => openStudent(s)}
            >
              <div
                className="student-head"
                style={{ gridTemplateColumns: s.photo_pas ? "40px 1fr" : "1fr" }}
              >
                {s.photo_pas ? (
                  <img
                    className="avatar"
                    style={{ width: 40, height: 40 }}
                    src={String(s.photo_pas)}
                    alt=""
                  />
                ) : null}
                <div>
                  <div className="student-name">
                    {String(s.fio_stud || s.name || "—")}
                  </div>
                  <div className="mute tiny">
                    {String(s.message_deptor || s.phone_stud || "")}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
