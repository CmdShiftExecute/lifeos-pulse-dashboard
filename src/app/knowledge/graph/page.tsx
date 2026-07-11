"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { wikiPageUrl } from "@/lib/wiki-links";
import KnowledgeGraph from "@/components/wiki/KnowledgeGraph";
import { Network, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface GraphData {
  nodes: Array<{
    id: string;
    title: string;
    category: string;
    quality?: number;
    backlinkCount: number;
  }>;
  edges: Array<{
    source: string;
    target: string;
  }>;
}

/* Legend colors are theme tokens mapped to the closest hue of the renderer's
   fixed palette (system-doc cyan, person sky, company amber, idea violet). */
const CATEGORIES = [
  { key: "system-doc", label: "System", color: "var(--neon-2)" },
  { key: "person", label: "People", color: "var(--dim-relationships)" },
  { key: "company", label: "Companies", color: "var(--dim-money)" },
  { key: "idea", label: "Ideas", color: "var(--dim-freedom)" },
  { key: "research", label: "Research", color: "var(--neon-3)" },
  { key: "tool", label: "Tools", color: "var(--neon-2)" },
];

const MUTED = "hsl(var(--muted-foreground))";

export default function GraphPage() {
  const router = useRouter();
  const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading } = useQuery<GraphData>({
    queryKey: ["wiki-graph"],
    queryFn: async () => {
      const res = await fetch("/api/wiki/graph");
      if (!res.ok) throw new Error("Failed to fetch graph data");
      return res.json();
    },
    staleTime: 60_000,
  });

  const handleNodeClick = (slug: string, category: string) => {
    router.push(wikiPageUrl(category, slug));
  };

  const toggleCategory = (key: string) => {
    setHiddenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-[13px] font-mono text-muted-foreground">Loading graph…</div>
      </div>
    );
  }

  const visibleCount = data.nodes.filter((n) => !hiddenCategories.has(n.category)).length;
  // Honest sparsity flag: the graph only draws links that exist as wikilinks
  // between notes. With almost none, it reads as scattered dots — say so.
  const sparse = data.edges.length < Math.max(3, data.nodes.length / 12);

  return (
    <div className="flex flex-col h-full">
      {/* Header bar */}
      <div
        className="flex items-center gap-3 px-4 py-3 shrink-0 flex-wrap"
        style={{ background: "var(--surface-1)", borderBottom: "1px solid var(--hairline)" }}
      >
        <Network className="w-4 h-4" style={{ color: "var(--neon)" }} />
        <h1 className="text-[11px] font-mono uppercase tracking-[0.28em] text-foreground">Knowledge Graph</h1>
        <span className="text-[11px] font-mono tabular-nums text-muted-foreground ml-1">
          {visibleCount} nodes · {data.edges.length} edges
        </span>

        {/* Search */}
        <div className="ml-4 relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search nodes..."
            aria-label="Search graph nodes"
            className="pl-7 pr-3 py-1 text-[12px] font-mono w-48 rounded-lg bg-surface-1 border border-hairline text-foreground placeholder:text-muted-foreground focus:outline-none focus:bg-surface-2"
          />
        </div>

        {/* Category toggles */}
        <div className="ml-auto flex items-center gap-3">
          {CATEGORIES.map((cat) => {
            const hidden = hiddenCategories.has(cat.key);
            const count = data.nodes.filter((n) => n.category === cat.key).length;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => toggleCategory(cat.key)}
                aria-pressed={!hidden}
                title={hidden ? `Show ${cat.label}` : `Hide ${cat.label}`}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-0.5 rounded-lg transition-all",
                  hidden ? "opacity-30 hover:opacity-50" : "opacity-100 hover:bg-surface-1",
                )}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full transition-all"
                  style={{
                    background: hidden ? MUTED : cat.color,
                    boxShadow: hidden ? "none" : `0 0 6px ${cat.color}`,
                  }}
                />
                <span className={cn("text-[11px] font-mono", hidden ? "text-muted-foreground" : "text-foreground")}>
                  {cat.label}
                </span>
                <span className="text-[11px] font-mono text-muted-foreground tabular-nums">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sparsity note — only when the graph is nearly edgeless */}
      {sparse && (
        <div
          className="absolute top-20 left-1/2 -translate-x-1/2 z-10 max-w-md text-center text-[12px] px-4 py-2.5 rounded-xl"
          style={{
            background: "color-mix(in oklab, var(--warn) 12%, var(--surface-2))",
            border: "1px solid color-mix(in oklab, var(--warn) 30%, transparent)",
            color: "var(--foreground)",
          }}
        >
          <span style={{ color: "var(--warn)" }} className="font-mono">
            {data.edges.length} link{data.edges.length === 1 ? "" : "s"} across {data.nodes.length} notes.
          </span>{" "}
          <span className="text-muted-foreground">
            The graph only draws <span className="font-mono">[[wikilinks]]</span> that exist between notes — add cross-references to grow it.
          </span>
        </div>
      )}

      {/* Help hint */}
      <div
        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 text-[11px] font-mono text-muted-foreground px-3 py-1 rounded-full pointer-events-none"
        style={{ background: "var(--surface-2)", border: "1px solid var(--hairline)" }}
      >
        drag node to move · click to focus · click again to open · scroll to zoom
      </div>

      {/* Graph */}
      <div className="flex-1 overflow-hidden">
        <KnowledgeGraph
          nodes={data.nodes}
          edges={data.edges}
          onNodeClick={handleNodeClick}
          hiddenCategories={hiddenCategories}
          searchQuery={searchQuery}
        />
      </div>
    </div>
  );
}
