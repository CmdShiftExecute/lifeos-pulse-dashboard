"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";
import {
  Activity,
  DollarSign,
  Briefcase,
  Building2,
  Target,
  Compass,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  Lightbulb,
  CheckSquare,
  Square,
  Wind,
  Layers,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Reveal } from "@/components/kit/Reveal";
import { Section } from "@/components/kit/Section";

// ────────── Types ──────────

interface HomeData {
  oneSentence: string;
  current: {
    mood?: string;
    energy?: string;
    focus?: string;
    location?: string;
    last_meal?: string;
    sleep_last_night?: string;
    calendar_load?: string;
    inbox?: string;
    top_intent?: string;
  };
  topGoals?: Array<{ id: string; text: string }>;
  nextActions?: string[];
  spark?: string;
  timelineBlockCount?: number;
}

interface UserIndexStats {
  total_files: number;
  avg_completeness: number;
  frontmatter_coverage: number;
  by_kind: Record<string, number>;
  by_publish: Record<string, number>;
}

interface UserIndex {
  files: unknown[];
  by_category: Record<string, unknown[]>;
  domains: unknown[];
  publish_feed: unknown[];
  stale_queue: unknown[];
  interview_gaps: unknown[];
  stats: UserIndexStats;
}

interface GoalsData {
  goals?: Array<{ id: string; text: string }>;
  mission?: Array<{ heading: string; body: string }>;
  problems?: Array<{ heading: string; body: string }>;
  status?: Array<{ heading: string; body: string }>;
}

interface BusinessData {
  revenueSummary?: string;
  latestRevenueReport?: string;
  businessOverview?: Array<{ heading: string; body: string }>;
  revenueByProduct?: string;
}

interface HealthData {
  files?: Array<{ name: string; sections: string[] }>;
}

interface FinancesData {
  accounts?: Array<{ heading: string; body: string }>;
}

interface WorkData {
  projects?: Array<{ name: string; path: string; url: string }>;
}

interface AirMonitor {
  id: number;
  name: string;
  pm25: number | null;
  co2: number | null;
  temp: number | null;
  rh: number | null;
  aqi: number | null;
  aqiLabel: string | null;
  type: string | null;
}

interface AirData {
  fetched_at: string | null;
  count: number;
  worst_aqi: number | null;
  worst_label: string | null;
  monitors: AirMonitor[];
  error?: string;
}

// ────────── Helpers ──────────

type Dimension = "health" | "money" | "freedom" | "creative" | "relationships" | "rhythms";

/* Life-dimension accents — semantic tokens from themes.css, re-theme with [data-theme]. */
const DIMENSION_COLOR: Record<Dimension, string> = {
  health: "var(--dim-health)",
  money: "var(--dim-money)",
  freedom: "var(--dim-freedom)",
  creative: "var(--dim-creative)",
  relationships: "var(--dim-relationships)",
  rhythms: "var(--dim-rhythms)",
};

/* Ring gradients reference raw token NAMES — SVG <stop> needs concrete values,
   so they are resolved at runtime via getComputedStyle (finances/page.tsx pattern). */
const RING_GRADIENT: Record<string, [string, string]> = {
  Mood: ["--dim-relationships", "--dim-health"],
  Energy: ["--dim-health", "--dim-rhythms"],
  Focus: ["--dim-freedom", "--dim-creative"],
};

const CHART_TOKEN_NAMES = [
  "--dim-health",
  "--dim-relationships",
  "--dim-rhythms",
  "--dim-freedom",
  "--dim-creative",
  "--surface-3",
];

function useChartTokens(): Record<string, string> {
  const [tokens, setTokens] = useState<Record<string, string>>({});
  useEffect(() => {
    const read = () => {
      const cs = getComputedStyle(document.documentElement);
      const next: Record<string, string> = {};
      for (const name of CHART_TOKEN_NAMES) next[name] = cs.getPropertyValue(name).trim();
      setTokens(next);
    };
    read();
    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
  }, []);
  return tokens;
}

function parseRatio(value?: string): number | null {
  if (!value) return null;
  const m = value.match(/(\d+(?:\.\d+)?)\s*\/\s*10/);
  if (m) return Math.round(parseFloat(m[1]) * 10);
  const pct = value.match(/(\d+)%/);
  if (pct) return parseInt(pct[1], 10);
  return null;
}

function parseMoodToScore(mood?: string): number | null {
  if (!mood) return null;
  const text = mood.toLowerCase();
  if (/\b(energized|clear|focused|great|amazing)\b/.test(text)) return 85;
  if (/\b(good|solid|fine|ok)\b/.test(text)) return 70;
  if (/\b(tired|foggy|slow)\b/.test(text)) return 45;
  if (/\b(bad|stressed|anxious|overwhelmed)\b/.test(text)) return 30;
  return 60;
}

function parseRevenueSummary(md?: string): { total?: string; deals?: string; largest?: string } {
  if (!md) return {};
  const out: Record<string, string> = {};
  const lines = md.split("\n");
  for (const line of lines) {
    const m = line.match(/\*\*([^*]+)\*\*\s*\|\s*([^|]+)\|/);
    if (m) out[m[1].trim().toLowerCase()] = m[2].trim();
  }
  return { total: out["total revenue"], deals: out["deals closed"], largest: out["largest single deal"] };
}

// ────────── Primitives ──────────

function RingMetric({
  label,
  score,
  valueText,
  tokens,
}: {
  label: string;
  score: number | null;
  valueText?: string;
  tokens: Record<string, string>;
}) {
  // No real reading → no ring. A dash circle is placeholder UI.
  if (score === null) return null;
  const gradientId = `ring-${label.toLowerCase()}`;
  const [startToken, endToken] = RING_GRADIENT[label] ?? ["--dim-relationships", "--dim-health"];
  const start = tokens[startToken];
  const end = tokens[endToken];
  const track = tokens["--surface-3"];
  const data = [{ value: score }];
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-20 h-20">
        {start && end && (
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart innerRadius="70%" outerRadius="100%" data={data} startAngle={90} endAngle={-270}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={start} />
                  <stop offset="100%" stopColor={end} />
                </linearGradient>
              </defs>
              <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
              <RadialBar dataKey="value" fill={`url(#${gradientId})`} cornerRadius={10} background={{ fill: track }} />
            </RadialBarChart>
          </ResponsiveContainer>
        )}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-medium font-mono tabular-nums" style={{ color: "hsl(var(--foreground))" }}>
            {score}
          </span>
        </div>
      </div>
      <div className="text-[13px] uppercase tracking-wider muted">{label}</div>
      {valueText && <div className="text-[12px] muted text-center max-w-[120px] truncate" title={valueText}>{valueText}</div>}
    </div>
  );
}

function DomainCard({
  title, icon: Icon, href, headline, secondary, children, dimension, pulse = false,
}: {
  title: string;
  icon: LucideIcon;
  href: string;
  headline?: string | null;
  secondary?: string | null;
  children?: React.ReactNode;
  dimension: Dimension;
  pulse?: boolean;
}) {
  const color = DIMENSION_COLOR[dimension];
  return (
    <Link href={href} className="h-full">
      <div className={`telos-card h-full group dim-${dimension}${pulse ? " pulse" : ""}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4" style={{ color }} />
            <h2 className="text-[14px] font-medium uppercase tracking-wider" style={{ color }}>{title}</h2>
          </div>
          <ArrowUpRight className="w-4 h-4 muted transition-colors" />
        </div>
        {headline && (
          <>
            <div className="text-2xl font-medium font-mono tabular-nums leading-tight" style={{ color }} data-sensitive>{headline}</div>
            {secondary && <div className="text-xs muted leading-relaxed line-clamp-2" data-sensitive>{secondary}</div>}
          </>
        )}
        {children}
      </div>
    </Link>
  );
}

// ────────── Sections ──────────

function NarrativeBanner({ home }: { home: HomeData | null }) {
  const tokens = useChartTokens();
  if (!home) return <div className="telos-card h-24 animate-pulse" style={{ cursor: "default" }} />;
  const mood = parseMoodToScore(home.current?.mood);
  const energy = parseRatio(home.current?.energy);
  const focus = home.current?.focus ? 70 : null; // focus depth is categorical — render existence as 70
  const hasRings = mood !== null || energy !== null || focus !== null;
  return (
    <section className="telos-card mission-card" style={{ cursor: "default" }}>
      <div className="flex items-start justify-between gap-8 flex-wrap">
        <div className="flex-1 min-w-0 max-w-3xl">
          <div
            className="text-[11px] font-mono uppercase tracking-[0.24em] muted mb-3"
            style={{ color: "var(--dim-relationships)" }}
          >
            How is life going
          </div>
          <p className="text-2xl lg:text-3xl font-medium leading-snug" data-sensitive>
            {home.oneSentence}
          </p>
          {home.current?.top_intent && (
            <p className="mt-4 text-sm muted" data-sensitive>
              <span>Top intent:</span> {home.current.top_intent}
            </p>
          )}
        </div>
        {hasRings && (
          <div className="flex items-center gap-6" data-sensitive>
            <RingMetric label="Mood" score={mood} valueText={home.current?.mood} tokens={tokens} />
            <RingMetric label="Energy" score={energy} valueText={home.current?.energy} tokens={tokens} />
            <RingMetric label="Focus" score={focus} valueText={home.current?.focus} tokens={tokens} />
          </div>
        )}
      </div>
      {(home.current?.location || home.current?.sleep_last_night || home.current?.calendar_load) && (
        <div
          className="mt-6 flex flex-wrap gap-2 text-xs pt-4"
          style={{ borderTop: "1px solid var(--hairline)" }}
          data-sensitive
        >
          {home.current?.location && <span className="pill pill-freedom">Location · {home.current.location}</span>}
          {home.current?.sleep_last_night && <span className="pill pill-rhythms">Sleep · {home.current.sleep_last_night}</span>}
          {home.current?.calendar_load && <span className="pill pill-creative">Calendar · {home.current.calendar_load}</span>}
          {home.current?.last_meal && <span className="pill pill-health">Meal · {home.current.last_meal}</span>}
        </div>
      )}
    </section>
  );
}

function Hero({ home }: { home: HomeData | null }) {
  return (
    <section className="pt-8 sm:pt-10">
      <div className="flex items-center gap-2.5 mb-4 text-[11px] font-mono uppercase tracking-[0.28em] text-muted-foreground">
        <span
          className="w-1.5 h-1.5 rounded-full anim-breathe"
          style={{ background: "var(--positive)", boxShadow: "0 0 8px var(--positive)" }}
        />
        LifeOS · Life
      </div>
      <h1 className="text-2xl sm:text-3xl font-bold leading-tight text-foreground">Life</h1>
      <div className="mt-6">
        <NarrativeBanner home={home} />
      </div>
    </section>
  );
}

interface DomainCardSpec {
  key: string;
  title: string;
  icon: LucideIcon;
  href: string;
  dimension: Dimension;
  headline: string;
  secondary: string | null;
  pulse?: boolean;
}

function DomainGrid({
  business, health, finances, work, goals, air,
}: {
  business: BusinessData | null;
  health: HealthData | null;
  finances: FinancesData | null;
  work: WorkData | null;
  goals: GoalsData | null;
  air: AirData | null;
}) {
  const rev = parseRevenueSummary(business?.revenueSummary);
  const healthFileCount = health?.files?.length ?? 0;
  const accountCount = finances?.accounts?.length ?? 0;
  const projectCount = work?.projects?.length ?? 0;
  const goalCount = goals?.goals?.length ?? 0;
  const missionCount = goals?.mission?.length ?? 0;
  const airMonitorCount = air?.count ?? 0;
  const worstAqi = air?.worst_aqi ?? null;
  const indoorCo2 = air?.monitors
    ?.filter(m => m.type !== "outdoor" && m.name.toLowerCase() !== "backyard")
    ?.reduce((max, m) => m.co2 !== null && (max === null || m.co2 > max) ? m.co2 : max, null as number | null)
    ?? null;
  const airSecondary = airMonitorCount > 0
    ? `${airMonitorCount} monitors${air?.worst_label ? ` · ${air.worst_label}` : ""}${indoorCo2 !== null ? ` · indoor CO₂ ${indoorCo2}ppm` : ""}`
    : null;

  // Only domains with real, connected data render — no setup-hint placeholder tiles.
  const cards: DomainCardSpec[] = [];
  if (rev.total) {
    cards.push({
      key: "business", title: "Business", icon: Building2, href: "/business", dimension: "creative",
      headline: rev.total,
      secondary: rev.deals ? `${rev.deals} deals${rev.largest ? ` · largest ${rev.largest}` : ""}` : null,
    });
  }
  if (healthFileCount > 0) {
    cards.push({
      key: "health", title: "Health", icon: Activity, href: "/health", dimension: "health",
      headline: `${healthFileCount} sources`, secondary: "Labs, fitness, nutrition tracked",
    });
  }
  if (projectCount > 0) {
    cards.push({
      key: "work", title: "Work", icon: Briefcase, href: "/work", dimension: "creative",
      headline: `${projectCount} active`, secondary: "Projects in flight", pulse: true,
    });
  }
  if (accountCount > 0) {
    cards.push({
      key: "finances", title: "Finances", icon: DollarSign, href: "/finances", dimension: "money",
      headline: `${accountCount} accounts`, secondary: "Tracked accounts & categories",
    });
  }
  if (goalCount > 0) {
    cards.push({
      key: "goals", title: "Telos Goals", icon: Target, href: "/telos", dimension: "relationships",
      headline: `${goalCount} active`,
      secondary: goals?.mission?.[0]?.body?.slice(0, 80) ?? "Telos mission & goals",
    });
  }
  if (missionCount > 0) {
    cards.push({
      key: "telos", title: "Telos", icon: Compass, href: "/telos", dimension: "freedom",
      headline: `${missionCount} missions`,
      secondary: goals?.problems?.length ? `${goals.problems.length} problems · ${goals?.status?.length ?? 0} status entries` : null,
    });
  }
  if (worstAqi !== null) {
    cards.push({
      key: "air", title: "Air Quality", icon: Wind, href: "/air", dimension: "rhythms",
      headline: `AQI ${worstAqi}`, secondary: airSecondary,
    });
  }

  if (cards.length === 0) return null;

  return (
    <Section icon={Compass} kicker="Life areas at a glance" title="Domains" count={cards.length}>
      <div className="prob-grid">
        {cards.map((c, i) => (
          <Reveal key={c.key} delay={i * 40} className="h-full">
            <DomainCard
              title={c.title}
              icon={c.icon}
              href={c.href}
              dimension={c.dimension}
              headline={c.headline}
              secondary={c.secondary}
              pulse={c.pulse}
            />
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

function ActiveGoals({ goals }: { goals: GoalsData | null }) {
  const items = goals?.goals?.slice(0, 8) ?? [];
  if (items.length === 0) return null;
  return (
    <Section icon={Target} kicker="Telos commitments in motion" title="Active Goals" count={items.length}>
      <Reveal>
        <div className="telos-card pulse" style={{ cursor: "default" }}>
          <div className="space-y-3" data-sensitive>
            {items.map(g => (
              <div key={g.id} className="flex items-center gap-4">
                <span className="text-xs font-mono muted w-8 shrink-0">{g.id}</span>
                <span className="text-sm flex-1 truncate" title={g.text}>{g.text}</span>
                <span className="pill pill-relationships shrink-0">active</span>
              </div>
            ))}
          </div>
          <div className="mt-2 pt-3 flex justify-end" style={{ borderTop: "1px solid var(--hairline)" }}>
            <Link href="/telos" className="text-xs font-mono muted">see all →</Link>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}

function NextActionsSpark({ home }: { home: HomeData | null }) {
  const actions = home?.nextActions ?? [];
  const spark = home?.spark;
  // Each card renders only with real content; the whole section hides when both are empty.
  if (actions.length === 0 && !spark) return null;
  return (
    <Section icon={Zap} kicker="What moves next" title="Momentum">
      <div className="prob-grid">
        {actions.length > 0 && (
          <Reveal className="h-full">
            <div className="telos-card rec dim-rhythms h-full" style={{ cursor: "default" }}>
              <div className="flex items-center gap-2 mb-1">
                <CheckSquare className="w-4 h-4" style={{ color: "var(--dim-rhythms)" }} />
                <h3 className="text-sm font-medium uppercase tracking-widest muted" style={{ color: "var(--dim-rhythms)" }}>Next Actions</h3>
              </div>
              <ul className="space-y-2" data-sensitive>
                {actions.slice(0, 6).map((a, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Square className="w-3 h-3 mt-1 shrink-0" style={{ color: "hsl(var(--muted-foreground))" }} />
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        )}
        {spark && (
          <Reveal delay={40} className="h-full">
            <div className="telos-card rec dim-creative h-full" style={{ cursor: "default" }}>
              <div className="flex items-center gap-2 mb-1">
                <Lightbulb className="w-4 h-4" style={{ color: "var(--dim-creative)" }} />
                <h3 className="text-sm font-medium uppercase tracking-widest muted" style={{ color: "var(--dim-creative)" }}>Spark</h3>
              </div>
              <p className="text-base font-serif italic leading-relaxed">{spark}</p>
            </div>
          </Reveal>
        )}
      </div>
    </Section>
  );
}

function SystemContextDrawer({ index }: { index: UserIndex | null }) {
  const [open, setOpen] = useState(false);
  if (!index || index.stats.total_files === 0) return null;
  const byCat = index.by_category;
  const daemonCount = (index.stats.by_publish.daemon || 0) + (index.stats.by_publish["daemon-summary"] || 0);

  return (
    <Section icon={Layers} kicker="User index coverage" title="System Context" count={index.stats.total_files} countLabel="files">
      <Reveal>
        <button
          onClick={() => setOpen(o => !o)}
          className="telos-card w-full flex-row items-center justify-between text-left"
          aria-expanded={open}
          aria-label="Toggle system context breakdown"
        >
          <div className="flex items-center gap-3">
            {open ? <ChevronDown className="w-4 h-4 muted" /> : <ChevronRight className="w-4 h-4 muted" />}
            <span className="text-xs font-mono tabular-nums muted">
              {index.stats.total_files} files
              {daemonCount > 0 && <> · {daemonCount} broadcast</>}
              {index.interview_gaps.length > 0 && <> · {index.interview_gaps.length} gaps</>}
            </span>
          </div>
          <span className="pill">
            {open ? "collapse" : "expand"}
          </span>
        </button>
        {open && (
          <div className="mt-3 metric-grid">
            {(["identity", "voice", "mind", "taste", "shape", "ops", "domain"] as const).map(cat => {
              const files = byCat[cat] ?? [];
              if (files.length === 0) return null;
              return (
                <div key={cat} className="telos-card metric" style={{ cursor: "default" }}>
                  <div className="metric-label muted uppercase tracking-widest">{cat}</div>
                  <div className="metric-val font-mono tabular-nums">{files.length}</div>
                  <div className="metric-foot muted">files</div>
                </div>
              );
            })}
          </div>
        )}
      </Reveal>
    </Section>
  );
}
// ────────── Page ──────────

export default function LifePage() {
  const [home, setHome] = useState<HomeData | null>(null);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [finances, setFinances] = useState<FinancesData | null>(null);
  const [business, setBusiness] = useState<BusinessData | null>(null);
  const [work, setWork] = useState<WorkData | null>(null);
  const [goals, setGoals] = useState<GoalsData | null>(null);
  const [index, setIndex] = useState<UserIndex | null>(null);
  const [air, setAir] = useState<AirData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchJson = (path: string) => fetch(path).then(r => r.ok ? r.json() : null).catch(() => null);
    Promise.all([
      fetchJson("/api/life/home").then(setHome),
      fetchJson("/api/life/health").then(setHealth),
      fetchJson("/api/life/finances").then(setFinances),
      fetchJson("/api/life/business").then(setBusiness),
      fetchJson("/api/life/work").then(setWork),
      fetchJson("/api/life/goals").then(setGoals),
      fetchJson("/api/life/air").then(setAir),
      fetchJson("/api/user-index").then(setIndex),
    ]).catch(err => setError(String(err)));
  }, []);

  if (error) {
    return (
      <div className="px-5 sm:px-8 pt-10 max-w-5xl mx-auto">
        <div className="glass rounded-xl p-5 flex items-start gap-2.5">
          <span
            className="mt-1.5 w-2 h-2 rounded-full shrink-0"
            style={{ background: "var(--danger)", boxShadow: "0 0 8px var(--danger)" }}
          />
          <div>
            <h2 className="text-[15px] font-semibold" style={{ color: "var(--danger)" }}>Dashboard unavailable</h2>
            <p className="text-[13px] text-muted-foreground mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 sm:px-8 lg:px-10 pb-24 max-w-[1400px] mx-auto">
      <Hero home={home} />
      <DomainGrid business={business} health={health} finances={finances} work={work} goals={goals} air={air} />
      <ActiveGoals goals={goals} />
      <NextActionsSpark home={home} />
      <SystemContextDrawer index={index} />
    </div>
  );
}
