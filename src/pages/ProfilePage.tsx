import { useEffect, useMemo, useState } from "react";
import { usePrefs } from "../i18n/PrefsContext";
import { api, type Me } from "../lib/api";

type Teach = { fio_teach: string; id_teach: string };
type City = {
  id: string;
  id_city: string;
  name: string;
  prefix?: string;
  translate_key?: string;
};

export function ProfilePage({
  me,
  onLogout,
  onToast,
  onRefreshMe,
}: {
  me: Me;
  onLogout: () => void;
  onToast: (t: string, tone?: "good" | "bad" | "neutral") => void;
  onRefreshMe: () => void;
}) {
  const { t, lang, setLang, theme, setTheme } = usePrefs();
  const [teachers, setTeachers] = useState<Teach[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [teachId, setTeachId] = useState(me.teachId || "");
  const [cityId, setCityId] = useState(String(me.branch?.id_city || ""));
  const [cityQuery, setCityQuery] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setCityId(String(me.branch?.id_city || ""));
  }, [me.branch?.id_city]);

  useEffect(() => {
    api
      .omni<Teach[] | Record<string, Teach>>("teach-list", {})
      .then((r) => {
        const raw = r.data;
        const list = Array.isArray(raw)
          ? raw
          : raw && typeof raw === "object"
            ? Object.values(raw)
            : [];
        setTeachers(
          list
            .filter((x) => x && x.id_teach)
            .map((x) => ({
              id_teach: String(x.id_teach),
              fio_teach: String(x.fio_teach || x.id_teach),
            })),
        );
      })
      .catch(() => undefined);
    api
      .omni<City[] | { error_permission?: unknown }>("cities", {})
      .then((r) => {
        const raw = r.data;
        const list = Array.isArray(raw)
          ? raw
          : Array.isArray((raw as { cities?: City[] })?.cities)
            ? (raw as { cities: City[] }).cities
            : [];
        setCities(
          list.map((c) => ({
            ...c,
            id: String(c.id || c.id_city),
            id_city: String(c.id_city || c.id),
            name: c.name || String(c.id_city || c.id),
          })),
        );
      })
      .catch(() => undefined);
  }, []);

  const filteredCities = useMemo(() => {
    const q = cityQuery.trim().toLowerCase();
    if (!q) return cities.slice(0, 80);
    return cities
      .filter((c) =>
        `${c.name} ${c.prefix || ""} ${c.translate_key || ""}`
          .toLowerCase()
          .includes(q),
      )
      .slice(0, 80);
  }, [cities, cityQuery]);

  const who =
    me.teachName ||
    teachers.find((x) => x.id_teach === me.teachId)?.fio_teach ||
    me.username;

  return (
    <div className="app-shell">
      <div className="brand">{t("profile.title")}</div>

      <div className="profile-hero">
        <div style={{ opacity: 0.55, fontWeight: 650 }}>
          {me.branch?.name || "—"}
        </div>
        <div className="who">{who}</div>
        <div className="sub">{me.username}</div>
      </div>

      <div className="prefs-card">
        <div className="prefs-card-title">{t("profile.settings")}</div>
        <div className="prefs-row">
          <span>{t("profile.theme")}</span>
          <div className="prefs-seg">
            <button
              type="button"
              className={theme === "light" ? "on" : undefined}
              onClick={() => setTheme("light")}
            >
              {t("profile.themeLight")}
            </button>
            <button
              type="button"
              className={theme === "dark" ? "on" : undefined}
              onClick={() => setTheme("dark")}
            >
              {t("profile.themeDark")}
            </button>
          </div>
        </div>
        <div className="prefs-row">
          <span>{t("profile.language")}</span>
          <div className="prefs-seg">
            <button
              type="button"
              className={lang === "ru" ? "on" : undefined}
              onClick={() => setLang("ru")}
            >
              RU
            </button>
            <button
              type="button"
              className={lang === "en" ? "on" : undefined}
              onClick={() => setLang("en")}
            >
              EN
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <input
          className="bare-input"
          placeholder={t("profile.branchSearch")}
          value={cityQuery}
          onChange={(e) => setCityQuery(e.target.value)}
        />
        <select
          className="bare-select"
          value={cityId}
          onChange={(e) => setCityId(e.target.value)}
        >
          {filteredCities.map((c) => (
            <option key={`${c.id}-${c.id_city}`} value={c.id_city}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          className="btn block"
          disabled={busy || !cityId}
          onClick={async () => {
            setBusy(true);
            try {
              await api.changeCity(cityId);
              onToast(t("profile.branchSaved"), "good");
              onRefreshMe();
            } catch (e) {
              onToast(e instanceof Error ? e.message : t("common.error"), "bad");
            } finally {
              setBusy(false);
            }
          }}
        >
          {t("profile.changeBranch")}
        </button>
      </div>

      {teachers.length > 0 ? (
        <div style={{ display: "grid", gap: 8 }}>
          <select
            className="bare-select"
            value={teachId}
            onChange={(e) => setTeachId(e.target.value)}
          >
            {teachers.map((x) => (
              <option key={x.id_teach} value={x.id_teach}>
                {x.fio_teach}
              </option>
            ))}
          </select>
          <button
            className="btn block"
            disabled={busy}
            onClick={async () => {
              if (!teachId) return;
              setBusy(true);
              try {
                await api.changeUser(teachId);
                onToast(t("common.done"), "good");
                onRefreshMe();
              } catch (e) {
                onToast(
                  e instanceof Error ? e.message : t("common.error"),
                  "bad",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            {t("profile.changeTeacher")}
          </button>
        </div>
      ) : null}

      <button
        className="btn ghost block"
        onClick={async () => {
          await api.logout().catch(() => undefined);
          onLogout();
        }}
      >
        {t("profile.logout")}
      </button>
    </div>
  );
}
