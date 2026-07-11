"use client";

import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import MarkdownRenderer from "@/components/wiki/MarkdownRenderer";
import WikiMeta from "@/components/wiki/WikiMeta";
import {
  BookOpen,
  Compass,
  Sparkles,
  ArrowRight,
  Folder,
  History,
} from "lucide-react";
import Link from "next/link";
import { wikiPageUrl } from "@/lib/wiki-links";
import { Reveal } from "@/components/kit/Reveal";
import { Section } from "@/components/kit/Section";

interface TreeNode {
  label: string;
  slug?: string;
  category?: string;
  children?: TreeNode[];
  count?: number;
}

interface WikiPage {
  slug: string;
  title: string;
  category: string;
  tags?: string[];
  quality?: number;
  lastModified: string;
  wordCount: number;
  group?: string;
}

interface WikiIndex {
  tree: TreeNode[];
  recentChanges: WikiPage[];
  stats: { totalSystem: number };
}

interface PageDetail {
  slug: string;
  title: string;
  category: string;
  content: string;
  wordCount: number;
  lastModified: string;
  backlinks: Array<{ slug: string; title: string; category: string }>;
  wikilinks: string[];
  tags?: string[];
  quality?: number;
  filePath?: string;
  group?: string;
}

const START_HERE_SLUGS = [
  {
    slug: "PAISystemArchitecture",
    tagline: "The master architecture document — every subsystem in context",
  },
  {
    slug: "LifeOs__LifeOsThesis",
    tagline: "Why LifeOS exists — the Life Operating System thesis",
  },
  {
    slug: "ARCHITECTURE_SUMMARY",
    tagline: "One-page architecture summary — auto-generated, always current",
  },
];

/* ---------- theme-token color maps (re-theme with [data-theme]) ---------- */

function qualityColor(q: number): string {
  if (q >= 0.8) return "var(--positive)";
  if (q >= 0.5) return "var(--warn)";
  return "var(--danger)";
}

function flattenTree(nodes: TreeNode[] | undefined): TreeNode[] {
  if (!nodes) return [];
  const out: TreeNode[] = [];
  for (const n of nodes) {
    out.push(n);
    if (n.children) out.push(...flattenTree(n.children));
  }
  return out;
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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
  docCount,
  sectionCount,
  latest,
}: {
  docCount: number;
  sectionCount: number;
  latest?: WikiPage;
}) {
  const stats = [
    { label: "Documents", value: docCount, icon: BookOpen },
    { label: "Sections", value: sectionCount, icon: Folder },
  ].filter((s) => s.value > 0);

  return (
    <section className="pt-8 sm:pt-10">
      <div className="flex items-center gap-2.5 mb-4 text-[11px] font-mono uppercase tracking-[0.28em] text-muted-foreground">
        <span
          className="w-1.5 h-1.5 rounded-full anim-breathe"
          style={{ background: "var(--positive)", boxShadow: "0 0 8px var(--positive)" }}
        />
        LifeOS · Docs
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold leading-tight text-foreground">Documentation</h1>
      <p className="mt-2 max-w-[70ch] text-[14px] leading-relaxed text-muted-foreground">
        LifeOS subsystem architecture, algorithm, and reference — searchable, cross-linked, always current.
      </p>

      {latest && (
        <div className="mt-4 flex flex-col gap-1">
          <p className="text-[13px] font-mono text-muted-foreground">
            <span className="uppercase tracking-[0.16em] text-[10px] mr-2" style={{ color: "var(--neon)" }}>
              latest
            </span>
            {latest.title}
            <span className="ml-2 tabular-nums" style={{ color: "var(--neon-2)" }}>
              {shortDate(latest.lastModified)}
            </span>
          </p>
        </div>
      )}

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

function DocsLanding({ data }: { data: WikiIndex }) {
  const documentationNode =
    data.tree.find((n) => n.label.toLowerCase() === "documentation") ?? null;

  const groups: TreeNode[] = documentationNode?.children ?? [];

  const allLeaves = flattenTree(groups).filter((n) => n.slug);

  const slugToNode = new Map<string, TreeNode>();
  for (const leaf of allLeaves) {
    if (leaf.slug) slugToNode.set(leaf.slug, leaf);
  }

  type StartHereEntry = {
    slug: string;
    tagline: string;
    title: string;
    category: string | undefined;
  };

  const startHere: StartHereEntry[] = START_HERE_SLUGS.flatMap((entry) => {
    const node = slugToNode.get(entry.slug);
    if (!node) return [];
    return [{ slug: entry.slug, tagline: entry.tagline, title: node.label, category: node.category }];
  });

  const recent = data.recentChanges.slice(0, 6);
  const isEmpty = startHere.length === 0 && groups.length === 0 && recent.length === 0;

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-5 sm:px-8 lg:px-10 pb-24 max-w-[1400px] mx-auto">
        <Hero
          docCount={data.stats.totalSystem}
          sectionCount={groups.length}
          latest={recent[0]}
        />

        {isEmpty && (
          <div className="glass rounded-xl text-center px-4 py-10 mt-10">
            <BookOpen className="w-8 h-8 mx-auto text-muted-foreground" style={{ opacity: 0.4 }} />
            <p className="text-[13px] text-muted-foreground mt-3">
              No documentation indexed yet — the wiki index has no system docs to show.
            </p>
          </div>
        )}

        {startHere.length > 0 && (
          <Section icon={Sparkles} kicker="Orientation reading order" title="Start Here" count={startHere.length}>
            <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
              {startHere.map((entry, i) => (
                <Reveal key={entry.slug} delay={i * 40}>
                  <Link
                    href={wikiPageUrl(entry.category ?? "system-doc", entry.slug)}
                    className="group glass hover-lift rounded-xl p-4 flex flex-col gap-2 h-full"
                    style={{ textDecoration: "none" }}
                    aria-label={`Open ${entry.title}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-[15px] font-semibold text-foreground leading-snug">{entry.title}</h3>
                      <span className="text-[11px] font-mono text-muted-foreground tabular-nums shrink-0">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <p className="text-[13px] leading-relaxed text-muted-foreground">{entry.tagline}</p>
                    <div className="mt-auto flex items-center gap-1.5 pt-2 text-[11px] font-mono uppercase tracking-[0.2em]" style={{ color: "var(--neon)" }}>
                      Open
                      <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
          </Section>
        )}

        {groups.length > 0 && (
          <Section icon={Compass} kicker="Subsystem reference shelves" title="Browse by Section" count={groups.length}>
            <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
              {groups.map((group, i) => {
                const firstChild = group.children?.find((c) => c.slug);
                const href =
                  firstChild && firstChild.slug
                    ? wikiPageUrl(firstChild.category ?? "system-doc", firstChild.slug)
                    : "#";
                const childLabels = (group.children ?? [])
                  .filter((c) => c.slug)
                  .slice(0, 3)
                  .map((c) => c.label);

                return (
                  <Reveal key={group.label} delay={i * 40}>
                    <Link
                      href={href}
                      className="glass hover-lift rounded-xl p-4 flex flex-col gap-2 h-full"
                      style={{ textDecoration: "none" }}
                      aria-label={`Browse ${group.label} docs`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[12px] font-mono font-semibold uppercase tracking-[0.14em] text-foreground truncate">
                          {group.label}
                        </span>
                        {group.count !== undefined && (
                          <span className="text-[11px] font-mono text-muted-foreground tabular-nums shrink-0">
                            {String(group.count).padStart(2, "0")}
                          </span>
                        )}
                      </div>
                      {childLabels.length > 0 && (
                        <p className="text-[13px] text-muted-foreground leading-relaxed line-clamp-2">
                          {childLabels.join(" · ")}
                          {(group.children?.length ?? 0) > 3 && " · …"}
                        </p>
                      )}
                    </Link>
                  </Reveal>
                );
              })}
            </div>
          </Section>
        )}

        {recent.length > 0 && (
          <Section icon={History} kicker="Freshest pages in the corpus" title="Recently Updated" count={recent.length}>
            <Reveal>
              <div className="glass rounded-xl overflow-hidden">
                {recent.map((page, i) => (
                  <Link
                    key={page.slug}
                    href={wikiPageUrl(page.category, page.slug)}
                    className="flex items-center gap-4 px-4 sm:px-5 py-3.5 transition-colors hover:bg-surface-1"
                    style={{
                      borderTop: i === 0 ? "none" : "1px solid var(--hairline)",
                      textDecoration: "none",
                    }}
                    aria-label={`Open ${page.title}`}
                  >
                    <span className="w-6 shrink-0 text-[11px] font-mono text-right tabular-nums" style={{ color: "var(--neon-2)" }}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] text-foreground truncate" title={page.title}>
                        {page.title}
                      </div>
                      <div className="text-[11px] font-mono mt-0.5 truncate text-muted-foreground">
                        {page.category} · {page.wordCount.toLocaleString()} words
                      </div>
                    </div>
                    {page.quality !== undefined && (
                      <TokenPill
                        text={`${Math.round(page.quality * 100)}%`}
                        color={qualityColor(page.quality)}
                        title="Wiki quality score"
                      />
                    )}
                    <span className="shrink-0 text-[11px] font-mono text-muted-foreground tabular-nums">
                      {shortDate(page.lastModified)}
                    </span>
                  </Link>
                ))}
              </div>
            </Reveal>
          </Section>
        )}
      </div>
    </div>
  );
}

function DocsPageInner() {
  const searchParams = useSearchParams();
  const docSlug = searchParams.get("doc");
  const isViewing = !!docSlug;

  const { data: indexData } = useQuery<WikiIndex>({
    queryKey: ["wiki-index"],
    queryFn: async () => {
      const res = await fetch("/api/wiki");
      if (!res.ok) throw new Error("Failed to fetch wiki index");
      return res.json();
    },
    staleTime: 30_000,
    enabled: !isViewing,
  });

  const { data: docDetail } = useQuery<PageDetail>({
    queryKey: ["wiki-doc", docSlug],
    queryFn: async () => {
      const res = await fetch(`/api/wiki/doc/${docSlug}`);
      if (!res.ok) throw new Error("Failed to fetch doc");
      return res.json();
    },
    enabled: isViewing,
  });

  if (isViewing && docDetail) {
    return (
      <div className="flex h-full">
        <div className="flex-1 overflow-y-auto p-6 max-w-4xl">
          <MarkdownRenderer content={docDetail.content} />
        </div>
        <WikiMeta
          title={docDetail.title}
          category={docDetail.category}
          tags={docDetail.tags}
          quality={docDetail.quality}
          lastModified={docDetail.lastModified}
          wordCount={docDetail.wordCount}
          backlinks={docDetail.backlinks}
          filePath={docDetail.filePath}
        />
      </div>
    );
  }

  if (!isViewing && indexData) {
    return <DocsLanding data={indexData} />;
  }

  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-[13px] font-mono text-muted-foreground">Loading docs…</div>
    </div>
  );
}

export default function DocsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-full">
          <div className="text-[13px] font-mono text-muted-foreground">Loading docs…</div>
        </div>
      }
    >
      <DocsPageInner />
    </Suspense>
  );
}
