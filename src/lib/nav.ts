import type { LucideIcon } from "lucide-react";
import {
  Target,
  FolderKanban,
  Activity,
  DollarSign,
  Briefcase,
  Bot,
  UsersRound,
  Library,
  Sparkles,
  ScrollText,
  Zap,
  Webhook,
  BarChart3,
  LayoutDashboard,
  Wind,
  Cpu,
  Network,
  Share2,
  Brain,
  Compass,
  Heart,
  BookOpen,
  Feather,
  GraduationCap,
  NotebookPen,
  Wrench,
  FlaskConical,
  History,
  Workflow,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** short description for the command palette */
  hint?: string;
}

/** Primary "Life" domains — always visible in the command bar. */
export const lifeNav: NavItem[] = [
  { href: "/telos", label: "TELOS", icon: Target, hint: "Missions, goals, strategy" },
  { href: "/work", label: "WORK", icon: FolderKanban, hint: "Algorithm sessions & kanban" },
  { href: "/health", label: "HEALTH", icon: Activity, hint: "Body & training" },
  { href: "/finances", label: "FINANCES", icon: DollarSign, hint: "Money & runway" },
  { href: "/business", label: "BUSINESS", icon: Briefcase, hint: "Business & revenue metrics" },
  // GROWTH removed from nav 2026-07-09 (module not installed); route stays reachable by URL.
];

/** System surfaces — in the "Systems" menu + command palette. (/security removed: no route existed.) */
export const systemNav: NavItem[] = [
  { href: "/assistant", label: "Assistant", icon: Bot, hint: "Your DA — identity & tasks" },
  { href: "/agents", label: "Agents", icon: UsersRound, hint: "Work, novelty, ladder" },
  { href: "/knowledge", label: "Knowledge", icon: Library, hint: "Archive & bookmarks" },
  { href: "/hypotheses", label: "Hypotheses", icon: Sparkles, hint: "Science loop" },
  { href: "/docs", label: "Documentation", icon: ScrollText, hint: "System docs wiki" },
  { href: "/skills", label: "Skills", icon: Zap, hint: "Skill catalog" },
  { href: "/hooks", label: "Hooks", icon: Webhook, hint: "Lifecycle hooks" },
  // Arbol removed from nav 2026-07-10 (cloud-execution layer not installed — no daemon
  // module, no USER config, page was an empty scaffold); route stays reachable by URL.
  { href: "/performance", label: "Performance", icon: BarChart3, hint: "Cost & tokens" },
];

/** Additional routes reachable via the command palette (previously orphaned from nav). */
export const moreNav: NavItem[] = [
  { href: "/life", label: "Life Overview", icon: LayoutDashboard, hint: "Radial life-dimensions view" },
  { href: "/air", label: "Air Quality", icon: Wind, hint: "AirGradient monitors" },
  { href: "/system", label: "System Wiki", icon: Cpu, hint: "PAI/LifeOS internals" },
  { href: "/knowledge/graph", label: "Knowledge Graph", icon: Network, hint: "Wikilink graph" },
  { href: "/system/graph", label: "System Graph", icon: Share2, hint: "System knowledge graph" },
  { href: "/memory/graph", label: "Memory Graph", icon: Brain, hint: "Memory graph" },
];

export const allNav: NavItem[] = [...lifeNav, ...systemNav, ...moreNav];

/** A grouped column inside a nav hover-panel. */
export interface NavPanelGroup {
  kicker: string;
  items: NavItem[];
}

/** TELOS mega-panel — every TELOS surface, reachable from any page.
    Section keys match /api/telos/library; log keys match /api/memory/logs. */
export const telosPanel: NavPanelGroup[] = [
  {
    kicker: "Command Center",
    items: [
      { href: "/telos", label: "Overview", icon: Compass, hint: "Missions, goals, the whole graph" },
    ],
  },
  {
    kicker: "The Man",
    items: [
      { href: "/telos/library?s=beliefs", label: "Beliefs", icon: Heart, hint: "What I hold true" },
      { href: "/telos/library?s=wisdom", label: "Wisdom", icon: Feather, hint: "Hard-won principles" },
      { href: "/telos/library?s=models", label: "Mental Models", icon: Brain, hint: "Thinking tools" },
      { href: "/telos/library?s=books", label: "Books", icon: BookOpen, hint: "What shaped me" },
      { href: "/telos/library?s=narratives", label: "Narratives", icon: NotebookPen, hint: "The story I tell" },
      { href: "/telos/library?s=lessons", label: "Lessons", icon: GraduationCap, hint: "Extracted from experience" },
    ],
  },
  {
    kicker: "The Machine",
    items: [
      { href: "/telos/library?s=decisions", label: "Decisions", icon: History, hint: "Every finalized call" },
      { href: "/telos/library?s=mistakes", label: "Mistakes", icon: Wrench, hint: "Misses + counter-rules" },
      { href: "/telos/library?s=learnings", label: "Learnings", icon: FlaskConical, hint: "Harvested signals" },
      { href: "/telos/library?s=sessions", label: "Sessions", icon: ScrollText, hint: "The narrative timeline" },
      { href: "/telos/library?s=operating-model", label: "Operating Model", icon: Workflow, hint: "The Living Machine map" },
    ],
  },
];
