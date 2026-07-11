"use client";

import { Suspense, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import MarkdownRenderer from "@/components/wiki/MarkdownRenderer";
import { Zap, ArrowLeft, Pencil, Check, X, Loader2, Lock, Globe, Workflow } from "lucide-react";
import Link from "next/link";
import { Reveal } from "@/components/kit/Reveal";

interface SkillMeta {
  name: string;
  description: string;
  effort: string;
  hasWorkflows: boolean;
  lastModified: string;
  /** "core" = local ~/.claude/skills file; "builtin" = Claude harness-provided. */
  source?: string;
}

interface SkillDetail {
  name: string;
  description: string;
  effort: string;
  content: string;
  filePath: string;
  lastModified: string;
  wordCount: number;
}

/* ---------- theme-token color maps (re-theme with [data-theme]) ---------- */

const MUTED = "hsl(var(--muted-foreground))";

// Same tone logic as before (green-up / flat-muted / coral-down), mapped to tokens.
function effortColor(effort: string): string {
  if (effort === "easy" || effort === "low") return "var(--positive)";
  if (effort === "hard" || effort === "high") return "var(--danger)";
  return MUTED;
}

function fmtDate(iso: string): string | null {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
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

function Hero({ skills }: { skills: SkillMeta[] }) {
  const publicCount = skills.filter((s) => !s.name.startsWith("_")).length;
  const privateCount = skills.filter((s) => s.name.startsWith("_")).length;
  const workflowCount = skills.filter((s) => s.hasWorkflows).length;

  const stats = [
    { label: "Skills", value: skills.length, icon: Zap },
    { label: "Public", value: publicCount, icon: Globe },
    { label: "Private", value: privateCount, icon: Lock },
    { label: "Workflows", value: workflowCount, icon: Workflow },
  ].filter((s) => s.value > 0);

  return (
    <section className="pt-8 sm:pt-10">
      <div className="flex items-center gap-2.5 mb-4 text-[11px] font-mono uppercase tracking-[0.28em] text-muted-foreground">
        <span
          className="w-1.5 h-1.5 rounded-full anim-breathe"
          style={{ background: "var(--positive)", boxShadow: "0 0 8px var(--positive)" }}
        />
        LifeOS · Skills
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold leading-tight text-foreground">Skills</h1>
      <p className="mt-3 max-w-[70ch] text-[14px] leading-relaxed text-muted-foreground">
        Domain-specific capabilities that activate on trigger phrases. Each skill bundles prompts,
        workflows, tools, and templates into a self-contained unit.
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

/* ---------- catalog ---------- */

function SkillCardInner({ skill }: { skill: SkillMeta }) {
  const updated = fmtDate(skill.lastModified);
  const isBuiltin = skill.source === "builtin";
  return (
    <>
      <div className="flex items-center gap-2 min-w-0">
        <Zap className="w-4 h-4 shrink-0" style={{ color: isBuiltin ? "hsl(var(--muted-foreground))" : "var(--neon)" }} />
        <h3 className="text-[14px] font-semibold text-foreground truncate">{skill.name}</h3>
      </div>
      {skill.description && (
        <p className="text-[13px] leading-relaxed text-muted-foreground mt-2">
          {skill.description.slice(0, 140)}
          {skill.description.length > 140 ? "…" : ""}
        </p>
      )}
      <div className="flex items-center gap-1.5 flex-wrap mt-auto pt-3">
        {isBuiltin ? (
          <TokenPill text="built-in" color="hsl(var(--muted-foreground))" title="Provided by the Claude harness — not a local file" />
        ) : (
          <>
            {skill.effort && <TokenPill text={skill.effort} color={effortColor(skill.effort)} />}
            {skill.hasWorkflows && <LabelPill text="workflows" />}
          </>
        )}
        {updated && (
          <span className="ml-auto text-[11px] font-mono text-muted-foreground tabular-nums">{updated}</span>
        )}
      </div>
    </>
  );
}

function SkillCard({ skill }: { skill: SkillMeta }) {
  // Built-ins have no local SKILL.md to open — render a non-clickable info card
  // instead of a link that would 404.
  if (skill.source === "builtin") {
    return (
      <div className="glass rounded-xl p-4 h-full flex flex-col" title="Claude harness built-in — provided at runtime">
        <SkillCardInner skill={skill} />
      </div>
    );
  }
  return (
    <Link
      href={`/skills?name=${encodeURIComponent(skill.name)}`}
      className="glass hover-lift rounded-xl p-4 h-full flex flex-col"
      style={{ textDecoration: "none" }}
      aria-label={`Open skill ${skill.name}`}
    >
      <SkillCardInner skill={skill} />
    </Link>
  );
}

function SkillGrid({ skills }: { skills: SkillMeta[] }) {
  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
      {skills.map((skill, i) => (
        // Stagger capped so deep rows in a large catalog don't sit invisible for seconds.
        <Reveal key={skill.name} delay={Math.min(i, 12) * 40}>
          <SkillCard skill={skill} />
        </Reveal>
      ))}
    </div>
  );
}

/* ---------- themed atlas grouping (mirrors the Skills Atlas taxonomy) ---------- */

interface SkillTheme {
  key: string;
  symbol: string;
  label: string;
  subtitle: string;
  description: string;
  color: string;
  names: string[];
}

// Membership is curated by name; anything unmatched lands in the visible
// "Unsorted" shelf at the bottom — never silently dropped.
const SKILL_THEMES: SkillTheme[] = [
  {
    key: "design",
    symbol: "◆",
    label: "Design & Front-End",
    subtitle: "Impeccable Suite · Taste Skills",
    description:
      "Two design engines — the modular Impeccable Suite and the opinionated taste skills — from first UX brief to shipped, distinctive front-ends.",
    color: "var(--neon)",
    names: [
      "adapt", "animate", "audit", "bolder", "brandkit", "clarify", "colorize", "critique",
      "design-taste-frontend", "design-taste-frontend-v1", "delight", "distill", "gpt-taste",
      "harden", "high-end-visual-design", "image-to-code", "imagegen-frontend-mobile",
      "imagegen-frontend-web", "impeccable", "industrial-brutalist-ui", "layout", "minimalist-ui",
      "optimize", "overdrive", "polish", "quieter", "redesign-existing-projects", "shape",
      "stitch-design-taste", "typeset", "Webdesign",
    ],
  },
  {
    key: "code",
    symbol: "❯",
    label: "Code & Engineering",
    subtitle: "ECC — Engineering Conventions · Ponytail",
    description:
      "Production patterns across stacks, held in tension with Ponytail's delete-simplify-ship counterweight.",
    color: "var(--neon-2)",
    names: [
      "api-design", "coding-standards", "CreateCLI", "docker-patterns", "error-handling",
      "full-output-enforcement", "git-workflow", "Hardening", "mcp-server-patterns", "ponytail",
      "ponytail-audit", "ponytail-debt", "ponytail-gain", "ponytail-help", "ponytail-review",
      "postgres-patterns", "python-patterns", "python-testing", "react-patterns", "react-testing",
      "security-review", "security-scan", "tdd-workflow",
    ],
  },
  {
    key: "tokens",
    symbol: "▲",
    label: "Token Efficiency",
    subtitle: "Caveman",
    description:
      "The Caveman family compresses output, commits, reviews and memory files so long sessions last far longer.",
    color: "var(--warn)",
    names: ["caveman", "caveman-commit", "caveman-compress", "caveman-help", "caveman-review", "caveman-stats", "cavecrew"],
  },
  {
    key: "data",
    symbol: "▮",
    label: "Data & Analytics",
    subtitle: "Data Plugin — Claude built-ins",
    description:
      "End-to-end analytics: explore and profile data, write correct SQL, run statistics, visualize, build dashboards, and QA before it ships.",
    color: "var(--dim-freedom)",
    names: [
      "data:explore-data", "data:analyze", "data:write-query", "data:sql-queries", "data:statistical-analysis",
      "data:create-viz", "data:data-visualization", "data:build-dashboard", "data:validate-data",
      "data:data-context-extractor", "dataviz",
    ],
  },
  {
    key: "create",
    symbol: "✦",
    label: "Create & Output",
    subtitle: "Claude Built-ins",
    description:
      "The output engines — Word, PowerPoint, Excel, PDF, canvas art, and rich web artifacts — that turn research and data into shareable deliverables.",
    color: "var(--dim-creative)",
    names: [
      "docx", "pptx", "xlsx", "pdf", "canvas-design", "web-artifacts-builder",
      "high-end-visual-design", "theme-factory", "artifact-design",
    ],
  },
  {
    key: "research",
    symbol: "◎",
    label: "Research & Intelligence",
    subtitle: "Deep research · OSINT · verification",
    description:
      "Multi-source research, paper retrieval, bias auditing, and investigation — evidence before opinion.",
    color: "var(--neon-3)",
    names: ["Research", "ArXiv", "BiasCheck", "ContextSearch", "search-first", "PrivateInvestigator", "WorldThreatModel", "ExtractWisdom"],
  },
  {
    key: "thinking",
    symbol: "✦",
    label: "Thinking & Creativity",
    subtitle: "Reasoning frames · ideation",
    description:
      "Structured reasoning lenses and divergent-ideation engines — first principles to red-team.",
    color: "var(--dim-freedom)",
    names: [
      "ApertureOscillation", "Aphorisms", "BeCreative", "Council", "FirstPrinciples", "Ideate",
      "Interview", "IterativeDepth", "RedTeam", "RootCauseAnalysis", "Science", "SystemsThinking", "WriteStory",
    ],
  },
  {
    key: "media",
    symbol: "▶",
    label: "Media & Automation",
    subtitle: "Art · video · browser fleets",
    description:
      "Generative art, audio/video pipelines, and the browser-automation tiers from headless batch to real Chrome.",
    color: "var(--dim-creative)",
    names: ["Art", "AudioEditor", "Remotion", "Browser", "Interceptor", "Apify", "BrightData"],
  },
  {
    key: "tools",
    symbol: "⌘",
    label: "Skill & Workflow Tools",
    subtitle: "Meta-tooling",
    description:
      "Discover, author, benchmark, and prune skills; schedule recurring runs; migrate data in.",
    color: "var(--positive)",
    names: ["CreateSkill", "find-skills", "Evals", "Migrate", "Upgrade", "BitterPillEngineering", "Loop", "Prompting"],
  },
  {
    key: "lifeos",
    symbol: "⏣",
    label: "LifeOS System",
    subtitle: "The OS's own organs",
    description:
      "Skills that operate LifeOS itself — TELOS, ISA, agents, delegation, memory, the daemon, local intel.",
    color: "var(--dim-rhythms)",
    names: ["Agents", "Daemon", "Delegation", "Fabric", "ISA", "Knowledge", "LifeOS", "LocalIntelligence", "Telos"],
  },
  {
    key: "work",
    symbol: "★",
    label: "Work / Business",
    subtitle: "Business & personal ops",
    description:
      "The business stack: sales, market metrics, and OneDrive-safe spreadsheets.",
    color: "var(--dim-money)",
    names: ["onedrive-excel-safe", "Sales", "USMetrics"],
  },
];

function classifySkills(skills: SkillMeta[]): { theme: SkillTheme; skills: SkillMeta[] }[] {
  const byName = new Map(skills.map((s) => [s.name, s]));
  const claimed = new Set<string>();
  const groups: { theme: SkillTheme; skills: SkillMeta[] }[] = [];

  for (const theme of SKILL_THEMES) {
    const members: SkillMeta[] = [];
    for (const n of theme.names) {
      const s = byName.get(n);
      if (s && !claimed.has(n)) {
        members.push(s);
        claimed.add(n);
      }
    }
    if (members.length > 0) groups.push({ theme, skills: members });
  }

  const leftovers = skills.filter((s) => !claimed.has(s.name));
  if (leftovers.length > 0) {
    groups.push({
      theme: {
        key: "unsorted",
        symbol: "…",
        label: "Unsorted",
        subtitle: "Not yet themed",
        description: "Installed skills that haven't been assigned a theme yet — nothing here is hidden.",
        color: "hsl(var(--muted-foreground))",
        names: [],
      },
      skills: leftovers,
    });
  }
  return groups;
}

function ThemeSection({ theme, skills }: { theme: SkillTheme; skills: SkillMeta[] }) {
  return (
    <section id={`theme-${theme.key}`} className="mt-12" style={{ scrollMarginTop: 96 }}>
      <Reveal>
        <div className="flex items-start gap-3.5 mb-4">
          <div
            className="grid place-items-center w-10 h-10 rounded-xl text-[18px] shrink-0"
            style={{
              color: theme.color,
              background: `color-mix(in oklab, ${theme.color} 10%, transparent)`,
              border: `1px solid color-mix(in oklab, ${theme.color} 30%, transparent)`,
            }}
            aria-hidden
          >
            {theme.symbol}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-lg font-bold text-foreground leading-tight">{theme.label}</h2>
              <span
                className="text-[11px] font-mono px-2 py-0.5 rounded-full tabular-nums"
                style={{
                  color: theme.color,
                  background: "var(--surface-1)",
                  border: `1px solid color-mix(in oklab, ${theme.color} 35%, transparent)`,
                }}
              >
                {skills.length}
              </span>
            </div>
            <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-muted-foreground mt-0.5">
              {theme.subtitle}
            </div>
            <p className="text-[13px] text-muted-foreground mt-1.5 max-w-[80ch] leading-relaxed">{theme.description}</p>
          </div>
        </div>
      </Reveal>
      <SkillGrid skills={skills} />
    </section>
  );
}

function SkillsLanding({ skills }: { skills: SkillMeta[] }) {
  const groups = classifySkills(skills);

  return (
    <div className="px-5 sm:px-8 lg:px-10 pb-24 max-w-[1400px] mx-auto">
      <Hero skills={skills} />

      {/* Theme constellation — jump map, Atlas-style */}
      {groups.length > 0 && (
        <Reveal>
          <div className="mt-8 flex flex-wrap gap-2.5">
            {groups.map(({ theme, skills: members }) => (
              <a
                key={theme.key}
                href={`#theme-${theme.key}`}
                className="glass hover-lift rounded-xl px-3.5 py-2.5 flex items-center gap-2.5"
                style={{ textDecoration: "none" }}
                aria-label={`Jump to ${theme.label}`}
              >
                <span className="text-[15px]" style={{ color: theme.color }} aria-hidden>
                  {theme.symbol}
                </span>
                <span className="text-[13px] font-medium text-foreground">{theme.label}</span>
                <span className="text-[12px] font-mono tabular-nums" style={{ color: theme.color }}>
                  {members.length}
                </span>
              </a>
            ))}
          </div>
        </Reveal>
      )}

      {groups.map(({ theme, skills: members }) => (
        <ThemeSection key={theme.key} theme={theme} skills={members} />
      ))}

      {skills.length === 0 && (
        <div className="mt-16 glass rounded-xl text-center px-4 py-10">
          <Zap className="w-8 h-8 mx-auto text-muted-foreground" style={{ opacity: 0.4 }} />
          <p className="text-[13px] text-muted-foreground mt-3">No skills installed yet.</p>
        </div>
      )}
    </div>
  );
}

/* ---------- detail ---------- */

function SkillDetailView({ skill }: { skill: SkillDetail }) {
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(skill.content);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch(`/api/wiki/skills/${encodeURIComponent(skill.name)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skill-detail", skill.name] });
      setEditing(false);
    },
  });

  const updated = fmtDate(skill.lastModified);

  return (
    <div className="px-5 sm:px-8 lg:px-10 pb-24 max-w-4xl mx-auto">
      <div className="pt-8 sm:pt-10">
        <div className="flex items-center gap-2.5 mb-4 text-[11px] font-mono uppercase tracking-[0.28em] text-muted-foreground">
          <span
            className="w-1.5 h-1.5 rounded-full anim-breathe"
            style={{ background: "var(--positive)", boxShadow: "0 0 8px var(--positive)" }}
          />
          LifeOS · Skills
        </div>

        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/skills"
              aria-label="Back to skills"
              className="grid place-items-center w-9 h-9 rounded-lg glass shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-bold leading-tight text-foreground">{skill.name}</h1>
                {skill.effort && <TokenPill text={skill.effort} color={effortColor(skill.effort)} />}
              </div>
              {(skill.wordCount > 0 || updated) && (
                <p className="text-[12px] font-mono text-muted-foreground tabular-nums mt-1">
                  {skill.wordCount > 0 && `${skill.wordCount.toLocaleString()} words`}
                  {skill.wordCount > 0 && updated && " · "}
                  {updated}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <button
                  onClick={() => mutation.mutate(editContent)}
                  disabled={mutation.isPending}
                  className="inline-flex items-center gap-1.5 text-[12px] font-mono px-3 py-1.5 rounded-full transition-colors disabled:opacity-60"
                  style={{
                    color: "var(--positive)",
                    background: "var(--surface-1)",
                    border: "1px solid color-mix(in oklab, var(--positive) 40%, transparent)",
                    cursor: mutation.isPending ? "not-allowed" : "pointer",
                  }}
                >
                  {mutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditing(false);
                    setEditContent(skill.content);
                  }}
                  className="inline-flex items-center gap-1.5 text-[12px] font-mono px-3 py-1.5 rounded-full cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                  style={{ background: "var(--surface-1)", border: "1px solid var(--hairline)" }}
                >
                  <X className="w-3.5 h-3.5" />
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  setEditing(true);
                  setEditContent(skill.content);
                }}
                className="inline-flex items-center gap-1.5 text-[12px] font-mono px-3 py-1.5 rounded-full cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                style={{ background: "var(--surface-1)", border: "1px solid var(--hairline)" }}
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </button>
            )}
          </div>
        </div>

        {skill.filePath && (
          <div
            className="mt-3 text-[11px] font-mono text-muted-foreground truncate"
            data-sensitive
            title={skill.filePath}
          >
            {skill.filePath}
          </div>
        )}
      </div>

      {mutation.isError && (
        <div className="glass rounded-xl p-3.5 mt-4 flex items-center gap-2.5">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: "var(--danger)", boxShadow: "0 0 8px var(--danger)" }}
          />
          <p className="text-[12px] font-mono" style={{ color: "var(--danger)" }}>
            Failed to save changes.
          </p>
        </div>
      )}

      {editing ? (
        <textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          className="w-full h-[600px] rounded-xl p-4 text-sm font-mono resize-y mt-6 text-foreground"
          style={{ background: "var(--surface-1)", border: "1px solid var(--hairline)", outline: "none" }}
          spellCheck={false}
          aria-label={`Edit ${skill.name} skill content`}
        />
      ) : (
        <Reveal className="mt-6">
          <div className="glass rounded-xl p-5 sm:p-6">
            <MarkdownRenderer content={skill.content} />
          </div>
        </Reveal>
      )}
    </div>
  );
}

/* ---------- page shell (query wiring unchanged) ---------- */

function LoadingLine({ text }: { text: string }) {
  return <div className="px-5 sm:px-8 pt-10 text-[13px] font-mono text-muted-foreground">{text}</div>;
}

function ErrorCard({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="px-5 sm:px-8 pt-10 max-w-5xl mx-auto">
      <div className="glass rounded-xl p-5 flex items-start gap-2.5">
        <span
          className="mt-1.5 w-2 h-2 rounded-full shrink-0"
          style={{ background: "var(--danger)", boxShadow: "0 0 8px var(--danger)" }}
        />
        <div>
          <h2 className="text-[15px] font-semibold" style={{ color: "var(--danger)" }}>{title}</h2>
          <p className="text-[13px] text-muted-foreground mt-1">{detail}</p>
        </div>
      </div>
    </div>
  );
}

function SkillsPageInner() {
  const searchParams = useSearchParams();
  const skillName = searchParams.get("name");
  const isViewing = !!skillName;

  const { data: listData, error: listError } = useQuery<{ skills: SkillMeta[]; total: number }>({
    queryKey: ["skills-list"],
    queryFn: async () => {
      const res = await fetch("/api/wiki/skills");
      if (!res.ok) throw new Error("Failed to fetch skills");
      return res.json();
    },
    staleTime: 30_000,
    enabled: !isViewing,
  });

  const { data: detailData, error: detailError } = useQuery<SkillDetail>({
    queryKey: ["skill-detail", skillName],
    queryFn: async () => {
      const res = await fetch(`/api/wiki/skills/${encodeURIComponent(skillName!)}`);
      if (!res.ok) throw new Error("Failed to fetch skill");
      return res.json();
    },
    enabled: isViewing,
  });

  if (isViewing && detailData) {
    return <SkillDetailView skill={detailData} />;
  }

  if (!isViewing && listData) {
    return <SkillsLanding skills={listData.skills} />;
  }

  if (isViewing && detailError) {
    return <ErrorCard title="Failed to load skill" detail={String(detailError)} />;
  }

  if (!isViewing && listError) {
    return <ErrorCard title="Failed to load skills" detail={String(listError)} />;
  }

  return <LoadingLine text={isViewing ? "Loading skill…" : "Loading skills…"} />;
}

export default function SkillsPage() {
  return (
    <Suspense fallback={<LoadingLine text="Loading skills…" />}>
      <SkillsPageInner />
    </Suspense>
  );
}
