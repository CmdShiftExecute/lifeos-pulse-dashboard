"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type ThemeId =
  | "deep-space"
  | "orchid"
  | "amber"
  | "neon"
  | "terminal"
  | "daylight";

export interface ThemeMeta {
  id: ThemeId;
  label: string;
  blurb: string;
  dark: boolean;
  /** [primary, secondary, background] for the picker swatch */
  swatch: [string, string, string];
}

export const THEMES: ThemeMeta[] = [
  { id: "deep-space", label: "Deep Space", blurb: "Observatory azure", dark: true, swatch: ["#4c86ff", "#35e0ff", "#060b18"] },
  { id: "orchid", label: "Orchid", blurb: "Magenta / cyan", dark: true, swatch: ["#ff3dae", "#22d3ee", "#0a0710"] },
  { id: "amber", label: "Solar", blurb: "Gold cockpit", dark: true, swatch: ["#ffb020", "#ff6b35", "#0a0703"] },
  { id: "neon", label: "Cyberpunk", blurb: "Cyan / magenta neon", dark: true, swatch: ["#00f0ff", "#ff2bd6", "#05060a"] },
  { id: "terminal", label: "Terminal", blurb: "Phosphor green", dark: true, swatch: ["#4af7a0", "#e8b84b", "#040a07"] },
  { id: "daylight", label: "Daylight", blurb: "Blueprint light", dark: false, swatch: ["#2563eb", "#0ea5e9", "#f5f7fb"] },
];

const STORAGE_KEY = "pulse-theme";
const LAST_DARK_KEY = "pulse-theme-dark";
const DEFAULT_THEME: ThemeId = "deep-space";

export function isDarkTheme(id: ThemeId): boolean {
  return THEMES.find((t) => t.id === id)?.dark ?? true;
}

function applyTheme(id: ThemeId) {
  if (typeof document === "undefined") return;
  const el = document.documentElement;
  el.setAttribute("data-theme", id);
  const dark = isDarkTheme(id);
  el.classList.toggle("dark", dark);
  el.classList.toggle("light", !dark);
}

interface ThemeCtx {
  theme: ThemeId;
  setTheme: (id: ThemeId) => void;
  toggleMode: () => void;
  themes: ThemeMeta[];
  ready: boolean;
}

const ThemeContext = createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(DEFAULT_THEME);
  const [ready, setReady] = useState(false);

  // hydrate from the value the no-FOUC script already applied to <html>
  useEffect(() => {
    let initial = DEFAULT_THEME;
    try {
      const attr = document.documentElement.getAttribute("data-theme") as ThemeId | null;
      const saved = localStorage.getItem(STORAGE_KEY) as ThemeId | null;
      initial = (saved || attr || DEFAULT_THEME) as ThemeId;
      if (!THEMES.some((t) => t.id === initial)) initial = DEFAULT_THEME;
    } catch {}
    setThemeState(initial);
    applyTheme(initial);
    setReady(true);
  }, []);

  const setTheme = useCallback((id: ThemeId) => {
    setThemeState(id);
    applyTheme(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
      if (isDarkTheme(id)) localStorage.setItem(LAST_DARK_KEY, id);
    } catch {}
  }, []);

  const toggleMode = useCallback(() => {
    setThemeState((cur) => {
      let next: ThemeId;
      if (isDarkTheme(cur)) {
        next = "daylight";
      } else {
        let lastDark: ThemeId = DEFAULT_THEME;
        try {
          lastDark = (localStorage.getItem(LAST_DARK_KEY) as ThemeId) || DEFAULT_THEME;
        } catch {}
        next = isDarkTheme(lastDark) ? lastDark : DEFAULT_THEME;
      }
      applyTheme(next);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {}
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleMode, themes: THEMES, ready }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeCtx {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Safe fallback so a stray consumer never crashes the static export
    return {
      theme: DEFAULT_THEME,
      setTheme: () => {},
      toggleMode: () => {},
      themes: THEMES,
      ready: false,
    };
  }
  return ctx;
}

/** Inline, render-blocking script string — prevents theme flash before hydration. */
export const THEME_NO_FLASH_SCRIPT = `(function(){try{var t=localStorage.getItem('${STORAGE_KEY}')||'${DEFAULT_THEME}';var d=${JSON.stringify(
  THEMES.filter((t) => t.dark).map((t) => t.id),
)}.indexOf(t)!==-1;var e=document.documentElement;e.setAttribute('data-theme',t);e.classList.toggle('dark',d);e.classList.toggle('light',!d);}catch(e){}})();`;
