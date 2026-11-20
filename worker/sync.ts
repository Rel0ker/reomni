import { MUTATIONS } from "./endpoints";
import {
  omniPost,
  withOmniRefresh,
  type OmniEnv,
  type OmniSession,
} from "./omni";
import { loadSession, saveSession } from "./session";

const TWO_HOURS = 2 * 60 * 60 * 1000;

export async function enqueueMutation(
  env: OmniEnv,
  sessionId: string,
  kind: string,
  payload: unknown,
) {
  const id = crypto.randomUUID();
  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO sync_queue (id, session_id, kind, payload, status, attempts, created_at, verify_at, verify_status)
     VALUES (?, ?, ?, ?, 'pending', 0, ?, ?, NULL)`,
  )
    .bind(id, sessionId, kind, JSON.stringify(payload), now, now + TWO_HOURS)
    .run();
  return id;
}

export async function cacheGet(env: OmniEnv, sessionId: string, key: string) {
  const row = await env.DB.prepare(
    `SELECT payload, updated_at FROM cache_entries WHERE session_id = ? AND cache_key = ?`,
  )
    .bind(sessionId, key)
    .first<{ payload: string; updated_at: number }>();
  if (!row) return null;
  return { data: JSON.parse(row.payload), updatedAt: row.updated_at };
}

export async function cacheSet(
  env: OmniEnv,
  sessionId: string,
  key: string,
  data: unknown,
) {
  await env.DB.prepare(
    `INSERT OR REPLACE INTO cache_entries (session_id, cache_key, payload, updated_at)
     VALUES (?, ?, ?, ?)`,
  )
    .bind(sessionId, key, JSON.stringify(data), Date.now())
    .run();
}

export async function cacheClear(env: OmniEnv, sessionId: string) {
  await env.DB.prepare(`DELETE FROM cache_entries WHERE session_id = ?`)
    .bind(sessionId)
    .run();
}

async function applyMutation(
  env: OmniEnv,
  session: OmniSession,
  kind: string,
  payload: unknown,
) {
  const entry = Object.values(MUTATIONS).find((m) => m.kind === kind);
  if (!entry) throw new Error(`Unknown mutation kind: ${kind}`);
  const result = await withOmniRefresh(
    env,
    session,
    (s) => saveSession(env, s),
    (s) => omniPost(env.OMNI_ORIGIN, s, entry.path, payload),
  );
  if (result.jar !== session.omniCookie) {
    session.omniCookie = result.jar;
    await saveSession(env, session);
  }
  return result.data;
}

export async function flushPendingForSession(env: OmniEnv, sessionId: string) {
  const session = await loadSession(env, sessionId);
  if (!session) return { flushed: 0 };
  const rows = await env.DB.prepare(
    `SELECT id, kind, payload, attempts FROM sync_queue
     WHERE session_id = ? AND status IN ('pending', 'error')
     ORDER BY created_at ASC LIMIT 20`,
  )
    .bind(sessionId)
    .all<{ id: string; kind: string; payload: string; attempts: number }>();

  let flushed = 0;
  for (const row of rows.results ?? []) {
    try {
      const data = await applyMutation(
        env,
        session,
        row.kind,
        JSON.parse(row.payload),
      );
      await env.DB.prepare(
        `UPDATE sync_queue SET status = 'synced', synced_at = ?, attempts = attempts + 1, last_error = NULL, verify_at = ?
         WHERE id = ?`,
      )
        .bind(Date.now(), Date.now() + TWO_HOURS, row.id)
        .run();
      flushed++;
      await cacheSet(env, sessionId, `sync:${row.id}:result`, data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await env.DB.prepare(
        `UPDATE sync_queue SET status = 'error', attempts = attempts + 1, last_error = ? WHERE id = ?`,
      )
        .bind(msg, row.id)
        .run();
    }
  }
  return { flushed };
}

export async function verifyDue(env: OmniEnv) {
  const now = Date.now();
  const rows = await env.DB.prepare(
    `SELECT id, session_id, kind, payload FROM sync_queue
     WHERE status = 'synced' AND (verify_status IS NULL OR verify_status = 'retry')
       AND verify_at IS NOT NULL AND verify_at <= ?
     ORDER BY verify_at ASC LIMIT 30`,
  )
    .bind(now)
    .all<{ id: string; session_id: string; kind: string; payload: string }>();

  let verified = 0;
  for (const row of rows.results ?? []) {
    const session = await loadSession(env, row.session_id);
    if (!session) {
      await env.DB.prepare(
        `UPDATE sync_queue SET verify_status = 'skipped', verified_at = ? WHERE id = ?`,
      )
        .bind(now, row.id)
        .run();
      continue;
    }
    try {
      await applyMutation(env, session, row.kind, JSON.parse(row.payload));
      await env.DB.prepare(
        `UPDATE sync_queue SET verify_status = 'ok', verified_at = ? WHERE id = ?`,
      )
        .bind(now, row.id)
        .run();
      verified++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await env.DB.prepare(
        `UPDATE sync_queue SET verify_status = 'retry', verify_at = ?, last_error = ? WHERE id = ?`,
      )
        .bind(now + TWO_HOURS, msg, row.id)
        .run();
    }
  }
  return { verified };
}
