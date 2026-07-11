"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import MarkdownRenderer from "@/components/wiki/MarkdownRenderer";
import WikiMeta from "@/components/wiki/WikiMeta";
import EmptyStateGuide from "@/components/EmptyStateGuide";
import {
  Users,
  Building2,
  Lightbulb,
  Bookmark,
  Clock,
  ExternalLink,
  Search,
  X,
  FileText,
  BookOpen,
  Newspaper,
  Library,
  Network,
  FlaskConical,
  Wrench,
  FolderOpen,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";
import { wikiPageUrl, WIKI_GRAPH_URL } from "@/lib/wiki-links";
import { Reveal } from "@/components/kit/Reveal";
import { Section } from "@/components/kit/Section";

interface WikiPage {
  slug: string;
  title: string;
  category: string;
  tags?: string[];
  quality?: number;
  lastModified: string;
  wordCount: number;
  author?: string;
  source?: string;
  sourceUrl?: string;
  postDate?: string;
}

interface WikiIndex {
  tree: unknown[];
  recentChanges: WikiPage[];
  stats: {
    totalPages: number;
    totalPeople: number;
    totalCompanies: number;
    totalIdeas: number;
    totalBlogs: number;
    totalResearch?: number;
    totalTools?: number;
    totalBookmarks: number;
  };
}

interface PageDetail {
  slug: string;
  title: string;
  category: string;
  content: string;
  wordCount: number;
  lastModified: string;
  backlinks: Array<{ slug: string; title: string; category: string }>;
  related?: Array<{ slug: string; title: string; category: string }>;
  wikilinks: string[];
  tags?: string[];
  quality?: number;
  filePath?: string;
  author?: string;
  source?: string;
  sourceUrl?: string;
  postDate?: string;
}

interface BookmarkDetail {
  slug: string;
  id: string;
  title: string;
  category: "bookmark";
  url: string;
  excerpt: string;
  note: string;
  folder: string;
  tags: string[];
  created: string;
  cover: string;
  favorite: boolean;
  wordCount: number;
  lastModified: string;
}

interface SearchHit {
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  score: number;
  author?: string;
  source?: string;
  sourceUrl?: string;
  postDate?: string;
}

/* ---------- theme-token color maps (re-theme with [data-theme]) ---------- */

const MUTED = "hsl(var(--muted-foreground))";

const CATEGORY_ICONS: Record<string, typeof Users> = {
  person: Users,
  company: Building2,
  idea: Lightbulb,
  blog: Newspaper,
  bookmark: Bookmark,
  research: FlaskConical,
  tool: Wrench,
};

const CATEGORY_COLOR: Record<string, string> = {
  "system-doc": "var(--neon-2)",
  person: "var(--dim-relationships)",
  company: "var(--dim-money)",
  idea: "var(--dim-freedom)",
  blog: "var(--dim-creative)",
  bookmark: "var(--dim-creative)",
  research: "var(--neon-3)",
  tool: "var(--neon-2)",
};

const SEARCH_CATEGORY_ICONS: Record<string, typeof FileText> = {
  "system-doc": BookOpen,
  person: Users,
  company: Building2,
  idea: Lightbulb,
  blog: Newspaper,
  bookmark: Bookmark,
  research: FlaskConical,
  tool: Wrench,
};

const SEARCH_CATEGORY_LABELS: Record<string, string> = {
  "system-doc": "System",
  person: "People",
  company: "Companies",
  idea: "Ideas",
  blog: "Blogs",
  bookmark: "Bookmarks",
  research: "Research",
  tool: "Tools",
};

function fmtDate(iso: string): string {
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

/* ---------- search (BM25 over the archive — one debounced fetch) ---------- */

function KnowledgeHeroSearch({ totalPages }: { totalPages: number }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/wiki/search?q=${encodeURIComponent(query)}&limit=40`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || []);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [query]);

  const grouped = results.reduce<Record<string, SearchHit[]>>((acc, r) => {
    const cat = r.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(r);
    return acc;
  }, {});

  return (
    <div className="space-y-3">
      <Reveal>
        <div className="glass rounded-xl px-4 sm:px-5 py-3.5 flex items-center gap-3">
          <Search className="w-4 h-4 shrink-0" style={{ color: "var(--neon)" }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setQuery("");
                inputRef.current?.blur();
              } else if (e.key === "Enter" && results[0]) {
                e.preventDefault();
                router.push(wikiPageUrl(results[0].category, results[0].slug));
              }
            }}
            placeholder={`Search ${totalPages.toLocaleString()} entries — people, companies, ideas, blogs, bookmarks…`}
            className="flex-1 min-w-0 bg-transparent outline-none text-[15px] text-foreground placeholder:text-muted-foreground"
            aria-label="Search the knowledge archive"
            autoFocus
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </Reveal>

      {query.trim() && (
        <div className="glass rounded-xl overflow-hidden">
          {loading && results.length === 0 && (
            <div className="px-5 py-6 text-[13px] font-mono text-muted-foreground">Searching…</div>
          )}
          {!loading && results.length === 0 && (
            <div className="px-5 py-6 text-[13px] font-mono text-muted-foreground">
              No results for &ldquo;{query}&rdquo;
            </div>
          )}
          {results.length > 0 && (
            <div className="max-h-[60vh] overflow-y-auto">
              {Object.entries(grouped).map(([cat, items]) => {
                const Icon = SEARCH_CATEGORY_ICONS[cat] || FileText;
                const label = SEARCH_CATEGORY_LABELS[cat] || cat;
                const color = CATEGORY_COLOR[cat] ?? MUTED;
                return (
                  <div key={cat}>
                    <div
                      className="flex items-center gap-2 px-5 py-2 text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground"
                      style={{ background: "var(--surface-1)", borderBottom: "1px solid var(--hairline)" }}
                    >
                      <Icon className="w-3 h-3" style={{ color }} />
                      {label}
                      <span className="ml-auto tabular-nums">{String(items.length).padStart(2, "0")}</span>
                    </div>
                    {items.map((r) => (
                      <Link
                        key={r.slug + r.category}
                        href={wikiPageUrl(r.category, r.slug)}
                        className="block px-5 py-2.5 transition-colors hover:bg-surface-1"
                        style={{ borderBottom: "1px solid var(--hairline)", textDecoration: "none" }}
                      >
                        <div className="flex items-baseline gap-2">
                          <span className="flex-1 truncate text-[14px] text-foreground" data-sensitive>
                            {r.title}
                          </span>
                          {r.author && (
                            <span className="shrink-0 truncate max-w-[200px] text-[12px] font-mono text-muted-foreground" data-sensitive>
                              {r.author}
                            </span>
                          )}
                        </div>
                        {r.excerpt && (
                          <span className="block mt-0.5 line-clamp-1 text-[12px] text-muted-foreground" data-sensitive>
                            {r.excerpt}
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- hero ---------- */

function Hero({ stats }: { stats: WikiIndex["stats"] }) {
  const tiles = [
    { label: "Entries", value: stats.totalPages, icon: Library },
    { label: "People", value: stats.totalPeople, icon: Users },
    { label: "Companies", value: stats.totalCompanies, icon: Building2 },
    { label: "Ideas", value: stats.totalIdeas, icon: Lightbulb },
    { label: "Research", value: stats.totalResearch ?? 0, icon: FlaskConical },
    { label: "Tools", value: stats.totalTools ?? 0, icon: Wrench },
    { label: "Blogs", value: stats.totalBlogs ?? 0, icon: Newspaper },
    { label: "Bookmarks", value: stats.totalBookmarks, icon: Bookmark },
  ].filter((t) => t.value > 0);

  return (
    <section className="pt-8 sm:pt-10">
      <div className="flex items-center gap-2.5 mb-4 text-[11px] font-mono uppercase tracking-[0.28em] text-muted-foreground">
        <span
          className="w-1.5 h-1.5 rounded-full anim-breathe"
          style={{ background: "var(--positive)", boxShadow: "0 0 8px var(--positive)" }}
        />
        LifeOS · Knowledge
      </div>

      <div className="flex items-end justify-between gap-3 flex-wrap">
        <h1 className="text-2xl sm:text-3xl font-bold leading-tight text-foreground">Knowledge Archive</h1>
        {stats.totalPages > 0 && (
          <Link
            href={WIKI_GRAPH_URL}
            className="inline-flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-full text-muted-foreground hover:text-foreground transition-colors"
            style={{ background: "var(--surface-1)", border: "1px solid var(--hairline)", textDecoration: "none" }}
            aria-label="Open the knowledge graph"
          >
            <Network className="w-3.5 h-3.5" style={{ color: "var(--neon-2)" }} />
            Graph view
          </Link>
        )}
      </div>
      <p className="mt-2 text-[14px] text-muted-foreground max-w-[70ch]">
        People, companies, ideas, blogs, and bookmarks — the graph of what you&apos;ve learned.
      </p>

      {tiles.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-3">
          {tiles.map((t) => (
            <div key={t.label} className="glass rounded-lg px-3.5 py-3 min-w-[116px]">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                <t.icon className="w-3.5 h-3.5" />
                <span className="text-[10px] font-mono uppercase tracking-[0.16em]">{t.label}</span>
              </div>
              <div className="text-3xl font-bold font-mono text-foreground tabular-nums">
                {String(t.value).padStart(2, "0")}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ---------- archive browser (full corpus, not just recent) ---------- */

interface TreeNode {
  label: string;
  count?: number;
  slug?: string;
  category?: string;
  children?: TreeNode[];
}

function EntryCardLink({ leaf }: { leaf: TreeNode }) {
  const Icon = CATEGORY_ICONS[leaf.category ?? ""] || Lightbulb;
  const color = CATEGORY_COLOR[leaf.category ?? ""] ?? MUTED;
  return (
    <Link
      href={wikiPageUrl(leaf.category ?? "idea", leaf.slug ?? "")}
      className="glass hover-lift rounded-xl p-4 h-full flex items-start gap-2.5"
      style={{ textDecoration: "none" }}
    >
      <Icon className="w-4 h-4 shrink-0 mt-0.5" style={{ color }} />
      <span className="text-[14px] font-medium leading-snug text-foreground line-clamp-2" data-sensitive title={leaf.label}>
        {leaf.label}
      </span>
    </Link>
  );
}

function ArchiveBrowser({ tree }: { tree: TreeNode[] }) {
  const knowledgeNode = tree.find((n) => n.label === "Knowledge Archive");
  const docsNode = tree.find((n) => n.label === "Documentation");

  const shelves = (knowledgeNode?.children ?? []).filter((d) => (d.children?.length ?? 0) > 0);

  return (
    <>
      {shelves.length > 0 && (
        <Section icon={Library} kicker="The full corpus, shelf by shelf" title="Browse the Archive" count={knowledgeNode?.count}>
          <div className="space-y-6">
            {shelves.map((domain) => {
              const cat = domain.children?.[0]?.category ?? "";
              const color = CATEGORY_COLOR[cat] ?? MUTED;
              const Icon = CATEGORY_ICONS[cat] || Lightbulb;
              return (
                <Reveal key={domain.label}>
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Icon className="w-4 h-4" style={{ color }} />
                      <span className="text-[12px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
                        {domain.label}
                      </span>
                      <span
                        className="text-[11px] font-mono px-1.5 py-0.5 rounded-full tabular-nums"
                        style={{
                          color,
                          background: "var(--surface-1)",
                          border: `1px solid color-mix(in oklab, ${color} 35%, transparent)`,
                        }}
                      >
                        {domain.count ?? domain.children?.length ?? 0}
                      </span>
                    </div>
                    <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
                      {(domain.children ?? []).map((leaf) => (
                        <EntryCardLink key={(leaf.slug ?? "") + (leaf.category ?? "")} leaf={leaf} />
                      ))}
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </Section>
      )}

      {docsNode && (docsNode.children?.length ?? 0) > 0 && (
        <Section icon={BookOpen} kicker="System reference, grouped" title="Documentation" count={docsNode.count}>
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
            {(docsNode.children ?? []).map((group, i) => (
              <Reveal key={group.label} delay={i * 30}>
                <details className="glass rounded-xl overflow-hidden group/doc">
                  <summary className="flex items-center gap-2.5 px-4 py-3.5 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden">
                    <FolderOpen className="w-4 h-4 shrink-0" style={{ color: "var(--neon-2)" }} />
                    <span className="flex-1 text-[14px] font-medium text-foreground truncate">{group.label}</span>
                    <span className="text-[11px] font-mono text-muted-foreground tabular-nums">
                      {String(group.count ?? group.children?.length ?? 0).padStart(2, "0")}
                    </span>
                    <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform group-open/doc:rotate-180" />
                  </summary>
                  <ul className="pb-2" style={{ borderTop: "1px solid var(--hairline)" }}>
                    {(group.children ?? []).map((doc) => (
                      <li key={doc.slug}>
                        <Link
                          href={wikiPageUrl(doc.category ?? "system-doc", doc.slug ?? "")}
                          className="flex items-center gap-2 px-4 py-2 text-[13px] text-muted-foreground hover:text-foreground hover:bg-surface-1 transition-colors"
                          style={{ textDecoration: "none" }}
                        >
                          <FileText className="w-3.5 h-3.5 shrink-0 opacity-60" />
                          <span className="truncate">{doc.label}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </details>
              </Reveal>
            ))}
          </div>
        </Section>
      )}
    </>
  );
}

/* ---------- landing ---------- */

function KnowledgeLanding({ data }: { data: WikiIndex }) {
  const knowledgeEntries = data.recentChanges.filter(
    (p) =>
      p.category === "person" ||
      p.category === "company" ||
      p.category === "idea" ||
      p.category === "blog" ||
      p.category === "research" ||
      p.category === "tool" ||
      p.category === "bookmark",
  );
  const recent = knowledgeEntries.slice(0, 20);

  const isFreshInstall = data.stats.totalPages === 0;

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-5 sm:px-8 lg:px-10 pb-24 max-w-[1400px] mx-auto">
        {isFreshInstall && (
          <div className="pt-8">
            <EmptyStateGuide
              section="Knowledge Archive"
              description="Curated notes on people, companies, ideas, and research — the graph of what you've learned. Notes live under ~/.claude/LIFEOS/MEMORY/KNOWLEDGE/People|Companies|Ideas|Research/."
              daPromptExample="help me start my knowledge archive"
            />
          </div>
        )}

        <Hero stats={data.stats} />

        {data.stats.totalPages > 0 && (
          <div className="mt-8">
            <KnowledgeHeroSearch totalPages={data.stats.totalPages} />
          </div>
        )}

        {recent.length > 0 && (
          <Section icon={Clock} kicker="Latest writes to the archive" title="Recent Changes" count={recent.length}>
            <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
              {recent.map((page, i) => {
                const Icon = CATEGORY_ICONS[page.category] || Lightbulb;
                const color = CATEGORY_COLOR[page.category] ?? MUTED;
                const date = fmtDate(page.lastModified);
                return (
                  <Reveal key={page.slug + page.category} delay={i * 40}>
                    <Link
                      href={wikiPageUrl(page.category, page.slug)}
                      className="glass hover-lift rounded-xl p-4 h-full flex flex-col gap-2"
                      style={{ textDecoration: "none" }}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 shrink-0" style={{ color }} />
                        <TokenPill text={page.category} color={color} />
                        {date && (
                          <span className="ml-auto text-[11px] font-mono tabular-nums text-muted-foreground">{date}</span>
                        )}
                      </div>
                      <div className="text-[14px] font-medium leading-snug text-foreground line-clamp-2" data-sensitive title={page.title}>
                        {page.title}
                      </div>
                      {page.author && (
                        <div className="text-[12px] font-mono text-muted-foreground truncate" data-sensitive>
                          {page.author}
                        </div>
                      )}
                    </Link>
                  </Reveal>
                );
              })}
            </div>
          </Section>
        )}

        <ArchiveBrowser tree={(data.tree as TreeNode[]) ?? []} />
      </div>
    </div>
  );
}

/* ---------- route ---------- */

function KnowledgePageInner() {
  const searchParams = useSearchParams();
  const category = searchParams.get("category");
  const slug = searchParams.get("slug");
  const bookmarkSlug = searchParams.get("bookmark");

  const isViewingKnowledge = !!category && !!slug;
  const isViewingBookmark = !!bookmarkSlug;
  const isViewing = isViewingKnowledge || isViewingBookmark;

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

  const { data: knowledgeDetail } = useQuery<PageDetail>({
    queryKey: ["wiki-knowledge", category, slug],
    queryFn: async () => {
      const res = await fetch(`/api/wiki/knowledge/${category}/${slug}`);
      if (!res.ok) throw new Error("Failed to fetch knowledge note");
      return res.json();
    },
    enabled: isViewingKnowledge,
  });

  const { data: bookmarkDetail } = useQuery<BookmarkDetail>({
    queryKey: ["wiki-bookmark", bookmarkSlug],
    queryFn: async () => {
      const res = await fetch(`/api/wiki/bookmark/${bookmarkSlug}`);
      if (!res.ok) throw new Error("Failed to fetch bookmark");
      return res.json();
    },
    enabled: isViewingBookmark,
  });

  if (isViewingBookmark && bookmarkDetail) {
    const created = bookmarkDetail.created ? fmtDate(bookmarkDetail.created) : "";
    return (
      <div className="h-full overflow-y-auto">
        <div className="px-5 sm:px-8 pb-24 pt-8 sm:pt-10 max-w-3xl mx-auto">
          <div className="flex items-center gap-2.5 mb-4 text-[11px] font-mono uppercase tracking-[0.28em] text-muted-foreground">
            <Bookmark className="w-3.5 h-3.5" style={{ color: "var(--dim-creative)" }} />
            LifeOS · Knowledge · Bookmark
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold leading-tight text-foreground" data-sensitive>
            {bookmarkDetail.title}
          </h1>

          {bookmarkDetail.url && (
            <a
              href={bookmarkDetail.url}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-1.5 mt-2 max-w-full text-[13px] font-mono transition-opacity hover:opacity-80"
              style={{ color: "var(--neon-2)" }}
              data-sensitive
            >
              <span className="truncate">{bookmarkDetail.url}</span>
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            </a>
          )}

          {(bookmarkDetail.favorite || bookmarkDetail.folder || created || (bookmarkDetail.tags || []).length > 0) && (
            <div className="flex flex-wrap items-center gap-1.5 mt-4" data-sensitive>
              {bookmarkDetail.favorite && <TokenPill text="favorite" color="var(--warn)" />}
              {bookmarkDetail.folder && <LabelPill text={bookmarkDetail.folder} />}
              {(bookmarkDetail.tags || []).map((t) => (
                <LabelPill key={t} text={t} />
              ))}
              {created && (
                <span className="text-[11px] font-mono tabular-nums text-muted-foreground ml-1">saved {created}</span>
              )}
            </div>
          )}

          {bookmarkDetail.excerpt && (
            <p className="mt-6 text-[14px] leading-relaxed text-muted-foreground" data-sensitive>
              {bookmarkDetail.excerpt}
            </p>
          )}

          {bookmarkDetail.note && (
            <div className="glass rounded-xl p-4 mt-4">
              <div className="text-[10px] font-mono uppercase tracking-[0.24em] mb-1.5" style={{ color: "var(--neon)" }}>
                Note
              </div>
              <p className="text-[14px] leading-relaxed text-foreground" data-sensitive>
                {bookmarkDetail.note}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (isViewingKnowledge && knowledgeDetail) {
    return (
      <div className="flex h-full">
        <div className="flex-1 overflow-y-auto p-6 max-w-4xl">
          <MarkdownRenderer content={knowledgeDetail.content} />
        </div>
        <WikiMeta
          title={knowledgeDetail.title}
          category={knowledgeDetail.category}
          tags={knowledgeDetail.tags}
          quality={knowledgeDetail.quality}
          lastModified={knowledgeDetail.lastModified}
          wordCount={knowledgeDetail.wordCount}
          backlinks={knowledgeDetail.backlinks}
          filePath={knowledgeDetail.filePath}
          author={knowledgeDetail.author}
          source={knowledgeDetail.source}
          sourceUrl={knowledgeDetail.sourceUrl}
          postDate={knowledgeDetail.postDate}
          related={knowledgeDetail.related}
        />
      </div>
    );
  }

  if (!isViewing && indexData) {
    return <KnowledgeLanding data={indexData} />;
  }

  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-[13px] font-mono text-muted-foreground">Loading Knowledge…</div>
    </div>
  );
}

export default function KnowledgePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-full">
          <div className="text-[13px] font-mono text-muted-foreground">Loading Knowledge…</div>
        </div>
      }
    >
      <KnowledgePageInner />
    </Suspense>
  );
}
