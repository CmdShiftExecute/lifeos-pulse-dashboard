"use client";

import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  ChevronDown,
  Clock,
  Crosshair,
  FlaskConical,
  Gauge,
  Hourglass,
} from "lucide-react";
import EmptyStateGuide from "@/components/EmptyStateGuide";
import { Reveal } from "@/components/kit/Reveal";
import { Section } from "@/components/kit/Section";

interface HypothesisSummary {
  slug: string;
  claim: string;
  confidence: number;
  target_frame: string;
  evidence_count: number;
  generated: string;
  expires_in_days: number;
}

interface HypothesisDetail extends HypothesisSummary {
  status: string;
  expires: string;
  evidence_signals: string[];
  falsifier: string;
  evidence: string;
  suggested_action: string;
}

/* ---------- theme-token color maps (re-theme with [data-theme]) ---------- */

const MUTED = "hsl(var(--muted-foreground))";

// Confidence banding — high graduates green, mid is informational, low is a caution.
function confidenceColor(c: number): string {
  if (c >= 0.75) return "var(--positive)";
  if (c >= 0.5) return "var(--neon-2)";
  return "var(--warn)";
}

function formatTimestamp(iso: string): string {
  if (!iso || iso === "never") return iso || "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ---------- small shared pieces ---------- */

function TokenPill({ text, color, title, icon: Icon }: { text: string; color: string; title?: string; icon?: typeof Crosshair }) {
  return (
    <span
      title={title}
      className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{
        color,
        background: "var(--surface-1)",
        border: `1px solid color-mix(in oklab, ${color} 35%, transparent)`,
      }}
    >
      {Icon && <Icon className="w-3 h-3" />}
      {text}
    </span>
  );
}

/* ---------- hypothesis card ---------- */

function HypothesisCard({
  hypothesis,
  onGraduate,
  onReject,
}: {
  hypothesis: HypothesisSummary;
  onGraduate: (slug: string) => void;
  onReject: (slug: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<HypothesisDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const confidencePct = Math.round(hypothesis.confidence * 100);
  const expiresSoon = hypothesis.expires_in_days < 7;
  const cColor = confidenceColor(hypothesis.confidence);

  async function toggleExpand() {
    const next = !expanded;
    setExpanded(next);
    if (next && !detail) {
      setLoadingDetail(true);
      try {
        const resp = await fetch(
          `/api/hypotheses/${encodeURIComponent(hypothesis.slug)}`
        );
        if (resp.ok) setDetail(await resp.json());
      } finally {
        setLoadingDetail(false);
      }
    }
  }

  return (
    <div
      className="glass hover-lift rounded-xl p-4 flex flex-col gap-3 h-full"
      style={expiresSoon ? { border: "1px solid color-mix(in oklab, var(--warn) 40%, transparent)" } : undefined}
    >
      {/* claim */}
      <div className="flex items-start gap-2.5">
        <span
          className="mt-1.5 w-2 h-2 rounded-full shrink-0"
          style={{ background: cColor, boxShadow: `0 0 8px ${cColor}` }}
        />
        <h3 className="flex-1 min-w-0 text-[15px] font-semibold text-foreground leading-snug" data-sensitive>
          {hypothesis.claim || hypothesis.slug}
        </h3>
      </div>

      {/* confidence meter — real 0–1 value from the deriver */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface-1)" }}>
          <div className="h-full rounded-full" style={{ width: `${confidencePct}%`, background: cColor }} />
        </div>
        <span
          className="text-[12px] font-mono font-semibold tabular-nums shrink-0"
          title="Deriver confidence"
          style={{ color: cColor }}
        >
          {confidencePct}%
        </span>
      </div>

      {/* meta row */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <TokenPill
          text={hypothesis.target_frame}
          color="var(--neon-2)"
          icon={Crosshair}
          title="Target WISDOM frame on graduation"
        />
        <span className="text-[11px] font-mono text-muted-foreground tabular-nums">
          {hypothesis.evidence_count} signals
        </span>
        <span
          className="inline-flex items-center gap-1 text-[11px] font-mono tabular-nums"
          style={{ color: expiresSoon ? "var(--warn)" : MUTED, fontWeight: expiresSoon ? 600 : undefined }}
        >
          <Clock className="w-3 h-3" />
          expires in {hypothesis.expires_in_days}d
        </span>
      </div>

      {/* actions */}
      <div className="flex items-center gap-2 flex-wrap mt-auto">
        <button
          onClick={() => onGraduate(hypothesis.slug)}
          className="inline-flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-full cursor-pointer transition-colors"
          title="Append to the target WISDOM frame and archive"
          style={{
            color: "var(--positive)",
            background: "var(--surface-1)",
            border: "1px solid color-mix(in oklab, var(--positive) 35%, transparent)",
          }}
        >
          <CheckCircle2 className="w-3 h-3" />
          Graduate
        </button>
        <button
          onClick={() => onReject(hypothesis.slug)}
          className="inline-flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-full cursor-pointer transition-colors"
          title="Archive without promoting"
          style={{
            color: "var(--danger)",
            background: "var(--surface-1)",
            border: "1px solid color-mix(in oklab, var(--danger) 35%, transparent)",
          }}
        >
          <XCircle className="w-3 h-3" />
          Reject
        </button>
        <button
          onClick={toggleExpand}
          className="ml-auto inline-flex items-center gap-1 bg-transparent border-none cursor-pointer text-[12px] font-mono text-muted-foreground hover:text-foreground transition-colors"
          aria-expanded={expanded}
          title={expanded ? "Hide evidence detail" : "Show evidence detail"}
        >
          {expanded ? "hide" : "evidence"}
          <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* expanded detail */}
      {expanded && (
        <div className="pt-3 flex flex-col gap-3" style={{ borderTop: "1px solid var(--hairline)" }}>
          {loadingDetail && (
            <div className="text-[12px] font-mono text-muted-foreground">Loading detail…</div>
          )}
          {detail && (
            <>
              {detail.evidence_signals.length > 0 && (
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground mb-1.5">
                    Evidence · {detail.evidence_signals.length} signals
                  </div>
                  <ul className="space-y-1 text-[12px] font-mono text-foreground" data-sensitive>
                    {detail.evidence_signals.slice(0, 8).map((sig) => (
                      <li key={sig} className="truncate" title={sig}>
                        {sig}
                      </li>
                    ))}
                    {detail.evidence_signals.length > 8 && (
                      <li className="text-muted-foreground tabular-nums">
                        +{detail.evidence_signals.length - 8} more
                      </li>
                    )}
                  </ul>
                </div>
              )}
              {detail.falsifier && (
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground mb-1.5">
                    Falsifier
                  </div>
                  <p className="text-[13px] leading-relaxed text-foreground" data-sensitive>{detail.falsifier}</p>
                </div>
              )}
              {detail.suggested_action && (
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground mb-1.5">
                    Suggested Action
                  </div>
                  <p className="text-[13px] leading-relaxed text-foreground" data-sensitive>{detail.suggested_action}</p>
                </div>
              )}
              {detail.generated && (
                <div className="text-[11px] font-mono text-muted-foreground tabular-nums">
                  generated {formatTimestamp(detail.generated)}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- hero ---------- */

function Hero({
  count,
  avgPct,
  expiringSoon,
  lastFetch,
  top,
}: {
  count: number;
  avgPct: number;
  expiringSoon: number;
  lastFetch: Date | null;
  /** highest-confidence pending claim — the route's headline data */
  top: HypothesisSummary | null;
}) {
  const stats = [
    { label: "Pending", value: count, display: String(count).padStart(2, "0"), icon: FlaskConical, color: undefined as string | undefined },
    { label: "Avg Confidence", value: count > 0 ? avgPct : 0, display: `${avgPct}%`, icon: Gauge, color: undefined as string | undefined },
    { label: "Expiring < 7d", value: expiringSoon, display: String(expiringSoon).padStart(2, "0"), icon: Hourglass, color: "var(--warn)" },
  ].filter((s) => s.value > 0);

  return (
    <section className="pt-8 sm:pt-10">
      <div className="flex items-center gap-2.5 mb-4 text-[11px] font-mono uppercase tracking-[0.28em] text-muted-foreground">
        <span
          className="w-1.5 h-1.5 rounded-full anim-breathe"
          style={{ background: "var(--positive)", boxShadow: "0 0 8px var(--positive)" }}
        />
        LifeOS · Hypotheses
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold leading-tight text-foreground">Hypotheses</h1>
      {top && (
        <div className="mt-4 max-w-[70ch]">
          <div
            className="text-[10px] font-mono uppercase tracking-[0.24em] mb-1.5 tabular-nums"
            style={{ color: "var(--neon)" }}
          >
            Top candidate · {Math.round(top.confidence * 100)}%
          </div>
          <p className="text-[16px] sm:text-[18px] font-medium leading-snug text-foreground" data-sensitive>
            {top.claim || top.slug}
          </p>
        </div>
      )}
      <p className="mt-3 max-w-[70ch] text-[13px] leading-relaxed text-muted-foreground">
        Pending wisdom candidates from the proactive deriver loop. Graduate promotes the claim to a{" "}
        <code
          className="font-mono text-[12px] px-1.5 py-0.5 rounded text-foreground"
          style={{ background: "var(--surface-1)", border: "1px solid var(--hairline)" }}
        >
          WISDOM/FRAMES
        </code>{" "}
        file; reject archives it; unreviewed hypotheses age out at 30 days.
      </p>

      <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground tabular-nums">
        <RefreshCw className="w-3 h-3" />
        {lastFetch ? `synced ${formatTimestamp(lastFetch.toISOString())}` : "syncing…"}
      </div>

      {stats.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-3">
          {stats.map((s) => (
            <div key={s.label} className="glass rounded-lg px-3.5 py-3 min-w-[124px]">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                <s.icon className="w-3.5 h-3.5" />
                <span className="text-[10px] font-mono uppercase tracking-[0.16em]">{s.label}</span>
              </div>
              <div
                className="text-3xl font-bold font-mono tabular-nums"
                style={{ color: s.color ?? "hsl(var(--foreground))" }}
              >
                {s.display}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ---------- page ---------- */

export default function HypothesesPage() {
  const [items, setItems] = useState<HypothesisSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [actionInFlight, setActionInFlight] = useState(false);

  const load = useCallback(async () => {
    try {
      const resp = await fetch("/api/hypotheses");
      if (!resp.ok) {
        setError(`API returned ${resp.status}`);
        return;
      }
      const data = (await resp.json()) as { hypotheses: HypothesisSummary[] };
      setItems(data.hypotheses || []);
      setError(null);
      setLastFetch(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "fetch failed");
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 10000);
    return () => clearInterval(timer);
  }, [load]);

  async function performAction(
    slug: string,
    action: "graduate" | "reject",
    note?: string
  ) {
    setActionInFlight(true);
    try {
      const resp = await fetch(
        `/api/hypotheses/${encodeURIComponent(slug)}/${action}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ note: note || undefined }),
        }
      );
      if (!resp.ok) {
        alert(`Failed: ${resp.status}`);
        return;
      }
      await load();
    } finally {
      setActionInFlight(false);
    }
  }

  function handleGraduate(slug: string) {
    if (actionInFlight) return;
    const confirmed = window.confirm(
      `Graduate this hypothesis to its target frame? This appends to the WISDOM frame and archives the hypothesis.`
    );
    if (!confirmed) return;
    performAction(slug, "graduate");
  }

  function handleReject(slug: string) {
    if (actionInFlight) return;
    const note = window.prompt("Reject reason (optional):") ?? "";
    performAction(slug, "reject", note);
  }

  if (items === null && !error) {
    return (
      <div className="px-5 sm:px-8 pt-10 text-[13px] font-mono text-muted-foreground">
        Loading hypotheses…
      </div>
    );
  }

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
              Hypothesis API not reachable
            </h2>
            <p className="text-[13px] font-mono text-muted-foreground mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const hypotheses = items || [];
  const avgPct =
    hypotheses.length > 0
      ? Math.round(
          (hypotheses.reduce((sum, h) => sum + h.confidence, 0) / hypotheses.length) * 100
        )
      : 0;
  const expiringSoon = hypotheses.filter((h) => h.expires_in_days < 7).length;
  const top =
    hypotheses.length > 0
      ? hypotheses.reduce((a, b) => (b.confidence > a.confidence ? b : a))
      : null;

  return (
    <div className="px-5 sm:px-8 lg:px-10 pb-24 max-w-[1400px] mx-auto">
      <Hero
        count={hypotheses.length}
        avgPct={avgPct}
        expiringSoon={expiringSoon}
        lastFetch={lastFetch}
        top={top}
      />

      {hypotheses.length === 0 ? (
        <div className="mt-10">
          <EmptyStateGuide
            section="Hypotheses"
            description="No pending hypotheses. The deriver runs nightly at 03:00 — it scans LEARNING signals and emits up to 3 conservative claims per run when patterns cross the confidence/sample thresholds."
            hideInterview
            daPromptExample="run the deriver loop now"
          />
        </div>
      ) : (
        <Section
          icon={FlaskConical}
          kicker="Wisdom candidates from the deriver"
          title="Pending Review"
          count={hypotheses.length}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
            {hypotheses.map((h, i) => (
              <Reveal key={h.slug} delay={i * 40}>
                <HypothesisCard
                  hypothesis={h}
                  onGraduate={handleGraduate}
                  onReject={handleReject}
                />
              </Reveal>
            ))}
          </div>
        </Section>
      )}

      <div
        className="mt-16 pt-3 text-[11px] font-mono text-muted-foreground"
        style={{ borderTop: "1px solid var(--hairline)" }}
      >
        source: MEMORY/WISDOM/FRAMES/_hypotheses/ · api: /api/hypotheses · deriver: launchd com.lifeos.deriver
      </div>
    </div>
  );
}
