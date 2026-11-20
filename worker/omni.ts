export type OmniEnv = {
  OMNI_ORIGIN: string;
  SESSION_SECRET: string;
  SESSION_DAYS?: string;
  /** Comma-separated Omni usernames with admin access (no passwords logged). */
  ADMIN_USERNAMES?: string;
  DB: D1Database;
  SESSIONS: KVNamespace;
  ASSETS: Fetcher;
};

export type OmniSession = {
  id: string;
  username: string;
  omniCookie: string;
  csrfToken?: string;
  idLocalHash?: string;
  teachId?: string;
  teachName?: string;
  branchJson?: string;
  /** AES-GCM sealed Omni password for silent re-login */
  passwordEnc?: string;
  createdAt: number;
  expiresAt: number;
  lastUsedAt: number;
};

export class OmniAuthError extends Error {
  constructor(message = "Сессия Omni истекла") {
    super(message);
    this.name = "OmniAuthError";
  }
}

export function isOmniAuthFailure(
  status: number,
  data: unknown,
  text = "",
): boolean {
  if (status === 301 || status === 302 || status === 401 || status === 403) {
    return true;
  }
  if (
    text &&
    /<\s*html/i.test(text) &&
    (/LoginForm/i.test(text) || /\/login\/index/i.test(text))
  ) {
    return true;
  }
  if (data && typeof data === "object") {
    const msg = String(
      (data as { error?: unknown; message?: unknown }).error ??
        (data as { message?: unknown }).message ??
        "",
    );
    if (/не\s*авторизован|unauthorized|истек|session expired|войдите/i.test(msg)) {
      return true;
    }
  }
  return false;
}

function cookieHeader(jar: string) {
  return jar;
}

export async function bootstrapOmni(origin: string) {
  const res = await fetch(`${origin}/login/index`, {
    redirect: "follow",
    headers: { "User-Agent": "OmniFast/1.0" },
  });
  const setCookie = res.headers.getSetCookie?.() ?? [];
  // fallback for runtimes without getSetCookie
  const single = res.headers.get("set-cookie");
  const cookies = setCookie.length ? setCookie : single ? [single] : [];
  const jar = cookies
    .map((c) => c.split(";")[0])
    .filter(Boolean)
    .join("; ");
  const html = await res.text();
  const csrf = html.match(/csrf-token" content="([^"]+)"/)?.[1] ?? "";
  return { jar, csrf };
}

export async function omniLogin(
  origin: string,
  username: string,
  password: string,
) {
  const boot = await bootstrapOmni(origin);
  const res = await fetch(`${origin}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json;charset=UTF-8",
      "X-CSRF-Token": boot.csrf,
      "X-Requested-With": "XMLHttpRequest",
      Origin: origin,
      Referer: `${origin}/login/index`,
      Cookie: boot.jar,
      "User-Agent": "OmniFast/1.0",
    },
    body: JSON.stringify({ LoginForm: { username, password } }),
    redirect: "manual",
  });
  const setCookie = res.headers.getSetCookie?.() ?? [];
  const single = res.headers.get("set-cookie");
  const more = setCookie.length ? setCookie : single ? [single] : [];
  const jarMap = new Map<string, string>();
  for (const part of boot.jar.split("; ").filter(Boolean)) {
    const i = part.indexOf("=");
    if (i > 0) jarMap.set(part.slice(0, i), part.slice(i + 1));
  }
  for (const c of more) {
    const kv = c.split(";")[0];
    const i = kv.indexOf("=");
    if (i > 0) jarMap.set(kv.slice(0, i), kv.slice(i + 1));
  }
  const jar = [...jarMap.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  const data = (await res.json()) as {
    success?: boolean;
    IdLocalHash?: string;
    error?: unknown;
  };
  if (!data.success) {
    throw new Error("Неверный логин или пароль");
  }
  // refresh csrf from home
  const home = await fetch(`${origin}/`, {
    headers: { Cookie: jar, "User-Agent": "OmniFast/1.0" },
  });
  const homeHtml = await home.text();
  const csrf = homeHtml.match(/csrf-token" content="([^"]+)"/)?.[1] ?? boot.csrf;
  return { jar, csrf, idLocalHash: data.IdLocalHash };
}

function mergeJar(existing: string, setCookie: string[]) {
  const jarMap = new Map<string, string>();
  for (const part of existing.split("; ").filter(Boolean)) {
    const i = part.indexOf("=");
    if (i > 0) jarMap.set(part.slice(0, i), part.slice(i + 1));
  }
  for (const c of setCookie) {
    const kv = c.split(";")[0];
    const i = kv.indexOf("=");
    if (i > 0) jarMap.set(kv.slice(0, i), kv.slice(i + 1));
  }
  return [...jarMap.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

function commonHeaders(
  origin: string,
  session: OmniSession,
  extra: Record<string, string> = {},
) {
  return {
    "X-CSRF-Token": session.csrfToken || "",
    "X-Requested-With": "XMLHttpRequest",
    Origin: origin,
    Referer: `${origin}/`,
    Cookie: cookieHeader(session.omniCookie),
    "User-Agent": "OmniFast/1.0",
    ...(session.idLocalHash ? { "Id-Local-Hash": session.idLocalHash } : {}),
    ...extra,
  };
}

async function parseOmniResponse<T>(
  res: Response,
  session: OmniSession,
): Promise<{ status: number; data: T; jar: string }> {
  const setCookie = res.headers.getSetCookie?.() ?? [];
  const jar = setCookie.length
    ? mergeJar(session.omniCookie, setCookie)
    : session.omniCookie;

  const text = await res.text();
  let data: T;
  try {
    data = text ? (JSON.parse(text) as T) : (null as T);
  } catch {
    data = text as unknown as T;
  }

  if (isOmniAuthFailure(res.status, data, text)) {
    throw new OmniAuthError();
  }

  return { status: res.status, data, jar };
}

export async function omniPost<T = unknown>(
  origin: string,
  session: OmniSession,
  path: string,
  body: unknown = {},
  extraHeaders: Record<string, string> = {},
): Promise<{ status: number; data: T; jar: string }> {
  const res = await fetch(`${origin}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json;charset=UTF-8",
      ...commonHeaders(origin, session, extraHeaders),
    },
    body: JSON.stringify(body ?? {}),
    redirect: "manual",
  });
  return parseOmniResponse<T>(res, session);
}

/** Multipart/form Omni POST (no forced Content-Type — browser/fetch sets boundary). */
export async function omniPostForm<T = unknown>(
  origin: string,
  session: OmniSession,
  path: string,
  form: FormData,
): Promise<{ status: number; data: T; jar: string }> {
  const res = await fetch(`${origin}${path}`, {
    method: "POST",
    headers: commonHeaders(origin, session),
    body: form,
    redirect: "manual",
  });
  return parseOmniResponse<T>(res, session);
}

export type OmniCity = {
  id: string;
  id_city: string;
  name: string;
};

/** City switcher is server-rendered in Omni toolbar, not via get-city. */
export async function fetchCitiesFromHome(
  origin: string,
  session: OmniSession,
): Promise<{ cities: OmniCity[]; jar: string; csrf?: string }> {
  const res = await fetch(`${origin}/`, {
    headers: commonHeaders(origin, session),
    redirect: "follow",
  });
  const setCookie = res.headers.getSetCookie?.() ?? [];
  const jar = setCookie.length
    ? mergeJar(session.omniCookie, setCookie)
    : session.omniCookie;
  const html = await res.text();
  if (isOmniAuthFailure(res.status, null, html) || /\/login\/index/i.test(res.url)) {
    throw new OmniAuthError();
  }
  const csrf = html.match(/csrf-token" content="([^"]+)"/)?.[1];
  const cities: OmniCity[] = [];
  const seen = new Set<string>();
  const re =
    /changeCity\((\d+)\)[\s\S]*?>([\s\S]*?)<\/md-button>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const id_city = m[1];
    const name = m[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    if (!id_city || seen.has(id_city)) continue;
    seen.add(id_city);
    cities.push({ id: id_city, id_city, name: name || `Филиал ${id_city}` });
  }
  if (!cities.length) {
    const branch = session.branchJson
      ? (JSON.parse(session.branchJson) as {
          id_city?: number | string;
          name?: string;
        })
      : null;
    if (branch?.id_city) {
      cities.push({
        id: String(branch.id_city),
        id_city: String(branch.id_city),
        name: branch.name || String(branch.id_city),
      });
    }
  }
  return { cities, jar, csrf };
}

export async function omniGet<T = unknown>(
  origin: string,
  session: OmniSession,
  path: string,
  allowRedirect = false,
): Promise<{ status: number; data: T; jar: string }> {
  const res = await fetch(`${origin}${path}`, {
    method: "GET",
    headers: commonHeaders(origin, session),
    redirect: "manual",
  });

  const setCookie = res.headers.getSetCookie?.() ?? [];
  let jar = setCookie.length
    ? mergeJar(session.omniCookie, setCookie)
    : session.omniCookie;

  if (allowRedirect && (res.status === 302 || res.status === 301)) {
    const loc = res.headers.get("location");
    if (loc) {
      const follow = await fetch(loc.startsWith("http") ? loc : `${origin}${loc}`, {
        headers: {
          ...commonHeaders(origin, { ...session, omniCookie: jar }),
        },
        redirect: "manual",
      });
      const more = follow.headers.getSetCookie?.() ?? [];
      if (more.length) jar = mergeJar(jar, more);
      const html = await follow.text();
      const csrf = html.match(/csrf-token" content="([^"]+)"/)?.[1];
      return {
        status: follow.status,
        data: { ok: true, csrf } as T,
        jar,
      };
    }
  }

  const text = await res.text();
  let data: T;
  try {
    data = text ? (JSON.parse(text) as T) : (null as T);
  } catch {
    data = text as unknown as T;
  }

  if (!allowRedirect && isOmniAuthFailure(res.status, data, text)) {
    throw new OmniAuthError();
  }

  return { status: res.status, data, jar };
}

async function aesKey(secret: string) {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`omni-fast-cred:${secret}`),
  );
  return crypto.subtle.importKey("raw", hash, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

function b64urlEncode(buf: ArrayBuffer | Uint8Array) {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string) {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function sealPassword(secret: string, password: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await aesKey(secret);
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(password),
  );
  return `${b64urlEncode(iv)}.${b64urlEncode(ct)}`;
}

export async function openPassword(secret: string, sealed: string) {
  try {
    const [ivPart, ctPart] = sealed.split(".");
    if (!ivPart || !ctPart) return null;
    const key = await aesKey(secret);
    const pt = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: b64urlDecode(ivPart) },
      key,
      b64urlDecode(ctPart),
    );
    return new TextDecoder().decode(pt);
  } catch {
    return null;
  }
}

/** Re-login to Omni using sealed password and refresh cookies/csrf on session. */
export async function refreshOmniSession(
  env: OmniEnv,
  session: OmniSession,
): Promise<boolean> {
  if (!session.passwordEnc) return false;
  const password = await openPassword(
    env.SESSION_SECRET || "dev-secret",
    session.passwordEnc,
  );
  if (!password) return false;
  try {
    const login = await omniLogin(env.OMNI_ORIGIN, session.username, password);
    session.omniCookie = login.jar;
    session.csrfToken = login.csrf;
    if (login.idLocalHash) session.idLocalHash = login.idLocalHash;
    session.lastUsedAt = Date.now();
    return true;
  } catch {
    return false;
  }
}

/** Run Omni call; on auth failure re-login once and retry. */
export async function withOmniRefresh<T>(
  env: OmniEnv,
  session: OmniSession,
  save: (s: OmniSession) => Promise<void>,
  run: (s: OmniSession) => Promise<T>,
): Promise<T> {
  try {
    return await run(session);
  } catch (e) {
    const auth =
      e instanceof OmniAuthError ||
      (e instanceof Error && /Сессия Omni истекла/i.test(e.message));
    if (!auth) throw e;
    const ok = await refreshOmniSession(env, session);
    if (!ok) {
      throw new OmniAuthError(
        "Сессия Omni истекла — войдите снова",
      );
    }
    await save(session);
    return await run(session);
  }
}
