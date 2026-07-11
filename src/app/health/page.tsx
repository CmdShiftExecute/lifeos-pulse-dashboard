"use client";
import { useEffect, useState } from "react";
import {
  Activity,
  Heart,
  Apple,
  FlaskConical,
  Pill,
  Stethoscope,
  ClipboardList,
  FileText,
  Lock,
  type LucideIcon,
} from "lucide-react";
import { FreshnessIndicator, type FreshnessData } from "@/components/FreshnessIndicator";
import EmptyStateGuide from "@/components/EmptyStateGuide";
import { Reveal } from "@/components/kit/Reveal";
import { Section } from "@/components/kit/Section";

interface HealthFile {
  name: string;
  sections: string[];
}

interface HealthData {
  files?: HealthFile[];
  freshness?: FreshnessData;
}

interface FileMeta {
  icon: LucideIcon;
  label: string;
  priority: number;
}

const FILE_META: Record<string, FileMeta> = {
  METRICS: { icon: Activity, label: "Metrics", priority: 1 },
  FITNESS: { icon: Heart, label: "Fitness", priority: 2 },
  NUTRITION: { icon: Apple, label: "Nutrition", priority: 3 },
  CONDITIONS: { icon: ClipboardList, label: "Conditions", priority: 4 },
  MEDICATIONS: { icon: Pill, label: "Medications", priority: 5 },
  PROVIDERS: { icon: Stethoscope, label: "Providers", priority: 6 },
  HISTORY: { icon: FileText, label: "History", priority: 7 },
};

function fileMeta(name: string): FileMeta {
  if (name.startsWith("lab_results")) {
    return {
      icon: FlaskConical,
      label: name.replace(/^lab_results_/, "Labs — "),
      priority: 0,
    };
  }
  return FILE_META[name.toUpperCase()] || { icon: FileText, label: name, priority: 99 };
}

/* ---------- small shared pieces (flagship pattern from /work) ---------- */

function TokenPill({ text, color, title }: { text: string; color: string; title?: string }) {
  return (
    <span
      title={title}
      className="inline-flex items-center text-[10px] font-mono px-2 py-0.5 rounded-full whitespace-nowrap tabular-nums"
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
  fileCount,
  labCount,
  sectionCount,
  freshness,
}: {
  fileCount: number;
  labCount: number;
  sectionCount: number;
  freshness?: FreshnessData;
}) {
  const stats = [
    { label: "Sections", value: sectionCount, icon: ClipboardList },
    { label: "Lab Panels", value: labCount, icon: FlaskConical },
  ].filter((s) => s.value > 0);

  return (
    <section className="pt-8 sm:pt-10">
      <div className="flex items-center gap-2.5 mb-4 text-[11px] font-mono uppercase tracking-[0.28em] text-muted-foreground">
        <span
          className="w-1.5 h-1.5 rounded-full anim-breathe"
          style={{ background: "var(--positive)", boxShadow: "0 0 8px var(--positive)" }}
        />
        LifeOS · Health
        <span className="ml-auto normal-case tracking-normal">
          <FreshnessIndicator freshness={freshness} />
        </span>
      </div>

      {fileCount > 0 ? (
        <h1 className="text-3xl sm:text-4xl font-bold leading-[1.12] text-foreground max-w-[36ch]">
          <span className="font-mono tabular-nums" style={{ color: "var(--dim-health)" }} data-sensitive>
            {fileCount}
          </span>{" "}
          tracked source{fileCount === 1 ? "" : "s"}
          {labCount > 0 && (
            <>
              {" · "}
              <span className="font-mono tabular-nums" style={{ color: "var(--dim-rhythms)" }} data-sensitive>
                {labCount}
              </span>{" "}
              lab panel{labCount === 1 ? "" : "s"}
            </>
          )}
        </h1>
      ) : (
        <h1 className="text-3xl sm:text-4xl font-bold leading-[1.12] text-foreground">Health</h1>
      )}

      <p className="mt-4 flex items-center gap-2 text-[13px] font-mono text-muted-foreground">
        <Lock className="w-3.5 h-3.5 shrink-0" /> Fully private. Observer mode blurs all data below.
      </p>

      {stats.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-3">
          {stats.map((s) => (
            <div key={s.label} className="glass rounded-lg px-3.5 py-3 min-w-[124px]">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                <s.icon className="w-3.5 h-3.5" />
                <span className="text-[10px] font-mono uppercase tracking-[0.16em]">{s.label}</span>
              </div>
              <div className="text-3xl font-bold font-mono text-foreground tabular-nums" data-sensitive>
                {String(s.value).padStart(2, "0")}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ---------- file card ---------- */

function FileCard({ file, accent }: { file: HealthFile; accent: string }) {
  const meta = fileMeta(file.name);
  const Icon = meta.icon;
  const shown = file.sections.slice(0, 8);
  const more = file.sections.length - shown.length;
  return (
    <div className="glass rounded-xl p-4 h-full">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="grid place-items-center w-7 h-7 rounded-lg shrink-0"
            style={{ background: "var(--surface-1)", border: "1px solid var(--hairline)", color: accent }}
          >
            <Icon className="w-3.5 h-3.5" />
          </span>
          <h3
            className="text-[12px] font-mono font-semibold uppercase tracking-[0.1em] text-foreground truncate"
            title={meta.label}
          >
            {meta.label}
          </h3>
        </div>
        {file.sections.length > 0 && (
          <TokenPill
            text={`${file.sections.length} section${file.sections.length === 1 ? "" : "s"}`}
            color={accent}
          />
        )}
      </div>
      {file.sections.length > 0 && (
        <div className="space-y-1.5" data-sensitive>
          {shown.map((s, i) => (
            <div key={i} className="flex items-start gap-2" title={s}>
              <span
                className="w-1 h-1 rounded-full mt-[7px] shrink-0"
                style={{ background: "var(--dim-rhythms)", opacity: 0.6 }}
              />
              <span className="text-[12px] leading-relaxed text-muted-foreground line-clamp-2">{s}</span>
            </div>
          ))}
          {more > 0 && (
            <div className="text-[11px] font-mono text-muted-foreground pt-1 tabular-nums">+ {more} more</div>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- page ---------- */

export default function HealthPage() {
  const [data, setData] = useState<HealthData | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/life/health")
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
            <h2 className="text-[15px] font-semibold" style={{ color: "var(--danger)" }}>Failed to load health</h2>
            <p className="text-[13px] text-muted-foreground mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }
  if (!data) return <div className="px-5 sm:px-8 pt-10 text-[13px] font-mono text-muted-foreground">Loading Health…</div>;

  const files = (data.files || [])
    .slice()
    .sort((a, b) => fileMeta(a.name).priority - fileMeta(b.name).priority);
  const labs = files.filter((f) => f.name.startsWith("lab_results"));
  const nonLabs = files.filter((f) => !f.name.startsWith("lab_results"));
  const isFreshInstall = files.length === 0;
  const sectionCount = files.reduce((n, f) => n + f.sections.length, 0);

  return (
    <div className="px-5 sm:px-8 lg:px-10 pb-24 max-w-[1400px] mx-auto">
      {isFreshInstall && (
        <div className="pt-8">
          <EmptyStateGuide
            section="Health Snapshots"
            description="Lab results, fitness data, nutrition tracking, and trends over time."
            userDir="HEALTH"
            daPromptExample="help me set up where my health data lives"
          />
        </div>
      )}
      <Hero
        fileCount={files.length}
        labCount={labs.length}
        sectionCount={sectionCount}
        freshness={data.freshness}
      />
      {labs.length > 0 && (
        <Section icon={FlaskConical} kicker="Dated panels on file" title="Lab Panels">
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
            {labs.map((f, i) => (
              <Reveal key={f.name} delay={i * 40}>
                <FileCard file={f} accent="var(--dim-rhythms)" />
              </Reveal>
            ))}
          </div>
        </Section>
      )}
      {nonLabs.length > 0 && (
        <Section icon={ClipboardList} kicker="Structured health record" title="Core Files">
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
            {nonLabs.map((f, i) => (
              <Reveal key={f.name} delay={i * 40}>
                <FileCard file={f} accent="var(--dim-health)" />
              </Reveal>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
