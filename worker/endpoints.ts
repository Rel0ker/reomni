/** Whitelisted Omni read endpoints → short names */
export const READS: Record<
  string,
  { path: string; method?: "POST" | "GET"; cacheKey: (b: unknown) => string }
> = {
  "start-info": { path: "/auth/get-start-info", cacheKey: () => "start-info" },
  "teach-list": { path: "/auth/get-teach-list", cacheKey: () => "teach-list" },
  "marks-selects": {
    path: "/auth/get-marks-selects",
    cacheKey: () => "marks-selects",
  },
  "base-config": {
    path: "/auth/get-base-config",
    cacheKey: () => "base-config",
  },
  cities: { path: "/auth/get-city", cacheKey: () => "cities" },
  "active-city": {
    path: "/auth/get-active-city",
    cacheKey: () => "active-city",
  },
  schedule: {
    path: "/schedule/get-schedule",
    cacheKey: (b) => `schedule:${JSON.stringify(b)}`,
  },
  presents: {
    path: "/presents/get-presents",
    cacheKey: (b) => `presents:${JSON.stringify(b)}`,
  },
  "presents-requests": {
    path: "/presents/get-data-request-zavuch",
    cacheKey: () => "presents-requests",
  },
  "presents-homework": {
    path: "/presents/get-homework",
    cacheKey: (b) => `p-hw:${JSON.stringify(b)}`,
  },
  "presents-materials": {
    path: "/presents/get-materials",
    cacheKey: (b) => `p-mat:${JSON.stringify(b)}`,
  },
  "presents-themes": {
    path: "/presents/get-methodpackage-themes",
    cacheKey: (b) => `p-themes:${JSON.stringify(b)}`,
  },
  "presents-recommended": {
    path: "/presents/get-recommended-homework",
    cacheKey: (b) => `p-rec:${JSON.stringify(b)}`,
  },
  "presents-next-topic": {
    path: "/presents/get-next-topic-material",
    cacheKey: (b) => `p-next:${JSON.stringify(b)}`,
  },
  "classwork-index": {
    path: "/classwork/index",
    cacheKey: () => "classwork-index",
  },
  "classwork-students": {
    path: "/classwork/get-students",
    cacheKey: (b) => `cw-stud:${JSON.stringify(b)}`,
  },
  "classwork-details": {
    path: "/classwork/get-details",
    cacheKey: (b) => `cw-det:${JSON.stringify(b)}`,
  },
  "classwork-averages": {
    path: "/classwork/get-average-grades",
    cacheKey: (b) => `cw-avg:${JSON.stringify(b)}`,
  },
  "classwork-quarterly": {
    path: "/classwork/get-quarterly-grade",
    cacheKey: (b) => `cw-q:${JSON.stringify(b)}`,
  },
  "groups-table": {
    path: "/groups/get-table",
    cacheKey: (b) => `groups:${JSON.stringify(b)}`,
  },
  "groups-students": {
    path: "/groups/get-students",
    cacheKey: (b) => `g-stud:${JSON.stringify(b)}`,
  },
  "homework-groups": {
    path: "/homework/get-group-spec",
    cacheKey: (b) => `hw-groups:${JSON.stringify(b)}`,
  },
  "homework-students": {
    path: "/homework/get-students",
    cacheKey: (b) => `hw-stud:${JSON.stringify(b)}`,
  },
  "homework-list": {
    path: "/homework/get-homeworks",
    cacheKey: (b) => `hw:${JSON.stringify(b)}`,
  },
  "homework-new": {
    path: "/homework/get-new-homeworks",
    cacheKey: (b) => `hw-new:${JSON.stringify(b)}`,
  },
  exams: {
    path: "/exams/get-exams",
    cacheKey: (b) => `exams:${JSON.stringify(b)}`,
  },
  "exam-info": {
    path: "/exams/get-exam-info",
    cacheKey: (b) => `exam:${JSON.stringify(b)}`,
  },
  "exam-marks": {
    path: "/exams/get-new-marks-selects",
    cacheKey: () => "exam-marks",
  },
  "course-works": {
    path: "/exams/get-course-works",
    method: "GET",
    cacheKey: (b) => `cw:${JSON.stringify(b)}`,
  },
  "diploma-projects": {
    path: "/exams/get-diploma-projects",
    method: "GET",
    cacheKey: () => "diploma",
  },
  "students-groups": {
    path: "/students/get-groups-list",
    cacheKey: () => "stud-groups",
  },
  "students-list": {
    path: "/students/get-students",
    cacheKey: (b) => `studs:${JSON.stringify(b)}`,
  },
  "students-short": {
    path: "/students/get-students-short",
    cacheKey: (b) => `studs-s:${JSON.stringify(b)}`,
  },
  "student-details": {
    path: "/students/get-details-stud",
    cacheKey: (b) => `stud:${JSON.stringify(b)}`,
  },
  "student-comments": {
    path: "/students/get-comments",
    cacheKey: (b) => `stud-c:${JSON.stringify(b)}`,
  },
  "student-vizit": {
    path: "/students/get-stud-vizit",
    cacheKey: (b) => `stud-v:${JSON.stringify(b)}`,
  },
  "review-queue": {
    path: "/students/get-review-queue",
    cacheKey: () => "review-queue",
  },
  tasks: {
    path: "/tasks/get-all-tasks",
    cacheKey: (b) => `tasks:${JSON.stringify(b)}`,
  },
  "task-rooms": { path: "/tasks/get-rooms", cacheKey: () => "task-rooms" },
  "task-comments": {
    path: "/tasks/get-comments",
    cacheKey: (b) => `task-c:${JSON.stringify(b)}`,
  },
  traffic: {
    path: "/traffic/get-traffic-students",
    cacheKey: (b) => `traffic:${JSON.stringify(b)}`,
  },
  "traffic-new": {
    path: "/traffic/get-no-view-students",
    cacheKey: (b) => `traffic-n:${JSON.stringify(b)}`,
  },
  news: { path: "/news/get-news", cacheKey: () => "news" },
  events: { path: "/news/get-events", cacheKey: () => "events" },
  "news-cc": {
    path: "/news-control-center/get-news",
    method: "GET",
    cacheKey: (b) => `news-cc:${JSON.stringify(b)}`,
  },
  "news-departments": {
    path: "/news-control-center/get-departments",
    method: "GET",
    cacheKey: () => "news-deps",
  },
  "report-index": { path: "/report/index", cacheKey: () => "report-index" },
  report: {
    path: "/report/get-report",
    cacheKey: (b) => `report:${JSON.stringify(b)}`,
  },
  "report-group": {
    path: "/report/get-report-group",
    cacheKey: (b) => `report-g:${JSON.stringify(b)}`,
  },
  "teach-materials": {
    path: "/bind/get-teach-materials",
    cacheKey: (b) => `teach-mat:${JSON.stringify(b)}`,
  },
  "materials-types": {
    path: "/bind/get-materials-type",
    cacheKey: () => "mat-types",
  },
  "bind-public-form": {
    path: "/bind/get-public-form",
    cacheKey: (b) => `bind-forms:${JSON.stringify(b ?? {})}`,
  },
  "bind-public-spec": {
    path: "/bind/get-public-spec",
    cacheKey: (b) => `bind-spec:${JSON.stringify(b)}`,
  },
  "bind-city-forms": {
    path: "/bind/get-city-forms",
    cacheKey: (b) => `bind-cforms:${JSON.stringify(b)}`,
  },
  "bind-city-spec": {
    path: "/bind/get-city-spec",
    cacheKey: (b) => `bind-cspec:${JSON.stringify(b)}`,
  },
  "bind-materials": {
    path: "/bind/get-materials",
    cacheKey: (b) => `bind-mat:${JSON.stringify(b)}`,
  },
  "bind-weeks": {
    path: "/bind/get-count-week",
    cacheKey: (b) => `bind-weeks:${JSON.stringify(b)}`,
  },
  "bind-directions": {
    path: "/bind/get-public-direction",
    cacheKey: (b) => `bind-dir:${JSON.stringify(b)}`,
  },
  "bind-cities": {
    path: "/bind/city-list",
    cacheKey: () => "bind-city-list",
  },
  "bind-is-author": {
    path: "/bind/is-author",
    cacheKey: (b) => `bind-author:${JSON.stringify(b)}`,
  },
  "bind-author-list": {
    path: "/bind/get-author-list",
    cacheKey: (b) => `bind-authors:${JSON.stringify(b)}`,
  },
  "content-form": {
    path: "/content-author/get-form-info",
    method: "GET",
    cacheKey: () => "content-form",
  },
  "traffic-comments": {
    path: "/traffic/get-students-active-requests-comment",
    cacheKey: () => "traffic-c",
  },
  dossier: {
    path: "/dossier/get-all-data",
    method: "GET",
    cacheKey: () => "dossier",
  },
  "dossier-single": {
    path: "/dossier/get-single-data",
    method: "GET",
    cacheKey: (b) => `dossier-s:${JSON.stringify(b)}`,
  },
  "dossier-graphics": {
    path: "/dossier/get-data-graphics",
    method: "GET",
    cacheKey: () => "dossier-g",
  },
  "dossier-video": {
    path: "/dossier/get-video-teach",
    cacheKey: (b) => `dossier-v:${JSON.stringify(b)}`,
  },
  "portfolio-groups": {
    path: "/portfolio/get-groups",
    cacheKey: () => "pf-groups",
  },
  "portfolio-spec": {
    path: "/portfolio/get-spec",
    cacheKey: (b) => `pf-spec:${JSON.stringify(b)}`,
  },
  "portfolio-students": {
    path: "/portfolio/get-students",
    cacheKey: (b) => `pf-stud:${JSON.stringify(b)}`,
  },
  "portfolio-history": {
    path: "/portfolio/get-history",
    cacheKey: (b) => `pf-h:${JSON.stringify(b)}`,
  },
  "portfolio-requests": {
    path: "/portfolio/get-stud-request",
    cacheKey: () => "pf-req",
  },
  profile: { path: "/profile/get-profile", cacheKey: () => "profile" },
  "not-done-tasks": {
    path: "/tasks/not-done-tasks",
    cacheKey: () => "not-done",
  },
};

/** Mutation short name → Omni path + sync kind */
export const MUTATIONS: Record<string, { path: string; kind: string }> = {
  "set-was": { path: "/presents/set-was", kind: "presents.set-was" },
  "set-was-all": {
    path: "/presents/set-was-all",
    kind: "presents.set-was-all",
  },
  "set-mark": { path: "/presents/set-mark", kind: "presents.set-mark" },
  "set-theme": { path: "/presents/set-theme", kind: "presents.set-theme" },
  "delete-presents-homework": {
    path: "/presents/delete-homework",
    kind: "presents.delete-homework",
  },
  "set-comment": {
    path: "/presents/set-comment",
    kind: "presents.set-comment",
  },
  "set-prize": { path: "/presents/set-prize", kind: "presents.set-prize" },
  "stop-pair": { path: "/presents/stop-pair", kind: "presents.stop-pair" },
  "send-request-zavuch": {
    path: "/presents/send-request-zavuch",
    kind: "presents.send-request-zavuch",
  },
  "classwork-set-mark": {
    path: "/classwork/set-mark",
    kind: "classwork.set-mark",
  },
  "classwork-set-quarterly": {
    path: "/classwork/set-quarterly-grade",
    kind: "classwork.set-quarterly-grade",
  },
  "homework-set-mark": {
    path: "/homework/set-mark",
    kind: "homework.set-mark",
  },
  "homework-set-comment": {
    path: "/homework/set-comment",
    kind: "homework.set-comment",
  },
  "homework-save": {
    path: "/homework/save-homework",
    kind: "homework.save",
  },
  "homework-delete": {
    path: "/homework/delete-stud-dz",
    kind: "homework.delete",
  },
  "homework-delete-teach": {
    path: "/homework/delete-teach-homework",
    kind: "homework.delete-teach",
  },
  "homework-approve": {
    path: "/homework/approve-request",
    kind: "homework.approve",
  },
  "exam-set-mark": { path: "/exams/set-mark", kind: "exams.set-mark" },
  "exam-set-course-mark": {
    path: "/exams/set-mark-course-work",
    kind: "exams.set-course-mark",
  },
  "exam-set-theme": {
    path: "/exams/set-theme-course-work",
    kind: "exams.set-theme",
  },
  "exam-set-diploma-theme": {
    path: "/exams/set-theme-diploma-project",
    kind: "exams.set-diploma-theme",
  },
  "exam-set-diploma-grade": {
    path: "/exams/set-grade-diploma-project",
    kind: "exams.set-diploma-grade",
  },
  "student-set-comment": {
    path: "/students/set-comment",
    kind: "students.set-comment",
  },
  "student-delete-comment": {
    path: "/students/delete-comment",
    kind: "students.delete-comment",
  },
  "student-send-msg": {
    path: "/students/send-msg",
    kind: "students.send-msg",
  },
  "task-add": { path: "/tasks/add-task", kind: "tasks.add" },
  "task-edit": { path: "/tasks/edit-task", kind: "tasks.edit" },
  "task-status": { path: "/tasks/set-status-task", kind: "tasks.status" },
  "task-delete": { path: "/tasks/delete-task", kind: "tasks.delete" },
  "task-comment": { path: "/tasks/add-comment", kind: "tasks.comment" },
  "traffic-comment": {
    path: "/traffic/add-comment-teach",
    kind: "traffic.comment",
  },
  "news-read": { path: "/news/read-news", kind: "news.read" },
  "event-read": { path: "/news/read-event", kind: "news.event-read" },
  "content-send": {
    path: "/content-author/send-content",
    kind: "content.send",
  },
  "portfolio-approve": {
    path: "/portfolio/approve-request",
    kind: "portfolio.approve",
  },
  "portfolio-add": {
    path: "/portfolio/add-to-portfolio",
    kind: "portfolio.add",
  },
  "portfolio-delete": { path: "/portfolio/delete", kind: "portfolio.delete" },
};
