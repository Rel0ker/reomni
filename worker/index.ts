import { Hono } from "hono";
import { cors } from "hono/cors";
import { MUTATIONS, READS } from "./endpoints";
import {
  adminClearAllCache,
  adminListAuthEvents,
  adminListSessions,
  adminListSyncErrors,
  adminOverview,
  adminPurgeExpired,
  adminResetSyncErrors,
  adminRevokeSession,
  isAdminUser,
  logAuthEvent,
} from "./admin";
import { issueOmniHomework } from "./homework-issue";
import {
  fetchCitiesFromHome,
  omniGet,
  omniLogin,
  omniPost,
  refreshOmniSession,
  sealPassword,
  withOmniRefresh,
  type OmniEnv,
  type OmniSession,
} from "./omni";
import {
  clearCookie,
  ADMIN_COOKIE_NAME,
  issueAdminBackupCookie,
  issueSessionCookie,
  loadSession,
  newId,
  readAdminBackupSessionId,
  readSessionId,
  saveSession,
  touchSession,
} from "./session";
import {
  cacheClear,
  cacheGet,
  cacheSet,
  enqueueMutation,
  flushPendingForSession,
  verifyDue,
} from "./sync";

type Vars = { session: OmniSession };

const app = new Hono<{ Bindings: OmniEnv; Variables: Vars }>();

app.use("/api/*", cors({ origin: (o) => o || "*", credentials: true }));

async function requireSession(
  c: Parameters<Parameters<typeof app.use>[1]>[0],
  next: () => Promise<void>,
) {
  const sid = await readSessionId(c.env, c.req.raw);
  if (!sid) return c.json({ error: "unauthorized" }, 401);
  const session = await loadSession(c.env, sid);
  if (!session) return c.json({ error: "unauthorized" }, 401);
  await touchSession(c.env, session);
  c.set("session", session);
  await next();
}

async function requireAdmin(
  c: Parameters<Parameters<typeof app.use>[1]>[0],
  next: () => Promise<void>,
) {
  const sid = await readSessionId(c.env, c.req.raw);
  if (!sid) return c.json({ error: "unauthorized" }, 401);
  const session = await loadSession(c.env, sid);
  if (!session) return c.json({ error: "unauthorized" }, 401);

  let allowed = isAdminUser(c.env, session.username);
  if (!allowed) {
    const backupId = await readAdminBackupSessionId(c.env, c.req.raw);
    if (backupId) {
      const adminSess = await loadSession(c.env, backupId);
      allowed = !!(adminSess && isAdminUser(c.env, adminSess.username));
    }
  }
  if (!allowed) return c.json({ error: "forbidden" }, 403);

  await touchSession(c.env, session);
  c.set("session", session);
  await next();
}

function jsonWithCookies(
  c: Parameters<Parameters<typeof app.use>[1]>[0],
  body: unknown,
  cookies: string[],
  status: 200 | 400 | 403 | 404 = 200,
) {
  const res = c.json(body, status);
  for (const cookie of cookies) {
    res.headers.append("Set-Cookie", cookie);
  }
  return res;
}

function clientIp(req: Request) {
  return (
    req.headers.get("CF-Connecting-IP") ||
    req.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
    null
  );
}

app.get("/api/health", (c) => c.json({ ok: true, name: "omni-fast" }));

app.post("/api/auth/login", async (c) => {
  const body = await c.req.json<{ username?: string; password?: string }>();
  if (!body.username || !body.password) {
    return c.json({ error: "Укажите логин и пароль" }, 400);
  }
  const ip = clientIp(c.req.raw);
  const ua = c.req.header("User-Agent") || null;
  try {
    const login = await omniLogin(
      c.env.OMNI_ORIGIN,
      body.username,
      body.password,
    );
    const days = Number(c.env.SESSION_DAYS || "30");
    const now = Date.now();
    const passwordEnc = await sealPassword(
      c.env.SESSION_SECRET || "dev-secret",
      body.password,
    );
    const session: OmniSession = {
      id: newId(),
      username: body.username,
      omniCookie: login.jar,
      csrfToken: login.csrf,
      idLocalHash: login.idLocalHash,
      passwordEnc,
      createdAt: now,
      expiresAt: now + days * 86400_000,
      lastUsedAt: now,
    };

    try {
      const start = await omniPost<{ branch?: { name?: string; id_city?: number } }>(
        c.env.OMNI_ORIGIN,
        session,
        "/auth/get-start-info",
        {},
      );
      session.omniCookie = start.jar;
      session.branchJson = JSON.stringify(start.data?.branch ?? null);
      await cacheSet(c.env, session.id, "start-info", start.data);
    } catch {
      /* optional */
    }

    try {
      const teaches = await omniPost<
        Array<{ fio_teach: string; id_teach: string }>
      >(c.env.OMNI_ORIGIN, session, "/auth/get-teach-list", {});
      session.omniCookie = teaches.jar;
      await cacheSet(c.env, session.id, "teach-list", teaches.data);
      const self = (teaches.data || []).find((t) =>
        t.fio_teach
          ?.toLowerCase()
          .includes((body.username.split("_")[0] || "").toLowerCase()),
      );
      if (self) {
        session.teachId = self.id_teach;
        session.teachName = self.fio_teach;
      }
    } catch {
      /* optional */
    }

    try {
      const menu = await fetchCitiesFromHome(c.env.OMNI_ORIGIN, session);
      session.omniCookie = menu.jar;
      if (menu.csrf) session.csrfToken = menu.csrf;
      await cacheSet(c.env, session.id, "cities", menu.cities);
    } catch {
      /* optional */
    }

    await saveSession(c.env, session);
    await logAuthEvent(c.env, {
      username: body.username,
      ok: true,
      ip,
      userAgent: ua,
      teachId: session.teachId,
      teachName: session.teachName,
    });
    const cookie = await issueSessionCookie(c.env, session.id, days);
    return c.json(
      {
        ok: true,
        user: {
          username: session.username,
          teachId: session.teachId,
          teachName: session.teachName,
          branch: session.branchJson ? JSON.parse(session.branchJson) : null,
          expiresAt: session.expiresAt,
          isAdmin: isAdminUser(c.env, session.username),
        },
      },
      200,
      { "Set-Cookie": cookie },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ошибка входа";
    await logAuthEvent(c.env, {
      username: body.username,
      ok: false,
      error: message,
      ip,
      userAgent: ua,
    });
    return c.json({ error: message }, 401);
  }
});

app.post("/api/auth/logout", requireSession, async (c) => {
  const session = c.get("session");
  await c.env.DB.prepare(`DELETE FROM sessions WHERE id = ?`)
    .bind(session.id)
    .run();
  await c.env.SESSIONS.delete(`sess:${session.id}`);
  return c.json(
    { ok: true },
    200,
    {
      "Set-Cookie":
        "omni_fast_sid=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0",
    },
  );
});

app.get("/api/me", requireSession, async (c) => {
  const session = c.get("session");
  const adminBackupId = await readAdminBackupSessionId(c.env, c.req.raw);
  let impersonating: { adminUsername: string } | null = null;
  if (adminBackupId && adminBackupId !== session.id) {
    const adminSess = await loadSession(c.env, adminBackupId);
    if (adminSess && isAdminUser(c.env, adminSess.username)) {
      impersonating = { adminUsername: adminSess.username };
    }
  }
  const adminSelf = isAdminUser(c.env, session.username);
  return c.json({
    username: session.username,
    teachId: session.teachId,
    teachName: session.teachName,
    branch: session.branchJson ? JSON.parse(session.branchJson) : null,
    expiresAt: session.expiresAt,
    isAdmin: adminSelf || !!impersonating,
    impersonating,
  });
});

app.get("/api/admin/overview", requireAdmin, async (c) => {
  return c.json({ data: await adminOverview(c.env) });
});

app.get("/api/admin/sessions", requireAdmin, async (c) => {
  const limit = Number(c.req.query("limit") || "100");
  return c.json({ data: await adminListSessions(c.env, limit) });
});

app.post("/api/admin/sessions/:id/revoke", requireAdmin, async (c) => {
  const session = c.get("session");
  try {
    await adminRevokeSession(c.env, c.req.param("id"), session);
    return c.json({ ok: true });
  } catch (e) {
    return c.json(
      { error: e instanceof Error ? e.message : "Ошибка" },
      400,
    );
  }
});

/** Enter another user's session (admin only). Revives sealed sessions if expired. */
app.post("/api/admin/sessions/:id/impersonate", requireAdmin, async (c) => {
  const admin = c.get("session");
  const targetId = c.req.param("id");
  if (targetId === admin.id) {
    return c.json({ error: "Уже в этой сессии" }, 400);
  }
  const target = await loadSession(c.env, targetId);
  if (!target) {
    return c.json({ error: "Сессия не найдена" }, 404);
  }

  const days = Number(c.env.SESSION_DAYS || "30");
  if (target.expiresAt <= Date.now()) {
    const refreshed = await refreshOmniSession(c.env, target);
    if (!refreshed) {
      return c.json(
        { error: "Сессия истекла и нет sealed-пароля для входа" },
        404,
      );
    }
    target.expiresAt = Date.now() + days * 86400_000;
    target.lastUsedAt = Date.now();
    await saveSession(c.env, target);
  }

  // Keep original admin if already impersonating
  const existingBackup = await readAdminBackupSessionId(c.env, c.req.raw);
  const backupId =
    existingBackup && (await loadSession(c.env, existingBackup))
      ? existingBackup
      : admin.id;

  await logAuthEvent(c.env, {
    username: target.username,
    ok: true,
    error: `impersonate by ${admin.username}`,
    ip: clientIp(c.req.raw),
    userAgent: c.req.header("User-Agent") || null,
    teachId: target.teachId,
    teachName: target.teachName,
  });

  const backupAdmin =
    backupId === admin.id
      ? admin
      : (await loadSession(c.env, backupId)) || admin;

  return jsonWithCookies(
    c,
    {
      ok: true,
      user: {
        username: target.username,
        teachId: target.teachId,
        teachName: target.teachName,
        branch: target.branchJson ? JSON.parse(target.branchJson) : null,
        expiresAt: target.expiresAt,
        isAdmin: true,
        impersonating: { adminUsername: backupAdmin.username },
      },
    },
    [
      await issueSessionCookie(c.env, target.id, days),
      await issueAdminBackupCookie(c.env, backupId, days),
    ],
  );
});

/** Return from impersonation to admin account. */
app.post("/api/admin/stop-impersonate", requireSession, async (c) => {
  const backupId = await readAdminBackupSessionId(c.env, c.req.raw);
  if (!backupId) {
    return c.json({ error: "Нет режима входа в чужой аккаунт" }, 400);
  }
  const adminSess = await loadSession(c.env, backupId);
  if (!adminSess || !isAdminUser(c.env, adminSess.username)) {
    return jsonWithCookies(
      c,
      { error: "Админ-сессия недоступна" },
      [clearCookie(ADMIN_COOKIE_NAME)],
      403,
    );
  }
  const days = Number(c.env.SESSION_DAYS || "30");
  return jsonWithCookies(c, {
    ok: true,
    user: {
      username: adminSess.username,
      teachId: adminSess.teachId,
      teachName: adminSess.teachName,
      branch: adminSess.branchJson ? JSON.parse(adminSess.branchJson) : null,
      expiresAt: adminSess.expiresAt,
      isAdmin: true,
      impersonating: null,
    },
  }, [
    await issueSessionCookie(c.env, adminSess.id, days),
    clearCookie(ADMIN_COOKIE_NAME),
  ]);
});

app.get("/api/admin/auth-events", requireAdmin, async (c) => {
  const limit = Number(c.req.query("limit") || "100");
  return c.json({ data: await adminListAuthEvents(c.env, limit) });
});

app.get("/api/admin/sync-errors", requireAdmin, async (c) => {
  const limit = Number(c.req.query("limit") || "50");
  return c.json({ data: await adminListSyncErrors(c.env, limit) });
});

app.post("/api/admin/purge-expired", requireAdmin, async (c) => {
  return c.json({ ok: true, ...(await adminPurgeExpired(c.env)) });
});

app.post("/api/admin/clear-cache", requireAdmin, async (c) => {
  return c.json({ ok: true, ...(await adminClearAllCache(c.env)) });
});

app.post("/api/admin/reset-sync-errors", requireAdmin, async (c) => {
  return c.json({ ok: true, ...(await adminResetSyncErrors(c.env)) });
});

app.get("/api/sync/status", requireSession, async (c) => {
  const session = c.get("session");
  const rows = await c.env.DB.prepare(
    `SELECT status, COUNT(*) as n FROM sync_queue WHERE session_id = ? GROUP BY status`,
  )
    .bind(session.id)
    .all<{ status: string; n: number }>();
  return c.json({ counts: rows.results ?? [] });
});

app.post("/api/sync/flush", requireSession, async (c) => {
  const session = c.get("session");
  return c.json(await flushPendingForSession(c.env, session.id));
});

app.post("/api/omni/:name", requireSession, async (c) => {
  const name = c.req.param("name");
  const conf = READS[name];
  if (!conf) return c.json({ error: "unknown endpoint" }, 404);
  const session = c.get("session");
  const body = await c.req.json().catch(() => ({}));
  const cacheKey = conf.cacheKey(body);
  const cached = await cacheGet(c.env, session.id, cacheKey);

  if (name === "cities") {
    try {
      const menu = await withOmniRefresh(
        c.env,
        session,
        (s) => saveSession(c.env, s),
        (s) => fetchCitiesFromHome(c.env.OMNI_ORIGIN, s),
      );
      if (menu.jar !== session.omniCookie) session.omniCookie = menu.jar;
      if (menu.csrf) session.csrfToken = menu.csrf;
      await saveSession(c.env, session);
      await cacheSet(c.env, session.id, "cities", menu.cities);
      return c.json({
        data: menu.cities,
        cached: false,
        updatedAt: Date.now(),
      });
    } catch (e) {
      if (cached) {
        return c.json({
          data: cached.data,
          cached: true,
          stale: true,
          updatedAt: cached.updatedAt,
          warning: e instanceof Error ? e.message : "Omni недоступен",
        });
      }
      return c.json(
        { error: e instanceof Error ? e.message : "Ошибка Omni" },
        502,
      );
    }
  }

  try {
    let getPath = conf.path;
    if (conf.method === "GET" && body && typeof body === "object") {
      const q = new URLSearchParams();
      for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
        if (v == null || v === "") continue;
        q.set(k, String(v));
      }
      const qs = q.toString();
      if (qs) getPath += (getPath.includes("?") ? "&" : "?") + qs;
    }
    const result = await withOmniRefresh(
      c.env,
      session,
      (s) => saveSession(c.env, s),
      (s) =>
        conf.method === "GET"
          ? omniGet(c.env.OMNI_ORIGIN, s, getPath)
          : omniPost(c.env.OMNI_ORIGIN, s, conf.path, body),
    );
    if (result.jar !== session.omniCookie) {
      session.omniCookie = result.jar;
      await saveSession(c.env, session);
    }
    await cacheSet(c.env, session.id, cacheKey, result.data);
    return c.json({
      data: result.data,
      cached: false,
      updatedAt: Date.now(),
    });
  } catch (e) {
    if (cached) {
      return c.json({
        data: cached.data,
        cached: true,
        stale: true,
        updatedAt: cached.updatedAt,
        warning: e instanceof Error ? e.message : "Omni недоступен",
      });
    }
    return c.json(
      { error: e instanceof Error ? e.message : "Ошибка Omni" },
      502,
    );
  }
});

app.post("/api/auth/change-user", requireSession, async (c) => {
  const session = c.get("session");
  const body = await c.req.json<{ id_user: string | number }>();
  try {
    const result = await withOmniRefresh(
      c.env,
      session,
      (s) => saveSession(c.env, s),
      (s) =>
        omniPost(c.env.OMNI_ORIGIN, s, "/auth/change-user", {
          id_user: String(body.id_user),
        }),
    );
    session.omniCookie = result.jar;
    session.teachId = String(body.id_user);
    const list = await cacheGet(c.env, session.id, "teach-list");
    const teach = (
      (list?.data as Array<{ id_teach: string; fio_teach: string }>) || []
    ).find((t) => String(t.id_teach) === String(body.id_user));
    if (teach) session.teachName = teach.fio_teach;
    await cacheClear(c.env, session.id);
    await saveSession(c.env, session);
    return c.json({ ok: true, data: result.data });
  } catch (e) {
    return c.json(
      { error: e instanceof Error ? e.message : "Не удалось сменить" },
      502,
    );
  }
});

app.post("/api/auth/change-city", requireSession, async (c) => {
  const session = c.get("session");
  const body = await c.req.json<{ city: string | number }>();
  if (body.city == null) return c.json({ error: "city required" }, 400);
  try {
    const result = await withOmniRefresh(
      c.env,
      session,
      (s) => saveSession(c.env, s),
      (s) =>
        omniGet(
          c.env.OMNI_ORIGIN,
          s,
          `/auth/change-city?city=${encodeURIComponent(String(body.city))}`,
          true,
        ),
    );
    session.omniCookie = result.jar;
    const csrf = (result.data as { csrf?: string } | null)?.csrf;
    if (csrf) session.csrfToken = csrf;

    try {
      const start = await withOmniRefresh(
        c.env,
        session,
        (s) => saveSession(c.env, s),
        (s) =>
          omniPost<{ branch?: unknown }>(
            c.env.OMNI_ORIGIN,
            s,
            "/auth/get-start-info",
            {},
          ),
      );
      session.omniCookie = start.jar;
      session.branchJson = JSON.stringify(start.data?.branch ?? null);
    } catch {
      /* keep old branch */
    }

    await cacheClear(c.env, session.id);

    try {
      const menu = await withOmniRefresh(
        c.env,
        session,
        (s) => saveSession(c.env, s),
        (s) => fetchCitiesFromHome(c.env.OMNI_ORIGIN, s),
      );
      session.omniCookie = menu.jar;
      if (menu.csrf) session.csrfToken = menu.csrf;
      await cacheSet(c.env, session.id, "cities", menu.cities);
    } catch {
      /* optional */
    }

    await saveSession(c.env, session);
    return c.json({
      ok: true,
      branch: session.branchJson ? JSON.parse(session.branchJson) : null,
    });
  } catch (e) {
    return c.json(
      { error: e instanceof Error ? e.message : "Не удалось сменить филиал" },
      502,
    );
  }
});

/** Custom homework issue (multipart: file + fields) → Omni /presents/new-homework */
app.post("/api/presents/homework", requireSession, async (c) => {
  const session = c.get("session");
  let form: FormData;
  try {
    form = await c.req.formData();
  } catch {
    return c.json({ error: "Ожидается multipart/form-data" }, 400);
  }

  const fileRaw = form.get("file");
  const file =
    fileRaw instanceof File && fileRaw.size > 0 ? fileRaw : null;
  const filenameUrl = String(form.get("filenameUrl") || "").trim() || null;
  const recommendedMaterialId =
    String(form.get("recommended_material") || "").trim() || null;
  const recommendedJson =
    String(form.get("recommended") || "").trim() || null;

  try {
    const result = await withOmniRefresh(
      c.env,
      session,
      (s) => saveSession(c.env, s),
      (s) =>
        issueOmniHomework(c.env.OMNI_ORIGIN, s, {
          descr: String(form.get("descr") ?? ""),
          lenta: String(form.get("lenta") ?? ""),
          date: String(form.get("date") ?? ""),
          group: String(form.get("group") ?? ""),
          spec: String(form.get("spec") ?? "") || null,
          source: String(form.get("source") ?? "") || null,
          id_base_spec: String(form.get("id_base_spec") ?? "") || null,
          dz_theme: String(form.get("dz_theme") ?? ""),
          deadline: String(form.get("deadline") ?? "0") || "0",
          type: String(form.get("type") ?? "0") || "0",
          filenameUrl,
          recommendedJson,
          recommendedMaterialId,
          file,
        }),
    );
    if (result.jar !== session.omniCookie) {
      session.omniCookie = result.jar;
      await saveSession(c.env, session);
    }
    await cacheClear(c.env, session.id);
    return c.json({
      ok: true,
      data: result.data,
      message:
        result.data &&
        typeof result.data === "object" &&
        "success" in (result.data as object)
          ? String((result.data as { success?: string }).success || "ДЗ выдано")
          : "ДЗ выдано",
    });
  } catch (e) {
    return c.json(
      { error: e instanceof Error ? e.message : "Не удалось выдать ДЗ" },
      502,
    );
  }
});

app.post("/api/mutate/:name", requireSession, async (c) => {
  const name = c.req.param("name");
  const conf = MUTATIONS[name];
  if (!conf) return c.json({ error: "unknown mutation" }, 404);
  const session = c.get("session");
  const body = await c.req.json();
  const queueId = await enqueueMutation(c.env, session.id, conf.kind, body);

  let omniResult: unknown = null;
  let synced = false;
  try {
    const flush = await flushPendingForSession(c.env, session.id);
    synced = flush.flushed > 0;
    const cached = await cacheGet(c.env, session.id, `sync:${queueId}:result`);
    omniResult = cached?.data ?? null;
  } catch {
    synced = false;
  }

  return c.json({
    ok: true,
    queueId,
    synced,
    omni: omniResult,
    message: synced ? "Сохранено" : "В очереди",
  });
});

export default {
  fetch: app.fetch,
  async scheduled(_event: ScheduledEvent, env: OmniEnv, ctx: ExecutionContext) {
    ctx.waitUntil(
      (async () => {
        const pending = await env.DB.prepare(
          `SELECT DISTINCT session_id FROM sync_queue WHERE status IN ('pending','error') LIMIT 50`,
        ).all<{ session_id: string }>();
        for (const row of pending.results ?? []) {
          await flushPendingForSession(env, row.session_id);
        }
        await verifyDue(env);
      })(),
    );
  },
};
