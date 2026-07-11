"use client";
import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from "recharts";
import {
  Building2,
  Briefcase,
  TrendingUp,
  FileText,
  BarChart3,
  Handshake,
  Users,
  Receipt,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import EmptyStateGuide from "@/components/EmptyStateGuide";
import { Reveal } from "@/components/kit/Reveal";
import { Section } from "@/components/kit/Section";

interface BusinessData {
  latestRevenueReport?: string;
  revenueSummary?: string;
  revenueByProduct?: string;
  revenueAllSections?: Array<{ heading: string; body: string }>;
  businessOverview?: Array<{ heading: string; body: string }>;
  ulOverview?: Array<{ heading: string; body: string }>;
}

interface RevenueMetrics {
  total?: string;
  deals?: string;
  accounts?: string;
  avgDeal?: string;
  largest?: string;
  smallest?: string;
}

interface ProductRow {
  product: string;
  revenue: number;
  pct: string;
  deals: string;
  avgPrice: string;
}

function parseMetrics(md?: string): RevenueMetrics {
  if (!md) return {};
  const out: Record<string, string> = {};
  for (const line of md.split("\n")) {
    const m = line.match(/\*\*([^*]+)\*\*\s*\|\s*([^|]+)\|/);
    if (m) out[m[1].trim().toLowerCase()] = m[2].trim();
  }
  return {
    total: out["total revenue"],
    deals: out["deals closed"],
    accounts: out["unique accounts"],
    avgDeal: out["average deal (by line item)"],
    largest: out["largest single deal"],
    smallest: out["smallest single deal"],
  };
}

function parseProducts(md?: string): ProductRow[] {
  if (!md) return [];
  const out: ProductRow[] = [];
  const lines = md.split("\n").filter((l) => l.trim().startsWith("|") && l.includes("$"));
  for (const line of lines) {
    const cells = line
      .split("|")
      .map((c) => c.trim())
      .filter(Boolean);
    if (cells.length < 4) continue;
    const name = cells[0].replace(/\*\*/g, "");
    const revenue = parseInt(cells[1].replace(/[$,]/g, ""), 10);
    if (isNaN(revenue)) continue;
    out.push({
      product: name,
      revenue,
      pct: cells[2] || "",
      deals: cells[3] || "",
      avgPrice: cells[4] || "",
    });
  }
  return out.sort((a, b) => b.revenue - a.revenue);
}

/* ---------- theme-token color maps (re-theme with [data-theme]) ---------- */

const PRODUCT_COLORS = [
  "var(--dim-health)",
  "var(--dim-money)",
  "var(--neon-3)",
  "var(--dim-creative)",
  "var(--dim-relationships)",
  "var(--dim-rhythms)",
];

/* ---------- hero ---------- */

function Hero({ metrics, latestReport }: { metrics: RevenueMetrics; latestReport?: string }) {
  const tiles: Array<{ label: string; value?: string; icon: LucideIcon }> = [
    { label: "Deals", value: metrics.deals, icon: Handshake },
    { label: "Accounts", value: metrics.accounts, icon: Users },
    { label: "Avg Deal", value: metrics.avgDeal, icon: Receipt },
    { label: "Largest", value: metrics.largest, icon: Trophy },
  ].filter((t) => !!t.value);

  return (
    <section className="pt-8 sm:pt-10">
      <div className="flex items-center gap-2.5 mb-4 text-[11px] font-mono uppercase tracking-[0.28em] text-muted-foreground">
        <span
          className="w-1.5 h-1.5 rounded-full anim-breathe"
          style={{ background: "var(--positive)", boxShadow: "0 0 8px var(--positive)" }}
        />
        LifeOS · Business
      </div>

      {metrics.total ? (
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.16em] mb-1.5" style={{ color: "var(--neon)" }}>
            Latest revenue
          </div>
          <h1
            className="text-4xl sm:text-5xl font-bold font-mono tabular-nums leading-[1.05] text-foreground"
            data-sensitive
          >
            {metrics.total}
          </h1>
        </div>
      ) : (
        <h1 className="text-3xl sm:text-4xl font-bold leading-[1.12] text-foreground">Business</h1>
      )}

      {latestReport && (
        <p className="text-[11px] font-mono text-muted-foreground mt-2">report · {latestReport}</p>
      )}

      {tiles.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-3">
          {tiles.map((t) => (
            <div key={t.label} className="glass rounded-lg px-3.5 py-3 min-w-[124px]" data-sensitive>
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                <t.icon className="w-3.5 h-3.5" />
                <span className="text-[10px] font-mono uppercase tracking-[0.16em]">{t.label}</span>
              </div>
              <div className="text-2xl font-bold font-mono text-foreground tabular-nums">{t.value}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ---------- revenue by product (recharts, token-themed) ---------- */

function RevenueByProduct({ products }: { products: ProductRow[] }) {
  if (products.length === 0) return null;
  return (
    <Section icon={BarChart3} kicker="Where revenue concentrates" title="Revenue by Product" count={products.length}>
      <Reveal>
        <div className="glass rounded-xl p-4 sm:p-5">
          <div data-sensitive style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={products} layout="vertical" margin={{ left: 20, right: 60 }}>
                <XAxis
                  type="number"
                  stroke="var(--text-dim)"
                  fontSize={11}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                />
                <YAxis
                  type="category"
                  dataKey="product"
                  stroke="var(--text-dim)"
                  fontSize={11}
                  width={200}
                />
                <Tooltip
                  cursor={{ fill: "var(--surface-1)" }}
                  contentStyle={{
                    background: "var(--surface-3)",
                    border: "1px solid var(--hairline-strong)",
                    borderRadius: 8,
                    fontSize: 12,
                    color: "hsl(var(--foreground))",
                    backdropFilter: "blur(8px)",
                  }}
                  formatter={(v: number) => [`$${v.toLocaleString()}`, "Revenue"]}
                />
                <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                  {products.map((_, i) => (
                    <Cell key={i} fill={PRODUCT_COLORS[i % PRODUCT_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div
            className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4 pt-4"
            style={{ borderTop: "1px solid var(--hairline)" }}
            data-sensitive
          >
            {products.map((p, i) => (
              <div key={p.product} className="flex items-center gap-3 text-[12px]">
                <span
                  className="w-3 h-3 rounded shrink-0"
                  style={{ background: PRODUCT_COLORS[i % PRODUCT_COLORS.length] }}
                />
                <span className="flex-1 truncate text-foreground" title={p.product}>
                  {p.product}
                </span>
                <span className="font-mono tabular-nums" style={{ color: PRODUCT_COLORS[i % PRODUCT_COLORS.length] }}>
                  {p.pct}
                </span>
                <span className="font-mono tabular-nums text-muted-foreground">{p.deals}</span>
              </div>
            ))}
          </div>
        </div>
      </Reveal>
    </Section>
  );
}

/* ---------- section card grid (markdown sections → glass cards) ---------- */

function SectionGrid({
  sections,
  icon: Icon,
  accent,
}: {
  sections?: Array<{ heading: string; body: string }>;
  icon: LucideIcon;
  accent: string;
}) {
  if (!sections || sections.length === 0) return null;
  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
      {sections.map((s, i) => (
        <Reveal key={i} delay={i * 40}>
          <div className="glass rounded-xl p-4 h-full">
            <div className="flex items-center gap-2 mb-2 min-w-0">
              <Icon className="w-4 h-4 shrink-0" style={{ color: accent }} />
              <h3 className="text-[14px] font-semibold text-foreground truncate" title={s.heading}>
                {s.heading}
              </h3>
            </div>
            <div className="text-[12px] leading-relaxed whitespace-pre-wrap line-clamp-6 text-muted-foreground" data-sensitive>
              {s.body}
            </div>
          </div>
        </Reveal>
      ))}
    </div>
  );
}

/* ---------- page ---------- */

export default function BusinessPage() {
  const [data, setData] = useState<BusinessData | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/life/business")
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch((e) => setError(String(e)));
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
            <h2 className="text-[15px] font-semibold" style={{ color: "var(--danger)" }}>Failed to load business</h2>
            <p className="text-[13px] text-muted-foreground mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }
  if (!data) return <div className="px-5 sm:px-8 pt-10 text-[13px] font-mono text-muted-foreground">Loading Business…</div>;

  const metrics = parseMetrics(data.revenueSummary);
  const products = parseProducts(data.revenueByProduct);
  const isFreshInstall =
    !data.revenueSummary &&
    !data.revenueByProduct &&
    (!data.businessOverview || data.businessOverview.length === 0) &&
    (!data.ulOverview || data.ulOverview.length === 0) &&
    (!data.revenueAllSections || data.revenueAllSections.length === 0);

  return (
    <div className="px-5 sm:px-8 lg:px-10 pb-24 max-w-[1400px] mx-auto">
      {isFreshInstall && (
        <div className="pt-8">
          <EmptyStateGuide
            section="Business Context"
            description="Your business operations data — revenue streams, customers, deals, pipeline."
            userDir="BUSINESS"
            daPromptExample="walk me through my business context"
          />
        </div>
      )}
      <Hero metrics={metrics} latestReport={data.latestRevenueReport} />
      <RevenueByProduct products={products} />
      {data.businessOverview && data.businessOverview.length > 0 && (
        <Section icon={Briefcase} kicker="Operating context" title="Business Overview" count={data.businessOverview.length}>
          <SectionGrid sections={data.businessOverview} icon={Briefcase} accent="var(--dim-creative)" />
        </Section>
      )}
      {data.ulOverview && data.ulOverview.length > 0 && (
        <Section icon={Building2} kicker="Entity on record" title="Company Overview" count={data.ulOverview.length}>
          <SectionGrid sections={data.ulOverview} icon={TrendingUp} accent="var(--neon-3)" />
        </Section>
      )}
      {data.revenueAllSections && data.revenueAllSections.length > 0 && (
        <Section icon={FileText} kicker="Latest report, full text" title="Revenue Details" count={data.revenueAllSections.length}>
          <SectionGrid sections={data.revenueAllSections} icon={FileText} accent="var(--dim-relationships)" />
        </Section>
      )}
    </div>
  );
}
