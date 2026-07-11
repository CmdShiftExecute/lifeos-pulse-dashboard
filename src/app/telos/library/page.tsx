"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Compass,
  Sparkles,
  Brain,
  Library,
  ScrollText,
  GraduationCap,
  Scale,
  AlertTriangle,
  Lightbulb,
  ArrowUpRight,
  History,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Reveal } from "@/components/kit/Reveal";
import { Section } from "@/components/kit/Section";
import { ShowMoreButton, cleanMd, type LibrarySection, type LogLine, type Logs } from "@/components/kit/ShowMore";
import MarkdownRenderer from "@/components/wiki/MarkdownRenderer";
import { OperatingModelView } from "./operating-model";

/* /telos/library — full-text reading surface for the person-behind-the-system
   content (?s=beliefs|wisdom|models|books|narratives|lessons) and the system
   logs (?s=decisions|mistakes|learnings). No query → index of everything.
   All data live from /api/telos/library + /api/memory/logs. */

const ICONS: Record<string, LucideIcon> = {
  beliefs: Compass,
  wisdom: Sparkles,
  models: Brain,
  books: Library,
  narratives: ScrollText,
  lessons: GraduationCap,
  decisions: Scale,
  mistakes: AlertTriangle,
  learnings: Lightbulb,
  sessions: History,
};

const LOG_META: Record<string, { title: string; kicker: string }> = {
  decisions: { title: "Decision Log", kicker: "What he ruled, one line each" },
  mistakes: { title: "Mistakes Log", kicker: "Misses and their counter-rules" },
  learnings: { title: "Learnings", kicker: "What the system captured lately" },
};

function Kicker({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-4 text-[11px] font-mono uppercase tracking-[0.28em] text-muted-foreground">
      <span className="w-1.5 h-1.5 rounded-full anim-breathe" style={{ background: "var(--positive)", boxShadow: "0 0 8px var(--positive)" }} />
      {text}
    </div>
  );
}

/* ---------- full library section (beliefs / wisdom / models / books / …) ---------- */

/** What one item in each section is called — feeds the count chip. */
const NOUN: Record<string, string> = {
  beliefs: "beliefs",
  wisdom: "entries",
  models: "models",
  books: "books",
  narratives: "narratives",
  lessons: "lessons",
};

const PREVIEW = 3;

function ItemCard({ item, i, reveal }: { item: string; i: number; reveal: boolean }) {
  const card = (
    <div className="glass rounded-xl p-4 flex items-start gap-2.5">
      <span className="mt-[9px] w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--neon-3)", boxShadow: "0 0 6px var(--neon-3)" }} />
      <p className="text-[14px] leading-relaxed text-foreground min-w-0" data-sensitive="">
        {cleanMd(item)}
      </p>
    </div>
  );
  if (!reveal) return card;
  return (
    <Reveal key={i} delay={Math.min(i, 8) * 35} from={i % 2 === 0 ? "left" : "right"}>
      {card}
    </Reveal>
  );
}

/** First PREVIEW items visible, remainder behind an animated read-more. */
function GroupList({ items }: { items: string[] }) {
  const [open, setOpen] = useState(false);
  const rest = items.length - PREVIEW;
  return (
    <div className="flex flex-col gap-3 max-w-[880px]">
      {items.slice(0, PREVIEW).map((item, i) => (
        <ItemCard key={i} item={item} i={i} reveal />
      ))}
      {rest > 0 && (
        <>
          <div className="grid transition-[grid-template-rows] duration-500 ease-out" style={{ gridTemplateRows: open ? "1fr" : "0fr" }}>
            <div className="overflow-hidden flex flex-col gap-3">
              {items.slice(PREVIEW).map((item, i) => (
                <ItemCard key={i} item={item} i={i} reveal={false} />
              ))}
            </div>
          </div>
          <ShowMoreButton open={open} label={`read more · +${rest}`} onClick={() => setOpen((v) => !v)} />
        </>
      )}
    </div>
  );
}

function LibraryView({ section }: { section: LibrarySection }) {
  const Icon = ICONS[section.key] ?? Compass;
  return (
    <>
      <section className="pt-8 sm:pt-10">
        <Kicker text="LifeOS · TELOS" />
        <h1 className="text-3xl sm:text-4xl font-bold leading-[1.1] text-foreground">{section.title}</h1>
        <div className="mt-3 flex items-center gap-3 text-[11px] font-mono text-muted-foreground">
          <span className="tabular-nums">{section.count} entries</span>
          {section.updated && <span>updated {section.updated.slice(0, 10)}</span>}
        </div>
        {section.intro && (
          <p className="mt-5 text-[15px] leading-relaxed text-muted-foreground max-w-[68ch]" data-sensitive="">
            {section.intro}
          </p>
        )}
      </section>

      {section.groups.map((g, gi) => (
        <Section
          key={g.heading || gi}
          icon={Icon}
          kicker={section.title}
          title={g.heading || section.title}
          count={g.items.length}
          countLabel={NOUN[section.key] ?? "entries"}
        >
          <GroupList items={g.items} />
        </Section>
      ))}
    </>
  );
}

/** Log rows: first PREVIEW visible, remainder behind an animated read-more. */
function LogRows({ rows }: { rows: Array<{ meta?: string; text: string }> }) {
  const [open, setOpen] = useState(false);
  const rest = rows.length - PREVIEW;
  const row = (r: { meta?: string; text: string }, i: number, first: boolean) => (
    <div
      key={i}
      className="px-4 sm:px-5 py-3.5"
      style={{ borderTop: first ? "none" : "1px solid var(--hairline)" }}
      data-sensitive=""
    >
      {r.meta && (
        <div className="text-[10px] font-mono uppercase tracking-[0.14em] mb-1" style={{ color: "var(--neon)" }}>
          {r.meta}
        </div>
      )}
      <p className="text-[13px] leading-relaxed text-foreground">{r.text}</p>
    </div>
  );
  return (
    <div className="max-w-[980px]">
      <div className="glass rounded-xl overflow-hidden">
        {rows.slice(0, PREVIEW).map((r, i) => row(r, i, i === 0))}
        {rest > 0 && (
          <div className="grid transition-[grid-template-rows] duration-500 ease-out" style={{ gridTemplateRows: open ? "1fr" : "0fr" }}>
            <div className="overflow-hidden">{rows.slice(PREVIEW).map((r, i) => row(r, i, false))}</div>
          </div>
        )}
      </div>
      {rest > 0 && (
        <div className="mt-3">
          <ShowMoreButton open={open} label={`read more · +${rest}`} onClick={() => setOpen((v) => !v)} />
        </div>
      )}
    </div>
  );
}

/* ---------- system log views ---------- */

function LogView({ kind, logs }: { kind: "decisions" | "mistakes" | "learnings"; logs: Logs }) {
  const meta = LOG_META[kind];
  const Icon = ICONS[kind];
  const rows =
    kind === "learnings"
      ? logs.learnings.map((l) => ({ meta: `${l.date} · ${l.category}`, text: l.title }))
      : (logs[kind] as LogLine[]).map((r) => ({ meta: [r.date, r.domain].filter(Boolean).join(" · "), text: r.text }));
  return (
    <>
      <section className="pt-8 sm:pt-10">
        <Kicker text="LifeOS · System" />
        <h1 className="text-3xl sm:text-4xl font-bold leading-[1.1] text-foreground">{meta.title}</h1>
        <div className="mt-3 text-[11px] font-mono text-muted-foreground tabular-nums">{rows.length} entries · newest first</div>
      </section>

      <Section icon={Icon} kicker={meta.kicker} title="Entries" count={rows.length} countLabel="entries">
        <LogRows rows={rows} />
      </Section>
    </>
  );
}

/* ---------- sessions view (dated markdown timeline, not one-line rows) ---------- */

/** Drop the redundant leading date (single or range) from the H2 title, since
    the date already shows as the section kicker. */
function sessionTitle(raw: string): string {
  const stripped = raw
    .replace(/^\d{4}-\d{2}-\d{2}(\s*[→\-–—]\s*\d{4}-\d{2}-\d{2})?\s*[·\-–—]\s*/, "")
    .trim();
  return stripped || raw;
}

/** Flatten markdown to plain prose for the uniform collapsed preview. */
function previewText(md: string): string {
  return md
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/** One session: collapsed to a uniform 4-line preview, expands to full markdown. */
function SessionCard({ s }: { s: NonNullable<Logs["sessions"]>[number] }) {
  const [open, setOpen] = useState(false);
  return (
    <Section icon={History} kicker={s.date ?? "session"} title={sessionTitle(s.title)}>
      <div className="glass rounded-xl p-5 sm:p-6 max-w-[980px]">
        {open ? (
          <div data-sensitive="">
            <MarkdownRenderer content={s.body} />
          </div>
        ) : (
          <p className="text-[14px] leading-relaxed text-muted-foreground line-clamp-4" data-sensitive="">
            {previewText(s.body)}
          </p>
        )}
        <div className="mt-4">
          <ShowMoreButton open={open} label="read more" onClick={() => setOpen((v) => !v)} />
        </div>
      </div>
    </Section>
  );
}

function SessionsView({ sessions }: { sessions: NonNullable<Logs["sessions"]> }) {
  return (
    <>
      <section className="pt-8 sm:pt-10">
        <Kicker text="LifeOS · Machine" />
        <h1 className="text-3xl sm:text-4xl font-bold leading-[1.1] text-foreground">Session Timeline</h1>
        <div className="mt-3 text-[11px] font-mono text-muted-foreground tabular-nums">
          {sessions.length} session{sessions.length === 1 ? "" : "s"} · newest first
        </div>
        <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground max-w-[64ch]">
          The narrative of what we built each working session — the arc behind the one-line rulings in the Decisions log.
        </p>
      </section>

      {sessions.map((s, i) => (
        <SessionCard key={i} s={s} />
      ))}
    </>
  );
}

/* ---------- learnings view (fleshed-out, not one-line rows) ---------- */

function ratingToken(rating?: number | null): string {
  if (rating == null) return "hsl(var(--muted-foreground))";
  if (rating <= 4) return "var(--danger)";
  if (rating <= 6) return "var(--warn)";
  return "var(--positive)";
}

function LearningRows({ items }: { items: NonNullable<Logs["learnings"]> }) {
  const [open, setOpen] = useState(false);
  const rest = items.length - PREVIEW;
  const row = (l: NonNullable<Logs["learnings"]>[number], i: number, first: boolean) => {
    const headline = l.feedback || l.title;
    const tone = ratingToken(l.rating);
    return (
      <div
        key={i}
        className="px-4 sm:px-5 py-4"
        style={{ borderTop: first ? "none" : "1px solid var(--hairline)" }}
        data-sensitive=""
      >
        <div className="flex items-center gap-2 mb-1.5">
          {l.rating != null && (
            <span
              className="text-[10px] font-mono px-1.5 py-0.5 rounded-full tabular-nums shrink-0"
              style={{ color: tone, background: "var(--surface-1)", border: `1px solid color-mix(in oklab, ${tone} 35%, transparent)` }}
            >
              {l.rating}/10
            </span>
          )}
          <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground">
            {[l.date, l.category].filter(Boolean).join(" · ")}
          </span>
        </div>
        <p className="text-[14px] font-medium leading-snug text-foreground">{headline}</p>
        {l.summary && (
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{l.summary}</p>
        )}
      </div>
    );
  };
  return (
    <div className="max-w-[980px]">
      <div className="glass rounded-xl overflow-hidden">
        {items.slice(0, PREVIEW).map((l, i) => row(l, i, i === 0))}
        {rest > 0 && (
          <div className="grid transition-[grid-template-rows] duration-500 ease-out" style={{ gridTemplateRows: open ? "1fr" : "0fr" }}>
            <div className="overflow-hidden">{items.slice(PREVIEW).map((l, i) => row(l, i, false))}</div>
          </div>
        )}
      </div>
      {rest > 0 && (
        <div className="mt-3">
          <ShowMoreButton open={open} label={`read more · +${rest}`} onClick={() => setOpen((v) => !v)} />
        </div>
      )}
    </div>
  );
}

function LearningsView({ logs }: { logs: Logs }) {
  return (
    <>
      <section className="pt-8 sm:pt-10">
        <Kicker text="LifeOS · Machine" />
        <h1 className="text-3xl sm:text-4xl font-bold leading-[1.1] text-foreground">Learnings</h1>
        <div className="mt-3 text-[11px] font-mono text-muted-foreground tabular-nums">
          {logs.learnings.length} signal{logs.learnings.length === 1 ? "" : "s"} · newest first
        </div>
        <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground max-w-[64ch]">
          What the autonomic loop captured lately — each with the feedback that triggered it and the context behind it.
        </p>
      </section>
      <Section icon={Lightbulb} kicker="Captured feedback & context" title="Signals" count={logs.learnings.length} countLabel="signals">
        <LearningRows items={logs.learnings} />
      </Section>
    </>
  );
}

/* ---------- index (no ?s=) ---------- */

/* ---------- index (no ?s=) ---------- */

function IndexView({ sections, logs }: { sections: LibrarySection[]; logs: Logs | null }) {
  const cards: Array<{ key: string; title: string; count: number; hint: string }> = [
    ...sections.map((s) => ({ key: s.key, title: s.title, count: s.count, hint: s.groups[0]?.items[0] ?? "" })),
    ...(logs?.decisions.length ? [{ key: "decisions", title: "Decision Log", count: logs.decisions.length, hint: logs.decisions[0]?.text ?? "" }] : []),
    ...(logs?.mistakes.length ? [{ key: "mistakes", title: "Mistakes Log", count: logs.mistakes.length, hint: logs.mistakes[0]?.text ?? "" }] : []),
    ...(logs?.learnings.length ? [{ key: "learnings", title: "Learnings", count: logs.learnings.length, hint: logs.learnings[0]?.title ?? "" }] : []),
    ...(logs?.sessions?.length ? [{ key: "sessions", title: "Session Timeline", count: logs.sessions.length, hint: sessionTitle(logs.sessions[0]?.title ?? "") }] : []),
  ];
  return (
    <>
      <section className="pt-8 sm:pt-10">
        <Kicker text="LifeOS · TELOS" />
        <h1 className="text-3xl sm:text-4xl font-bold leading-[1.1] text-foreground">Library</h1>
        <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground max-w-[62ch]">
          The person behind the system, in full: beliefs, wisdom, mental models, books, narratives, and the system&apos;s own logs.
        </p>
      </section>
      <div className="mt-10 grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
        {cards.map((c, i) => {
          const Icon = ICONS[c.key] ?? Compass;
          return (
            <Reveal key={c.key} delay={i * 40} from={i % 2 === 0 ? "left" : "right"}>
              <Link href={`/telos/library?s=${c.key}`} className="block h-full">
                <div className="glass hover-lift rounded-xl p-4 h-full">
                  <div className="flex items-center justify-between mb-2">
                    <span className="grid place-items-center w-8 h-8 rounded-lg" style={{ color: "var(--neon)", background: "var(--surface-1)" }}>
                      <Icon className="w-4 h-4" />
                    </span>
                    <span className="text-[11px] font-mono text-muted-foreground tabular-nums">{String(c.count).padStart(2, "0")}</span>
                  </div>
                  <h3 className="text-[15px] font-semibold text-foreground">{c.title}</h3>
                  {c.hint && (
                    <p className="mt-1.5 text-[12px] leading-snug text-muted-foreground line-clamp-2" data-sensitive="">
                      {cleanMd(c.hint)}
                    </p>
                  )}
                  <span className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-mono text-muted-foreground">
                    open <ArrowUpRight className="w-3 h-3" />
                  </span>
                </div>
              </Link>
            </Reveal>
          );
        })}
      </div>
    </>
  );
}

/* ---------- page ---------- */

function LibraryPageInner() {
  const sp = useSearchParams();
  const s = sp.get("s");
  const [sections, setSections] = useState<LibrarySection[] | null>(null);
  const [logs, setLogs] = useState<Logs | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/telos/library")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("HTTP " + r.status))))
      .then((d) => setSections(d.sections ?? []))
      .catch((e) => setError(String(e)));
    fetch("/api/memory/logs")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setLogs(d))
      .catch(() => {});
  }, []);

  const isLog = s === "decisions" || s === "mistakes" || s === "learnings";
  const isSessions = s === "sessions";
  const section = !isLog && !isSessions && s && sections ? sections.find((x) => x.key === s) : null;

  return (
    <div className="px-5 sm:px-8 lg:px-10 pb-24 max-w-[1400px] mx-auto">
      {s === "operating-model" ? (
        // The Machine → Operating Model. Fully self-contained (its own /api/omm
        // fetch + loading/error states), so it renders even if the library
        // fetch above fails.
        <OperatingModelView />
      ) : (
      <>
      {error && (
        <div className="glass rounded-xl p-4 mt-8 flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: "var(--danger)", boxShadow: "0 0 8px var(--danger)" }} />
          <p className="text-[13px]" style={{ color: "var(--danger)" }}>Failed to load library — {error}</p>
        </div>
      )}
      {!error && sections === null && (
        <div className="pt-10 text-[13px] font-mono text-muted-foreground">Loading library…</div>
      )}
      {!error && sections !== null && (
        s === "learnings" && logs ? (
          <LearningsView logs={logs} />
        ) : isLog && logs ? (
          <LogView kind={s as "decisions" | "mistakes"} logs={logs} />
        ) : isSessions && logs?.sessions?.length ? (
          <SessionsView sessions={logs.sessions} />
        ) : section ? (
          <LibraryView section={section} />
        ) : s && !isLog && !isSessions ? (
          <div className="glass rounded-xl p-4 mt-8">
            <p className="text-[13px] text-muted-foreground">No section named &ldquo;{s}&rdquo; has content yet.</p>
          </div>
        ) : (
          <IndexView sections={sections} logs={logs} />
        )
      )}
      </>
      )}
    </div>
  );
}

export default function TelosLibraryPage() {
  return (
    <Suspense fallback={<div className="px-8 pt-10 text-[13px] font-mono text-muted-foreground">Loading library…</div>}>
      <LibraryPageInner />
    </Suspense>
  );
}
