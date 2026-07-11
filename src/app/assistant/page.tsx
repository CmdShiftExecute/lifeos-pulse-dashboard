"use client";

import { useState, type CSSProperties } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { localApiCall } from "@/lib/local-api";
import EmptyStateGuide from "@/components/EmptyStateGuide";
import { Reveal } from "@/components/kit/Reveal";
import { Section } from "@/components/kit/Section";
import {
  Zap, Terminal, Clock, Plus, X, Trash2,
  Heart, Brain, Shield, Pencil, Check, ChevronDown, ChevronRight, Repeat,
  BookOpen, ListChecks, MessageSquare, Sparkles, PawPrint, ThumbsDown,
  type LucideIcon,
} from "lucide-react";

// ── Types ──

interface Identity {
  name: string;
  full_name: string;
  display_name: string;
  color: string;
  role: string;
  origin_story: string;
  has_avatar: boolean;
  principal: string;
  uptime_ms: number;
}

interface Personality {
  base_description: string;
  traits: Record<string, number>;
  anchors: Array<{ name: string; description: string }>;
  preferences: {
    what_i_love: string[];
    what_i_dislike: string[];
    working_style: string[];
    intellectual_interests: string[];
  };
  companion: { name: string; species: string; personality: string } | null;
  relationship: { dynamic: string; interaction_style: string };
  autonomy: { can_initiate: string[]; must_ask: string[] };
  writing: { style: string; avoid: string[]; prefer: string[] };
  voice: { provider: string } | null;
}

interface UnifiedTask {
  name: string;
  schedule: string;
  status: string;
  source: "da" | "pulse" | "claude-code";
  details?: Record<string, unknown>;
}

interface TasksResponse {
  tasks: UnifiedTask[];
  count: number;
  by_source: { da: number; pulse: number; "claude-code": number };
}

interface CronJob {
  name: string;
  schedule: string;
  type: "script" | "claude";
  command: string | null;
  prompt: string | null;
  model: string | null;
  output: string | string[];
  enabled: boolean;
  source: "system" | "user";
}

interface CronListResponse {
  jobs: CronJob[];
  user_file_path: string;
  counts: { total: number; enabled: number; system: number; user: number };
}

interface DiaryEntry {
  date: string;
  interaction_count: number;
  topics: string[];
  mood: "positive" | "neutral" | "frustrated";
  avg_rating: number;
  notable_moments: string[];
  learning: string | null;
}

interface Health {
  status: string;
  primary_da: string;
  identity_loaded: boolean;
  scheduled_tasks: number;
  last_heartbeat: string | null;
  diary_entries_today: number;
  opinions_count: number;
}

/* ---------- theme-token color maps (re-theme with [data-theme]) ---------- */

const MUTED = "hsl(var(--muted-foreground))";

const STATUS_COLOR: Record<string, string> = {
  active: "var(--positive)",
  disabled: MUTED,
  completed: MUTED,
  cancelled: "var(--danger)",
};

const MOOD_COLOR: Record<string, string> = {
  positive: "var(--positive)",
  neutral: MUTED,
  frustrated: "var(--danger)",
};

// Trait bars cycle through the accent family so adjacent bars stay distinct.
const TRAIT_ACCENTS = [
  "var(--neon)",
  "var(--neon-2)",
  "var(--neon-3)",
  "var(--dim-creative)",
  "var(--dim-relationships)",
  "var(--dim-rhythms)",
];

const inputStyle: CSSProperties = {
  background: "var(--surface-1)",
  border: "1px solid var(--hairline)",
  color: "hsl(var(--foreground))",
};

// ── Helpers ──

function formatUptime(ms: number): string {
  const h = Math.floor(ms / 3_600_000), m = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
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

/** Mono kicker header for the sub-cards inside a Section grid. */
function CardHead({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--neon)" }} />
      <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
    </div>
  );
}

function TraitBar({ name, value, color, onEdit }: { name: string; value: number; color: string; onEdit?: (v: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const label = name.replace(/_/g, " ");

  return (
    <div className="flex items-center gap-3 group">
      <span className="w-32 truncate capitalize text-[13px] text-foreground" data-sensitive>
        {label}
      </span>
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface-1)" }}>
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
      </div>
      {editing ? (
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            min={0}
            max={100}
            value={editValue}
            onChange={(e) => setEditValue(Number(e.target.value))}
            className="w-14 text-[12px] font-mono tabular-nums rounded px-2 py-1"
            style={inputStyle}
            aria-label={`New value for ${label}`}
          />
          <button
            onClick={() => { onEdit?.(editValue); setEditing(false); }}
            style={{ color: "var(--positive)" }}
            aria-label={`Save ${label}`}
          >
            <Check className="w-4 h-4" />
          </button>
          <button onClick={() => setEditing(false)} className="text-muted-foreground" aria-label="Cancel edit">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <>
          <span className="w-10 text-right text-[12px] font-mono tabular-nums text-muted-foreground">{value}</span>
          {onEdit && (
            <button
              onClick={() => { setEditValue(value); setEditing(true); }}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
              aria-label={`Edit ${label}`}
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ── Page ──

export default function AssistantPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"tasks" | "personality" | "diary">("tasks");

  const { data: identity } = useQuery<Identity>({ queryKey: ["assistant-identity"], queryFn: () => localApiCall("/assistant/identity"), refetchInterval: 30_000 });
  const { data: health } = useQuery<Health>({ queryKey: ["assistant-health"], queryFn: () => localApiCall("/assistant/health"), refetchInterval: 10_000 });
  const { data: personality } = useQuery<Personality>({ queryKey: ["assistant-personality"], queryFn: () => localApiCall("/assistant/personality"), refetchInterval: 60_000 });
  const { data: tasksData } = useQuery<TasksResponse>({ queryKey: ["assistant-tasks"], queryFn: () => localApiCall("/assistant/tasks"), refetchInterval: 15_000 });
  const { data: diaryData } = useQuery<{ entries: DiaryEntry[] }>({ queryKey: ["assistant-diary"], queryFn: () => localApiCall("/assistant/diary"), refetchInterval: 60_000 });
  const { data: opinionsData } = useQuery<{ raw: string }>({ queryKey: ["assistant-opinions"], queryFn: () => localApiCall("/assistant/opinions"), refetchInterval: 60_000 });

  // Cron CRUD — full source-of-truth list (system + user merged), plus
  // patch/delete/post mutations. Refresh via "assistant-cron" key.
  const { data: cronData } = useQuery<CronListResponse>({
    queryKey: ["assistant-cron"],
    queryFn: () => localApiCall("/assistant/cron"),
    refetchInterval: 15_000,
  });

  const toggleCron = useMutation({
    mutationFn: ({ name, enabled }: { name: string; enabled: boolean }) =>
      localApiCall(`/assistant/cron/${encodeURIComponent(name)}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["assistant-cron"] }),
  });

  const deleteCron = useMutation({
    mutationFn: (name: string) =>
      localApiCall(`/assistant/cron/${encodeURIComponent(name)}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["assistant-cron"] }),
  });

  const [showAddCron, setShowAddCron] = useState(false);
  const [newCronName, setNewCronName] = useState("");
  const [newCronSchedule, setNewCronSchedule] = useState("");
  const [newCronCommand, setNewCronCommand] = useState("");

  // Expand-to-edit state. One row open at a time keeps the UI calm.
  const [expandedCron, setExpandedCron] = useState<string | null>(null);
  const [editBuffer, setEditBuffer] = useState<Partial<CronJob>>({});
  const [editError, setEditError] = useState<string | null>(null);

  // Pagination for the (often 25+) cron list.
  const CRON_PAGE_SIZE = 10;
  const [cronPage, setCronPage] = useState(0);

  const patchCron = useMutation({
    mutationFn: ({ name, patch }: { name: string; patch: Partial<CronJob> }) =>
      localApiCall(`/assistant/cron/${encodeURIComponent(name)}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assistant-cron"] });
      setEditError(null);
      setEditBuffer({});
    },
    onError: (err: Error) => setEditError(err.message ?? "Update failed"),
  });

  function openExpand(job: CronJob) {
    setExpandedCron(job.name);
    setEditBuffer({
      schedule: job.schedule,
      command: job.command,
      prompt: job.prompt,
      model: job.model,
      output: job.output,
      type: job.type,
    });
    setEditError(null);
  }

  function closeExpand() {
    setExpandedCron(null);
    setEditBuffer({});
    setEditError(null);
  }

  // Heuristic: is a Claude Code trigger actually a loop?
  // Triggers populated by `claude triggers list` may include /loop sessions —
  // surface those distinctly so {{PRINCIPAL_NAME}} can tell them apart from one-shot crons.
  function detectLoop(task: UnifiedTask): boolean {
    const name = (task.name ?? "").toLowerCase();
    const sched = (task.schedule ?? "").toLowerCase();
    return name.includes("loop") || sched.includes("loop") || name.startsWith("/loop") || (task.details?.kind as string) === "loop";
  }

  const createCron = useMutation({
    mutationFn: (job: { name: string; schedule: string; type: "script"; command: string; output: string; enabled: boolean }) =>
      localApiCall("/assistant/cron", { method: "POST", body: JSON.stringify(job) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assistant-cron"] });
      setShowAddCron(false);
      setNewCronName("");
      setNewCronSchedule("");
      setNewCronCommand("");
    },
  });

  const updateTrait = useMutation({
    mutationFn: (update: Record<string, number>) =>
      localApiCall("/assistant/personality/traits", { method: "PATCH", body: JSON.stringify(update) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["assistant-personality"] }),
  });

  const isFreshInstall = health ? !health.identity_loaded : !identity;

  /* ---------- hero stats (only real, non-zero readouts) ---------- */

  const ccCount = tasksData?.by_source["claude-code"] ?? 0;
  const pulseCount = tasksData?.by_source.pulse ?? 0;
  const opinionCount = health?.opinions_count ?? 0;

  const stats: Array<{ label: string; value: string; icon: LucideIcon }> = [];
  if (identity) stats.push({ label: "Uptime", value: formatUptime(identity.uptime_ms), icon: Clock });
  if (ccCount > 0) stats.push({ label: "CC Scheduled", value: String(ccCount).padStart(2, "0"), icon: Terminal });
  if (pulseCount > 0) stats.push({ label: "Cron Jobs", value: String(pulseCount).padStart(2, "0"), icon: Zap });
  if (opinionCount > 0) stats.push({ label: "Opinions", value: String(opinionCount).padStart(2, "0"), icon: MessageSquare });

  const TabButton = ({ id, label, icon: Icon }: { id: "tasks" | "personality" | "diary"; label: string; icon: LucideIcon }) => {
    const on = activeTab === id;
    return (
      <button
        onClick={() => setActiveTab(id)}
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
    <div className="px-5 sm:px-8 lg:px-10 pb-24 max-w-[1400px] mx-auto">
      {isFreshInstall && (
        <div className="pt-8">
          <EmptyStateGuide
            section="DA Identity"
            description="Your DA's name, voice, personality, and the diary they keep about your work together."
            userDir="DA"
            daPromptExample="set up my DA's identity and personality"
          />
        </div>
      )}

      {/* ---------- hero ---------- */}
      <section className="pt-8 sm:pt-10">
        <div className="flex items-center gap-2.5 mb-4 text-[11px] font-mono uppercase tracking-[0.28em] text-muted-foreground">
          <span
            className="w-1.5 h-1.5 rounded-full anim-breathe"
            style={{ background: "var(--positive)", boxShadow: "0 0 8px var(--positive)" }}
          />
          LifeOS · Assistant
        </div>

        {identity && (
          <div className="flex items-start gap-5 flex-wrap">
            {identity.has_avatar ? (
              <img
                src="/assistant/avatar"
                alt={identity.display_name}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover shrink-0"
                style={{ border: "1px solid var(--hairline-strong)", boxShadow: "0 0 24px var(--glow)" }}
              />
            ) : (
              <div
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full grid place-items-center text-3xl font-bold shrink-0"
                style={{ background: "color-mix(in oklab, var(--neon) 14%, transparent)", color: "var(--neon)" }}
              >
                {identity.display_name.charAt(0)}
              </div>
            )}
            <div className="min-w-0 flex-1" data-sensitive>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-bold leading-tight text-foreground">{identity.full_name}</h1>
                <TokenPill text={identity.display_name} color="var(--neon)" />
                {health && (
                  <TokenPill
                    text={health.status === "ok" ? "online" : health.status}
                    color={health.status === "ok" ? "var(--positive)" : "var(--danger)"}
                    title="DA daemon health"
                  />
                )}
              </div>
              <p className="text-[14px] text-muted-foreground mt-1">{identity.role}</p>
              {identity.origin_story && (
                <p className="text-[13px] leading-relaxed text-muted-foreground mt-1.5 max-w-[70ch]">{identity.origin_story}</p>
              )}
              <p className="text-[12px] font-mono text-muted-foreground mt-2">
                <span className="uppercase tracking-[0.16em] text-[10px] mr-2" style={{ color: "var(--neon)" }}>principal</span>
                {identity.principal}
              </p>
            </div>
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
                <div className="text-2xl font-bold font-mono text-foreground tabular-nums">{s.value}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ---------- tab bar ---------- */}
      <div className="mt-10 flex items-center gap-5 flex-wrap pb-1.5" style={{ borderBottom: "1px solid var(--hairline)" }}>
        <TabButton id="tasks" label="Tasks" icon={ListChecks} />
        <TabButton id="personality" label="Personality" icon={Brain} />
        <TabButton id="diary" label="Diary" icon={BookOpen} />
      </div>

      {/* ---------- TASKS TAB ---------- */}
      {activeTab === "tasks" && (
        <>
          <Section
            icon={Terminal}
            kicker="Harness triggers + loops"
            title="Claude Code"
            count={tasksData ? tasksData.tasks.filter((t) => t.source === "claude-code").length : undefined}
          >
            <Reveal>
              <p className="text-[11px] font-mono text-muted-foreground mb-3">
                claude triggers list · managed by the harness, not Pulse · polled every 60s
              </p>
              {(() => {
                const ccTasks = tasksData?.tasks.filter((t) => t.source === "claude-code") ?? [];
                if (ccTasks.length === 0) {
                  return (
                    <div className="glass rounded-xl text-center px-4 py-8">
                      <Terminal className="w-6 h-6 mx-auto text-muted-foreground" style={{ opacity: 0.4 }} />
                      <p className="text-[13px] text-muted-foreground mt-3">No Claude Code triggers or loops detected.</p>
                    </div>
                  );
                }
                return (
                  <div className="glass rounded-xl overflow-hidden" data-sensitive>
                    {ccTasks.map((task, i) => {
                      const isLoop = detectLoop(task);
                      return (
                        <div
                          key={i}
                          className="flex items-center gap-4 px-4 sm:px-5 py-3.5"
                          style={{ borderTop: i === 0 ? "none" : "1px solid var(--hairline)" }}
                        >
                          {isLoop ? (
                            <Repeat className="w-4 h-4 shrink-0" style={{ color: "var(--neon-2)" }} />
                          ) : (
                            <Terminal className="w-4 h-4 shrink-0" style={{ color: "var(--neon-2)" }} />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[13px] text-foreground truncate">{task.name}</span>
                              <TokenPill text="claude code" color="var(--neon-3)" title="Source: Claude Code harness" />
                              {isLoop && <TokenPill text="loop" color="var(--warn)" title="Active /loop session" />}
                            </div>
                            <div className="text-[11px] font-mono mt-0.5 truncate text-muted-foreground tabular-nums">{task.schedule}</div>
                          </div>
                          <span
                            className="text-[10px] font-mono uppercase tracking-[0.12em] font-semibold shrink-0"
                            style={{ color: STATUS_COLOR[task.status] ?? MUTED }}
                          >
                            {task.status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </Reveal>
          </Section>

          <Section icon={Zap} kicker="LifeOS scheduler" title="Pulse Cron Jobs" count={cronData?.counts.total}>
            <Reveal>
              <div className="flex items-center gap-3 flex-wrap mb-3">
                {cronData && (
                  <span className="text-[11px] font-mono text-muted-foreground tabular-nums">
                    {cronData.counts.enabled}/{cronData.counts.total} enabled
                    {" · "}
                    {cronData.counts.system} sys / {cronData.counts.user} user
                  </span>
                )}
                <span className="flex-1" />
                <button
                  onClick={() => setShowAddCron(!showAddCron)}
                  className="inline-flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-full cursor-pointer transition-colors"
                  style={{ color: "var(--neon)", background: "var(--surface-1)", border: "1px solid var(--hairline)" }}
                  aria-label={showAddCron ? "Close add cron job form" : "Add cron job"}
                >
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>

              <div className="text-[11px] font-mono text-muted-foreground space-y-0.5 mb-3" data-sensitive>
                <div>
                  ~/.claude/LIFEOS/PULSE/PULSE.toml <span style={{ opacity: 0.7 }}>· system — ships with LifeOS, never written by this UI</span>
                </div>
                {cronData?.user_file_path && (
                  <div>
                    {cronData.user_file_path} <span style={{ color: "var(--warn)" }}>· user — all edits/deletes from this UI write here</span>
                  </div>
                )}
              </div>
              <p className="text-[12px] text-muted-foreground mb-4">
                Runs inside Pulse on this machine. Click any row to see full detail and edit interval / command / output.
              </p>

              {showAddCron && (
                <div className="glass-2 rounded-xl p-4 mb-4 space-y-3">
                  <input
                    placeholder='name (e.g. "my-monitor")'
                    value={newCronName}
                    onChange={(e) => setNewCronName(e.target.value)}
                    className="w-full text-[13px] font-mono rounded-lg px-3.5 py-2"
                    style={inputStyle}
                    aria-label="New cron job name"
                  />
                  <input
                    placeholder="cron schedule (5 fields, e.g. */5 * * * *)"
                    value={newCronSchedule}
                    onChange={(e) => setNewCronSchedule(e.target.value)}
                    className="w-full text-[13px] font-mono rounded-lg px-3.5 py-2"
                    style={inputStyle}
                    aria-label="New cron job schedule"
                  />
                  <input
                    placeholder='shell command (e.g. "bun run checks/foo.ts")'
                    value={newCronCommand}
                    onChange={(e) => setNewCronCommand(e.target.value)}
                    className="w-full text-[13px] font-mono rounded-lg px-3.5 py-2"
                    style={inputStyle}
                    aria-label="New cron job command"
                  />
                  <div className="flex justify-end gap-2.5">
                    <button
                      onClick={() => setShowAddCron(false)}
                      className="text-[12px] font-mono px-3.5 py-1.5 rounded-full text-muted-foreground hover:text-foreground transition-colors"
                      style={{ background: "transparent", border: "1px solid var(--hairline)" }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        if (!newCronName.trim() || !newCronSchedule.trim() || !newCronCommand.trim()) return;
                        createCron.mutate({
                          name: newCronName.trim(),
                          schedule: newCronSchedule.trim(),
                          type: "script",
                          command: newCronCommand.trim(),
                          output: "log",
                          enabled: true,
                        });
                      }}
                      className="text-[12px] font-mono px-3.5 py-1.5 rounded-full cursor-pointer"
                      style={{
                        color: "var(--neon)",
                        background: "color-mix(in oklab, var(--neon) 12%, transparent)",
                        border: "1px solid color-mix(in oklab, var(--neon) 40%, transparent)",
                      }}
                    >
                      Create
                    </button>
                  </div>
                  {createCron.isError && (
                    <div className="text-[11px] font-mono" style={{ color: "var(--danger)" }}>
                      {(createCron.error as Error)?.message ?? "Create failed"}
                    </div>
                  )}
                </div>
              )}

              {(() => {
                const jobs = cronData?.jobs ?? [];
                if (jobs.length === 0) {
                  return (
                    <div className="glass rounded-xl text-center px-4 py-8">
                      <Zap className="w-6 h-6 mx-auto text-muted-foreground" style={{ opacity: 0.4 }} />
                      <p className="text-[13px] text-muted-foreground mt-3">No cron jobs defined.</p>
                    </div>
                  );
                }
                const pageCount = Math.max(1, Math.ceil(jobs.length / CRON_PAGE_SIZE));
                const safePage = Math.min(cronPage, pageCount - 1);
                const start = safePage * CRON_PAGE_SIZE;
                const pageJobs = jobs.slice(start, start + CRON_PAGE_SIZE);
                return (
                  <div className="glass rounded-xl overflow-hidden" data-sensitive>
                    {pageJobs.map((job, rowIdx) => {
                      const isOpen = expandedCron === job.name;
                      const buf = isOpen ? editBuffer : {};
                      const bufType = (buf.type ?? job.type) as "script" | "claude";
                      const bufOutputs: string[] = Array.isArray(buf.output ?? job.output)
                        ? (buf.output ?? job.output) as string[]
                        : [(buf.output ?? job.output) as string];
                      return (
                        <div
                          key={job.name}
                          className="group"
                          style={{
                            background: isOpen ? "var(--surface-1)" : "transparent",
                            transition: "background 180ms",
                            borderTop: rowIdx === 0 ? "none" : "1px solid var(--hairline)",
                          }}
                        >
                          <div
                            className="flex items-center gap-4 px-4 py-3 cursor-pointer"
                            onMouseEnter={(e) => { if (!isOpen) e.currentTarget.parentElement!.style.background = "var(--surface-1)"; }}
                            onMouseLeave={(e) => { if (!isOpen) e.currentTarget.parentElement!.style.background = "transparent"; }}
                            onClick={() => (isOpen ? closeExpand() : openExpand(job))}
                          >
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleCron.mutate({ name: job.name, enabled: !job.enabled }); }}
                              title={job.enabled ? "Click to disable" : "Click to enable"}
                              aria-label={`${job.enabled ? "Disable" : "Enable"} ${job.name}`}
                              className="shrink-0"
                              style={{
                                width: 36, height: 18, borderRadius: 9,
                                background: job.enabled ? "var(--positive)" : "var(--surface-2)",
                                border: "1px solid",
                                borderColor: job.enabled ? "var(--positive)" : "var(--hairline-strong)",
                                position: "relative", cursor: "pointer", transition: "background 180ms",
                              }}
                            >
                              <span
                                style={{
                                  position: "absolute", top: 1, left: job.enabled ? 19 : 1,
                                  width: 14, height: 14, borderRadius: "50%",
                                  background: "hsl(var(--foreground))", transition: "left 180ms",
                                }}
                              />
                            </button>
                            <Zap
                              className="w-4 h-4 shrink-0"
                              style={{ color: job.enabled ? "var(--positive)" : MUTED, opacity: job.enabled ? 1 : 0.5 }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-[13px] truncate ${job.enabled ? "text-foreground" : "text-muted-foreground"}`}>{job.name}</span>
                                <TokenPill
                                  text={job.source}
                                  color={job.source === "user" ? "var(--warn)" : MUTED}
                                  title={job.source === "user" ? "Defined in your user file" : "Ships with LifeOS"}
                                />
                                <TokenPill
                                  text={job.type}
                                  color="var(--neon-3)"
                                  title={job.type === "claude" ? "Runs as claude subprocess" : "Shell command"}
                                />
                              </div>
                              <div className="text-[11px] font-mono text-muted-foreground truncate tabular-nums mt-0.5">
                                {job.schedule}
                                {job.command && <span className="ml-2" style={{ opacity: 0.7 }}>· {job.command}</span>}
                                {!job.command && job.prompt && <span className="ml-2" style={{ opacity: 0.7 }}>· {job.prompt.slice(0, 80)}{job.prompt.length > 80 ? "…" : ""}</span>}
                              </div>
                            </div>
                            <span className="text-[11px] font-mono text-muted-foreground shrink-0" title="output target">
                              {Array.isArray(job.output) ? job.output.join(",") : job.output}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const msg = job.source === "system"
                                  ? `Disable system job "${job.name}"? (writes user-file override; system file untouched)`
                                  : `Delete user job "${job.name}"?`;
                                if (confirm(msg)) deleteCron.mutate(job.name);
                              }}
                              className="opacity-0 group-hover:opacity-100 transition-all shrink-0"
                              style={{ color: MUTED }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--danger)")}
                              onMouseLeave={(e) => (e.currentTarget.style.color = MUTED)}
                              title={job.source === "system" ? "Disable via override" : "Delete from user file"}
                              aria-label={job.source === "system" ? `Disable ${job.name} via override` : `Delete ${job.name}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <span className="shrink-0 text-muted-foreground">
                              {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </span>
                          </div>

                          {isOpen && (
                            <div className="px-12 pb-4 pt-1 space-y-3" style={{ borderTop: "1px solid var(--hairline)" }}>
                              <div className="grid grid-cols-[120px_1fr] gap-3 items-center pt-3">
                                <label className="text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground">Schedule</label>
                                <input
                                  value={(buf.schedule as string) ?? job.schedule}
                                  onChange={(e) => setEditBuffer((b) => ({ ...b, schedule: e.target.value }))}
                                  placeholder="* * * * *"
                                  className="text-[13px] font-mono rounded-lg px-3 py-1.5 w-full tabular-nums"
                                  style={inputStyle}
                                  aria-label={`Schedule for ${job.name}`}
                                />

                                {bufType === "script" ? (
                                  <>
                                    <label className="text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground">Command</label>
                                    <input
                                      value={(buf.command as string) ?? job.command ?? ""}
                                      onChange={(e) => setEditBuffer((b) => ({ ...b, command: e.target.value }))}
                                      className="text-[13px] font-mono rounded-lg px-3 py-1.5 w-full"
                                      style={inputStyle}
                                      aria-label={`Command for ${job.name}`}
                                    />
                                  </>
                                ) : (
                                  <>
                                    <label className="text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground self-start pt-1">Prompt</label>
                                    <textarea
                                      value={(buf.prompt as string) ?? job.prompt ?? ""}
                                      onChange={(e) => setEditBuffer((b) => ({ ...b, prompt: e.target.value }))}
                                      rows={4}
                                      className="text-[13px] font-mono rounded-lg px-3 py-1.5 w-full"
                                      style={{ ...inputStyle, resize: "vertical" }}
                                      aria-label={`Prompt for ${job.name}`}
                                    />
                                    <label className="text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground">Model</label>
                                    <select
                                      value={(buf.model as string) ?? job.model ?? ""}
                                      onChange={(e) => setEditBuffer((b) => ({ ...b, model: e.target.value || null }))}
                                      className="text-[13px] font-mono rounded-lg px-3 py-1.5 w-full"
                                      style={inputStyle}
                                      aria-label={`Model for ${job.name}`}
                                    >
                                      <option value="">(default)</option>
                                      <option value="haiku">haiku</option>
                                      <option value="sonnet">sonnet</option>
                                      <option value="opus">opus</option>
                                    </select>
                                  </>
                                )}

                                <label className="text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground self-start pt-1">Output</label>
                                <div className="flex flex-wrap gap-2">
                                  {(["log", "voice", "telegram", "ntfy", "email"] as const).map((opt) => {
                                    const active = bufOutputs.includes(opt);
                                    return (
                                      <button
                                        key={opt}
                                        type="button"
                                        onClick={() => {
                                          setEditBuffer((b) => {
                                            const cur = Array.isArray(b.output ?? job.output)
                                              ? ((b.output ?? job.output) as string[]).slice()
                                              : [(b.output ?? job.output) as string];
                                            const i = cur.indexOf(opt);
                                            if (i >= 0) cur.splice(i, 1); else cur.push(opt);
                                            const next = cur.length === 1 ? cur[0] : cur;
                                            return { ...b, output: next as string | string[] };
                                          });
                                        }}
                                        className="text-[10px] font-mono uppercase tracking-[0.08em] px-2.5 py-1 rounded-full transition-colors"
                                        style={{
                                          color: active ? "var(--positive)" : MUTED,
                                          background: active ? "color-mix(in oklab, var(--positive) 12%, transparent)" : "var(--surface-1)",
                                          border: active
                                            ? "1px solid color-mix(in oklab, var(--positive) 40%, transparent)"
                                            : "1px solid var(--hairline)",
                                        }}
                                        aria-label={`${active ? "Remove" : "Add"} ${opt} output`}
                                      >
                                        {opt}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              {editError && <div className="text-[11px] font-mono" style={{ color: "var(--danger)" }}>{editError}</div>}

                              <div className="flex items-center justify-between pt-2" style={{ borderTop: "1px solid var(--hairline)" }}>
                                <div className="text-[11px] font-mono text-muted-foreground">
                                  source: <span style={{ color: job.source === "user" ? "var(--warn)" : "hsl(var(--foreground))" }}>{job.source}</span>
                                  {" · "}type: <span className="text-foreground">{job.type}</span>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={closeExpand}
                                    className="text-[12px] font-mono px-3 py-1 rounded-full text-muted-foreground hover:text-foreground transition-colors"
                                    style={{ background: "transparent", border: "1px solid var(--hairline)" }}
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => {
                                      const patch: Partial<CronJob> = {};
                                      if (buf.schedule !== undefined && buf.schedule !== job.schedule) patch.schedule = buf.schedule;
                                      if (bufType === "script") {
                                        if (buf.command !== undefined && buf.command !== job.command) patch.command = buf.command;
                                      } else {
                                        if (buf.prompt !== undefined && buf.prompt !== job.prompt) patch.prompt = buf.prompt;
                                        if (buf.model !== undefined && buf.model !== job.model) patch.model = buf.model;
                                      }
                                      if (buf.output !== undefined && JSON.stringify(buf.output) !== JSON.stringify(job.output)) patch.output = buf.output;
                                      if (Object.keys(patch).length === 0) { closeExpand(); return; }
                                      patchCron.mutate({ name: job.name, patch }, { onSuccess: () => closeExpand() });
                                    }}
                                    className="text-[12px] font-mono px-3.5 py-1 rounded-full cursor-pointer disabled:opacity-60"
                                    style={{
                                      color: "var(--neon)",
                                      background: "color-mix(in oklab, var(--neon) 12%, transparent)",
                                      border: "1px solid color-mix(in oklab, var(--neon) 40%, transparent)",
                                    }}
                                    disabled={patchCron.isPending}
                                  >
                                    {patchCron.isPending ? "Saving…" : "Save"}
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {cronData && cronData.jobs.length > CRON_PAGE_SIZE && (() => {
                const pageCount = Math.max(1, Math.ceil(cronData.jobs.length / CRON_PAGE_SIZE));
                const safePage = Math.min(cronPage, pageCount - 1);
                const start = safePage * CRON_PAGE_SIZE;
                const end = Math.min(start + CRON_PAGE_SIZE, cronData.jobs.length);
                return (
                  <div className="mt-3 flex items-center justify-between flex-wrap gap-2 text-[11px] font-mono text-muted-foreground">
                    <span className="tabular-nums">
                      Showing <span className="text-foreground">{start + 1}–{end}</span> of{" "}
                      <span className="text-foreground">{cronData.jobs.length}</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => { closeExpand(); setCronPage((p) => Math.max(0, p - 1)); }}
                        disabled={safePage === 0}
                        className="text-[11px] font-mono px-3 py-1 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                        style={{
                          background: "var(--surface-1)",
                          border: "1px solid var(--hairline)",
                          color: safePage === 0 ? MUTED : "var(--neon)",
                        }}
                        aria-label="Previous page of cron jobs"
                      >
                        ← Prev
                      </button>
                      <span className="tabular-nums">
                        Page <span className="text-foreground">{safePage + 1}</span> / {pageCount}
                      </span>
                      <button
                        type="button"
                        onClick={() => { closeExpand(); setCronPage((p) => Math.min(pageCount - 1, p + 1)); }}
                        disabled={safePage >= pageCount - 1}
                        className="text-[11px] font-mono px-3 py-1 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                        style={{
                          background: "var(--surface-1)",
                          border: "1px solid var(--hairline)",
                          color: safePage >= pageCount - 1 ? MUTED : "var(--neon)",
                        }}
                        aria-label="Next page of cron jobs"
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                );
              })()}
            </Reveal>
          </Section>
        </>
      )}

      {/* ---------- PERSONALITY TAB ---------- */}
      {activeTab === "personality" && personality && (() => {
        const traitEntries = Object.entries(personality.traits);
        const opinionBlocks = (opinionsData?.raw ?? "").split(/^\s*- topic:/m).slice(1).slice(0, 10);

        const cards: Array<{ key: string; node: React.ReactNode }> = [];

        if (traitEntries.length > 0) {
          cards.push({
            key: "traits",
            node: (
              <>
                <CardHead icon={Brain} label="Traits" />
                <div className="space-y-3">
                  {traitEntries.map(([name, value], index) => (
                    <TraitBar
                      key={name}
                      name={name}
                      value={value as number}
                      color={TRAIT_ACCENTS[index % TRAIT_ACCENTS.length]}
                      onEdit={(v) => updateTrait.mutate({ [name]: v })}
                    />
                  ))}
                </div>
              </>
            ),
          });
        }

        if (personality.preferences.what_i_love.length > 0) {
          cards.push({
            key: "love",
            node: (
              <>
                <CardHead icon={Heart} label="What I love" />
                <ul className="space-y-2">
                  {personality.preferences.what_i_love.map((item, i) => (
                    <li key={i} className="flex gap-2 text-[13px] leading-relaxed text-foreground">
                      <span className="shrink-0 font-mono" style={{ color: "var(--positive)" }}>+</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </>
            ),
          });
        }

        if (personality.preferences.what_i_dislike.length > 0) {
          cards.push({
            key: "dislike",
            node: (
              <>
                <CardHead icon={ThumbsDown} label="What I dislike" />
                <ul className="space-y-2">
                  {personality.preferences.what_i_dislike.map((item, i) => (
                    <li key={i} className="flex gap-2 text-[13px] leading-relaxed text-foreground">
                      <span className="shrink-0 font-mono" style={{ color: "var(--danger)" }}>−</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </>
            ),
          });
        }

        if (personality.anchors.length > 0) {
          cards.push({
            key: "anchors",
            node: (
              <>
                <CardHead icon={Sparkles} label="Key moments" />
                <div className="space-y-3.5">
                  {personality.anchors.map((anchor, i) => (
                    <div key={i}>
                      <div className="text-[13px] font-semibold" style={{ color: "var(--neon-2)" }}>{anchor.name}</div>
                      <div className="text-[13px] leading-relaxed text-muted-foreground mt-0.5">{anchor.description}</div>
                    </div>
                  ))}
                </div>
              </>
            ),
          });
        }

        if (personality.companion) {
          cards.push({
            key: "companion",
            node: (
              <>
                <CardHead icon={PawPrint} label="Companion" />
                <div className="text-[14px] font-semibold text-foreground">{personality.companion.name}</div>
                <div className="text-[13px] text-muted-foreground mt-0.5">
                  {personality.companion.species} — {personality.companion.personality}
                </div>
              </>
            ),
          });
        }

        if (personality.autonomy.can_initiate.length > 0 || personality.autonomy.must_ask.length > 0) {
          cards.push({
            key: "autonomy",
            node: (
              <>
                <CardHead icon={Shield} label="Autonomy" />
                <div className="grid grid-cols-2 gap-5">
                  {personality.autonomy.can_initiate.length > 0 && (
                    <div>
                      <div className="text-[10px] font-mono uppercase tracking-[0.16em] mb-2" style={{ color: "var(--positive)" }}>
                        Can initiate
                      </div>
                      {personality.autonomy.can_initiate.map((item, i) => (
                        <div key={i} className="py-0.5 text-[13px] text-foreground capitalize">{item.replace(/_/g, " ")}</div>
                      ))}
                    </div>
                  )}
                  {personality.autonomy.must_ask.length > 0 && (
                    <div>
                      <div className="text-[10px] font-mono uppercase tracking-[0.16em] mb-2" style={{ color: "var(--warn)" }}>
                        Must ask
                      </div>
                      {personality.autonomy.must_ask.map((item, i) => (
                        <div key={i} className="py-0.5 text-[13px] text-foreground capitalize">{item.replace(/_/g, " ")}</div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ),
          });
        }

        cards.push({
          key: "opinions",
          node: (
            <>
              <CardHead icon={MessageSquare} label="Formed opinions" />
              {opinionBlocks.length === 0 ? (
                <p className="text-[13px] text-muted-foreground">No opinions formed yet.</p>
              ) : (
                <div className="space-y-3">
                  {opinionBlocks.map((block, i) => {
                    const topic = block.match(/^\s*"?([^"\n]+)"?\s*$/m)?.[1]?.trim() ?? "";
                    const position = block.match(/position:\s*"?([^"\n]+)"?/)?.[1]?.trim() ?? "";
                    const confidence = parseFloat(block.match(/confidence:\s*([\d.]+)/)?.[1] ?? "0");
                    return (
                      <div key={i} className="flex items-start gap-3">
                        <span
                          className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                          style={{
                            background: `color-mix(in oklab, var(--neon) ${Math.round(Math.max(0.2, confidence) * 100)}%, transparent)`,
                          }}
                          title={`Confidence ${(confidence * 100).toFixed(0)}%`}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] text-foreground">{topic}</div>
                          <div className="text-[13px] text-muted-foreground">{position}</div>
                        </div>
                        <span className="text-[11px] font-mono tabular-nums shrink-0 text-muted-foreground">
                          {(confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ),
        });

        return (
          <Section
            icon={Brain}
            kicker="Disposition + boundaries"
            title="Personality"
            count={traitEntries.length > 0 ? traitEntries.length : undefined}
            countLabel="traits"
          >
            <div data-sensitive>
              {personality.base_description && (
                <Reveal>
                  <p className="text-[14px] leading-relaxed text-foreground max-w-[70ch] mb-6">{personality.base_description}</p>
                </Reveal>
              )}
              <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
                {cards.map((c, i) => (
                  <Reveal key={c.key} delay={i * 40}>
                    <div className="glass rounded-xl p-5 h-full">{c.node}</div>
                  </Reveal>
                ))}
              </div>
            </div>
          </Section>
        );
      })()}

      {/* ---------- DIARY TAB ---------- */}
      {activeTab === "diary" && (
        <Section
          icon={BookOpen}
          kicker="Day-by-day working log"
          title="Diary"
          count={diaryData?.entries.length}
          countLabel="days"
        >
          {!diaryData || diaryData.entries.length === 0 ? (
            <div className="glass rounded-xl text-center px-4 py-10">
              <BookOpen className="w-6 h-6 mx-auto text-muted-foreground" style={{ opacity: 0.4 }} />
              <p className="text-[13px] text-muted-foreground mt-3">No diary entries yet.</p>
            </div>
          ) : (
            <div className="grid gap-3" data-sensitive>
              {diaryData.entries.slice().reverse().map((entry, i) => (
                <Reveal key={entry.date} delay={i * 40}>
                  <div className="glass rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <span className="text-[14px] font-mono text-foreground tabular-nums">{entry.date}</span>
                      <div className="flex items-center gap-3 flex-wrap">
                        {entry.interaction_count > 0 && (
                          <span className="text-[11px] font-mono text-muted-foreground tabular-nums">
                            {entry.interaction_count} sessions
                          </span>
                        )}
                        <TokenPill text={entry.mood} color={MOOD_COLOR[entry.mood] ?? MUTED} />
                        {entry.avg_rating > 0 && (
                          <span className="text-[11px] font-mono text-muted-foreground tabular-nums">{entry.avg_rating}/10</span>
                        )}
                      </div>
                    </div>
                    {entry.topics.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {entry.topics.map((topic, ti) => <LabelPill key={ti} text={topic} />)}
                      </div>
                    )}
                    {entry.notable_moments.map((moment, mi) => (
                      <p key={mi} className="text-[13px] leading-relaxed text-foreground">{moment}</p>
                    ))}
                    {entry.learning && (
                      <p
                        className="text-[13px] italic leading-relaxed text-muted-foreground pl-3"
                        style={{ borderLeft: "1px solid var(--hairline-strong)" }}
                      >
                        {entry.learning}
                      </p>
                    )}
                  </div>
                </Reveal>
              ))}
            </div>
          )}
        </Section>
      )}
    </div>
  );
}
