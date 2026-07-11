"use client";

import { useState } from "react";
import {
  useNoveltyDashboard,
  type NoveltyRun,
  type NoveltyCandidate,
} from "@/hooks/useNoveltyDashboard";
import { cn } from "@/lib/utils";
import {
  RefreshCw,
  Sparkles,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Zap,
  Target,
  Lightbulb,
  Gem,
  Wrench,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Area,
  ComposedChart,
  ResponsiveContainer,
} from "recharts";
import { Reveal } from "@/components/kit/Reveal";

// ─── Phase Constants ─────────────────────────────────────────────────

const PHASES = [
  "CONSUME",
  "DREAM",
  "DAYDREAM",
  "CONTEMPLATE",
  "STEAL",
  "MATE",
  "TEST",
  "EVOLVE",
  "META-LEARN",
] as const;

// ─── Helpers ─────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function tierColor(value: number): string {
  if (value >= 80) return "var(--positive)";
  if (value >= 60) return "var(--neon)";
  if (value >= 40) return "var(--warn)";
  return "var(--danger)";
}

// ─── Score Bar Component ─────────────────────────────────────────────

function ScoreBar({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const color = tierColor(value);
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
      <span className="text-[12px] text-muted-foreground w-16 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface-1)" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="text-[11px] font-mono text-muted-foreground w-8 text-right tabular-nums">{value}</span>
    </div>
  );
}

// ─── Candidate Card Component ────────────────────────────────────────

function CandidateCard({ candidate }: { candidate: NoveltyCandidate }) {
  const [expanded, setExpanded] = useState(false);
  const confColor = candidate.confidence >= 0.85 ? "var(--positive)" : candidate.confidence >= 0.7 ? "var(--warn)" : "var(--danger)";

  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-start gap-3 mb-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: "var(--surface-1)" }}
        >
          <span className="text-[13px] font-bold font-mono" style={{ color: "var(--neon)" }}>#{candidate.rank}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h4 className="text-[14px] font-medium text-foreground truncate">{candidate.title}</h4>
            <span
              className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold shrink-0"
              style={{ color: "var(--neon)", background: "var(--surface-1)" }}
            >
              {candidate.compositeScore.toFixed(1)}
            </span>
          </div>
          <p className="text-[12px] text-muted-foreground line-clamp-2">{candidate.description}</p>
        </div>
      </div>

      <div className="space-y-1.5 mb-3">
        <ScoreBar label="Feasible" value={candidate.scores.feasibility} icon={Wrench} />
        <ScoreBar label="Novel" value={candidate.scores.novelty} icon={Lightbulb} />
        <ScoreBar label="Impact" value={candidate.scores.impact} icon={Target} />
        <ScoreBar label="Elegant" value={candidate.scores.elegance} icon={Gem} />
      </div>

      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
        <span
          className="px-2 py-0.5 rounded-md text-[11px] font-mono font-medium"
          style={{ color: confColor, background: "var(--surface-1)" }}
        >
          {(candidate.confidence * 100).toFixed(0)}% confidence
        </span>
        {candidate.lineage.map((l) => (
          <span
            key={l}
            className="px-2 py-0.5 rounded-full text-[11px] font-mono text-muted-foreground"
            style={{ background: "var(--surface-1)", border: "1px solid var(--hairline)" }}
          >
            {l}
          </span>
        ))}
      </div>

      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-[12px] font-mono text-muted-foreground hover:text-foreground transition-colors"
      >
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        Arguments
      </button>

      {expanded && (
        <div className="mt-2 space-y-2">
          <div className="p-2.5 rounded-lg" style={{ background: "color-mix(in oklab, var(--positive) 8%, transparent)", border: "1px solid color-mix(in oklab, var(--positive) 25%, transparent)" }}>
            <span className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: "var(--positive)" }}>For</span>
            <p className="text-[12px] text-muted-foreground mt-0.5">{candidate.forIt}</p>
          </div>
          <div className="p-2.5 rounded-lg" style={{ background: "color-mix(in oklab, var(--danger) 8%, transparent)", border: "1px solid color-mix(in oklab, var(--danger) 25%, transparent)" }}>
            <span className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: "var(--danger)" }}>Against</span>
            <p className="text-[12px] text-muted-foreground mt-0.5">{candidate.againstIt}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Run Panel Component ─────────────────────────────────────────────

function RunPanel({ run }: { run: NoveltyRun }) {
  const isRunning = run.status === "running";

  return (
    <div className="flex flex-col gap-4">
      {/* A. Header Panel */}
      <div className="glass-2 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <Sparkles className="w-4 h-4" style={{ color: "var(--neon)" }} />
            <span className="text-[14px] font-medium text-foreground">Novelty Run</span>
            <span
              className={cn("px-2 py-0.5 rounded-md text-[11px] font-mono font-medium", isRunning && "anim-breathe")}
              style={{ color: isRunning ? "var(--neon)" : "var(--positive)", background: "var(--surface-1)" }}
            >
              {isRunning ? "Running" : "Complete"}
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-mono text-muted-foreground">
            <span>Cycle {run.currentCycle}/{run.maxCycles}</span>
            <span>Budget: {formatDuration(run.budgetSecondsTotal - run.budgetSecondsRemaining)}/{formatDuration(run.budgetSecondsTotal)}</span>
            <span>Pivots: {run.strategyPivotsUsed}/{run.strategyPivotsMax}</span>
          </div>
        </div>
        <p className="text-[13px] text-foreground">{run.problem}</p>
        <div className="flex items-center gap-2 mt-2 text-[11px] font-mono text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>Started {formatDate(run.startedAt)}</span>
          <span className="opacity-40">|</span>
          <span>Updated {formatDate(run.updatedAt)}</span>
        </div>
      </div>

      {/* B. Phase Pipeline */}
      <div className="glass rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-3.5 h-3.5" style={{ color: "var(--neon)" }} />
          <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">Phase Pipeline</span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {PHASES.map((phaseName) => {
            const phase = run.phases.find((p) => p.name === phaseName);
            const status = phase?.status ?? "pending";
            const isCurrent = run.currentPhase === phaseName;
            const color = isCurrent ? "var(--neon)" : status === "complete" ? "var(--positive)" : undefined;
            return (
              <div
                key={phaseName}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[11px] font-mono font-semibold uppercase tracking-wider whitespace-nowrap flex items-center gap-1.5 transition-all",
                  isCurrent && "anim-breathe",
                  !color && "opacity-50 text-muted-foreground"
                )}
                style={color ? { color, background: "var(--surface-1)" } : { background: "var(--surface-1)" }}
              >
                {status === "complete" && <Check className="w-3 h-3" />}
                {phaseName}
              </div>
            );
          })}
        </div>
      </div>

      {/* C. Fitness Trajectory Chart */}
      {run.fitnessTrajectory.length > 0 && (
        <div className="glass rounded-xl p-4">
          <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-muted-foreground mb-3 block">Fitness Trajectory</span>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={run.fitnessTrajectory}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--hairline)" />
                <XAxis
                  dataKey="cycle"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  axisLine={{ stroke: "var(--hairline)" }}
                  label={{ value: "Cycle", position: "insideBottom", offset: -5, fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                />
                <YAxis yAxisId="score" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={{ stroke: "var(--hairline)" }} domain={[0, 100]} />
                <YAxis yAxisId="diversity" orientation="right" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={{ stroke: "var(--hairline)" }} domain={[0, 1]} />
                <Tooltip
                  contentStyle={{ background: "var(--surface-3)", border: "1px solid var(--hairline-strong)", borderRadius: 8, fontSize: 12 }}
                  labelFormatter={(v) => `Cycle ${v}`}
                />
                <Area yAxisId="diversity" type="monotone" dataKey="diversityIndex" fill="var(--neon-3)" fillOpacity={0.15} stroke="var(--neon-3)" strokeOpacity={0.5} name="Diversity" />
                <Line yAxisId="score" type="monotone" dataKey="avgScore" stroke="var(--neon)" strokeWidth={2} dot={{ fill: "var(--neon)", r: 3 }} name="Avg Score" />
                <Line yAxisId="score" type="monotone" dataKey="topScore" stroke="var(--positive)" strokeWidth={2} dot={{ fill: "var(--positive)", r: 3 }} name="Top Score" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* D. Checkpoint Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          { label: "Checkpoint A", hint: "CONTEMPLATE gate", status: run.checkpoints.a.status, primary: `${run.checkpoints.a.percentage?.toFixed(1)}%`, cycle: run.checkpoints.a.cycle },
          {
            label: "Checkpoint B",
            hint: "TEST gate",
            status: run.checkpoints.b.status,
            primary: run.checkpoints.b.currentAvg?.toFixed(1),
            secondary: run.checkpoints.b.previousAvg != null ? `(prev: ${run.checkpoints.b.previousAvg.toFixed(1)})` : null,
            cycle: run.checkpoints.b.cycle,
          },
        ].map((cp) => (
          <div key={cp.label} className="glass rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">{cp.label}</span>
              <span className="text-[11px] font-mono text-muted-foreground">{cp.hint}</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold"
                style={{ color: cp.status === "PASS" ? "var(--positive)" : "var(--danger)", background: "var(--surface-1)" }}
              >
                {cp.status}
              </span>
              <span className="text-[14px] font-mono text-foreground tabular-nums">{cp.primary}</span>
              {cp.secondary && <span className="text-[11px] font-mono text-muted-foreground">{cp.secondary}</span>}
              <span className="text-[11px] font-mono text-muted-foreground ml-auto">Cycle {cp.cycle}</span>
            </div>
          </div>
        ))}
      </div>

      {/* E. Top Candidates */}
      {run.candidates.length > 0 && (
        <div>
          <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-muted-foreground mb-3 block px-1">Top Candidates</span>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {run.candidates.map((c, i) => (
              <Reveal key={c.rank} delay={i * 40} from={i % 2 === 0 ? "left" : "right"}>
                <CandidateCard candidate={c} />
              </Reveal>
            ))}
          </div>
        </div>
      )}

      {/* F. Domain Fertility Table */}
      {run.domainFertility.length > 0 && (
        <div className="glass rounded-xl overflow-hidden">
          <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--hairline)" }}>
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">Domain Fertility</span>
          </div>
          <table className="w-full text-[13px]">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--hairline)" }}>
                <th className="px-4 py-2 text-left text-[11px] font-mono font-medium text-muted-foreground">Pairing</th>
                <th className="px-4 py-2 text-right text-[11px] font-mono font-medium text-muted-foreground">Avg Score</th>
                <th className="px-4 py-2 text-right text-[11px] font-mono font-medium text-muted-foreground">Count</th>
                <th className="px-4 py-2 text-right text-[11px] font-mono font-medium text-muted-foreground">Multiplier</th>
              </tr>
            </thead>
            <tbody>
              {run.domainFertility.map((d) => (
                <tr key={d.pairing} style={{ borderBottom: "1px solid var(--hairline)" }}>
                  <td className="px-4 py-2 text-foreground">{d.pairing}</td>
                  <td className="px-4 py-2 text-right font-mono text-muted-foreground tabular-nums">{d.avgScore.toFixed(1)}</td>
                  <td className="px-4 py-2 text-right font-mono text-muted-foreground tabular-nums">{d.count}</td>
                  <td
                    className="px-4 py-2 text-right font-mono font-medium tabular-nums"
                    style={{ color: d.multiplier > 1.0 ? "var(--positive)" : "var(--danger)" }}
                  >
                    {d.multiplier.toFixed(1)}x
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* G. Phase Metrics */}
      {run.phaseMetrics.length > 0 && (
        <div className="glass rounded-xl p-4">
          <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-muted-foreground mb-3 block">Phase Metrics</span>
          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
            {run.phaseMetrics.map((pm) => (
              <div key={pm.phase} className="rounded-lg p-2 text-center" style={{ background: "var(--surface-1)" }}>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 truncate">{pm.phase}</div>
                <div className="text-[11px] font-mono text-foreground tabular-nums">{formatDuration(pm.durationSeconds)}</div>
                <div className="text-[11px] text-muted-foreground">{pm.outputCount} out / {pm.agentCount} agents</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────

export default function NoveltyPage() {
  const { runs, isLoading, refetch } = useNoveltyDashboard();

  return (
    <div className="px-5 sm:px-8 lg:px-10 pb-24 max-w-[1400px] mx-auto">
      <section className="pt-8 sm:pt-10">
        <div className="flex items-center gap-2.5 mb-4 text-[11px] font-mono uppercase tracking-[0.28em] text-muted-foreground">
          <span className="w-1.5 h-1.5 rounded-full anim-breathe" style={{ background: "var(--positive)", boxShadow: "0 0 8px var(--positive)" }} />
          LifeOS · Novelty
        </div>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl sm:text-4xl font-bold leading-tight text-foreground">Novelty</h1>
            {runs.length > 0 && (
              <span className="text-[12px] font-mono text-muted-foreground">{runs.length} run{runs.length !== 1 ? "s" : ""}</span>
            )}
          </div>
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="inline-flex items-center gap-2 text-[12px] font-mono px-3 py-1.5 rounded-full text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            style={{ background: "var(--surface-1)", border: "1px solid var(--hairline)" }}
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
            Refresh
          </button>
        </div>
      </section>

      {runs.length === 0 && !isLoading && (
        <div className="glass rounded-xl mt-10 flex items-center justify-center min-h-[280px]">
          <div className="flex flex-col items-center gap-4 py-8 text-center px-6">
            <Sparkles className="w-10 h-10 text-muted-foreground" style={{ opacity: 0.4 }} />
            <div>
              <h3 className="text-[15px] font-semibold text-foreground mb-1.5">No Novelty Runs Yet</h3>
              <p className="text-[13px] text-muted-foreground max-w-md">
                Use the <code className="font-mono px-1.5 py-0.5 rounded" style={{ background: "var(--surface-1)" }}>CreateNovelty</code> skill to generate ideas.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-8 mt-8">
        {runs.map((run) => (
          <RunPanel key={run.id} run={run} />
        ))}
      </div>
    </div>
  );
}
