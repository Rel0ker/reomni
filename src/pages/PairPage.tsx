import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  api,
  type MethodTheme,
  type PresentMaterial,
  type PresentStudent,
  type PresentsResponse,
  type RecommendedHomework,
} from "../lib/api";

function methodSpecIdFromPair(
  data: PresentsResponse | null,
  selected: MethodTheme | null,
) {
  if (selected?.package_id != null && String(selected.package_id) !== "") {
    return String(selected.package_id);
  }
  const spec =
    data?.cur_spec && typeof data.cur_spec === "object" ? data.cur_spec : null;
  if (spec?.id_base_spec != null && String(spec.id_base_spec) !== "") {
    return String(spec.id_base_spec);
  }
  return "";
}

function materialIssued(m: PresentMaterial | null | undefined) {
  if (!m) return false;
  return !!(
    m.id ||
    m.public_material_id ||
    m.filename ||
    m.download_url ||
    m.file_name
  );
}

const WAS = { absent: 0, present: 1, late: 2 } as const;

function keyNow() {
  const d = new Date();
  return `${d.getSeconds()}${d.getMilliseconds()}${Math.floor(Math.random() * 1000)}`;
}

function localISODate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function asStudentList(raw: unknown): PresentStudent[] {
  if (Array.isArray(raw)) return raw as PresentStudent[];
  if (raw && typeof raw === "object") {
    return Object.values(raw as Record<string, PresentStudent>).filter(
      (s) => s && (s.id_stud || (s as { fio_stud?: string }).fio_stud),
    );
  }
  return [];
}

function themeKeyOf(t: MethodTheme) {
  return (
    t.key ||
    (t.public_week_id != null
      ? `pw:${t.public_week_id}`
      : `${t.package_id ?? ""}:${t.week ?? ""}`)
  );
}

/** Omni: 0 = основной, 1 = по замене */
function asTeachType(v: unknown): 0 | 1 {
  return Number(v) === 1 ? 1 : 0;
}

function asThemeList(raw: unknown): MethodTheme[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as MethodTheme[];
  if (typeof raw !== "object") return [];
  const o = raw as Record<string, unknown>;
  if (Array.isArray(o.themes)) return o.themes as MethodTheme[];
  if (Array.isArray(o.data)) return o.data as MethodTheme[];
  const vals = Object.values(o).filter(
    (v) =>
      v &&
      typeof v === "object" &&
      ("theme" in (v as object) ||
        "week" in (v as object) ||
        "package_id" in (v as object) ||
        "public_week_id" in (v as object)),
  );
  return vals as MethodTheme[];
}

function resolveSchedule(
  payload: PresentsResponse | null,
): unknown {
  if (!payload) return null;
  if (payload.cur_schedule != null && payload.cur_schedule !== "") {
    return payload.cur_schedule;
  }
  const sched = payload.schedule;
  if (Array.isArray(sched) && sched.length) {
    const lenta = Number(payload.cur_lenta);
    const hit = sched.find(
      (s) =>
        s &&
        typeof s === "object" &&
        Number((s as { lenta?: unknown }).lenta) === lenta,
    );
    return hit ?? sched[0];
  }
  if (sched && typeof sched === "object") {
    const vals = Object.values(sched as Record<string, unknown>);
    return vals[0] ?? null;
  }
  return null;
}

function prettyFileLabel(raw: string) {
  try {
    const path = decodeURIComponent(raw.split("?")[0] || raw);
    const base = path.split("/").pop() || path;
    return base.replace(/\+/g, " ").trim() || raw;
  } catch {
    return raw;
  }
}

function materialTitle(m: PresentMaterial | null | undefined, fallback: string) {
  if (!m) return null;
  const raw = String(
    m.name || m.theme || m.file_name || m.filename || fallback,
  );
  if (/^https?:\/\//i.test(raw) || raw.includes("/")) {
    return prettyFileLabel(raw);
  }
  return raw;
}

function studentInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return parts
    .slice(0, 2)
    .map((p) => p[0]!)
    .join("")
    .toUpperCase();
}

function isPlaceholderPhoto(src?: string | null) {
  if (!src) return true;
  return /favicon|avatarka\.svg|placeholder|default.*avatar/i.test(src);
}

function StudentAvatar({
  name,
  src,
}: {
  name: string;
  src?: string | null;
}) {
  const [broken, setBroken] = useState(false);
  const showImg = !broken && !isPlaceholderPhoto(src);
  if (!showImg) {
    return (
      <div className="avatar avatar-fallback" aria-hidden>
        {studentInitials(name)}
      </div>
    );
  }
  return (
    <img
      className="avatar"
      src={src!}
      alt=""
      onError={() => setBroken(true)}
    />
  );
}

function parseLessonNo(theme: string) {
  const m = theme.match(/урок\s*№?\s*(\d+)/i);
  return m ? m[1] : null;
}

function themeWithoutLessonNo(theme: string) {
  return theme.replace(/^\s*урок\s*№?\s*\d+\s*[.∶:–—-]?\s*/i, "").trim() || theme;
}

function visitSortKey(date: string, lenta: string | number) {
  return `${date}|${String(lenta).padStart(2, "0")}`;
}

type HistoryCell = {
  theme?: string | null;
  was?: string | number | null;
  id_vizit?: string | number | null;
};

/** Previous marked pair for this group+subject from journal history. */
async function fetchPrevFromMarkedHistory(args: {
  id_tgroups: string;
  source: number;
  id_spec: string | null;
  id_base_spec: string | null;
  curDate: string;
  curLenta: number;
}): Promise<{ num: string; theme: string } | null> {
  const { id_tgroups, source, id_spec, id_base_spec, curDate, curLenta } = args;
  if (!id_tgroups) return null;

  type Hist = {
    data_header?: Array<{ date_vizit: string; nlenta: string; theme?: string }>;
    data_body?: Record<string, Record<string, Record<string, HistoryCell>>>;
  };

  let hist: Hist | null = null;
  try {
    const res = await api.omni<Hist>(
      "classwork-details",
      {
        id_tgroups,
        source,
        id_spec: source === 2 ? null : id_spec,
        id_base_spec: source === 2 ? id_base_spec : null,
        limit: 40,
        offset: 0,
        year: "",
        month: "",
      },
      false,
    );
    hist = res.data;
  } catch {
    try {
      const res = await api.omni<Hist>(
        "groups-table",
        {
          id_tgroups,
          source,
          id_spec: source === 2 ? null : id_spec,
          id_base_spec: source === 2 ? id_base_spec : null,
          limit: 40,
          offset: 0,
        },
        false,
      );
      hist = res.data;
    } catch {
      return null;
    }
  }

  const header = hist?.data_header || [];
  const body = hist?.data_body || {};
  const curKey = curDate ? visitSortKey(curDate, curLenta) : "";

  const rows = header
    .map((h) => {
      let theme = h.theme ? String(h.theme) : "";
      let marked = false;
      for (const stud of Object.values(body)) {
        const cell = stud?.[h.date_vizit]?.[h.nlenta];
        if (!cell) continue;
        if (!theme && cell.theme) theme = String(cell.theme);
        if (
          cell.id_vizit ||
          (cell.was != null && String(cell.was) !== "")
        ) {
          marked = true;
        }
      }
      return {
        date: h.date_vizit,
        lenta: h.nlenta,
        theme: theme.trim(),
        marked,
        key: visitSortKey(h.date_vizit, h.nlenta),
      };
    })
    .filter((r) => r.marked && r.theme)
    .filter((r) => !curKey || r.key < curKey)
    .sort((a, b) => (a.key < b.key ? 1 : a.key > b.key ? -1 : 0));

  const prev = rows[0];
  if (!prev) return null;
  return {
    num: parseLessonNo(prev.theme) || String(prev.lenta),
    theme: themeWithoutLessonNo(prev.theme),
  };
}

function PastAccess({
  date,
  onToast,
  onOpened,
}: {
  date: string;
  onToast: (t: string, tone?: "good" | "bad" | "neutral") => void;
  onOpened: () => void;
}) {
  const [history, setHistory] = useState<
    Array<{ date_req: string; can_set?: number | string }>
  >([]);

  useEffect(() => {
    api
      .omni<{ requests?: Array<{ date_req: string; can_set?: number | string }> }>(
        "presents-requests",
        {},
      )
      .then((r) => setHistory(r.data?.requests || []))
      .catch(() => undefined);
  }, []);

  const approved = history.filter((h) => Number(h.can_set) === 1);

  return (
    <div className="pair-panel">
      <button
        className="btn ghost block"
        onClick={async () => {
          try {
            const r = await api.mutate("send-request-zavuch", {
              date,
              message: "Omni Fast",
            });
            onToast(
              r.synced ? "Запрос отправлен" : "В очереди",
              r.synced ? "good" : "neutral",
            );
          } catch (e) {
            onToast(e instanceof Error ? e.message : "Ошибка", "bad");
          }
        }}
      >
        Запросить дату
      </button>
      {approved.map((h) => (
        <button
          key={h.date_req}
          className="btn signal block"
          onClick={async () => {
            try {
              await api.omni("presents", { date: h.date_req }, false);
              onOpened();
            } catch (e) {
              onToast(e instanceof Error ? e.message : "Ошибка", "bad");
            }
          }}
        >
          {h.date_req}
        </button>
      ))}
    </div>
  );
}

async function resolveGroupId(groupName: string): Promise<string | null> {
  if (!groupName) return null;
  if (/^\d+$/.test(groupName)) return groupName;
  try {
    const res = await api.omni<unknown>("students-groups", {}, false);
    const raw = res.data;
    const list = Array.isArray(raw)
      ? raw
      : Array.isArray((raw as { groups?: unknown[] })?.groups)
        ? (raw as { groups: unknown[] }).groups
        : raw && typeof raw === "object"
          ? Object.values(raw as Record<string, unknown>)
          : [];
    const hit = (list as Array<Record<string, unknown>>).find(
      (g) =>
        String(g.name_tgroups || g.name || "") === groupName ||
        String(g.id_tgroups || g.id || "") === groupName,
    );
    return hit ? String(hit.id_tgroups || hit.id) : null;
  } catch {
    return null;
  }
}

async function loadGroupRoster(groupName: string): Promise<PresentStudent[]> {
  const id = await resolveGroupId(groupName);
  if (!id) return [];
  const res = await api.omni<unknown>("students-list", { id_tgroups: id }, false);
  const raw = res.data;
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as { students?: unknown[] })?.students)
      ? (raw as { students: unknown[] }).students
      : [];
  const rows = list as Array<Record<string, unknown>>;
  const matched = rows.filter((s) => String(s.id_tgroups) === id);
  const use = matched.length ? matched : rows;
  return use
    .map((s) => ({
      id_stud: String(s.id_stud || ""),
      fio_stud: String(s.fio_stud || s.name || "—").trim(),
      photo_pas: s.photo_pas ? String(s.photo_pas) : undefined,
      was: null,
      id_vizit: null,
      mark2: null,
      mark4: null,
      message_deptor: s.message_deptor ? String(s.message_deptor) : undefined,
    }))
    .filter((s) => s.id_stud);
}

export function PairPage({
  onToast,
}: {
  onToast: (t: string, tone?: "good" | "bad" | "neutral") => void;
}) {
  const [params] = useSearchParams();
  const date = params.get("date") || "";
  const lenta = params.get("lenta") || "0";
  const group = params.get("group") || "";
  const label = params.get("label") || "";

  const [data, setData] = useState<PresentsResponse | null>(null);
  const [students, setStudents] = useState<PresentStudent[]>([]);
  const [marks, setMarks] = useState<string[]>([]);
  const [themes, setThemes] = useState<MethodTheme[]>([]);
  const [theme, setTheme] = useState("");
  const [themeMode, setThemeMode] = useState<"view" | "edit">("view");
  const [themePick, setThemePick] = useState("manual");
  const [issueHw, setIssueHw] = useState(false);
  const [issueLw, setIssueLw] = useState(false);
  /** 0 основной · 1 по замене — как в Omni */
  const [teachType, setTeachType] = useState<0 | 1>(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [themeSaving, setThemeSaving] = useState(false);
  const [rosterOnly, setRosterOnly] = useState(false);
  const [prevPair, setPrevPair] = useState<{ num: string; theme: string } | null>(
    null,
  );
  const [customOpen, setCustomOpen] = useState(false);
  const [customTheme, setCustomTheme] = useState("");
  const [customDescr, setCustomDescr] = useState("");
  const [customDeadline, setCustomDeadline] = useState("");
  const [customFile, setCustomFile] = useState<File | null>(null);
  const [customRecId, setCustomRecId] = useState("");
  const [recommended, setRecommended] = useState<RecommendedHomework[]>([]);
  const [customSaving, setCustomSaving] = useState(false);

  const groupLabel = label || group;
  const today = localISODate();
  const isToday = !date || date === today;

  const selectedTheme = useMemo(
    () =>
      themePick === "manual"
        ? null
        : themes.find((t) => themeKeyOf(t) === themePick) || null,
    [themePick, themes],
  );

  const homework = data?.homework || null;
  const labwork = data?.labwork || null;
  const issuedHw = materialIssued(homework);
  const issuedLw = materialIssued(labwork);
  const canEditTheme = !rosterOnly && data?.can_set_theme !== false;
  const isPlanned = (data?.scheduleType || "planned") === "planned";

  function applyThemeState(payload: PresentsResponse | null, list: PresentStudent[]) {
    const recovered = payload?.recoverable_theme;
    const fromStud = list.find((s) => s.theme)?.theme || list[0]?.theme || "";
    const nextTheme = String(
      fromStud || recovered?.theme || payload?.homework?.theme || "",
    );
    setTheme(nextTheme);
    setThemeMode(nextTheme ? "view" : "edit");
    setIssueHw(!!(payload?.homework && payload.homework.public_material_id));
    setIssueLw(!!(payload?.labwork && payload.labwork.public_material_id));
    const teachSrc =
      recovered?.primary_teach ??
      list.find((s) => s.primary_teach != null)?.primary_teach ??
      list[0]?.primary_teach;
    setTeachType(asTeachType(teachSrc));
  }

  async function loadThemes(
    payload: PresentsResponse | null,
  ): Promise<MethodTheme[]> {
    const schedule = resolveSchedule(payload);
    if (!schedule) {
      setThemes([]);
      return [];
    }
    // В Omni темы методпакета запрашиваются только для planned
    if (payload?.scheduleType && payload.scheduleType !== "planned") {
      setThemes([]);
      return [];
    }
    try {
      const res = await api.omni<unknown>(
        "presents-themes",
        { schedule },
        false,
      );
      const list = asThemeList(res.data);
      const normalized = list.map((t) => ({
        ...t,
        theme: String(t.theme || t.name || `Неделя ${t.week ?? "?"}`),
        key: themeKeyOf(t),
      }));
      setThemes(normalized);
      return normalized;
    } catch (e) {
      setThemes([]);
      onToast(
        e instanceof Error ? e.message : "Не удалось загрузить методпакет",
        "bad",
      );
      return [];
    }
  }

  async function load() {
    setLoading(true);
    setRosterOnly(false);
    try {
      const payload: Record<string, unknown> = {
        lenta: Number(lenta),
      };
      if (date) payload.date = date;

      let res = await api.omni<PresentsResponse>("presents", payload, false);
      let list = asStudentList(res.data?.students);

      if (groupLabel && res.data?.groups && typeof res.data.groups === "object") {
        const matchId = Object.entries(
          res.data.groups as Record<string, unknown>,
        ).find(([id, g]) => {
          if (typeof g === "string") return g === groupLabel;
          if (g && typeof g === "object") {
            const row = g as { name_tgroups?: string; name?: string };
            return (
              row.name_tgroups === groupLabel ||
              row.name === groupLabel ||
              id === groupLabel
            );
          }
          return false;
        })?.[0];
        if (matchId && String(res.data.cur_group) !== matchId) {
          res = await api.omni<PresentsResponse>(
            "presents",
            { ...payload, group: matchId },
            false,
          );
          list = asStudentList(res.data?.students);
        }
      }

      if (list.length === 0 && groupLabel) {
        const roster = await loadGroupRoster(groupLabel);
        if (roster.length) {
          setData(res.data);
          setStudents(roster);
          setRosterOnly(true);
          setTheme("");
          setThemes([]);
          setPrevPair(null);
          setThemeMode("view");
          return;
        }
      }

      setData(res.data);
      setStudents(list);
      applyThemeState(res.data, list);
      await loadThemes(res.data);

      const spec =
        res.data?.cur_spec && typeof res.data.cur_spec === "object"
          ? res.data.cur_spec
          : null;
      const src = Number(spec?.source) === 2 ? 2 : 1;
      const prev = await fetchPrevFromMarkedHistory({
        id_tgroups: String(res.data?.cur_group || ""),
        source: src,
        id_spec: spec?.id_spec != null ? String(spec.id_spec) : null,
        id_base_spec:
          spec?.id_base_spec != null ? String(spec.id_base_spec) : null,
        curDate: String(res.data?.cur_date || date || ""),
        curLenta: Number(res.data?.cur_lenta ?? lenta),
      });
      setPrevPair(prev);

      if (res.warning) onToast(res.warning, "bad");
    } catch (e) {
      if (groupLabel) {
        try {
          const roster = await loadGroupRoster(groupLabel);
          if (roster.length) {
            setStudents(roster);
            setRosterOnly(true);
            setPrevPair(null);
            return;
          }
        } catch {
          /* fall through */
        }
      }
      onToast(e instanceof Error ? e.message : "Ошибка", "bad");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    api
      .omni<string[]>("marks-selects", {})
      .then((r) => setMarks(Array.isArray(r.data) ? r.data : []))
      .catch(() =>
        setMarks(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, lenta, group, label]);

  useEffect(() => {
    if (!themes.length) {
      setThemePick("manual");
      return;
    }
    const byWeek = themes.find(
      (t) =>
        data?.recoverable_theme?.public_week_id != null &&
        Number(t.public_week_id) ===
          Number(data.recoverable_theme.public_week_id),
    );
    const byName = themes.find((t) => t.theme === theme);
    const hit = byWeek || byName;
    setThemePick(hit ? themeKeyOf(hit) : "manual");
  }, [themes, data?.recoverable_theme, theme]);

  function startEditTheme() {
    setThemeMode("edit");
    if (selectedTheme) {
      setIssueHw(!!selectedTheme.has_homework);
      setIssueLw(!!selectedTheme.has_labwork);
    }
  }

  function onPickTheme(key: string) {
    setThemePick(key);
    if (key === "manual") {
      setIssueHw(false);
      setIssueLw(false);
      return;
    }
    const t = themes.find((x) => themeKeyOf(x) === key);
    if (!t) return;
    setTheme(t.theme);
    setIssueHw(!!t.has_homework);
    setIssueLw(!!t.has_labwork);
  }

  async function saveTheme() {
    if (rosterOnly) return;
    const text = (selectedTheme?.theme || theme).trim();
    if (!text) {
      onToast("Введите тему", "bad");
      return;
    }
    setThemeSaving(true);
    try {
      const spec =
        data?.cur_spec && typeof data.cur_spec === "object"
          ? data.cur_spec
          : null;
      await api.mutate("set-theme", {
        date: data?.cur_date ?? date,
        lenta: data?.cur_lenta ?? lenta,
        group: data?.cur_group ?? group,
        theme: text,
        spec: spec?.id_spec ?? null,
        source: spec?.source ?? null,
        id_base_spec: spec?.id_base_spec ?? null,
        public_week_id: selectedTheme?.public_week_id ?? null,
        issue_homework: !!(selectedTheme && issueHw),
        issue_labwork: !!(selectedTheme && issueLw),
        schedule: resolveSchedule(data) ?? data?.cur_schedule,
        scheduleType: data?.scheduleType,
        teach_type: teachType,
      });
      setTheme(text);
      setThemeMode("view");
      onToast("Тема сохранена", "good");
      await load();
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Ошибка", "bad");
    } finally {
      setThemeSaving(false);
    }
  }

  async function openCustomHw() {
    setCustomOpen(true);
    setCustomTheme(theme || "");
    setCustomDescr("");
    setCustomDeadline("");
    setCustomFile(null);
    setCustomRecId("");
    try {
      const res = await api.omni<RecommendedHomework[] | { data?: RecommendedHomework[] }>(
        "presents-recommended",
        {
          group: data?.cur_group ?? group,
          lenta: data?.cur_lenta ?? lenta,
          date: data?.cur_date ?? date,
          type: 1,
          schedule: data?.cur_schedule,
        },
        false,
      );
      const raw = res.data;
      const list = Array.isArray(raw)
        ? raw
        : Array.isArray((raw as { data?: RecommendedHomework[] })?.data)
          ? (raw as { data: RecommendedHomework[] }).data
          : [];
      setRecommended(list);
    } catch {
      setRecommended([]);
    }
  }

  async function submitCustomHw() {
    if (rosterOnly || !data) return;
    const dzTheme = customTheme.trim();
    if (!dzTheme) {
      onToast("Укажите тему ДЗ", "bad");
      return;
    }
    const rec = recommended.find((r) => String(r.id) === customRecId);
    if (!customFile && !rec) {
      onToast("Выберите файл или рекомендованный материал", "bad");
      return;
    }
    const spec =
      data.cur_spec && typeof data.cur_spec === "object" ? data.cur_spec : null;
    const form = new FormData();
    form.append("descr", customDescr);
    form.append("lenta", String(data.cur_lenta ?? lenta));
    form.append("date", String(data.cur_date ?? date));
    form.append("group", String(data.cur_group ?? group));
    form.append("spec", spec?.id_spec != null ? String(spec.id_spec) : "");
    form.append("source", spec?.source != null ? String(spec.source) : "");
    form.append(
      "id_base_spec",
      spec?.id_base_spec != null ? String(spec.id_base_spec) : "",
    );
    form.append("dz_theme", dzTheme);
    form.append("deadline", customDeadline || "0");
    form.append("type", "0");
    if (customFile) {
      form.append("file", customFile);
    } else if (rec) {
      const url = String(rec.download_url || rec.filename || "");
      if (url) form.append("filenameUrl", url);
      if (rec.filename != null) {
        form.append("recommended", JSON.stringify(rec.filename));
      }
      if (rec.id != null) form.append("recommended_material", String(rec.id));
    }
    setCustomSaving(true);
    try {
      const r = await api.issueHomework(form);
      onToast(r.message || "ДЗ выдано", "good");
      setCustomOpen(false);
      await load();
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Ошибка", "bad");
    } finally {
      setCustomSaving(false);
    }
  }

  async function deleteCustomHw() {
    if (!homework?.id) {
      onToast("Это ДЗ из методички — снимите выдачу через тему", "bad");
      return;
    }
    if (!confirm("Удалить выданное ДЗ?")) return;
    setCustomSaving(true);
    try {
      await api.mutate("delete-presents-homework", { id: homework.id });
      onToast("ДЗ удалено", "good");
      await load();
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Ошибка", "bad");
    } finally {
      setCustomSaving(false);
    }
  }

  async function setWas(stud: PresentStudent, was: number, idx: number) {
    if (rosterOnly) {
      onToast(isToday ? "Журнал ещё не открыт" : "Нужен день пары или допуск", "bad");
      return;
    }
    const next = [...students];
    next[idx] = { ...stud, was };
    setStudents(next);
    setSaving(true);
    try {
      const visits: Record<string, unknown> = {
        [keyNow()]: {
          was,
          vizit: stud.id_vizit || null,
          id_stud: stud.id_stud,
          id_schedule: stud.id_schedule || data?.cur_schedule || null,
          primary_teach: teachType,
          theme: theme || stud.theme || "",
        },
      };
      const r = await api.mutate("set-was", {
        visits,
        schedule: resolveSchedule(data) ?? data?.cur_schedule,
      });
      if (!r.synced) onToast("Сохранено офлайн", "neutral");
      if (
        r.omni &&
        typeof r.omni === "object" &&
        "new_id_vizit" in (r.omni as object)
      ) {
        await load();
      }
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Ошибка", "bad");
    } finally {
      setSaving(false);
    }
  }

  async function setAllPresent() {
    if (rosterOnly) {
      onToast(isToday ? "Журнал ещё не открыт" : "Нужен день пары или допуск", "bad");
      return;
    }
    setSaving(true);
    try {
      await api.mutate("set-was-all", {
        lenta: data?.cur_lenta ?? lenta,
        group: data?.cur_group ?? group,
        date: data?.cur_date ?? date,
        schedule: resolveSchedule(data) ?? data?.cur_schedule,
      });
      await load();
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Ошибка", "bad");
    } finally {
      setSaving(false);
    }
  }

  async function setMark(
    stud: PresentStudent,
    type: 2 | 4,
    mark: string,
    idx: number,
  ) {
    if (rosterOnly) {
      onToast("Сначала нужен журнал пары", "bad");
      return;
    }
    if (type === 4 && Number(stud.was) === WAS.absent) {
      onToast("Не был на паре — оценку за урок нельзя", "bad");
      return;
    }
    if (!stud.id_vizit) {
      onToast("Сначала отметь", "bad");
      return;
    }
    const next = [...students];
    if (type === 2) next[idx] = { ...stud, mark2: mark };
    else next[idx] = { ...stud, mark4: mark };
    setStudents(next);
    try {
      await api.mutate("set-mark", {
        marks: { [keyNow()]: { type, mark, vizit: stud.id_vizit } },
      });
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Ошибка", "bad");
    }
  }

  const hwTitle = materialTitle(homework, "Домашнее задание");
  const lwTitle = materialTitle(labwork, "Лабораторная");
  const selectedRec = recommended.find((r) => String(r.id) === customRecId);
  const methodSpecId = methodSpecIdFromPair(data, selectedTheme);
  const specName =
    data?.cur_spec && typeof data.cur_spec === "object"
      ? data.cur_spec.name_spec
      : undefined;

  return (
    <div className="app-shell pair-page">
      <div className="pair-top">
        <Link to="/" className="icon-btn" aria-label="Назад">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </Link>
        <div>
          <h1 className="page-date" style={{ fontSize: "1.25rem" }}>
            {groupLabel || group || data?.cur_group || "Пара"}
          </h1>
          <div className="mute" style={{ fontWeight: 650, marginTop: 2 }}>
            {[date || data?.cur_date, `${lenta} пара`, specName]
              .filter(Boolean)
              .join(" · ")}
            {saving ? " · …" : ""}
            {rosterOnly ? " · состав" : ""}
          </div>
        </div>
        <button className="btn signal" onClick={setAllPresent} disabled={rosterOnly}>
          Все ✓
        </button>
      </div>

      {rosterOnly ? (
        <div className="mute" style={{ fontWeight: 650 }}>
          {isToday
            ? "Журнал пары ещё не открыт в Omni — показан состав группы"
            : "На эту дату журнал закрыт — показан состав. Для отметок нужен день пары или допуск завуча"}
        </div>
      ) : null}

      {!rosterOnly && prevPair ? (
        <div className="pair-prev">
          <span className="pair-prev-label">На прошлой паре было</span>
          <span className="pair-prev-body">
            урок №{prevPair.num}. {prevPair.theme}
          </span>
        </div>
      ) : null}

      {!rosterOnly ? (
        <section className="pair-lesson">
          {canEditTheme ? (
            <div
              className="pair-teach-type"
              role="radiogroup"
              aria-label="Тип преподавателя"
            >
              <button
                type="button"
                role="radio"
                aria-checked={teachType === 0}
                className={`pair-teach-opt ${teachType === 0 ? "on" : ""}`}
                onClick={() => {
                  setTeachType(0);
                  if (themeMode === "view") startEditTheme();
                }}
              >
                Основной
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={teachType === 1}
                className={`pair-teach-opt ${teachType === 1 ? "on" : ""}`}
                onClick={() => {
                  setTeachType(1);
                  if (themeMode === "view") startEditTheme();
                }}
              >
                По замене
              </button>
            </div>
          ) : null}

          <div className="pair-lesson-head">
            <div className="pair-theme-block">
              <div className="pair-lesson-label">Тема урока</div>
              {themeMode === "view" ? (
                <div className="pair-theme-view">
                  {theme ? theme : <span className="mute">Тема ещё не задана</span>}
                </div>
              ) : null}
            </div>
            <div className="pair-lesson-links">
              {methodSpecId ? (
                <Link className="text-link" to={`/materials?spec=${methodSpecId}`}>
                  Метод
                </Link>
              ) : null}
              {themeMode === "view" && canEditTheme ? (
                <button type="button" className="text-link" onClick={startEditTheme}>
                  Изменить
                </button>
              ) : null}
            </div>
          </div>

          {themeMode !== "view" ? (
            <div className="pair-theme-edit">
              {isPlanned ? (
                themes.length > 0 ? (
                  <select
                    className="bare-select"
                    value={themePick}
                    onChange={(e) => onPickTheme(e.target.value)}
                  >
                    <option value="manual">Ввести тему вручную</option>
                    {themes.map((t) => (
                      <option key={themeKeyOf(t)} value={themeKeyOf(t)}>
                        {t.theme}
                        {t.has_homework ? " · ДЗ" : ""}
                        {t.has_labwork ? " · ЛР" : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="mute tiny">
                    Тем методпакета нет — можно ввести тему вручную
                  </div>
                )
              ) : (
                <div className="mute tiny">
                  Методпакет недоступен для этого типа пары
                </div>
              )}

              {themePick === "manual" || themes.length === 0 ? (
                <textarea
                  className="pair-theme-input"
                  rows={3}
                  placeholder="Тема урока"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                />
              ) : (
                <div className="pair-theme-picked">{selectedTheme?.theme}</div>
              )}

              {selectedTheme ? (
                <div className="pair-issue">
                  <label
                    className={`pair-check ${!selectedTheme.has_homework ? "off" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={issueHw}
                      disabled={!selectedTheme.has_homework}
                      onChange={(e) => setIssueHw(e.target.checked)}
                    />
                    Выдать ДЗ
                  </label>
                  <label
                    className={`pair-check ${!selectedTheme.has_labwork ? "off" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={issueLw}
                      disabled={!selectedTheme.has_labwork}
                      onChange={(e) => setIssueLw(e.target.checked)}
                    />
                    Выдать практику
                  </label>
                </div>
              ) : null}

              <div className="pair-theme-actions">
                <button
                  type="button"
                  className="ghost-btn"
                  disabled={themeSaving}
                  onClick={() => {
                    applyThemeState(data, students);
                    setThemeMode(theme ? "view" : "edit");
                  }}
                >
                  Отмена
                </button>
                <button
                  type="button"
                  className="primary-btn"
                  disabled={themeSaving}
                  onClick={() => void saveTheme()}
                >
                  {themeSaving ? "…" : "Сохранить"}
                </button>
              </div>
            </div>
          ) : null}

          <div className="pair-assign">
            <div className="pair-assign-title-row">
              <div className="pair-assign-title">Материалы пары</div>
              {methodSpecId ? (
                <Link
                  className="text-link"
                  to={`/materials?spec=${methodSpecId}`}
                >
                  Открыть метод
                </Link>
              ) : null}
            </div>
            <div className="pair-assign-grid">
              <div className={`pair-assign-card ${issuedHw ? "on" : ""}`}>
                <div className="pair-assign-kind">ДЗ</div>
                <div className="pair-assign-name">
                  {hwTitle || "Не выдано"}
                </div>
                {homework?.download_url || homework?.filename ? (
                  <a
                    className="text-link"
                    href={String(homework.download_url || homework.filename)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Скачать
                  </a>
                ) : null}
                {homework?.id && canEditTheme ? (
                  <button
                    type="button"
                    className="text-link"
                    disabled={customSaving}
                    onClick={() => void deleteCustomHw()}
                  >
                    Удалить
                  </button>
                ) : null}
              </div>
              <div className={`pair-assign-card ${issuedLw ? "on" : ""}`}>
                <div className="pair-assign-kind">Практика</div>
                <div className="pair-assign-name">
                  {lwTitle || "Не выдано"}
                </div>
                {labwork?.download_url || labwork?.filename ? (
                  <a
                    className="text-link"
                    href={String(labwork.download_url || labwork.filename)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Скачать
                  </a>
                ) : null}
              </div>
            </div>
            {themeMode === "view" && canEditTheme ? (
              <div className="pair-assign-actions">
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={startEditTheme}
                >
                  {issuedHw || issuedLw
                    ? "Изменить выдачу из методички"
                    : "Выдать ДЗ из методички"}
                </button>
                {!issuedHw ? (
                  <button
                    type="button"
                    className="ghost-btn"
                    onClick={() => void openCustomHw()}
                  >
                    Выдать своё ДЗ
                  </button>
                ) : null}
              </div>
            ) : null}

            {customOpen && canEditTheme ? (
              <div className="pair-custom-hw">
                <div className="pair-custom-hw-title">Своё ДЗ</div>
                <input
                  className="pair-custom-input"
                  type="text"
                  value={customTheme}
                  onChange={(e) => setCustomTheme(e.target.value)}
                  placeholder="Тема"
                />
                <textarea
                  className="pair-custom-input"
                  rows={2}
                  value={customDescr}
                  onChange={(e) => setCustomDescr(e.target.value)}
                  placeholder="Описание (необязательно)"
                />
                <input
                  className="pair-custom-input"
                  type="date"
                  value={customDeadline}
                  onChange={(e) => setCustomDeadline(e.target.value)}
                  aria-label="Дедлайн"
                />

                {customRecId ? (
                  <div className="pair-attach on">
                    <div className="pair-attach-body">
                      <span className="pair-attach-label">Материал</span>
                      <span className="pair-attach-name">
                        {selectedRec?.name ||
                          selectedRec?.theme ||
                          selectedRec?.filename ||
                          "Рекомендованный"}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="pair-attach-clear"
                      aria-label="Убрать"
                      onClick={() => setCustomRecId("")}
                    >
                      ×
                    </button>
                  </div>
                ) : customFile ? (
                  <div className="pair-attach on">
                    <div className="pair-attach-body">
                      <span className="pair-attach-label">Файл</span>
                      <span className="pair-attach-name">{customFile.name}</span>
                    </div>
                    <button
                      type="button"
                      className="pair-attach-clear"
                      aria-label="Убрать файл"
                      onClick={() => setCustomFile(null)}
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <label className="pair-attach">
                    <input
                      type="file"
                      className="pair-attach-input"
                      onChange={(e) => {
                        setCustomFile(e.target.files?.[0] || null);
                        setCustomRecId("");
                      }}
                    />
                    <span className="pair-attach-plus" aria-hidden>
                      +
                    </span>
                    <span className="pair-attach-hint">Прикрепить файл</span>
                  </label>
                )}

                {!customFile && recommended.length > 0 ? (
                  <select
                    className="pair-custom-rec"
                    value={customRecId}
                    onChange={(e) => {
                      setCustomRecId(e.target.value);
                      if (e.target.value) setCustomFile(null);
                    }}
                  >
                    <option value="">или из рекомендованных…</option>
                    {recommended.map((r) => (
                      <option key={String(r.id)} value={String(r.id)}>
                        {r.name || r.theme || r.filename || `Материал ${r.id}`}
                      </option>
                    ))}
                  </select>
                ) : null}

                <div className="pair-theme-actions">
                  <button
                    type="button"
                    className="ghost-btn"
                    disabled={customSaving}
                    onClick={() => setCustomOpen(false)}
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    className="primary-btn"
                    disabled={customSaving}
                    onClick={() => void submitCustomHw()}
                  >
                    {customSaving ? "…" : "Выдать"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {loading ? (
        <>
          <div className="skeleton" />
          <div className="skeleton" />
        </>
      ) : students.length === 0 ? (
        <>
          <div className="empty">Список пуст</div>
          {!isToday ? (
            <PastAccess date={date} onToast={onToast} onOpened={load} />
          ) : null}
        </>
      ) : (
        <>
          <div className="pair-roster-head">
            <span>Студенты</span>
            <span className="mute">{students.length}</span>
          </div>
          <div className="student-list">
            {students.map((stud, idx) => {
              const was = Number(stud.was);
              return (
                <div className="student" key={stud.id_stud}>
                  <div className="student-head">
                    <StudentAvatar
                      name={stud.fio_stud}
                      src={stud.photo_pas}
                    />
                    <div className="student-name">{stud.fio_stud}</div>
                  </div>
                  {!rosterOnly ? (
                    <>
                      <div className="was">
                        <button
                          className={was === WAS.present ? "on-p" : ""}
                          onClick={() => setWas(stud, WAS.present, idx)}
                        >
                          Был
                        </button>
                        <button
                          className={was === WAS.late ? "on-l" : ""}
                          onClick={() => setWas(stud, WAS.late, idx)}
                        >
                          Опозд.
                        </button>
                        <button
                          className={was === WAS.absent ? "on-a" : ""}
                          onClick={() => setWas(stud, WAS.absent, idx)}
                        >
                          Нет
                        </button>
                      </div>
                      <div className="marks">
                        <select
                          className="mark-kw"
                          aria-label="КР"
                          value={stud.mark2 != null ? String(stud.mark2) : ""}
                          onChange={(e) => setMark(stud, 2, e.target.value, idx)}
                        >
                          <option value="">КР</option>
                          {marks.map((m) => (
                            <option key={`2-${m}`} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                        <select
                          className="mark-cw"
                          aria-label="Урок"
                          value={stud.mark4 != null ? String(stud.mark4) : ""}
                          disabled={was === WAS.absent}
                          title={
                            was === WAS.absent ? "Не был на паре" : undefined
                          }
                          onChange={(e) => setMark(stud, 4, e.target.value, idx)}
                        >
                          <option value="">Урок</option>
                          {marks.map((m) => (
                            <option key={`4-${m}`} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  ) : null}
                </div>
              );
            })}
          </div>
          {rosterOnly && !isToday ? (
            <PastAccess date={date} onToast={onToast} onOpened={load} />
          ) : null}
        </>
      )}
    </div>
  );
}
