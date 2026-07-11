"use client";

import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import MarkdownRenderer from "@/components/wiki/MarkdownRenderer";
import WikiMeta from "@/components/wiki/WikiMeta";
import { BookOpen, Clock, FileText, Users, Building2, Lightbulb, Bookmark, ExternalLink } from "lucide-react";
import Link from "next/link";
import { wikiPageUrl } from "@/lib/wiki-links";
import { Reveal } from "@/components/kit/Reveal";

interface WikiPage {
  slug: string;
  title: string;
  category: string;
  tags?: string[];
  quality?: number;
  lastModified: string;
  wordCount: number;
}

interface WikiIndex {
  tree: unknown[];
  recentChanges: WikiPage[];
  stats: {
    totalPages: number;
    totalSystem: number;
    totalPeople: number;
    totalCompanies: number;
    totalIdeas: number;
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
  wikilinks: string[];
  tags?: string[];
  quality?: number;
  filePath?: string;
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

const CATEGORY_ICONS: Record<string, typeof FileText> = {
  "system-doc": BookOpen,
  person: Users,
  company: Building2,
  idea: Lightbulb,
  bookmark: Bookmark,
};

const CATEGORY_COLOR: Record<string, string> = {
  "system-doc": "var(--neon-2)",
  person: "var(--neon-3)",
  company: "var(--dim-money)",
  idea: "var(--dim-relationships)",
  bookmark: "var(--dim-creative)",
};

const pageLink = wikiPageUrl;

function StatCard({ icon: Icon, label, count, color }: { icon: typeof FileText; label: string; count: number; color: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-lg glass">
      <Icon className="w-4 h-4" style={{ color }} />
      <div>
        <div className="text-[17px] font-semibold font-mono text-foreground tabular-nums">{count}</div>
        <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

// Landing page — shown when no doc/knowledge is selected
function WikiLanding({ data }: { data: WikiIndex }) {
  const stats = [
    { icon: FileText, label: "Total", count: data.stats.totalPages, color: "hsl(var(--foreground))" },
    { icon: BookOpen, label: "System", count: data.stats.totalSystem, color: "var(--neon-2)" },
    { icon: Users, label: "People", count: data.stats.totalPeople, color: "var(--neon-3)" },
    { icon: Building2, label: "Companies", count: data.stats.totalCompanies, color: "var(--dim-money)" },
    { icon: Lightbulb, label: "Ideas", count: data.stats.totalIdeas, color: "var(--dim-relationships)" },
    { icon: Bookmark, label: "Bookmarks", count: data.stats.totalBookmarks, color: "var(--dim-creative)" },
  ].filter((s) => s.count > 0);

  return (
    <div className="h-full overflow-y-auto p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <div className="flex items-center gap-2.5 mb-2 text-[11px] font-mono uppercase tracking-[0.28em] text-muted-foreground">
          <span className="w-1.5 h-1.5 rounded-full anim-breathe" style={{ background: "var(--positive)", boxShadow: "0 0 8px var(--positive)" }} />
          LifeOS · System
        </div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Wiki</h1>
        <p className="text-[13px] text-muted-foreground mt-1">System documentation &amp; knowledge archive</p>
      </div>

      {stats.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {stats.map((s) => (
            <StatCard key={s.label} icon={s.icon} label={s.label} count={s.count} color={s.color} />
          ))}
        </div>
      )}

      {data.recentChanges.length > 0 && (
        <div>
          <h2 className="text-[11px] font-mono font-medium text-muted-foreground uppercase tracking-wider mb-3">
            <Clock className="w-3.5 h-3.5 inline mr-2" />
            Recent Changes
          </h2>
          <div className="space-y-1">
            {data.recentChanges.slice(0, 20).map((page, i) => {
              const Icon = CATEGORY_ICONS[page.category] || FileText;
              const color = CATEGORY_COLOR[page.category] ?? "hsl(var(--muted-foreground))";
              return (
                <Reveal key={page.slug + page.category} delay={Math.min(i, 10) * 25}>
                  <Link
                    href={pageLink(page.category, page.slug)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover-lift transition-colors group"
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" style={{ color }} />
                    <span className="text-[13px] text-foreground/90 group-hover:text-foreground transition-colors truncate">{page.title}</span>
                    <span className="ml-auto text-[11px] font-mono text-muted-foreground shrink-0 tabular-nums">
                      {new Date(page.lastModified).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                    {page.quality !== undefined && (
                      <span
                        className="text-[11px] font-mono shrink-0"
                        style={{ color: page.quality >= 7 ? "var(--positive)" : page.quality >= 4 ? "var(--warn)" : "var(--danger)" }}
                      >
                        Q{page.quality}
                      </span>
                    )}
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Document viewer — shown when a doc or knowledge note is selected
function DocViewer({ detail }: { detail: PageDetail }) {
  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-y-auto p-6 max-w-4xl">
        <MarkdownRenderer content={detail.content} />
      </div>
      <WikiMeta
        title={detail.title}
        category={detail.category}
        tags={detail.tags}
        quality={detail.quality}
        lastModified={detail.lastModified}
        wordCount={detail.wordCount}
        backlinks={detail.backlinks}
        filePath={detail.filePath}
      />
    </div>
  );
}

// Bookmark viewer — shown when a bookmark is selected
function BookmarkViewer({ detail }: { detail: BookmarkDetail }) {
  return (
    <div className="h-full overflow-y-auto p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Bookmark className="w-4 h-4 shrink-0" style={{ color: "var(--dim-creative)" }} />
          <span className="text-[11px] font-mono uppercase tracking-wider" style={{ color: "var(--dim-creative)" }}>Bookmark</span>
          {detail.favorite && <span className="text-[11px] font-mono ml-2" style={{ color: "var(--warn)" }}>Favorite</span>}
        </div>
        <h1 className="text-xl font-bold text-foreground leading-tight">{detail.title}</h1>
      </div>

      {detail.url && (
        <a
          href={detail.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-[13px] hover:opacity-80 transition-opacity break-all"
          style={{ color: "var(--neon-2)" }}
        >
          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
          {detail.url.length > 80 ? detail.url.slice(0, 77) + "..." : detail.url}
        </a>
      )}

      {detail.cover && (
        <div className="rounded-lg overflow-hidden glass">
          <img
            src={detail.cover}
            alt={detail.title}
            className="w-full max-h-64 object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        </div>
      )}

      {detail.excerpt && (
        <div className="rounded-lg glass p-4">
          <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Excerpt</div>
          <p className="text-[13px] text-foreground leading-relaxed" data-sensitive="">{detail.excerpt}</p>
        </div>
      )}

      {detail.note && (
        <div className="rounded-lg glass p-4">
          <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Note</div>
          <p className="text-[13px] text-foreground leading-relaxed whitespace-pre-wrap" data-sensitive="">{detail.note}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 text-[13px]">
        {detail.folder && (
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Folder</span>
            <p className="text-foreground mt-0.5">{detail.folder}</p>
          </div>
        )}
        {detail.created && (
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Saved</span>
            <p className="text-foreground mt-0.5">
              {new Date(detail.created).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
        )}
        {detail.tags.length > 0 && (
          <div className="col-span-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Tags</span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {detail.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 text-[11px] font-mono rounded-full text-muted-foreground"
                  style={{ background: "var(--surface-1)", border: "1px solid var(--hairline)" }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PaiPageInner() {
  const searchParams = useSearchParams();
  const docSlug = searchParams.get("doc");
  const knowledgeCategory = searchParams.get("knowledge");
  const knowledgeSlug = searchParams.get("slug");
  const bookmarkSlug = searchParams.get("bookmark");

  const isViewingDoc = !!docSlug;
  const isViewingKnowledge = !!knowledgeCategory && !!knowledgeSlug;
  const isViewingBookmark = !!bookmarkSlug;
  const isViewing = isViewingDoc || isViewingKnowledge || isViewingBookmark;

  // Fetch wiki index (for landing page)
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

  // Fetch individual doc
  const { data: docDetail, isError: docError, error: docErr } = useQuery<PageDetail>({
    queryKey: ["wiki-doc", docSlug],
    queryFn: async () => {
      const res = await fetch(`/api/wiki/doc/${docSlug}`);
      if (!res.ok) throw new Error(`Failed to fetch doc: ${res.status} ${res.statusText}`);
      return res.json();
    },
    enabled: isViewingDoc,
    retry: false,
  });

  // Fetch individual knowledge note
  const { data: knowledgeDetail, isError: knowledgeError, error: knowledgeErr } = useQuery<PageDetail>({
    queryKey: ["wiki-knowledge", knowledgeCategory, knowledgeSlug],
    queryFn: async () => {
      const res = await fetch(`/api/wiki/knowledge/${knowledgeCategory}/${knowledgeSlug}`);
      if (!res.ok) throw new Error(`Failed to fetch knowledge note: ${res.status} ${res.statusText}`);
      return res.json();
    },
    enabled: isViewingKnowledge,
    retry: false,
  });

  // Fetch individual bookmark
  const { data: bookmarkDetail, isError: bookmarkError, error: bookmarkErr } = useQuery<BookmarkDetail>({
    queryKey: ["wiki-bookmark", bookmarkSlug],
    queryFn: async () => {
      const res = await fetch(`/api/wiki/bookmark/${bookmarkSlug}`);
      if (!res.ok) throw new Error(`Failed to fetch bookmark: ${res.status} ${res.statusText}`);
      return res.json();
    },
    enabled: isViewingBookmark,
    retry: false,
  });

  const detail = docDetail || knowledgeDetail;
  const fetchError = docError || knowledgeError || bookmarkError;
  const errorMessage =
    (docErr as Error | null)?.message ||
    (knowledgeErr as Error | null)?.message ||
    (bookmarkErr as Error | null)?.message ||
    "Unknown error";

  if (isViewingBookmark && bookmarkDetail) {
    return <BookmarkViewer detail={bookmarkDetail} />;
  }

  if (isViewing && detail) {
    return <DocViewer detail={detail} />;
  }

  if (!isViewing && indexData) {
    return <WikiLanding data={indexData} />;
  }

  // Error state — fetch failed (e.g. 404 for an unknown slug)
  if (isViewing && fetchError) {
    const requestedSlug = docSlug || knowledgeSlug || bookmarkSlug || "";
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 max-w-md mx-auto text-center">
        <div className="text-[13px] mb-2" style={{ color: "var(--danger)" }}>Page not found</div>
        <div className="text-[12px] font-mono text-muted-foreground mb-4 break-all">{requestedSlug}</div>
        <div className="text-[12px] text-muted-foreground mb-4">{errorMessage}</div>
        <Link href="/system" className="text-[12px] font-mono underline underline-offset-2" style={{ color: "var(--neon-2)" }}>
          Back to wiki index
        </Link>
      </div>
    );
  }

  // Loading state
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-[13px] font-mono text-muted-foreground">Loading…</div>
    </div>
  );
}

export default function PaiPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full text-[13px] font-mono text-muted-foreground">Loading…</div>}>
      <PaiPageInner />
    </Suspense>
  );
}
