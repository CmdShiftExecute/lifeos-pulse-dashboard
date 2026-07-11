"use client";

// ─────────────────────────────────────────────────────────────────────────────
// OperatingModelMap — "The Living Machine"
// An interactive, zoomable schematic of the whole LifeOS runtime: what boots,
// what fires on every prompt, where memory is written and read, what the
// scheduled machine does at night, and how it all feeds Pulse.
//
// Design notes (hand-built, not a graph library):
//  - Deterministic layout in world coordinates — composition over physics.
//  - HTML nodes inside a CSS-transformed "world" div; SVG edge underlay in the
//    same coordinate space, so pan/zoom is one transform.
//  - Edges are cubic beziers with a slow dash-flow; data "pulses" ride the
//    same path via offset-path (progressive enhancement — dash-flow is the
//    baseline, pulses add life on engines that support motion paths).
//  - Hover = focus mode: the hovered node's edges ignite, the rest recede.
//  - Click pins a detail card (screen space, right side) with live /api/omm
//    data where it exists. Unknown live values render as "—", never invented.
//  - All color via CSS custom properties — light and dark themes both work.
//  - prefers-reduced-motion pauses all flow animation.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// ── Live data (shape-defensive against /api/omm) ─────────────────────────────

interface OmmJob {
  name?: string;
  schedule?: string;
  human?: string;
  enabled?: boolean;
  lastRun?: string | null;
  source?: string;
}
interface OmmData {
  hooks?: { total?: number; events?: Record<string, number> } | Array<unknown>;
  jobs?: OmmJob[];
  launchd?: Array<{ name?: string; installed?: boolean; schedule?: string; lastRun?: string | null }>;
  freshness?: { grade?: string; overall_grade?: string; fresh?: number; total?: number } | null;
  kpis?: { generated_at?: string } | null;
  memoryState?: { turn_count?: number; pending_review?: boolean; reviewState?: { turn_count?: number } } | null;
  counts?: { hooks?: number; jobsEnabled?: number; jobsTotal?: number; tools?: number } | null;
}

function hooksTotal(d: OmmData | null): number | null {
  if (!d) return null;
  if (typeof d.counts?.hooks === "number") return d.counts.hooks;
  if (Array.isArray(d.hooks)) return d.hooks.length;
  if (d.hooks && typeof (d.hooks as { total?: number }).total === "number")
    return (d.hooks as { total: number }).total;
  return null;
}
function jobByName(d: OmmData | null, name: string): OmmJob | undefined {
  return d?.jobs?.find((j) => j.name === name);
}
function agoLabel(iso?: string | null): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "—";
  const mins = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const h = Math.round(mins / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

// ── The graph (hand-laid world coordinates) ──────────────────────────────────

type Tone =
  | "you"      // inputs from the principal
  | "boot"     // session boot
  | "hook"     // hook chains / gates
  | "memory"   // memory stores
  | "job"      // scheduled machine
  | "telos"    // TELOS pipeline
  | "out"      // outputs (Pulse, backup, voice)
  | "guard";   // guardrails

// Tokens verified against themes.css (global scope — the library route does
// NOT load the _v7 stylesheet, so only these are safe here).
// Full-color tokens ONLY (chart-* are HSL triplets and their hues swap per
// theme; both bite). One hue per subsystem; the on-canvas legend explains it.
const TONE: Record<Tone, string> = {
  you: "var(--neon-2)",
  boot: "var(--neon)",
  hook: "var(--warn)",
  memory: "var(--dim-relationships)",
  job: "var(--positive)",
  telos: "var(--dim-creative)",
  out: "var(--dim-infrastructure)",
  guard: "var(--danger)",
};

const LEGEND: Array<{ tone: Tone; label: string }> = [
  { tone: "you", label: "You" },
  { tone: "boot", label: "Boot" },
  { tone: "hook", label: "Session loop" },
  { tone: "memory", label: "Memory" },
  { tone: "job", label: "Scheduled" },
  { tone: "telos", label: "TELOS" },
  { tone: "out", label: "Outputs" },
];

interface NodeDef {
  id: string;
  x: number; // world coords, node top-left
  y: number;
  w?: number;
  tone: Tone;
  kicker: string;   // tiny mono label
  title: string;    // plain-language name
  blurb: string;    // one concise hover sentence
  detail?: string;  // pinned-card paragraph
  muted?: boolean;  // dormant/disabled machinery
  live?: (d: OmmData | null) => Array<{ k: string; v: string }>;
}

interface EdgeDef {
  from: string;
  to: string;
  label?: string;
  tone?: Tone;      // defaults to source tone
  dash?: boolean;   // dashed = conditional / cadence path
  fromSide?: "top" | "bottom" | "left" | "right";
  toSide?: "top" | "bottom" | "left" | "right";
}

const NODE_W = 208;

const NODES: NodeDef[] = [
  // ── Stratum 1 · YOU ──
  { id: "vault", x: 120, y: 40, tone: "you", kicker: "you · vault", title: "You edit the vault", blurb: "Your vault holds TELOS, identity, and canon. Editing these files is how you program your DA.", detail: "The vault is the human-facing home. Symlinks stitch it to the runtime at ~/.claude, so there is only ever one copy of the truth." },
  { id: "prompt", x: 560, y: 40, tone: "you", kicker: "you · session", title: "You send a prompt", blurb: "Every message runs the 10-hook prompt chain before your DA sees it.", detail: "Router classifies the ask, memory layers inject, the mistakes/decisions digest arrives once per session." },
  { id: "chat", x: 1000, y: 40, tone: "you", kicker: "you · remote", title: "Telegram / iMessage", blurb: "Remote surfaces with identity + TELOS injected per turn; voice replies via ElevenLabs.", detail: "Pulse modules poll and reply. Same identity files, different door." },

  // ── Stratum 2 · BOOT ──
  { id: "boot-hooks", x: 120, y: 250, tone: "boot", kicker: "boot · 1", title: "SessionStart hooks", blurb: "HookHealer → terminal state → LoadContext → freshness cache → settings merge.", detail: "Five hooks fire in order at session start. LoadContext injects relationship notes, learning signals, and active work." },
  { id: "boot-sys", x: 400, y: 250, tone: "boot", kicker: "boot · 2", title: "System prompt", blurb: "LIFEOS_SYSTEM_PROMPT.md — the constitutional layer. Survives compaction.", detail: "Mode templates, verification doctrine, hard prohibitions, security protocol." },
  { id: "boot-imports", x: 680, y: 250, tone: "boot", kicker: "boot · 3", title: "CLAUDE.md + 7 imports", blurb: "Architecture summary, TELOS, both identities, projects, rules, doctrine.", detail: "Identity, rules, and goals are in your DA's context before you type a word." },
  { id: "boot-integrity", x: 960, y: 250, tone: "boot", kicker: "boot · 4", title: "Integrity audit", blurb: "SHA-256 hash check of the constitutional files against known-good baselines.", detail: "InstructionsLoadedHandler: tamper detection on the files that define your DA." },

  // ── Stratum 3 · THE SESSION LOOP ──
  { id: "chain", x: 120, y: 470, tone: "hook", kicker: "every prompt", title: "The 10-hook chain", blurb: "Router → naming → satisfaction → reminders → memory cadence → hot layer → 🧠 line → inoculation → drift → skills.", detail: "EffortRouter classifies mode + effort. LoadMemory injects the hot layer every prompt. InoculationLoad delivers the MISTAKES/DECISIONS digest once per session.", live: (d) => [{ k: "hooks installed", v: hooksTotal(d) === null ? "—" : String(hooksTotal(d)) }] },
  { id: "da", x: 460, y: 470, w: 240, tone: "hook", kicker: "the work", title: "Your DA works", blurb: "Tool gates in front (PII, egress, skill paths); ground-truth trackers behind every call.", detail: "PreToolUse: SystemFileGuard, EgressClassGuard, workflow guards. PostToolUse: ToolActivityTracker, ISASync, TelosSummarySync, per-ISC checkpoints." },
  { id: "stop", x: 840, y: 470, tone: "hook", kicker: "reply ends", title: "Stop gates", blurb: "Format gate, success-claim gate, doc integrity, voice line, memory review fire.", detail: "SuccessClaimGate blocks 'verified' claims without same-turn evidence. MemoryReviewFire runs the autonomic reviewer when the cadence is due." },
  { id: "send", x: 1120, y: 470, tone: "hook", kicker: "session ends", title: "SessionEnd sweep", blurb: "Work → learning, relationship extracts, cleanup, narrative stub if SESSIONS.md was forgotten.", detail: "Six hooks. WorkCompletionLearning bridges finished work into LEARNING; SessionNarrativeStub is the honor-system backstop." },

  // ── Stratum 4 · MEMORY ──
  { id: "ledger", x: 120, y: 700, tone: "memory", kicker: "ledger · by hand", title: "Mistakes · Decisions", blurb: "One line, in the moment. Honor system on write — reading is hook-enforced.", detail: "MISTAKES.md and DECISIONS.md, vault-symlinked. A mistake class that repeats twice becomes a counter-rule in OPERATIONAL_RULES." },
  { id: "sessions", x: 380, y: 700, tone: "memory", kicker: "ledger · close", title: "Sessions narrative", blurb: "Dated block at the close of substantive sessions; stub dropped if forgotten.", detail: "SESSIONS.md is the story arc. The stub does not survive a killed tab — writing it is discipline." },
  { id: "hot", x: 640, y: 700, tone: "memory", kicker: "hot layer", title: "Principal + DA memory", blurb: "Injected EVERY prompt. Written by the autonomic reviewer on cadence.", detail: "MemoryReviewer fires at turn ≥ 8 ∧ 30 min ∧ idle ≥ 2. Typed items route through MemorySystem.add(); risky (tier-C) changes go to Telegram for yes/no.", live: (d) => { const t = d?.memoryState?.turn_count ?? d?.memoryState?.reviewState?.turn_count; return [{ k: "turns toward review", v: t != null ? String(t) : "—" }]; } },
  { id: "automem", x: 900, y: 700, tone: "memory", kicker: "write-first layer", title: "Auto-memory", blurb: "One file per durable fact. Index loads each session; recall by description.", detail: "~/.claude/projects/-/memory, symlinked into the vault as AUTO-MEMORY. Per-working-directory — the / brain is the main one." },
  { id: "learnkn", x: 1160, y: 700, tone: "memory", kicker: "harvested", title: "Learning · Knowledge", blurb: "Session-end bridge + nightly harvest; BM25 retrieval feeds context back.", detail: "WorkCompletionLearning at SessionEnd; SessionHarvester + KnowledgeHarvester nightly at 03:00; LearningPatternSynthesis weekly clusters." },

  // ── Stratum 5 · THE SCHEDULED MACHINE ──
  { id: "night", x: 120, y: 930, tone: "job", kicker: "03:00 daily", title: "Memory consolidation", blurb: "Harvest sessions → knowledge → weekly pattern synthesis. Deterministic, zero drama.", detail: "The user-tier job replaced a broken claude-type job on 10 Jul — all-script, billing-independent.", live: (d) => [{ k: "job", v: jobByName(d, "memory-consolidation")?.enabled === false ? "disabled" : "enabled" }] },
  { id: "kpi", x: 400, y: 930, tone: "job", kicker: "hourly · :17", title: "TELOS KPI sync", blurb: "TelosKpis.ts reads your live sources (pipeline, training log, savings) into KPIS.json. Never invents numbers.", detail: "Live where a source exists (client pipeline, savings, training log); the rest wait on your targets.", live: (d) => [{ k: "KPIs generated", v: agoLabel(d?.kpis?.generated_at) }] },
  { id: "sweep", x: 680, y: 930, tone: "job", kicker: "hourly · launchd", title: "WorkSweep", blurb: "Catches what event-driven capture missed: stale work, silent projects, goal-with-no-issue.", detail: "com.lifeos.worksweep — four sub-sweeps against the private work repo.", live: (d) => [{ k: "last sweep", v: agoLabel(d?.launchd?.find((a) => (a.name ?? "").includes("worksweep"))?.lastRun ?? null) }] },
  { id: "vaultpush", x: 960, y: 930, tone: "job", kicker: "every 30 min", title: "Vault push", blurb: "main ahead of github/main → push. Your automatic off-site backup.", detail: "com.lifeos.vaultpush pushes to your backup remote. A second remote fails harmlessly when its server is off." },
  { id: "dormant", x: 1240, y: 930, tone: "job", kicker: "dormant", title: "6 sleeping sweeps", blurb: "BlogDiscovery · Bookmarks · Codex · Commitments · DerivedSync · HealthSync — installers exist, plists never installed.", detail: "Run their Install*.ts to wake them. Until then, manual only.", muted: true },

  // ── Stratum 6 · OUTPUTS ──
  { id: "pulse", x: 400, y: 1150, w: 240, tone: "out", kicker: "port 31337", title: "Pulse — Life Dashboard", blurb: "One Bun process: API + static UI. Rings, kanban, finances, this very map.", detail: "manage.sh {start|stop|restart|status}. Rebuild → restart, always. KeepAlive daemon restarts itself within 30s.", live: (d) => [{ k: "jobs enabled", v: d?.counts?.jobsEnabled != null && d?.counts?.jobsTotal != null ? `${d.counts.jobsEnabled}/${d.counts.jobsTotal}` : "—" }] },
  { id: "github", x: 960, y: 1150, tone: "out", kicker: "backup", title: "GitHub backup", blurb: "The vault, ledgers, and auto-memory, off-site every 30 minutes.", detail: "Everything human-readable is git history. Telemetry stays local by design." },
  { id: "voice", x: 120, y: 1150, tone: "out", kicker: "🗣 output", title: "Voice · notifications", blurb: "Stop-hook voice line → ElevenLabs; morning brief at 07:00 speaks.", detail: "VoiceCompletion on Stop; life-morning-brief daily; Telegram voice bubbles on remote turns." },

  // ── Right spine · TELOS pipeline ──
  { id: "telos-md", x: 1520, y: 250, tone: "telos", kicker: "source of truth", title: "TELOS.md (v2)", blurb: "Missions M0–M3 → Goals G0–G4 → Problems → Strategies, all field-tagged and cross-linked.", detail: "pai-telos-v2 grammar: ### ID + Summary/Detail/Horizon/KPI/Target/References. Edit the MD; the dashboard re-maps itself.", live: (d) => [{ k: "context freshness", v: d?.freshness?.grade ?? d?.freshness?.overall_grade ?? "—" }] },
  { id: "telos-gen", x: 1520, y: 470, tone: "telos", kicker: "on every edit", title: "Summary regenerates", blurb: "TelosSummarySync hook → PRINCIPAL_TELOS.md → loaded at every boot.", detail: "The generator reads the legacy per-files; the fail-loud guard refuses to blank a populated summary." },
  { id: "telos-api", x: 1520, y: 700, tone: "telos", kicker: "parsed live", title: "/api/telos/overview", blurb: "Titles, edges, KPIs merged from KPIS.json — feeds the Command Center + trace pages.", detail: "Missions ⇄ goals ⇄ problems ⇄ strategies derived bidirectionally from declared references." },
  { id: "telos-cc", x: 1520, y: 930, tone: "telos", kicker: "you see", title: "Command Center", blurb: "Mission cards, goal traces, the full life-graph — every chip is a live edge.", detail: "MISSIONS 04 · GOALS 05 rendered from the same MD you edit in your vault." },
];

const EDGES: EdgeDef[] = [
  // You → machine
  { from: "vault", to: "boot-imports", label: "symlinks → runtime" },
  { from: "prompt", to: "chain", label: "fires the chain" },
  { from: "chat", to: "telos-md", label: "context injected per turn", dash: true, toSide: "left" },
  // Boot rail
  { from: "boot-hooks", to: "boot-sys" },
  { from: "boot-sys", to: "boot-imports" },
  { from: "boot-imports", to: "boot-integrity" },
  { from: "boot-integrity", to: "da", label: "context ready", toSide: "top" },
  // Session loop
  { from: "chain", to: "da" },
  { from: "da", to: "stop" },
  { from: "stop", to: "send", label: "on exit" },
  // Memory reads (upward into the loop)
  { from: "ledger", to: "chain", label: "digest · once/session", dash: true, fromSide: "top", toSide: "bottom" },
  { from: "hot", to: "chain", label: "every prompt", fromSide: "top", toSide: "bottom" },
  { from: "automem", to: "chain", label: "index + recall", dash: true, fromSide: "top", toSide: "bottom" },
  // Memory writes (downward out of the loop)
  { from: "da", to: "ledger", label: "in the moment", fromSide: "bottom", toSide: "top" },
  { from: "da", to: "automem", label: "durable facts", fromSide: "bottom", toSide: "top" },
  { from: "stop", to: "hot", label: "reviewer on cadence", dash: true, fromSide: "bottom", toSide: "top" },
  { from: "send", to: "learnkn", label: "work → learning", fromSide: "bottom", toSide: "top" },
  { from: "send", to: "sessions", label: "stub if forgotten", dash: true, fromSide: "bottom", toSide: "top" },
  // Scheduled machine
  { from: "night", to: "learnkn", label: "03:00 harvest", fromSide: "top", toSide: "bottom" },
  { from: "kpi", to: "telos-api", label: "KPIS.json", toSide: "bottom" },
  { from: "vaultpush", to: "github", label: "push when ahead" },
  { from: "ledger", to: "vaultpush", label: "vault-symlinked", dash: true, fromSide: "bottom", toSide: "top" },
  { from: "sweep", to: "pulse", label: "kanban issues", fromSide: "bottom", toSide: "top" },
  // TELOS spine
  { from: "vault", to: "telos-md", label: "you edit TELOS", toSide: "top" },
  { from: "telos-md", to: "telos-gen" },
  { from: "telos-gen", to: "telos-api" },
  { from: "telos-api", to: "telos-cc" },
  { from: "telos-gen", to: "boot-imports", label: "next boot", dash: true, fromSide: "left", toSide: "right" },
  { from: "telos-cc", to: "pulse", label: "rendered by", fromSide: "left", toSide: "right" },
  // Outputs
  { from: "night", to: "voice", label: "morning brief 07:00", dash: true, fromSide: "bottom", toSide: "top" },
  { from: "stop", to: "voice", label: "🗣 line", dash: true, fromSide: "left", toSide: "top" },
  { from: "learnkn", to: "pulse", label: "machine pages", dash: true, fromSide: "bottom", toSide: "right" },
];

// Lane headers painted onto the canvas
const LANES: Array<{ y: number; label: string; hint: string }> = [
  { y: 40, label: "YOU", hint: "inputs" },
  { y: 250, label: "BOOT", hint: "session start" },
  { y: 470, label: "THE SESSION LOOP", hint: "every prompt → stop → session end" },
  { y: 700, label: "MEMORY", hint: "who writes what, when" },
  { y: 930, label: "THE SCHEDULED MACHINE", hint: "cron + launchd" },
  { y: 1150, label: "OUTPUTS", hint: "what leaves the box" },
];

const WORLD_W = 1820;
const WORLD_H = 1330;
const NODE_H = 96; // fixed card height keeps edge anchors deterministic

function anchor(n: NodeDef, side: "top" | "bottom" | "left" | "right"): { x: number; y: number } {
  const w = n.w ?? NODE_W;
  switch (side) {
    case "top": return { x: n.x + w / 2, y: n.y };
    case "bottom": return { x: n.x + w / 2, y: n.y + NODE_H };
    case "left": return { x: n.x, y: n.y + NODE_H / 2 };
    case "right": return { x: n.x + w, y: n.y + NODE_H / 2 };
  }
}

function autoSides(a: NodeDef, b: NodeDef): { from: "top" | "bottom" | "left" | "right"; to: "top" | "bottom" | "left" | "right" } {
  const aw = a.w ?? NODE_W;
  const dx = (b.x + (b.w ?? NODE_W) / 2) - (a.x + aw / 2);
  const dy = (b.y + NODE_H / 2) - (a.y + NODE_H / 2);
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? { from: "right", to: "left" } : { from: "left", to: "right" };
  return dy > 0 ? { from: "bottom", to: "top" } : { from: "top", to: "bottom" };
}

function edgePath(e: EdgeDef, byId: Map<string, NodeDef>): { d: string; mid: { x: number; y: number } } | null {
  const a = byId.get(e.from);
  const b = byId.get(e.to);
  if (!a || !b) return null;
  const sides = autoSides(a, b);
  const fs = e.fromSide ?? sides.from;
  const ts = e.toSide ?? sides.to;
  const p1 = anchor(a, fs);
  const p2 = anchor(b, ts);
  const bend = Math.max(36, Math.min(120, Math.hypot(p2.x - p1.x, p2.y - p1.y) / 2.6));
  const c1 = { x: p1.x + (fs === "left" ? -bend : fs === "right" ? bend : 0), y: p1.y + (fs === "top" ? -bend : fs === "bottom" ? bend : 0) };
  const c2 = { x: p2.x + (ts === "left" ? -bend : ts === "right" ? bend : 0), y: p2.y + (ts === "top" ? -bend : ts === "bottom" ? bend : 0) };
  const d = `M ${p1.x} ${p1.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${p2.x} ${p2.y}`;
  // bezier midpoint (t = 0.5) for the label
  const mx = (p1.x + 3 * c1.x + 3 * c2.x + p2.x) / 8;
  const my = (p1.y + 3 * c1.y + 3 * c2.y + p2.y) / 8;
  return { d, mid: { x: mx, y: my } };
}

// ── Component ────────────────────────────────────────────────────────────────

export function OperatingModelMap({ data }: { data: OmmData | null }) {
  const byId = useMemo(() => new Map(NODES.map((n) => [n.id, n])), []);
  const paths = useMemo(
    () => EDGES.map((e) => ({ e, p: edgePath(e, byId) })).filter((x): x is { e: EdgeDef; p: { d: string; mid: { x: number; y: number } } } => x.p !== null),
    [byId],
  );
  const adj = useMemo(() => {
    const m = new Map<string, Set<number>>();
    EDGES.forEach((e, i) => {
      if (!m.has(e.from)) m.set(e.from, new Set());
      if (!m.has(e.to)) m.set(e.to, new Set());
      m.get(e.from)!.add(i);
      m.get(e.to)!.add(i);
    });
    return m;
  }, []);

  const frameRef = useRef<HTMLDivElement>(null);
  const fitRef = useRef<() => void>(() => {});
  const [full, setFull] = useState(false);
  const [view, setView] = useState({ x: 24, y: 12, k: 0.62 });
  const [hovered, setHovered] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const [tip, setTip] = useState<{ x: number; y: number } | null>(null);
  const drag = useRef<{ px: number; py: number; vx: number; vy: number; moved: boolean } | null>(null);

  // Fit-to-width once the frame has a real size (the section reveals with an
  // animation, so mount-time clientWidth can be 0 — measure via ResizeObserver
  // and keep refitting until the user interacts).
  const interacted = useRef(false);
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const fit = () => {
      if (interacted.current || el.clientWidth < 80) return;
      const k = Math.max(0.32, Math.min(1, (el.clientWidth - 48) / WORLD_W));
      setView({ x: (el.clientWidth - WORLD_W * k) / 2, y: 16, k });
    };
    fitRef.current = fit;
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const toggleFull = useCallback((next: boolean) => {
    setFull(next);
    setPinned(null);
    interacted.current = false;
    setTimeout(() => fitRef.current(), 60);
  }, []);

  // Esc exits fullscreen; lock page scroll behind the overlay
  useEffect(() => {
    if (!full) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") toggleFull(false); };
    window.addEventListener("keydown", esc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", esc); document.body.style.overflow = prev; };
  }, [full, toggleFull]);

  const clampK = (k: number) => Math.max(0.28, Math.min(2.2, k));

  const zoomAt = useCallback((cx: number, cy: number, factor: number) => {
    interacted.current = true;
    setView((v) => {
      const k = clampK(v.k * factor);
      const scale = k / v.k;
      return { k, x: cx - (cx - v.x) * scale, y: cy - (cy - v.y) * scale };
    });
  }, []);

  // Wheel zoom (to cursor). Non-passive listener so preventDefault works.
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault();
      const r = el.getBoundingClientRect();
      zoomAt(ev.clientX - r.left, ev.clientY - r.top, Math.exp(-ev.deltaY * 0.0016));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  const onPointerDown = (ev: React.PointerEvent) => {
    interacted.current = true;
    (ev.target as HTMLElement).setPointerCapture?.(ev.pointerId);
    drag.current = { px: ev.clientX, py: ev.clientY, vx: view.x, vy: view.y, moved: false };
  };
  const onPointerMove = (ev: React.PointerEvent) => {
    const el = frameRef.current;
    if (el) {
      const r = el.getBoundingClientRect();
      setTip({ x: ev.clientX - r.left, y: ev.clientY - r.top });
    }
    if (!drag.current) return;
    const dx = ev.clientX - drag.current.px;
    const dy = ev.clientY - drag.current.py;
    if (Math.abs(dx) + Math.abs(dy) > 4) drag.current.moved = true;
    setView((v) => ({ ...v, x: drag.current!.vx + dx, y: drag.current!.vy + dy }));
  };
  const onPointerUp = () => {
    const moved = drag.current?.moved;
    drag.current = null;
    if (moved) return; // drag, not click
  };

  const hoveredNode = hovered ? byId.get(hovered) : null;
  const pinnedNode = pinned ? byId.get(pinned) : null;
  const activeEdges: Set<number> = hovered ? adj.get(hovered) ?? new Set() : pinned ? adj.get(pinned) ?? new Set() : new Set();
  const focusOn = hovered !== null || pinned !== null;
  const lod = view.k < 0.5 ? "far" : view.k < 0.85 ? "mid" : "near";

  return (
    <div
      className={"omm-wrap glass relative overflow-hidden " + (full ? "omm-full" : "rounded-2xl")}
      style={full ? undefined : { height: "min(78vh, 860px)" }}
    >
      {/* Controls */}
      <div className="absolute top-3 right-3 z-30 flex gap-1.5">
        {[
          { t: "−", f: () => zoomAt((frameRef.current?.clientWidth ?? 800) / 2, (frameRef.current?.clientHeight ?? 500) / 2, 0.8), aria: "Zoom out" },
          { t: "+", f: () => zoomAt((frameRef.current?.clientWidth ?? 800) / 2, (frameRef.current?.clientHeight ?? 500) / 2, 1.25), aria: "Zoom in" },
          { t: "⌖", f: () => { interacted.current = false; fitRef.current(); setPinned(null); }, aria: "Reset view" },
          full
            ? { t: "✕", f: () => toggleFull(false), aria: "Exit fullscreen (Esc)" }
            : { t: "⛶", f: () => toggleFull(true), aria: "Fullscreen" },
        ].map((b) => (
          <button key={b.aria} aria-label={b.aria} title={b.aria} onClick={b.f} className="omm-ctl" type="button">{b.t}</button>
        ))}
      </div>
      <div className="absolute top-3 left-4 z-30 pointer-events-none">
        <div className="text-[10px] font-mono uppercase tracking-[0.28em] text-muted-foreground">The Living Machine</div>
        <div className="text-[11px] text-muted-foreground opacity-70">scroll to zoom · drag to pan · hover to trace · click to pin{full ? " · Esc to exit" : ""}</div>
      </div>

      <div className="omm-legend glass-2" aria-label="Map legend">
        {LEGEND.map((l) => (
          <span key={l.tone} className="omm-legend-item">
            <span className="omm-legend-dot" style={{ background: TONE[l.tone], color: TONE[l.tone] }} />
            {l.label}
          </span>
        ))}
        <span className="omm-legend-item omm-legend-note">color = where the flow starts · dashed = on a cadence</span>
      </div>

      {/* Canvas */}
      <div
        ref={frameRef}
        className="absolute inset-0 cursor-grab active:cursor-grabbing select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => { setTip(null); drag.current = null; }}
      >
        <div
          className="absolute origin-top-left will-change-transform"
          style={{ width: WORLD_W, height: WORLD_H, transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})` }}
        >
          {/* Lane bands + labels */}
          {LANES.map((l) => (
            <div key={l.label} className="absolute left-0 right-0 pointer-events-none" style={{ top: l.y - 26 }}>
              <div className="omm-lane-line" />
              <span className="omm-lane-label">{l.label}</span>
              {lod !== "far" && <span className="omm-lane-hint">{l.hint}</span>}
            </div>
          ))}

          {/* Edges */}
          <svg className="absolute inset-0 pointer-events-none" width={WORLD_W} height={WORLD_H} aria-hidden>
            <defs>
              {(Object.keys(TONE) as Tone[]).map((t) => (
                <marker key={t} id={`omm-arr-${t}`} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M 0 0.6 L 8 4 L 0 7.4 z" fill={TONE[t]} />
                </marker>
              ))}
            </defs>
            {paths.map(({ e, p }, i) => {
              const tone = e.tone ?? byId.get(e.from)!.tone;
              const on = activeEdges.has(i);
              const dim = focusOn && !on;
              return (
                <g key={i} className={dim ? "omm-edge-dim" : on ? "omm-edge-on" : "omm-edge"}>
                  <path d={p.d} fill="none" stroke={TONE[tone]} strokeWidth={on ? 2.2 : 1.4}
                    strokeDasharray={e.dash ? "5 6" : "9 7"} className="omm-flow"
                    markerEnd={`url(#omm-arr-${tone})`} opacity={dim ? 0.12 : on ? 0.95 : 0.5} />
                  {/* traveling pulse — enhancement on top of dash-flow */}
                  {!dim && (
                    <circle r={on ? 3.4 : 2.4} fill={TONE[tone]} className="omm-pulse" opacity={on ? 1 : 0.55}
                      style={{ offsetPath: `path('${p.d}')`, animationDuration: `${(6 + (i % 5)).toFixed(0)}s` } as React.CSSProperties} />
                  )}
                  {e.label && (on || lod === "near") && (
                    <text x={p.mid.x} y={p.mid.y - 6} textAnchor="middle" className="omm-edge-label" fill="currentColor">{e.label}</text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Nodes */}
          {NODES.map((n) => {
            const w = n.w ?? NODE_W;
            const active = hovered === n.id || pinned === n.id;
            const dim = focusOn && !active && !(hovered && adjTouches(adj, EDGES, hovered, n.id)) && !(pinned && adjTouches(adj, EDGES, pinned, n.id));
            return (
              <div
                key={n.id}
                role="button"
                tabIndex={0}
                aria-label={`${n.title} — ${n.blurb}`}
                className={`omm-node glass-2 ${active ? "omm-node-active" : ""} ${n.muted ? "omm-node-muted" : ""}`}
                style={{
                  left: n.x, top: n.y, width: w, height: NODE_H,
                  opacity: dim ? 0.28 : 1,
                  ["--tone" as string]: TONE[n.tone],
                }}
                onPointerEnter={() => setHovered(n.id)}
                onPointerLeave={() => setHovered(null)}
                onClick={(ev) => { ev.stopPropagation(); if (!drag.current?.moved) setPinned((p) => (p === n.id ? null : n.id)); }}
                onKeyDown={(ev) => { if (ev.key === "Enter") setPinned((p) => (p === n.id ? null : n.id)); }}
              >
                <span className="omm-node-accent" />
                <div className="omm-node-kicker">{n.kicker}</div>
                <div className="omm-node-title">{n.title}</div>
                {lod === "near" && <div className="omm-node-blurb">{n.blurb}</div>}
              </div>
            );
          })}
        </div>

        {/* Hover tooltip (screen space) */}
        {hoveredNode && tip && pinned !== hoveredNode.id && (
          <div className="omm-tip glass-2" style={{ left: Math.min(tip.x + 16, (frameRef.current?.clientWidth ?? 600) - 300), top: Math.min(tip.y + 14, (frameRef.current?.clientHeight ?? 400) - 120) }}>
            <div className="omm-node-kicker" style={{ ["--tone" as string]: TONE[hoveredNode.tone], color: "var(--tone)" }}>{hoveredNode.kicker}</div>
            <div className="text-[13px] font-semibold text-foreground leading-snug">{hoveredNode.title}</div>
            <div className="text-[12px] text-muted-foreground leading-relaxed mt-0.5">{hoveredNode.blurb}</div>
          </div>
        )}
      </div>

      {/* Pinned detail card */}
      {pinnedNode && (
        <aside className={"omm-detail glass-strong" + (full ? " omm-detail-full" : "")} style={{ ["--tone" as string]: TONE[pinnedNode.tone] }}>
          <button className="omm-detail-x" onClick={() => setPinned(null)} aria-label="Close" type="button">×</button>
          <div className="omm-node-kicker" style={{ color: "var(--tone)" }}>{pinnedNode.kicker}</div>
          <h3 className="text-[16px] font-bold text-foreground leading-snug mt-0.5">{pinnedNode.title}</h3>
          <p className="text-[13px] text-muted-foreground leading-relaxed mt-2">{pinnedNode.detail ?? pinnedNode.blurb}</p>
          {pinnedNode.live && (
            <dl className="mt-3 pt-3 flex flex-col gap-1.5" style={{ borderTop: "1px solid var(--hairline)" }}>
              {pinnedNode.live(data).map((f) => (
                <div key={f.k} className="flex items-baseline justify-between gap-3">
                  <dt className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground">{f.k}</dt>
                  <dd className="text-[13px] font-mono text-foreground tabular-nums">{f.v}</dd>
                </div>
              ))}
            </dl>
          )}
          {(() => {
            const conns = EDGES
              .filter((e) => e.from === pinnedNode.id || e.to === pinnedNode.id)
              .map((e) => {
                const outgoing = e.from === pinnedNode.id;
                const other = byId.get(outgoing ? e.to : e.from);
                return other ? { outgoing, other, label: e.label } : null;
              })
              .filter((c): c is NonNullable<typeof c> => c !== null);
            if (conns.length === 0) return null;
            return (
              <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--hairline)" }}>
                <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground mb-1.5">connections</div>
                <div className="flex flex-col gap-1">
                  {conns.map((c, i) => (
                    <button key={i} type="button" className="omm-conn" onClick={() => setPinned(c.other.id)}>
                      <span style={{ color: TONE[c.other.tone] }}>{c.outgoing ? "→" : "←"}</span>
                      <span className="omm-conn-title">{c.other.title}</span>
                      {c.label && <span className="omm-conn-label">{c.label}</span>}
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}
        </aside>
      )}

      {/* Scoped styles — CSS vars only, both themes, reduced-motion safe */}
      <style>{`
        .omm-wrap { background: var(--surface-1); }
        .omm-ctl {
          width: 30px; height: 30px; border-radius: 8px; font-size: 15px; line-height: 1;
          color: var(--text-dim); background: var(--surface-1);
          border: 1px solid var(--hairline); cursor: pointer;
        }
        .omm-ctl:hover { color: hsl(var(--foreground)); border-color: color-mix(in oklch, var(--neon) 45%, var(--hairline)); }
        .omm-lane-line { position: absolute; left: 84px; right: 24px; top: 14px; border-top: 1px dashed color-mix(in oklch, var(--hairline) 70%, transparent); }
        .omm-lane-label { position: absolute; left: 0; top: 6px; font-family: var(--font-mono, monospace); font-size: 10px; letter-spacing: 0.26em; text-transform: uppercase; color: var(--text-dim); }
        .omm-lane-hint { position: absolute; left: 0; top: 22px; font-size: 10px; color: var(--text-dim); opacity: 0.7; }
        .omm-node {
          position: absolute; border-radius: 12px; padding: 10px 12px 10px 16px; overflow: hidden;
          border: 1px solid var(--hairline); cursor: pointer;
          transition: opacity 200ms ease, box-shadow 200ms ease, border-color 200ms ease;
        }
        .omm-node-active { border-color: color-mix(in oklch, var(--tone) 55%, var(--hairline)); box-shadow: 0 0 0 1px color-mix(in oklch, var(--tone) 35%, transparent), 0 8px 28px -12px color-mix(in oklch, var(--tone) 45%, transparent); }
        .omm-node-muted { opacity: 0.55; border-style: dashed; }
        .omm-node-accent { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: linear-gradient(180deg, var(--tone), color-mix(in oklch, var(--tone) 30%, transparent)); }
        .omm-node-kicker { font-family: var(--font-mono, monospace); font-size: 9px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--tone, var(--muted-foreground)); }
        .omm-node .omm-node-kicker { color: var(--tone); }
        .omm-node-title { font-size: 13px; font-weight: 600; color: hsl(var(--foreground)); line-height: 1.25; margin-top: 2px; }
        .omm-node-blurb { font-size: 10.5px; color: var(--text-dim); line-height: 1.35; margin-top: 3px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .omm-edge-label { font-family: var(--font-mono, monospace); font-size: 9.5px; letter-spacing: 0.04em; color: var(--text-dim); paint-order: stroke; stroke: hsl(var(--background)); stroke-width: 3px; }
        .omm-flow { animation: omm-dash 1.6s linear infinite; }
        .omm-edge-on .omm-flow { animation-duration: 0.9s; }
        .omm-edge-dim .omm-flow { animation: none; }
        .omm-pulse { offset-distance: 0%; animation-name: omm-travel; animation-timing-function: linear; animation-iteration-count: infinite; }
        @keyframes omm-dash { to { stroke-dashoffset: -32; } }
        @keyframes omm-travel { from { offset-distance: 0%; } to { offset-distance: 100%; } }
        .omm-tip { position: absolute; z-index: 40; width: 280px; padding: 10px 12px; border-radius: 12px; border: 1px solid var(--hairline); pointer-events: none; }
        .omm-detail {
          position: absolute; z-index: 45; right: 14px; bottom: 14px; width: 320px; max-width: calc(100% - 28px);
          padding: 14px 16px; border-radius: 14px; border: 1px solid color-mix(in oklch, var(--tone) 35%, var(--hairline));
        }
        .omm-detail-x { position: absolute; top: 8px; right: 10px; font-size: 16px; color: var(--text-dim); background: none; border: none; cursor: pointer; }
        .omm-detail-x:hover { color: hsl(var(--foreground)); }
        .omm-full { position: fixed; inset: 0; z-index: 60; height: 100vh !important; border-radius: 0; background: hsl(var(--background)); }
        .omm-legend {
          position: absolute; left: 14px; bottom: 12px; z-index: 30; pointer-events: none;
          display: flex; flex-wrap: wrap; align-items: center; gap: 10px;
          padding: 6px 12px; border-radius: 10px; border: 1px solid var(--hairline);
        }
        .omm-legend-item { display: inline-flex; align-items: center; gap: 5px; font-family: var(--font-mono, monospace); font-size: 9.5px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-dim); }
        .omm-legend-dot { width: 8px; height: 8px; border-radius: 999px; box-shadow: 0 0 6px currentColor; }
        .omm-legend-note { text-transform: none; letter-spacing: 0.02em; opacity: 0.75; }
        .omm-detail-full { width: 400px; max-height: 70vh; overflow-y: auto; }
        .omm-conn {
          display: flex; align-items: baseline; gap: 7px; width: 100%; text-align: left;
          background: none; border: none; padding: 2px 0; cursor: pointer; font-size: 12px;
        }
        .omm-conn-title { color: hsl(var(--foreground)); }
        .omm-conn:hover .omm-conn-title { text-decoration: underline; }
        .omm-conn-label { font-family: var(--font-mono, monospace); font-size: 10px; color: var(--text-dim); }
        @media (prefers-reduced-motion: reduce) {
          .omm-flow, .omm-pulse { animation: none !important; }
          .omm-node { transition: none; }
        }
      `}</style>
    </div>
  );
}

// Does node `other` touch any edge incident to `focus`?
function adjTouches(adj: Map<string, Set<number>>, edges: EdgeDef[], focus: string, other: string): boolean {
  const set = adj.get(focus);
  if (!set) return false;
  for (const i of set) {
    if (edges[i].from === other || edges[i].to === other) return true;
  }
  return false;
}

export default OperatingModelMap;
