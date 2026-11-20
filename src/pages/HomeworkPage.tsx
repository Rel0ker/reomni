import { useEffect, useMemo, useState } from "react";
import { PageBrand } from "../components/PageBrand";
import { useT } from "../i18n/PrefsContext";
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
  stud_performance_by_stud?: string | number;
  stud_percentage_completed_on_time_by_stud?: string | number;
  message_deptor?: string;
  class_price?: string;
};

type HwHeader = {
  id_domzad: string;
  date: string;
  dz_theme?: string | null;
  overdue?: string | number | null;
  filename?: string | null;
  download_url?: string | null;
  ospr?: string | number | null;
};

type HwCell = {
  id_domzad?: string | null;
  id_domzad_teach?: string | null;
  id_domzadstud?: string | null;
  stud_stud?: string | null;
  id_stud?: string | null;
  mark?: string | number | null;
  ospr?: string | number | null;
  status?: number | string | null;
  disabled?: string | number | null;
  theme?: string | null;
  fio_stud?: string | null;
  group?: string | null;
  filename?: string | null;
  download_url?: string | null;
  download_url_stud?: string | null;
  teach_filename?: string | null;
  date_vizit?: string | null;
  nlenta?: string | null;
  time?: string | null;
  coment?: string | null;
  comment_attach?: string | null;
  comment_attach_file?: string | null;
  bad_dz?: string | number | null;
  automark?: string | number | null;
  tmp_file?: string | null;
};

type HwTable = {
  table_header: HwHeader[];
  table_body: Record<string, Record<string, HwCell>>;
};

type ActiveHw = {
  stud: Student;
  col: HwHeader;
  cell: HwCell;
  key: string;
};

type NewHwItem = HwCell & {
  id?: string | number;
  name_tgroups?: string;
  dz_theme?: string;
  date?: string;
};

const MARKS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
const YEARS = Array.from({ length: new Date().getFullYear() - 2013 }, (_, i) =>
  String(2014 + i),
).reverse();

function subjectKeyOf(s: Spec) {
  return `${s.source}:${s.id_spec || s.id_base_spec || ""}`;
}

function hwKey(cell: Partial<HwCell>, fallback = "") {
  return String(
    cell.id_domzadstud ||
      `${cell.id_stud || cell.stud_stud || ""}:${cell.id_domzad || cell.id_domzad_teach || fallback}`,
  );
}

function toActiveFromRaw(
  raw: NewHwItem,
  fallbackGroup = "",
  fallbackOspr = 0,
): ActiveHw {
  const idStud = String(raw.id_stud || raw.stud_stud || "");
  const idDom = String(raw.id_domzad || raw.id_domzad_teach || "");
  const cell: HwCell = {
    ...raw,
    id_domzad: idDom || null,
    id_stud: idStud || null,
    stud_stud: String(raw.stud_stud || idStud || "") || null,
    fio_stud: raw.fio_stud || "",
    theme: raw.theme || raw.dz_theme || null,
    group: raw.group || raw.name_tgroups || fallbackGroup || null,
    teach_filename:
      raw.teach_filename || raw.download_url || raw.filename || null,
    download_url: raw.download_url || raw.teach_filename || null,
    download_url_stud: raw.download_url_stud || raw.filename || null,
    ospr: raw.ospr ?? fallbackOspr,
  };
  return {
    key: hwKey(cell, idDom),
    stud: { id_stud: idStud, fio_stud: String(raw.fio_stud || "Студент") },
    col: {
      id_domzad: idDom,
      date: String(raw.date_vizit || raw.date || ""),
      dz_theme: raw.theme || raw.dz_theme || null,
      download_url: cell.download_url,
      filename: raw.teach_filename || raw.filename || null,
      ospr: cell.ospr,
    },
    cell,
  };
}

function fmtDate(iso: string) {
  if (!iso || iso.length < 10) return iso || "—";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${String(y).slice(2)}`;
}

function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  const [date, time] = String(iso).split(" ");
  return `${fmtDate(date)}${time ? ` ${time.slice(0, 5)}` : ""}`;
}

function statusClass(status: string | number | null | undefined) {
  const s = Number(status ?? 0);
  if (s === 1) return "hw-checked";
  if (s === 2) return "hw-new";
  if (s === 3) return "hw-retake";
  if (s === 4) return "hw-overdue";
  return "hw-empty";
}

function canOpenCell(cell: HwCell | undefined) {
  const s = Number(cell?.status ?? 0);
  return s === 1 || s === 2 || s === 3;
}

export function HomeworkPage({
  onToast,
}: {
  onToast: (t: string, tone?: "good" | "bad" | "neutral") => void;
}) {
  const tHw = useT();
  const [ospr, setOspr] = useState(0);
  const [allGroups, setAllGroups] = useState(false);
  const [transferred, setTransferred] = useState(false);
  const [groups, setGroups] = useState<Record<string, GroupSpec>>({});
  const [months, setMonths] = useState<Record<string, string>>({});
  const [groupId, setGroupId] = useState("");
  const [subjectKey, setSubjectKey] = useState("");
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [table, setTable] = useState<HwTable | null>(null);
  const [newCount, setNewCount] = useState(0);
  const [offset, setOffset] = useState(0);
  const [limit] = useState(6);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState<ActiveHw | null>(null);
  const [draftMark, setDraftMark] = useState("");
  const [draftComment, setDraftComment] = useState("");
  const [themeOpen, setThemeOpen] = useState(false);
  const [reviewQueue, setReviewQueue] = useState<ActiveHw[]>([]);
  const [reviewIndex, setReviewIndex] = useState(-1);
  const [reviewTotal, setReviewTotal] = useState(0);
  const inReview = reviewIndex >= 0;

  const subjects = useMemo(() => groups[groupId]?.data || [], [groups, groupId]);
  const subject = useMemo(
    () => subjects.find((s) => subjectKeyOf(s) === subjectKey),
    [subjects, subjectKey],
  );
  const groupName = groups[groupId]?.name_tgroups || "";

  const visibleStudents = useMemo(() => {
    if (transferred) return students;
    return students.filter((s) => String(s.mv_stud ?? "1") !== "0");
  }, [students, transferred]);

  const columns = table?.table_header || [];
  const visible = columns.slice(offset, offset + limit);
  const canPrev = offset > 0;
  const canNext = offset + limit < columns.length;

  function pickDefaultGroup(gs: Record<string, GroupSpec>) {
    const ordered = Object.values(gs).sort(
      (a, b) => Number(b.order || 0) - Number(a.order || 0),
    );
    if (!ordered[0]) {
      setGroupId("");
      setSubjectKey("");
      return;
    }
    setGroupId(ordered[0].id_tgroups);
    const specs = [...(ordered[0].data || [])].sort(
      (a, b) => Number(b.order || 0) - Number(a.order || 0),
    );
    setSubjectKey(specs[0] ? subjectKeyOf(specs[0]) : "");
  }

  async function loadGroups(nextAll = allGroups, nextOspr = ospr) {
    const res = await api.omni<{
      groups_spec?: Record<string, GroupSpec>;
      months?: Record<string, string>;
    }>("homework-groups", { type: nextOspr, all_groups: nextAll }, false);
    const gs = res.data?.groups_spec || {};
    setGroups(gs);
    if (res.data?.months) setMonths(res.data.months);
    pickDefaultGroup(gs);
  }

  async function reloadTable() {
    if (!groupId || !subject) return;
    const [studRes, hwRes, neuRes] = await Promise.all([
      api.omni<Student[]>(
        "homework-students",
        {
          id_tgroups: groupId,
          spec: subject.id_spec,
          source: subject.source,
          id_base_spec: subject.id_base_spec,
          transferred,
        },
        false,
      ),
      api.omni<HwTable>(
        "homework-list",
        {
          id_tgroups: groupId,
          id_spec: subject.id_spec,
          source: subject.source,
          id_base_spec: subject.id_base_spec,
          limit: 40,
          offset: 0,
          type: ospr,
          transferred,
          year,
          month,
        },
        false,
      ),
      api.omni<{
        homework?: NewHwItem[];
        lab_work?: NewHwItem[];
        requests?: NewHwItem[];
      }>("homework-new", {}, false),
    ]);
    setStudents(Array.isArray(studRes.data) ? studRes.data : []);
    setTable(hwRes.data || null);
    const neu = neuRes.data || {};
    const pending =
      ospr === 0
        ? [...(neu.homework || []), ...(neu.requests || [])]
        : [...(neu.lab_work || []), ...(neu.requests || [])];
    setNewCount(pending.length);
    setOffset(0);
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await loadGroups(allGroups, ospr);
      } catch (e) {
        onToast(e instanceof Error ? e.message : "Ошибка", "bad");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ospr, allGroups]);

  useEffect(() => {
    if (!groupId || !subject) return;
    (async () => {
      setLoading(true);
      try {
        await reloadTable();
      } catch (e) {
        onToast(e instanceof Error ? e.message : "Ошибка", "bad");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, subjectKey, year, month, transferred, ospr]);

  function getCell(studId: string, col: HwHeader): HwCell | undefined {
    return table?.table_body?.[studId]?.[col.id_domzad];
  }

  function makeActive(stud: Student, col: HwHeader, cell: HwCell): ActiveHw {
    const normalized: HwCell = {
      ...cell,
      id_domzad: cell.id_domzad || cell.id_domzad_teach || col.id_domzad,
      id_stud: cell.id_stud || cell.stud_stud || stud.id_stud,
      fio_stud: cell.fio_stud || stud.fio_stud,
      theme: cell.theme || col.dz_theme,
      teach_filename:
        cell.teach_filename ||
        cell.download_url ||
        col.download_url ||
        col.filename,
      download_url:
        cell.download_url || col.download_url || col.filename || null,
      download_url_stud: cell.download_url_stud || cell.filename || null,
      group: cell.group || groupName,
      ospr: cell.ospr ?? col.ospr ?? ospr,
    };
    return {
      key: hwKey(normalized, col.id_domzad),
      stud,
      col,
      cell: normalized,
    };
  }

  function activateItem(item: ActiveHw) {
    setActive(item);
    setDraftMark(
      item.cell.mark != null && String(item.cell.mark) !== ""
        ? String(item.cell.mark)
        : "",
    );
    setDraftComment(item.cell.coment || "");
    setThemeOpen(false);
  }

  function exitReview() {
    setReviewQueue([]);
    setReviewIndex(-1);
    setReviewTotal(0);
    setActive(null);
  }

  function openNextInQueue(fromIndex: number, queue: ActiveHw[]) {
    const next = fromIndex + 1;
    if (next >= queue.length) {
      exitReview();
      onToast("Все ДЗ из очереди проверены", "good");
      void reloadTable();
      return;
    }
    setReviewIndex(next);
    activateItem(queue[next]);
    void reloadTable().catch(() => undefined);
  }

  function collectFromTable(): ActiveHw[] {
    if (!table) return [];
    const out: ActiveHw[] = [];
    for (const stud of students) {
      if (!transferred && String(stud.mv_stud ?? "1") === "0") continue;
      for (const col of table.table_header || []) {
        const cell = getCell(stud.id_stud, col);
        const st = Number(cell?.status ?? 0);
        if ((st === 2 || st === 3) && cell) {
          out.push(makeActive(stud, col, cell));
        }
      }
    }
    return out;
  }

  async function startReviewAll() {
    setBusy(true);
    try {
      const neu = await api.omni<{
        homework?: NewHwItem[];
        lab_work?: NewHwItem[];
        requests?: NewHwItem[];
      }>("homework-new", {}, false);
      const fromApiRaw =
        ospr === 0
          ? [...(neu.data?.homework || []), ...(neu.data?.requests || [])]
          : [...(neu.data?.lab_work || []), ...(neu.data?.requests || [])];
      const fromApi = fromApiRaw.map((item) =>
        toActiveFromRaw(item, groupName, ospr),
      );
      const fromTable = collectFromTable();
      const seen = new Set<string>();
      const queue: ActiveHw[] = [];
      for (const item of [...fromApi, ...fromTable]) {
        if (!item.key || seen.has(item.key)) continue;
        seen.add(item.key);
        queue.push(item);
      }
      setNewCount(fromApiRaw.length || fromTable.length);
      if (!queue.length) {
        onToast("Нет ДЗ на проверку", "neutral");
        return;
      }
      setReviewQueue(queue);
      setReviewTotal(queue.length);
      setReviewIndex(0);
      activateItem(queue[0]);
      onToast(`К проверке: ${queue.length}`, "neutral");
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Ошибка", "bad");
    } finally {
      setBusy(false);
    }
  }

  function openCell(stud: Student, col: HwHeader) {
    const cell = getCell(stud.id_stud, col);
    if (!canOpenCell(cell) || !cell) return;
    setReviewQueue([]);
    setReviewIndex(-1);
    setReviewTotal(0);
    activateItem(makeActive(stud, col, cell));
  }

  async function saveActive(opts?: { reject?: boolean; skip?: boolean }) {
    if (!active) return;
    setBusy(true);
    try {
      if (!opts?.skip) {
        const studDz: Record<string, unknown> = {
          ...active.cell,
          mark: draftMark,
          coment: draftComment,
          id_domzad:
            active.cell.id_domzad ||
            active.cell.id_domzad_teach ||
            active.col.id_domzad,
          id_stud: active.cell.id_stud || active.stud.id_stud,
          stud_stud: active.cell.stud_stud || active.stud.id_stud,
          ospr: active.cell.ospr ?? ospr,
        };
        if (opts?.reject) {
          const id = active.cell.id_domzadstud;
          if (!id) throw new Error("Нельзя отклонить: нет сдачи");
          await api.mutate("homework-approve", { type: 0, id });
        } else {
          const stamp = `${Date.now()}`;
          studDz.marks = {
            [stamp]: {
              id: studDz.id_domzad,
              mark: draftMark,
              ospr: studDz.ospr,
              stud: studDz.id_stud,
            },
          };
          await api.mutate("homework-save", { HomeworkForm: studDz });
        }
        onToast(opts?.reject ? "Отклонено" : "Сохранено", "good");
      }
      if (inReview) {
        openNextInQueue(reviewIndex, reviewQueue);
      } else {
        setActive(null);
        await reloadTable();
      }
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Ошибка", "bad");
    } finally {
      setBusy(false);
    }
  }

  async function deleteActive() {
    if (!active?.cell.id_domzadstud) {
      onToast("Нечего удалять", "bad");
      return;
    }
    if (!confirm("Удалить ДЗ студента?")) return;
    setBusy(true);
    try {
      await api.mutate("homework-delete", {
        id_domzad: active.cell.id_domzadstud,
        comment: draftComment || "удалено",
      });
      onToast("Удалено", "good");
      if (inReview) {
        openNextInQueue(reviewIndex, reviewQueue);
      } else {
        setActive(null);
        await reloadTable();
      }
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Ошибка", "bad");
    } finally {
      setBusy(false);
    }
  }

  const themeFull =
    active?.cell.theme || active?.col.dz_theme || "Без темы";
  const themeShort =
    themeFull.length > 64 && !themeOpen
      ? `${themeFull.slice(0, 64)}…`
      : themeFull;

  return (
    <div className="app-shell journal-page hw-page">
      <PageBrand k="nav.homework" />

      <div className="journal-toolbar">
        <div className="was journal-type">
          <button
            type="button"
            className={ospr === 0 ? "on-p" : ""}
            onClick={() => setOspr(0)}
          >
            ДЗ
          </button>
          <button
            type="button"
            className={ospr === 1 ? "on-p" : ""}
            onClick={() => setOspr(1)}
          >
            Практика
          </button>
        </div>
        <div className="hw-toolbar-right">
          {newCount > 0 ? (
            <span className="hw-count-pill">
              {ospr === 0 ? "Домашние" : "Практика"} {newCount}
            </span>
          ) : null}
          <button
            type="button"
            className="primary-btn hw-review-all"
            disabled={busy || loading}
            onClick={() => void startReviewAll()}
          >
            Проверить все ДЗ
          </button>
          <button
            type="button"
            className="ghost-btn"
            onClick={() => setAllGroups((v) => !v)}
          >
            {allGroups ? "Текущие группы" : "Все группы"}
          </button>
        </div>
      </div>

      <div className="journal-filters hw-filters">
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
        <select
          className="bare-select"
          value={year}
          onChange={(e) => {
            setYear(e.target.value);
            if (!e.target.value) setMonth("");
          }}
        >
          <option value="">Год</option>
          {YEARS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <select
          className="bare-select"
          value={month}
          disabled={!year}
          onChange={(e) => setMonth(e.target.value)}
        >
          <option value="">Месяц</option>
          {Object.entries(months).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>

      <div className="hw-legend">
        <span>
          <i className="hw-dot hw-checked" /> Проверенные
        </span>
        <span>
          <i className="hw-dot hw-new" /> Новые
        </span>
        <span>
          <i className="hw-dot hw-overdue" /> Просроченные
        </span>
        <span>
          <i className="hw-dot hw-empty" /> Не сданные
        </span>
        <span>
          <i className="hw-dot hw-retake" /> Пересдачи
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
              ? `${Math.max(1, columns.length - offset)}–${Math.max(1, columns.length - offset - visible.length + 1)}`
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
      ) : !groupId || !visible.length || !visibleStudents.length ? (
        <div className="empty">Пусто</div>
      ) : (
        <div className="journal-scroll">
          <table className="journal-table hw-table">
            <thead>
              <tr>
                <th className="sticky-col">Студент</th>
                {ospr !== 1 ? <th className="hw-status-col">Статус</th> : null}
                {visible.map((col) => (
                  <th key={col.id_domzad}>
                    <div className="col-date">{fmtDate(col.date)}</div>
                    <div className="hw-col-actions">
                      {col.download_url || col.filename ? (
                        <a
                          className="hw-icon-link"
                          href={String(col.download_url || col.filename)}
                          target="_blank"
                          rel="noreferrer"
                          title={col.dz_theme || "Скачать задание"}
                        >
                          ↓
                        </a>
                      ) : (
                        <span className="mute tiny">—</span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleStudents.map((stud, idx) => (
                <tr key={stud.id_stud}>
                  <th className="sticky-col student-name">
                    <span className="hw-stud-idx">{idx + 1}</span>
                    {stud.fio_stud}
                  </th>
                  {ospr !== 1 ? (
                    <td className="hw-status-col">
                      <span className="mute tiny">
                        {stud.stud_performance_by_stud ?? 0} /{" "}
                        {stud.stud_percentage_completed_on_time_by_stud ?? 0}
                      </span>
                    </td>
                  ) : null}
                  {visible.map((col) => {
                    const cell = getCell(stud.id_stud, col);
                    const st = Number(cell?.status ?? 0);
                    const openable = canOpenCell(cell);
                    return (
                      <td key={col.id_domzad}>
                        <button
                          type="button"
                          className={`hw-cell ${statusClass(st)} ${openable ? "hw-cell-open" : ""}`}
                          disabled={!openable}
                          onClick={() => openCell(stud, col)}
                          title={col.dz_theme || ""}
                        >
                          {st === 1 && cell?.mark != null && String(cell.mark) !== ""
                            ? String(cell.mark)
                            : st === 4 && String(cell?.automark) === "1"
                              ? String(cell?.mark ?? "1")
                              : st === 3
                                ? "R"
                                : st === 2 || st === 4
                                  ? (
                                      <svg
                                        width="14"
                                        height="14"
                                        viewBox="0 0 15 15"
                                        fill="currentColor"
                                        aria-hidden
                                      >
                                        <path d="M9.33 2.5L12.38 5.57 4.65 13.33 1.61 10.26 9.33 2.5zm5.36-.74L13.33.4c-.53-.53-1.38-.53-1.91 0L10.12 1.71l3.05 3.07 1.52-1.53c.41-.41.41-1.07 0-1.48zM.01 14.57c-.06.25.17.48.42.42l3.4-.83L.78 11.1.01 14.57z" />
                                      </svg>
                                    )
                                  : ""}
                          {(cell?.coment || cell?.comment_attach_file) &&
                          (st === 1 || st === 2 || st === 4) ? (
                            <span className="hw-comment-dot" />
                          ) : null}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <button
        type="button"
        className="text-link"
        onClick={() => setTransferred((v) => !v)}
      >
        {transferred
          ? tHw("groups.hideTransferred")
          : tHw("groups.showTransferred")}
      </button>

      {active ? (
        <div
          className="more-sheet hw-sheet"
          onClick={() => {
            if (busy) return;
            if (inReview) exitReview();
            else setActive(null);
          }}
        >
          <div
            className="hw-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="hw-modal-top">
              <button
                type="button"
                className="hw-back"
                onClick={() => {
                  if (inReview) exitReview();
                  else setActive(null);
                }}
              >
                ← {inReview ? "Выйти из проверки" : "Назад"}
              </button>
              {inReview ? (
                <span className="hw-review-progress">
                  {reviewIndex + 1} / {reviewTotal}
                </span>
              ) : null}
            </div>
            <div className="hw-modal-title">
              {active.stud.fio_stud.trim()} ({active.cell.group || groupName})
            </div>
            <div className="hw-theme">
              <span className="mute">Тема:</span> {themeShort}{" "}
              {themeFull.length > 64 ? (
                <button
                  type="button"
                  className="text-link inline"
                  onClick={() => setThemeOpen((v) => !v)}
                >
                  {themeOpen ? "Скрыть" : "Ещё"}
                </button>
              ) : null}
            </div>

            <div className="hw-files">
              <div className="hw-file-row">
                <span>Задание преподавателя</span>
                {active.cell.teach_filename || active.cell.download_url ? (
                  <a
                    className="hw-dl"
                    href={String(
                      active.cell.teach_filename || active.cell.download_url,
                    )}
                    target="_blank"
                    rel="noreferrer"
                  >
                    ↓
                  </a>
                ) : (
                  <span className="mute tiny">нет</span>
                )}
              </div>
              <div className="hw-file-row">
                <span>ДЗ от студента</span>
                {active.cell.download_url_stud || active.cell.filename ? (
                  <a
                    className="hw-dl"
                    href={String(
                      active.cell.download_url_stud || active.cell.filename,
                    )}
                    target="_blank"
                    rel="noreferrer"
                  >
                    ↓
                  </a>
                ) : (
                  <span className="mute tiny">нет</span>
                )}
              </div>
            </div>

            <div className="hw-meta">
              <div>
                <span className="mute">Дата выдачи</span>
                <div>
                  {fmtDate(active.cell.date_vizit || active.col.date)}
                  {active.cell.nlenta ? ` ${active.cell.nlenta} пара` : ""}
                </div>
              </div>
              <div>
                <span className="mute">Дата загрузки</span>
                <div>{fmtDateTime(active.cell.time)}</div>
              </div>
            </div>

            <div className="hw-mark-label">Поставить оценку:</div>
            <div className="hw-marks">
              {MARKS.map((m) => (
                <button
                  key={m}
                  type="button"
                  className={draftMark === m ? "on" : ""}
                  onClick={() => setDraftMark(m)}
                >
                  {m}
                </button>
              ))}
            </div>

            <label className="hw-comment-label">
              Добавить комментарий
              <textarea
                className="hw-comment"
                maxLength={1000}
                value={draftComment}
                onChange={(e) => setDraftComment(e.target.value)}
                rows={5}
              />
              <span className="hw-counter">{1000 - draftComment.length}</span>
            </label>

            <div className={`hw-modal-actions ${inReview ? "hw-modal-actions-review" : ""}`}>
              <button
                type="button"
                className="icon-btn danger"
                disabled={busy}
                onClick={deleteActive}
                aria-label="Удалить"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 7h16M9 7V5h6v2m-8 0v12a2 2 0 002 2h6a2 2 0 002-2V7" />
                </svg>
              </button>
              {inReview ? (
                <button
                  type="button"
                  className="ghost-btn"
                  disabled={busy}
                  onClick={() => void saveActive({ skip: true })}
                >
                  Пропустить
                </button>
              ) : null}
              <button
                type="button"
                className="ghost-btn"
                disabled={busy}
                onClick={() => void saveActive({ reject: true })}
              >
                Отклонить
              </button>
              <button
                type="button"
                className="primary-btn"
                disabled={busy || !draftMark}
                onClick={() => void saveActive()}
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
