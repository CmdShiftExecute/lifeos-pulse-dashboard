"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Compass, ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/kit/Reveal";
import { Section } from "@/components/kit/Section";
import { cleanMd, type LibrarySection, type Logs } from "@/components/kit/ShowMore";

/* Signals — the person behind the system. Three grouped shelves:
   Inner Compass (beliefs, wisdom) · Resources (mental models, books) ·
   System (decision log, mistakes log, learnings). Every card is a 3-item
   snippet; "Read more" opens the full /telos/library page for that section.
   All content is live: /api/telos/library + /api/memory/logs. */

function SnippetCard({
  title,
  count,
  href,
  lines,
  from,
  delay,
}: {
  title: string;
  count: number;
  href: string;
  lines: Array<{ meta?: string; text: string }>;
  from: "left" | "right" | "up";
  delay: number;
}) {
  return (
    <Reveal from={from} delay={delay} className="h-full">
      <div className="glass hover-lift rounded-xl p-4 h-full flex flex-col">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">{title}</span>
          <span className="text-[10px] font-mono text-muted-foreground tabular-nums">{String(count).padStart(2, "0")}</span>
        </div>
        <ul className="flex flex-col gap-2 flex-1" data-sensitive="">
          {lines.map((l, j) => (
            <li key={j} className="flex gap-2 text-[13px] leading-snug text-muted-foreground">
              <span className="mt-[7px] w-1 h-1 rounded-full shrink-0" style={{ background: "var(--neon-3)" }} />
              <span className="min-w-0">
                {l.meta && <span className="block text-[10px] font-mono text-muted-foreground/80 mb-0.5">{l.meta}</span>}
                {l.text.length > 120 ? l.text.slice(0, 118).trim() + "…" : l.text}
              </span>
            </li>
          ))}
        </ul>
        <Link
          href={href}
          className="mt-3 inline-flex items-center gap-1 self-start text-[12px] font-mono px-3 py-1.5 rounded-full text-muted-foreground hover:text-foreground transition-colors"
          style={{ background: "var(--surface-1)", border: "1px solid var(--hairline)" }}
        >
          read more <ArrowUpRight className="w-3 h-3" />
        </Link>
      </div>
    </Reveal>
  );
}

function Shelf({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-8 first:mt-0">
      <Reveal>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-[11px] font-mono uppercase tracking-[0.24em] text-muted-foreground shrink-0">{label}</span>
          <span className="h-px flex-1" style={{ background: "var(--hairline)" }} aria-hidden />
        </div>
      </Reveal>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{children}</div>
    </div>
  );
}

const snippetOf = (s: LibrarySection) =>
  s.groups.flatMap((g) => g.items).slice(0, 3).map((text) => ({ text: cleanMd(text) }));

export function PersonSystem() {
  const [lib, setLib] = useState<LibrarySection[]>([]);
  const [logs, setLogs] = useState<Logs | null>(null);

  useEffect(() => {
    fetch("/api/telos/library")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.sections && setLib(d.sections))
      .catch(() => {});
    fetch("/api/memory/logs")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setLogs(d))
      .catch(() => {});
  }, []);

  const byKey = (k: string) => lib.find((s) => s.key === k);
  const compass = ["beliefs", "wisdom"].map(byKey).filter(Boolean) as LibrarySection[];
  const resources = ["models", "books"].map(byKey).filter(Boolean) as LibrarySection[];
  const sysCards: Array<{ key: string; title: string; count: number; lines: Array<{ meta?: string; text: string }> }> = [];
  if (logs) {
    if (logs.decisions.length > 0)
      sysCards.push({
        key: "decisions",
        title: "Decision Log",
        count: logs.decisions.length,
        lines: logs.decisions.slice(0, 3).map((d) => ({ meta: [d.date, d.domain].filter(Boolean).join(" · "), text: d.text })),
      });
    if (logs.mistakes.length > 0)
      sysCards.push({
        key: "mistakes",
        title: "Mistakes Log",
        count: logs.mistakes.length,
        lines: logs.mistakes.slice(0, 3).map((m) => ({ meta: [m.date, m.domain].filter(Boolean).join(" · "), text: m.text })),
      });
    if (logs.learnings.length > 0)
      sysCards.push({
        key: "learnings",
        title: "Learnings",
        count: logs.learnings.length,
        lines: logs.learnings.slice(0, 3).map((l) => ({ meta: `${l.date} · ${l.category}`, text: l.title })),
      });
  }

  if (compass.length === 0 && resources.length === 0 && sysCards.length === 0) return null;

  const dir = (i: number) => (i % 2 === 0 ? "left" : "right") as "left" | "right";

  return (
    <Section
      icon={Compass}
      kicker="The person behind the system"
      title="Signals"
      count={compass.length + resources.length + sysCards.length}
    >
      {compass.length > 0 && (
        <Shelf label="Inner Compass">
          {compass.map((s, i) => (
            <SnippetCard key={s.key} title={s.title} count={s.count} href={`/telos/library?s=${s.key}`} lines={snippetOf(s)} from={dir(i)} delay={i * 40} />
          ))}
        </Shelf>
      )}
      {resources.length > 0 && (
        <Shelf label="Resources">
          {resources.map((s, i) => (
            <SnippetCard key={s.key} title={s.title} count={s.count} href={`/telos/library?s=${s.key}`} lines={snippetOf(s)} from={dir(i)} delay={i * 40} />
          ))}
        </Shelf>
      )}
      {sysCards.length > 0 && (
        <Shelf label="System">
          {sysCards.map((c, i) => (
            <SnippetCard key={c.key} title={c.title} count={c.count} href={`/telos/library?s=${c.key}`} lines={c.lines} from={dir(i)} delay={i * 40} />
          ))}
        </Shelf>
      )}
    </Section>
  );
}
