"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Crosshair } from "lucide-react";
import { useTelosData } from "../_v7/use-telos-data";
import type { Telos } from "../_v7/data";

// Per-item detail page. One static route (/telos/item) reads ?id=<ID> from the
// query — static-export safe, no generateStaticParams needed. Reuses the same
// useTelosData hook the dashboard uses, finds the item across every primitive
// array, and renders its fields plus relationships as links to other items.

interface Relation {
  label: string;
  ids: readonly string[];
}

interface ItemDetail {
  kind: string;
  id: string;
  title: string;
  summary?: string;
  body?: string;
  /** muted line shown in place of facts when nothing is tracked yet */
  emptyNote?: string;
  facts: Array<{ k: string; v: string }>;
  relations: Relation[];
}

// Short title = the pre-dash lead of a long title ("Career transition — …" → "Career transition").
// Keeps H1s and relation chips to a single line; matches the split idiom used across _v7.
function shortTitle(t: string): string {
  return t.split("—")[0].trim();
}

function findItem(telos: Telos, id: string): ItemDetail | null {
  const d = telos.dimensions.find((x) => x.id === id);
  if (d)
    return {
      kind: "Ideal State",
      id,
      title: d.label,
      facts: [
        { k: "current", v: String(d.cur) },
        { k: "ideal", v: String(d.ideal) },
        { k: "velocity", v: `${d.velo}/mo` },
      ],
      relations: [],
    };

  const p = telos.problems.find((x) => x.id === id);
  if (p)
    return {
      kind: "Problem",
      id,
      title: shortTitle(p.title),
      summary: p.summary,
      // note falls back to summary server-side — don't render the same text twice
      body: p.note !== p.summary ? p.note : undefined,
      facts: [{ k: "severity", v: p.severity }],
      relations: [
        { label: "affects", ids: p.affects },
        { label: "goals", ids: p.goals ?? [] },
      ],
    };

  const m = telos.missions.find((x) => x.id === id);
  if (m)
    return {
      kind: "Mission",
      id,
      title: shortTitle(m.title),
      summary: m.summary,
      // horizon only when non-empty — no empty subheading
      facts: m.horizon ? [{ k: "horizon", v: m.horizon }] : [],
      relations: [
        { label: "goals", ids: m.goals ?? [] },
        { label: "problems", ids: m.addresses ?? [] },
        { label: "strategies", ids: m.strategies ?? [] },
      ],
    };

  const g = telos.goals.find((x) => x.id === id);
  if (g) {
    const hasKpi = !!(g.kpi && g.kpi.trim());
    const hasProgress = typeof g.pct === "number" && g.pct > 0;
    const notTracked = !hasKpi && !hasProgress;
    // A TBC target means the principal hasn't set a measure yet — progress %
    // would be a fabricated number, so show the honest placeholder instead.
    const targetUnset = /\bTBC\b/i.test(g.target ?? "");
    return {
      kind: "Goal",
      id,
      title: shortTitle(g.title),
      summary: g.summary,
      body: g.body,
      facts: notTracked
        ? []
        : [
            ...(hasKpi ? [{ k: "kpi", v: g.kpi }] : []),
            ...(g.target ? [{ k: "target", v: g.target }] : []),
            { k: "progress", v: targetUnset ? "not yet tracked" : `${g.pct}%` },
          ],
      emptyNote: notTracked ? "not yet tracked" : undefined,
      relations: [
        { label: "serves", ids: g.serves ?? [] },
        { label: "dimensions", ids: g.dims },
        { label: "metrics", ids: g.metrics },
      ],
    };
  }

  const mt = telos.metrics.find((x) => x.id === id);
  if (mt)
    return {
      kind: "Metric",
      id,
      title: mt.label,
      facts: [
        { k: "value", v: `${mt.value}${mt.unit}` },
        { k: "trend", v: String(mt.trend) },
      ],
      relations: [{ label: "feeds", ids: mt.feeds }],
    };

  const c = telos.challenges.find((x) => x.id === id);
  if (c)
    return {
      kind: "Challenge",
      id,
      title: c.title,
      summary: c.summary,
      body: c.note,
      facts: [],
      relations: [{ label: "blocks", ids: c.blocks }],
    };

  const s = telos.strategies.find((x) => x.id === id);
  if (s)
    return {
      kind: "Strategy",
      id,
      title: s.title,
      summary: s.summary,
      facts: [],
      relations: [
        { label: "overcomes", ids: s.overcomes },
        { label: "implements", ids: s.implements },
      ],
    };

  const pr = telos.projects.find((x) => x.id === id);
  if (pr)
    return {
      kind: "Project",
      id,
      title: pr.title,
      facts: [{ k: "status", v: pr.status }],
      relations: [
        { label: "strategy", ids: [pr.strategy] },
        { label: "dimensions", ids: pr.dims },
        { label: "work", ids: pr.work.map((w) => w.id) },
      ],
    };

  for (const proj of telos.projects) {
    const w = proj.work.find((x) => x.id === id);
    if (w)
      return {
        kind: "Work",
        id,
        title: w.title,
        facts: [
          { k: "status", v: w.status },
          { k: "eta", v: w.eta },
          { k: "owner", v: w.owner },
        ],
        relations: [
          { label: "strategy", ids: [w.strategy] },
          { label: "project", ids: [proj.id] },
        ],
      };
  }

  const t = telos.team.find((x) => x.id === id);
  if (t)
    return {
      kind: "Team",
      id,
      title: t.name,
      body: t.note,
      facts: [
        { k: "role", v: t.role },
        { k: "kind", v: t.kind },
      ],
      relations: [{ label: "owns", ids: t.owns }],
    };

  const b = telos.budget.find((x) => x.id === id);
  if (b)
    return {
      kind: "Budget",
      id,
      title: b.label,
      body: b.note,
      facts: [
        { k: "kind", v: b.kind },
        { k: "value", v: b.value },
        { k: "of", v: b.of },
        { k: "pct", v: `${b.pct}%` },
      ],
      relations: [{ label: "funds", ids: b.funds }],
    };

  const r = telos.recommendations.find((x) => x.id === id);
  if (r)
    return {
      kind: "Recommendation",
      id,
      title: r.action,
      body: r.because,
      facts: [
        { k: "effort", v: r.effort },
        { k: "impact", v: r.impact },
      ],
      relations: [{ label: "upstream", ids: r.upstream }],
    };

  return null;
}

function titleFor(telos: Telos, id: string): string {
  const hit = findItem(telos, id);
  return hit ? `${id} · ${hit.title}` : id;
}

function ItemView() {
  const sp = useSearchParams();
  const id = sp.get("id") ?? "";
  const { telos } = useTelosData();

  const item = telos ? findItem(telos, id) : null;

  return (
    <div className="px-5 sm:px-8 lg:px-10 pb-24 pt-8 sm:pt-12 max-w-[880px] mx-auto">
      <Link
        href="/telos"
        className="inline-flex items-center gap-1.5 text-[12px] font-mono uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> TELOS
      </Link>

      {!item ? (
        <div className="glass rounded-xl p-5">
          <p className="text-[14px] text-muted-foreground">
            No TELOS item with id <span className="font-mono text-foreground">{id || "(none)"}</span>.
          </p>
          <Link href="/telos" className="inline-block mt-3 text-[12px] font-mono text-muted-foreground hover:text-foreground transition-colors">
            Back to TELOS
          </Link>
        </div>
      ) : (
        <article className="glass-2 rounded-2xl p-6 sm:p-8">
          <div className="text-[11px] font-mono uppercase tracking-[0.28em] mb-2" style={{ color: "var(--neon)" }}>
            {item.kind}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold leading-tight text-foreground flex items-center flex-wrap gap-3">
            <span className="text-[13px] font-mono px-2 py-0.5 rounded" style={{ color: "var(--neon)", background: "var(--surface-1)" }}>
              {item.id}
            </span>
            {item.title}
          </h1>

          {item.summary && (
            <p className="mt-4 text-[15px] leading-relaxed text-foreground" data-sensitive="">
              {item.summary}
            </p>
          )}
          {item.body && (
            <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground" data-sensitive="">
              {item.body}
            </p>
          )}

          {item.emptyNote && (
            <p className="mt-6 pt-6 text-[12px] font-mono uppercase tracking-[0.16em] text-muted-foreground" style={{ borderTop: "1px solid var(--hairline)" }}>
              {item.emptyNote}
            </p>
          )}

          {item.facts.length > 0 && (
            <dl className="flex flex-wrap gap-x-8 gap-y-3 mt-6 pt-6" style={{ borderTop: "1px solid var(--hairline)" }}>
              {item.facts.map((f) => (
                <div key={f.k} className="flex flex-col gap-0.5">
                  <dt className="text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground">{f.k}</dt>
                  <dd className="text-[15px] font-mono text-foreground tabular-nums" data-sensitive="">{f.v}</dd>
                </div>
              ))}
            </dl>
          )}

          {telos && item.relations.some((r) => r.ids.length > 0) && (
            <div className="flex flex-col gap-3 mt-6 pt-6" style={{ borderTop: "1px solid var(--hairline)" }}>
              {item.relations
                .filter((r) => r.ids.length > 0)
                .map((r) => (
                  <div key={r.label} className="flex items-baseline gap-3 flex-wrap">
                    <span className="text-[11px] font-mono uppercase tracking-[0.16em] text-muted-foreground shrink-0">{r.label}</span>
                    <div className="flex flex-wrap gap-1.5">
                      {r.ids.map((rid) => (
                        <Link
                          key={rid}
                          href={`/telos/item?id=${encodeURIComponent(rid)}`}
                          className="inline-flex items-center gap-1 text-[12px] font-mono px-2.5 py-1 rounded-full text-muted-foreground hover:text-foreground transition-colors"
                          style={{ background: "var(--surface-1)", border: "1px solid var(--hairline)" }}
                        >
                          <Crosshair className="w-3 h-3" style={{ color: "var(--neon-3)" }} />
                          {titleFor(telos, rid)}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </article>
      )}
    </div>
  );
}

export default function TelosItemPage() {
  return (
    <Suspense fallback={<div className="px-8 pt-10 text-[13px] font-mono text-muted-foreground">Loading…</div>}>
      <ItemView />
    </Suspense>
  );
}
