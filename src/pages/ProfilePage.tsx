import { useEffect, useMemo, useState } from "react";
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
    api.omni<Teach[] | Record<string, Teach>>("teach-list", {}).then((r) => {
      const raw = r.data;
      const list = Array.isArray(raw)
        ? raw
        : raw && typeof raw === "object"
          ? Object.values(raw)
          : [];
      setTeachers(
        list
          .filter((t) => t && t.id_teach)
          .map((t) => ({
            id_teach: String(t.id_teach),
            fio_teach: String(t.fio_teach || t.id_teach),
          })),
      );
    }).catch(() => undefined);
    api.omni<City[] | { error_permission?: unknown }>("cities", {}).then((r) => {
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
    }).catch(() => undefined);
  }, []);

  const filteredCities = useMemo(() => {
    const q = cityQuery.trim().toLowerCase();
    if (!q) return cities.slice(0, 80);
    return cities
      .filter((c) =>
        `${c.name} ${c.prefix || ""} ${c.translate_key || ""}`.toLowerCase().includes(q),
      )
      .slice(0, 80);
  }, [cities, cityQuery]);

  const who =
    me.teachName ||
    teachers.find((t) => t.id_teach === me.teachId)?.fio_teach ||
    me.username;

  return (
    <div className="app-shell">
      <div className="brand">Я</div>

      <div className="profile-hero">
        <div style={{ opacity: 0.55, fontWeight: 650 }}>
          {me.branch?.name || "—"}
        </div>
        <div className="who">{who}</div>
        <div className="sub">{me.username}</div>
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <input
          className="bare-input"
          placeholder="Поиск филиала"
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
              onToast("Филиал", "good");
              onRefreshMe();
            } catch (e) {
              onToast(e instanceof Error ? e.message : "Ошибка", "bad");
            } finally {
              setBusy(false);
            }
          }}
        >
          Сменить филиал
        </button>
      </div>

      {teachers.length > 0 ? (
        <div style={{ display: "grid", gap: 8 }}>
          <select
            className="bare-select"
            value={teachId}
            onChange={(e) => setTeachId(e.target.value)}
          >
            {teachers.map((t) => (
              <option key={t.id_teach} value={t.id_teach}>
                {t.fio_teach}
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
                onToast("Готово", "good");
                onRefreshMe();
              } catch (e) {
                onToast(e instanceof Error ? e.message : "Ошибка", "bad");
              } finally {
                setBusy(false);
              }
            }}
          >
            Сменить преподавателя
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
        Выйти
      </button>
    </div>
  );
}
