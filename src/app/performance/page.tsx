"use client";

import { useState, useEffect, useCallback, useMemo, useRef, useId } from "react";
import {
  DollarSign,
  AlertTriangle,
  TrendingUp,
  Cpu,
  Zap,
  Clock,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Layers,
  ListOrdered,
  Activity,
  Gauge,
  Wrench,
  Terminal,
  ExternalLink,
  CalendarDays,
  LineChart,
} from "lucide-react";
import EmptyStateGuide from "@/components/EmptyStateGuide";
import { Reveal } from "@/components/kit/Reveal";
import { Section } from "@/components/kit/Section";

type Tab = "cost" | "failures" | "anthropic" | "machine";

/* ---------- AgentsView proxy types (/api/agentsview/*) ---------- */

interface AVSummary {
  from: string;
  to: string;
  totals: {
    inputTokens: number;
    outputTokens: number;
    cacheCreationTokens: number;
    cacheReadTokens: number;
    totalCost: number;
    cacheSavings: number;
  };
  daily: Array<{ date: string; totalCost: number; inputTokens: number; outputTokens: number }>;
  projectTotals: Array<{ project: string; cost: number; inputTokens: number; outputTokens: number }>;
  modelTotals: Array<{ model: string; cost: number; inputTokens: number; outputTokens: number }>;
  agentTotals: Array<{ agent: string; cost: number }>;
  sessionCounts: { total: number; byAgent: Record<string, number> };
}

interface AVTopSession {
  sessionId: string;
  displayName: string;
  agent: string;
  project: string;
  startedAt: string;
  totalTokens: number;
  cost: number;
}

interface AVActivity {
  cells: Array<{ day_of_week: number; hour: number; messages: number }>;
}

interface AVHeatmap {
  metric: string;
  entries: Array<{ date: string; value: number; level: number }>;
}

interface AnthropicSnapshot {
  ts: string;
  subscription: { five_hour_pct: number | null; seven_day_pct: number | null };
  api_spend: { month_used_usd: number | null; source: string };
  call_sites: { total: number; bypass: number; legit: number; new_since_baseline: string[] };
  alerts: string[];
}

interface AnthropicCallSite {
  file: string;
  line: number;
  classification: "bypass" | "legit" | "unknown";
  reason: string;
}

interface AnthropicData {
  current: AnthropicSnapshot | null;
  history: AnthropicSnapshot[];
  total_entries: number;
  sites: AnthropicCallSite[];
  baseline_updated: string | null;
}

interface CostData {
  days: number;
  totalSessions: number;
  totalCost: number;
  totalTokens: number;
  avgCostPerSession: number;
  costBreakdown: { input: number; output: number; cacheWrite: number; cacheRead: number };
  byModel: Array<{ model: string; cost: number; sessions: number; tokens: number }>;
  dailyCosts: Array<{ day: string; cost: number }>;
  topSessions: Array<{
    sessionId: string;
    project: string;
    primaryModel: string;
    messageCount: number;
    costTotal: number;
    totalTokens: number;
    firstTimestamp: string;
    lastTimestamp: string;
  }>;
}

interface FailureData {
  totalFailures: number;
  totalCalls: number;
  overallRate: number;
  byTool: Array<{ tool: string; failures: number; calls: number; failureRate: number }>;
  trend: Array<{ day: string; failures: number; total: number; rate: number }>;
}

/* ---------- theme-token color maps (re-theme with [data-theme]) ---------- */

const MUTED = "hsl(var(--muted-foreground))";

const BREAKDOWN_COLOR: Record<string, string> = {
  Input: "var(--dim-money)",
  Output: "var(--dim-creative)",
  "Cache Write": "var(--dim-rhythms)",
  "Cache Read": "var(--positive)",
};

function modelColor(m: string): string {
  if (m.includes("opus")) return "var(--neon)";
  if (m.includes("sonnet")) return "var(--neon-2)";
  if (m.includes("haiku")) return "var(--neon-3)";
  return MUTED;
}

const SITE_COLOR: Record<AnthropicCallSite["classification"], string> = {
  bypass: "var(--danger)",
  unknown: "var(--warn)",
  legit: "var(--positive)",
};

const SITE_ICON: Record<AnthropicCallSite["classification"], typeof XCircle> = {
  bypass: XCircle,
  unknown: AlertTriangle,
  legit: CheckCircle2,
};

function failureTone(rate: number): string {
  if (rate > 5) return "var(--danger)";
  if (rate > 1) return "var(--warn)";
  return "var(--positive)";
}

function formatCost(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  return `$${n.toFixed(4)}`;
}

function fmtMoneyAxis(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`;
  if (n >= 10) return `$${Math.round(n)}`;
  if (n >= 1) return `$${n.toFixed(1)}`;
  if (n === 0) return "$0";
  return `$${n.toFixed(2)}`;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function shortModel(m: string): string {
  if (m.includes("opus")) return "Opus";
  if (m.includes("haiku")) return "Haiku";
  if (m.includes("sonnet")) return "Sonnet";
  if (m.includes("fable")) return "Fable";
  return m.slice(0, 20);
}

// Full readable model name, e.g. claude-opus-4-8 -> "Opus 4.8", claude-sonnet-5
// -> "Sonnet 5", claude-haiku-4-5-20251001 -> "Haiku 4.5".
function prettyModel(m: string): string {
  const fam = m.includes("opus")
    ? "Opus"
    : m.includes("sonnet")
    ? "Sonnet"
    : m.includes("haiku")
    ? "Haiku"
    : m.includes("fable")
    ? "Fable"
    : null;
  if (!fam) return m;
  const ver = m.match(/(?:opus|sonnet|haiku|fable)-(\d+)(?:-(\d+))?/i);
  if (!ver) return fam;
  return ver[2] ? `${fam} ${ver[1]}.${ver[2]}` : `${fam} ${ver[1]}`;
}

/* ---------- time horizons ---------- */

const HORIZONS = ["24h", "7d", "30d", "1mo", "3mo", "6mo", "1y", "MTD", "YTD", "All"] as const;
type Horizon = (typeof HORIZONS)[number];

// Earliest datum in the AgentsView index — "All" starts here, never before.
const AV_EPOCH = "2026-04-01";

interface Range {
  from: string;
  to: string;
  /** days back from now — for the days-based APIs (anthropic ledger) */
  days: number;
  label: string;
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function horizonRange(h: Horizon): Range {
  const now = new Date();
  const today = ymd(now);
  const back = (n: number) => ymd(new Date(now.getTime() - n * 86400000));
  const spanDays = (from: string) =>
    Math.max(1, Math.ceil((now.getTime() - new Date(`${from}T00:00:00`).getTime()) / 86400000));
  switch (h) {
    case "24h":
      return { from: back(1), to: today, days: 1, label: "last 24h" };
    case "7d":
      return { from: back(6), to: today, days: 7, label: "last 7 days" };
    case "30d":
      return { from: back(29), to: today, days: 30, label: "last 30 days" };
    case "1mo": {
      // previous full calendar month — deliberately distinct from rolling 30d and from MTD
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        from: ymd(first),
        to: ymd(last),
        days: spanDays(ymd(first)),
        label: first.toLocaleDateString("en-GB", { month: "short", year: "numeric" }),
      };
    }
    case "3mo":
      return { from: back(89), to: today, days: 90, label: "last 3 months" };
    case "6mo":
      return { from: back(182), to: today, days: 183, label: "last 6 months" };
    case "1y":
      return { from: back(364), to: today, days: 365, label: "last 12 months" };
    case "MTD": {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: ymd(first), to: today, days: now.getDate(), label: "month to date" };
    }
    case "YTD": {
      const first = new Date(now.getFullYear(), 0, 1);
      return { from: ymd(first), to: today, days: spanDays(ymd(first)), label: "year to date" };
    }
    case "All":
      return { from: AV_EPOCH, to: today, days: spanDays(AV_EPOCH), label: "all time · since Apr 2026" };
  }
}

function fmtSpanDate(s: string): string {
  return new Date(`${s}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** Fill every calendar day in [from, min(to, today)]. mode "zero" = absent day
 *  is a true zero (no sessions → $0); mode "gap" = absent day is no-observation
 *  (line breaks instead of lying with a 0). */
function fillDaily(
  from: string,
  to: string,
  get: (day: string) => number | undefined,
  mode: "zero" | "gap",
): Array<{ t: number; y: number | null }> {
  const out: Array<{ t: number; y: number | null }> = [];
  const today = new Date(`${ymd(new Date())}T00:00:00`).getTime();
  const end = Math.min(new Date(`${to}T00:00:00`).getTime(), today);
  for (let t = new Date(`${from}T00:00:00`).getTime(); t <= end; t += 86400000) {
    const v = get(ymd(new Date(t)));
    out.push({ t, y: v !== undefined ? v : mode === "zero" ? 0 : null });
  }
  return out;
}

const fmtDay = (t: number) => new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
const fmtDayFull = (t: number) =>
  new Date(t).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
const fmtTs = (t: number) =>
  new Date(t).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/* ---------- chart primitives ---------- */

function useMeasure<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T | null>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setW(e.contentRect.width);
    });
    ro.observe(el);
    setW(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

function niceStep(raw: number): number {
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const b = raw / pow;
  return (b <= 1 ? 1 : b <= 2 ? 2 : b <= 5 ? 5 : 10) * pow;
}

function yTicksFor(maxV: number, target = 4): { ticks: number[]; top: number } {
  if (maxV <= 0) return { ticks: [0, 1], top: 1 };
  const step = niceStep(maxV / target);
  const top = Math.ceil(maxV / step - 1e-9) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= top + step / 1e6; v += step) ticks.push(v);
  return { ticks, top };
}

interface ChartSeries {
  label: string;
  color: string;
  points: Array<{ t: number; y: number | null }>;
}

/** Shaded-area line chart: token-pure SVG, snap crosshair, glass tooltip.
 *  All series must share the same t-grid (aligned points). */
function AreaLineChart({
  series,
  height = 230,
  fmtY,
  fmtX = fmtDay,
  fmtXFull = fmtDayFull,
  sensitive = false,
  yTop,
  extra,
}: {
  series: ChartSeries[];
  height?: number;
  fmtY: (n: number) => string;
  fmtX?: (t: number) => string;
  fmtXFull?: (t: number) => string;
  sensitive?: boolean;
  /** pin the y-axis top (e.g. 100 for percentages) */
  yTop?: number;
  /** optional extra tooltip line per snapped index */
  extra?: (i: number) => string | null;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [wrapRef, width] = useMeasure<HTMLDivElement>();
  const [hover, setHover] = useState<{ i: number; px: number; py: number } | null>(null);

  const ts = series[0]?.points.map((p) => p.t) ?? [];
  const n = ts.length;
  const valued = series.flatMap((s) => s.points.filter((p) => p.y !== null));

  const sens = sensitive ? { "data-sensitive": "" } : {};
  const single = series.length === 1;

  if (n < 2 || valued.length < 1) {
    return (
      <p className="text-[12px] font-mono text-muted-foreground py-6">
        Not enough data points in this window to draw a trend.
      </p>
    );
  }

  const PAD = { l: 54, r: 16, t: 12, b: 26 };
  const w = Math.max(width, 320);
  const innerW = w - PAD.l - PAD.r;
  const innerH = height - PAD.t - PAD.b;
  const t0 = ts[0];
  const t1 = ts[n - 1];
  const X = (t: number) => PAD.l + (t1 === t0 ? innerW / 2 : ((t - t0) / (t1 - t0)) * innerW);
  const maxY = Math.max(...valued.map((p) => p.y as number), 0);
  const axis = yTop
    ? { ticks: [0, yTop / 4, yTop / 2, (3 * yTop) / 4, yTop], top: yTop }
    : yTicksFor(maxY);
  const Y = (v: number) => PAD.t + innerH * (1 - v / axis.top);

  // Thin x ticks by pixel distance so clustered timestamps never collide;
  // the last tick wins over any neighbour it would overlap.
  const MIN_TICK_GAP = 78;
  const xtStep = Math.max(1, Math.ceil(n / 6));
  const xTickIdx: number[] = [];
  let lastX = -Infinity;
  for (let i = 0; i < n; i += xtStep) {
    const xi = X(ts[i]);
    if (xi - lastX >= MIN_TICK_GAP) {
      xTickIdx.push(i);
      lastX = xi;
    }
  }
  if (xTickIdx[xTickIdx.length - 1] !== n - 1) {
    while (xTickIdx.length && X(ts[n - 1]) - X(ts[xTickIdx[xTickIdx.length - 1]]) < MIN_TICK_GAP) xTickIdx.pop();
    xTickIdx.push(n - 1);
  }

  type Pt = { t: number; y: number };
  const segsOf = (pts: ChartSeries["points"]): Pt[][] => {
    const out: Pt[][] = [];
    let cur: Pt[] = [];
    for (const p of pts) {
      if (p.y === null) {
        if (cur.length) out.push(cur);
        cur = [];
      } else cur.push(p as Pt);
    }
    if (cur.length) out.push(cur);
    return out;
  };
  const linePath = (seg: Pt[]) =>
    seg.map((p, i) => `${i ? "L" : "M"}${X(p.t).toFixed(1)},${Y(p.y).toFixed(1)}`).join(" ");
  const areaPath = (seg: Pt[]) =>
    `${linePath(seg)} L${X(seg[seg.length - 1].t).toFixed(1)},${Y(0).toFixed(1)} L${X(seg[0].t).toFixed(1)},${Y(0).toFixed(1)} Z`;

  const lastPt = single ? [...series[0].points].reverse().find((p) => p.y !== null) : null;

  const onMove = (e: React.PointerEvent) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    let best = 0;
    let bd = Infinity;
    for (let i = 0; i < n; i++) {
      const d = Math.abs(X(ts[i]) - px);
      if (d < bd) {
        bd = d;
        best = i;
      }
    }
    setHover({ i: best, px, py });
  };

  const tipRows = hover
    ? series
        .map((s) => ({ s, y: s.points[hover.i]?.y }))
        .filter((r): r is { s: ChartSeries; y: number } => r.y !== null && r.y !== undefined)
    : [];
  const extraLine = hover && extra ? extra(hover.i) : null;

  const TIP_W = 176;
  const tipLeft = hover
    ? hover.px > w - TIP_W - 28
      ? Math.max(4, hover.px - TIP_W - 14)
      : hover.px + 14
    : 0;
  const tipTop = hover ? Math.min(Math.max(hover.py - 14, 4), Math.max(4, height - 100)) : 0;

  return (
    <div ref={wrapRef} className="relative w-full" style={{ height }}>
      {width > 0 && (
        <svg width={w} height={height} className="block" role="img" aria-label="time series chart">
          <defs>
            {series.map((s, si) => (
              <linearGradient key={si} id={`${uid}g${si}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={s.color} stopOpacity="0.26" />
                <stop offset="1" stopColor={s.color} stopOpacity="0.02" />
              </linearGradient>
            ))}
          </defs>

          {axis.ticks.map((v) => (
            <g key={v}>
              <line
                x1={PAD.l}
                x2={w - PAD.r}
                y1={Y(v)}
                y2={Y(v)}
                stroke={v === 0 ? "var(--hairline-strong)" : "var(--hairline)"}
                strokeWidth={1}
              />
              <text
                x={PAD.l - 8}
                y={Y(v) + 3}
                textAnchor="end"
                fontSize={10}
                className="font-mono tabular-nums"
                fill={MUTED}
              >
                {fmtY(v)}
              </text>
            </g>
          ))}

          {xTickIdx.map((i) => (
            <text
              key={i}
              x={X(ts[i])}
              y={height - 8}
              textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}
              fontSize={10}
              className="font-mono tabular-nums"
              fill={MUTED}
            >
              {fmtX(ts[i])}
            </text>
          ))}

          {series.map((s, si) =>
            segsOf(s.points).map((seg, gi) =>
              seg.length === 1 ? (
                <circle
                  key={`${si}-${gi}`}
                  cx={X(seg[0].t)}
                  cy={Y(seg[0].y)}
                  r={3}
                  fill={s.color}
                  stroke="hsl(var(--card))"
                  strokeWidth={1.5}
                />
              ) : (
                <g key={`${si}-${gi}`}>
                  <path d={areaPath(seg)} fill={`url(#${uid}g${si})`} />
                  <path
                    d={linePath(seg)}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={2}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                </g>
              ),
            ),
          )}

          {lastPt && (
            <g>
              <circle
                cx={X(lastPt.t)}
                cy={Y(lastPt.y as number)}
                r={3.5}
                fill={series[0].color}
                stroke="hsl(var(--card))"
                strokeWidth={2}
              />
              <text
                x={Math.min(X(lastPt.t), w - PAD.r) - 8}
                y={Math.max(Y(lastPt.y as number) - 10, 12)}
                textAnchor="end"
                fontSize={11}
                className="font-mono tabular-nums"
                fill="hsl(var(--foreground))"
                {...sens}
              >
                {fmtY(lastPt.y as number)}
              </text>
            </g>
          )}

          {hover && (
            <g pointerEvents="none">
              <line
                x1={X(ts[hover.i])}
                x2={X(ts[hover.i])}
                y1={PAD.t}
                y2={height - PAD.b}
                stroke="var(--hairline-strong)"
                strokeWidth={1}
              />
              {tipRows.map(({ s, y }, ri) => (
                <circle
                  key={ri}
                  cx={X(ts[hover.i])}
                  cy={Y(y)}
                  r={4.5}
                  fill={s.color}
                  stroke="hsl(var(--card))"
                  strokeWidth={2}
                  style={{ filter: "drop-shadow(0 0 6px var(--glow))" }}
                />
              ))}
            </g>
          )}

          <rect
            x={PAD.l}
            y={PAD.t}
            width={innerW}
            height={innerH}
            fill="transparent"
            onPointerMove={onMove}
            onPointerLeave={() => setHover(null)}
          />
        </svg>
      )}

      {hover && tipRows.length > 0 && (
        <div
          className="absolute z-10 pointer-events-none rounded-lg px-3 py-2"
          style={{
            left: tipLeft,
            top: tipTop,
            minWidth: 140,
            maxWidth: TIP_W + 40,
            background: "var(--surface-3)",
            border: "1px solid var(--hairline-strong)",
            backdropFilter: "blur(10px)",
            boxShadow: "0 6px 22px color-mix(in oklab, var(--bg-deep) 55%, transparent)",
          }}
        >
          <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground mb-1 whitespace-nowrap">
            {fmtXFull(ts[hover.i])}
          </div>
          {tipRows.map(({ s, y }) => (
            <div key={s.label} className="flex items-center gap-2 py-0.5">
              <span className="w-3 h-[2px] rounded-full shrink-0" style={{ background: s.color }} />
              <span
                className="text-[13px] font-mono font-semibold tabular-nums text-foreground whitespace-nowrap"
                {...sens}
              >
                {fmtY(y)}
              </span>
              {!single && <span className="text-[11px] text-muted-foreground truncate">{s.label}</span>}
            </div>
          ))}
          {single &&
            hover.i > 0 &&
            (() => {
              const prev = series[0].points[hover.i - 1].y;
              const cur = series[0].points[hover.i].y;
              if (prev === null || cur === null) return null;
              const d = cur - prev;
              return (
                <div className="text-[10px] font-mono tabular-nums text-muted-foreground mt-0.5 whitespace-nowrap" {...sens}>
                  {d >= 0 ? "+" : "−"}
                  {fmtY(Math.abs(d))} vs prior
                </div>
              );
            })()}
          {extraLine && (
            <div className="text-[10px] font-mono tabular-nums text-muted-foreground mt-0.5 whitespace-nowrap">
              {extraLine}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ChartLegend({ series }: { series: ChartSeries[] }) {
  if (series.length < 2) return null;
  return (
    <div className="flex items-center gap-4 flex-wrap mb-2">
      {series.map((s) => (
        <span key={s.label} className="inline-flex items-center gap-1.5">
          <span className="w-3.5 h-[2px] rounded-full" style={{ background: s.color }} />
          <span className="text-[11px] text-muted-foreground">{s.label}</span>
        </span>
      ))}
    </div>
  );
}

/** Count of days carrying real data vs the window — honesty line for thin windows. */
function coverageNote(points: Array<{ y: number | null }>): string | null {
  const active = points.filter((p) => p.y !== null && p.y !== 0).length;
  if (points.length >= 4 && active < points.length / 2) {
    return `${active} active day${active === 1 ? "" : "s"} of ${points.length} in range`;
  }
  return null;
}

/* ---------- horizon selector ---------- */

function RangeSelector({
  value,
  onChange,
  range,
}: {
  value: Horizon;
  onChange: (h: Horizon) => void;
  range: Range;
}) {
  return (
    <div className="flex items-center gap-2.5 flex-wrap">
      <div className="flex items-center gap-1 flex-wrap">
        {HORIZONS.map((h) => {
          const on = value === h;
          return (
            <button
              key={h}
              onClick={() => onChange(h)}
              aria-label={`Show range ${h}`}
              className="text-[11px] font-mono tabular-nums px-2 py-1 rounded-full cursor-pointer transition-colors"
              style={{
                background: on ? "var(--surface-2)" : "var(--surface-1)",
                border: `1px solid ${on ? "var(--hairline-strong)" : "var(--hairline)"}`,
                color: on ? "var(--neon)" : MUTED,
              }}
            >
              {h}
            </button>
          );
        })}
      </div>
      <span className="hidden lg:inline text-[10px] font-mono tabular-nums text-muted-foreground whitespace-nowrap">
        {fmtSpanDate(range.from)} → {fmtSpanDate(range.to)}
      </span>
    </div>
  );
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

function StatTile({
  icon: Icon,
  label,
  value,
  sub,
  color,
  sensitive,
}: {
  icon: typeof DollarSign;
  label: string;
  value: string;
  sub?: string;
  /** accent for the icon + value; defaults to plain foreground */
  color?: string;
  /** marks the value for ObserverMode blur */
  sensitive?: boolean;
}) {
  const sens = sensitive ? { "data-sensitive": "" } : {};
  return (
    <div className="glass rounded-lg px-3.5 py-3 min-w-[132px]">
      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
        <Icon className="w-3.5 h-3.5" style={color ? { color } : undefined} />
        <span className="text-[10px] font-mono uppercase tracking-[0.16em]">{label}</span>
      </div>
      <div className="text-2xl font-bold font-mono tabular-nums text-foreground" {...sens}>
        {value}
      </div>
      {sub && <div className="text-[11px] font-mono text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

/* ---------- hero ---------- */

function Hero({
  cost,
  failures,
  rangeLabel,
}: {
  cost: CostData | null;
  failures: FailureData | null;
  rangeLabel: string;
}) {
  const hasSpend = !!cost && cost.totalSessions > 0;
  const hasCalls = !!failures && failures.totalCalls > 0;
  return (
    <section className="pt-8 sm:pt-10">
      <div className="flex items-center gap-2.5 mb-4 text-[11px] font-mono uppercase tracking-[0.28em] text-muted-foreground">
        <span
          className="w-1.5 h-1.5 rounded-full anim-breathe"
          style={{ background: "var(--positive)", boxShadow: "0 0 8px var(--positive)" }}
        />
        LifeOS · Performance
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold leading-tight text-foreground">Performance</h1>
      <p className="mt-2 text-[13px] text-muted-foreground max-w-[62ch]">
        Runtime economics of the machine: session cost, token burn, tool failures, and Anthropic account posture.
      </p>

      {cost && hasSpend && (
        <div className="mt-5">
          <div className="text-[10px] font-mono uppercase tracking-[0.24em] mb-1.5" style={{ color: "var(--neon)" }}>
            Claude spend · {rangeLabel}
          </div>
          <div className="text-4xl sm:text-5xl font-bold font-mono tabular-nums text-foreground" data-sensitive>
            {formatCost(cost.totalCost)}
          </div>
        </div>
      )}

      {(hasSpend || hasCalls) && (
        <div className="mt-6 flex flex-wrap gap-3">
          {cost && hasSpend && (
            <StatTile icon={Cpu} label="Sessions" value={cost.totalSessions.toLocaleString()} />
          )}
          {cost && hasSpend && cost.totalTokens > 0 && (
            <StatTile icon={Zap} label="Tokens" value={formatTokens(cost.totalTokens)} />
          )}
          {cost && hasSpend && (
            <StatTile icon={TrendingUp} label="Avg / session" value={formatCost(cost.avgCostPerSession)} sensitive />
          )}
          {failures && hasCalls && (
            <StatTile
              icon={Gauge}
              label="Failure rate"
              value={`${failures.overallRate}%`}
              sub={`${failures.totalFailures.toLocaleString()} / ${failures.totalCalls.toLocaleString()} calls`}
              color={failureTone(failures.overallRate)}
            />
          )}
        </div>
      )}
    </section>
  );
}

/* ---------- cost tab ---------- */

const TOOL_GRID = "minmax(140px, 1fr) 90px 110px 70px 200px";

function CostTab({ data, avDaily, range }: { data: CostData | null; avDaily: AVSummary["daily"] | null; range: Range }) {
  const [sessMeta, setSessMeta] = useState<Record<string, { title: string; project: string; agent: string }>>({});
  const [avWeb, setAvWeb] = useState<string>("http://127.0.0.1:8080");
  const ids = (data?.topSessions ?? []).slice(0, 15).map((s) => s.sessionId).join(",");
  useEffect(() => {
    if (!ids) return;
    fetch(`/api/agentsview/session-meta?ids=${encodeURIComponent(ids)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setSessMeta(d.sessions || {});
          if (d.webBase) setAvWeb(d.webBase);
        }
      })
      .catch(() => {});
  }, [ids]);

  const trend = useMemo<ChartSeries[]>(() => {
    // Prefer AgentsView's series (complete, API-equivalent dollars); fall back to
    // the LifeOS session ledger if the daemon is offline. Zero-days are true $0.
    const src = avDaily
      ? new Map(avDaily.map((d) => [d.date, d.totalCost]))
      : new Map((data?.dailyCosts ?? []).map((d) => [d.day, d.cost]));
    return [
      {
        label: "Daily cost",
        color: "var(--neon)",
        points: fillDaily(range.from, range.to, (day) => src.get(day), "zero"),
      },
    ];
  }, [avDaily, data, range]);

  if (!data) return <div className="mt-10 text-[13px] font-mono text-muted-foreground">Loading cost data…</div>;

  const isEmpty = data.totalSessions === 0 && data.totalCost === 0 && data.totalTokens === 0;
  if (isEmpty) {
    return (
      <div className="mt-10">
        <EmptyStateGuide
          section="Performance"
          description="Runtime telemetry — tool latency, model timing, agent durations. Populates as you use LifeOS."
          hideInterview
          daPromptExample="show me where my sessions are spending time"
        />
      </div>
    );
  }

  const breakdown = [
    { label: "Input", val: data.costBreakdown.input },
    { label: "Output", val: data.costBreakdown.output },
    { label: "Cache Write", val: data.costBreakdown.cacheWrite },
    { label: "Cache Read", val: data.costBreakdown.cacheRead },
  ].filter((b) => b.val > 0);

  const sessions = data.topSessions.slice(0, 15);
  const trendSource = avDaily ? "AgentsView · API-equivalent dollars" : "LifeOS session ledger (AgentsView offline)";
  const cover = coverageNote(trend[0].points);

  return (
    <>
      <Section
        icon={LineChart}
        kicker={`${trendSource} · ${fmtSpanDate(range.from)} → ${fmtSpanDate(range.to)}`}
        title="Daily Cost Trend"
        count={trend[0].points.length}
        countLabel="days"
      >
        <Reveal>
          <div className="glass rounded-xl p-4 sm:p-5">
            <AreaLineChart series={trend} height={250} fmtY={fmtMoneyAxis} sensitive />
            {cover && <p className="mt-1 text-[11px] font-mono text-muted-foreground">{cover}</p>}
          </div>
        </Reveal>
      </Section>

      {breakdown.length > 0 && (
        <Section
          icon={Layers}
          kicker={`Where the tokens went · LifeOS session ledger · ${range.label}`}
          title="Cost Breakdown"
          count={breakdown.length}
        >
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
            {breakdown.map((item, i) => {
              const color = BREAKDOWN_COLOR[item.label] ?? MUTED;
              return (
                <Reveal key={item.label} delay={i * 40}>
                  <div className="glass rounded-xl p-4 h-full">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: color, boxShadow: `0 0 8px ${color}` }}
                      />
                      <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground">
                        {item.label}
                      </span>
                    </div>
                    <div className="text-xl font-bold font-mono tabular-nums text-foreground" data-sensitive>
                      {formatCost(item.val)}
                    </div>
                    <div className="text-[11px] font-mono text-muted-foreground tabular-nums mt-1">
                      {Math.round((item.val / Math.max(data.totalCost, 0.01)) * 100)}% of total
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </Section>
      )}

      {data.byModel.length > 0 && (
        <Section
          icon={Cpu}
          kicker={`Spend per model · LifeOS session ledger · ${range.label}`}
          title="Cost by Model"
          count={data.byModel.length}
        >
          <Reveal>
            <div className="glass rounded-xl overflow-hidden">
              {data.byModel.map((m, i) => {
                const color = modelColor(m.model);
                const pct = Math.min(Math.max((m.cost / Math.max(data.totalCost, 0.01)) * 100, 2), 100);
                return (
                  <div
                    key={m.model}
                    className="flex items-center gap-3 px-4 sm:px-5 py-3 transition-colors"
                    style={{ borderTop: i === 0 ? "none" : "1px solid var(--hairline)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-1)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <span className="w-20 shrink-0 text-[12px] font-mono" style={{ color }} title={m.model}>
                      {shortModel(m.model)}
                    </span>
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--surface-1)" }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                    </div>
                    <span className="w-20 text-right text-[12px] font-mono tabular-nums text-foreground" data-sensitive>
                      {formatCost(m.cost)}
                    </span>
                    <span className="w-20 text-right text-[11px] font-mono tabular-nums text-muted-foreground">
                      {m.sessions} sess
                    </span>
                    <span className="hidden sm:block w-16 text-right text-[11px] font-mono tabular-nums text-muted-foreground">
                      {formatTokens(m.tokens)}
                    </span>
                  </div>
                );
              })}
            </div>
          </Reveal>
        </Section>
      )}

      {sessions.length > 0 && (
        <Section icon={ListOrdered} kicker="Heaviest sessions — click to open in AgentsView" title="Most Expensive Sessions" count={sessions.length}>
          <Reveal>
            <div className="glass rounded-xl overflow-hidden">
              {sessions.map((s, i) => {
                const meta = sessMeta[s.sessionId];
                const title = meta?.title?.trim() || `Session ${s.sessionId.slice(0, 8)}`;
                const href = `${avWeb}/sessions/${encodeURIComponent(s.sessionId)}`;
                return (
                  <a
                    key={s.sessionId}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-start gap-3 px-4 py-3 transition-colors group"
                    style={{ textDecoration: "none", borderTop: i === 0 ? "none" : "1px solid var(--hairline)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-1)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    title={`${s.primaryModel} · open in AgentsView`}
                  >
                    <span className="w-6 shrink-0 text-[12px] font-mono tabular-nums text-muted-foreground pt-0.5">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[14px] font-medium leading-snug text-foreground truncate group-hover:text-neon transition-colors"
                          data-sensitive
                        >
                          {title}
                        </span>
                        <ExternalLink className="w-3.5 h-3.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="mt-1 flex items-center gap-2 flex-wrap text-[11px] font-mono tabular-nums text-muted-foreground">
                        <span style={{ color: modelColor(s.primaryModel) }}>{prettyModel(s.primaryModel)}</span>
                        <span className="opacity-40">·</span>
                        <span>{s.messageCount} msgs</span>
                        <span className="opacity-40">·</span>
                        <span>{formatTokens(s.totalTokens)} tok</span>
                        {meta?.project && meta.project !== "_" && (
                          <>
                            <span className="opacity-40">·</span>
                            <span className="truncate max-w-[160px]" data-sensitive>{meta.project}</span>
                          </>
                        )}
                        <span className="opacity-40">·</span>
                        <span>{(s.lastTimestamp || "").slice(0, 10)}</span>
                      </div>
                    </div>
                    <span className="shrink-0 text-[13px] font-mono font-semibold tabular-nums text-foreground pt-0.5" data-sensitive>
                      {formatCost(s.costTotal)}
                    </span>
                  </a>
                );
              })}
            </div>
          </Reveal>
        </Section>
      )}
    </>
  );
}

/* ---------- failures tab ---------- */

function FailuresTab({ data, range }: { data: FailureData | null; range: Range }) {
  const rateSeries = useMemo<ChartSeries[]>(() => {
    // A day with zero tool calls is no-observation, not a 0% failure day —
    // the line breaks instead of lying with a perfect zero.
    const byDay = new Map((data?.trend ?? []).map((d) => [d.day, d]));
    return [
      {
        label: "Failure rate",
        color: "var(--danger)",
        points: fillDaily(range.from, range.to, (day) => byDay.get(day)?.rate, "gap"),
      },
    ];
  }, [data, range]);

  const trendRows = useMemo(() => {
    const byDay = new Map((data?.trend ?? []).map((d) => [d.day, d]));
    return rateSeries[0].points.map((p) => byDay.get(ymd(new Date(p.t))) ?? null);
  }, [data, rateSeries]);

  if (!data) return <div className="mt-10 text-[13px] font-mono text-muted-foreground">Loading failure data…</div>;

  if (data.totalCalls === 0) {
    return (
      <div className="mt-10 glass rounded-xl text-center px-4 py-10">
        <Activity className="w-8 h-8 mx-auto text-muted-foreground" style={{ opacity: 0.4 }} />
        <p className="text-[13px] text-muted-foreground mt-3">
          No tool calls recorded in this window — failure telemetry appears once the machine runs.
        </p>
      </div>
    );
  }

  const top = data.byTool[0];
  const latest = data.trend.length >= 1 ? data.trend[data.trend.length - 1] : null;
  const failing = data.byTool.filter((t) => t.failures > 0);
  const cover = coverageNote(rateSeries[0].points);

  return (
    <>
      <Reveal>
        <div className="mt-8 flex flex-wrap gap-3">
          <StatTile
            icon={Gauge}
            label="Failure rate"
            value={`${data.overallRate}%`}
            sub={`${data.totalFailures.toLocaleString()} failures / ${data.totalCalls.toLocaleString()} calls`}
            color={failureTone(data.overallRate)}
          />
          {top && top.failures > 0 && (
            <StatTile
              icon={AlertTriangle}
              label="Top offender"
              value={top.tool}
              sub={`${top.failures} failures (${top.failureRate}%)`}
              color="var(--warn)"
            />
          )}
          {latest && (
            <StatTile icon={Clock} label="Latest day" value={`${latest.rate}%`} sub={latest.day} color={failureTone(latest.rate)} />
          )}
        </div>
      </Reveal>

      <Section
        icon={LineChart}
        kicker={`LifeOS tool telemetry · ${fmtSpanDate(range.from)} → ${fmtSpanDate(range.to)}`}
        title="Failure Rate Trend"
        count={data.trend.length}
        countLabel="days"
      >
        <Reveal>
          <div className="glass rounded-xl p-4 sm:p-5">
            <AreaLineChart
              series={rateSeries}
              height={210}
              fmtY={(v) => `${Math.round(v * 10) / 10}%`}
              extra={(i) => {
                const row = trendRows[i];
                return row ? `${row.failures} failures / ${row.total} calls` : "no tool calls this day";
              }}
            />
            {cover && <p className="mt-1 text-[11px] font-mono text-muted-foreground">{cover}</p>}
          </div>
        </Reveal>
      </Section>

      {failing.length > 0 ? (
        <Section
          icon={Wrench}
          kicker={`Which tools break · same window`}
          title="Failure Rate by Tool"
          count={failing.length}
        >
          <Reveal>
            <div className="glass rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <div className="min-w-[640px]">
                  <div
                    className="grid items-center gap-2.5 px-4 py-2.5 text-[10px] font-mono uppercase tracking-[0.12em] font-semibold text-muted-foreground"
                    style={{ gridTemplateColumns: TOOL_GRID, borderBottom: "1px solid var(--hairline-strong)" }}
                  >
                    <span>Tool</span>
                    <span className="text-right">Failures</span>
                    <span className="text-right">Total calls</span>
                    <span className="text-right">Rate</span>
                    <span />
                  </div>
                  {failing.map((t) => (
                    <div
                      key={t.tool}
                      className="grid items-center gap-2.5 px-4 py-2 transition-colors"
                      style={{ gridTemplateColumns: TOOL_GRID, borderBottom: "1px solid var(--hairline)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-1)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <span className="text-[13px] font-medium text-foreground truncate">{t.tool}</span>
                      <span className="text-[12px] font-mono tabular-nums text-right" style={{ color: "var(--danger)" }}>
                        {t.failures}
                      </span>
                      <span className="text-[11px] font-mono tabular-nums text-right text-muted-foreground">
                        {t.calls.toLocaleString()}
                      </span>
                      <span className="text-[12px] font-mono tabular-nums text-right text-foreground">{t.failureRate}%</span>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--surface-1)" }}>
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${Math.min(t.failureRate * 2, 100)}%`, background: "var(--danger)" }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </Section>
      ) : (
        <Reveal>
          <div className="mt-8 glass rounded-xl px-4 py-6 flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: "var(--positive)" }} />
            <p className="text-[13px] text-muted-foreground">
              Zero tool failures across {data.totalCalls.toLocaleString()} calls in the window.
            </p>
          </div>
        </Reveal>
      )}
    </>
  );
}

/* ---------- anthropic tab ---------- */

function AnthropicTab({ data, range }: { data: AnthropicData | null; range: Range }) {
  const hist = data?.history ?? [];
  const histTs = useMemo(() => hist.map((h) => new Date(h.ts).getTime()), [hist]);

  const siteSeries = useMemo<ChartSeries[]>(
    () => [
      { label: "total", color: "var(--neon)", points: hist.map((h, i) => ({ t: histTs[i], y: h.call_sites.total })) },
      { label: "bypass", color: "var(--danger)", points: hist.map((h, i) => ({ t: histTs[i], y: h.call_sites.bypass })) },
      { label: "legit", color: "var(--positive)", points: hist.map((h, i) => ({ t: histTs[i], y: h.call_sites.legit })) },
    ],
    [hist, histTs],
  );

  const utilSeries = useMemo<ChartSeries[]>(
    () => [
      {
        label: "5h window",
        color: "var(--neon)",
        points: hist.map((h, i) => ({ t: histTs[i], y: h.subscription.five_hour_pct })),
      },
      {
        label: "7d window",
        color: "var(--neon-2)",
        points: hist.map((h, i) => ({ t: histTs[i], y: h.subscription.seven_day_pct })),
      },
    ],
    [hist, histTs],
  );

  if (!data) return <div className="mt-10 text-[13px] font-mono text-muted-foreground">Loading Anthropic cost data…</div>;

  if (!data.current) {
    return (
      <div className="mt-10 glass rounded-xl px-5 py-8">
        <p className="text-[13px] text-muted-foreground">No ledger entries yet. CostTracker cron runs hourly — next entry at :00. Run manually:</p>
        <code className="block text-[12px] font-mono mt-2" style={{ color: "var(--neon-2)" }}>
          bun ~/.claude/LIFEOS/TOOLS/CostTracker.ts log
        </code>
      </div>
    );
  }

  const snap = data.current;
  const fiveH = snap.subscription.five_hour_pct ?? 0;
  const sevenD = snap.subscription.seven_day_pct ?? 0;
  const apiSpend = snap.api_spend.month_used_usd;
  const bypassSites = data.sites.filter((s) => s.classification === "bypass");
  const unknownSites = data.sites.filter((s) => s.classification === "unknown");
  const legitSites = data.sites.filter((s) => s.classification === "legit");
  const orderedSites = [...bypassSites, ...unknownSites, ...legitSites];
  const hasUtil = hist.some((h) => h.subscription.five_hour_pct !== null || h.subscription.seven_day_pct !== null);

  return (
    <>
      {snap.alerts.length > 0 && (
        <Reveal>
          <div
            className="mt-8 glass rounded-xl p-4"
            style={{ border: "1px solid color-mix(in oklab, var(--danger) 40%, transparent)" }}
          >
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: "var(--danger)" }} />
              <span className="text-[13px] font-semibold" style={{ color: "var(--danger)" }}>Active Alerts</span>
              <span className="ml-auto text-[11px] font-mono tabular-nums text-muted-foreground">
                {String(snap.alerts.length).padStart(2, "0")}
              </span>
            </div>
            <ul className="space-y-1">
              {snap.alerts.map((a, i) => (
                <li key={i} className="flex items-start gap-2 text-[13px] text-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--danger)" }} />
                  {a}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      )}

      <Reveal>
        <div className="mt-8 flex flex-wrap gap-3">
          <StatTile
            icon={ShieldCheck}
            label="Subscription 5h"
            value={snap.subscription.five_hour_pct === null ? "—" : `${fiveH}%`}
            sub={snap.subscription.five_hour_pct === null ? "not readable yet" : fiveH > 80 ? "approaching cap" : "healthy"}
            color={fiveH > 80 ? "var(--warn)" : "var(--positive)"}
          />
          <StatTile
            icon={TrendingUp}
            label="Subscription 7d"
            value={snap.subscription.seven_day_pct === null ? "—" : `${sevenD}%`}
            sub={snap.subscription.seven_day_pct === null ? "not readable yet" : sevenD > 80 ? "approaching cap" : "healthy"}
            color={sevenD > 80 ? "var(--warn)" : "var(--positive)"}
          />
          {apiSpend !== null && (
            <StatTile icon={DollarSign} label="API spend MTD" value={`$${apiSpend.toFixed(2)}`} sub={snap.api_spend.source} sensitive />
          )}
          <StatTile
            icon={bypassSites.length > 0 ? XCircle : CheckCircle2}
            label="Bypass call sites"
            value={String(bypassSites.length)}
            sub={bypassSites.length === 0 ? "all guarded" : "review and patch"}
            color={bypassSites.length > 0 ? "var(--danger)" : "var(--positive)"}
          />
        </div>
        {apiSpend === null && (
          <p className="mt-3 text-[11px] font-mono text-muted-foreground">
            API spend unavailable — set ANTHROPIC_ADMIN_API_KEY to track month-to-date spend.
          </p>
        )}
      </Reveal>

      <Section
        icon={LineChart}
        kicker={`CostTracker hourly ledger · ${hist.length} samples in window · ${data.total_entries} total`}
        title="Call Sites Over Time"
        count={hist.length}
        countLabel="samples"
      >
        <Reveal>
          <div className="glass rounded-xl p-4 sm:p-5">
            {hist.length >= 2 ? (
              <>
                <ChartLegend series={siteSeries} />
                <AreaLineChart
                  series={siteSeries}
                  height={210}
                  fmtY={(v) => String(Math.round(v))}
                  fmtX={fmtTs}
                  fmtXFull={fmtTs}
                />
              </>
            ) : (
              <p className="text-[12px] font-mono text-muted-foreground py-4">
                {hist.length} ledger sample in this window — the trend draws once the hourly cron has ≥2 samples.
              </p>
            )}
          </div>
        </Reveal>
      </Section>

      <Section
        icon={Gauge}
        kicker="Subscription pressure · 5-hour and 7-day windows"
        title="Subscription Utilization"
      >
        <Reveal>
          <div className="glass rounded-xl p-4 sm:p-5">
            {hasUtil && hist.length >= 2 ? (
              <>
                <ChartLegend series={utilSeries} />
                <AreaLineChart
                  series={utilSeries}
                  height={200}
                  fmtY={(v) => `${Math.round(v)}%`}
                  fmtX={fmtTs}
                  fmtXFull={fmtTs}
                  yTop={100}
                />
              </>
            ) : (
              <p className="text-[12px] font-mono text-muted-foreground py-4">
                No utilization samples yet — every ledger entry so far has null subscription percentages
                (CostTracker cannot read the usage caps on this account). The chart appears when real
                percentages land; the call-site scan above is unaffected.
              </p>
            )}
          </div>
        </Reveal>
      </Section>

      {data.sites.length > 0 && (
        <Section icon={Terminal} kicker="Static scan of the tree" title="Call Sites" count={data.sites.length}>
          <Reveal>
            <div className="glass rounded-xl overflow-hidden">
              <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground">Baseline</span>
                <span className="text-[11px] font-mono tabular-nums text-muted-foreground">
                  {data.baseline_updated ? new Date(data.baseline_updated).toLocaleString() : "no baseline locked"}
                </span>
              </div>
              {orderedSites.map((s, i) => {
                const Icon = SITE_ICON[s.classification];
                const color = SITE_COLOR[s.classification];
                return (
                  <div
                    key={`${s.file}:${s.line}:${i}`}
                    className="flex items-start gap-2.5 px-4 py-2.5"
                    style={{ borderTop: "1px solid var(--hairline)" }}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-mono tabular-nums truncate" style={{ color }} data-sensitive title={`${s.file}:${s.line}`}>
                        {s.file}:{s.line}
                      </div>
                      <div className="text-[11px] text-muted-foreground">{s.reason}</div>
                    </div>
                    <TokenPill text={s.classification} color={color} />
                  </div>
                );
              })}
            </div>
          </Reveal>
        </Section>
      )}

      <Reveal>
        <div className="mt-8 glass rounded-xl p-4">
          <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground mb-2">CostTracker CLI</div>
          <div className="space-y-1.5 text-[12px]">
            {[
              { cmd: "bun ~/.claude/LIFEOS/TOOLS/CostTracker.ts status", desc: "human-readable snapshot" },
              { cmd: "bun ~/.claude/LIFEOS/TOOLS/CostTracker.ts scan", desc: "re-run static scan" },
              { cmd: "bun ~/.claude/LIFEOS/TOOLS/CostTracker.ts baseline", desc: "lock a new known-good snapshot" },
            ].map((c) => (
              <div key={c.cmd} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <code className="font-mono" style={{ color: "var(--neon-2)" }}>{c.cmd}</code>
                <span className="text-muted-foreground">· {c.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </Reveal>
    </>
  );
}

/* ---------- machine tab (AgentsView runtime economics, proxied) ---------- */

function BarRow({ label, value, max, cost, color }: { label: string; value: number; max: number; cost: string; color: string }) {
  const pct = max > 0 ? Math.max(2, (value / max) * 100) : 0;
  return (
    <div
      className="flex items-center gap-3 py-1.5 px-1.5 -mx-1.5 rounded-md transition-colors"
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-1)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <span className="w-[180px] shrink-0 truncate text-[13px] text-foreground" data-sensitive title={label}>
        {label}
      </span>
      <span className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--surface-1)" }}>
        <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: color, boxShadow: `0 0 8px ${color}` }} />
      </span>
      <span className="w-[80px] shrink-0 text-right text-[13px] font-mono tabular-nums text-foreground" data-sensitive>{cost}</span>
    </div>
  );
}

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const AV_WEB = "http://127.0.0.1:8080"; // AgentsView deep-link base (loopback)

function RhythmHeatmap({ activity }: { activity: AVActivity }) {
  // 7 rows (day) × 24 cols (hour), summed across the whole window — there is
  // no single date behind a cell; the Activity Calendar below carries dates.
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  let max = 0;
  for (const c of activity.cells) {
    if (c.day_of_week >= 0 && c.day_of_week < 7 && c.hour >= 0 && c.hour < 24) {
      grid[c.day_of_week][c.hour] = c.messages;
      if (c.messages > max) max = c.messages;
    }
  }
  const cell = (v: number) => {
    if (v === 0) return "var(--surface-1)";
    const t = 0.2 + 0.8 * (v / Math.max(max, 1));
    return `color-mix(in oklab, var(--neon) ${Math.round(t * 100)}%, transparent)`;
  };
  const showTip = (e: React.MouseEvent, d: number, h: number, v: number) => {
    const box = boxRef.current?.getBoundingClientRect();
    const el = (e.target as HTMLElement).getBoundingClientRect();
    if (!box) return;
    setTip({
      x: el.left - box.left + el.width / 2,
      y: el.top - box.top,
      text: `${DOW[d]} · ${String(h).padStart(2, "0")}:00 — ${v.toLocaleString()} msgs`,
    });
  };
  return (
    <div ref={boxRef} className="glass rounded-xl p-4 overflow-x-auto relative" onMouseLeave={() => setTip(null)}>
      <div className="min-w-[560px]">
        <div className="flex gap-1 mb-1 pl-9">
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} className="flex-1 text-center text-[9px] font-mono text-muted-foreground tabular-nums">
              {h % 6 === 0 ? h : ""}
            </div>
          ))}
        </div>
        {grid.map((row, d) => (
          <div key={d} className="flex items-center gap-1 mb-1">
            <span className="w-8 shrink-0 text-[10px] font-mono text-muted-foreground">{DOW[d]}</span>
            {row.map((v, h) => (
              <span
                key={h}
                className="flex-1 aspect-square rounded-sm"
                style={{ background: cell(v), minWidth: 8 }}
                onMouseEnter={(e) => showTip(e, d, h, v)}
              />
            ))}
          </div>
        ))}
        <div className="flex items-center justify-end gap-1.5 mt-2 text-[10px] font-mono text-muted-foreground">
          <span>less</span>
          {[0.2, 0.45, 0.7, 1].map((t) => (
            <span
              key={t}
              className="w-3 h-3 rounded-sm"
              style={{ background: `color-mix(in oklab, var(--neon) ${Math.round(t * 100)}%, transparent)` }}
            />
          ))}
          <span>more</span>
        </div>
      </div>
      {tip && (
        <div
          className="absolute z-10 pointer-events-none rounded-md px-2.5 py-1.5 text-[11px] font-mono tabular-nums text-foreground whitespace-nowrap"
          style={{
            left: Math.min(Math.max(tip.x, 90), (boxRef.current?.clientWidth ?? 400) - 90),
            top: Math.max(tip.y - 34, 2),
            transform: "translateX(-50%)",
            background: "var(--surface-3)",
            border: "1px solid var(--hairline-strong)",
            backdropFilter: "blur(10px)",
          }}
        >
          {tip.text}
        </div>
      )}
    </div>
  );
}

function CalendarHeatmap({ entries }: { entries: AVHeatmap["entries"] }) {
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const weeks = useMemo(() => {
    if (!entries.length) return [] as Array<Array<AVHeatmap["entries"][number] | null>>;
    const lead = new Date(`${entries[0].date}T00:00:00`).getDay();
    const cells: Array<AVHeatmap["entries"][number] | null> = [...Array(lead).fill(null), ...entries];
    const out: Array<Array<AVHeatmap["entries"][number] | null>> = [];
    for (let i = 0; i < cells.length; i += 7) out.push(cells.slice(i, i + 7));
    return out;
  }, [entries]);

  if (!entries.length) {
    return <p className="text-[12px] font-mono text-muted-foreground py-4">No activity data in this window.</p>;
  }

  const LEVEL_MIX = [0, 30, 50, 72, 100];
  const cellBg = (e: AVHeatmap["entries"][number]) =>
    e.value === 0
      ? "var(--surface-1)"
      : `color-mix(in oklab, var(--neon) ${LEVEL_MIX[Math.min(Math.max(e.level, 1), 4)]}%, transparent)`;

  const monthLabels = weeks.map((wk, wi) => {
    const c = wk.find(Boolean);
    if (!c) return "";
    const m = new Date(`${c.date}T00:00:00`).getMonth();
    const prev = wi > 0 ? weeks[wi - 1].find(Boolean) : null;
    const pm = prev ? new Date(`${prev.date}T00:00:00`).getMonth() : -1;
    return m !== pm ? new Date(`${c.date}T00:00:00`).toLocaleDateString("en-GB", { month: "short" }) : "";
  });

  const showTip = (e: React.MouseEvent, entry: AVHeatmap["entries"][number]) => {
    const box = boxRef.current?.getBoundingClientRect();
    const el = (e.target as HTMLElement).getBoundingClientRect();
    if (!box) return;
    const d = new Date(`${entry.date}T00:00:00`);
    setTip({
      x: el.left - box.left + el.width / 2,
      y: el.top - box.top,
      text: `${d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })} — ${entry.value.toLocaleString()} msgs`,
    });
  };

  const CELL = 12;
  const GAP = 3;
  return (
    <div ref={boxRef} className="glass rounded-xl p-4 relative" onMouseLeave={() => setTip(null)}>
      <div className="overflow-x-auto">
        <div style={{ minWidth: weeks.length * (CELL + GAP) + 40 }}>
          <div className="flex" style={{ gap: GAP, paddingLeft: 34 }}>
            {monthLabels.map((m, i) => (
              <span
                key={i}
                className="text-[9px] font-mono text-muted-foreground"
                style={{ width: CELL, overflow: "visible", whiteSpace: "nowrap" }}
              >
                {m}
              </span>
            ))}
          </div>
          <div className="flex mt-1" style={{ gap: GAP }}>
            <div className="flex flex-col shrink-0" style={{ gap: GAP, width: 30 }}>
              {DOW.map((d, i) => (
                <span key={d} className="text-[9px] font-mono text-muted-foreground" style={{ height: CELL, lineHeight: `${CELL}px` }}>
                  {i % 2 === 1 ? d : ""}
                </span>
              ))}
            </div>
            {weeks.map((wk, wi) => (
              <div key={wi} className="flex flex-col" style={{ gap: GAP }}>
                {Array.from({ length: 7 }, (_, di) => {
                  const e = wk[di];
                  return e ? (
                    <span
                      key={di}
                      className="rounded-[3px]"
                      style={{ width: CELL, height: CELL, background: cellBg(e) }}
                      onMouseEnter={(ev) => showTip(ev, e)}
                    />
                  ) : (
                    <span key={di} style={{ width: CELL, height: CELL }} />
                  );
                })}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-end gap-1.5 mt-2 text-[10px] font-mono text-muted-foreground">
            <span>less</span>
            {[1, 2, 3, 4].map((lv) => (
              <span
                key={lv}
                className="w-3 h-3 rounded-[3px]"
                style={{ background: `color-mix(in oklab, var(--neon) ${LEVEL_MIX[lv]}%, transparent)` }}
              />
            ))}
            <span>more</span>
          </div>
        </div>
      </div>
      {tip && (
        <div
          className="absolute z-10 pointer-events-none rounded-md px-2.5 py-1.5 text-[11px] font-mono tabular-nums text-foreground whitespace-nowrap"
          style={{
            left: Math.min(Math.max(tip.x, 100), (boxRef.current?.clientWidth ?? 400) - 100),
            top: Math.max(tip.y - 34, 2),
            transform: "translateX(-50%)",
            background: "var(--surface-3)",
            border: "1px solid var(--hairline-strong)",
            backdropFilter: "blur(10px)",
          }}
        >
          {tip.text}
        </div>
      )}
    </div>
  );
}

function MachineTab({
  data,
  sessions,
  activity,
  heatmap,
  range,
}: {
  data: AVSummary | null;
  sessions: AVTopSession[] | null;
  activity: AVActivity | null;
  heatmap: AVHeatmap | null;
  range: Range;
}) {
  const burnSeries = useMemo<ChartSeries[]>(() => {
    const src = new Map((data?.daily ?? []).map((d) => [d.date, d.totalCost]));
    return [
      {
        label: "Daily burn",
        color: "var(--neon)",
        points: fillDaily(range.from, range.to, (day) => src.get(day), "zero"),
      },
    ];
  }, [data, range]);

  if (!data) {
    return (
      <Reveal>
        <div className="glass rounded-xl p-5 mt-8 flex items-start gap-3 max-w-2xl">
          <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" style={{ color: "var(--warn)" }} />
          <div>
            <p className="text-[14px] font-medium text-foreground">AgentsView is not reachable.</p>
            <p className="text-[13px] text-muted-foreground mt-1">
              This tab renders the machine&apos;s runtime economics from the local AgentsView daemon
              (127.0.0.1:8080). Check the <code className="font-mono text-[12px]">io.agentsview.serve</code> LaunchAgent,
              then reload.
            </p>
          </div>
        </div>
      </Reveal>
    );
  }

  const t = data.totals;
  const activeDays = data.daily.filter((d) => d.totalCost > 0).length || 1;
  const peak = data.daily.reduce((a, b) => (b.totalCost > a.totalCost ? b : a), { date: "", totalCost: 0 });
  const cacheHit = t.cacheReadTokens + t.inputTokens > 0 ? (t.cacheReadTokens / (t.cacheReadTokens + t.inputTokens)) * 100 : 0;
  const projects = [...data.projectTotals].sort((a, b) => b.cost - a.cost);
  const topProjects = projects.slice(0, 12);
  const restProjects = projects.slice(12);
  const restCost = restProjects.reduce((n, p) => n + p.cost, 0);
  const maxProject = topProjects[0]?.cost ?? 0;
  const models = [...data.modelTotals].sort((a, b) => b.cost - a.cost);
  const maxModel = models[0]?.cost ?? 0;
  const span = `${fmtSpanDate(range.from)} → ${fmtSpanDate(range.to)}`;
  const cover = coverageNote(burnSeries[0].points);

  return (
    <>
      <Reveal>
        <div className="mt-8 flex flex-wrap gap-3">
          <StatTile icon={DollarSign} label="Total Cost" value={formatCost(t.totalCost)} sub={`${formatCost(t.cacheSavings)} saved by cache`} color="var(--neon)" sensitive />
          <StatTile icon={TrendingUp} label="Daily Burn" value={formatCost(t.totalCost / activeDays)} sub={peak.date ? `peak ${formatCost(peak.totalCost)} · ${peak.date.slice(5)}` : undefined} sensitive />
          <StatTile icon={Zap} label="Cache Hit" value={`${cacheHit.toFixed(1)}%`} color="var(--positive)" />
          <StatTile icon={Layers} label="In / Out" value={`${formatTokens(t.inputTokens)} / ${formatTokens(t.outputTokens)}`} sub={`${formatTokens(t.cacheReadTokens)} cached reads`} />
          <StatTile icon={Activity} label="Sessions" value={String(data.sessionCounts.total)} sub={Object.entries(data.sessionCounts.byAgent).map(([a, n]) => `${a} ${n}`).join(" · ")} />
        </div>
      </Reveal>

      <Section
        icon={LineChart}
        kicker={`AgentsView · API-equivalent dollars · ${span}`}
        title="Daily Burn"
        count={burnSeries[0].points.length}
        countLabel="days"
      >
        <Reveal>
          <div className="glass rounded-xl p-4 sm:p-5">
            <AreaLineChart series={burnSeries} height={230} fmtY={fmtMoneyAxis} sensitive />
            {cover && <p className="mt-1 text-[11px] font-mono text-muted-foreground">{cover}</p>}
          </div>
        </Reveal>
      </Section>

      {heatmap && heatmap.entries.some((e) => e.value > 0) && (
        <Section
          icon={CalendarDays}
          kicker={`Messages per day · AgentsView · ${span}`}
          title="Activity Calendar"
          count={heatmap.entries.filter((e) => e.value > 0).length}
          countLabel="active days"
        >
          <Reveal>
            <CalendarHeatmap entries={heatmap.entries} />
          </Reveal>
        </Section>
      )}

      {activity && activity.cells.some((c) => c.messages > 0) && (
        <Section
          icon={Activity}
          kicker={`Message volume by weekday × hour · summed across ${span} — no single date behind a cell`}
          title="Activity Rhythm"
        >
          <Reveal>
            <RhythmHeatmap activity={activity} />
          </Reveal>
        </Section>
      )}

      <Section
        icon={ListOrdered}
        kicker={`Where the spend concentrates · AgentsView · ${span}`}
        title="Cost by Project"
        count={projects.length}
      >
        <Reveal>
          <div className="glass rounded-xl p-4">
            {topProjects.map((p) => (
              <BarRow key={p.project} label={p.project} value={p.cost} max={maxProject} cost={formatCost(p.cost)} color="var(--neon-2)" />
            ))}
            {restProjects.length > 0 && (
              <div className="pt-2 mt-1 text-[11px] font-mono text-muted-foreground" style={{ borderTop: "1px solid var(--hairline)" }}>
                +{restProjects.length} more projects · {formatCost(restCost)}
              </div>
            )}
          </div>
        </Reveal>
      </Section>

      <Section
        icon={Cpu}
        kicker={`Spend per model across every session · AgentsView · ${span}`}
        title="Cost by Model"
        count={models.length}
      >
        <Reveal>
          <div className="glass rounded-xl p-4">
            {models.map((m) => (
              <BarRow key={m.model} label={prettyModel(m.model)} value={m.cost} max={maxModel} cost={formatCost(m.cost)} color={modelColor(m.model)} />
            ))}
          </div>
        </Reveal>
      </Section>

      {sessions && sessions.length > 0 && (
        <Section icon={ListOrdered} kicker="Heaviest conversations — click to open in AgentsView" title="Top Sessions by Cost" count={sessions.length}>
          <div className="glass rounded-xl overflow-hidden">
            {sessions.map((s, i) => (
              <a
                key={s.sessionId}
                href={`${AV_WEB}/sessions/${encodeURIComponent(s.sessionId)}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 px-4 py-2.5 transition-colors group"
                style={{ textDecoration: "none", borderTop: i > 0 ? "1px solid var(--hairline)" : undefined }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-1)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                title={`${s.sessionId} · open in AgentsView`}
              >
                <span className="w-5 shrink-0 text-[11px] font-mono tabular-nums text-muted-foreground">{i + 1}</span>
                <span className="flex-1 min-w-0 truncate text-[13px] text-foreground group-hover:text-neon transition-colors" data-sensitive title={s.displayName}>
                  {s.displayName}
                </span>
                <ExternalLink className="w-3.5 h-3.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                <TokenPill text={s.project || s.agent} color="var(--neon-3)" />
                <span className="w-[64px] shrink-0 text-right text-[12px] font-mono tabular-nums text-muted-foreground">
                  {formatTokens(s.totalTokens)}
                </span>
                <span className="w-[72px] shrink-0 text-right text-[13px] font-mono tabular-nums text-foreground" data-sensitive>
                  {formatCost(s.cost)}
                </span>
              </a>
            ))}
          </div>
        </Section>
      )}

      <p className="mt-6 text-[11px] font-mono text-muted-foreground">
        source: AgentsView (127.0.0.1:8080) · API-equivalent cost, computed from its pricing table · billed to subscription, not these dollars
      </p>
    </>
  );
}

/* ---------- page ---------- */

export default function PerformancePage() {
  const [tab, setTab] = useState<Tab>("cost");
  const [horizon, setHorizon] = useState<Horizon>("30d");
  const [costData, setCostData] = useState<CostData | null>(null);
  const [failureData, setFailureData] = useState<FailureData | null>(null);
  const [anthropicData, setAnthropicData] = useState<AnthropicData | null>(null);
  const [avData, setAvData] = useState<AVSummary | null>(null);
  const [avSessions, setAvSessions] = useState<AVTopSession[] | null>(null);
  const [avActivity, setAvActivity] = useState<AVActivity | null>(null);
  const [avHeatmap, setAvHeatmap] = useState<AVHeatmap | null>(null);

  const range = useMemo(() => horizonRange(horizon), [horizon]);
  const windowQs = `from=${range.from}&to=${range.to}`;

  const fetchCost = useCallback(async () => {
    try {
      const res = await fetch(`/api/performance/cost?${windowQs}`);
      if (res.ok) setCostData(await res.json());
    } catch { /* silent */ }
  }, [windowQs]);

  const fetchFailures = useCallback(async () => {
    try {
      const res = await fetch(`/api/performance/failures?${windowQs}`);
      if (res.ok) setFailureData(await res.json());
    } catch { /* silent */ }
  }, [windowQs]);

  const fetchAnthropic = useCallback(async () => {
    try {
      const res = await fetch(`/api/performance/anthropic-cost?days=${range.days}`);
      if (res.ok) setAnthropicData(await res.json());
    } catch { /* silent */ }
  }, [range.days]);

  const fetchAgentsView = useCallback(async () => {
    try {
      const [sumRes, topRes, actRes, heatRes] = await Promise.all([
        fetch(`/api/agentsview/usage-summary?from=${range.from}&to=${range.to}`),
        fetch(`/api/agentsview/top-sessions?from=${range.from}&to=${range.to}&limit=10`),
        fetch(`/api/agentsview/activity?from=${range.from}&to=${range.to}`),
        fetch(`/api/agentsview/heatmap?from=${range.from}&to=${range.to}`),
      ]);
      setAvData(sumRes.ok ? await sumRes.json() : null);
      setAvSessions(topRes.ok ? await topRes.json() : null);
      setAvActivity(actRes.ok ? await actRes.json() : null);
      setAvHeatmap(heatRes.ok ? await heatRes.json() : null);
    } catch {
      setAvData(null);
      setAvSessions(null);
      setAvActivity(null);
      setAvHeatmap(null);
    }
  }, [range.from, range.to]);

  useEffect(() => {
    fetchCost();
    fetchFailures();
    fetchAnthropic();
    fetchAgentsView();
    const interval = setInterval(() => {
      fetchCost();
      fetchFailures();
      fetchAnthropic();
      fetchAgentsView();
    }, 30_000);
    return () => clearInterval(interval);
  }, [fetchCost, fetchFailures, fetchAnthropic, fetchAgentsView]);

  const TabButton = ({ id, label, icon: Icon }: { id: Tab; label: string; icon: typeof DollarSign }) => {
    const on = tab === id;
    return (
      <button
        onClick={() => setTab(id)}
        aria-label={`Show ${label} tab`}
        className="relative inline-flex items-center gap-1.5 px-1 py-1.5 bg-transparent border-none cursor-pointer text-[12px] font-mono uppercase tracking-[0.12em] font-semibold transition-colors"
        style={{ color: on ? "var(--neon)" : MUTED }}
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
      <Hero cost={costData} failures={failureData} rangeLabel={range.label} />

      <Reveal>
        <div className="mt-10 flex items-center gap-5 flex-wrap pb-1.5" style={{ borderBottom: "1px solid var(--hairline)" }}>
          <TabButton id="cost" label="Cost" icon={DollarSign} />
          <TabButton id="machine" label="Machine" icon={Gauge} />
          <TabButton id="failures" label="Failures" icon={AlertTriangle} />
          <TabButton id="anthropic" label="Anthropic" icon={ShieldCheck} />
          <span className="flex-1" />
          <RangeSelector value={horizon} onChange={setHorizon} range={range} />
        </div>
      </Reveal>

      {tab === "cost" && <CostTab data={costData} avDaily={avData?.daily ?? null} range={range} />}
      {tab === "machine" && (
        <MachineTab data={avData} sessions={avSessions} activity={avActivity} heatmap={avHeatmap} range={range} />
      )}
      {tab === "failures" && <FailuresTab data={failureData} range={range} />}
      {tab === "anthropic" && <AnthropicTab data={anthropicData} range={range} />}
    </div>
  );
}
