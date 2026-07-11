"use client";
import { useEffect, useRef, useState } from "react";
import {
  FolderOpen,
  ExternalLink,
  GitBranch,
  Cpu,
  Kanban,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  List as ListIcon,
  Inbox,
  Crosshair,
  FolderKanban,
} from "lucide-react";
import EmptyStateGuide from "@/components/EmptyStateGuide";
import { Reveal } from "@/components/kit/Reveal";
import { Section } from "@/components/kit/Section";

interface AlgorithmSession {
  slug: string;
  task: string;
  phase: string;
  progress?: string;
  effort?: string;
}

interface WorkData {
  projects?: Array<{ name: string; path: string; url: string }>;
  currentFocus?: string;
  currentProject?: string;
  activeWorkstreams?: string;
  algorithmSessions?: AlgorithmSession[];
}

interface KanbanIssue {
  number: number;
  title: string;
  url: string;
  state: string;
  labels: string[];
  assignees: string[];
  ageHours: number;
  column: string;
  updatedAt: string;
  source?: string;
  principal_stated_goal?: string;
}

interface KanbanData {
  setup_required?: boolean;
  reason?: string;
  instructions?: string[];
  config?: { repo: string; columns: string[]; poll_interval_seconds: number };
  columns?: Record<string, KanbanIssue[]>;
  items?: KanbanIssue[];
  lastFetch?: string | null;
  stale?: boolean;
  stale_reason?: string;
}

/* ---------- theme-token color maps (re-theme with [data-theme]) ---------- */

const MUTED = "hsl(var(--muted-foreground))";

const PHASE_COLOR: Record<string, string> = {
  STARTING: "var(--neon-2)",
  NATIVE: "var(--neon-3)",
  OBSERVE: "var(--neon-2)",
  THINK: "var(--neon-2)",
  PLAN: "var(--dim-relationships)",
  BUILD: "var(--dim-creative)",
  EXECUTE: "var(--dim-money)",
  VERIFY: "var(--dim-rhythms)",
  LEARN: "var(--positive)",
  COMPLETE: "var(--positive)",
  DEFERRED: "var(--muted-foreground)",
};

const EFFORT_COLOR: Record<string, string> = {
  e1: "var(--positive)",
  e2: "var(--positive)",
  e3: "var(--dim-money)",
  e4: "var(--dim-creative)",
  e5: "var(--dim-creative)",
  fast: "var(--positive)",
  standard: "var(--positive)",
  advanced: "var(--dim-money)",
  deep: "var(--dim-money)",
  extended: "var(--dim-money)",
  comprehensive: "var(--dim-creative)",
};

const COLUMN_COLOR: Record<string, string> = {
  Inbox: MUTED,
  Queued: "var(--dim-relationships)",
  Ready: "var(--neon-2)",
  "In-Progress": "var(--dim-money)",
  Blocked: "var(--danger)",
  "In-Review": "var(--neon-3)",
  Complete: "var(--positive)",
  Done: "var(--positive)",
};

const PRIORITY_COLOR: Record<string, string> = {
  P0: "var(--danger)",
  P1: "var(--warn)",
  P2: "var(--dim-money)",
  P3: MUTED,
};

const TYPE_COLOR: Record<string, string> = {
  feature: "var(--neon-2)",
  problem: "var(--danger)",
  research: "var(--dim-relationships)",
  project: "var(--dim-money)",
  decision: "var(--neon)",
  reminder: "var(--warn)",
  "metric-alert": "var(--dim-creative)",
  queue: MUTED,
};

function progressPct(p?: string): number {
  if (!p) return 0;
  const m = p.match(/(\d+)\s*\/\s*(\d+)/);
  if (!m) return 0;
  const [, done, total] = m;
  const d = parseInt(done, 10);
  const t = parseInt(total, 10);
  return t > 0 ? Math.round((d / t) * 100) : 0;
}

function ageStr(h: number): string {
  if (h < 1) return "just now";
  if (h < 24) return h + "h";
  const d = Math.floor(h / 24);
  if (d < 7) return d + "d";
  return Math.floor(d / 7) + "w";
}

function cleanTitle(t: string): string {
  return t
    .replace(/\s*\[slug:[^\]]+\]\s*$/, "")
    .replace(/\s*\[goal:[^\]]+\]\s*$/, "")
    .trim();
}

// Priority: parse "Priority:P0".."Priority:P3" or bare "P0-…"; no priority → 4 (sinks below P3).
function priorityRank(labels: string[]): number {
  for (const l of labels) {
    const m = l.match(/^Priority:P([0-3])$/i) || l.match(/^P([0-3])\b/i);
    if (m) return parseInt(m[1], 10);
  }
  return 4;
}

function priorityLabel(labels: string[]): string | null {
  const r = priorityRank(labels);
  return r < 4 ? "P" + r : null;
}

function propValue(labels: string[]): string | null {
  for (const l of labels) {
    const m = l.match(/^Property:(.+)$/i);
    if (m) return m[1].toLowerCase();
  }
  for (const l of labels) {
    const lc = l.toLowerCase();
    if (["newsletter", "website", "youtube", "podcast", "community", "consulting", "open-source", "internal", "pai", "life"].includes(lc)) return lc;
  }
  return null;
}

// The canonical Type:* on an issue. Prefers a real type over the generic
// Type:queue when an issue still carries both.
function typeValue(labels: string[]): string | null {
  const types = labels
    .map((l) => { const m = l.match(/^Type:(.+)$/i); return m ? m[1].toLowerCase() : null; })
    .filter(Boolean) as string[];
  if (types.length === 0) return null;
  return types.find((t) => t !== "queue") ?? types[0];
}

function relativeUpdated(iso: string): string {
  if (!iso) return "";
  const diff = Date.now() - Date.parse(iso);
  if (Number.isNaN(diff)) return "";
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return m + "m";
  const h = Math.floor(m / 60);
  if (h < 24) return h + "h";
  const d = Math.floor(h / 24);
  if (d < 7) return d + "d";
  return Math.floor(d / 7) + "w";
}

/* ---------- small shared pieces ---------- */

function TokenPill({ text, color, title }: { text: string; color: string; title?: string }) {
  return (
    <span
      title={title}
      className="inline-flex items-center text-[10px] font-mono px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{
        color,
        background: "var(--surface-1)",
        border: `1px solid color-mix(in oklab, ${color} 35%, transparent)`,
      }}
    >
      {text}
    </span>
  );
}

function LabelPill({ text }: { text: string }) {
  return (
    <span
      className="inline-flex items-center text-[10px] font-mono px-2 py-0.5 rounded-full text-muted-foreground whitespace-nowrap"
      style={{ background: "var(--surface-1)", border: "1px solid var(--hairline)" }}
    >
      {text}
    </span>
  );
}

/* ---------- hero ---------- */

function Hero({
  focus,
  current,
  streams,
  sessionCount,
  projectCount,
}: {
  focus?: string;
  current?: string;
  streams?: string;
  sessionCount: number;
  projectCount: number;
}) {
  const stats = [
    { label: "Sessions", value: sessionCount, icon: Cpu },
    { label: "Projects", value: projectCount, icon: FolderKanban },
  ].filter((s) => s.value > 0);

  return (
    <section className="pt-8 sm:pt-10">
      <div className="flex items-center gap-2.5 mb-4 text-[11px] font-mono uppercase tracking-[0.28em] text-muted-foreground">
        <span
          className="w-1.5 h-1.5 rounded-full anim-breathe"
          style={{ background: "var(--positive)", boxShadow: "0 0 8px var(--positive)" }}
        />
        LifeOS · Work Hub
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold leading-tight text-foreground">Work</h1>
      {focus && (
        <div className="mt-4 max-w-[70ch]">
          <div className="text-[10px] font-mono uppercase tracking-[0.24em] mb-1.5" style={{ color: "var(--neon)" }}>
            Focus
          </div>
          <p className="text-[16px] sm:text-[18px] font-medium leading-snug text-foreground" data-sensitive>
            {focus}
          </p>
        </div>
      )}

      {(current || streams) && (
        <div className="mt-4 flex flex-col gap-1">
          {current && (
            <p className="text-[13px] font-mono text-muted-foreground" data-sensitive>
              <span className="uppercase tracking-[0.16em] text-[10px] mr-2" style={{ color: "var(--neon)" }}>primary</span>
              {current}
            </p>
          )}
          {streams && (
            <p className="text-[13px] font-mono text-muted-foreground" data-sensitive>
              <span className="uppercase tracking-[0.16em] text-[10px] mr-2" style={{ color: "var(--neon)" }}>streams</span>
              {streams}
            </p>
          )}
        </div>
      )}

      {stats.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-3">
          {stats.map((s) => (
            <div key={s.label} className="glass rounded-lg px-3.5 py-3 min-w-[124px]">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                <s.icon className="w-3.5 h-3.5" />
                <span className="text-[10px] font-mono uppercase tracking-[0.16em]">{s.label}</span>
              </div>
              <div className="text-3xl font-bold font-mono text-foreground tabular-nums">{String(s.value).padStart(2, "0")}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ---------- algorithm sessions ---------- */

function AlgorithmSessions({ sessions }: { sessions?: AlgorithmSession[] }) {
  if (!sessions || sessions.length === 0) return null;
  return (
    <Section icon={Cpu} kicker="Autonomous runs on the machine" title="Algorithm Sessions" count={sessions.length}>
      <Reveal>
        <div className="glass rounded-xl overflow-hidden">
          {sessions.slice(0, 10).map((s, i) => {
            const phase = (s.phase || "unknown").toUpperCase();
            const phaseColor = PHASE_COLOR[phase] ?? MUTED;
            const pct = progressPct(s.progress);
            // "0/0" is a zero-only readout — show the bar only when steps exist.
            const totalSteps = (() => { const m = (s.progress || "").match(/\d+\s*\/\s*(\d+)/); return m ? parseInt(m[1], 10) : 0; })();
            const effort = s.effort?.toLowerCase();
            const effortColor = effort ? EFFORT_COLOR[effort] ?? MUTED : null;
            return (
              <div
                key={s.slug}
                className="flex items-center gap-4 px-4 sm:px-5 py-3.5"
                style={{ borderTop: i === 0 ? "none" : "1px solid var(--hairline)" }}
                data-sensitive
              >
                <span
                  className="inline-flex justify-center shrink-0 w-[92px] text-[10px] font-mono uppercase tracking-[0.08em] px-2 py-1 rounded-full"
                  style={{
                    color: phaseColor,
                    background: "var(--surface-1)",
                    border: `1px solid color-mix(in oklab, ${phaseColor} 35%, transparent)`,
                  }}
                >
                  {phase}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] text-foreground truncate" title={s.task}>{s.task}</div>
                  <div className="text-[11px] font-mono mt-0.5 truncate text-muted-foreground">{s.slug}</div>
                </div>
                {s.progress && totalSteps > 0 && (
                  <div className="w-24 sm:w-28 shrink-0">
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface-1)" }}>
                      <div className="h-full rounded-full" style={{ width: pct + "%", background: "var(--neon)" }} />
                    </div>
                    <div className="text-[11px] font-mono text-right tabular-nums mt-1 text-muted-foreground">{s.progress}</div>
                  </div>
                )}
                {s.effort && effortColor && <TokenPill text={s.effort} color={effortColor} />}
              </div>
            );
          })}
        </div>
      </Reveal>
    </Section>
  );
}

/* ---------- work items (GitHub Issues, polled from /api/work) ----------
   One fetch lives in WorkItemsPanel and feeds BOTH the List and Kanban views —
   they are two renderings of one dataset, never two fetches. */

// Canonical kanban pipeline order — Status sort uses this, NOT alphabetical.
const STATUS_ORDER = ["Inbox", "Queued", "Ready", "In-Progress", "Blocked", "In-Review", "Complete", "Done"];

function statusRank(col: string): number {
  const i = STATUS_ORDER.indexOf(col);
  return i === -1 ? 99 : i;
}

function KanbanCard({ issue }: { issue: KanbanIssue }) {
  const labels = (issue.labels || []).filter((l) => l !== "pai-sync");
  return (
    <a
      href={issue.url}
      target="_blank"
      rel="noreferrer"
      className="block hover-lift rounded-lg p-3 mb-2"
      style={{ background: "var(--surface-1)", border: "1px solid var(--hairline)", textDecoration: "none" }}
    >
      <div className="text-[11px] font-mono text-muted-foreground mb-1">#{issue.number}</div>
      <div className="text-[13px] font-medium leading-snug text-foreground mb-1.5" title={issue.title}>
        {cleanTitle(issue.title)}
      </div>
      {labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {labels.slice(0, 4).map((l) => <LabelPill key={l} text={l} />)}
        </div>
      )}
      <div className="flex justify-between items-center mt-2 text-[11px] font-mono text-muted-foreground">
        <span style={{ color: "var(--neon-3)" }}>
          {issue.assignees && issue.assignees.length > 0 ? "@" + issue.assignees.join(" @") : ""}
        </span>
        <span>{ageStr(issue.ageHours)}</span>
      </div>
    </a>
  );
}

/* ---------- kanban view (presentational — data comes from the panel) ---------- */

function KanbanView({ data }: { data: KanbanData }) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const COLUMN_WIDTH = 240;
  const COLUMN_GAP = 12;

  const scrollByCol = (dir: -1 | 1) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir * (COLUMN_WIDTH + COLUMN_GAP), behavior: "smooth" });
  };

  const cols = data.config?.columns ?? [];
  const grouped = data.columns ?? {};

  return (
    <div>
      <div className="flex justify-end gap-1.5 mb-2">
        <button
          onClick={() => scrollByCol(-1)}
          className="grid place-items-center w-8 h-8 rounded-lg glass text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Scroll columns left"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => scrollByCol(1)}
          className="grid place-items-center w-8 h-8 rounded-lg glass text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Scroll columns right"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div
        ref={scrollRef}
        className="kanban-scroll flex gap-3 overflow-x-auto pb-4"
        style={{ scrollSnapType: "x proximity", scrollBehavior: "smooth" }}
      >
        {cols.map((col) => {
          const items = grouped[col] || [];
          const color = COLUMN_COLOR[col] ?? MUTED;
          return (
            <div
              key={col}
              className="glass rounded-xl flex flex-col shrink-0"
              style={{ width: COLUMN_WIDTH, flex: `0 0 ${COLUMN_WIDTH}px`, maxHeight: "70vh", scrollSnapAlign: "start" }}
            >
              <div className="flex items-center gap-2 px-3 py-2.5" style={{ borderBottom: "1px solid var(--hairline)" }}>
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
                <span className="text-[11px] font-mono font-semibold uppercase tracking-[0.1em] text-foreground">{col}</span>
                <span className="ml-auto text-[11px] font-mono text-muted-foreground tabular-nums">
                  {String(items.length).padStart(2, "0")}
                </span>
              </div>
              <div className="p-2 min-h-[80px] overflow-y-auto flex-1">
                {items.length === 0 ? (
                  <div
                    className="grid place-items-center rounded-lg py-6 text-[11px] font-mono text-muted-foreground"
                    style={{ border: "1px dashed var(--hairline)" }}
                  >
                    empty
                  </div>
                ) : (
                  items.map((issue) => <KanbanCard key={issue.number} issue={issue} />)
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- list view (sortable flat list — the default tab) ---------- */

type SortKey = "updated" | "priority" | "status" | "age" | "title" | "number";
type SortDir = 1 | -1;

// First-click direction per key — one click always does the obvious thing.
const SORT_FIRST_DIR: Record<SortKey, SortDir> = {
  updated: -1, // newest first
  priority: 1, // P0 first
  status: 1, // pipeline order Inbox→Complete
  age: -1, // oldest first
  title: 1, // A→Z
  number: -1, // highest # first
};

function compareBy(a: KanbanIssue, b: KanbanIssue, key: SortKey): number {
  switch (key) {
    case "updated": return (Date.parse(a.updatedAt) || 0) - (Date.parse(b.updatedAt) || 0);
    case "priority": return priorityRank(a.labels || []) - priorityRank(b.labels || []);
    case "status": return statusRank(a.column) - statusRank(b.column);
    case "age": return (a.ageHours || 0) - (b.ageHours || 0);
    case "title": return cleanTitle(a.title).localeCompare(cleanTitle(b.title), undefined, { sensitivity: "base", numeric: true });
    case "number": return a.number - b.number;
  }
}

const SORT_STORAGE_KEY = "pulse.work.list.sort";

function SortHeader({
  label,
  col,
  active,
  dir,
  onSort,
  align,
}: {
  label: string;
  col: SortKey;
  active: boolean;
  dir: SortDir;
  onSort: (k: SortKey) => void;
  align?: "left" | "right";
}) {
  return (
    <button
      onClick={() => onSort(col)}
      className="inline-flex items-center gap-0.5 w-full p-0 bg-transparent border-none cursor-pointer text-[10px] font-mono uppercase tracking-[0.12em] font-semibold transition-colors"
      style={{
        color: active ? "var(--neon)" : "hsl(var(--muted-foreground))",
        justifyContent: align === "right" ? "flex-end" : "flex-start",
      }}
    >
      {label}
      {active ? (
        dir === -1 ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />
      ) : (
        <ChevronsUpDown className="w-3 h-3" style={{ opacity: 0.25 }} />
      )}
    </button>
  );
}

const LIST_GRID = "16px 28px 48px minmax(190px, 1fr) 96px 104px 96px 52px 66px 20px";

function WorkList({ data }: { data: KanbanData }) {
  const [sortKey, setSortKey] = useState<SortKey>("updated");
  const [sortDir, setSortDir] = useState<SortDir>(-1);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Restore persisted sort once on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SORT_STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (p && typeof p.key === "string") setSortKey(p.key);
        if (p && (p.dir === 1 || p.dir === -1)) setSortDir(p.dir);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const onSort = (k: SortKey) => {
    if (k === sortKey) {
      setSortDir((d) => {
        const nd = (d === 1 ? -1 : 1) as SortDir;
        try { localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify({ key: k, dir: nd })); } catch { /* ignore */ }
        return nd;
      });
    } else {
      const nd = SORT_FIRST_DIR[k];
      setSortKey(k);
      setSortDir(nd);
      try { localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify({ key: k, dir: nd })); } catch { /* ignore */ }
    }
  };

  const allItems = data.items ?? [];
  const typesPresent = Array.from(
    new Set(allItems.map((i) => typeValue(i.labels || [])).filter(Boolean) as string[]),
  ).sort();
  const typeCount = (t: string) => allItems.filter((i) => typeValue(i.labels || []) === t).length;
  const items = typeFilter === "all" ? allItems : allItems.filter((i) => typeValue(i.labels || []) === typeFilter);
  const sorted = items.slice().sort((a, b) => {
    const c = compareBy(a, b, sortKey) * sortDir;
    if (c !== 0) return c;
    return a.number - b.number; // stable tiebreak so re-sorts don't jitter
  });

  if (allItems.length === 0) {
    return (
      <div className="glass rounded-xl text-center px-4 py-10">
        <Inbox className="w-8 h-8 mx-auto text-muted-foreground" style={{ opacity: 0.4 }} />
        <p className="text-[13px] text-muted-foreground mt-3">No work items. You&apos;re clear.</p>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl overflow-hidden">
      {/* Filter toolbar */}
      <div className="flex items-center gap-2.5 px-3.5 py-2.5 flex-wrap" style={{ borderBottom: "1px solid var(--hairline)" }}>
        <span className="text-[10px] font-mono uppercase tracking-[0.12em] font-semibold text-muted-foreground">Type</span>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="text-[12px] font-mono rounded-lg px-2 py-1 cursor-pointer text-foreground"
          style={{ background: "var(--surface-1)", border: "1px solid var(--hairline)" }}
        >
          <option value="all">all ({allItems.length})</option>
          {typesPresent.map((t) => (
            <option key={t} value={t}>{t} ({typeCount(t)})</option>
          ))}
        </select>
        {typeFilter !== "all" && (
          <button
            onClick={() => setTypeFilter("all")}
            className="text-[11px] font-mono px-2 py-0.5 rounded-full cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
            style={{ background: "var(--surface-1)", border: "1px solid var(--hairline)" }}
          >
            clear
          </button>
        )}
        <span className="flex-1" />
        <span className="text-[11px] font-mono text-muted-foreground tabular-nums">{sorted.length} shown</span>
      </div>

      {/* Horizontal scroll wrapper so the dense grid survives narrow viewports */}
      <div className="overflow-x-auto">
        <div className="min-w-[880px]">
          {/* Header row */}
          <div
            className="grid items-center gap-2.5 px-3.5 py-2.5"
            style={{ gridTemplateColumns: LIST_GRID, borderBottom: "1px solid var(--hairline-strong)" }}
          >
            <span />
            <SortHeader label="P" col="priority" active={sortKey === "priority"} dir={sortDir} onSort={onSort} />
            <SortHeader label="#" col="number" active={sortKey === "number"} dir={sortDir} onSort={onSort} align="right" />
            <SortHeader label="Title" col="title" active={sortKey === "title"} dir={sortDir} onSort={onSort} />
            <span className="text-[10px] font-mono uppercase tracking-[0.12em] font-semibold text-muted-foreground">Type</span>
            <SortHeader label="Status" col="status" active={sortKey === "status"} dir={sortDir} onSort={onSort} />
            <span className="text-[10px] font-mono uppercase tracking-[0.12em] font-semibold text-muted-foreground">Property</span>
            <SortHeader label="Age" col="age" active={sortKey === "age"} dir={sortDir} onSort={onSort} align="right" />
            <SortHeader label="Updated" col="updated" active={sortKey === "updated"} dir={sortDir} onSort={onSort} align="right" />
            <span />
          </div>

          {/* Rows */}
          <div>
            {sorted.length === 0 && (
              <div className="text-muted-foreground text-center text-[12px] font-mono py-6">
                No {typeFilter} items match.
              </div>
            )}
            {sorted.map((it) => {
              const isClosed = it.state === "CLOSED";
              const color = COLUMN_COLOR[it.column] ?? MUTED;
              const prio = priorityLabel(it.labels || []);
              const prop = propValue(it.labels || []);
              const tv = typeValue(it.labels || []);
              const isExpanded = expanded === it.number;
              const hasGoal = !!it.principal_stated_goal;
              return (
                <div key={it.number}>
                  <div
                    onClick={() => setExpanded(isExpanded ? null : it.number)}
                    className="grid items-center gap-2.5 px-3.5 py-2 cursor-pointer transition-colors work-row"
                    style={{
                      gridTemplateColumns: LIST_GRID,
                      borderBottom: "1px solid var(--hairline)",
                      opacity: isClosed ? 0.55 : 1,
                      background: isExpanded ? "var(--surface-1)" : undefined,
                    }}
                    title={cleanTitle(it.title)}
                  >
                    {/* status dot */}
                    <span
                      className="w-2 h-2 rounded-full box-border"
                      style={{
                        background: isClosed ? "transparent" : color,
                        border: isClosed ? `2px solid ${color}` : "none",
                        boxShadow: isClosed ? "none" : `0 0 6px ${color}`,
                      }}
                    />
                    {/* priority */}
                    <span className="inline-flex justify-center">
                      {prio ? (
                        <span className="text-[10px] font-mono font-bold" style={{ color: PRIORITY_COLOR[prio] }}>{prio}</span>
                      ) : null}
                    </span>
                    {/* number */}
                    <span className="text-[11px] font-mono text-muted-foreground text-right tabular-nums">#{it.number}</span>
                    {/* title */}
                    <span className="flex items-center gap-1.5 min-w-0">
                      {hasGoal && (
                        <Crosshair className="w-3 h-3 shrink-0" style={{ color: "var(--dim-money)" }} aria-label="Linked to a stated goal" />
                      )}
                      <span className="text-[13px] text-foreground truncate">{cleanTitle(it.title)}</span>
                    </span>
                    {/* type pill */}
                    <span className="flex min-w-0">
                      {tv ? <TokenPill text={tv} color={TYPE_COLOR[tv] ?? MUTED} /> : null}
                    </span>
                    {/* status pill */}
                    <span className="justify-self-start">
                      <TokenPill text={it.column} color={color} />
                    </span>
                    {/* property */}
                    <span className="text-[11px] font-mono text-muted-foreground truncate">{prop ?? ""}</span>
                    {/* age */}
                    <span className="text-[11px] font-mono text-muted-foreground text-right tabular-nums">{ageStr(it.ageHours)}</span>
                    {/* updated */}
                    <span className="text-[11px] font-mono text-muted-foreground text-right tabular-nums">{relativeUpdated(it.updatedAt)}</span>
                    {/* open in github */}
                    <a
                      href={it.url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex justify-center text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Open in GitHub"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  {/* Expanded detail — leads with the principal-stated goal (the "why"). */}
                  {isExpanded && (
                    <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--hairline)", background: "var(--surface-1)" }}>
                      {it.principal_stated_goal && (
                        <p className="flex items-start gap-1.5 text-[12px] italic mb-2" style={{ color: "var(--neon-2)" }}>
                          <Crosshair className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          why: {it.principal_stated_goal}
                        </p>
                      )}
                      <p className="text-[13px] text-foreground leading-relaxed mb-2">{cleanTitle(it.title)}</p>
                      {(it.labels || []).filter((l) => l !== "pai-sync").length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {(it.labels || []).filter((l) => l !== "pai-sync").map((l) => <LabelPill key={l} text={l} />)}
                        </div>
                      )}
                      <div className="flex gap-4 flex-wrap items-center text-[11px] font-mono text-muted-foreground">
                        <span>state: {it.state}</span>
                        {it.assignees && it.assignees.length > 0 && <span>@{it.assignees.join(" @")}</span>}
                        {it.source && <span>source: {it.source}</span>}
                        <span>age {ageStr(it.ageHours)}</span>
                        <a
                          href={it.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 transition-colors"
                          style={{ color: "var(--neon-2)" }}
                        >
                          <ExternalLink className="w-3 h-3" /> Open in GitHub
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- work items panel — owns the single /api/work fetch + tabs ---------- */

function WorkItemsPanel() {
  const [data, setData] = useState<KanbanData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<"list" | "kanban">("list");

  const load = async () => {
    try {
      const r = await fetch("/api/work", { cache: "no-store" });
      if (!r.ok) throw new Error("HTTP " + r.status);
      setData(await r.json());
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetch("/api/work/refresh", { method: "POST" });
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  if (error) {
    return (
      <Section icon={Kanban} kicker="GitHub-backed pipeline" title="Work Items">
        <div className="glass rounded-xl p-4 flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: "var(--danger)", boxShadow: "0 0 8px var(--danger)" }} />
          <p className="text-[13px]" style={{ color: "var(--danger)" }}>Failed to load /api/work — {error}</p>
        </div>
      </Section>
    );
  }

  if (!data) {
    return (
      <Section icon={Kanban} kicker="GitHub-backed pipeline" title="Work Items">
        <div className="text-[13px] font-mono text-muted-foreground">Loading work items…</div>
      </Section>
    );
  }

  if (data.setup_required) {
    return (
      <Section icon={Kanban} kicker="GitHub-backed pipeline" title="Work Items">
        <div className="glass rounded-xl p-5">
          <p className="text-[13px] text-muted-foreground">{data.reason}</p>
          <ol className="text-[13px] text-foreground mt-3 ml-5 space-y-1 list-decimal">
            {(data.instructions || []).map((s, i) => <li key={i}>{s}</li>)}
          </ol>
        </div>
      </Section>
    );
  }

  const total = data.items?.length ?? 0;

  const TabButton = ({ id, label, icon: Icon }: { id: "list" | "kanban"; label: string; icon: typeof ListIcon }) => {
    const on = tab === id;
    return (
      <button
        onClick={() => setTab(id)}
        className="relative inline-flex items-center gap-1.5 px-1 py-1.5 bg-transparent border-none cursor-pointer text-[12px] font-mono uppercase tracking-[0.12em] font-semibold transition-colors"
        style={{ color: on ? "var(--neon)" : "hsl(var(--muted-foreground))" }}
      >
        <Icon className="w-3.5 h-3.5" />
        {label}
        {on && (
          <span
            className="absolute left-0 right-0 -bottom-[3px] h-[2px] rounded-full"
            style={{ background: "var(--neon)", boxShadow: "0 0 10px var(--glow)" }}
          />
        )}
      </button>
    );
  };

  return (
    <Section icon={Kanban} kicker="GitHub-backed pipeline" title="Work Items" count={total}>
      <Reveal>
        <div className="flex items-center gap-5 flex-wrap mb-4 pb-1.5" style={{ borderBottom: "1px solid var(--hairline)" }}>
          <TabButton id="list" label="List" icon={ListIcon} />
          <TabButton id="kanban" label="Kanban" icon={Kanban} />
          <span className="flex-1" />
          <span className="text-[11px] font-mono text-muted-foreground">
            {data.config?.repo} · poll {data.config?.poll_interval_seconds}s
          </span>
          {data.lastFetch && (
            <span className="text-[11px] font-mono text-muted-foreground">
              fetched {new Date(data.lastFetch).toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-full cursor-pointer text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60"
            style={{ background: "var(--surface-1)", border: "1px solid var(--hairline)" }}
          >
            <RefreshCw className="w-3 h-3" style={{ animation: refreshing ? "spin-slow 1s linear infinite" : undefined }} />
            {refreshing ? "Refreshing" : "Refresh"}
          </button>
        </div>

        {data.stale && (
          <div className="glass rounded-xl p-3.5 mb-3 flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full shrink-0 anim-breathe" style={{ background: "var(--warn)", boxShadow: "0 0 8px var(--warn)" }} />
            <p className="text-[12px] font-mono" style={{ color: "var(--warn)" }}>
              Stale data — {data.stale_reason || "gh fetch failed; showing cached snapshot"}
            </p>
          </div>
        )}

        {tab === "list" ? <WorkList data={data} /> : <KanbanView data={data} />}
      </Reveal>
    </Section>
  );
}

/* ---------- projects ---------- */

function Projects({ projects }: { projects?: Array<{ name: string; path: string; url: string }> }) {
  if (!projects || projects.length === 0) return null;
  return (
    <Section icon={GitBranch} kicker="Repos in play" title="Projects" count={projects.length}>
      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
        {projects.map((p, i) => {
          const isPublic = !p.url.toLowerCase().includes("private");
          const href = isPublic && p.url.startsWith("github.com") ? `https://${p.url}` : undefined;
          return (
            <Reveal key={p.name} delay={i * 40}>
              <div className="glass hover-lift rounded-xl p-4 h-full">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FolderOpen className="w-4 h-4 shrink-0" style={{ color: "var(--neon)" }} />
                    <h3 className="text-[14px] font-semibold text-foreground truncate">{p.name}</h3>
                  </div>
                  {href ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={`Open ${p.name} on GitHub`}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  ) : (
                    <LabelPill text="private" />
                  )}
                </div>
                <div className="text-[11px] font-mono mt-2 truncate text-muted-foreground" data-sensitive title={p.path}>
                  {p.path}
                </div>
                <div className="text-[11px] font-mono mt-1 truncate text-muted-foreground" data-sensitive title={p.url}>
                  {p.url}
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </Section>
  );
}

/* ---------- page ---------- */

export default function WorkPage() {
  const [data, setData] = useState<WorkData | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/life/work")
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch((e) => setError(String(e)));
  }, []);
  if (error) {
    return (
      <div className="px-5 sm:px-8 pt-10 max-w-5xl mx-auto">
        <div className="glass rounded-xl p-5 flex items-start gap-2.5">
          <span className="mt-1.5 w-2 h-2 rounded-full shrink-0" style={{ background: "var(--danger)", boxShadow: "0 0 8px var(--danger)" }} />
          <div>
            <h2 className="text-[15px] font-semibold" style={{ color: "var(--danger)" }}>Failed to load work</h2>
            <p className="text-[13px] text-muted-foreground mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }
  if (!data) return <div className="px-5 sm:px-8 pt-10 text-[13px] font-mono text-muted-foreground">Loading Work…</div>;

  const sessionCount = data.algorithmSessions?.length ?? 0;
  const projectCount = data.projects?.length ?? 0;
  const showEmptyGuide = sessionCount === 0 && projectCount === 0 && !data.currentFocus && !data.currentProject;

  return (
    <div className="px-5 sm:px-8 lg:px-10 pb-24 max-w-[1400px] mx-auto">
      {showEmptyGuide && (
        <div className="pt-8">
          <EmptyStateGuide
            section="Work Hub"
            description="Active tasks, projects, and team work. Wire it up to GitHub Issues, Linear, ClickUp, or another PM tool to populate."
            hideInterview
            daPromptExample="set up my work hub against my project tracker"
          />
        </div>
      )}
      <Hero
        focus={data.currentFocus}
        current={data.currentProject}
        streams={data.activeWorkstreams}
        sessionCount={sessionCount}
        projectCount={projectCount}
      />
      <WorkItemsPanel />
      <AlgorithmSessions sessions={data.algorithmSessions} />
      <Projects projects={data.projects} />
    </div>
  );
}
