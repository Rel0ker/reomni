import type { OmniEnv, OmniSession } from "./omni";

const COOKIE_NAME = "omni_fast_sid";
/** Backup of admin session while impersonating another account */
const ADMIN_COOKIE_NAME = "omni_fast_admin_sid";

function b64url(buf: ArrayBuffer | Uint8Array) {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(secret: string, data: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
}

export function parseCookies(header: string | null) {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

async function signedCookieValue(
  env: OmniEnv,
  sessionId: string,
  maxAgeDays: number,
) {
  const exp = Math.floor(Date.now() / 1000) + maxAgeDays * 86400;
  const payload = `${sessionId}.${exp}`;
  const sig = b64url(await hmac(env.SESSION_SECRET || "dev-secret", payload));
  return { value: `${payload}.${sig}`, maxAge: maxAgeDays * 86400 };
}

function cookieHeader(name: string, value: string, maxAge: number) {
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearCookie(name: string) {
  return `${name}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export async function issueSessionCookie(
  env: OmniEnv,
  sessionId: string,
  maxAgeDays: number,
) {
  const { value, maxAge } = await signedCookieValue(env, sessionId, maxAgeDays);
  return cookieHeader(COOKIE_NAME, value, maxAge);
}

export async function issueAdminBackupCookie(
  env: OmniEnv,
  sessionId: string,
  maxAgeDays: number,
) {
  const { value, maxAge } = await signedCookieValue(env, sessionId, maxAgeDays);
  return cookieHeader(ADMIN_COOKIE_NAME, value, maxAge);
}

async function readSignedSessionId(
  env: OmniEnv,
  request: Request,
  cookieName: string,
) {
  const raw = parseCookies(request.headers.get("Cookie"))[cookieName];
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length !== 3) return null;
  const [id, expStr, sig] = parts;
  const exp = Number(expStr);
  if (!id || !exp || exp * 1000 < Date.now()) return null;
  const payload = `${id}.${expStr}`;
  const expect = b64url(await hmac(env.SESSION_SECRET || "dev-secret", payload));
  if (expect !== sig) return null;
  return id;
}

export async function readSessionId(env: OmniEnv, request: Request) {
  return readSignedSessionId(env, request, COOKIE_NAME);
}

export async function readAdminBackupSessionId(env: OmniEnv, request: Request) {
  return readSignedSessionId(env, request, ADMIN_COOKIE_NAME);
}

export { ADMIN_COOKIE_NAME, COOKIE_NAME };

export async function saveSession(env: OmniEnv, session: OmniSession) {
  await env.DB.prepare(
    `INSERT OR REPLACE INTO sessions
      (id, username, omni_cookie, csrf_token, id_local_hash, teach_id, teach_name, branch_json, password_enc, created_at, expires_at, last_used_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      session.id,
      session.username,
      session.omniCookie,
      session.csrfToken ?? null,
      session.idLocalHash ?? null,
      session.teachId ?? null,
      session.teachName ?? null,
      session.branchJson ?? null,
      session.passwordEnc ?? null,
      session.createdAt,
      session.expiresAt,
      session.lastUsedAt,
    )
    .run();
  await env.SESSIONS.put(`sess:${session.id}`, JSON.stringify(session), {
    expirationTtl: Math.max(60, Math.floor((session.expiresAt - Date.now()) / 1000)),
  });
}

export async function loadSession(
  env: OmniEnv,
  id: string,
): Promise<OmniSession | null> {
  const cached = await env.SESSIONS.get(`sess:${id}`, "json");
  if (cached) return cached as OmniSession;
  const row = await env.DB.prepare(`SELECT * FROM sessions WHERE id = ?`)
    .bind(id)
    .first<{
      id: string;
      username: string;
      omni_cookie: string;
      csrf_token: string | null;
      id_local_hash: string | null;
      teach_id: string | null;
      teach_name: string | null;
      branch_json: string | null;
      password_enc: string | null;
      created_at: number;
      expires_at: number;
      last_used_at: number;
    }>();
  if (!row) return null;
  if (row.expires_at < Date.now()) return null;
  const session: OmniSession = {
    id: row.id,
    username: row.username,
    omniCookie: row.omni_cookie,
    csrfToken: row.csrf_token ?? undefined,
    idLocalHash: row.id_local_hash ?? undefined,
    teachId: row.teach_id ?? undefined,
    teachName: row.teach_name ?? undefined,
    branchJson: row.branch_json ?? undefined,
    passwordEnc: row.password_enc ?? undefined,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    lastUsedAt: row.last_used_at,
  };
  await env.SESSIONS.put(`sess:${id}`, JSON.stringify(session), {
    expirationTtl: Math.max(60, Math.floor((session.expiresAt - Date.now()) / 1000)),
  });
  return session;
}

export async function touchSession(env: OmniEnv, session: OmniSession) {
  session.lastUsedAt = Date.now();
  // sliding expiry: keep long-lived
  const days = Number(env.SESSION_DAYS || "30");
  session.expiresAt = Date.now() + days * 86400_000;
  await saveSession(env, session);
}

export function newId() {
  return crypto.randomUUID();
}
