export type Me = {
  username: string;
  teachId?: string;
  teachName?: string;
  branch?: { name?: string; id_city?: number | string; id?: number | string } | null;
  expiresAt: number;
  isAdmin?: boolean;
  impersonating?: { adminUsername: string } | null;
};

export type ApiEnvelope<T> = {
  data: T;
  cached?: boolean;
  stale?: boolean;
  updatedAt?: number;
  warning?: string;
  error?: string;
};

async function req<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    ...init,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (json as { error?: string }).error || `HTTP ${res.status}`,
    );
  }
  return json as T;
}

export const api = {
  login(username: string, password: string) {
    return req<{ ok: boolean; user: Me }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  },
  logout() {
    return req<{ ok: boolean }>("/api/auth/logout", { method: "POST" });
  },
  me() {
    return req<Me>("/api/me");
  },
  omni<T>(name: string, body: unknown = {}, stale = true) {
    return req<ApiEnvelope<T>>(
      `/api/omni/${name}${stale ? "?stale=1" : ""}`,
      { method: "POST", body: JSON.stringify(body) },
    );
  },
  mutate(name: string, body: unknown) {
    return req<{
      ok: boolean;
      queueId: string;
      synced: boolean;
      message: string;
      omni: unknown;
    }>(`/api/mutate/${name}`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  /** Custom ДЗ: multipart (file optional if filenameUrl / recommended). */
  issueHomework(form: FormData) {
    return fetch("/api/presents/homework", {
      method: "POST",
      credentials: "include",
      body: form,
    }).then(async (res) => {
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        data?: unknown;
        message?: string;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }
      return json;
    });
  },
  changeUser(id_user: string) {
    return req<{ ok: boolean }>("/api/auth/change-user", {
      method: "POST",
      body: JSON.stringify({ id_user }),
    });
  },
  changeCity(city: string | number) {
    return req<{ ok: boolean; branch?: Me["branch"] }>("/api/auth/change-city", {
      method: "POST",
      body: JSON.stringify({ city }),
    });
  },
  syncStatus() {
    return req<{ counts: Array<{ status: string; n: number }> }>(
      "/api/sync/status",
    );
  },
  flush() {
    return req<{ flushed: number }>("/api/sync/flush", { method: "POST" });
  },
  adminOverview() {
    return req<{
      data: {
        sessionsActive: number;
        sessionsTotal: number;
        cacheEntries: number;
        sync: Record<string, number>;
        auth24h: { total: number; ok: number; fail: number };
      };
    }>("/api/admin/overview");
  },
  adminSessions(limit = 100) {
    return req<{
      data: Array<{
        id: string;
        username: string;
        teachId: string | null;
        teachName: string | null;
        branch: unknown;
        createdAt: number;
        expiresAt: number;
        lastUsedAt: number;
        hasSealedPassword: boolean;
        active: boolean;
      }>;
    }>(`/api/admin/sessions?limit=${limit}`);
  },
  adminRevokeSession(id: string) {
    return req<{ ok: boolean }>(`/api/admin/sessions/${id}/revoke`, {
      method: "POST",
      body: "{}",
    });
  },
  adminImpersonate(id: string) {
    return req<{ ok: boolean; user: Me }>(
      `/api/admin/sessions/${id}/impersonate`,
      { method: "POST", body: "{}" },
    );
  },
  adminStopImpersonate() {
    return req<{ ok: boolean; user: Me }>("/api/admin/stop-impersonate", {
      method: "POST",
      body: "{}",
    });
  },
  adminAuthEvents(limit = 100) {
    return req<{
      data: Array<{
        id: string;
        username: string;
        ok: boolean;
        error: string | null;
        ip: string | null;
        userAgent: string | null;
        teachId: string | null;
        teachName: string | null;
        createdAt: number;
      }>;
    }>(`/api/admin/auth-events?limit=${limit}`);
  },
  adminSyncErrors(limit = 50) {
    return req<{
      data: Array<{
        id: string;
        session_id: string;
        kind: string;
        status: string;
        attempts: number;
        last_error: string | null;
        created_at: number;
        synced_at: number | null;
      }>;
    }>(`/api/admin/sync-errors?limit=${limit}`);
  },
  adminPurgeExpired() {
    return req<{
      ok: boolean;
      sessions: number;
      cacheOrphans: number;
      authEvents: number;
    }>("/api/admin/purge-expired", { method: "POST", body: "{}" });
  },
  adminClearCache() {
    return req<{ ok: boolean; cleared: number }>("/api/admin/clear-cache", {
      method: "POST",
      body: "{}",
    });
  },
  adminResetSyncErrors() {
    return req<{ ok: boolean; reset: number }>(
      "/api/admin/reset-sync-errors",
      { method: "POST", body: "{}" },
    );
  },
};

export type ScheduleLesson = {
  lenta: string;
  weekday: string;
  groups: string;
  num_rooms: string;
  name_spec: string;
  l_start: string;
  l_end: string;
  scheduleType?: string;
  eventName?: string | null;
  entity_id?: string;
  id_form?: string;
};

export type ScheduleResponse = {
  body:
    | Record<string, Record<string, ScheduleLesson | null>>
    | unknown[];
  lents: Array<Record<string, { n_lenta: string; n_day: string; l_start: string; l_end: string }>>;
  days: Record<string, string>;
  daysShort: Record<string, string>;
  dates: Record<string, string>;
  curdate: string;
  start_end: { monday: string; sunday: string };
};

export type PresentStudent = {
  id_stud: string;
  fio_stud: string;
  photo_pas?: string;
  was?: number | string | null;
  id_vizit?: string | number | null;
  mark2?: string | number | null;
  mark4?: string | number | null;
  comments?: string | null;
  theme?: string | null;
  primary_teach?: number | string | null;
  id_schedule?: string | number | null;
  prize?: number | null;
  price?: string | number;
  message_deptor?: string;
};

export type PresentMaterial = {
  id?: string | number;
  public_material_id?: string | number | null;
  name?: string | null;
  theme?: string | null;
  filename?: string | null;
  download_url?: string | null;
  file_name?: string | null;
  ospr?: string | number | null;
  descr?: string | null;
  deadline?: string | number | null;
};

export type RecommendedHomework = {
  id?: string | number;
  name?: string | null;
  theme?: string | null;
  filename?: string | null;
  download_url?: string | null;
  cover_img?: string | null;
};

export type MethodTheme = {
  key?: string;
  package_id?: string | number;
  week?: string | number;
  public_week_id?: string | number;
  theme: string;
  name?: string | null;
  has_homework?: boolean | number | string;
  has_labwork?: boolean | number | string;
};

export type PresentsResponse = {
  schedule: unknown[] | Record<string, unknown>;
  students?: PresentStudent[];
  groups?: Record<string, string> | string[];
  cur_date?: string;
  cur_date_tr?: string;
  cur_group?: string;
  cur_lenta?: string | number;
  cur_schedule?: unknown;
  cur_spec?:
    | string
    | {
        id_spec?: string | null;
        source?: string | number;
        id_base_spec?: string | null;
        name_spec?: string;
      };
  today?: string;
  can_set_theme?: boolean;
  empty_group?: boolean;
  homework?: PresentMaterial | null;
  labwork?: PresentMaterial | null;
  materials?: PresentMaterial | null;
  totalPoints?: number;
  stop_lenta?: unknown;
  end_lenta_time?: string;
  /** planned | event | … — темы методпакета только для planned */
  scheduleType?: string;
  prev_lenta?: number | string | boolean;
  cur_lenta_number?: number | string;
  recoverable_theme?: {
    theme?: string;
    public_week_id?: string | number;
    primary_teach?: number | string;
  } | null;
};
