"use client";

/* /telos/library?s=operating-model — the living HTML version of the OMM
   (Obsidian: LifeOS-index-and-OMM.md, Part 2). A system map, not a wall of
   tables: what boots when, the per-prompt hook chain, the scheduled machine,
   where every kind of memory is written and read, the guardrails, and the
   honest gaps. All dynamic data comes live from /api/omm — hooks and jobs are
   parsed from settings.json + the Pulse TOMLs at request time, so the page
   never drifts from the running system. Nothing is faked on error. */

import { Component, useEffect, useState, type ReactNode } from "react";
import { Reveal } from "@/components/kit/Reveal";
import OperatingModelMap from "./OperatingModelMap";
import {
  Power,
  ScrollText,
  FileCode2,
  ShieldCheck,
  Zap,
  Clock,
  Database,
  Brain,
  Boxes,
  Activity,
  AlertTriangle,
  ChevronDown,
  ExternalLink,
} from "lucide-react";

/* ------------------------------- types ---------------------------------- */

interface HookEntry {
  event: string;
  matcher: string;
  command: string;
  fileName: string;
}
interface JobEntry {
  name: string;
  schedule: string | null;
  type: string | null;
  command: string | null;
  output: string | null;
  enabled: boolean;
  source: "system" | "user";
  lastRun: string | null;
}
interface LaunchdEntry {
  name: string;
  label: string;
  schedule: string;
  what: string;
  installed: boolean;
  lastRun: string | null;
}
interface Omm {
  ts: string;
  hooks: { hooks: HookEntry[]; total: number; byEvent: Record<string, number> };
  jobs: JobEntry[];
  launchd: LaunchdEntry[];
  memoryState: { reviewState: any; health: any };
  freshness: { overall_grade?: string; overall_pct?: number; stale_count?: number; total?: number } | null;
  kpis: { generated_at?: string } | null;
  counts: {
    hooks: number;
    hookEvents: number;
    jobsEnabled: number;
    jobsTotal: number;
    launchdInstalled: number;
    tools: number;
  };
}

/* ----------------------------- utilities -------------------------------- */

/** Human "2h ago" from an ISO string; "—" when we genuinely don't know. */
function relTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const delta = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(delta)) return "—";
  const m = Math.floor(delta / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/** Turn the cron strings actually present in the Pulse TOMLs into plain
    English. Falls back to the raw expression for anything unrecognised. */
function cronToHuman(cron: string | null): string {
  if (!cron) return "—";
  const map: Record<string, string> = {
    "* * * * *": "every minute",
    "*/5 * * * *": "every 5 min",
    "*/15 * * * *": "every 15 min",
    "*/30 * * * *": "every 30 min",
    "0 * * * *": "hourly",
    "17 * * * *": "hourly at :17",
    "0 3 * * *": "daily · 03:00",
    "0 4 * * 0": "weekly · Sun 04:00",
    "0 6 * * *": "daily · 06:00",
    "0 7 * * *": "daily · 07:00",
    "0 23 * * *": "daily · 23:00",
  };
  return map[cron] ?? cron;
}

/* ------------------------------- pieces --------------------------------- */

function Kicker({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-4 text-[11px] font-mono uppercase tracking-[0.28em] text-muted-foreground">
      <span className="w-1.5 h-1.5 rounded-full anim-breathe" style={{ background: "var(--neon)", boxShadow: "0 0 8px var(--glow)" }} />
      {text}
    </div>
  );
}

/** Section frame local to this page — mono kicker + title + a neon rule that
    draws in on reveal, matching the rest of the TELOS surface. */
function Block({ icon: Icon, kicker, title, blurb, children }: {
  icon: React.ComponentType<{ className?: string }>;
  kicker: string;
  title: string;
  blurb?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-16 sm:mt-20">
      <Reveal>
        <div className="flex items-end gap-3 mb-2.5">
          <span className="grid place-items-center w-9 h-9 rounded-lg glass shrink-0" style={{ color: "var(--neon)" }}>
            <Icon className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <div className="text-[11px] font-mono uppercase tracking-[0.28em] text-muted-foreground">{kicker}</div>
            <h2 className="text-2xl font-bold text-foreground leading-tight">{title}</h2>
          </div>
        </div>
        <div className="section-rule mb-6 max-w-[260px]" aria-hidden />
      </Reveal>
      {blurb && <p className="text-[14px] leading-relaxed text-muted-foreground max-w-[70ch] mb-7 -mt-2">{blurb}</p>}
      {children}
    </section>
  );
}

/** A status dot in a token color, with a soft matching glow. */
function Dot({ color }: { color: string }) {
  return <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color, boxShadow: `0 0 7px ${color}` }} />;
}

/* --------------------------- hero stat tiles ---------------------------- */

function StatTiles({ omm }: { omm: Omm }) {
  const fresh = omm.freshness;
  const tiles: Array<{ big: string; label: string; sub: string; tone?: string }> = [
    { big: String(omm.counts.hooks), label: "hooks", sub: `across ${omm.counts.hookEvents} events` },
    { big: String(omm.counts.jobsEnabled), label: "jobs live", sub: `of ${omm.counts.jobsTotal} defined` },
    { big: `~${omm.counts.tools}`, label: "tools", sub: "CLI utilities" },
    {
      big: fresh?.overall_grade ?? "—",
      label: "memory freshness",
      sub: fresh?.overall_pct != null ? `${fresh.overall_pct}% fresh` : "constitutional files",
      tone: fresh?.overall_grade === "A" ? "var(--positive)" : fresh?.overall_grade ? "var(--warn)" : undefined,
    },
    { big: relTime(omm.kpis?.generated_at), label: "KPIs synced", sub: "per-goal live values" },
  ];
  return (
    <div className="mt-9 grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
      {tiles.map((t, i) => (
        <Reveal key={t.label} delay={i * 45} from={i % 2 === 0 ? "left" : "right"}>
          <div className="glass hover-lift rounded-xl p-4 h-full">
            <div className="text-[30px] font-bold font-mono tabular-nums leading-none text-foreground" style={t.tone ? { color: t.tone } : undefined}>
              {t.big}
            </div>
            <div className="mt-2 text-[12px] font-semibold text-foreground">{t.label}</div>
            <div className="mt-0.5 text-[11px] font-mono text-muted-foreground">{t.sub}</div>
          </div>
        </Reveal>
      ))}
    </div>
  );
}

/* ---------------------------- boot sequence ----------------------------- */

function BootSequence({ omm }: { omm: Omm }) {
  const ssCount = omm.hooks.byEvent["SessionStart"] ?? 0;
  const steps = [
    { title: "SessionStart hooks", desc: `HookHealer → KittyEnvPersist → LoadContext → FreshnessCache → MergeSettings. ${ssCount} hooks repair state and inject context before you type.` },
    { title: "System prompt", desc: "LIFEOS_SYSTEM_PROMPT.md loads — the constitutional layer. Mode templates, verification doctrine, hard prohibitions. Survives compaction." },
    { title: "CLAUDE.md + imports", desc: "The routing table loads with its 7 @-imports: architecture, TELOS, both identities, projects, rules, doctrine." },
    { title: "Integrity audit", desc: "InstructionsLoaded fires → a SHA-256 audit of the constitutional files against known-good hashes." },
    { title: "First-prompt chain", desc: "Your first message triggers the 10-hook prompt chain — where the mistakes/decisions digest arrives, once per session." },
  ];
  return (
    <Reveal>
      <ol className="flex flex-col sm:flex-row gap-8 sm:gap-3">
        {steps.map((s, i) => (
          <li key={i} className="relative flex-1 flex flex-col items-center text-center sm:px-2">
            {i > 0 && (
              <span
                className="hidden sm:block absolute top-4 right-1/2 w-full h-px -z-0"
                style={{ background: "var(--hairline-strong)" }}
                aria-hidden
              />
            )}
            <span
              className="relative z-10 grid place-items-center w-8 h-8 rounded-full font-mono text-[13px] font-bold tabular-nums glass"
              style={{ color: "var(--neon)", borderColor: "var(--hairline-strong)" }}
            >
              {i + 1}
            </span>
            <h4 className="mt-3 text-[13px] font-semibold text-foreground">{s.title}</h4>
            <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground max-w-[26ch] mx-auto">{s.desc}</p>
          </li>
        ))}
      </ol>
    </Reveal>
  );
}

/* --------------------------- the prompt chain --------------------------- */

const CHAIN: Array<{ name: string; hint: string; desc: string }> = [
  { name: "EffortRouter", hint: "EffortRouter", desc: "Classifies your ask → mode (NATIVE / ALGORITHM / MINIMAL) and effort tier (E1–E5)." },
  { name: "PromptProcessing", hint: "PromptProcessing", desc: "Names the session and sets the terminal tab title." },
  { name: "SatisfactionCapture", hint: "SatisfactionCapture", desc: "Detects explicit or implicit ratings of the last answer → learning signals." },
  { name: "ReminderRouter", hint: "ReminderRouter", desc: "“remind me to…” / “queue this…” becomes a GitHub issue in the work repo." },
  { name: "MemoryReviewTrigger", hint: "MemoryReviewTrigger", desc: "Counts turns and time toward the autonomic memory review." },
  { name: "LoadMemory", hint: "LoadMemory", desc: "Injects the hot layer: Principal Memory + DA Memory, every prompt." },
  { name: "MemoryDeltaSurface", hint: "MemoryDeltaSurface", desc: "The 🧠 MEMORY status line you see in every reply." },
  { name: "InoculationLoad", hint: "InoculationLoad", desc: "Injects the Mistakes + Decisions digest, once per session." },
  { name: "DriftReminder", hint: "DriftReminder", desc: "Nudges if the last reply drifted from voice or format rules." },
  { name: "SkillSurface", hint: "SkillSurface", desc: "Suggests the skills most likely to help with this prompt." },
];

function PromptChain({ omm }: { omm: Omm }) {
  const live = omm.hooks.hooks.filter((h) => h.event === "UserPromptSubmit");
  const match = (hint: string) => live.find((h) => h.fileName.toLowerCase().startsWith(hint.toLowerCase()));
  return (
    <div className="flex flex-col gap-2 max-w-[980px]">
      <div className="mb-1 text-[11px] font-mono text-muted-foreground tabular-nums">
        {live.length} live UserPromptSubmit hooks · in order
      </div>
      {CHAIN.map((step, i) => {
        const hit = match(step.hint);
        return (
          <Reveal key={step.name} delay={Math.min(i, 8) * 28}>
            <div className="glass rounded-xl px-4 py-3 flex items-center gap-3.5">
              <span className="grid place-items-center w-7 h-7 rounded-lg shrink-0 font-mono text-[12px] font-bold tabular-nums" style={{ color: "var(--neon)", background: "var(--surface-1)" }}>
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[13px] font-semibold text-foreground">{step.name}</span>
                  {hit && (
                    <span className="text-[9.5px] font-mono px-1.5 py-0.5 rounded-full tabular-nums" style={{ color: "var(--positive)", background: "var(--surface-1)", border: "1px solid color-mix(in oklab, var(--positive) 30%, transparent)" }} title={hit.command}>
                      live · {hit.fileName}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">{step.desc}</p>
              </div>
            </div>
          </Reveal>
        );
      })}
    </div>
  );
}

/* -------------------------- the scheduled machine ----------------------- */

function SourceBadge({ text }: { text: string }) {
  return (
    <span className="text-[9px] font-mono uppercase tracking-[0.12em] px-1.5 py-0.5 rounded" style={{ color: "var(--text-dim)", background: "var(--surface-1)", border: "1px solid var(--hairline)" }}>
      {text}
    </span>
  );
}

function JobCard({ job }: { job: JobEntry }) {
  const color = job.enabled ? "var(--positive)" : "var(--text-dim)";
  const statusLabel = job.enabled ? "enabled" : "disabled";
  return (
    <div className="glass hover-lift rounded-xl p-4 h-full flex flex-col" style={{ opacity: job.enabled ? 1 : 0.62 }}>
      <div className="flex items-center gap-2 mb-2">
        <Dot color={color} />
        <span className="text-[13px] font-semibold text-foreground truncate">{job.name}</span>
        <span className="ml-auto"><SourceBadge text={job.source === "user" ? "user" : "pulse"} /></span>
      </div>
      <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground tabular-nums">
        <Clock className="w-3 h-3" style={{ color: "var(--neon)" }} />
        {cronToHuman(job.schedule)}
        <span style={{ color: "var(--text-dim)" }}>·</span>
        {job.type ?? "—"}
      </div>
      <div className="mt-auto pt-3 flex items-center justify-between text-[10.5px] font-mono">
        <span style={{ color }}>{statusLabel}</span>
        <span className="text-muted-foreground tabular-nums" title={job.lastRun ?? "no run signal"}>
          {job.lastRun ? `ran ${relTime(job.lastRun)}` : "—"}
        </span>
      </div>
    </div>
  );
}

function LaunchdCard({ agent }: { agent: LaunchdEntry }) {
  const dormant = !agent.installed;
  const color = agent.installed ? "var(--positive)" : "var(--warn)";
  const statusLabel = agent.installed ? "installed" : "dormant";
  return (
    <div className="glass hover-lift rounded-xl p-4 h-full flex flex-col" style={{ opacity: dormant ? 0.6 : 1 }}>
      <div className="flex items-center gap-2 mb-2">
        <Dot color={color} />
        <span className="text-[13px] font-semibold text-foreground truncate">{agent.name}</span>
        <span className="ml-auto"><SourceBadge text="launchd" /></span>
      </div>
      <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground tabular-nums">
        <Clock className="w-3 h-3" style={{ color: "var(--neon)" }} />
        {agent.schedule}
      </div>
      <p className="mt-2 text-[11.5px] leading-snug text-muted-foreground">{agent.what}</p>
      <div className="mt-auto pt-3 flex items-center justify-between text-[10.5px] font-mono">
        <span style={{ color }}>{statusLabel}</span>
        <span className="text-muted-foreground tabular-nums" title={agent.lastRun ?? "no run signal"}>
          {agent.lastRun ? `ran ${relTime(agent.lastRun)}` : "—"}
        </span>
      </div>
    </div>
  );
}

function ScheduledMachine({ omm }: { omm: Omm }) {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <div className="mb-3 text-[11px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
          Pulse jobs · {omm.jobs.filter((j) => j.enabled).length} live of {omm.jobs.length}
        </div>
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
          {omm.jobs.map((j, i) => (
            <Reveal key={j.name} delay={Math.min(i, 8) * 30} from={i % 2 === 0 ? "left" : "right"}>
              <JobCard job={j} />
            </Reveal>
          ))}
        </div>
      </div>
      <div>
        <div className="mb-3 text-[11px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
          launchd agents · {omm.launchd.filter((l) => l.installed).length} installed of {omm.launchd.length}
        </div>
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
          {omm.launchd.map((a, i) => (
            <Reveal key={a.label} delay={Math.min(i, 8) * 30} from={i % 2 === 0 ? "left" : "right"}>
              <LaunchdCard agent={a} />
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ memory flow ----------------------------- */

/** A store box inside a lane: the human name + its real path. */
function StoreBox({ name, path, tone }: { name: string; path: string; tone: string }) {
  return (
    <div className="rounded-lg px-3 py-2" style={{ background: "var(--surface-1)", border: "1px solid var(--hairline)" }}>
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: tone, boxShadow: `0 0 5px ${tone}` }} />
        <span className="text-[12.5px] font-semibold text-foreground">{name}</span>
      </div>
      <div className="mt-1 text-[10.5px] font-mono text-muted-foreground truncate" title={path}>{path}</div>
    </div>
  );
}

/** One lane of the memory system: a header (name + cadence), its stores, and a
    downward arrow that reads "feeds your DA's context · <cadence>". */
function Lane({ title, cadence, tone, stores }: {
  title: string;
  cadence: string;
  tone: string;
  stores: Array<{ name: string; path: string }>;
}) {
  return (
    <div className="flex flex-col">
      <div className="glass-2 rounded-xl p-4 flex-1 flex flex-col">
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-[12px] font-bold text-foreground">{title}</span>
          <span className="text-[9px] font-mono uppercase tracking-[0.12em] px-1.5 py-0.5 rounded" style={{ color: tone, background: "var(--surface-1)", border: `1px solid color-mix(in oklab, ${tone} 30%, transparent)` }}>
            {cadence}
          </span>
        </div>
        <div className="flex flex-col gap-2">
          {stores.map((s) => (
            <StoreBox key={s.name} name={s.name} path={s.path} tone={tone} />
          ))}
        </div>
      </div>
      <div className="flex flex-col items-center pt-2 pb-1">
        <ChevronDown className="w-4 h-4" style={{ color: tone }} />
      </div>
    </div>
  );
}

function MemoryFlow() {
  const lanes = [
    {
      title: "In the moment",
      cadence: "honor system",
      tone: "var(--neon)",
      stores: [
        { name: "Mistakes", path: "MEMORY/MISTAKES.md" },
        { name: "Decisions", path: "MEMORY/DECISIONS.md" },
        { name: "Auto-memory", path: "projects/-/memory/*.md" },
      ],
    },
    {
      title: "Autonomic",
      cadence: "hook-driven",
      tone: "var(--neon-3)",
      stores: [
        { name: "Hot layer (A/B)", path: "USER/**/PRINCIPAL_MEMORY · DA_MEMORY" },
        { name: "Proposals (tier C)", path: "OBSERVABILITY/pending-proposals.jsonl" },
      ],
    },
    {
      title: "Session-end + nightly",
      cadence: "03:00",
      tone: "var(--positive)",
      stores: [
        { name: "Learning", path: "MEMORY/LEARNING/" },
        { name: "Knowledge", path: "MEMORY/KNOWLEDGE/" },
        { name: "Relationship", path: "MEMORY/RELATIONSHIP/YYYY-MM/" },
      ],
    },
  ];
  return (
    <Reveal>
      <div className="max-w-[1040px]">
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
          {lanes.map((l) => (
            <Lane key={l.title} {...l} />
          ))}
        </div>
        {/* Convergence — every lane flows here. */}
        <div
          className="glass-strong rounded-xl px-5 py-4 flex items-center gap-3.5 edge-top relative overflow-hidden"
          style={{ boxShadow: "0 0 44px -14px var(--glow)" }}
        >
          <span className="grid place-items-center w-10 h-10 rounded-lg shrink-0" style={{ color: "var(--neon)", background: "var(--surface-1)" }}>
            <Brain className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <div className="text-[14px] font-bold text-foreground">Your DA&apos;s context</div>
            <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">
              The hot layer loads every prompt · the inoculation digest once per session · auto-memory recalled by description · nightly harvests feed the knowledge base.
            </p>
          </div>
        </div>
      </div>
    </Reveal>
  );
}

/* ------------------------------ guardrails ------------------------------ */

const GUARDRAILS: Array<{ name: string; tip: string }> = [
  { name: "SuccessClaimGate", tip: "No 'verified / works / live' claims without same-turn evidence; browser evidence required for UI claims." },
  { name: "OutputFormatGate", tip: "Mode banner + format compliance on every reply." },
  { name: "SystemFileGuard", tip: "Blocks personal data from leaking into SYSTEM (public-release) files." },
  { name: "EgressClassGuard", tip: "Data-class ceilings on external model calls." },
  { name: "Safety.hook", tip: "Permission classifier on writes/bash + injection-shape scanning on web content." },
  { name: "ConfigAudit", tip: "Audit trail on settings changes; hash-audit on the constitutional files." },
  { name: "WritingGate", tip: "Outbound prose must pass the writing audit + AI-detector." },
  { name: "CheckpointPerISC", tip: "Work is committed per ISC; the vault is pushed every 30 min." },
];

function Guardrails() {
  return (
    <div className="flex flex-wrap gap-2.5 max-w-[980px]">
      {GUARDRAILS.map((g, i) => (
        <Reveal key={g.name} delay={Math.min(i, 8) * 25}>
          <span
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg glass hover-lift cursor-default"
            title={g.tip}
          >
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--positive)" }} />
            <span className="text-[12.5px] font-medium text-foreground">{g.name}</span>
          </span>
        </Reveal>
      ))}
    </div>
  );
}

/* ------------------------------ known gaps ------------------------------ */

const GAPS: string[] = [
  "Six sweep tools are dormant — their installers exist but the launchd plists were never installed.",
  "Four assistant-* jobs are disabled — the DA subsystem checks are not shipped in this payload.",
  "Some goal KPIs report null until their source exists: the training log has entries, and the essay and app targets are set.",
  "Writing to Mistakes and Decisions is honor-system — no hook can force it. If a miss is never noticed in-session, it is never logged.",
  "SessionNarrativeStub does not survive a killed tab or a crashed process.",
  "Job last-run times live only in raw JSONL under MEMORY/OBSERVABILITY — this page reads file mtime as the run signal where one exists, and shows “—” where it doesn't.",
];

function KnownGaps() {
  return (
    <div className="flex flex-col gap-2.5 max-w-[900px]">
      {GAPS.map((g, i) => (
        <Reveal key={i} delay={Math.min(i, 8) * 30}>
          <div className="glass rounded-xl px-4 py-3 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--warn)" }} />
            <p className="text-[13px] leading-relaxed text-foreground">{g}</p>
          </div>
        </Reveal>
      ))}
    </div>
  );
}

/* --------------------------------- view --------------------------------- */

/** The API returns graceful nulls for any section that fails server-side —
    normalize to safe empties so a partial payload renders partially instead of
    throwing (a raw null here once took down the whole app shell). */
function normalizeOmm(d: Partial<Omm> | null | undefined): Omm {
  return {
    hooks: { total: 0, byEvent: {}, hooks: [], ...(d?.hooks ?? {}) },
    jobs: Array.isArray(d?.jobs) ? d.jobs : [],
    launchd: Array.isArray(d?.launchd) ? d.launchd : [],
    memoryState: d?.memoryState ?? null,
    freshness: d?.freshness ?? null,
    kpis: d?.kpis ?? null,
    counts: { hooks: 0, hookEvents: 0, jobsEnabled: 0, jobsTotal: 0, launchdInstalled: 0, tools: 0, ...(d?.counts ?? {}) },
  } as Omm;
}

/** Local error boundary: a rendering defect in this page degrades to an error
    card instead of the Next "client-side exception" full-app crash. */
class OmmErrorBoundary extends Component<{ children: ReactNode }, { err: string | null }> {
  state = { err: null as string | null };
  static getDerivedStateFromError(e: unknown) { return { err: String(e) }; }
  render() {
    if (this.state.err) {
      return (
        <div className="glass rounded-xl p-4 mt-8 flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: "var(--danger)", boxShadow: "0 0 8px var(--danger)" }} />
          <p className="text-[13px]" style={{ color: "var(--danger)" }}>
            The operating model hit a rendering error — {this.state.err}. Reload the page; if it persists, check /api/omm.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

export function OperatingModelView() {
  return (
    <OmmErrorBoundary>
      <OperatingModelViewInner />
    </OmmErrorBoundary>
  );
}

function OperatingModelViewInner() {
  const [omm, setOmm] = useState<Omm | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/omm")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("HTTP " + r.status))))
      .then((d) => setOmm(normalizeOmm(d)))
      .catch((e) => setError(String(e)));
  }, []);

  if (error) {
    return (
      <div className="glass rounded-xl p-4 mt-8 flex items-center gap-2.5">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: "var(--danger)", boxShadow: "0 0 8px var(--danger)" }} />
        <p className="text-[13px]" style={{ color: "var(--danger)" }}>Failed to load the operating model — {error}</p>
      </div>
    );
  }
  if (!omm) {
    return <div className="pt-10 text-[13px] font-mono text-muted-foreground">Loading operating model…</div>;
  }

  return (
    <>
      <section className="pt-8 sm:pt-10">
        <Kicker text="LifeOS · The Machine" />
        <h1 className="text-3xl sm:text-4xl font-bold leading-[1.1] text-foreground">Operating Model</h1>
        <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground max-w-[68ch]">
          How the machine actually runs — read live from the running system, not from documentation. What boots when you start a session, the hooks that fire on every prompt, the jobs on the clock, where every kind of memory is written and read, and the honest gaps.
        </p>
        <StatTiles omm={omm} />
      </section>

      <Block icon={Zap} kicker="The living machine" title="System map" blurb="The whole runtime as one living schematic. Scroll to zoom, drag to pan, hover any node to trace what feeds it, click to pin details with live data.">
        <OperatingModelMap data={omm as never} />
      </Block>

      <Block icon={Power} kicker="Cold start" title="Boot sequence" blurb="Five ordered steps, each real and verified. By the time you type, identity, rules, TELOS and projects are already in your DA's context; the self-improvement record arrives with your first message.">
        <BootSequence omm={omm} />
      </Block>

      <Block icon={Zap} kicker="Every prompt" title="The prompt chain" blurb="Ten hooks fire, in order, on every message you send — classification, memory injection, self-audit surfacing. The live badges show the real hook file matched from settings.json.">
        <PromptChain omm={omm} />
      </Block>

      <Block icon={Clock} kicker="On the clock" title="The scheduled machine" blurb="Two schedulers keep LifeOS running around the clock: Pulse jobs inside the daemon, and launchd agents that survive a Pulse restart. Enabled runs green, disabled dims, a dormant agent warns.">
        <ScheduledMachine omm={omm} />
      </Block>

      <Block icon={Database} kicker="What remembers what" title="Memory flow" blurb="Three ways the system remembers, all converging on your DA's working context: what you capture in the moment, what the autonomic loop writes on cadence, and what the nightly harvest compounds.">
        <MemoryFlow />
      </Block>

      <Block icon={ShieldCheck} kicker="What protects the system" title="Guardrails" blurb="Eight gates stand between good intentions and a shipped regression. Hover any chip for what it blocks.">
        <Guardrails />
      </Block>

      <Block icon={AlertTriangle} kicker="The honest part" title="Known gaps" blurb="What isn't wired yet, stated plainly. The map that admits where the territory disagrees.">
        <KnownGaps />
      </Block>

      <div className="mt-16 pt-8 flex flex-col sm:flex-row sm:items-center gap-3 justify-between" style={{ borderTop: "1px solid var(--hairline)" }}>
        <a
          href="obsidian://open?vault=YourVault&file=LifeOS%2FLifeOS-index-and-OMM"
          className="inline-flex items-center gap-2 text-[12px] font-mono text-muted-foreground hover:text-foreground transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" style={{ color: "var(--neon)" }} />
          open the manual in Obsidian
        </a>
        <span className="text-[11px] font-mono text-muted-foreground tabular-nums">
          OMM v2026-07-11 · manual maintained by your DA · data live {relTime(omm.ts)}
        </span>
      </div>
    </>
  );
}
