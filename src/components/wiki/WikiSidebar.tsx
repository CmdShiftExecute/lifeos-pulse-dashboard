"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { wikiPageUrl, WIKI_GRAPH_URL } from "@/lib/wiki-links";
import {
  ChevronRight,
  BookOpen,
  Cpu,
  Layers,
  Server,
  FileText,
  Users,
  Building2,
  Lightbulb,
  Search,
  Network,
  Bookmark,
  Library,
  BookCopy,
  Folder,
  Compass,
  ShieldCheck,
  Webhook,
  TreePine,
  Zap,
  Bot,
  Heart,
  Database,
  Bell,
  Eye,
  Activity,
  Wrench,
  GitBranch,
  Radio,
} from "lucide-react";

interface TreeNode {
  label: string;
  slug?: string;
  category?: string;
  children?: TreeNode[];
  count?: number;
  icon?: string;
}

interface WikiSidebarProps {
  tree: TreeNode[];
  onSearchClick: () => void;
}

const CATEGORY_ICONS: Record<string, typeof BookOpen> = {
  // Top-level tree nodes
  "Knowledge Archive": Library,
  Documentation: BookCopy,
  // Documentation groups (one per LIFEOS/DOCUMENTATION/ subfolder + Overview)
  Overview: Compass,
  Agents: Bot,
  Algorithm: Cpu,
  Arbol: TreePine,
  Config: Wrench,
  Delegation: GitBranch,
  Fabric: Layers,
  Feed: Radio,
  Hooks: Webhook,
  LifeOs: Heart,
  Memory: Database,
  Notifications: Bell,
  Observability: Eye,
  Pulse: Activity,
  Security: ShieldCheck,
  Skills: Zap,
  Tools: Server,
  // Knowledge Archive domains
  People: Users,
  Companies: Building2,
  Ideas: Lightbulb,
  Bookmarks: Bookmark,
  // Fallback
  Other: Folder,
};

// Theme-aware category tints (CSS vars, applied via inline style so they shift
// with [data-theme]). The structural accent — active item, hover, section
// headers — goes through --neon, which is what actually becomes magenta in
// orchid and gold in solar.
const CATEGORY_COLORS: Record<string, string> = {
  "Knowledge Archive": "var(--positive)",
  Documentation: "var(--neon-2)",
  Overview: "var(--positive)",
  Agents: "var(--dim-relationships)",
  Algorithm: "var(--neon-2)",
  Arbol: "var(--positive)",
  Config: "var(--neon-3)",
  Delegation: "var(--warn)",
  Fabric: "var(--dim-relationships)",
  Feed: "var(--dim-freedom)",
  Hooks: "var(--warn)",
  LifeOs: "var(--danger)",
  Memory: "var(--dim-relationships)",
  Notifications: "var(--warn)",
  Observability: "var(--dim-freedom)",
  Pulse: "var(--positive)",
  Security: "var(--danger)",
  Skills: "var(--warn)",
  Tools: "var(--neon-2)",
  People: "var(--dim-relationships)",
  Companies: "var(--dim-money)",
  Ideas: "var(--dim-freedom)",
  Research: "var(--neon-3)",
  Bookmarks: "var(--dim-creative)",
  Other: "hsl(var(--muted-foreground))",
};

function TreeItem({ node, depth = 0 }: { node: TreeNode; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 1);
  const pathname = usePathname();
  const hasChildren = node.children && node.children.length > 0;
  const Icon = CATEGORY_ICONS[node.label] || FileText;
  const color = CATEGORY_COLORS[node.label] || "hsl(var(--muted-foreground))";

  const linkPath = node.slug && node.category
    ? wikiPageUrl(node.category, node.slug)
    : undefined;

  const isActive = linkPath && pathname === linkPath;

  if (hasChildren) {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded-md transition-colors group text-muted-foreground hover:text-foreground hover:bg-surface-1"
          style={{ paddingLeft: `${depth * 12 + 8}px`, fontFamily: "'concourse-t3', sans-serif" }}
        >
          <ChevronRight
            className={cn(
              "w-3 h-3 transition-transform shrink-0",
              expanded && "rotate-90"
            )}
          />
          <Icon className="w-3.5 h-3.5 shrink-0" style={{ color }} />
          <span className="truncate">{node.label}</span>
          {node.count !== undefined && (
            <span className="ml-auto text-[13px] text-muted-foreground tabular-nums opacity-70">{node.count}</span>
          )}
        </button>
        {expanded && (
          <div className="mt-0.5">
            {node.children!.map((child, i) => (
              <TreeItem key={child.slug || child.label + i} node={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Leaf node
  return (
    <Link
      href={linkPath || "#"}
      className={cn(
        "flex items-center gap-2 px-2 py-1.5 text-xs rounded-md transition-colors",
        isActive ? "text-neon" : "text-muted-foreground hover:text-foreground hover:bg-surface-1"
      )}
      style={{
        paddingLeft: `${depth * 12 + 8}px`,
        fontFamily: "'concourse-t3', sans-serif",
        ...(isActive
          ? {
              background: "color-mix(in oklab, var(--neon) 12%, transparent)",
              border: "1px solid color-mix(in oklab, var(--neon) 30%, transparent)",
            }
          : {}),
      }}
    >
      <span className="w-1 h-1 rounded-full bg-current shrink-0 opacity-40" />
      <span className="truncate">{node.label}</span>
    </Link>
  );
}

export default function WikiSidebar({ tree, onSearchClick }: WikiSidebarProps) {
  return (
    <aside
      className="w-64 shrink-0 border-r border-hairline overflow-y-auto h-[calc(100vh-3.5rem)]"
      style={{ background: "color-mix(in oklab, var(--bg-deep) 55%, transparent)" }}
    >
      {/* Search trigger */}
      <div className="p-3 border-b border-hairline">
        <button
          onClick={onSearchClick}
          className="flex items-center gap-2 w-full px-3 py-2 text-xs text-muted-foreground rounded-lg border border-hairline bg-surface-1 hover:text-foreground transition-colors"
          style={{ fontFamily: "'concourse-t3', sans-serif" }}
        >
          <Search className="w-3.5 h-3.5" />
          <span>Search...</span>
          <kbd className="ml-auto text-[13px] px-1.5 py-0.5 rounded bg-surface-2 border border-hairline text-muted-foreground">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Graph link */}
      <div className="px-3 pt-3 pb-1">
        <Link
          href={WIKI_GRAPH_URL}
          className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground rounded-md hover:text-neon transition-colors"
          style={{ fontFamily: "'concourse-t3', sans-serif" }}
        >
          <Network className="w-3.5 h-3.5" />
          <span>Knowledge Graph</span>
        </Link>
      </div>

      {/* Tree navigation */}
      <nav className="p-3 space-y-1">
        {/* Documentation section */}
        <div className="mb-3">
          <div
            className="text-[13px] font-medium tracking-[0.2em] text-muted-foreground uppercase px-2 mb-2"
            style={{ fontFamily: "'advocate-c14', sans-serif" }}
          >
            Documentation
          </div>
          {tree
            .filter((n) => n.label === "Documentation")
            .map((node, i) => (
              <TreeItem key={node.label + i} node={node} />
            ))}
        </div>

        {/* Knowledge section */}
        <div>
          <div
            className="text-[13px] font-medium tracking-[0.2em] text-muted-foreground uppercase px-2 mb-2 mt-4"
            style={{ fontFamily: "'advocate-c14', sans-serif" }}
          >
            Knowledge
          </div>
          {tree
            .filter((n) => n.label === "Knowledge Archive")
            .map((node, i) => (
              <TreeItem key={node.label + i} node={node} />
            ))}
        </div>

        {/* Bookmarks section */}
        {tree.some((n) => n.label === "Bookmarks") && (
          <div>
            <div
              className="text-[13px] font-medium tracking-[0.2em] text-muted-foreground uppercase px-2 mb-2 mt-4"
              style={{ fontFamily: "'advocate-c14', sans-serif" }}
            >
              Bookmarks
            </div>
            {tree
              .filter((n) => n.label === "Bookmarks")
              .map((node, i) => (
                <TreeItem key={node.label + i} node={node} />
              ))}
          </div>
        )}
      </nav>
    </aside>
  );
}
