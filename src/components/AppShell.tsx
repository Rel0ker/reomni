import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { usePrefs } from "../i18n/PrefsContext";
import { api, type Me } from "../lib/api";
import { MOBILE_MORE, MOBILE_PRIMARY, NAV, navForUser } from "../nav";
import { FeedbackFab } from "./FeedbackFab";
import { Icon } from "./Icon";

export function AppShell({
  me,
  onRefreshMe,
  onToast,
}: {
  me: Me;
  onRefreshMe?: () => Promise<void>;
  onToast?: (t: string, tone?: "good" | "bad" | "neutral") => void;
}) {
  const { t, theme, toggleTheme } = usePrefs();
  const [moreOpen, setMoreOpen] = useState(false);
  const [stopping, setStopping] = useState(false);
  const location = useLocation();
  const pairMode = location.pathname.startsWith("/pair");
  const nav = navForUser(me.isAdmin);
  const more = [
    ...MOBILE_MORE,
    ...(me.isAdmin ? nav.filter((n) => n.to === "/admin") : []),
  ];

  async function stopImpersonate() {
    setStopping(true);
    try {
      await api.adminStopImpersonate();
      onToast?.(t("impersonate.back"), "good");
      await onRefreshMe?.();
      window.location.href = "/admin";
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : t("common.error"), "bad");
    } finally {
      setStopping(false);
    }
  }

  return (
    <div className={`shell-root${pairMode ? " pair-mode" : ""}`}>
      {me.impersonating ? (
        <div className="impersonate-bar">
          <span>
            {t("impersonate.as")} <b>{me.teachName || me.username}</b>
            <span className="mute">
              {" "}
              · {t("impersonate.admin")} {me.impersonating.adminUsername}
            </span>
          </span>
          <button
            type="button"
            className="text-link"
            disabled={stopping}
            onClick={() => void stopImpersonate()}
          >
            {stopping ? "…" : t("pair.returnAdmin")}
          </button>
        </div>
      ) : null}
      <div className="layout">
        <aside className="sidebar">
          <div className="sidebar-brand">Omni</div>
          <NavLink to="/profile" className="sidebar-meta">
            <div className="sidebar-branch">{me.branch?.name || "—"}</div>
            <div className="sidebar-who">{me.teachName || me.username}</div>
          </NavLink>
          <nav className="sidebar-nav">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) => {
                  const onPresents =
                    item.to === "/presents" &&
                    (pairMode || location.pathname.startsWith("/presents"));
                  return `side-link${isActive || onPresents ? " active" : ""}`;
                }}
              >
                <Icon d={item.icon} />
                <span>{t(item.labelKey)}</span>
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="main">
          <div className="top-fabs">
            <button
              type="button"
              className="theme-fab"
              aria-label={
                theme === "dark" ? t("theme.toggleLight") : t("theme.toggleDark")
              }
              title={
                theme === "dark" ? t("theme.toggleLight") : t("theme.toggleDark")
              }
              onClick={toggleTheme}
            >
              {theme === "dark" ? (
                <Icon d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0z" />
              ) : (
                <Icon d="M21 14.5A8.5 8.5 0 1 1 9.5 3 7 7 0 0 0 21 14.5z" />
              )}
            </button>
            <FeedbackFab onToast={onToast} />
          </div>
          <Outlet />
        </main>

        {!pairMode ? (
          <nav className="bottom-nav mobile-only">
            {MOBILE_PRIMARY.filter((i) => i.to !== "/profile").map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) => (isActive ? "active" : undefined)}
              >
                <Icon d={item.icon} />
                <span>{t(item.shortKey || item.labelKey)}</span>
              </NavLink>
            ))}
            <button
              type="button"
              className={moreOpen ? "active" : undefined}
              onClick={() => setMoreOpen((v) => !v)}
            >
              <Icon d="M5 7h14M5 12h14M5 17h14" />
              <span>{t("nav.more")}</span>
            </button>
            <NavLink
              to="/profile"
              className={({ isActive }) => (isActive ? "active" : undefined)}
            >
              <Icon d={NAV.find((n) => n.to === "/profile")!.icon} />
              <span>{t("nav.profile")}</span>
            </NavLink>
          </nav>
        ) : null}

        {moreOpen && !pairMode ? (
          <div
            className="more-sheet mobile-only"
            onClick={() => setMoreOpen(false)}
          >
            <div className="more-panel" onClick={(e) => e.stopPropagation()}>
              {more.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMoreOpen(false)}
                >
                  <Icon d={item.icon} />
                  {t(item.labelKey)}
                </NavLink>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
