import { FormEvent, useState } from "react";
import { usePrefs } from "../i18n/PrefsContext";
import { api } from "../lib/api";

export function LoginPage({ onDone }: { onDone: () => void }) {
  const { t, lang, setLang, theme, toggleTheme } = usePrefs();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.login(username.trim(), password);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("login.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login">
      <button
        type="button"
        className="theme-fab login-theme-fab"
        aria-label={
          theme === "dark" ? t("theme.toggleLight") : t("theme.toggleDark")
        }
        onClick={toggleTheme}
      >
        {theme === "dark" ? "☀" : "☾"}
      </button>

      <div className="login-stage">
        <div className="login-brand">Omni</div>

        <div className="login-frame">
          <form className="login-form" onSubmit={submit}>
            <input
              className="login-input"
              autoComplete="username"
              placeholder={t("login.username")}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <input
              className="login-input"
              type="password"
              autoComplete="current-password"
              placeholder={t("login.password")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {error ? <div className="err">{error}</div> : null}
            <button className="login-submit" disabled={loading}>
              {loading ? "…" : t("login.submit")}
            </button>
          </form>
        </div>

        <a
          className="login-recover"
          href="https://omni.top-academy.ru/login/index"
          target="_blank"
          rel="noreferrer"
        >
          {t("login.recover")}
        </a>
      </div>

      <div className="login-langs" aria-label={t("login.lang")}>
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
  );
}
