"use client";

import { useState, useEffect } from "react";
import {
  BookOpen,
  Lightbulb,
  FlaskConical,
  Beaker,
  Trophy,
  Cpu,
  ArrowRight,
  RefreshCw,
  Repeat,
  Layers,
  Activity,
  Workflow,
} from "lucide-react";
import EmptyStateGuide from "@/components/EmptyStateGuide";
import { Reveal } from "@/components/kit/Reveal";
import { Section } from "@/components/kit/Section";

// ─── Types ───

interface LadderEntry {
  id: string;
  title: string;
  status: string;
  created: string;
}

interface PipelineData {
  sources: LadderEntry[];
  ideas: LadderEntry[];
  hypotheses: LadderEntry[];
  experiments: LadderEntry[];
  algorithms: LadderEntry[];
  results: LadderEntry[];
}

/* ---------- theme-token color maps (re-theme with [data-theme]) ---------- */

const MUTED = "hsl(var(--muted-foreground))";

const STATUS_COLOR: Record<string, string> = {
  draft: MUTED,
  active: "var(--positive)",
  testing: "var(--warn)",
  complete: "var(--neon-3)",
  archived: "var(--text-dim)",
};

// Unknown statuses surface loudly — a mistyped frontmatter status is a data-quality signal.
function statusColor(status: string): string {
  return STATUS_COLOR[status] ?? "var(--danger)";
}

interface StageDef {
  key: keyof PipelineData;
  label: string;
  prefix: string;
  icon: typeof BookOpen;
  color: string;
}

const STAGES: StageDef[] = [
  { key: "sources", label: "Sources", prefix: "SR", icon: BookOpen, color: "var(--neon-2)" },
  { key: "ideas", label: "Ideas", prefix: "ID", icon: Lightbulb, color: "var(--warn)" },
  { key: "hypotheses", label: "Hypotheses", prefix: "HY", icon: Beaker, color: "var(--dim-creative)" },
  { key: "experiments", label: "Experiments", prefix: "EX", icon: FlaskConical, color: "var(--positive)" },
  { key: "algorithms", label: "Algorithms", prefix: "AL", icon: Cpu, color: "var(--dim-money)" },
  { key: "results", label: "Results", prefix: "RE", icon: Trophy, color: "var(--neon-3)" },
];

// The canonical loop: Sources → Ideas → Hypotheses → Experiments → Results.
// Algorithms are a shipped artifact alongside, not a flow stage.
const FLOW_KEYS: Array<keyof PipelineData> = ["sources", "ideas", "hypotheses", "experiments", "results"];

// ─── Data Loading ───

async function loadLadderData(): Promise<PipelineData | null> {
  try {
    const resp = await fetch("/api/ladder");
    if (resp.ok) return resp.json();
  } catch {
    // API not available, return null
  }
  return null;
}

/* ---------- hero ---------- */

function Hero({ data }: { data: PipelineData | null }) {
  const total = data ? STAGES.reduce((n, s) => n + data[s.key].length, 0) : 0;
  const statusCount = (status: string) =>
    data ? STAGES.reduce((n, s) => n + data[s.key].filter((e) => e.status === status).length, 0) : 0;

  const stats = [
    { label: "Entries", value: total, icon: Layers },
    { label: "Active", value: statusCount("active"), icon: Activity },
    { label: "Testing", value: statusCount("testing"), icon: FlaskConical },
    { label: "Results", value: data?.results.length ?? 0, icon: Trophy },
  ].filter((s) => s.value > 0);

  return (
    <section className="pt-8 sm:pt-10">
      <div className="flex items-center gap-2.5 mb-4 text-[11px] font-mono uppercase tracking-[0.28em] text-muted-foreground">
        <span
          className="w-1.5 h-1.5 rounded-full anim-breathe"
          style={{ background: "var(--positive)", boxShadow: "0 0 8px var(--positive)" }}
        />
        LifeOS · Ladder
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold leading-tight text-foreground">Ladder</h1>
      <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground max-w-[60ch]">
        The improvement pipeline — sources distilled into ideas, tested as experiments, shipped as results.
      </p>

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

/* ---------- pipeline flow strip ---------- */

function FlowStrip({ data }: { data: PipelineData }) {
  return (
    <div className="glass rounded-xl p-4 sm:p-5 edge-top">
      <div className="flex items-center justify-between gap-3 mb-4">
        <span className="text-[10px] font-mono uppercase tracking-[0.24em] text-muted-foreground">Pipeline Flow</span>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground">
          <RefreshCw className="w-3 h-3" /> poll 5s
        </span>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
        {FLOW_KEYS.map((key, i) => {
          const stage = STAGES.find((s) => s.key === key)!;
          return (
            <div key={stage.key} className="flex items-center gap-2 sm:gap-3">
              {i > 0 && <ArrowRight className="w-3.5 h-3.5 shrink-0 text-muted-foreground" style={{ opacity: 0.5 }} />}
              <div
                className="rounded-lg px-3 py-2"
                style={{
                  background: "var(--surface-1)",
                  border: `1px solid color-mix(in oklab, ${stage.color} 30%, transparent)`,
                }}
              >
                <div className="text-[10px] font-mono uppercase tracking-[0.12em]" style={{ color: stage.color }}>
                  {stage.label}
                </div>
                <div className="text-lg font-bold font-mono tabular-nums text-foreground leading-tight">
                  {String(data[stage.key].length).padStart(2, "0")}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3.5 flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground">
        <Repeat className="w-3 h-3" /> Results feed back as Sources
      </div>
    </div>
  );
}

/* ---------- pipeline stage card ---------- */

function StageCard({ stage, entries }: { stage: StageDef; entries: LadderEntry[] }) {
  const byStatus = entries.reduce(
    (acc, e) => {
      acc[e.status] = (acc[e.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="glass rounded-xl p-4 h-full">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <span
          className="grid place-items-center w-8 h-8 rounded-lg shrink-0"
          style={{
            color: stage.color,
            background: "var(--surface-1)",
            border: `1px solid color-mix(in oklab, ${stage.color} 30%, transparent)`,
          }}
        >
          <stage.icon className="w-4 h-4" />
        </span>
        <div className="min-w-0">
          <div className="text-[14px] font-semibold text-foreground leading-tight">{stage.label}</div>
          <div className="text-[10px] font-mono uppercase tracking-[0.12em] text-muted-foreground">{stage.prefix}-</div>
        </div>
        <div className="ml-auto text-2xl font-bold font-mono tabular-nums text-foreground">
          {String(entries.length).padStart(2, "0")}
        </div>
      </div>

      {/* Status breakdown */}
      {Object.keys(byStatus).length > 0 && (
        <div className="flex gap-x-3 gap-y-1.5 flex-wrap mt-3">
          {Object.entries(byStatus).map(([status, count]) => (
            <span key={status} className="inline-flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground">
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: statusColor(status), boxShadow: `0 0 6px ${statusColor(status)}` }}
              />
              <span className="tabular-nums">{count}</span> {status}
            </span>
          ))}
        </div>
      )}

      {/* Recent entries — or an honest quiet marker when the stage is empty */}
      {entries.length > 0 ? (
        <div className="mt-3 pt-3 space-y-1.5" style={{ borderTop: "1px solid var(--hairline)" }}>
          {entries.slice(0, 3).map((e) => (
            <div key={e.id} className="flex items-center gap-2 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: statusColor(e.status) }} />
              <span className="text-[11px] font-mono text-muted-foreground shrink-0">{e.id}</span>
              <span className="text-[13px] text-foreground truncate" title={e.title}>{e.title}</span>
              {e.created && (
                <span className="ml-auto text-[10px] font-mono tabular-nums text-muted-foreground shrink-0">{e.created}</span>
              )}
            </div>
          ))}
          {entries.length > 3 && (
            <div className="text-[11px] font-mono text-muted-foreground pl-3.5">+{entries.length - 3} more</div>
          )}
        </div>
      ) : (
        <div
          className="mt-3 grid place-items-center rounded-lg py-4 text-[11px] font-mono text-muted-foreground"
          style={{ border: "1px dashed var(--hairline)" }}
        >
          empty
        </div>
      )}
    </div>
  );
}

/* ---------- main page ---------- */

export default function LadderPage() {
  const [data, setData] = useState<PipelineData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;

    async function poll() {
      const result = await loadLadderData();
      if (result) {
        setData(result);
        setError(null);
      } else {
        setError("Ladder API not available");
      }
      setIsLoading(false);
    }

    poll();
    timer = setInterval(poll, 5000);
    return () => clearInterval(timer);
  }, []);

  if (isLoading) {
    return <div className="px-5 sm:px-8 pt-10 text-[13px] font-mono text-muted-foreground">Loading Ladder pipeline…</div>;
  }

  if (!data || error) {
    return (
      <div className="px-5 sm:px-8 lg:px-10 pb-24 max-w-[1400px] mx-auto">
        <Hero data={null} />
        <div className="mt-10 space-y-6">
          <EmptyStateGuide
            section="Ladder"
            description="The improvement pipeline — code suggestions evaluated, ranked, and shipped. Populates as Ladder runs against your repos."
            hideInterview
            daPromptExample="help me run Ladder on a repo"
          />
          <div className="glass rounded-xl px-5 py-10 text-center">
            <RefreshCw className="w-8 h-8 mx-auto text-muted-foreground" style={{ opacity: 0.4 }} />
            <p className="text-[14px] font-medium text-foreground mt-3">Ladder pipeline not connected</p>
            <p className="text-[12px] font-mono text-muted-foreground mt-1">
              Start the Ladder API or add entries to your Ladder repo
            </p>
          </div>
        </div>
      </div>
    );
  }

  const totalEntries = STAGES.reduce((n, s) => n + data[s.key].length, 0);

  return (
    <div className="px-5 sm:px-8 lg:px-10 pb-24 max-w-[1400px] mx-auto">
      <Hero data={data} />

      <Section icon={Workflow} kicker="Sources to shipped results" title="Pipeline" count={totalEntries} countLabel="entries">
        {totalEntries === 0 ? (
          <Reveal>
            <div className="glass rounded-xl px-5 py-10 text-center">
              <Workflow className="w-8 h-8 mx-auto text-muted-foreground" style={{ opacity: 0.4 }} />
              <p className="text-[14px] font-medium text-foreground mt-3">Pipeline connected — no entries yet</p>
              <p className="text-[12px] font-mono text-muted-foreground mt-1">
                Add entries to your Ladder repo to populate the funnel
              </p>
            </div>
          </Reveal>
        ) : (
          <>
            <Reveal>
              <FlowStrip data={data} />
            </Reveal>

            <div className="grid gap-3 mt-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
              {STAGES.map((stage, i) => (
                <Reveal key={stage.key} delay={i * 40} className="h-full">
                  <StageCard stage={stage} entries={data[stage.key]} />
                </Reveal>
              ))}
            </div>
          </>
        )}
      </Section>
    </div>
  );
}
