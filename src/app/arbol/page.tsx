"use client";

import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Cloud, ArrowLeft, Box, GitBranch, Timer, FileJson, FileCode } from "lucide-react";
import Link from "next/link";
import EmptyStateGuide from "@/components/EmptyStateGuide";
import { Reveal } from "@/components/kit/Reveal";
import { Section } from "@/components/kit/Section";

interface ArbolWorker {
  name: string;
  type: "action" | "pipeline" | "flow";
  cfName: string | null;
  lastModified: string;
}

interface ArbolDetail {
  name: string;
  type: "action" | "pipeline" | "flow";
  wrangler: string | null;
  source: string | null;
  lastModified: string;
}

/* ---------- theme-token color map (re-themes with [data-theme]) ---------- */

const TYPE_CONFIG = {
  action: {
    icon: Box,
    color: "var(--dim-creative)",
    label: "Action",
    plural: "Actions",
    kicker: "Single units of work",
  },
  pipeline: {
    icon: GitBranch,
    color: "var(--dim-freedom)",
    label: "Pipeline",
    plural: "Pipelines",
    kicker: "Chained action sequences",
  },
  flow: {
    icon: Timer,
    color: "var(--dim-rhythms)",
    label: "Flow",
    plural: "Flows",
    kicker: "Scheduled source-to-destination systems",
  },
} as const;

function displayName(name: string): string {
  return name.replace(/^_(A|P|F)_/, "");
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
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

/* ---------- hero ---------- */

function Hero({
  total,
  actions,
  pipelines,
  flows,
}: {
  total: number;
  actions: number;
  pipelines: number;
  flows: number;
}) {
  const stats = [
    { label: "Workers", value: total, icon: Cloud },
    { label: "Actions", value: actions, icon: Box },
    { label: "Pipelines", value: pipelines, icon: GitBranch },
    { label: "Flows", value: flows, icon: Timer },
  ].filter((s) => s.value > 0);

  return (
    <section className="pt-8 sm:pt-10">
      <div className="flex items-center gap-2.5 mb-4 text-[11px] font-mono uppercase tracking-[0.28em] text-muted-foreground">
        <span
          className="w-1.5 h-1.5 rounded-full anim-breathe"
          style={{ background: "var(--positive)", boxShadow: "0 0 8px var(--positive)" }}
        />
        LifeOS · Arbol
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold leading-tight text-foreground">Arbol</h1>
      <p className="mt-2 max-w-[70ch] text-[13px] leading-relaxed text-muted-foreground">
        Cloud execution layer on Cloudflare Workers. Three composable primitives: Actions
        (single units of work), Pipelines (chained action sequences), and Flows (scheduled
        source-to-destination systems).
      </p>

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

/* ---------- landing (list) view ---------- */

function ArbolLanding({
  workers,
  actions,
  pipelines,
  flows,
}: {
  workers: ArbolWorker[];
  actions: number;
  pipelines: number;
  flows: number;
}) {
  const grouped = {
    action: workers.filter((w) => w.type === "action"),
    pipeline: workers.filter((w) => w.type === "pipeline"),
    flow: workers.filter((w) => w.type === "flow"),
  };

  return (
    <div className="px-5 sm:px-8 lg:px-10 pb-24 max-w-[1400px] mx-auto">
      {workers.length === 0 && (
        <div className="pt-8">
          <EmptyStateGuide
            section="Arbol Pipelines"
            description="Cloud-side actions and pipelines that compose into multi-step workflows — think Unix pipes for cron-driven AI work."
            hideInterview
            daPromptExample="help me set up my first Arbol action"
          />
        </div>
      )}

      <Hero total={workers.length} actions={actions} pipelines={pipelines} flows={flows} />

      {(["action", "pipeline", "flow"] as const).map((type) => {
        const cfg = TYPE_CONFIG[type];
        const typeWorkers = grouped[type];
        if (typeWorkers.length === 0) return null;

        return (
          <Section
            key={type}
            icon={cfg.icon}
            kicker={cfg.kicker}
            title={cfg.plural}
            count={typeWorkers.length}
          >
            <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
              {typeWorkers.map((worker, i) => (
                <Reveal key={worker.name} delay={i * 40}>
                  <Link
                    href={`/arbol?name=${encodeURIComponent(worker.name)}`}
                    className="glass hover-lift rounded-xl p-4 flex flex-col gap-2 h-full"
                    style={{ textDecoration: "none" }}
                    aria-label={`Open ${cfg.label.toLowerCase()} ${displayName(worker.name)}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <cfg.icon className="w-4 h-4 shrink-0" style={{ color: cfg.color }} />
                      <span className="text-[13px] font-mono text-foreground truncate" title={worker.name}>
                        {displayName(worker.name)}
                      </span>
                      <span className="ml-auto shrink-0">
                        <TokenPill text={cfg.label} color={cfg.color} />
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-muted-foreground">
                      {worker.cfName && (
                        <span className="truncate" title={`Deployed as ${worker.cfName}`}>
                          {worker.cfName}
                        </span>
                      )}
                      {worker.lastModified && shortDate(worker.lastModified) && (
                        <span className="ml-auto shrink-0 tabular-nums">{shortDate(worker.lastModified)}</span>
                      )}
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
          </Section>
        );
      })}
    </div>
  );
}

/* ---------- detail view ---------- */

function ArbolDetailView({ detail }: { detail: ArbolDetail }) {
  const cfg = TYPE_CONFIG[detail.type];
  const Icon = cfg.icon;
  const modified = shortDate(detail.lastModified);

  return (
    <div className="px-5 sm:px-8 lg:px-10 pb-24 max-w-[1100px] mx-auto">
      <section className="pt-8 sm:pt-10">
        <div className="flex items-center gap-2.5 mb-4 text-[11px] font-mono uppercase tracking-[0.28em] text-muted-foreground">
          <span
            className="w-1.5 h-1.5 rounded-full anim-breathe"
            style={{ background: "var(--positive)", boxShadow: "0 0 8px var(--positive)" }}
          />
          LifeOS · Arbol
        </div>

        <div className="flex items-start gap-3">
          <Link
            href="/arbol"
            aria-label="Back to Arbol"
            className="grid place-items-center w-9 h-9 rounded-lg glass shrink-0 mt-0.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Icon className="w-4 h-4 shrink-0" style={{ color: cfg.color }} />
              <TokenPill text={cfg.label} color={cfg.color} />
              {modified && (
                <span className="text-[11px] font-mono text-muted-foreground tabular-nums">{modified}</span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-mono leading-tight text-foreground mt-2 break-all">
              {detail.name}
            </h1>
          </div>
        </div>
      </section>

      {detail.wrangler && (
        <Section icon={FileJson} kicker="Worker configuration" title="wrangler.jsonc">
          <Reveal>
            <div className="glass rounded-xl overflow-hidden">
              <pre
                className="text-xs font-mono overflow-x-auto leading-relaxed p-4 m-0 text-foreground"
                style={{ background: "var(--surface-1)" }}
                data-sensitive
              >
                <code>{detail.wrangler}</code>
              </pre>
            </div>
          </Reveal>
        </Section>
      )}

      {detail.source && (
        <Section icon={FileCode} kicker="Worker entrypoint" title="src/index.ts">
          <Reveal>
            <div className="glass rounded-xl overflow-hidden">
              <pre
                className="text-xs font-mono overflow-x-auto max-h-[600px] overflow-y-auto leading-relaxed p-4 m-0 text-foreground"
                style={{ background: "var(--surface-1)" }}
                data-sensitive
              >
                <code>{detail.source}</code>
              </pre>
            </div>
          </Reveal>
        </Section>
      )}

      {!detail.wrangler && !detail.source && (
        <div className="mt-10 glass rounded-xl text-center px-4 py-10">
          <Cloud className="w-8 h-8 mx-auto text-muted-foreground" style={{ opacity: 0.4 }} />
          <p className="text-[13px] text-muted-foreground mt-3">No readable files found in this worker.</p>
        </div>
      )}
    </div>
  );
}

/* ---------- page shell (data fetching unchanged) ---------- */

function ArbolPageInner() {
  const searchParams = useSearchParams();
  const workerName = searchParams.get("name");
  const isViewing = !!workerName;

  const { data: listData } = useQuery<{
    workers: ArbolWorker[];
    total: number;
    actions: number;
    pipelines: number;
    flows: number;
  }>({
    queryKey: ["arbol-list"],
    queryFn: async () => {
      const res = await fetch("/api/wiki/arbol");
      if (!res.ok) throw new Error("Failed to fetch arbol workers");
      return res.json();
    },
    staleTime: 30_000,
    enabled: !isViewing,
  });

  const { data: detailData } = useQuery<ArbolDetail>({
    queryKey: ["arbol-detail", workerName],
    queryFn: async () => {
      const res = await fetch(`/api/wiki/arbol/${encodeURIComponent(workerName!)}`);
      if (!res.ok) throw new Error("Failed to fetch worker");
      return res.json();
    },
    enabled: isViewing,
  });

  if (isViewing && detailData) {
    return <ArbolDetailView detail={detailData} />;
  }

  if (!isViewing && listData) {
    return (
      <ArbolLanding
        workers={listData.workers}
        actions={listData.actions}
        pipelines={listData.pipelines}
        flows={listData.flows}
      />
    );
  }

  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-[13px] font-mono text-muted-foreground">Loading Arbol…</div>
    </div>
  );
}

export default function ArbolPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-full">
          <div className="text-[13px] font-mono text-muted-foreground">Loading Arbol…</div>
        </div>
      }
    >
      <ArbolPageInner />
    </Suspense>
  );
}
