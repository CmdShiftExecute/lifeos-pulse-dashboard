"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import UnifiedWorkDashboard from "@/components/activity/UnifiedWorkDashboard";
import ObservabilityDashboard from "@/components/activity/ObservabilityDashboard";
import NativeDashboard from "@/components/activity/NativeDashboard";
import OptimizeDashboard from "@/components/activity/OptimizeDashboard";
import LoopDashboard from "@/components/activity/LoopDashboard";
import SystemHealthVitals from "@/components/activity/insights/SystemHealthVitals";
import { Reveal } from "@/components/kit/Reveal";
import { Section } from "@/components/kit/Section";
import { Repeat, TrendingUp, Lightbulb, Terminal, RefreshCw, Zap, Layers } from "lucide-react";

const NoveltyPage = dynamic(() => import("../novelty/page"), { ssr: false });
const LadderPage = dynamic(() => import("../ladder/page"), { ssr: false });

// ─── Main Agents Page ───
// Tabs: Iterate | Optimize | Ideate | Loop | Native | Ladder (left) | Actions (right)
// System Health Vitals bar persists across all tabs
//
// CANONICAL DOC for what each tab means, ISA frontmatter mapping, and dashboard
// component links: ~/.claude/LIFEOS/ALGORITHM/modes/README.md
// Per-mode doctrine: ~/.claude/LIFEOS/ALGORITHM/modes/{iterate,optimize,ideate,loop,native}.md
// Short summary lives in ~/.claude/LIFEOS/DOCUMENTATION/Algorithm/AlgorithmSystem.md
// under "## Mode System". This `modeTabs` array below is the runtime source of truth
// for tab labels and ordering — the docs above must stay in sync with it.

type Tab = "iterate" | "optimize" | "ideate" | "loop" | "native" | "ladder" | "actions";
type Dimension = "health" | "money" | "freedom" | "creative" | "relationships" | "rhythms";

const modeTabs: { id: Tab; label: string; icon: typeof Repeat }[] = [
  { id: "iterate", label: "Iterate", icon: Repeat },
  { id: "optimize", label: "Optimize", icon: TrendingUp },
  { id: "ideate", label: "Ideate", icon: Lightbulb },
  { id: "loop", label: "Loop", icon: RefreshCw },
  { id: "native", label: "Native", icon: Terminal },
  { id: "ladder", label: "Ladder", icon: Layers },
];

const actionsTab: { id: Tab; label: string; icon: typeof Repeat } = {
  id: "actions",
  label: "Actions",
  icon: Zap,
};

const allTabs = [...modeTabs, actionsTab];

const tabDimensions: Record<Tab, Dimension> = {
  iterate: "creative",
  optimize: "rhythms",
  ideate: "freedom",
  loop: "relationships",
  native: "money",
  ladder: "health",
  actions: "creative",
};

/* ---------- theme-token color maps (re-theme with [data-theme]) ---------- */

const DIM_COLOR: Record<Dimension, string> = {
  health: "var(--dim-health)",
  money: "var(--dim-money)",
  freedom: "var(--dim-freedom)",
  creative: "var(--dim-creative)",
  relationships: "var(--dim-relationships)",
  rhythms: "var(--dim-rhythms)",
};

// One-line doctrine per tab, condensed from ~/.claude/LIFEOS/ALGORITHM/modes/README.md.
const TAB_KICKER: Record<Tab, string> = {
  iterate: "Standard 7-phase Algorithm loop",
  optimize: "Refinement against an eval metric",
  ideate: "Evolutionary ideation runs",
  loop: "Goal-driven iteration, fresh context",
  native: "Native-mode sessions, no ISA",
  ladder: "External improvement pipeline",
  actions: "Observability event timeline",
};

/* ---------- tab button (flagship underline style) ---------- */

function ModeTab({
  id,
  label,
  icon: Icon,
  active,
  color,
  onSelect,
}: {
  id: Tab;
  label: string;
  icon: typeof Repeat;
  active: boolean;
  color: string;
  onSelect: (t: Tab) => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={() => onSelect(id)}
      className="relative inline-flex items-center gap-1.5 px-1 py-1.5 bg-transparent border-none cursor-pointer text-[12px] font-mono uppercase tracking-[0.12em] font-semibold transition-colors"
      style={{ color: active ? color : "hsl(var(--muted-foreground))" }}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
      {active && (
        <span
          className="absolute left-0 right-0 -bottom-[3px] h-[2px] rounded-full"
          style={{ background: color, boxShadow: `0 0 10px ${color}` }}
        />
      )}
    </button>
  );
}

/* ---------- page ---------- */

export default function AgentsPage() {
  const [tab, setTab] = useState<Tab>("iterate");
  const active = allTabs.find((t) => t.id === tab) ?? modeTabs[0];

  return (
    <div className="px-5 sm:px-8 lg:px-10 pb-24 max-w-[1400px] mx-auto">
      {/* hero */}
      <section className="pt-8 sm:pt-10">
        <div className="flex items-center gap-2.5 mb-4 text-[11px] font-mono uppercase tracking-[0.28em] text-muted-foreground">
          <span
            className="w-1.5 h-1.5 rounded-full anim-breathe"
            style={{ background: "var(--positive)", boxShadow: "0 0 8px var(--positive)" }}
          />
          LifeOS · Agents
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold leading-tight text-foreground">Agents</h1>
        <p className="mt-3 text-[13px] text-muted-foreground max-w-[70ch]">
          Algorithm mode consoles and the observability actions timeline.
        </p>

        {/* System health vitals — real polled data (voice, hooks, docs, sessions).
            The shared component renders nothing until data arrives; empty:hidden
            keeps this wrapper from leaving a hollow gap in that case. */}
        <div className="mt-6 empty:hidden">
          <SystemHealthVitals />
        </div>
      </section>

      {/* Mode console — one section, re-titled by the active tab */}
      <Section icon={active.icon} kicker={TAB_KICKER[tab]} title={active.label}>
        <Reveal>
          <div
            role="tablist"
            aria-label="Agent mode dashboards"
            className="flex items-center gap-5 flex-wrap mb-4 pb-1.5"
            style={{ borderBottom: "1px solid var(--hairline)" }}
          >
            {modeTabs.map(({ id, label, icon }) => (
              <ModeTab
                key={id}
                id={id}
                label={label}
                icon={icon}
                active={tab === id}
                color={DIM_COLOR[tabDimensions[id]]}
                onSelect={setTab}
              />
            ))}
            <span className="flex-1" />
            <ModeTab
              id={actionsTab.id}
              label={actionsTab.label}
              icon={actionsTab.icon}
              active={tab === "actions"}
              color={DIM_COLOR[tabDimensions.actions]}
              onSelect={setTab}
            />
          </div>

          {/* Tab content */}
          <div role="tabpanel" aria-label={`${active.label} dashboard`} className="flex flex-col">
            {tab === "iterate" && <UnifiedWorkDashboard />}
            {tab === "optimize" && <OptimizeDashboard />}
            {tab === "ideate" && <NoveltyPage />}
            {tab === "loop" && <LoopDashboard />}
            {tab === "native" && <NativeDashboard />}
            {tab === "ladder" && <LadderPage />}
            {tab === "actions" && <ObservabilityDashboard />}
          </div>
        </Reveal>
      </Section>
    </div>
  );
}
