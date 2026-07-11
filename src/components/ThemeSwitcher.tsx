"use client";

import { useRef, useState } from "react";
import { Palette, Sun, Moon, Check } from "lucide-react";
import { useTheme, isDarkTheme, type ThemeId } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import { useClickOutside } from "@/components/kit/useClickOutside";

/** Quick light/dark flip — the sun/moon toggle. */
export function ModeToggle() {
  const { theme, toggleMode } = useTheme();
  const dark = isDarkTheme(theme);
  return (
    <button
      onClick={toggleMode}
      title={dark ? "Switch to Daylight (light)" : "Switch to dark"}
      aria-label="Toggle light and dark"
      className="grid place-items-center w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground border border-transparent hover:border-hairline transition-colors"
    >
      <span className="relative block w-[18px] h-[18px]">
        <Sun
          className={cn(
            "absolute inset-0 w-[18px] h-[18px] transition-all duration-300",
            dark ? "opacity-0 -rotate-90 scale-50" : "opacity-100 rotate-0 scale-100"
          )}
        />
        <Moon
          className={cn(
            "absolute inset-0 w-[18px] h-[18px] transition-all duration-300",
            dark ? "opacity-100 rotate-0 scale-100" : "opacity-0 rotate-90 scale-50"
          )}
        />
      </span>
    </button>
  );
}

/** Six-palette picker. */
export function ThemeSwitcher() {
  const { theme, setTheme, themes } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useClickOutside(ref, () => setOpen(false), open);

  const current = themes.find((t) => t.id === theme);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        title="Change theme"
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "flex items-center gap-2 h-9 px-2.5 rounded-lg border transition-colors",
          open
            ? "border-hairline-strong text-foreground bg-surface-1"
            : "border-transparent text-muted-foreground hover:text-foreground hover:border-hairline"
        )}
      >
        <Palette className="w-[18px] h-[18px]" />
        <span className="hidden lg:flex items-center gap-1" aria-hidden>
          {current?.swatch.slice(0, 2).map((c, i) => (
            <span
              key={i}
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: c, boxShadow: `0 0 8px ${c}` }}
            />
          ))}
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="glass-strong absolute right-0 mt-2 w-[300px] p-2 z-[60] rounded-xl glow-md"
        >
          <div className="px-2 py-1.5 text-[11px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
            Theme
          </div>
          <div className="grid grid-cols-1 gap-1">
            {themes.map((t) => {
              const active = t.id === theme;
              return (
                <button
                  key={t.id}
                  role="menuitemradio"
                  aria-checked={active}
                  onClick={() => {
                    setTheme(t.id as ThemeId);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex items-center gap-3 px-2 py-2 rounded-lg text-left transition-colors",
                    active ? "bg-surface-2 text-foreground" : "text-muted-foreground hover:bg-surface-1 hover:text-foreground"
                  )}
                >
                  <span className="flex shrink-0 items-center -space-x-1.5">
                    {t.swatch.map((c, i) => (
                      <span
                        key={i}
                        className="w-4 h-4 rounded-full ring-1 ring-black/30"
                        style={{ background: c }}
                      />
                    ))}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13px] font-semibold leading-tight text-foreground">
                      {t.label}
                    </span>
                    <span className="block text-[11px] font-mono tracking-wide text-muted-foreground truncate">
                      {t.blurb}
                    </span>
                  </span>
                  <span className="shrink-0 w-4">
                    {active && <Check className="w-4 h-4 text-neon" />}
                    {!active &&
                      (t.dark ? (
                        <Moon className="w-3.5 h-3.5 opacity-40" />
                      ) : (
                        <Sun className="w-3.5 h-3.5 opacity-40" />
                      ))}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
