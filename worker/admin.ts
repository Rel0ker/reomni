import type { OmniEnv, OmniSession } from "./omni";
import { newId } from "./session";

export function isAdminUser(env: OmniEnv, username: string): boolean {
  const raw = (env.ADMIN_USERNAMES || "").trim();
  if (!raw) return false;
  const want = username.trim().toLowerCase();
  return raw
    .split(/[,;\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .includes(want);
}

export async function logAuthEvent(
  env: OmniEnv,
  args: {
    username: string;
    ok: boolean;
    error?: string;
    ip?: string | null;
    userAgent?: string | null;
    teachId?: string | null;
    teachName?: string | null;
  },
) {
  try {
    await env.DB.prepare(
      `INSERT INTO auth_events
        (id, username, ok, error_message, ip, user_agent, teach_id, teach_name, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        newId(),
        args.username,
        args.ok ? 1 : 0,
        args.error ?? null,
        args.ip ?? null,
        args.userAgent ?? null,
        args.teachId ?? null,
        args.teachName ?? null,
        Date.now(),
      )
      .run();
  } catch {
    /* best-effort */
  }
}

export async function adminOverview(env: OmniEnv) {
  const now = Date.now();
  const dayAgo = now - 86400_000;

  const [
    sessionsActive,
    sessionsTotal,
    cacheRows,
    syncRows,
    authOk,
    authFail,
    authRecent,
  ] = await Promise.all([
    env.DB.prepare(
      `SELECT COUNT(*) AS n FROM sessions WHERE expires_at > ?`,
    )
      .bind(now)
      .first<{ n: number }>(),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM sessions`).first<{ n: number }>(),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM cache_entries`).first<{
      n: number;
    }>(),
    env.DB.prepare(
      `SELECT status, COUNT(*) AS n FROM sync_queue GROUP BY status`,
    ).all<{ status: string; n: number }>(),
    env.DB.prepare(
      `SELECT COUNT(*) AS n FROM auth_events WHERE ok = 1 AND created_at >= ?`,
    )
      .bind(dayAgo)
      .first<{ n: number }>(),
    env.DB.prepare(
      `SELECT COUNT(*) AS n FROM auth_events WHERE ok = 0 AND created_at >= ?`,
    )
      .bind(dayAgo)
      .first<{ n: number }>(),
    env.DB.prepare(
      `SELECT COUNT(*) AS n FROM auth_events WHERE created_at >= ?`,
    )
      .bind(dayAgo)
      .first<{ n: number }>(),
  ]);

  const sync: Record<string, number> = {};
  for (const row of syncRows.results ?? []) {
    sync[row.status] = Number(row.n) || 0;
  }

  return {
    sessionsActive: Number(sessionsActive?.n) || 0,
    sessionsTotal: Number(sessionsTotal?.n) || 0,
    cacheEntries: Number(cacheRows?.n) || 0,
    sync,
    auth24h: {
      total: Number(authRecent?.n) || 0,
      ok: Number(authOk?.n) || 0,
      fail: Number(authFail?.n) || 0,
    },
  };
}

export async function adminListSessions(env: OmniEnv, limit = 100) {
  const rows = await env.DB.prepare(
    `SELECT id, username, teach_id, teach_name, branch_json,
            created_at, expires_at, last_used_at,
            CASE WHEN password_enc IS NOT NULL AND password_enc != '' THEN 1 ELSE 0 END AS has_sealed_password
     FROM sessions
     ORDER BY last_used_at DESC
     LIMIT ?`,
  )
    .bind(Math.min(300, Math.max(1, limit)))
    .all<{
      id: string;
      username: string;
      teach_id: string | null;
      teach_name: string | null;
      branch_json: string | null;
      created_at: number;
      expires_at: number;
      last_used_at: number;
      has_sealed_password: number;
    }>();

  return (rows.results ?? []).map((r) => {
    let branch: unknown = null;
    try {
      branch = r.branch_json ? JSON.parse(r.branch_json) : null;
    } catch {
      branch = null;
    }
    return {
      id: r.id,
      username: r.username,
      teachId: r.teach_id,
      teachName: r.teach_name,
      branch,
      createdAt: r.created_at,
      expiresAt: r.expires_at,
      lastUsedAt: r.last_used_at,
      hasSealedPassword: !!r.has_sealed_password,
      active: r.expires_at > Date.now(),
    };
  });
}

export async function adminRevokeSession(
  env: OmniEnv,
  sessionId: string,
  actor: OmniSession,
) {
  if (sessionId === actor.id) {
    throw new Error("Нельзя удалить свою текущую сессию");
  }
  await env.DB.prepare(`DELETE FROM sessions WHERE id = ?`)
    .bind(sessionId)
    .run();
  await env.DB.prepare(`DELETE FROM cache_entries WHERE session_id = ?`)
    .bind(sessionId)
    .run();
  await env.SESSIONS.delete(`sess:${sessionId}`);
}

export async function adminListAuthEvents(env: OmniEnv, limit = 100) {
  const rows = await env.DB.prepare(
    `SELECT id, username, ok, error_message, ip, user_agent, teach_id, teach_name, created_at
     FROM auth_events
     ORDER BY created_at DESC
     LIMIT ?`,
  )
    .bind(Math.min(500, Math.max(1, limit)))
    .all<{
      id: string;
      username: string;
      ok: number;
      error_message: string | null;
      ip: string | null;
      user_agent: string | null;
      teach_id: string | null;
      teach_name: string | null;
      created_at: number;
    }>();

  return (rows.results ?? []).map((r) => ({
    id: r.id,
    username: r.username,
    ok: !!r.ok,
    error: r.error_message,
    ip: r.ip,
    userAgent: r.user_agent,
    teachId: r.teach_id,
    teachName: r.teach_name,
    createdAt: r.created_at,
  }));
}

export async function adminListSyncErrors(env: OmniEnv, limit = 50) {
  const rows = await env.DB.prepare(
    `SELECT id, session_id, kind, status, attempts, last_error, created_at, synced_at
     FROM sync_queue
     WHERE status = 'error'
     ORDER BY created_at DESC
     LIMIT ?`,
  )
    .bind(Math.min(200, Math.max(1, limit)))
    .all<{
      id: string;
      session_id: string;
      kind: string;
      status: string;
      attempts: number;
      last_error: string | null;
      created_at: number;
      synced_at: number | null;
    }>();

  return rows.results ?? [];
}

export async function adminPurgeExpired(env: OmniEnv) {
  const now = Date.now();
  const expired = await env.DB.prepare(
    `SELECT id FROM sessions WHERE expires_at <= ?`,
  )
    .bind(now)
    .all<{ id: string }>();
  const ids = (expired.results ?? []).map((r) => r.id);
  for (const id of ids) {
    await env.SESSIONS.delete(`sess:${id}`);
  }
  const sess = await env.DB.prepare(
    `DELETE FROM sessions WHERE expires_at <= ?`,
  )
    .bind(now)
    .run();
  const cache = await env.DB.prepare(
    `DELETE FROM cache_entries WHERE session_id NOT IN (SELECT id FROM sessions)`,
  ).run();
  const oldAuth = await env.DB.prepare(
    `DELETE FROM auth_events WHERE created_at < ?`,
  )
    .bind(now - 30 * 86400_000)
    .run();

  return {
    sessions: sess.meta.changes ?? ids.length,
    cacheOrphans: cache.meta.changes ?? 0,
    authEvents: oldAuth.meta.changes ?? 0,
  };
}

export async function adminClearAllCache(env: OmniEnv) {
  const res = await env.DB.prepare(`DELETE FROM cache_entries`).run();
  return { cleared: res.meta.changes ?? 0 };
}

export async function adminResetSyncErrors(env: OmniEnv) {
  const res = await env.DB.prepare(
    `UPDATE sync_queue SET status = 'pending', last_error = NULL WHERE status = 'error'`,
  ).run();
  return { reset: res.meta.changes ?? 0 };
}
