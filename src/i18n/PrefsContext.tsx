import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { dict, type DictKey, type Lang, type Theme } from "./dict";

const LANG_KEY = "omni_fast_lang";
const THEME_KEY = "omni_fast_theme";

type PrefsCtx = {
  lang: Lang;
  theme: Theme;
  setLang: (lang: Lang) => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  t: (key: DictKey) => string;
};

const Ctx = createContext<PrefsCtx | null>(null);

function readLang(): Lang {
  try {
    const v = localStorage.getItem(LANG_KEY);
    if (v === "en" || v === "ru") return v;
  } catch {
    /* ignore */
  }
  return "ru";
}

function readTheme(): Theme {
  try {
    const v = localStorage.getItem(THEME_KEY);
    if (v === "dark" || v === "light") return v;
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return "light";
}

function applyDom(lang: Lang, theme: Theme) {
  const root = document.documentElement;
  root.lang = lang;
  root.dataset.theme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", theme === "dark" ? "#05070b" : "#07131F");
  }
}

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => readLang());
  const [theme, setThemeState] = useState<Theme>(() => readTheme());

  useEffect(() => {
    applyDom(lang, theme);
    try {
      localStorage.setItem(LANG_KEY, lang);
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [lang, theme]);

  const setLang = useCallback((next: Lang) => setLangState(next), []);
  const setTheme = useCallback((next: Theme) => setThemeState(next), []);
  const toggleTheme = useCallback(
    () => setThemeState((t) => (t === "dark" ? "light" : "dark")),
    [],
  );

  const t = useCallback(
    (key: DictKey) => dict[lang][key] ?? dict.ru[key] ?? key,
    [lang],
  );

  const value = useMemo(
    () => ({ lang, theme, setLang, setTheme, toggleTheme, t }),
    [lang, theme, setLang, setTheme, toggleTheme, t],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePrefs() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePrefs outside PrefsProvider");
  return ctx;
}

export function useT() {
  return usePrefs().t;
}
