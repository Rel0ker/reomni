import type { DictKey } from "./i18n/dict";

export type NavItem = {
  to: string;
  labelKey: DictKey;
  shortKey?: DictKey;
  icon: string;
  primary?: boolean;
};

/** SVG path `d` for 24x24 outline icons */
export const NAV: NavItem[] = [
  {
    to: "/",
    labelKey: "nav.schedule",
    shortKey: "nav.scheduleShort",
    icon: "M3 5h18v15H3zM3 9h18M8 5v4M16 5v4",
    primary: true,
  },
  {
    to: "/presents",
    labelKey: "nav.presents",
    shortKey: "nav.presentsShort",
    icon: "M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11",
    primary: true,
  },
  {
    to: "/journal",
    labelKey: "nav.journal",
    icon: "M5 4h12a2 2 0 0 1 2 2v14H8a3 3 0 0 0-3 3V4zM9 8h7M9 12h7M9 16h4",
    primary: true,
  },
  {
    to: "/homework",
    labelKey: "nav.homework",
    icon: "M6 3h9l3 3v15H6V3zM9 11h6M9 15h4",
  },
  {
    to: "/groups",
    labelKey: "nav.groups",
    shortKey: "nav.groupsShort",
    icon: "M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20a5 5 0 0 1 10 0M11 20a5 5 0 0 1 10 0",
  },
  {
    to: "/exams",
    labelKey: "nav.exams",
    icon: "M5 4h14v16H5V4zM8 8h8M8 12h8M8 16h5",
  },
  {
    to: "/students",
    labelKey: "nav.students",
    icon: "M12 8a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM5 20a7 7 0 0 1 14 0",
  },
  {
    to: "/traffic",
    labelKey: "nav.traffic",
    shortKey: "nav.trafficShort",
    icon: "M4 18V6M10 18V10M16 18V4M22 18V12",
  },
  {
    to: "/materials",
    labelKey: "nav.materials",
    shortKey: "nav.materialsShort",
    icon: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z",
  },
  {
    to: "/news",
    labelKey: "nav.news",
    icon: "M4 5h12v14H4V5zM16 9h4v10h-4M7 9h6M7 13h6",
  },
  {
    to: "/reports",
    labelKey: "nav.reports",
    shortKey: "nav.reportsShort",
    icon: "M4 19V9l5 4 5-8 6 10",
  },
  {
    to: "/tasks",
    labelKey: "nav.tasks",
    icon: "M5 5h14v4H5V5zM5 11h14v4H5v-4zM5 17h10v2H5v-2z",
  },
  {
    to: "/content-author",
    labelKey: "nav.contentAuthor",
    shortKey: "nav.contentAuthorShort",
    icon: "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z",
  },
  {
    to: "/dossier",
    labelKey: "nav.dossier",
    icon: "M5 4h14v16H5V4zM9 9h6M9 13h6M9 17h3",
  },
  {
    to: "/portfolio",
    labelKey: "nav.portfolio",
    icon: "M4 8h16v12H4V8zM9 8V6a3 3 0 0 1 6 0v2",
  },
  {
    to: "/sync",
    labelKey: "nav.sync",
    icon: "M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5",
  },
  {
    to: "/admin",
    labelKey: "nav.admin",
    shortKey: "nav.adminShort",
    icon: "M12 3l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V7l8-4z",
  },
  {
    to: "/profile",
    labelKey: "nav.profile",
    shortKey: "nav.profile",
    icon: "M12 8a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM5 20a7 7 0 0 1 14 0",
    primary: true,
  },
];

export function navForUser(isAdmin?: boolean) {
  return NAV.filter((n) => n.to !== "/admin" || isAdmin);
}

export const MOBILE_PRIMARY = NAV.filter((n) => n.primary);
export const MOBILE_MORE = NAV.filter((n) => !n.primary && n.to !== "/admin");
