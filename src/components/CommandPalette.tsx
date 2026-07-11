"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  CornerDownLeft,
  Palette,
  Eye,
  SunMoon,
  ArrowRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { allNav } from "@/lib/nav";
import { useTheme } from "@/contexts/ThemeContext";
import { useObserverMode } from "@/contexts/ObserverModeContext";
import { cn } from "@/lib/utils";

interface CmdItem {
  id: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  section: "Navigate" | "Theme" | "Actions";
  keywords: string;
  run: () => void;
}

export function CommandPalette() {
  const router = useRouter();
  const { themes, setTheme, toggleMode } = useTheme();
  const { toggleObserverMode } = useObserverMode();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActive(0);
  }, []);

  const items = useMemo<CmdItem[]>(() => {
    const nav: CmdItem[] = allNav.map((n) => ({
      id: `nav:${n.href}`,
      label: n.label,
      hint: n.hint,
      icon: n.icon,
      section: "Navigate",
      keywords: `${n.label} ${n.hint ?? ""} ${n.href}`,
      run: () => {
        router.push(n.href);
        close();
      },
    }));
    const themeItems: CmdItem[] = themes.map((t) => ({
      id: `theme:${t.id}`,
      label: `Theme — ${t.label}`,
      hint: t.blurb,
      icon: Palette,
      section: "Theme",
      keywords: `theme palette color ${t.label} ${t.blurb}`,
      run: () => {
        setTheme(t.id);
        close();
      },
    }));
    const actions: CmdItem[] = [
      {
        id: "act:mode",
        label: "Toggle light / dark",
        icon: SunMoon,
        section: "Actions",
        keywords: "light dark mode toggle daylight",
        run: () => {
          toggleMode();
          close();
        },
      },
      {
        id: "act:observer",
        label: "Toggle observer mode",
        hint: "Hide sensitive data",
        icon: Eye,
        section: "Actions",
        keywords: "observer privacy redact hide sensitive",
        run: () => {
          toggleObserverMode();
          close();
        },
      },
    ];
    return [...nav, ...themeItems, ...actions];
  }, [themes, router, setTheme, toggleMode, toggleObserverMode, close]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => it.keywords.toLowerCase().includes(q));
  }, [items, query]);

  // global ⌘K / Ctrl+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    (window as unknown as { __openPulseCmd?: () => void }).__openPulseCmd = () => setOpen(true);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setActive(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      filtered[active]?.run();
    }
  };

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open) return null;

  let renderIdx = -1;
  let lastSection = "";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[12vh]"
      onMouseDown={close}
    >
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" />
      <div
        className="glass-strong relative w-full max-w-xl rounded-2xl overflow-hidden glow-lg"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <div className="flex items-center gap-3 px-4 h-14 border-b border-hairline">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Jump to anything — routes, themes, actions…"
            className="flex-1 bg-transparent outline-none text-[15px] text-foreground placeholder:text-muted-foreground"
          />
          <kbd className="hidden sm:inline-flex items-center px-1.5 h-5 rounded border border-hairline text-[10px] font-mono text-muted-foreground">
            ESC
          </kbd>
        </div>

        <div ref={listRef} className="max-h-[52vh] overflow-y-auto py-2">
          {filtered.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground font-mono">
              No matches for “{query}”
            </div>
          )}
          {filtered.map((it) => {
            renderIdx += 1;
            const idx = renderIdx;
            const Icon = it.icon;
            const showHeader = it.section !== lastSection;
            lastSection = it.section;
            return (
              <div key={it.id}>
                {showHeader && (
                  <div className="px-4 pt-3 pb-1 text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
                    {it.section}
                  </div>
                )}
                <button
                  data-idx={idx}
                  onMouseEnter={() => setActive(idx)}
                  onClick={() => it.run()}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                    idx === active ? "bg-surface-2 text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" style={idx === active ? { color: "var(--neon)" } : undefined} />
                  <span className="flex-1 min-w-0">
                    <span className="block text-[14px] font-medium leading-tight text-foreground truncate">
                      {it.label}
                    </span>
                    {it.hint && (
                      <span className="block text-[11px] font-mono text-muted-foreground truncate">
                        {it.hint}
                      </span>
                    )}
                  </span>
                  {idx === active ? (
                    <CornerDownLeft className="w-3.5 h-3.5 shrink-0 text-neon" />
                  ) : (
                    <ArrowRight className="w-3.5 h-3.5 shrink-0 opacity-0" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
