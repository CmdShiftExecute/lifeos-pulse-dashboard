"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { wikiPageUrl } from "@/lib/wiki-links";
import KnowledgeGraph from "@/components/wiki/KnowledgeGraph";
import { Network } from "lucide-react";

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

const LEGEND = [
  { label: "System", color: "var(--neon-2)" },
  { label: "People", color: "var(--neon-3)" },
  { label: "Companies", color: "var(--dim-money)" },
  { label: "Ideas", color: "var(--dim-relationships)" },
];

export default function GraphPage() {
  const router = useRouter();

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

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-[12px] font-mono text-muted-foreground">Loading graph…</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header bar */}
      <div className="flex items-center gap-3 px-4 py-3 shrink-0" style={{ borderBottom: "1px solid var(--hairline)", background: "var(--surface-1)" }}>
        <Network className="w-4 h-4" style={{ color: "var(--dim-relationships)" }} />
        <h1 className="text-[13px] font-medium text-foreground tracking-wide">Knowledge Graph</h1>
        <span className="text-[11px] font-mono text-muted-foreground ml-2 tabular-nums">
          {data.nodes.length} nodes · {data.edges.length} edges
        </span>

        {/* Legend */}
        <div className="ml-auto flex items-center gap-4">
          {LEGEND.map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: item.color, boxShadow: `0 0 6px ${item.color}` }} />
              <span className="text-[11px] font-mono text-muted-foreground">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Graph */}
      <div className="flex-1 overflow-hidden">
        <KnowledgeGraph nodes={data.nodes} edges={data.edges} onNodeClick={handleNodeClick} />
      </div>
    </div>
  );
}
