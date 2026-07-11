// DEPRECATED 2026-07-11: replaced by the TELOS hover mega-panel in AppHeader.tsx
// (one bar, depth on hover). No longer mounted anywhere. Safe to delete after a
// few sessions of the new nav proving itself.
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface LibrarySectionMeta {
  key: string;
  title: string;
  count: number;
}

interface LogCounts {
  decisions: number;
  mistakes: number;
  learnings: number;
  sessions: number;
}

const SYSTEM_TABS: Array<{ key: keyof LogCounts; title: string }> = [
  { key: "decisions", title: "Decisions" },
  { key: "mistakes", title: "Mistakes" },
  { key: "learnings", title: "Learnings" },
  { key: "sessions", title: "Sessions" },
];

/** Sticky glass sub-navigation for the TELOS surface. Two conceptual clusters
    made legible at a glance: Overview stands alone, then The Person (library
    sections) and The System (logs + session timeline), each behind a labelled,
    token-separated group. Static horizontal bar — always glanceable, no
    hover-to-discover cost. */
export function TelosSubnav({ active }: { active: string }) {
  const [sections, setSections] = useState<LibrarySectionMeta[]>([]);
  const [logs, setLogs] = useState<LogCounts | null>(null);

  useEffect(() => {
    fetch("/api/telos/library")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.sections && setSections(d.sections.map((s: LibrarySectionMeta) => ({ key: s.key, title: s.title, count: s.count }))))
      .catch(() => {});
    fetch("/api/memory/logs")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setLogs({
        decisions: d.decisions?.length ?? 0,
        mistakes: d.mistakes?.length ?? 0,
        learnings: d.learnings?.length ?? 0,
        sessions: d.sessions?.length ?? 0,
      }))
      .catch(() => {});
  }, []);

  // Count-gated system tabs (Decisions/Mistakes/Learnings/Sessions hide when
  // empty). Operating Model has no count — it renders unconditionally, always
  // the last stop under The Machine, so the system map is always reachable.
  const systemTabs = SYSTEM_TABS.filter((t) => (logs?.[t.key] ?? 0) > 0);

  const tab = (key: string, title: string, href: string) => {
    const on = active === key;
    return (
      <Link
        key={key}
        href={href}
        className="relative shrink-0 px-2.5 py-2 text-[11px] font-mono uppercase tracking-[0.14em] transition-colors whitespace-nowrap"
        style={{ color: on ? "var(--neon)" : "hsl(var(--muted-foreground))" }}
      >
        {title}
        {on && (
          <span
            className="absolute left-2 right-2 bottom-[3px] h-[2px] rounded-full"
            style={{ background: "var(--neon)", boxShadow: "0 0 10px var(--glow)" }}
          />
        )}
      </Link>
    );
  };

  // Non-interactive cluster label — a dim neon dot + small caps, marking the
  // start of each conceptual group.
  const clusterLabel = (text: string) => (
    <span
      className="shrink-0 inline-flex items-center gap-1.5 pl-3 pr-1.5 text-[9px] font-mono uppercase tracking-[0.24em] select-none"
      style={{ color: "hsl(var(--muted-foreground))", opacity: 0.85 }}
      aria-hidden
    >
      <span
        className="w-1 h-1 rounded-full"
        style={{ background: "var(--neon)", boxShadow: "0 0 5px var(--neon)", opacity: 0.8 }}
      />
      {text}
    </span>
  );

  const separator = (
    <span className="shrink-0 w-px h-4 mx-1" style={{ background: "var(--hairline-strong)" }} aria-hidden />
  );

  return (
    <nav
      aria-label="TELOS sections"
      className="sticky z-40 -mx-5 sm:-mx-8 lg:-mx-10 px-5 sm:px-8 lg:px-10 backdrop-blur-xl"
      style={{
        top: "var(--app-header-h)",
        background: "color-mix(in oklab, var(--bg-deep) 72%, transparent)",
        borderBottom: "1px solid var(--hairline)",
      }}
    >
      <div className="flex items-center gap-0.5 overflow-x-auto py-1">
        {tab("overview", "Overview", "/telos")}

        {sections.length > 0 && (
          <>
            {separator}
            {clusterLabel("The Man")}
            {sections.map((s) => tab(s.key, s.title, `/telos/library?s=${s.key}`))}
          </>
        )}

        <>
          {separator}
          {clusterLabel("The Machine")}
          {systemTabs.map((t) => tab(t.key, t.title, `/telos/library?s=${t.key}`))}
          {tab("operating-model", "Operating Model", "/telos/library?s=operating-model")}
        </>
      </div>
    </nav>
  );
}
