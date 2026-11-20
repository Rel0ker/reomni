import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../lib/api";

type Named = {
  id?: string | number;
  id_form?: string | number;
  id_spec?: string | number;
  id_city?: string | number;
  public_form?: string | number;
  public_spec?: string | number;
  form?: string | number;
  spec?: string | number;
  city?: string | number;
  name?: string | null;
  name_form?: string | null;
  name_spec?: string | null;
  short_name_spec?: string | null;
  title?: string | null;
  name_city?: string | null;
};

type PackageRow = {
  id: string;
  name: string;
  formId: string;
  formName: string;
  cityId: string;
  cityName: string;
};

type MatItem = {
  id?: string | number;
  public_materials_id?: string | number;
  theme?: string | null;
  name?: string | null;
  filename?: string | null;
  download_url?: string | null;
  url?: string | null;
  file_url?: string | null;
};

type WeekBucket = {
  theme?: string | null;
  data?: Record<string, MatItem[] | Record<string, MatItem>>;
};

type FileRow = {
  key: string;
  week: string;
  weekTheme: string;
  type: number;
  typeLabel: string;
  title: string;
  href: string;
};

const TYPE_LABEL: Record<number, string> = {
  1: "ДЗ",
  2: "Урок",
  3: "Практика",
  4: "Книга",
  5: "Видео",
  6: "Презентация",
  7: "Тест",
  8: "Посты",
};

function asList<T extends Named>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (raw && typeof raw === "object") {
    return Object.entries(raw as Record<string, T>)
      .map(([k, v]) => {
        if (!v || typeof v !== "object") return null;
        const row = v as Named;
        if (pickId(row) == null) return { ...row, id: k } as T;
        return v;
      })
      .filter((x): x is T => !!x);
  }
  return [];
}

function pickId(item: Named): string | null {
  const v =
    item.id ??
    item.id_spec ??
    item.id_form ??
    item.public_spec ??
    item.public_form ??
    item.spec ??
    item.form ??
    item.id_city ??
    item.city;
  if (v == null || String(v) === "") return null;
  return String(v);
}

function labelOf(item: Named, fallback: string) {
  return String(
    item.name_spec ||
      item.short_name_spec ||
      item.name_form ||
      item.name_city ||
      item.name ||
      item.title ||
      fallback,
  );
}

function materialLink(m: MatItem) {
  return String(m.download_url || m.file_url || m.url || m.filename || "");
}

function materialTitle(m: MatItem, type: number) {
  return String(m.theme || m.name || m.filename || TYPE_LABEL[type] || "Файл");
}

function filesFromMaterials(matMap: Record<string, WeekBucket>): FileRow[] {
  const weekKeys = Object.keys(matMap).sort((a, b) => {
    const na = Number(a);
    const nb = Number(b);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
    return a.localeCompare(b);
  });

  const out: FileRow[] = [];
  for (const week of weekKeys) {
    const bucket = matMap[week];
    const weekTheme = String(bucket?.theme || "");
    if (!bucket?.data || typeof bucket.data !== "object") continue;

    for (const [typeKey, raw] of Object.entries(bucket.data)) {
      const type = Number(typeKey);
      const items: MatItem[] = Array.isArray(raw)
        ? raw
        : raw && typeof raw === "object"
          ? (Object.values(raw).filter(
              (x) => x && typeof x === "object",
            ) as MatItem[])
          : [];

      items.forEach((item, i) => {
        const title = materialTitle(item, type);
        const href = materialLink(item);
        out.push({
          key: `${week}-${type}-${item.public_materials_id || item.id || title}-${i}`,
          week,
          weekTheme,
          type,
          typeLabel: TYPE_LABEL[type] || `Тип ${type}`,
          title,
          href,
        });
      });
    }
  }

  // убираем дубли внутри недели (Omni иногда отдаёт повторы)
  const seen = new Set<string>();
  return out.filter((f) => {
    const sig = `${f.week}|${f.type}|${f.title}|${f.href}`;
    if (seen.has(sig)) return false;
    seen.add(sig);
    return true;
  });
}

function groupFilesByWeek(files: FileRow[]) {
  const map = new Map<string, { week: string; theme: string; items: FileRow[] }>();
  for (const f of files) {
    const cur = map.get(f.week);
    if (cur) {
      cur.items.push(f);
      if (!cur.theme && f.weekTheme) cur.theme = f.weekTheme;
    } else {
      map.set(f.week, {
        week: f.week,
        theme: f.weekTheme,
        items: [f],
      });
    }
  }
  return [...map.values()].sort((a, b) => {
    const na = Number(a.week);
    const nb = Number(b.week);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
    return String(a.week).localeCompare(String(b.week));
  });
}

type TeachScope = {
  ids: Set<string>;
  names: Set<string>;
};

/** Предметы/пакеты из нагрузки преподавателя (как в разделе Оценки). */
async function loadTeachScope(): Promise<TeachScope> {
  const ids = new Set<string>();
  const names = new Set<string>();
  try {
    const res = await api.omni<{
      groups_spec?: Record<
        string,
        {
          data?: Array<{
            id_spec?: string | number | null;
            id_base_spec?: string | number | null;
            name_spec?: string | null;
          }>;
        }
      >;
    }>("classwork-index", {}, false);
    for (const group of Object.values(res.data?.groups_spec || {})) {
      for (const spec of group.data || []) {
        if (spec.id_base_spec != null && String(spec.id_base_spec) !== "") {
          ids.add(String(spec.id_base_spec));
        }
        if (spec.id_spec != null && String(spec.id_spec) !== "") {
          ids.add(String(spec.id_spec));
        }
        if (spec.name_spec) names.add(String(spec.name_spec).trim().toLowerCase());
      }
    }
  } catch {
    /* ignore */
  }
  return { ids, names };
}

/** Как в Omni Методички: формы → методпакеты текущей сессии (без обхода всех филиалов). */
async function loadSessionPackages(): Promise<PackageRow[]> {
  const out: PackageRow[] = [];
  try {
    const formsRes = await api.omni<unknown>("bind-public-form", {}, false);
    const forms = asList<Named>(formsRes.data);
    const batches = await Promise.all(
      forms.map(async (form) => {
        const formId = pickId(form);
        if (!formId) return [] as PackageRow[];
        const formName = labelOf(form, `Форма ${formId}`);
        try {
          const specsRes = await api.omni<unknown>(
            "bind-public-spec",
            { form: formId, direction: null, arc: 0 },
            false,
          );
          return asList<Named>(specsRes.data)
            .map((spec) => {
              const id = pickId(spec);
              if (!id) return null;
              return {
                id,
                name: labelOf(spec, `Метод ${id}`),
                formId,
                formName,
                cityId: "",
                cityName: "",
              } satisfies PackageRow;
            })
            .filter((x): x is PackageRow => !!x);
        } catch {
          return [] as PackageRow[];
        }
      }),
    );
    out.push(...batches.flat());
  } catch {
    /* ignore */
  }
  return out;
}

function filterTeacherPackages(
  rows: PackageRow[],
  scope: TeachScope,
): PackageRow[] {
  if (!scope.ids.size && !scope.names.size) return [];

  const byId = rows.filter((p) => scope.ids.has(p.id));
  if (byId.length) return byId;

  const byName = rows.filter((p) =>
    scope.names.has(p.name.trim().toLowerCase()),
  );
  if (byName.length) return byName;

  return rows.filter((p) => {
    const name = p.name.trim().toLowerCase();
    for (const n of scope.names) {
      if (n.length >= 5 && (name.includes(n) || n.includes(name))) return true;
    }
    return false;
  });
}

/** Пакеты, где преподаватель автор (если по нагрузке не нашли). */
async function filterAuthorPackages(rows: PackageRow[]): Promise<PackageRow[]> {
  // не долбим Omni сотнями is-author
  const candidates = rows.slice(0, 100);
  const kept: PackageRow[] = [];
  const chunk = 8;
  for (let i = 0; i < candidates.length; i += chunk) {
    const slice = candidates.slice(i, i + chunk);
    const flags = await Promise.all(
      slice.map(async (p) => {
        try {
          const r = await api.omni<unknown>(
            "bind-is-author",
            { spec: p.id },
            false,
          );
          return r.data === true || r.data === 1 || r.data === "1";
        } catch {
          return false;
        }
      }),
    );
    slice.forEach((p, idx) => {
      if (flags[idx]) kept.push(p);
    });
  }
  return kept;
}

function dedupePackages(rows: PackageRow[]): PackageRow[] {
  const map = new Map<string, PackageRow>();
  for (const row of rows) {
    const prev = map.get(row.id);
    if (!prev) {
      map.set(row.id, row);
      continue;
    }
    map.set(row.id, {
      ...prev,
      name: prev.name || row.name,
      formName: prev.formName || row.formName,
      formId: prev.formId || row.formId,
      cityName: prev.cityName || row.cityName,
      cityId: prev.cityId || row.cityId,
    });
  }
  return [...map.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "ru", { sensitivity: "base" }),
  );
}

export function MaterialsPage({
  onToast,
}: {
  onToast: (t: string, tone?: "good" | "bad" | "neutral") => void;
}) {
  const [params, setParams] = useSearchParams();
  const paramSpec = params.get("spec") || "";
  const [packages, setPackages] = useState<PackageRow[]>([]);
  const [methodQuery, setMethodQuery] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [specId, setSpecId] = useState(paramSpec);
  const [fileQuery, setFileQuery] = useState("");
  const [files, setFiles] = useState<FileRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingList(true);
      try {
        const [catalog, scope] = await Promise.all([
          loadSessionPackages(),
          loadTeachScope(),
        ]);
        const all = dedupePackages(catalog);
        let mine = filterTeacherPackages(all, scope);

        // Если по нагрузке пусто — оставим только пакеты, где преподаватель автор
        if (!mine.length && all.length) {
          mine = await filterAuthorPackages(all);
        }

        if (cancelled) return;

        // переход с пары: ?spec= даже если пакет не в «моих»
        let list = mine;
        if (paramSpec && !list.some((p) => p.id === paramSpec)) {
          const hit = all.find((p) => p.id === paramSpec);
          list = hit
            ? dedupePackages([hit, ...list])
            : [
                {
                  id: paramSpec,
                  name: `Метод ${paramSpec}`,
                  formId: "",
                  formName: "",
                  cityId: "",
                  cityName: "",
                },
                ...list,
              ];
        }

        setPackages(list);
        setSpecId((prev) => {
          if (paramSpec && list.some((p) => p.id === paramSpec)) return paramSpec;
          if (prev && list.some((p) => p.id === prev)) return prev;
          return list[0]?.id || "";
        });
      } catch (e) {
        if (!cancelled) {
          onToast(e instanceof Error ? e.message : "Ошибка методичек", "bad");
        }
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onToast]);

  useEffect(() => {
    if (!specId) {
      setFiles([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingFiles(true);
      try {
        const mat = await api.omni<unknown>(
          "bind-materials",
          { spec: specId },
          false,
        );
        if (cancelled) return;
        const matRaw = mat.data;
        const matMap =
          matRaw && typeof matRaw === "object" && !Array.isArray(matRaw)
            ? (matRaw as Record<string, WeekBucket>)
            : {};
        setFiles(filesFromMaterials(matMap));
      } catch (e) {
        if (!cancelled) {
          setFiles([]);
          onToast(e instanceof Error ? e.message : "Ошибка файлов", "bad");
        }
      } finally {
        if (!cancelled) setLoadingFiles(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [specId, onToast]);

  const methodOptions = useMemo(() => {
    const q = methodQuery.trim().toLowerCase();
    if (!q) return packages;
    return packages.filter((p) =>
      `${p.name} ${p.formName} ${p.cityName}`.toLowerCase().includes(q),
    );
  }, [packages, methodQuery]);

  useEffect(() => {
    if (!pickerOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!pickerRef.current?.contains(e.target as Node)) {
        setPickerOpen(false);
        setMethodQuery("");
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [pickerOpen]);

  useEffect(() => {
    if (pickerOpen) {
      requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [pickerOpen]);

  const selected = packages.find((p) => p.id === specId) || null;

  const visibleFiles = useMemo(() => {
    const q = fileQuery.trim().toLowerCase();
    if (!q) return files;
    return files.filter((f) =>
      `${f.title} ${f.typeLabel} ${f.week} ${f.weekTheme}`
        .toLowerCase()
        .includes(q),
    );
  }, [files, fileQuery]);

  const weekGroups = useMemo(
    () => groupFilesByWeek(visibleFiles),
    [visibleFiles],
  );

  function openPicker() {
    if (loadingList || packages.length === 0) return;
    setMethodQuery("");
    setPickerOpen(true);
  }

  function pickMethod(id: string) {
    setSpecId(id);
    setFileQuery("");
    setMethodQuery("");
    setPickerOpen(false);
    const next = new URLSearchParams(params);
    next.set("spec", id);
    setParams(next, { replace: true });
  }

  return (
    <div className="app-shell materials-page">
      <div className="brand">Методички</div>

      <div className="mat-picker" ref={pickerRef}>
        <button
          type="button"
          className={`mat-picker-trigger ${pickerOpen ? "open" : ""}`}
          disabled={loadingList || packages.length === 0}
          onClick={() => (pickerOpen ? setPickerOpen(false) : openPicker())}
        >
          <span className={selected ? "" : "mat-picker-placeholder"}>
            {loadingList
              ? "Загрузка…"
              : selected?.name || "Выберите метод"}
          </span>
          <span className="mat-picker-caret" aria-hidden>
            ▾
          </span>
        </button>

        {pickerOpen ? (
          <div className="mat-picker-menu" role="listbox">
            <div className="mat-picker-search">
              <input
                ref={searchRef}
                type="search"
                placeholder="поиск..."
                value={methodQuery}
                onChange={(e) => setMethodQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setPickerOpen(false);
                    setMethodQuery("");
                  }
                  if (e.key === "Enter" && methodOptions[0]) {
                    e.preventDefault();
                    pickMethod(methodOptions[0].id);
                  }
                }}
              />
            </div>
            <div className="mat-picker-list">
              {methodOptions.length === 0 ? (
                <div className="mat-picker-empty">Ничего не найдено</div>
              ) : (
                methodOptions.map((p) => (
                  <button
                    type="button"
                    key={`method-${p.id}`}
                    role="option"
                    aria-selected={p.id === specId}
                    className={`mat-picker-option ${p.id === specId ? "on" : ""}`}
                    onClick={() => pickMethod(p.id)}
                  >
                    {p.name}
                  </button>
                ))
              )}
            </div>
          </div>
        ) : null}
      </div>

      {specId ? (
        <input
          className="bare-input"
          placeholder="Поиск по файлам"
          value={fileQuery}
          onChange={(e) => setFileQuery(e.target.value)}
        />
      ) : null}

      {loadingList || loadingFiles ? (
        <div className="skeleton" />
      ) : !specId ? (
        <div className="empty">Выберите метод</div>
      ) : weekGroups.length === 0 ? (
        <div className="empty">Файлов нет</div>
      ) : (
        <div className="mat-day-list">
          {weekGroups.map((g) => (
            <section className="mat-day" key={`week-${g.week}`}>
              <div className="mat-day-head">
                <span className="mat-day-num">День {g.week}</span>
                {g.theme ? (
                  <span className="mat-day-theme">{g.theme}</span>
                ) : null}
              </div>
              <div className="mat-day-files">
                {g.items.map((f) => (
                  <div className="mat-day-row" key={f.key}>
                    <span className="mat-type">{f.typeLabel}</span>
                    {f.href ? (
                      <a
                        className="mat-link"
                        href={f.href}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {f.title}
                      </a>
                    ) : (
                      <span className="mat-link muted">{f.title}</span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
