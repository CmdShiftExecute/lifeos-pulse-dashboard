"use client";

// AppHeader — the single navigation organism for all of Pulse.
//
// Design: "one bar, depth on hover." Any primary item that contains a world
// (TELOS, Systems) opens the SAME hover mega-panel component; everything else
// is a plain link. There is no secondary nav bar anywhere — uniformity by
// construction, and every TELOS surface is one hover away from any page.
//
// Interaction contract:
//  - open on hover with intent (70ms in, 250ms grace out — no flicker)
//  - click toggles too (touch + accessibility); Esc closes; route change closes
//  - the primary label itself still navigates on click (TELOS → /telos)

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Menu,
  X,
  ChevronDown,
  Command,
  Eye,
  EyeOff,
} from "lucide-react";
import { useObserverMode } from "@/contexts/ObserverModeContext";
import { TabFreshnessPill } from "@/components/TabFreshnessPill";
import { ThemeSwitcher, ModeToggle } from "@/components/ThemeSwitcher";
import { CommandPalette } from "@/components/CommandPalette";
import { lifeNav, systemNav, telosPanel, type NavItem, type NavPanelGroup } from "@/lib/nav";
import { useClickOutside } from "@/components/kit/useClickOutside";

function openCommand() {
  (window as unknown as { __openPulseCmd?: () => void }).__openPulseCmd?.();
}

/* ---------------- hover-intent panel machinery ---------------- */

type PanelId = "telos" | "systems" | null;

function usePanelIntent() {
  const [open, setOpen] = useState<PanelId>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = () => {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    openTimer.current = closeTimer.current = null;
  };
  const enter = useCallback((id: Exclude<PanelId, null>) => {
    clearTimers();
    openTimer.current = setTimeout(() => setOpen(id), 70);
  }, []);
  const leave = useCallback(() => {
    clearTimers();
    closeTimer.current = setTimeout(() => setOpen(null), 250);
  }, []);
  const toggle = useCallback((id: Exclude<PanelId, null>) => {
    clearTimers();
    setOpen((v) => (v === id ? null : id));
  }, []);
  const close = useCallback(() => {
    clearTimers();
    setOpen(null);
  }, []);
  useEffect(() => () => clearTimers(), []);
  return { open, enter, leave, toggle, close };
}

/* ---------------- panel item row ---------------- */

function PanelRow({ item, active, onNavigate }: { item: NavItem; active: boolean; onNavigate: () => void }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "group/row flex items-start gap-2.5 px-2.5 py-2 rounded-lg transition-colors",
        active ? "bg-surface-2" : "hover:bg-surface-1"
      )}
    >
      <Icon
        className="w-4 h-4 mt-0.5 shrink-0 transition-colors"
        style={active ? { color: "var(--neon)" } : undefined}
      />
      <span className="min-w-0">
        <span
          className={cn(
            "block text-[13px] font-medium leading-tight transition-colors",
            active ? "text-foreground" : "text-foreground/90 group-hover/row:text-foreground"
          )}
        >
          {item.label}
        </span>
        {item.hint && (
          <span className="block text-[11px] font-mono text-muted-foreground truncate">{item.hint}</span>
        )}
      </span>
    </Link>
  );
}

/* ---------------- the shared mega-panel ---------------- */

function HoverPanel({
  groups,
  columns,
  isActiveHref,
  onNavigate,
  align = "center",
}: {
  groups: NavPanelGroup[];
  columns: number;
  isActiveHref: (href: string) => boolean;
  onNavigate: () => void;
  align?: "center" | "right";
}) {
  return (
    <div
      className={cn(
        "absolute top-full pt-2 z-[60] omm-panel-enter",
        align === "center" ? "left-0" : "right-0"
      )}
    >
      <div
        className="glass-strong rounded-2xl glow-md p-3 grid gap-4"
        style={{
          gridTemplateColumns: `repeat(${columns}, minmax(180px, 220px))`,
          // glass-strong alone is too translucent for a floating menu over
          // dense pages — give it a near-opaque theme backdrop for legibility
          background: "color-mix(in oklab, var(--bg-deep) 94%, transparent)",
          backdropFilter: "blur(18px)",
        }}
      >
        {groups.map((g) => (
          <div key={g.kicker} className="min-w-0">
            <div
              className="px-2.5 pb-1.5 text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground"
              style={{ borderBottom: "1px solid var(--hairline)", marginBottom: 6 }}
            >
              {g.kicker}
            </div>
            <div className="flex flex-col gap-0.5">
              {g.items.map((item) => (
                <PanelRow key={item.href} item={item} active={isActiveHref(item.href)} onNavigate={onNavigate} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- header ---------------- */

export default function AppHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const { observerMode, toggleObserverMode } = useObserverMode();
  const panel = usePanelIntent();

  useEffect(() => {
    setMobileOpen(false);
    panel.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useClickOutside(mobileRef, () => setMobileOpen(false), mobileOpen);
  useClickOutside(navRef, panel.close, panel.open !== null);

  // Esc closes any open panel
  useEffect(() => {
    if (!panel.open) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") panel.close(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [panel]);

  // Floating capsule once the page scrolls — the bar detaches into a glass pill.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
  // Panel rows carry query URLs (/telos/library?s=x) — match by path for the
  // page-level active state; precise section highlighting stays in-page.
  const isActiveHref = (href: string) => {
    const path = href.split("?")[0];
    return pathname === path || pathname.startsWith(path + "/");
  };
  const systemActive = systemNav.some((s) => isActive(s.href));

  const systemsGroups: NavPanelGroup[] = [
    { kicker: "Run the machine", items: systemNav.slice(0, 4) },
    { kicker: "Understand it", items: systemNav.slice(4) },
  ];

  return (
    <header className="sticky top-0 z-50">
      <div
        className={cn(
          "transition-all duration-300",
          scrolled
            ? "mx-2 sm:mx-4 lg:mx-6 mt-2 rounded-2xl glass-strong glow-md"
            : "border-b border-hairline edge-top backdrop-blur-xl"
        )}
        style={!scrolled ? { background: "color-mix(in oklab, var(--bg-deep) 82%, transparent)" } : undefined}
      >
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6">
        <div className="flex items-center h-16 gap-3 lg:gap-5" ref={navRef}>
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
            <span className="relative grid place-items-center">
              <Image
                src="/lifeos-logo.png"
                alt="LifeOS"
                width={28}
                height={28}
                className="h-7 w-7 object-contain"
                style={{ filter: "hue-rotate(var(--brain-tint, 0deg))" }}
              />
              <span
                className="absolute -right-0.5 -top-0.5 w-1.5 h-1.5 rounded-full anim-breathe"
                style={{ background: "var(--positive)", boxShadow: "0 0 8px var(--positive)" }}
                aria-hidden
              />
            </span>
            <span className="flex flex-col leading-none">
              <span
                className="text-[17px] font-bold tracking-[0.28em] text-foreground"
                style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
              >
                PULSE
              </span>
              <span className="text-[9px] font-mono tracking-[0.3em] text-muted-foreground">
                LIFEOS
              </span>
            </span>
          </Link>

          {/* Demo-data indicator — only when the bundled sample data is in use */}
          {process.env.NEXT_PUBLIC_DEMO_MODE === "1" && (
            <span
              title="You are viewing bundled sample data, not a live LifeOS instance."
              className="hidden sm:inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full border border-hairline text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground shrink-0"
              style={{ background: "color-mix(in oklab, var(--neon) 10%, transparent)" }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full anim-breathe"
                style={{ background: "var(--neon)", boxShadow: "0 0 8px var(--glow)" }}
                aria-hidden
              />
              Demo data
            </span>
          )}

          {/* Life nav — TELOS carries the mega-panel, the rest are plain links */}
          <nav className="hidden lg:flex flex-1 items-center justify-center gap-0.5">
            {lifeNav.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              const hasPanel = item.href === "/telos";
              const panelOpen = hasPanel && panel.open === "telos";
              return (
                <div
                  key={item.href}
                  className="relative"
                  onPointerEnter={hasPanel ? () => panel.enter("telos") : panel.leave}
                  onPointerLeave={hasPanel ? panel.leave : undefined}
                >
                  <Link
                    href={item.href}
                    aria-expanded={hasPanel ? panelOpen : undefined}
                    className={cn(
                      "relative flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium tracking-[0.08em] rounded-md transition-colors",
                      active || panelOpen ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {item.label}
                    {hasPanel && (
                      <ChevronDown
                        className={cn("w-3 h-3 -mr-0.5 opacity-60 transition-transform duration-200", panelOpen && "rotate-180")}
                      />
                    )}
                    {active && (
                      <span
                        className="absolute left-2.5 right-2.5 -bottom-[9px] h-[2px] rounded-full"
                        style={{ background: "var(--neon)", boxShadow: "0 0 10px var(--glow)" }}
                      />
                    )}
                  </Link>
                  {panelOpen && (
                    <HoverPanel
                      groups={telosPanel}
                      columns={3}
                      isActiveHref={isActiveHref}
                      onNavigate={panel.close}
                    />
                  )}
                </div>
              );
            })}
          </nav>

          {/* Right cluster */}
          <div className="flex items-center gap-1.5 shrink-0 ml-auto lg:ml-0">
            {/* Command palette trigger */}
            <button
              onClick={openCommand}
              title="Command palette (⌘K)"
              className="hidden sm:flex items-center gap-2 h-9 pl-2.5 pr-2 rounded-lg border border-hairline text-muted-foreground hover:text-foreground hover:border-hairline-strong transition-colors"
            >
              <Command className="w-3.5 h-3.5" />
              <span className="text-[12px] font-mono hidden xl:inline">Search</span>
              <kbd className="hidden xl:inline-flex items-center px-1.5 h-5 rounded bg-surface-1 text-[10px] font-mono">
                ⌘K
              </kbd>
            </button>

            {/* Systems — same hover-panel idiom as TELOS */}
            <div
              className="relative hidden lg:block"
              onPointerEnter={() => panel.enter("systems")}
              onPointerLeave={panel.leave}
            >
              <button
                onClick={() => panel.toggle("systems")}
                aria-expanded={panel.open === "systems"}
                className={cn(
                  "flex items-center gap-1.5 h-9 px-2.5 rounded-lg border transition-colors text-[13px] font-medium",
                  panel.open === "systems" || systemActive
                    ? "border-hairline-strong text-foreground bg-surface-1"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-hairline"
                )}
              >
                Systems
                <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200", panel.open === "systems" && "rotate-180")} />
              </button>
              {panel.open === "systems" && (
                <HoverPanel
                  groups={systemsGroups}
                  columns={2}
                  isActiveHref={isActiveHref}
                  onNavigate={panel.close}
                  align="right"
                />
              )}
            </div>

            <TabFreshnessPill className="shrink-0 hidden 2xl:flex" />

            <div className="w-px h-6 bg-hairline hidden lg:block mx-0.5" />

            <ThemeSwitcher />
            <ModeToggle />

            <button
              onClick={toggleObserverMode}
              title={observerMode ? "Observer mode ON — sensitive data hidden" : "Toggle observer mode"}
              className={cn(
                "grid place-items-center w-9 h-9 rounded-lg border transition-colors",
                observerMode
                  ? "border-warn/40 text-warn"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-hairline"
              )}
              style={observerMode ? { background: "color-mix(in oklab, var(--warn) 14%, transparent)" } : undefined}
            >
              {observerMode ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
            </button>

            {/* Mobile */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="grid lg:hidden place-items-center w-10 h-10 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-1 transition-colors"
              aria-label="Menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          ref={mobileRef}
          className="lg:hidden border-t border-hairline backdrop-blur-xl rounded-b-2xl overflow-hidden"
          style={{ background: "color-mix(in oklab, var(--bg-deep) 94%, transparent)" }}
        >
          <nav className="flex flex-col px-4 py-3 gap-0.5 max-h-[70vh] overflow-y-auto">
            <button
              onClick={() => { setMobileOpen(false); openCommand(); }}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-1 mb-1"
            >
              <Command className="w-4 h-4" />
              <span className="text-[14px] font-mono">Search…</span>
            </button>
            <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">Life</div>
            {lifeNav.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2.5 text-[15px] tracking-wide rounded-lg transition-colors",
                    active ? "bg-surface-2 text-foreground font-semibold" : "font-medium text-muted-foreground hover:text-foreground hover:bg-surface-1"
                  )}>
                  <Icon className="w-4 h-4" style={active ? { color: "var(--neon)" } : undefined} />{item.label}
                </Link>
              );
            })}
            {telosPanel.slice(1).map((g) => (
              <div key={g.kicker}>
                <div className="px-3 py-1 mt-2 text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">TELOS · {g.kicker}</div>
                {g.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link key={item.href} href={item.href}
                      className="flex items-center gap-2.5 px-3 py-2 text-[13px] tracking-wide rounded-lg transition-colors text-muted-foreground hover:text-foreground hover:bg-surface-1">
                      <Icon className="w-3.5 h-3.5" />{item.label}
                    </Link>
                  );
                })}
              </div>
            ))}
            <div className="px-3 py-1 mt-2 text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">Systems</div>
            {systemNav.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 text-[13px] tracking-wide rounded-lg transition-colors",
                    active ? "bg-surface-2 text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-surface-1"
                  )}>
                  <Icon className="w-3.5 h-3.5" style={active ? { color: "var(--neon)" } : undefined} />{item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}

      </div>

      <CommandPalette />

      {/* Panel entrance — fade + 4px lift, theme-safe, reduced-motion aware */}
      <style>{`
        .omm-panel-enter { animation: pulse-panel-in 160ms ease-out; }
        @keyframes pulse-panel-in {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) { .omm-panel-enter { animation: none; } }
      `}</style>
    </header>
  );
}
