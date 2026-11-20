import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { api, type Me } from "../lib/api";
import { PageBrand } from "../components/PageBrand";

type Tab = "overview" | "sessions" | "auth" | "sync" | "feedback";

function fmt(ts?: number | null) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString("ru-RU");
  } catch {
    return String(ts);
  }
}

export function AdminPage({
  me,
  onToast,
  onRefreshMe,
}: {
  me: Me;
  onToast: (t: string, tone?: "good" | "bad" | "neutral") => void;
  onRefreshMe?: () => Promise<void>;
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [overview, setOverview] = useState<Awaited<
    ReturnType<typeof api.adminOverview>
  >["data"] | null>(null);
  const [sessions, setSessions] = useState<
    Awaited<ReturnType<typeof api.adminSessions>>["data"]
  >([]);
  const [authEvents, setAuthEvents] = useState<
    Awaited<ReturnType<typeof api.adminAuthEvents>>["data"]
  >([]);
  const [syncErrors, setSyncErrors] = useState<
    Awaited<ReturnType<typeof api.adminSyncErrors>>["data"]
  >([]);
  const [feedback, setFeedback] = useState<
    Awaited<ReturnType<typeof api.adminFeedback>>["data"]
  >([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === "overview") {
        const r = await api.adminOverview();
        setOverview(r.data);
      } else if (tab === "sessions") {
        const r = await api.adminSessions(120);
        setSessions(r.data);
      } else if (tab === "auth") {
        const r = await api.adminAuthEvents(150);
        setAuthEvents(r.data);
      } else if (tab === "feedback") {
        const r = await api.adminFeedback(100);
        setFeedback(r.data);
      } else {
        const r = await api.adminSyncErrors(80);
        setSyncErrors(r.data);
      }
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Ошибка админки", "bad");
    } finally {
      setLoading(false);
    }
  }, [tab, onToast]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!me.isAdmin) {
    return <Navigate to="/" replace />;
  }

  async function run(
    label: string,
    fn: () => Promise<unknown>,
  ) {
    setBusy(true);
    try {
      await fn();
      onToast(label, "good");
      await refresh();
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Ошибка", "bad");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-shell admin-page">
      <PageBrand k="nav.admin" />
      <div className="mute tiny">
        Без паролей · доступ: {me.username}
      </div>

      <div className="admin-tabs">
        {(
          [
            ["overview", "Обзор"],
            ["sessions", "Сессии"],
            ["auth", "Входы"],
            ["sync", "Синк"],
            ["feedback", "Фидбек"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`admin-tab ${tab === id ? "on" : ""}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? <div className="skeleton" /> : null}

      {!loading && tab === "overview" && overview ? (
        <div className="admin-stack">
          <div className="admin-stat-grid">
            <div className="admin-stat">
              <div className="n">{overview.sessionsActive}</div>
              <div className="l">активные сессии</div>
            </div>
            <div className="admin-stat">
              <div className="n">{overview.sessionsTotal}</div>
              <div className="l">всего сессий</div>
            </div>
            <div className="admin-stat">
              <div className="n">{overview.cacheEntries}</div>
              <div className="l">кэш</div>
            </div>
            <div className="admin-stat">
              <div className="n">{overview.auth24h.ok}</div>
              <div className="l">входы 24ч</div>
            </div>
            <div className="admin-stat">
              <div className="n">{overview.auth24h.fail}</div>
              <div className="l">фейлы 24ч</div>
            </div>
            <div className="admin-stat">
              <div className="n">{overview.sync.pending || 0}</div>
              <div className="l">sync pending</div>
            </div>
            <div className="admin-stat">
              <div className="n">{overview.sync.error || 0}</div>
              <div className="l">sync error</div>
            </div>
          </div>

          <div className="admin-actions">
            <button
              type="button"
              className="ghost-btn"
              disabled={busy}
              onClick={() =>
                void run("Кэш очищен", () => api.adminClearCache())
              }
            >
              Очистить кэш
            </button>
            <button
              type="button"
              className="ghost-btn"
              disabled={busy}
              onClick={() =>
                void run("Просроченное удалено", () => api.adminPurgeExpired())
              }
            >
              Удалить просроченное
            </button>
            <button
              type="button"
              className="ghost-btn"
              disabled={busy}
              onClick={() =>
                void run("Ошибки синка в очередь", () =>
                  api.adminResetSyncErrors(),
                )
              }
            >
              Retry sync errors
            </button>
          </div>
        </div>
      ) : null}

      {!loading && tab === "sessions" ? (
        <div className="admin-list">
          {sessions.length === 0 ? (
            <div className="empty">Нет сессий</div>
          ) : (
            sessions.map((s) => (
              <div className="admin-row" key={s.id}>
                <div>
                  <div className="student-name">{s.username}</div>
                  <div className="mute tiny">
                    {[
                      s.teachName,
                      s.branch &&
                      typeof s.branch === "object" &&
                      "name" in s.branch
                        ? String((s.branch as { name?: string }).name || "")
                        : "",
                      s.active ? "активна" : "истекла",
                      s.hasSealedPassword ? "sealed pwd" : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                  <div className="mute tiny">
                    last {fmt(s.lastUsedAt)} · exp {fmt(s.expiresAt)}
                  </div>
                </div>
                <div className="admin-row-actions">
                  {s.active || s.hasSealedPassword ? (
                    <button
                      type="button"
                      className="text-link"
                      disabled={busy}
                      onClick={() =>
                        void (async () => {
                          setBusy(true);
                          try {
                            await api.adminImpersonate(s.id);
                            onToast(`Вход как ${s.username}`, "good");
                            await onRefreshMe?.();
                            window.location.href = "/";
                          } catch (e) {
                            onToast(
                              e instanceof Error ? e.message : "Ошибка",
                              "bad",
                            );
                          } finally {
                            setBusy(false);
                          }
                        })()
                      }
                    >
                      Войти
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="text-link"
                    disabled={busy}
                    onClick={() =>
                      void run("Сессия отозвана", () =>
                        api.adminRevokeSession(s.id),
                      )
                    }
                  >
                    Отозвать
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : null}

      {!loading && tab === "auth" ? (
        <div className="admin-list">
          <div className="mute tiny" style={{ marginBottom: 4 }}>
            Журнал попыток входа · пароли не сохраняются
          </div>
          {authEvents.length === 0 ? (
            <div className="empty">Пока пусто</div>
          ) : (
            authEvents.map((e) => (
              <div className="admin-row" key={e.id}>
                <div>
                  <div className="student-name">
                    {e.ok ? "✓" : "✗"} {e.username}
                  </div>
                  <div className="mute tiny">
                    {[
                      fmt(e.createdAt),
                      e.teachName,
                      e.ip,
                      e.error,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : null}

      {!loading && tab === "sync" ? (
        <div className="admin-stack">
          <button
            type="button"
            className="ghost-btn"
            disabled={busy}
            onClick={() =>
              void run("Ошибки синка в очередь", () =>
                api.adminResetSyncErrors(),
              )
            }
          >
            Retry все ошибки
          </button>
          <div className="admin-list">
            {syncErrors.length === 0 ? (
              <div className="empty">Ошибок нет</div>
            ) : (
              syncErrors.map((e) => (
                <div className="admin-row" key={e.id}>
                  <div>
                    <div className="student-name">{e.kind}</div>
                    <div className="mute tiny">
                      {[
                        e.session_id.slice(0, 8),
                        `×${e.attempts}`,
                        fmt(e.created_at),
                        e.last_error,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}

      {!loading && tab === "feedback" ? (
        <div className="admin-list">
          {feedback.length === 0 ? (
            <div className="empty">Пока нет сообщений</div>
          ) : (
            feedback.map((f) => (
              <div className="admin-row admin-feedback-row" key={f.id}>
                <div>
                  <div className="student-name">
                    {f.teachName || f.username}
                    <span className="mute tiny"> · {f.status}</span>
                  </div>
                  <div className="mute tiny">
                    {[fmt(f.createdAt), f.username, f.page, f.contact]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                  <div className="admin-feedback-msg">{f.message}</div>
                  {f.hasFile ? (
                    <a
                      className="text-link tiny"
                      href={`/api/admin/feedback/${f.id}/file`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {f.fileName || "вложение"}
                      {f.fileSize
                        ? ` · ${(f.fileSize / 1024).toFixed(0)} КБ`
                        : ""}
                    </a>
                  ) : null}
                </div>
                <div className="admin-row-actions">
                  {f.status !== "seen" ? (
                    <button
                      type="button"
                      className="text-link"
                      disabled={busy}
                      onClick={() =>
                        void run("Отмечено", () =>
                          api.adminFeedbackStatus(f.id, "seen"),
                        )
                      }
                    >
                      Прочитано
                    </button>
                  ) : null}
                  {f.status !== "done" ? (
                    <button
                      type="button"
                      className="text-link"
                      disabled={busy}
                      onClick={() =>
                        void run("Закрыто", () =>
                          api.adminFeedbackStatus(f.id, "done"),
                        )
                      }
                    >
                      Закрыть
                    </button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
