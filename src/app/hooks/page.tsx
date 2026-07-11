"use client";

import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Webhook, ArrowLeft, FileCode, Globe, CircleDashed } from "lucide-react";
import Link from "next/link";
import EmptyStateGuide from "@/components/EmptyStateGuide";
import { Reveal } from "@/components/kit/Reveal";
import { Section } from "@/components/kit/Section";

interface HookEntry {
  event: string;
  matcher: string;
  type: string;
  command: string;
  fileName: string;
}

interface HookDetail {
  name: string;
  content: string;
  filePath: string;
  lastModified: string;
  size: number;
}

type Dimension = "health" | "money" | "freedom" | "creative" | "relationships" | "rhythms";

/* ---------- theme-token color maps (re-theme with [data-theme]) ---------- */

const DIM_COLORS: Record<Dimension, string> = {
  health: "var(--dim-health)",
  money: "var(--dim-money)",
  freedom: "var(--dim-freedom)",
  creative: "var(--dim-creative)",
  relationships: "var(--dim-relationships)",
  rhythms: "var(--dim-rhythms)",
};

const EVENT_DIMENSIONS: Record<string, Dimension> = {
  PreToolUse: "creative",
  PostToolUse: "rhythms",
  PostToolUseFailure: "creative",
  UserPromptSubmit: "creative",
  Notification: "freedom",
  PreCompact: "relationships",
  PostCompact: "rhythms",
  SessionStart: "freedom",
  SessionEnd: "relationships",
  SubagentStart: "health",
  SubagentStop: "relationships",
  Stop: "relationships",
  StopFailure: "creative",
  TaskCreated: "money",
  TaskCompleted: "health",
  TeammateIdle: "rhythms",
  ConfigChange: "money",
  PermissionRequest: "creative",
  FileChanged: "freedom",
  CwdChanged: "rhythms",
  InstructionsLoaded: "relationships",
  Elicitation: "freedom",
  ElicitationResult: "relationships",
};

function eventDimension(event: string): Dimension {
  return EVENT_DIMENSIONS[event] || "money";
}

// Failure/error events read as danger regardless of their dimension hue.
function eventColor(event: string): string {
  if (event.includes("Failure") || event.includes("Error")) return "var(--danger)";
  return DIM_COLORS[eventDimension(event)];
}

const TYPE_COLOR: Record<string, string> = {
  http: "var(--dim-freedom)",
  command: "var(--dim-money)",
};

const MUTED = "hsl(var(--muted-foreground))";

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

function Hero({ hookCount, coveredCount }: { hookCount: number; coveredCount: number }) {
  // The API derives its event list from registered hooks, so a separate
  // "catalog" stat would always duplicate "Events wired" — omitted as dishonest.
  const stats = [
    { label: "Hooks", value: hookCount, icon: Webhook },
    { label: "Events wired", value: coveredCount, icon: FileCode },
  ].filter((s) => s.value > 0);

  return (
    <section className="pt-8 sm:pt-10">
      <div className="flex items-center gap-2.5 mb-4 text-[11px] font-mono uppercase tracking-[0.28em] text-muted-foreground">
        <span
          className="w-1.5 h-1.5 rounded-full anim-breathe"
          style={{ background: "var(--positive)", boxShadow: "0 0 8px var(--positive)" }}
        />
        LifeOS · Hooks
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold leading-tight text-foreground">Hooks</h1>
      <p className="mt-3 max-w-[70ch] text-[14px] leading-relaxed text-muted-foreground">
        Lifecycle event handlers that run shell commands or HTTP requests in response to Claude
        Code events. Configured in settings.json; hooks intercept tool calls, session events, and
        system changes.
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

/* ---------- landing ---------- */

function HookCard({ hook, index }: { hook: HookEntry; index: number }) {
  const isHttp = hook.type === "http";
  const TypeIcon = isHttp ? Globe : FileCode;
  const typeColor = TYPE_COLOR[hook.type] ?? MUTED;
  return (
    <Reveal delay={index * 40}>
      <Link
        href={`/hooks?name=${encodeURIComponent(hook.fileName)}`}
        className="glass hover-lift rounded-xl p-4 h-full flex flex-col gap-2"
        style={{ textDecoration: "none" }}
        aria-label={`View source of ${hook.fileName}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <TypeIcon className="w-4 h-4 shrink-0" style={{ color: typeColor }} />
          <span className="text-[13px] font-mono text-foreground truncate" title={hook.fileName}>
            {hook.fileName}
          </span>
          <span className="ml-auto shrink-0">
            <TokenPill text={hook.type} color={typeColor} />
          </span>
        </div>
        {hook.matcher && (
          <div className="text-[11px] font-mono text-muted-foreground truncate">
            matcher <span className="text-foreground">{hook.matcher}</span>
          </div>
        )}
        {hook.command && (
          <div
            className="text-[11px] font-mono text-muted-foreground truncate"
            data-sensitive
            title={hook.command}
          >
            {hook.command}
          </div>
        )}
      </Link>
    </Reveal>
  );
}

function HooksLanding({ hooks, events }: { hooks: HookEntry[]; events: string[] }) {
  const grouped = new Map<string, HookEntry[]>();
  for (const hook of hooks) {
    const list = grouped.get(hook.event) || [];
    list.push(hook);
    grouped.set(hook.event, list);
  }

  for (const event of events) {
    if (!grouped.has(event)) {
      grouped.set(event, []);
    }
  }

  const sortedEvents = [...grouped.keys()].sort();
  const covered = sortedEvents.filter((e) => (grouped.get(e) || []).length > 0);
  const uncovered = sortedEvents.filter((e) => (grouped.get(e) || []).length === 0);

  return (
    <div className="px-5 sm:px-8 lg:px-10 pb-24 max-w-[1400px] mx-auto">
      {hooks.length === 0 && (
        <div className="pt-8">
          <EmptyStateGuide
            section="Hook Activity"
            description="Per-hook health, latency, and recent invocations. Populates as hooks fire during your sessions."
            hideInterview
            daPromptExample="show me which hooks fired in this session"
          />
        </div>
      )}

      <Hero hookCount={hooks.length} coveredCount={covered.length} />

      {covered.length > 0 && (
        <Section icon={Webhook} kicker="Handlers by lifecycle event" title="Registered Hooks" count={hooks.length}>
          <div className="space-y-8">
            {covered.map((event) => {
              const eventHooks = grouped.get(event) || [];
              const color = eventColor(event);
              return (
                <div key={event}>
                  <Reveal>
                    <div className="flex items-center gap-2.5 mb-3">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: color, boxShadow: `0 0 8px ${color}` }}
                      />
                      <h3
                        className="text-[12px] font-mono font-semibold uppercase tracking-[0.14em]"
                        style={{ color }}
                      >
                        {event}
                      </h3>
                      <span className="text-[11px] font-mono text-muted-foreground tabular-nums">
                        {String(eventHooks.length).padStart(2, "0")}
                      </span>
                    </div>
                  </Reveal>
                  <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
                    {eventHooks.map((hook, i) => (
                      <HookCard key={`${hook.event}-${hook.matcher}-${i}`} hook={hook} index={i} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {uncovered.length > 0 && (
        <Section
          icon={CircleDashed}
          kicker="Catalog events with no handlers"
          title="Uncovered Events"
          count={uncovered.length}
        >
          <Reveal>
            <div className="glass rounded-xl p-4">
              <div className="flex flex-wrap gap-1.5">
                {uncovered.map((event) => (
                  <LabelPill key={event} text={event} />
                ))}
              </div>
            </div>
          </Reveal>
        </Section>
      )}
    </div>
  );
}

/* ---------- detail ---------- */

function HookDetailView({ hook }: { hook: HookDetail }) {
  return (
    <div className="px-5 sm:px-8 lg:px-10 pb-24 max-w-[1400px] mx-auto">
      <section className="pt-8 sm:pt-10">
        <div className="flex items-center gap-2.5 mb-4 text-[11px] font-mono uppercase tracking-[0.28em] text-muted-foreground">
          <span
            className="w-1.5 h-1.5 rounded-full anim-breathe"
            style={{ background: "var(--positive)", boxShadow: "0 0 8px var(--positive)" }}
          />
          LifeOS · Hooks · Source
        </div>

        <div className="flex items-start gap-3">
          <Link
            href="/hooks"
            aria-label="Back to hooks"
            className="grid place-items-center w-9 h-9 rounded-lg glass shrink-0 text-muted-foreground hover:text-foreground transition-colors mt-0.5"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold leading-tight text-foreground break-all">
              {hook.name}
            </h1>
            <p className="text-[12px] font-mono text-muted-foreground tabular-nums mt-1.5">
              {(hook.size / 1024).toFixed(1)} KB ·{" "}
              {new Date(hook.lastModified).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
            {hook.filePath && (
              <p
                className="text-[11px] font-mono text-muted-foreground truncate mt-1"
                data-sensitive
                title={hook.filePath}
              >
                {hook.filePath}
              </p>
            )}
          </div>
        </div>
      </section>

      <Reveal className="mt-6">
        <div className="glass rounded-xl overflow-hidden">
          <pre
            className="text-xs font-mono overflow-x-auto max-h-[700px] overflow-y-auto leading-relaxed p-4 m-0 text-foreground"
            style={{ background: "var(--surface-1)" }}
          >
            <code>{hook.content}</code>
          </pre>
        </div>
      </Reveal>
    </div>
  );
}

/* ---------- page shell (fetching + routing unchanged) ---------- */

function QueryErrorCard({ title, message }: { title: string; message: string }) {
  return (
    <div className="px-5 sm:px-8 lg:px-10 pt-10 max-w-[1400px] mx-auto">
      <div className="glass rounded-xl p-5 flex items-start gap-2.5">
        <span
          className="mt-1.5 w-2 h-2 rounded-full shrink-0"
          style={{ background: "var(--danger)", boxShadow: "0 0 8px var(--danger)" }}
        />
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold" style={{ color: "var(--danger)" }}>
            {title}
          </h2>
          <p className="text-[13px] text-muted-foreground mt-1">{message}</p>
          <Link
            href="/hooks"
            className="inline-block text-[12px] font-mono mt-3 text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to hooks
          </Link>
        </div>
      </div>
    </div>
  );
}

function HooksPageInner() {
  const searchParams = useSearchParams();
  const hookName = searchParams.get("name");
  const isViewing = !!hookName;

  const { data: listData, error: listError } = useQuery<{ hooks: HookEntry[]; total: number; events: string[] }>({
    queryKey: ["hooks-list"],
    queryFn: async () => {
      const res = await fetch("/api/wiki/hooks");
      if (!res.ok) throw new Error("Failed to fetch hooks");
      return res.json();
    },
    staleTime: 30_000,
    enabled: !isViewing,
  });

  const { data: detailData, error: detailError } = useQuery<HookDetail>({
    queryKey: ["hook-detail", hookName],
    queryFn: async () => {
      const res = await fetch(`/api/wiki/hooks/${encodeURIComponent(hookName!)}`);
      if (!res.ok) throw new Error("Failed to fetch hook");
      return res.json();
    },
    enabled: isViewing,
  });

  if (isViewing && detailData) {
    return <HookDetailView hook={detailData} />;
  }

  if (isViewing && detailError) {
    return <QueryErrorCard title="Failed to load hook source" message={String(detailError)} />;
  }

  if (!isViewing && listData) {
    return <HooksLanding hooks={listData.hooks} events={listData.events} />;
  }

  if (!isViewing && listError) {
    return <QueryErrorCard title="Failed to load hooks" message={String(listError)} />;
  }

  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-[13px] font-mono text-muted-foreground">Loading…</div>
    </div>
  );
}

export default function HooksPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-full">
          <div className="text-[13px] font-mono text-muted-foreground">Loading…</div>
        </div>
      }
    >
      <HooksPageInner />
    </Suspense>
  );
}
