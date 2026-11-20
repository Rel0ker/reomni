import { useCallback, useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { Toast } from "./components/Toast";
import { api, type Me } from "./lib/api";
import { AdminPage } from "./pages/AdminPage";
import { ContentAuthorPage } from "./pages/ContentAuthorPage";
import { DossierPage } from "./pages/DossierPage";
import { ExamsPage } from "./pages/ExamsPage";
import { GroupsPage } from "./pages/GroupsPage";
import { HomeworkPage } from "./pages/HomeworkPage";
import { JournalPage } from "./pages/JournalPage";
import { LoginPage } from "./pages/LoginPage";
import { MaterialsPage } from "./pages/MaterialsPage";
import { NewsPage } from "./pages/NewsPage";
import { PairPage } from "./pages/PairPage";
import { PortfolioPage } from "./pages/PortfolioPage";
import { PresentsPage } from "./pages/PresentsPage";
import { ProfilePage } from "./pages/ProfilePage";
import { ReportsPage } from "./pages/ReportsPage";
import { SchedulePage } from "./pages/SchedulePage";
import { StudentsPage } from "./pages/StudentsPage";
import { SyncPage } from "./pages/SyncPage";
import { TasksPage } from "./pages/TasksPage";
import { TrafficPage } from "./pages/TrafficPage";

type ToastState = { text: string; tone: "good" | "bad" | "neutral" } | null;

export default function App() {
  const [me, setMe] = useState<Me | null>(null);
  const [booting, setBooting] = useState(true);
  const [toast, setToast] = useState<ToastState>(null);

  const refreshMe = useCallback(async () => {
    try {
      setMe(await api.me());
    } catch {
      setMe(null);
    }
  }, []);

  useEffect(() => {
    refreshMe().finally(() => setBooting(false));
  }, [refreshMe]);

  const onToast = useCallback(
    (text: string, tone: "good" | "bad" | "neutral" = "neutral") => {
      setToast({ text, tone });
    },
    [],
  );

  if (booting) {
    return (
      <div className="app-shell">
        <div className="brand">Omni</div>
        <div className="skeleton" />
      </div>
    );
  }

  if (!me) return <LoginPage onDone={() => refreshMe()} />;

  return (
    <>
      {toast ? (
        <Toast text={toast.text} tone={toast.tone} onDone={() => setToast(null)} />
      ) : null}
      <Routes>
        <Route
          element={
            <AppShell me={me} onRefreshMe={refreshMe} onToast={onToast} />
          }
        >
          <Route path="/" element={<SchedulePage onToast={onToast} />} />
          <Route path="/presents" element={<PresentsPage onToast={onToast} />} />
          <Route path="/journal" element={<JournalPage onToast={onToast} />} />
          <Route path="/homework" element={<HomeworkPage onToast={onToast} />} />
          <Route path="/groups" element={<GroupsPage onToast={onToast} />} />
          <Route path="/exams" element={<ExamsPage onToast={onToast} />} />
          <Route path="/students" element={<StudentsPage onToast={onToast} />} />
          <Route path="/tasks" element={<TasksPage onToast={onToast} />} />
          <Route path="/traffic" element={<TrafficPage onToast={onToast} />} />
          <Route path="/materials" element={<MaterialsPage onToast={onToast} />} />
          <Route path="/news" element={<NewsPage onToast={onToast} />} />
          <Route path="/reports" element={<ReportsPage onToast={onToast} />} />
          <Route
            path="/content-author"
            element={<ContentAuthorPage onToast={onToast} />}
          />
          <Route path="/dossier" element={<DossierPage onToast={onToast} />} />
          <Route path="/portfolio" element={<PortfolioPage onToast={onToast} />} />
          <Route path="/sync" element={<SyncPage onToast={onToast} />} />
          <Route
            path="/admin"
            element={
              <AdminPage
                me={me}
                onToast={onToast}
                onRefreshMe={refreshMe}
              />
            }
          />
          <Route path="/pair" element={<PairPage onToast={onToast} />} />
          <Route
            path="/profile"
            element={
              <ProfilePage
                me={me}
                onLogout={() => setMe(null)}
                onToast={onToast}
                onRefreshMe={refreshMe}
              />
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
