import { NavLink } from "react-router-dom";

const items = [
  {
    to: "/",
    label: "Пары",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="17" rx="3" />
        <path d="M3 9h18M8 4v5M16 4v5" />
      </svg>
    ),
  },
  {
    to: "/journal",
    label: "Журнал",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 0-3 3V4z" />
        <path d="M9 8h7M9 12h7M9 16h4" />
      </svg>
    ),
  },
  {
    to: "/sync",
    label: "Синк",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 12a8 8 0 1 1-2.3-5.7" />
        <path d="M20 4v5h-5" />
      </svg>
    ),
  },
  {
    to: "/profile",
    label: "Я",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 19a7 7 0 0 1 14 0" />
      </svg>
    ),
  },
];

export function BottomNav() {
  return (
    <nav className="bottom-nav">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/"}
          className={({ isActive }) => (isActive ? "active" : undefined)}
        >
          {item.icon}
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
