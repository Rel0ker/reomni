import { FormEvent, useState } from "react";
import { api } from "../lib/api";

export function LoginPage({ onDone }: { onDone: () => void }) {
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
      setError(err instanceof Error ? err.message : "Ошибка входа");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login">
      <div className="login-stage">
        <div className="login-brand">Omni</div>

        <div className="login-frame">
          <form className="login-form" onSubmit={submit}>
            <input
              className="login-input"
              autoComplete="username"
              placeholder="Логин"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <input
              className="login-input"
              type="password"
              autoComplete="current-password"
              placeholder="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {error ? <div className="err">{error}</div> : null}
            <button className="login-submit" disabled={loading}>
              {loading ? "…" : "Войти"}
            </button>
          </form>
        </div>

        <a
          className="login-recover"
          href="https://omni.top-academy.ru/login/index"
          target="_blank"
          rel="noreferrer"
        >
          Восстановление пароля
        </a>
      </div>

      <div className="login-langs" aria-label="Язык">
        <span className="on">RU</span>
        <span>EN</span>
        <span>ES</span>
        <span>TR</span>
      </div>
    </div>
  );
}
