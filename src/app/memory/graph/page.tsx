"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import KnowledgeGraph from "@/components/wiki/KnowledgeGraph";
import { Network, Search, ArrowLeft, CornerDownRight } from "lucide-react";

interface MemNode { id: string; title: string; category: string; backlinkCount: number; silo: string; pagerank: number }
interface MemEdge { source: string; target: string; kind: string }
interface Community { id: number; key: string; size: number; lead: string }
interface MemGraph { nodes: MemNode[]; edges: MemEdge[]; communities: Community[]; built: string | null; nodeCount?: number; edgeCount?: number }

const KIND_ORDER = ["related", "wikilink", "inferred", "tag"];
const KIND_LABEL: Record<string, string> = { related: "Declared (typed)", wikilink: "Wikilinks", inferred: "Inferred (similar)", tag: "Shared tags" };
const NEIGHBOR_CAP = 36;

export default function MemoryGraphPage() {
  const [focus, setFocus] = useState<string | null>(null);
  const [trail, setTrail] = useState<string[]>([]);
  const [q, setQ] = useState("");

  const { data, isLoading } = useQuery<MemGraph>({
    queryKey: ["memory-graph"],
    queryFn: async () => {
      const res = await fetch("/api/memory/graph");
      if (!res.ok) throw new Error("Failed to fetch memory graph");
      return res.json();
    },
    staleTime: 60_000,
  });

  const nodeById = useMemo(() => new Map((data?.nodes ?? []).map((n) => [n.id, n])), [data]);

  // adjacency: id -> [{id, kind}]
  const adj = useMemo(() => {
    const m = new Map<string, { id: string; kind: string }[]>();
    for (const e of data?.edges ?? []) {
      (m.get(e.source) ?? m.set(e.source, []).get(e.source)!).push({ id: e.target, kind: e.kind });
      (m.get(e.target) ?? m.set(e.target, []).get(e.target)!).push({ id: e.source, kind: e.kind });
    }
    return m;
  }, [data]);

  const colorMap = useMemo(() => {
    const m: Record<string, string> = {};
    (data?.communities ?? []).forEach((c, i) => {
      m[c.key] = `hsl(${Math.round((i * 360) / Math.max((data?.communities ?? []).length, 1))}, 68%, 56%)`;
    });
    return m;
  }, [data]);

  const go = (id: string) => { if (focus) setTrail((t) => [...t, focus]); setFocus(id); setQ(""); };
  const back = () => { setTrail((t) => { const n = [...t]; const prev = n.pop(); setFocus(prev ?? null); return n; }); };

  if (isLoading || !data) {
    return <div className="flex items-center justify-center h-full"><div className="text-[12px] font-mono text-muted-foreground">Loading memory graph…</div></div>;
  }

  // Search results (title contains query)
  const results = q.trim().length >= 2
    ? data.nodes.filter((n) => n.title.toLowerCase().includes(q.toLowerCase())).sort((a, b) => b.pagerank - a.pagerank).slice(0, 14)
    : [];

  // Neighborhood subgraph for the focused node
  const focusNode = focus ? nodeById.get(focus) : null;
  const neighbors = focus ? (adj.get(focus) ?? []) : [];
  // dedupe neighbor ids, keep strongest kind, cap by neighbor pagerank
  const seen = new Map<string, string>();
  for (const nb of neighbors) if (!seen.has(nb.id)) seen.set(nb.id, nb.kind);
  const neighborIds = [...seen.keys()].sort((a, b) => (nodeById.get(b)?.pagerank ?? 0) - (nodeById.get(a)?.pagerank ?? 0)).slice(0, NEIGHBOR_CAP);
  const subIds = new Set<string>([...(focus ? [focus] : []), ...neighborIds]);
  const subNodes = [...subIds].map((id) => nodeById.get(id)!).filter(Boolean);
  const subEdges = data.edges.filter((e) => subIds.has(e.source) && subIds.has(e.target));

  // Connections grouped by kind for the side panel
  const grouped: Record<string, { id: string; title: string; silo: string }[]> = {};
  for (const id of neighborIds) {
    const k = seen.get(id)!; const n = nodeById.get(id); if (!n) continue;
    (grouped[k] ??= []).push({ id, title: n.title, silo: n.silo });
  }

  const startPoints = data.communities.slice(0, 10);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 shrink-0" style={{ borderBottom: "1px solid var(--hairline)", background: "var(--surface-1)" }}>
        <Network className="w-4 h-4" style={{ color: "var(--dim-relationships)" }} />
        <h1 className="text-[13px] font-medium text-foreground tracking-wide">Memory Graph — explore connections</h1>
        <div className="relative ml-4 flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2 top-1/2 -translate-y-1/2" />
          <input
            value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search any memory item…"
            className="w-full rounded pl-7 pr-2 py-1 text-[12px] text-foreground outline-none transition-colors"
            style={{ background: "var(--surface-2)", border: "1px solid var(--hairline-strong)" }}
          />
          {results.length > 0 && (
            <div className="absolute z-20 mt-1 w-full max-h-72 overflow-y-auto glass-strong rounded">
              {results.map((r) => (
                <button key={r.id} onClick={() => go(r.id)} className="block w-full text-left px-2 py-1 text-[12px] text-muted-foreground hover:text-foreground hover-lift truncate transition-colors">
                  <span className="text-[10px] font-mono uppercase mr-1 text-muted-foreground/70">{r.silo}</span>{r.title}
                </button>
              ))}
            </div>
          )}
        </div>
        <span className="text-[11px] font-mono text-muted-foreground tabular-nums">{data.nodeCount} nodes · {data.communities.length} communities</span>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Side panel: focus + clickable connections (the useful part) */}
        <div className="w-80 shrink-0 overflow-y-auto p-3" style={{ borderRight: "1px solid var(--hairline)", background: "var(--surface-1)" }}>
          {!focusNode ? (
            <div>
              <div className="text-[11px] text-muted-foreground mb-3 leading-relaxed">
                Search above, or jump into a community to start exploring. Click any item to see what it connects to; click a connection to walk the graph.
              </div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Start points</div>
              {startPoints.map((c) => (
                <button key={c.key} onClick={() => go(data.nodes.find((n) => n.category === c.key)?.id ?? c.lead)} className="flex items-center gap-2 w-full text-left py-1 group">
                  <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: colorMap[c.key] }} />
                  <span className="text-[12px] text-muted-foreground truncate group-hover:text-foreground transition-colors">{c.lead} <span className="text-muted-foreground/60">({c.size})</span></span>
                </button>
              ))}
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-2">
                {trail.length > 0 && <button onClick={back} className="text-muted-foreground hover:text-foreground transition-colors"><ArrowLeft className="w-3.5 h-3.5" /></button>}
                <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: colorMap[focusNode.category] }} />
                <span className="text-[10px] font-mono uppercase text-muted-foreground">{focusNode.silo}</span>
              </div>
              <div className="text-[14px] text-foreground font-medium mb-1 leading-snug">{focusNode.title}</div>
              <div className="text-[11px] font-mono text-muted-foreground mb-3 tabular-nums">{neighborIds.length} connections</div>
              {KIND_ORDER.filter((k) => grouped[k]?.length).map((k) => (
                <div key={k} className="mb-3">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">{KIND_LABEL[k]} ({grouped[k].length})</div>
                  <div className="space-y-1.5">
                    {grouped[k].map((n) => (
                      <button key={n.id} onClick={() => go(n.id)} className="flex items-start gap-1.5 w-full text-left group">
                        <CornerDownRight className="w-3 h-3 text-muted-foreground/60 mt-[3px] shrink-0 transition-colors" style={{ color: undefined }} />
                        <span className="flex-1 min-w-0 text-[12px] text-muted-foreground group-hover:text-foreground transition-colors leading-snug">
                          <span className="text-[10px] font-mono uppercase mr-1 align-baseline text-muted-foreground/60">{n.silo}</span>{n.title}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Focused mini-graph: just this node + neighbors, readable */}
        <div className="flex-1 min-w-0">
          {focusNode
            ? <KnowledgeGraph nodes={subNodes} edges={subEdges} colorMap={colorMap} onNodeClick={(slug) => go(slug)} />
            : <div className="flex items-center justify-center h-full text-[12px] font-mono text-muted-foreground">Pick something on the left to see its connections.</div>}
        </div>
      </div>
    </div>
  );
}
