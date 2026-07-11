"use client";

import { useEffect, useState } from "react";
import {
  Compass,
  Flag,
  Target,
  AlertTriangle,
  Swords,
  Route,
  FolderKanban,
  Zap,
} from "lucide-react";
import type { Telos, Project } from "../data";
import { ShowMoreButton, cleanMd } from "@/components/kit/ShowMore";
import { BrainCore } from "./BrainCore";
import { PersonSystem } from "./PersonSystem";
import { Reveal } from "@/components/kit/Reveal";
import { Section } from "@/components/kit/Section";
import { EntryCard } from "@/components/kit/EntryCard";

/* ---------- helpers ---------- */

function splitEntry(title: string): { head: string; detail: string } {
  if (!title) return { head: "", detail: "" };
  const i = title.indexOf("—"); // em dash used across TELOS entries
  if (i > 3 && i < 110) return { head: title.slice(0, i).trim(), detail: title.slice(i + 1).trim() };
  const dot = title.indexOf(". ");
  if (dot > 8 && dot < 130) return { head: title.slice(0, dot + 1).trim(), detail: title.slice(dot + 2).trim() };
  if (title.length > 130) return { head: title.slice(0, 118).trim() + "…", detail: title };
  return { head: title, detail: "" };
}

/** Pull a concrete target from a goal's prose (amount and/or deadline). Display-only. */
function extractTarget(title: string): string | null {
  const amt = title.match(/(?:\$|USD|AED|EUR|GBP|INR)\s?[\d,]+/i)?.[0];
  const when = title.match(
    /\b(?:by|through)\s+(?:\d{1,2}\s+)?(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*\d{4}/i
  )?.[0];
  const offer = /signed offer/i.test(title) ? "Signed offer" : null;
  const parts = [amt || offer, when].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

const QUOTES = [
  { t: "The impediment to action advances action. What stands in the way becomes the way.", a: "Marcus Aurelius" },
  { t: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", a: "Will Durant, on Aristotle" },
  { t: "The best way to predict the future is to invent it.", a: "Alan Kay" },
  { t: "Compound interest is the eighth wonder of the world. He who understands it, earns it.", a: "attributed to Einstein" },
  { t: "Discipline equals freedom.", a: "Jocko Willink" },
];

const WORK_STATUS: Record<string, string> = {
  green: "var(--positive)",
  amber: "var(--warn)",
  red: "var(--danger)",
};

/* Project card — expandable list of the project's live work items (from the API). */
function ProjectCard({ p, showIds }: { p: Project; showIds: boolean }) {
  const [open, setOpen] = useState(false);
  const items = p.work ?? [];
  const statusColor = WORK_STATUS[p.status] ?? "var(--neon)";
  return (
    <div className="glass hover-lift rounded-xl p-4 flex flex-col gap-2">
      <div className="flex items-start gap-2.5">
        <span className="mt-1 w-2 h-2 rounded-full shrink-0" style={{ background: statusColor, boxShadow: `0 0 8px ${statusColor}` }} />
        <div className="min-w-0 flex-1" data-sensitive="">
          <div className="flex items-center gap-2 flex-wrap">
            {showIds && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ color: "var(--neon)", background: "var(--surface-1)" }}>
                {p.id}
              </span>
            )}
            <h3 className="text-[15px] font-semibold text-foreground leading-snug">{cleanMd(p.title)}</h3>
          </div>
          {p.strategy && (
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span
                className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full text-muted-foreground"
                style={{ background: "var(--surface-1)", border: "1px solid var(--hairline)" }}
              >
                via <b className="text-foreground font-semibold">{p.strategy}</b>
              </span>
            </div>
          )}
        </div>
      </div>

      {items.length > 0 && (
        <>
          <div className="grid transition-[grid-template-rows] duration-500 ease-out" style={{ gridTemplateRows: open ? "1fr" : "0fr" }}>
            <div className="overflow-hidden">
              <ul className="flex flex-col gap-2 pt-1 pl-4.5" data-sensitive="">
                {items.map((w) => (
                  <li key={w.id} className="flex items-start gap-2">
                    <span
                      className="mt-[6px] w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: WORK_STATUS[w.status] ?? "hsl(var(--muted-foreground))" }}
                    />
                    <div className="min-w-0">
                      <div className="text-[13px] leading-snug text-foreground">{cleanMd(w.title)}</div>
                      {(w.eta || w.owner) && (
                        <div className="text-[11px] font-mono text-muted-foreground mt-0.5">
                          {[w.eta, w.owner].filter(Boolean).join(" · ")}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="pl-4.5">
            <ShowMoreButton
              open={open}
              label={`${items.length} work item${items.length === 1 ? "" : "s"}`}
              onClick={() => setOpen((v) => !v)}
            />
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- main ---------- */

export function CommandCenter({ telos, showIds }: { telos: Telos; showIds: boolean }) {
  const t = telos as Telos & {
    synthesisParagraph?: string;
    recommendedNextAction?: string;
    workNarrative?: { summary?: string; inProgress?: unknown; done?: unknown; ready?: unknown; inbox?: unknown };
  };

  const [quote, setQuote] = useState(QUOTES[0]);
  useEffect(() => {
    setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  }, []);

  const missions = t.missions ?? [];
  const goals = t.goals ?? [];
  const problems = t.problems ?? [];
  const challenges = t.challenges ?? [];
  const strategies = t.strategies ?? [];
  const projects = t.projects ?? [];

  // reverse edges (derived from the References now in TELOS.md)
  const problemToGoals: Record<string, string[]> = {};
  goals.forEach((g) => (g.addresses ?? []).forEach((p) => ((problemToGoals[p] ||= []).push(g.id))));
  const challengeToStrats: Record<string, string[]> = {};
  strategies.forEach((s) => (s.overcomes ?? []).forEach((c) => ((challengeToStrats[c] ||= []).push(s.id))));

  // friction feed for the tension section (typed, so slices stay honest)
  const friction = [
    ...problems.map((p) => ({ e: p, ch: false })),
    ...challenges.map((c) => ({ e: c, ch: true })),
  ];
  const [fricOpen, setFricOpen] = useState(false);
  const [stratOpen, setStratOpen] = useState(false);

  const count = (v: unknown) => (Array.isArray(v) ? v.length : typeof v === "number" ? v : 0);
  const work = t.workNarrative ?? {};

  const stats = [
    { label: "Missions", value: missions.length, icon: Flag },
    { label: "Goals", value: goals.length, icon: Target },
    { label: "Strategies", value: strategies.length, icon: Route },
    { label: "Projects", value: projects.length, icon: FolderKanban },
  ];

  const dim = {
    mission: "var(--neon-2)",
    goal: "var(--positive)",
    problem: "var(--danger)",
    challenge: "var(--warn)",
    strategy: "var(--neon-3)",
    project: "var(--neon)",
  };

  return (
    <div className="px-5 sm:px-8 lg:px-10 pb-24 max-w-[1400px] mx-auto">
      {/* ===================== HERO ===================== */}
      <section className="pt-8 sm:pt-12">
        <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-8 items-center">
          <div>
            <div className="flex items-center gap-2.5 mb-5 text-[11px] font-mono uppercase tracking-[0.28em] text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full anim-breathe" style={{ background: "var(--positive)", boxShadow: "0 0 8px var(--positive)" }} />
              LifeOS · TELOS
            </div>

            <h1 className="text-4xl sm:text-5xl font-bold leading-[1.05] text-foreground">
              <span className="accent-underline">Command Center</span>
            </h1>

            {t.synthesisParagraph && (
              <div className="mt-6 max-w-[62ch]">
                <div className="text-[10px] font-mono uppercase tracking-[0.24em] mb-1.5" style={{ color: "var(--neon)" }}>
                  Summary
                </div>
                <p className="text-[15px] leading-relaxed text-muted-foreground" data-sensitive="">
                  {t.synthesisParagraph}
                </p>
              </div>
            )}

            {t.recommendedNextAction && (
              <div className="mt-7 glass-2 rounded-xl p-4 flex items-start gap-3 neon-ring max-w-[52ch]">
                <span className="grid place-items-center w-8 h-8 rounded-lg shrink-0" style={{ color: "var(--neon)", background: "var(--surface-1)" }}>
                  <Zap className="w-4 h-4" />
                </span>
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-[0.24em] text-muted-foreground mb-0.5">Next action</div>
                  <div className="text-[15px] font-medium text-foreground leading-snug" data-sensitive="">{t.recommendedNextAction}</div>
                </div>
              </div>
            )}

            <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {stats.map((s) => (
                <div key={s.label} className="glass rounded-lg px-3.5 py-3">
                  <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                    <s.icon className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-mono uppercase tracking-[0.16em]">{s.label}</span>
                  </div>
                  <div className="text-3xl font-bold font-mono text-foreground tabular-nums">{String(s.value).padStart(2, "0")}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative grid place-items-center">
            <BrainCore />
          </div>
        </div>
      </section>

      {/* ===================== MISSIONS ===================== */}
      {missions.length > 0 && (
        <Section icon={Compass} kicker="Why I get up" title="Missions" count={missions.length}>
          <div className="grid sm:grid-cols-2 gap-3">
            {missions.map((m, i) => {
              const { head, detail } = splitEntry(m.title);
              return (
                <Reveal key={m.id} delay={i * 45} from={i % 2 === 0 ? "left" : "right"}>
                  <EntryCard
                    id={m.id}
                    head={head}
                    detail={m.summary || detail}
                    accent={dim.mission}
                    showIds={showIds}
                    sensitive
                    target={m.horizon || null}
                    relations={[
                      ...(m.goals ?? []).map((gid) => ({ verb: "drives", id: gid })),
                      ...(m.addresses ?? []).map((pid) => ({ verb: "solves", id: pid })),
                      ...(m.strategies ?? []).map((sid) => ({ verb: "via", id: sid })),
                    ]}
                  />
                </Reveal>
              );
            })}
          </div>
        </Section>
      )}

      {/* ===================== GOALS ===================== */}
      {goals.length > 0 && (
        <Section icon={Target} kicker="What I'm driving to in 2026" title="Active Goals" count={goals.length}>
          <div className="grid md:grid-cols-2 gap-3">
            {goals.map((g, i) => {
              const { head, detail } = splitEntry(g.title);
              return (
                <Reveal key={g.id} delay={i * 45} from={i % 2 === 0 ? "left" : "right"}>
                  <EntryCard
                    id={g.id}
                    head={head}
                    detail={g.summary || detail}
                    accent={dim.goal}
                    showIds={showIds}
                    sensitive
                    target={g.target || extractTarget(g.title)}
                    relations={[
                      ...(g.serves ?? []).map((mid) => ({ verb: "serves", id: mid })),
                      ...(g.addresses ?? []).map((pid) => ({ verb: "solves", id: pid })),
                    ]}
                  />
                </Reveal>
              );
            })}
          </div>
        </Section>
      )}

      {/* ===================== TENSION: problems/challenges vs strategies ===== */}
      {(problems.length > 0 || strategies.length > 0) && (
        <Section icon={Swords} kicker="Friction and the plays against it" title="Problems & Strategies">
          <div className="grid lg:grid-cols-2 gap-6 items-start">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
                <AlertTriangle className="w-3.5 h-3.5" style={{ color: "var(--danger)" }} /> Friction · {friction.length}
              </div>
              {friction.slice(0, 3).map(({ e, ch }, i) => {
                const { head, detail } = splitEntry(e.title);
                return (
                  <Reveal key={e.id} delay={i * 40} from="left">
                    <EntryCard
                      id={e.id}
                      head={head}
                      detail={e.summary || detail}
                      accent={ch ? dim.challenge : dim.problem}
                      showIds={showIds}
                      sensitive
                      relations={(ch ? challengeToStrats[e.id] : problemToGoals[e.id])?.map((rid) => ({
                        verb: ch ? "countered by" : "solved by",
                        id: rid,
                      }))}
                    />
                  </Reveal>
                );
              })}
              {friction.length > 3 && (
                <>
                  <div
                    className="grid transition-[grid-template-rows] duration-500 ease-out"
                    style={{ gridTemplateRows: fricOpen ? "1fr" : "0fr" }}
                  >
                    <div className="overflow-hidden flex flex-col gap-3">
                      {friction.slice(3).map(({ e, ch }) => {
                        const { head, detail } = splitEntry(e.title);
                        return (
                          <EntryCard
                            key={e.id}
                            id={e.id}
                            head={head}
                            detail={e.summary || detail}
                            accent={ch ? dim.challenge : dim.problem}
                            showIds={showIds}
                            sensitive
                            relations={(ch ? challengeToStrats[e.id] : problemToGoals[e.id])?.map((rid) => ({
                              verb: ch ? "countered by" : "solved by",
                              id: rid,
                            }))}
                          />
                        );
                      })}
                    </div>
                  </div>
                  <ShowMoreButton
                    open={fricOpen}
                    label={`show all ${friction.length}`}
                    onClick={() => setFricOpen((v) => !v)}
                  />
                </>
              )}
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
                <Route className="w-3.5 h-3.5" style={{ color: "var(--neon-3)" }} /> Strategies · {strategies.length}
              </div>
              {strategies.slice(0, 3).map((s, i) => {
                const { head, detail } = splitEntry(s.title);
                return (
                  <Reveal key={s.id} delay={i * 40} from="right">
                    <EntryCard
                      id={s.id}
                      head={head}
                      detail={s.summary || detail}
                      accent={dim.strategy}
                      showIds={showIds}
                      sensitive
                      relations={[
                        ...(s.implements ?? []).map((gid) => ({ verb: "drives", id: gid })),
                        ...(s.overcomes ?? []).map((cid) => ({ verb: "counters", id: cid })),
                      ]}
                    />
                  </Reveal>
                );
              })}
              {strategies.length > 3 && (
                <>
                  <div
                    className="grid transition-[grid-template-rows] duration-500 ease-out"
                    style={{ gridTemplateRows: stratOpen ? "1fr" : "0fr" }}
                  >
                    <div className="overflow-hidden flex flex-col gap-3">
                      {strategies.slice(3).map((s) => {
                        const { head, detail } = splitEntry(s.title);
                        return (
                          <EntryCard
                            key={s.id}
                            id={s.id}
                            head={head}
                            detail={s.summary || detail}
                            accent={dim.strategy}
                            showIds={showIds}
                            sensitive
                            relations={[
                              ...(s.implements ?? []).map((gid) => ({ verb: "drives", id: gid })),
                              ...(s.overcomes ?? []).map((cid) => ({ verb: "counters", id: cid })),
                            ]}
                          />
                        );
                      })}
                    </div>
                  </div>
                  <ShowMoreButton
                    open={stratOpen}
                    label={`show all ${strategies.length}`}
                    onClick={() => setStratOpen((v) => !v)}
                  />
                </>
              )}
            </div>
          </div>
        </Section>
      )}

      {/* ===================== PROJECTS + work pulse ===================== */}
      {projects.length > 0 && (
        <Section icon={FolderKanban} kicker="Where the work is happening" title="Projects">
          {(count(work.inProgress) + count(work.ready) + count(work.done) + count(work.inbox)) > 0 && (
            <Reveal>
              <div className="glass rounded-xl p-4 mb-4 flex flex-wrap gap-6">
                {[
                  { k: "In progress", v: count(work.inProgress), c: "var(--neon)" },
                  { k: "Ready", v: count(work.ready), c: "var(--positive)" },
                  { k: "Done", v: count(work.done), c: "var(--neon-2)" },
                  { k: "Inbox", v: count(work.inbox), c: "var(--muted-foreground)" },
                ].filter((w) => w.v > 0).map((w) => (
                  <div key={w.k}>
                    <div className="text-2xl font-bold font-mono tabular-nums" style={{ color: w.c }}>
                      {String(w.v).padStart(2, "0")}
                    </div>
                    <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground">{w.k}</div>
                  </div>
                ))}
              </div>
            </Reveal>
          )}
          <div className="grid sm:grid-cols-2 gap-3">
            {projects.map((p, i) => (
              <Reveal key={p.id} delay={i * 45} from={i % 2 === 0 ? "left" : "right"}>
                <ProjectCard p={p} showIds={showIds} />
              </Reveal>
            ))}
          </div>
        </Section>
      )}

      {/* ===================== SIGNALS (the person + the system) ===================== */}
      <PersonSystem />

      {/* ===================== QUOTE ===================== */}
      <Reveal>
        <figure className="mt-20 glass-2 hud-corners rounded-2xl px-8 py-10 text-center scanlines relative overflow-hidden">
          <blockquote className="text-xl sm:text-2xl font-medium text-foreground leading-relaxed max-w-[46ch] mx-auto">
            &ldquo;{quote.t}&rdquo;
          </blockquote>
          <figcaption className="mt-4 text-[12px] font-mono uppercase tracking-[0.24em] text-muted-foreground">
            {quote.a}
          </figcaption>
        </figure>
      </Reveal>

      <footer className="mt-16 flex items-center justify-center gap-3 text-[11px] font-mono text-muted-foreground">
        <span>LifeOS · Life Operating System</span>
        <span style={{ color: "var(--neon)" }}>·</span>
        <span>{missions.length} missions · {goals.length} goals · {strategies.length} strategies · {projects.length} projects</span>
      </footer>
    </div>
  );
}
