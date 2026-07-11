"use client";
import { useEffect, useMemo, useState } from "react";
import {
  DollarSign,
  Landmark,
  CreditCard,
  PiggyBank,
  Receipt,
  Target,
  Lock,
  TrendingUp,
  TrendingDown,
  Wallet,
  Mail,
  Globe,
  BookOpen,
  Mic,
  Briefcase,
  Home,
  Users,
  Cpu,
  Server,
  Scissors,
  Trophy,
  Sparkles,
  PieChart,
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowLeftRight,
  type LucideIcon,
} from "lucide-react";
import {
  Sankey,
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { FreshnessIndicator, type FreshnessData } from "@/components/FreshnessIndicator";
import EmptyStateGuide from "@/components/EmptyStateGuide";
import { Reveal } from "@/components/kit/Reveal";
import { Section as SectionFrame } from "@/components/kit/Section";

// ─── Types matching /api/life/finances v2 envelope ───

interface Section {
  heading: string;
  body: string;
}
interface Stream {
  label: string;
  annual: number;
}

interface ResolvedLine {
  id: string;
  name: string;
  scope: string;
  monthly_usd: number;
  annual_usd: number;
  source: "collector" | "manual" | "unconfigured";
  cadence: string;
  tags?: string[];
  notes?: string;
  collector?: string;
}

interface TrendPoint {
  month: string;
  income: number;
  outbound: number;
  net: number;
}

interface InsightLine {
  display: string;
  monthly_usd: number;
  annual_usd: number;
  observed_usd: number;
  cadence: string;
  confidence: "high" | "medium" | "low";
  scope: string;
  tags: string[];
  active_months: number;
  charge_count: number;
  last_seen: string;
  reason?: string;
}

interface SpendInsights {
  top_bills: InsightLine[];
  top_ai_services: InsightLine[];
  top_infrastructure_services: InsightLine[];
  cut_candidates: InsightLine[];
  by_category: { category: string; annual_usd: number; merchants: number }[];
  total_annualized: number;
  statement_spend: {
    generated_at: string | null;
    record_count: number;
    jsonl_path: string;
    tool: string;
  };
}

interface FinancesDataV2 {
  version?: number;
  income?: {
    streams: Stream[];
    annual: number;
    monthly: number;
    mrr_monthly: number;
    mrr_annual: number;
  };
  outbound?: {
    vendors: ResolvedLine[];
    obligations: ResolvedLine[];
    other: ResolvedLine[];
    annual: number;
    monthly: number;
    vendors_annual: number;
    obligations_annual: number;
    other_annual: number;
  };
  overall?: {
    net_pre_tax_annual: number;
    net_pre_tax_monthly: number;
    net_post_tax_annual: number;
    net_post_tax_monthly: number;
    effective_tax_rate: number;
    trend: TrendPoint[];
  };
  collector_status?: {
    configured_vendors: number;
    active_collectors: string[];
    jsonl_path: string;
  };
  insights?: SpendInsights;
  // v1 legacy fields (still populated)
  accounts?: Section[];
  goals?: Section[];
  expenses?: Section[];
  investments?: Section[];
  taxes?: Section[];
  overview?: Section[];
  incomeStreams?: Stream[];
  expenseCategories?: Stream[];
  annualIncome?: number;
  annualExpenses?: number;
  monthlyIncome?: number;
  monthlyExpenses?: number;
  net?: number;
  freshness?: FreshnessData;
  freshness_per_card?: {
    income?: FreshnessData;
    outbound?: FreshnessData;
    overall?: FreshnessData;
    accounts?: FreshnessData;
    investments?: FreshnessData;
    taxes?: FreshnessData;
  };
}

// ─── Formatting ───

const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY ?? "$";

function fmtHero(dollars: number | null | undefined): string {
  const n = Number(dollars) || 0;
  if (n >= 1_000_000) return `${CURRENCY}${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${CURRENCY}${Math.round(n / 1000)}K`;
  if (n >= 1_000) {
    const k = n / 1000;
    return k % 1 === 0 ? `${CURRENCY}${k.toFixed(0)}K` : `${CURRENCY}${k.toFixed(1)}K`;
  }
  return `${CURRENCY}${Math.round(n).toLocaleString()}`;
}

function fmtExact(dollars: number | null | undefined): string {
  const n = Number(dollars) || 0;
  return `${CURRENCY}${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function fmtPct(rate: number | null | undefined): string {
  const n = Number(rate) || 0;
  return `${(n * 100).toFixed(1)}%`;
}

/* ---------- theme-token color maps (re-theme with [data-theme]) ----------
   Semantic mapping of the old hardcoded palette:
   income → dim-money · outbound → dim-creative (coral) · net → dim-freedom
   vendors/bills → warn · positive → positive · relationships/AI → dim-relationships */

const MUTED = "hsl(var(--muted-foreground))";

const TONE_COLOR: Record<"income" | "outbound" | "net" | "neutral", string> = {
  income: "var(--dim-money)",
  outbound: "var(--dim-creative)",
  net: "var(--dim-freedom)",
  neutral: "hsl(var(--foreground))",
};

const SOURCE_COLOR: Record<string, string> = {
  collector: "var(--dim-rhythms)",
  manual: MUTED,
  unconfigured: "var(--warn)",
};

const CONFIDENCE_COLOR: Record<InsightLine["confidence"], string> = {
  high: "var(--positive)",
  medium: "var(--dim-money)",
  low: MUTED,
};

const SANKEY_INCOME_PALETTE = ["var(--positive)", "var(--dim-money)"];
const SANKEY_OUTFLOW_PALETTE = ["var(--warn)", "var(--dim-creative)"];

const SANKEY_COLORS: Record<string, string> = {
  "Gross Income": "var(--dim-money)",
  "Net": "var(--dim-freedom)",
  "Expenses": "var(--dim-creative)",
  "Vendors": "var(--warn)",
  "Obligations": "var(--dim-creative)",
  "Other": "var(--warn)",
};

const INCOME_ICON: Record<string, LucideIcon> = {
  newsletter: Mail,
  podcast: Mic,
  sponsor: Mail,
  membership: Users,
  course: BookOpen,
  speaking: Mic,
  consulting: Briefcase,
  product: Globe,
};

const OUTBOUND_ICON: Record<string, LucideIcon> = {
  aws: Server,
  cloudflare: Server,
  anthropic: Cpu,
  openai: Cpu,
  elevenlabs: Cpu,
  mortgage: Home,
  property_tax: Home,
  home_insurance: Home,
  tesla_lease: TrendingDown,
  auto_insurance: TrendingDown,
  mobile_phone: Receipt,
  home_internet: Receipt,
};

function pickIcon(
  key: string,
  table: Record<string, LucideIcon>,
  fallback: LucideIcon,
): LucideIcon {
  const lower = key.toLowerCase();
  for (const k of Object.keys(table)) {
    if (lower.includes(k) || k.includes(lower)) return table[k];
  }
  return fallback;
}

function parseSubheadings(body: string): string[] {
  return body
    .split("\n")
    .filter((l) => l.startsWith("### "))
    .map((l) => l.replace(/^###\s*/, ""));
}

/* Recharts SVG primitives receive colors as presentation attributes, which do
   not resolve var() — so chart strokes read the live token values off <html>
   and re-read when [data-theme] flips. Presentation-only plumbing. */
function useChartTokens(): Record<string, string> | null {
  const [tokens, setTokens] = useState<Record<string, string> | null>(null);
  useEffect(() => {
    const read = () => {
      const cs = getComputedStyle(document.documentElement);
      const v = (name: string) => cs.getPropertyValue(name).trim();
      setTokens({
        money: v("--dim-money"),
        creative: v("--dim-creative"),
        freedom: v("--dim-freedom"),
        hairline: v("--hairline"),
        dim: v("--text-dim"),
      });
    };
    read();
    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
  }, []);
  return tokens;
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

function KpiChip({
  label,
  value,
  tone,
  sensitive = true,
}: {
  label: string;
  value: string;
  tone: "income" | "outbound" | "net" | "neutral";
  sensitive?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 min-w-[120px]">
      <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
      <span
        className="text-lg font-semibold font-mono tabular-nums"
        style={{ color: TONE_COLOR[tone] }}
        {...(sensitive ? { "data-sensitive": true } : {})}
      >
        {value}
      </span>
    </div>
  );
}

/* Small mono sub-header used inside the Spending Analysis section. */
function SubHeader({
  icon: Icon,
  title,
  accent,
  description,
  meta,
}: {
  icon: LucideIcon;
  title: string;
  accent: string;
  description?: string;
  meta?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
      <div className="min-w-0">
        <h3 className="flex items-center gap-2 text-[12px] font-mono font-semibold uppercase tracking-[0.18em] text-foreground">
          <Icon className="w-4 h-4 shrink-0" style={{ color: accent }} />
          {title}
        </h3>
        {description && <p className="text-[12px] text-muted-foreground mt-1 max-w-[72ch]">{description}</p>}
      </div>
      {meta}
    </div>
  );
}

function LineRow({ line, tone }: { line: ResolvedLine; tone: "income" | "outbound" }) {
  const Icon = pickIcon(
    line.id,
    tone === "income" ? INCOME_ICON : OUTBOUND_ICON,
    tone === "income" ? Wallet : Receipt,
  );
  const toneColor = TONE_COLOR[tone];
  return (
    <div className="glass rounded-xl p-4 h-full">
      <div className="flex items-start gap-3">
        <span
          className="grid place-items-center w-8 h-8 rounded-lg shrink-0"
          style={{ background: "var(--surface-1)", border: "1px solid var(--hairline)", color: toneColor }}
        >
          <Icon className="w-4 h-4" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[14px] font-medium text-foreground truncate" data-sensitive>
              {line.name}
            </span>
            <TokenPill text={line.scope} color="var(--dim-money)" title="Scope" />
            <TokenPill text={line.source} color={SOURCE_COLOR[line.source] ?? MUTED} title="Data source" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-lg font-semibold font-mono tabular-nums" style={{ color: toneColor }} data-sensitive>
              {fmtHero(line.monthly_usd)}
            </span>
            <span className="text-[11px] font-mono text-muted-foreground">/mo</span>
            <span className="ml-auto text-[11px] font-mono tabular-nums text-muted-foreground" data-sensitive>
              {fmtHero(line.annual_usd)}/yr
            </span>
          </div>
          {line.notes && (
            <p className="mt-1.5 text-[12px] leading-relaxed line-clamp-2 text-muted-foreground" data-sensitive>
              {line.notes}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function StreamCard({ stream }: { stream: Stream }) {
  const Icon = pickIcon(stream.label, INCOME_ICON, Wallet);
  return (
    <div className="glass rounded-xl p-4 h-full">
      <div className="flex items-start gap-3">
        <span
          className="grid place-items-center w-8 h-8 rounded-lg shrink-0"
          style={{ background: "var(--surface-1)", border: "1px solid var(--hairline)", color: "var(--dim-money)" }}
        >
          <Icon className="w-4 h-4" />
        </span>
        <div className="flex-1 min-w-0">
          <span className="text-[14px] font-medium text-foreground truncate block" data-sensitive>
            {stream.label}
          </span>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span
              className="text-lg font-semibold font-mono tabular-nums"
              style={{ color: "var(--dim-money)" }}
              data-sensitive
            >
              {fmtHero(stream.annual)}
            </span>
            <span className="text-[11px] font-mono text-muted-foreground">/yr</span>
            <span className="ml-auto text-[11px] font-mono tabular-nums text-muted-foreground" data-sensitive>
              {fmtHero(stream.annual / 12)}/mo
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- hero (page-level headline zone) ---------- */

function PageHero({ data, isFreshInstall }: { data: FinancesDataV2; isFreshInstall: boolean }) {
  const incomeAnnual = data.income?.annual ?? data.annualIncome ?? 0;
  const incomeMonthly = data.income?.monthly ?? data.monthlyIncome ?? 0;
  const outboundAnnual = data.outbound?.annual ?? data.annualExpenses ?? 0;
  const outboundMonthly = data.outbound?.monthly ?? data.monthlyExpenses ?? 0;
  const netAnnual = data.overall?.net_pre_tax_annual;
  const showNet = !isFreshInstall && netAnnual != null;
  const netColor = (netAnnual ?? 0) >= 0 ? "var(--dim-freedom)" : "var(--dim-creative)";

  const streamCount = (data.income?.streams ?? data.incomeStreams ?? []).length;
  const linesTracked = data.outbound
    ? data.outbound.vendors.length + data.outbound.obligations.length + data.outbound.other.length
    : 0;
  const stats = [
    { label: "Streams", value: streamCount, icon: Wallet },
    { label: "Lines Tracked", value: linesTracked, icon: Receipt },
  ].filter((s) => s.value > 0);

  return (
    <section className="pt-8 sm:pt-10">
      <div className="flex items-center gap-2.5 mb-4 text-[11px] font-mono uppercase tracking-[0.28em] text-muted-foreground">
        <span
          className="w-1.5 h-1.5 rounded-full anim-breathe"
          style={{ background: "var(--positive)", boxShadow: "0 0 8px var(--positive)" }}
        />
        LifeOS · Finances
      </div>

      {showNet ? (
        <h1 className="text-3xl sm:text-4xl font-bold leading-[1.12] text-foreground">
          <span className="font-mono tabular-nums" style={{ color: netColor }} data-sensitive>
            {fmtHero(netAnnual)}
          </span>{" "}
          <span className="text-xl sm:text-2xl font-normal text-muted-foreground">net · pre-tax annual</span>
        </h1>
      ) : (
        <h1 className="text-3xl sm:text-4xl font-bold leading-[1.12] text-foreground">Finances</h1>
      )}

      {(incomeAnnual > 0 || outboundAnnual > 0) && (
        <div className="mt-4 flex flex-col gap-1">
          {incomeAnnual > 0 && (
            <p className="text-[13px] font-mono text-muted-foreground" data-sensitive>
              <span className="uppercase tracking-[0.16em] text-[10px] mr-2" style={{ color: "var(--dim-money)" }}>
                income
              </span>
              {fmtHero(incomeAnnual)}/yr{incomeMonthly > 0 ? ` · ${fmtHero(incomeMonthly)}/mo` : ""}
            </p>
          )}
          {outboundAnnual > 0 && (
            <p className="text-[13px] font-mono text-muted-foreground" data-sensitive>
              <span className="uppercase tracking-[0.16em] text-[10px] mr-2" style={{ color: "var(--dim-creative)" }}>
                expenses
              </span>
              {fmtHero(outboundAnnual)}/yr{outboundMonthly > 0 ? ` · ${fmtHero(outboundMonthly)}/mo` : ""}
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
              <div className="text-3xl font-bold font-mono text-foreground tabular-nums">
                {String(s.value).padStart(2, "0")}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ---------- per-tab headline panels ---------- */

function IncomeHero({
  data,
  freshness,
}: {
  data: NonNullable<FinancesDataV2["income"]>;
  freshness?: FreshnessData;
}) {
  const hasChips = data.mrr_monthly > 0 || data.mrr_annual > 0 || data.streams.length > 0 || data.monthly > 0;
  return (
    <div className="glass rounded-2xl p-5 sm:p-6 relative">
      <div className="absolute top-5 right-5 md:top-6 md:right-6 z-10">
        <FreshnessIndicator freshness={freshness} />
      </div>
      <span className="text-[11px] font-mono uppercase tracking-[0.28em] text-muted-foreground">
        Total Annual Income
      </span>
      <div className="flex items-baseline gap-3 mt-2 flex-wrap">
        <span
          className="text-4xl sm:text-5xl font-bold font-mono tabular-nums"
          style={{ color: "var(--dim-money)", letterSpacing: "-0.02em" }}
          data-sensitive
        >
          {fmtHero(data.annual)}
        </span>
        <span className="text-[13px] font-mono text-muted-foreground" data-sensitive>
          {fmtHero(data.monthly)}/mo
        </span>
      </div>
      <span className="text-[12px] font-mono mt-2 block text-muted-foreground">
        <Lock className="inline w-3 h-3 mr-1" /> Private. Toggle Observer mode to blur.
      </span>
      {hasChips && (
        <div className="flex flex-wrap gap-x-10 gap-y-4 mt-6 pt-4" style={{ borderTop: "1px solid var(--hairline)" }}>
          {data.mrr_monthly > 0 && <KpiChip label="Monthly Recurring" value={fmtHero(data.mrr_monthly)} tone="income" />}
          {data.mrr_annual > 0 && <KpiChip label="MRR Annualized" value={fmtHero(data.mrr_annual)} tone="income" />}
          {data.streams.length > 0 && (
            <KpiChip label="Streams" value={`${data.streams.length}`} tone="neutral" sensitive={false} />
          )}
          {data.monthly > 0 && <KpiChip label="Monthly Income" value={fmtHero(data.monthly)} tone="income" />}
        </div>
      )}
    </div>
  );
}

function OutboundHero({
  data,
  freshness,
}: {
  data: NonNullable<FinancesDataV2["outbound"]>;
  freshness?: FreshnessData;
}) {
  const linesTracked = data.vendors.length + data.obligations.length + data.other.length;
  const hasChips =
    data.vendors_annual > 0 || data.obligations_annual > 0 || data.other_annual > 0 || linesTracked > 0;
  return (
    <div className="glass rounded-2xl p-5 sm:p-6 relative">
      <div className="absolute top-5 right-5 md:top-6 md:right-6 z-10">
        <FreshnessIndicator freshness={freshness} />
      </div>
      <span className="text-[11px] font-mono uppercase tracking-[0.28em] text-muted-foreground">
        Total Annual Expenses
      </span>
      <div className="flex items-baseline gap-3 mt-2 flex-wrap">
        <span
          className="text-4xl sm:text-5xl font-bold font-mono tabular-nums"
          style={{ color: "var(--dim-creative)", letterSpacing: "-0.02em" }}
          data-sensitive
        >
          {fmtHero(data.annual)}
        </span>
        <span className="text-[13px] font-mono text-muted-foreground" data-sensitive>
          {fmtHero(data.monthly)}/mo
        </span>
      </div>
      <span className="text-[12px] font-mono mt-2 block text-muted-foreground">
        <Lock className="inline w-3 h-3 mr-1" /> Sum of vendors, personal obligations, and other.
      </span>
      {hasChips && (
        <div className="flex flex-wrap gap-x-10 gap-y-4 mt-6 pt-4" style={{ borderTop: "1px solid var(--hairline)" }}>
          {data.vendors_annual > 0 && <KpiChip label="Vendors" value={fmtHero(data.vendors_annual)} tone="outbound" />}
          {data.obligations_annual > 0 && (
            <KpiChip label="Obligations" value={fmtHero(data.obligations_annual)} tone="outbound" />
          )}
          {data.other_annual > 0 && <KpiChip label="Other" value={fmtHero(data.other_annual)} tone="outbound" />}
          {linesTracked > 0 && (
            <KpiChip label="Lines Tracked" value={`${linesTracked}`} tone="neutral" sensitive={false} />
          )}
        </div>
      )}
    </div>
  );
}

function OverallHero({
  data,
  periodView,
  freshness,
}: {
  data: NonNullable<FinancesDataV2["overall"]>;
  periodView: "monthly" | "annual";
  freshness?: FreshnessData;
}) {
  const pre = periodView === "monthly" ? data.net_pre_tax_monthly : data.net_pre_tax_annual;
  const post = periodView === "monthly" ? data.net_post_tax_monthly : data.net_post_tax_annual;
  const preColor = pre >= 0 ? "var(--dim-freedom)" : "var(--dim-creative)";
  return (
    <div className="glass rounded-2xl p-5 sm:p-6 relative">
      <div className="absolute top-5 right-5 md:top-6 md:right-6 z-10">
        <FreshnessIndicator freshness={freshness} />
      </div>
      <span className="text-[11px] font-mono uppercase tracking-[0.28em] text-muted-foreground">
        Net ({periodView === "monthly" ? "Monthly" : "Annual"})
      </span>
      <div className="flex items-baseline gap-3 mt-2 flex-wrap">
        <span
          className="text-4xl sm:text-5xl font-bold font-mono tabular-nums"
          style={{ color: preColor, letterSpacing: "-0.02em" }}
          data-sensitive
        >
          {fmtHero(pre)}
        </span>
        <span className="text-[13px] font-mono text-muted-foreground">pre-tax</span>
      </div>
      <div className="flex flex-wrap gap-x-10 gap-y-4 mt-6 pt-4" style={{ borderTop: "1px solid var(--hairline)" }}>
        <KpiChip label="Post-Tax Net" value={fmtHero(post)} tone={post >= 0 ? "net" : "outbound"} />
        <KpiChip
          label="Effective Tax Rate"
          value={fmtPct(data.effective_tax_rate)}
          tone="neutral"
          sensitive={false}
        />
        <KpiChip
          label={periodView === "monthly" ? "Annual Pre-Tax" : "Monthly Pre-Tax"}
          value={fmtHero(periodView === "monthly" ? data.net_pre_tax_annual : data.net_pre_tax_monthly)}
          tone="net"
        />
        <KpiChip
          label={periodView === "monthly" ? "Annual Post-Tax" : "Monthly Post-Tax"}
          value={fmtHero(periodView === "monthly" ? data.net_post_tax_annual : data.net_post_tax_monthly)}
          tone="net"
        />
      </div>
    </div>
  );
}

/* ---------- overall trend chart ----------
   Rendered only when the trend series carries real variation — a flat
   repeated baseline is a projection, not history, and is hidden under the
   no-placeholder rule. */

function trendHasSignal(trend: TrendPoint[] | undefined): boolean {
  if (!trend || trend.length < 2) return false;
  const first = trend[0];
  return trend.some(
    (p) => p.income !== first.income || p.outbound !== first.outbound || p.net !== first.net,
  );
}

function TrendChart({ trend }: { trend: TrendPoint[] }) {
  const tokens = useChartTokens();
  if (!tokens) return null;
  return (
    <div className="glass rounded-xl p-4 sm:p-5">
      <div className="w-full h-64 font-mono" data-sensitive>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trend}>
            <CartesianGrid strokeDasharray="3 3" stroke={tokens.hairline} />
            <XAxis dataKey="month" stroke={tokens.dim} fontSize={11} />
            <YAxis
              stroke={tokens.dim}
              fontSize={11}
              tickFormatter={(v) => `${CURRENCY}${Math.round(v / 1000)}K`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid var(--hairline-strong)",
                borderRadius: 10,
                color: "hsl(var(--popover-foreground))",
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: "var(--text-dim)" }} />
            <Line type="monotone" dataKey="income" stroke={tokens.money} strokeWidth={2} dot={false} name="Income" />
            <Line type="monotone" dataKey="outbound" stroke={tokens.creative} strokeWidth={2} dot={false} name="Expenses" />
            <Line type="monotone" dataKey="net" stroke={tokens.freedom} strokeWidth={2} dot={false} name="Net" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ---------- sankey ----------
   Custom node/link renderers set colors via style={} — inline style resolves
   var() where SVG presentation attributes cannot. */

interface SankeyNodePayload {
  name?: string;
  category?: string;
  colorIndex?: number;
  value?: number;
}

interface SankeyNodeProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: SankeyNodePayload;
}

function SankeyNode(props: SankeyNodeProps) {
  const { x = 0, y = 0, width = 0, height = 0, payload } = props;
  const name = payload?.name ?? "";
  const colorIndex = payload?.colorIndex ?? 0;
  const color =
    SANKEY_COLORS[name] ||
    (payload?.category === "income"
      ? SANKEY_INCOME_PALETTE[colorIndex % SANKEY_INCOME_PALETTE.length]
      : payload?.category === "outbound"
        ? SANKEY_OUTFLOW_PALETTE[colorIndex % SANKEY_OUTFLOW_PALETTE.length]
        : payload?.category === "net"
          ? "var(--dim-freedom)"
          : "var(--text-dim)");
  const isLeft = x < 300;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx={3} ry={3} style={{ fill: color, fillOpacity: 0.9 }} />
      <text
        x={isLeft ? x - 8 : x + width + 8}
        y={y + height / 2}
        textAnchor={isLeft ? "end" : "start"}
        dominantBaseline="central"
        fontSize={12}
        fontWeight={500}
        style={{ fill: "hsl(var(--foreground))" }}
        data-sensitive
      >
        {name}
      </text>
      <text
        className="font-mono tabular-nums"
        x={isLeft ? x - 8 : x + width + 8}
        y={y + height / 2 + 16}
        textAnchor={isLeft ? "end" : "start"}
        dominantBaseline="central"
        fontSize={11}
        style={{ fill: "var(--text-dim)" }}
        data-sensitive
      >
        {payload?.value != null ? `${fmtHero(payload.value / 12)}/mo` : ""}
      </text>
    </g>
  );
}

interface SankeyLinkProps {
  sourceX?: number;
  sourceY?: number;
  sourceControlX?: number;
  targetX?: number;
  targetY?: number;
  targetControlX?: number;
  linkWidth?: number;
  payload?: {
    source?: SankeyNodePayload;
    target?: SankeyNodePayload;
  };
}

function SankeyLink(props: SankeyLinkProps) {
  const {
    sourceX = 0,
    sourceY = 0,
    sourceControlX = 0,
    targetX = 0,
    targetY = 0,
    targetControlX = 0,
    linkWidth = 0,
    payload,
  } = props;
  const sourceName = payload?.source?.name ?? "";
  const targetName = payload?.target?.name ?? "";
  const color = SANKEY_COLORS[targetName] || SANKEY_COLORS[sourceName] || "var(--text-dim)";
  return (
    <path
      d={`M${sourceX},${sourceY}C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}`}
      fill="none"
      strokeWidth={linkWidth}
      style={{ stroke: color, strokeOpacity: 0.25 }}
    />
  );
}

interface SankeyNodeDatum {
  name: string;
  category: "income" | "outbound" | "pool" | "net";
  colorIndex?: number;
}

interface SankeyLinkDatum {
  source: number;
  target: number;
  value: number;
}

function FinancesSankey({
  incomeStreams,
  outbound,
  net,
}: {
  incomeStreams: Stream[];
  outbound: NonNullable<FinancesDataV2["outbound"]>;
  net: number;
}) {
  const data = useMemo<{ nodes: SankeyNodeDatum[]; links: SankeyLinkDatum[] }>(() => {
    const nodes: SankeyNodeDatum[] = [];
    const links: SankeyLinkDatum[] = [];
    incomeStreams.forEach((s, i) =>
      nodes.push({ name: s.label, category: "income", colorIndex: i }),
    );
    nodes.push({ name: "Gross Income", category: "pool" });
    const grossIdx = nodes.length - 1;
    incomeStreams.forEach((s, i) => {
      if (s.annual > 0) links.push({ source: i, target: grossIdx, value: s.annual });
    });
    nodes.push({ name: "Expenses", category: "pool" });
    const outboundIdx = nodes.length - 1;
    if (outbound.annual > 0)
      links.push({ source: grossIdx, target: outboundIdx, value: outbound.annual });
    if (net > 0) {
      nodes.push({ name: "Net", category: "net" });
      links.push({ source: grossIdx, target: nodes.length - 1, value: net });
    }
    if (outbound.vendors_annual > 0) {
      nodes.push({ name: "Vendors", category: "outbound" });
      links.push({ source: outboundIdx, target: nodes.length - 1, value: outbound.vendors_annual });
    }
    if (outbound.obligations_annual > 0) {
      nodes.push({ name: "Obligations", category: "outbound" });
      links.push({
        source: outboundIdx,
        target: nodes.length - 1,
        value: outbound.obligations_annual,
      });
    }
    if (outbound.other_annual > 0) {
      nodes.push({ name: "Other", category: "outbound" });
      links.push({ source: outboundIdx, target: nodes.length - 1, value: outbound.other_annual });
    }
    return { nodes, links };
  }, [incomeStreams, outbound, net]);

  if (data.nodes.length === 0 || data.links.length === 0) return null;

  return (
    <div className="glass rounded-xl p-4 overflow-x-auto">
      <div className="h-[460px] w-[1200px] max-w-none" data-sensitive>
        <Sankey
          width={1200}
          height={460}
          data={data}
          node={<SankeyNode />}
          link={<SankeyLink />}
          nodePadding={50}
          margin={{ top: 20, bottom: 20, left: 100, right: 100 }}
        >
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--popover))",
              border: "1px solid var(--hairline-strong)",
              borderRadius: 10,
              color: "hsl(var(--popover-foreground))",
            }}
            formatter={(v: number) => fmtExact(v)}
          />
        </Sankey>
      </div>
    </div>
  );
}

/* ---------- inline tabs (no new dep) ---------- */

type TabKey = "income" | "outbound" | "overall";
const TABS: { key: TabKey; label: string; icon: LucideIcon }[] = [
  { key: "income", label: "Income", icon: ArrowUpCircle },
  { key: "outbound", label: "Expenses", icon: ArrowDownCircle },
  { key: "overall", label: "Overall", icon: ArrowLeftRight },
];

function TabBar({
  active,
  onChange,
}: {
  active: TabKey;
  onChange: (k: TabKey) => void;
}) {
  return (
    <div
      className="flex items-center gap-5 flex-wrap mt-8 pb-1.5"
      style={{ borderBottom: "1px solid var(--hairline)" }}
      role="tablist"
      aria-label="Finance views"
    >
      {TABS.map((t, i) => {
        const Icon = t.icon;
        const isActive = active === t.key;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className="relative inline-flex items-center gap-1.5 px-1 py-1.5 bg-transparent border-none cursor-pointer text-[12px] font-mono uppercase tracking-[0.12em] font-semibold transition-colors"
            style={{ color: isActive ? "var(--neon)" : "hsl(var(--muted-foreground))" }}
            aria-selected={isActive}
            aria-label={`${t.label} tab (shortcut ${i + 1})`}
            role="tab"
          >
            <Icon className="w-3.5 h-3.5" />
            {t.label}
            <span className="text-[10px] tabular-nums" style={{ opacity: 0.6 }}>{i + 1}</span>
            {isActive && (
              <span
                className="absolute left-0 right-0 -bottom-[3px] h-[2px] rounded-full"
                style={{ background: "var(--neon)", boxShadow: "0 0 10px var(--glow)" }}
              />
            )}
          </button>
        );
      })}
      <span className="flex-1" />
      <span className="hidden sm:inline text-[11px] font-mono text-muted-foreground">press 1 · 2 · 3</span>
    </div>
  );
}

function PeriodToggle({
  value,
  onChange,
}: {
  value: "monthly" | "annual";
  onChange: (v: "monthly" | "annual") => void;
}) {
  return (
    <div className="inline-flex items-center gap-1 p-1 rounded-lg glass">
      {(["monthly", "annual"] as const).map((v) => {
        const isActive = value === v;
        return (
          <button
            key={v}
            onClick={() => onChange(v)}
            className="px-3 py-1 rounded-md text-[11px] font-mono uppercase tracking-[0.1em] cursor-pointer transition-colors"
            style={{
              background: isActive ? "var(--surface-2)" : "transparent",
              border: `1px solid ${isActive ? "var(--hairline)" : "transparent"}`,
              color: isActive ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
            }}
            aria-pressed={isActive}
            aria-label={`Show ${v} figures`}
          >
            {v === "monthly" ? "Monthly" : "Annual"}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- section renderers ---------- */

function SectionGroup({
  title,
  kicker,
  items,
  icon,
  accent,
  freshness,
}: {
  title: string;
  kicker: string;
  items?: Section[];
  icon: LucideIcon;
  accent: string;
  freshness?: FreshnessData;
}) {
  if (!items || items.length === 0) return null;
  return (
    <SectionFrame icon={icon} kicker={kicker} title={title} count={items.length}>
      {freshness && (
        <div className="flex justify-end mb-3 -mt-2">
          <FreshnessIndicator freshness={freshness} />
        </div>
      )}
      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
        {items.map((item, i) => (
          <Reveal key={i} delay={i * 40}>
            <div className="glass rounded-xl p-4 h-full">
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: accent, boxShadow: `0 0 8px ${accent}` }}
                />
                <h3 className="text-[14px] font-semibold text-foreground">{item.heading}</h3>
              </div>
              <div
                className="text-[12px] leading-relaxed whitespace-pre-wrap line-clamp-5 text-muted-foreground"
                data-sensitive
              >
                {item.body}
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </SectionFrame>
  );
}

function AccountCategory({ item }: { item: Section }) {
  const ACCOUNT_ICON: Record<string, LucideIcon> = {
    Banking: Landmark,
    "Credit Cards": CreditCard,
    "Investment Accounts": PiggyBank,
    Investments: PiggyBank,
    "Account Processing": Receipt,
  };
  const Icon = ACCOUNT_ICON[item.heading] || DollarSign;
  const subs = parseSubheadings(item.body);
  return (
    <div className="glass rounded-xl p-4 h-full">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 shrink-0" style={{ color: "var(--dim-money)" }} />
        <h3 className="text-[12px] font-mono font-semibold uppercase tracking-[0.14em] text-foreground">
          {item.heading}
        </h3>
        {subs.length > 0 && (
          <span className="ml-auto text-[11px] font-mono text-muted-foreground tabular-nums">
            {String(subs.length).padStart(2, "0")}
          </span>
        )}
      </div>
      {subs.length > 0 ? (
        <div className="space-y-2" data-sensitive>
          {subs.map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-[13px] text-foreground">
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: "var(--dim-rhythms)", opacity: 0.6 }}
              />
              <span>{s}</span>
            </div>
          ))}
        </div>
      ) : (
        <div
          className="text-[12px] leading-relaxed whitespace-pre-wrap line-clamp-5 text-muted-foreground"
          data-sensitive
        >
          {item.body}
        </div>
      )}
    </div>
  );
}

/* ---------- tabs ---------- */

function IncomeTab({ data }: { data: FinancesDataV2 }) {
  const income = data.income;
  const streams = income?.streams ?? data.incomeStreams ?? [];
  const incomeFreshness = data.freshness_per_card?.income ?? data.freshness;
  return (
    <div>
      {income && (
        <Reveal className="mt-6">
          <IncomeHero data={income} freshness={incomeFreshness} />
        </Reveal>
      )}
      {streams.length > 0 && (
        <SectionFrame icon={TrendingUp} kicker="Where the money comes from" title="Income Streams" count={streams.length}>
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
            {streams.map((s, i) => (
              <Reveal key={s.label} delay={i * 40}>
                <StreamCard stream={s} />
              </Reveal>
            ))}
          </div>
        </SectionFrame>
      )}
    </div>
  );
}

function OutboundSubgroup({
  title,
  kicker,
  icon,
  lines,
}: {
  title: string;
  kicker: string;
  icon: LucideIcon;
  lines: ResolvedLine[];
}) {
  if (lines.length === 0) return null;
  const total = lines.reduce((s, l) => s + l.annual_usd, 0);
  return (
    <SectionFrame icon={icon} kicker={kicker} title={title} count={lines.length}>
      <div className="flex justify-end mb-3 -mt-2">
        <span className="text-[11px] font-mono tabular-nums text-muted-foreground" data-sensitive>
          {fmtHero(total / 12)}/mo · {fmtHero(total)}/yr
        </span>
      </div>
      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
        {lines.map((l, i) => (
          <Reveal key={l.id} delay={i * 40}>
            <LineRow line={l} tone="outbound" />
          </Reveal>
        ))}
      </div>
    </SectionFrame>
  );
}

function InsightLineRow({ line, accent }: { line: InsightLine; accent: string }) {
  // Honest cadence labels — only true monthly_recurring shows /yr projection prominently.
  // observed_one_month and one_time show "$X observed (1mo)" so the user sees what we actually saw.
  const isUncertain = line.cadence === "observed_one_month" || (line.cadence === "one_time" && line.charge_count >= 2);
  const cadenceLabel =
    line.cadence === "monthly_recurring"
      ? `${line.charge_count}× over ${line.active_months}mo · monthly`
      : line.cadence === "annual_subscription"
        ? "annual subscription"
        : line.cadence === "observed_one_month"
          ? `${line.charge_count}× in 1mo · observed only`
          : "one-time";
  return (
    <div className="glass rounded-xl p-4 h-full flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2 flex-wrap">
        <span className="flex items-center gap-2 min-w-0">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: accent, boxShadow: `0 0 8px ${accent}` }}
          />
          <span className="text-[14px] font-medium text-foreground truncate" data-sensitive>
            {line.display}
          </span>
        </span>
        <span className="text-base font-semibold font-mono tabular-nums" style={{ color: accent }} data-sensitive>
          {isUncertain ? fmtHero(line.observed_usd) : fmtHero(line.annual_usd)}
          <span className="text-[11px] font-mono text-muted-foreground ml-1">
            {isUncertain ? "observed" : "/yr"}
          </span>
        </span>
      </div>
      <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground flex-wrap">
        {!isUncertain && line.monthly_usd > 0 && (
          <>
            <span data-sensitive>{fmtHero(line.monthly_usd)}/mo</span>
            <span>·</span>
          </>
        )}
        <span>{cadenceLabel}</span>
        <span>·</span>
        <span style={{ color: CONFIDENCE_COLOR[line.confidence] }}>conf: {line.confidence}</span>
        {line.tags.length > 0 && (
          <>
            <span>·</span>
            <span>{line.tags.slice(0, 3).join(" / ")}</span>
          </>
        )}
      </div>
      {line.reason && (
        <p className="text-[12px] mt-0.5" style={{ color: "var(--danger)" }}>{line.reason}</p>
      )}
    </div>
  );
}

function InsightSection({
  title,
  icon,
  accent,
  description,
  lines,
  emptyHint,
  showWhenEmpty = false,
}: {
  title: string;
  icon: LucideIcon;
  accent: string;
  description?: string;
  lines: InsightLine[];
  emptyHint: string;
  showWhenEmpty?: boolean;
}) {
  // No-placeholder rule: sections with nothing detected are hidden entirely,
  // except where the emptiness itself is information (showWhenEmpty).
  if (lines.length === 0 && !showWhenEmpty) return null;
  return (
    <div className="mt-10">
      <SubHeader
        icon={icon}
        title={title}
        accent={accent}
        description={description}
        meta={
          lines.length > 0 ? (
            <span className="text-[11px] font-mono tabular-nums text-muted-foreground" data-sensitive>
              {fmtHero(lines.reduce((s, l) => s + l.annual_usd, 0))}/yr · {lines.length} item{lines.length === 1 ? "" : "s"}
            </span>
          ) : undefined
        }
      />
      {lines.length === 0 ? (
        <div
          className="grid place-items-center rounded-xl py-6 text-[12px] font-mono text-muted-foreground"
          style={{ border: "1px dashed var(--hairline)" }}
        >
          {emptyHint}
        </div>
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
          {lines.map((l, i) => (
            <Reveal key={`${l.display}-${i}`} delay={i * 40}>
              <InsightLineRow line={l} accent={accent} />
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryBreakdown({ categories, total }: { categories: SpendInsights["by_category"]; total: number }) {
  if (categories.length === 0) return null;
  const max = Math.max(...categories.map(c => c.annual_usd), 1);
  const CATEGORY_LABEL: Record<string, string> = {
    taxes: "Taxes", payroll: "Payroll / Contractors",
    ai: "AI", infrastructure: "Infrastructure", saas: "SaaS / Subscriptions",
    food: "Food", transportation: "Transportation", utilities: "Utilities",
    entertainment: "Entertainment", health: "Health", news: "News", shopping: "Shopping",
    travel: "Travel", "business-services": "Business Services", debt: "Debt", advertising: "Advertising",
    other: "Other",
  };
  return (
    <div className="mt-8">
      <SubHeader
        icon={PieChart}
        title="Spending By Category"
        accent="var(--dim-relationships)"
        meta={
          <span className="text-[11px] font-mono tabular-nums text-muted-foreground" data-sensitive>
            {fmtHero(total)}/yr total observed
          </span>
        }
      />
      <Reveal>
        <div className="glass rounded-xl p-4 sm:p-5">
          <div className="flex flex-col gap-2.5">
            {categories.map((c) => {
              const pct = total > 0 ? Math.round((c.annual_usd / total) * 100) : 0;
              const barPct = (c.annual_usd / max) * 100;
              return (
                <div key={c.category} className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between gap-2 text-[12px]">
                    <span className="font-medium text-foreground">{CATEGORY_LABEL[c.category] ?? c.category}</span>
                    <span className="font-mono tabular-nums text-muted-foreground" data-sensitive>
                      {fmtHero(c.annual_usd)}/yr · {c.merchants} {c.merchants === 1 ? "merchant" : "merchants"} · {pct}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface-1)" }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${barPct}%`, background: "var(--warn)", opacity: 0.8 }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Reveal>
    </div>
  );
}

function SpendInsightsSection({ insights }: { insights: SpendInsights }) {
  const analyzerHasData =
    insights.statement_spend.record_count > 0 ||
    insights.by_category.length > 0 ||
    insights.top_bills.length > 0 ||
    insights.top_ai_services.length > 0 ||
    insights.top_infrastructure_services.length > 0 ||
    insights.cut_candidates.length > 0;

  return (
    <SectionFrame
      icon={Sparkles}
      kicker="Statement-derived intelligence"
      title="Spending Analysis"
      count={insights.statement_spend.record_count > 0 ? insights.statement_spend.record_count : undefined}
    >
      <Reveal>
        <div className="flex items-start justify-between flex-wrap gap-2 -mt-1">
          <p className="text-[12px] text-muted-foreground max-w-[72ch]">
            Derived from statement CSVs in{" "}
            <code className="font-mono" style={{ color: "var(--text-dim)" }}>FINANCES/Statements/*</code>. Re-run with{" "}
            <code className="font-mono" style={{ color: "var(--text-dim)" }}>
              bun ~/.claude/LIFEOS/USER/TELOS/FINANCES/Tools/StatementAnalyzer.ts
            </code>
            .
          </p>
          {insights.statement_spend.generated_at && (
            <span className="text-[11px] font-mono text-muted-foreground">
              {insights.statement_spend.record_count} merchants · generated{" "}
              {new Date(insights.statement_spend.generated_at).toLocaleDateString("en-US", {
                month: "short", day: "numeric", year: "numeric",
              })}
            </span>
          )}
        </div>
      </Reveal>

      {!analyzerHasData ? (
        <div
          className="grid place-items-center rounded-xl py-8 mt-6 text-[12px] font-mono text-muted-foreground"
          style={{ border: "1px dashed var(--hairline)" }}
        >
          No statement aggregate yet.
        </div>
      ) : (
        <>
          <CategoryBreakdown categories={insights.by_category} total={insights.total_annualized} />

          <InsightSection
            title="Top Bills"
            icon={Trophy}
            accent="var(--warn)"
            description="Highest annualized spend across all sources (transfers excluded)."
            lines={insights.top_bills}
            emptyHint="No statement aggregate yet — run StatementAnalyzer.ts to populate."
          />

          <InsightSection
            title="Top AI Services"
            icon={Cpu}
            accent="var(--dim-relationships)"
            description="What the AI stack actually costs — sorted by annualized spend."
            lines={insights.top_ai_services}
            emptyHint="No AI services detected yet. Drop more CSV exports under FINANCES/Statements/."
          />

          <InsightSection
            title="Top Infrastructure Services"
            icon={Server}
            accent="var(--dim-freedom)"
            description="Cloud, hosting, dev, monitoring, networking."
            lines={insights.top_infrastructure_services}
            emptyHint="No infrastructure services detected yet."
          />

          <InsightSection
            title="Cut Candidates"
            icon={Scissors}
            accent="var(--dim-creative)"
            description="Subscriptions flagged for review — single-use annuals, low-value recurring, overlapping tools."
            lines={insights.cut_candidates}
            emptyHint="No obvious cut candidates. Stack is lean (or analyzer needs more data)."
            showWhenEmpty
          />
        </>
      )}
    </SectionFrame>
  );
}

function OutboundTab({ data }: { data: FinancesDataV2 }) {
  const outbound = data.outbound;
  const outboundFreshness = data.freshness_per_card?.outbound ?? data.freshness;
  if (!outbound) {
    return (
      <div className="glass rounded-xl p-5 mt-6">
        <p className="text-[13px] text-center text-muted-foreground">
          Expenses data unavailable. Check{" "}
          <code className="font-mono text-foreground">
            ~/.claude/LIFEOS/USER/TELOS/FINANCES/vendors.yaml
          </code>
          .
        </p>
      </div>
    );
  }
  return (
    <div>
      <Reveal className="mt-6">
        <OutboundHero data={outbound} freshness={outboundFreshness} />
      </Reveal>
      <OutboundSubgroup
        title="Vendors & Services"
        kicker="Recurring vendors & services"
        icon={Server}
        lines={outbound.vendors}
      />
      <OutboundSubgroup
        title="Personal Obligations"
        kicker="Fixed personal commitments"
        icon={Home}
        lines={outbound.obligations}
      />
      <OutboundSubgroup title="Other" kicker="Everything else tracked" icon={Receipt} lines={outbound.other} />
      {data.insights && <SpendInsightsSection insights={data.insights} />}
    </div>
  );
}

function OverallTab({
  data,
  periodView,
  onPeriodChange,
}: {
  data: FinancesDataV2;
  periodView: "monthly" | "annual";
  onPeriodChange: (v: "monthly" | "annual") => void;
}) {
  const overall = data.overall;
  const income = data.income;
  const outbound = data.outbound;
  if (!overall || !income || !outbound) {
    return (
      <div className="glass rounded-xl p-5 mt-6">
        <p className="text-[13px] text-center text-muted-foreground">Overall data unavailable.</p>
      </div>
    );
  }
  const hasFlow =
    income.streams.some((s) => s.annual > 0) || outbound.annual > 0 || overall.net_pre_tax_annual > 0;
  const hasTrend = trendHasSignal(overall.trend);
  return (
    <div>
      <div className="flex justify-end mt-6">
        <PeriodToggle value={periodView} onChange={onPeriodChange} />
      </div>
      <Reveal className="mt-4">
        <OverallHero
          data={overall}
          periodView={periodView}
          freshness={data.freshness_per_card?.overall ?? data.freshness}
        />
      </Reveal>
      {hasFlow && (
        <SectionFrame icon={ArrowLeftRight} kicker="Where it flows" title="Cash Flow">
          <Reveal>
            <FinancesSankey
              incomeStreams={income.streams}
              outbound={outbound}
              net={overall.net_pre_tax_annual}
            />
          </Reveal>
        </SectionFrame>
      )}
      {hasTrend && (
        <SectionFrame icon={TrendingUp} kicker="Twelve month trace" title="Income vs Expenses">
          <Reveal>
            <TrendChart trend={overall.trend} />
          </Reveal>
        </SectionFrame>
      )}
      {data.accounts && data.accounts.length > 0 && (
        <SectionFrame icon={Landmark} kicker="Where balances live" title="Accounts" count={data.accounts.length}>
          {data.freshness_per_card?.accounts && (
            <div className="flex justify-end mb-3 -mt-2">
              <FreshnessIndicator freshness={data.freshness_per_card.accounts} />
            </div>
          )}
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
            {data.accounts.map((item, i) => (
              <Reveal key={i} delay={i * 40}>
                <AccountCategory item={item} />
              </Reveal>
            ))}
          </div>
        </SectionFrame>
      )}
      <SectionGroup
        title="Investments"
        kicker="Long positions"
        items={data.investments}
        icon={PiggyBank}
        accent="var(--positive)"
        freshness={data.freshness_per_card?.investments}
      />
      <SectionGroup
        title="Goals"
        kicker="Financial targets"
        items={data.goals}
        icon={Target}
        accent="var(--dim-relationships)"
      />
      <SectionGroup
        title="Taxes"
        kicker="What the state takes"
        items={data.taxes}
        icon={Receipt}
        accent="var(--warn)"
        freshness={data.freshness_per_card?.taxes}
      />
    </div>
  );
}

/* ---------- page ---------- */

export default function FinancesPage() {
  const [data, setData] = useState<FinancesDataV2 | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("income");
  const [periodView, setPeriodView] = useState<"monthly" | "annual">("monthly");

  // Load data
  useEffect(() => {
    fetch("/api/life/finances")
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch((e) => setError(String(e)));
  }, []);

  // Hash-routed tab state
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.replace("#", "") as TabKey;
    if (hash === "income" || hash === "outbound" || hash === "overall") setTab(hash);
    const onHashChange = () => {
      const h = window.location.hash.replace("#", "") as TabKey;
      if (h === "income" || h === "outbound" || h === "overall") setTab(h);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  // Keyboard 1/2/3 cycles tabs
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "1") changeTab("income");
      else if (e.key === "2") changeTab("outbound");
      else if (e.key === "3") changeTab("overall");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const changeTab = (k: TabKey) => {
    setTab(k);
    if (typeof window !== "undefined") window.location.hash = k;
  };

  if (error) {
    return (
      <div className="px-5 sm:px-8 pt-10 max-w-5xl mx-auto">
        <div className="glass rounded-xl p-5 flex items-start gap-2.5">
          <span
            className="mt-1.5 w-2 h-2 rounded-full shrink-0"
            style={{ background: "var(--danger)", boxShadow: "0 0 8px var(--danger)" }}
          />
          <div>
            <h2 className="text-[15px] font-semibold" style={{ color: "var(--danger)" }}>
              Failed to load finances
            </h2>
            <p className="text-[13px] text-muted-foreground mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }
  if (!data) return <div className="px-5 sm:px-8 pt-10 text-[13px] font-mono text-muted-foreground">Loading Finances…</div>;

  const incomeAnnual = data.income?.annual ?? data.annualIncome ?? 0;
  const outboundAnnual = data.outbound?.annual ?? data.annualExpenses ?? 0;
  const incomeStreams = data.income?.streams ?? data.incomeStreams ?? [];
  const isFreshInstall =
    incomeAnnual === 0 &&
    outboundAnnual === 0 &&
    incomeStreams.length === 0 &&
    (!data.accounts || data.accounts.length === 0);

  return (
    <div className="px-5 sm:px-8 lg:px-10 pb-24 max-w-[1400px] mx-auto">
      {isFreshInstall && (
        <div className="pt-8">
          <EmptyStateGuide
            section="Finances"
            description="Accounts, transactions, P&L, and revenue tracked over time."
            userDir="FINANCES"
            daPromptExample="help me wire up my financial data"
          />
        </div>
      )}

      <PageHero data={data} isFreshInstall={isFreshInstall} />

      <TabBar active={tab} onChange={changeTab} />

      {tab === "income" && <IncomeTab data={data} />}
      {tab === "outbound" && <OutboundTab data={data} />}
      {tab === "overall" && (
        <OverallTab data={data} periodView={periodView} onPeriodChange={setPeriodView} />
      )}
    </div>
  );
}
