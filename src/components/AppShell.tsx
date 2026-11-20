import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { api, type Me } from "../lib/api";
import { MOBILE_MORE, MOBILE_PRIMARY, NAV, navForUser } from "../nav";
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
  const [moreOpen, setMoreOpen] = useState(false);
  const [stopping, setStopping] = useState(false);
  const location = useLocation();
  const pairMode = location.pathname.startsWith("/pair");
  const nav = navForUser(me.isAdmin);
  const more = [
    ...MOBILE_MORE,
    ...(me.isAdmin
      ? nav.filter((n) => n.to === "/admin")
      : []),
  ];

  async function stopImpersonate() {
    setStopping(true);
    try {
      await api.adminStopImpersonate();
      onToast?.("Снова ваш аккаунт", "good");
      await onRefreshMe?.();
      window.location.href = "/admin";
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : "Ошибка", "bad");
    } finally {
      setStopping(false);
    }
  }

  return (
    <div className={`shell-root${pairMode ? " pair-mode" : ""}`}>
      {me.impersonating ? (
        <div className="impersonate-bar">
          <span>
            Вы как <b>{me.teachName || me.username}</b>
            <span className="mute">
              {" "}
              · админ {me.impersonating.adminUsername}
            </span>
          </span>
          <button
            type="button"
            className="text-link"
            disabled={stopping}
            onClick={() => void stopImpersonate()}
          >
            {stopping ? "…" : "Вернуться"}
          </button>
        </div>
      ) : null}
      <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-brand">Omni</div>
        <NavLink to="/profile" className="sidebar-meta">
          <div className="sidebar-branch">{me.branch?.name || "—"}</div>
          <div className="sidebar-who">
            {me.teachName || me.username}
          </div>
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
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="main">
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
              <span>{item.short || item.label}</span>
            </NavLink>
          ))}
          <button
            type="button"
            className={moreOpen ? "active" : undefined}
            onClick={() => setMoreOpen((v) => !v)}
          >
            <Icon d="M5 7h14M5 12h14M5 17h14" />
            <span>Ещё</span>
          </button>
          <NavLink
            to="/profile"
            className={({ isActive }) => (isActive ? "active" : undefined)}
          >
            <Icon d={NAV.find((n) => n.to === "/profile")!.icon} />
            <span>Я</span>
          </NavLink>
        </nav>
      ) : null}

      {moreOpen && !pairMode ? (
        <div className="more-sheet mobile-only" onClick={() => setMoreOpen(false)}>
          <div className="more-panel" onClick={(e) => e.stopPropagation()}>
            {more.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMoreOpen(false)}
              >
                <Icon d={item.icon} />
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
      ) : null}
      </div>
    </div>
  );
}
