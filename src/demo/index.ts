// Demo mode — makes Pulse fully explorable with bundled fictional data, with
// zero network calls, for the open-source build. Everything here is inert
// unless NEXT_PUBLIC_DEMO_MODE === "1" (a build/dev-time env var).
//
// The dashboard is a static export that normally fetches ~40 endpoints from a
// local LifeOS Pulse backend (port 31337). Public users have no backend, so in
// demo mode we intercept every `/api/*` request — both the `apiCall` helper and
// the many raw `fetch()` calls across pages — and resolve it from the fixtures
// in ./fixtures. POST/PUT and other mutations become harmless success no-ops.

import agents from "./fixtures/agents.json";
import assistantCron from "./fixtures/assistant_cron.json";
import assistantDiary from "./fixtures/assistant_diary.json";
import assistantHealth from "./fixtures/assistant_health.json";
import assistantIdentity from "./fixtures/assistant_identity.json";
import assistantOpinions from "./fixtures/assistant_opinions.json";
import assistantPersonality from "./fixtures/assistant_personality.json";
import assistantTasks from "./fixtures/assistant_tasks.json";
import agentsviewActivity from "./fixtures/agentsview_activity.json";
import agentsviewHeatmap from "./fixtures/agentsview_heatmap.json";
import agentsviewTopSessions from "./fixtures/agentsview_top-sessions.json";
import agentsviewUsageSummary from "./fixtures/agentsview_usage-summary.json";
import algorithm from "./fixtures/algorithm.json";
import eventsRecent from "./fixtures/events_recent.json";
import hypotheses from "./fixtures/hypotheses.json";
import ladder from "./fixtures/ladder.json";
import lifeAir from "./fixtures/life_air.json";
import lifeBusiness from "./fixtures/life_business.json";
import lifeFinances from "./fixtures/life_finances.json";
import lifeGoals from "./fixtures/life_goals.json";
import lifeGrowth from "./fixtures/life_growth.json";
import lifeHealth from "./fixtures/life_health.json";
import lifeHome from "./fixtures/life_home.json";
import lifeWork from "./fixtures/life_work.json";
import localIntelligence from "./fixtures/local-intelligence.json";
import loops from "./fixtures/loops.json";
import memoryGraph from "./fixtures/memory_graph.json";
import memoryLogs from "./fixtures/memory_logs.json";
import novelty from "./fixtures/novelty.json";
import observabilityLifeCard from "./fixtures/observability_life-card.json";
import observabilityToolFailures from "./fixtures/observability_tool-failures.json";
import observabilityVoiceEvents from "./fixtures/observability_voice-events.json";
import omm from "./fixtures/omm.json";
import onboardingState from "./fixtures/onboarding_state.json";
import performanceAnthropicCost from "./fixtures/performance_anthropic-cost.json";
import performanceCost from "./fixtures/performance_cost.json";
import performanceFailures from "./fixtures/performance_failures.json";
import tabFreshness from "./fixtures/tab-freshness.json";
import telosLibrary from "./fixtures/telos_library.json";
import telosOverview from "./fixtures/telos_overview.json";
import userIndex from "./fixtures/user-index.json";
import wiki from "./fixtures/wiki.json";
import wikiGraph from "./fixtures/wiki_graph.json";
import wikiHooks from "./fixtures/wiki_hooks.json";
import wikiSearch from "./fixtures/wiki_search_q_test.json";
import wikiSkills from "./fixtures/wiki_skills.json";
import work from "./fixtures/work.json";

export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "1";
}

/* -------- exact endpoint -> fixture map (query strings ignored) -------- */

const EXACT: Record<string, unknown> = {
  "/api/loops": loops,
  "/api/ladder": ladder,
  "/api/novelty": novelty,
  "/api/tab-freshness": tabFreshness,
  "/api/onboarding/state": onboardingState,
  "/api/user-index": userIndex,
  "/api/observability/life-card": observabilityLifeCard,
  "/api/observability/tool-failures": observabilityToolFailures,
  "/api/observability/voice-events": observabilityVoiceEvents,
  "/api/life/home": lifeHome,
  "/api/life/air": lifeAir,
  "/api/life/growth": lifeGrowth,
  "/api/life/work": lifeWork,
  "/api/life/goals": lifeGoals,
  "/api/life/finances": lifeFinances,
  "/api/life/health": lifeHealth,
  "/api/life/business": lifeBusiness,
  "/api/local-intelligence": localIntelligence,
  "/api/memory/graph": memoryGraph,
  "/api/memory/logs": memoryLogs,
  "/api/agents": agents,
  "/api/events/recent": eventsRecent,
  "/api/performance/failures": performanceFailures,
  "/api/performance/cost": performanceCost,
  "/api/performance/anthropic-cost": performanceAnthropicCost,
  "/api/agentsview/usage-summary": agentsviewUsageSummary,
  "/api/agentsview/top-sessions": agentsviewTopSessions,
  "/api/agentsview/activity": agentsviewActivity,
  "/api/agentsview/heatmap": agentsviewHeatmap,
  "/api/agentsview/session-meta": { sessions: {}, webBase: null },
  "/api/algorithm": algorithm,
  "/api/algorithm/stream": algorithm,
  "/api/work": work,
  "/api/telos/library": telosLibrary,
  "/api/telos/overview": telosOverview,
  "/api/omm": omm,
  "/api/hypotheses": hypotheses,
  "/api/wiki": wiki,
  "/api/wiki/graph": wikiGraph,
  "/api/wiki/hooks": wikiHooks,
  "/api/wiki/skills": wikiSkills,
  "/api/wiki/search": wikiSearch,
  "/api/wiki/arbol": { workers: arbolWorkers() },
  // DA subsystem (non-/api paths, hit via the apiCall helper)
  "/assistant/identity": assistantIdentity,
  "/assistant/health": assistantHealth,
  "/assistant/personality": assistantPersonality,
  "/assistant/tasks": assistantTasks,
  "/assistant/diary": assistantDiary,
  "/assistant/opinions": assistantOpinions,
  "/assistant/cron": assistantCron,
};

/* -------- parameterized endpoints (longest-prefix match) -------- */

function lastSeg(path: string): string {
  const parts = path.split("/").filter(Boolean);
  return decodeURIComponent(parts[parts.length - 1] || "");
}
function titleCase(slug: string): string {
  return slug
    .replace(/[-_/]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}
function arbolWorkers() {
  return [
    { name: "_A_send-invoice", type: "action", cfName: "send-invoice", lastModified: "2026-07-08T10:00:00.000Z" },
    { name: "_P_essay-publish", type: "pipeline", cfName: "essay-publish", lastModified: "2026-07-06T10:00:00.000Z" },
    { name: "_F_daily-digest", type: "flow", cfName: "daily-digest", lastModified: "2026-07-09T10:00:00.000Z" },
  ];
}

type Handler = (path: string) => unknown;

const PREFIX: Array<{ prefix: string; handler: Handler }> = [
  {
    prefix: "/api/wiki/doc/",
    handler: (p) => {
      const slug = lastSeg(p);
      return {
        content: `# ${titleCase(slug)}\n\nThis is a demo document. In a live LifeOS instance this page renders the markdown for **${titleCase(slug)}** from your vault.\n\n## Overview\n\nDemo mode ships bundled fictional content so the whole dashboard is explorable without a backend.\n`,
        title: titleCase(slug),
        category: "documentation",
        tags: ["demo"],
        quality: null,
        lastModified: "2026-07-10T10:00:00.000Z",
        wordCount: 42,
        backlinks: [],
        filePath: `~/vault/docs/${slug}.md`,
      };
    },
  },
  {
    prefix: "/api/wiki/knowledge/",
    handler: (p) => {
      const slug = lastSeg(p);
      return {
        content: `# ${titleCase(slug)}\n\nA demo knowledge note on **${titleCase(slug)}**. Live instances render your own captured knowledge here.\n`,
        title: titleCase(slug),
        category: "knowledge",
        tags: ["demo"],
        quality: null,
        lastModified: "2026-07-09T10:00:00.000Z",
        wordCount: 30,
        backlinks: [],
        filePath: `~/vault/knowledge/${slug}.md`,
      };
    },
  },
  {
    prefix: "/api/wiki/skills/",
    handler: (p) => {
      const name = lastSeg(p);
      return {
        name,
        description: `Demo skill "${name}". Live instances render the SKILL.md body here.`,
        effort: "standard",
        hasWorkflows: true,
        lastModified: "2026-07-08T10:00:00.000Z",
        source: "user",
        content: `# ${name}\n\nDemo skill definition. This would show the real SKILL.md content in a live instance.\n`,
      };
    },
  },
  {
    prefix: "/api/wiki/hooks/",
    handler: (p) => {
      const name = lastSeg(p);
      return {
        event: "SessionStart",
        matcher: "*",
        type: "command",
        command: `${name}.ts`,
        fileName: name,
        content: `// ${name}\n// Demo hook source. Live instances show the real hook file here.\n`,
      };
    },
  },
  {
    prefix: "/api/wiki/bookmark/",
    handler: (p) => {
      const slug = lastSeg(p);
      return {
        title: titleCase(slug),
        url: "https://example.com/" + slug,
        favorite: false,
        folder: "Reading",
        created: "2026-07-01T10:00:00.000Z",
        tags: ["demo"],
        content: `# ${titleCase(slug)}\n\nA saved bookmark (demo).\n`,
      };
    },
  },
  {
    prefix: "/api/wiki/arbol/",
    handler: (p) => {
      const name = lastSeg(p);
      const type = name.startsWith("_P_") ? "pipeline" : name.startsWith("_F_") ? "flow" : "action";
      return {
        name,
        type,
        wrangler: null,
        source: `// ${name}\n// Demo worker source.\nexport async function run() {\n  return { ok: true };\n}\n`,
        lastModified: "2026-07-08T10:00:00.000Z",
      };
    },
  },
  {
    prefix: "/api/telos/file",
    handler: (p) => {
      const m = /[?&]name=([^&]+)/.exec(p);
      const name = m ? decodeURIComponent(m[1]) : "TELOS.md";
      return { name, content: `# ${name}\n\nDemo TELOS source file. Edit and save is a no-op in demo mode.\n` };
    },
  },
  {
    prefix: "/api/hypotheses/",
    handler: (p) => {
      const slug = lastSeg(p);
      return {
        slug,
        claim: `${titleCase(slug)} improves the current chapter of work.`,
        confidence: 0.6,
        target_frame: "Demo frame",
        evidence_count: 4,
        generated: "2026-06-20T10:00:00.000Z",
        expires_in_days: 12,
        status: "active",
        expires: "2026-07-20T10:00:00.000Z",
        evidence_signals: ["A recurring note in the journal", "A repeated signal across three weeks"],
        falsifier: "Two weeks of tracking with no measurable effect.",
        evidence: "Demo evidence summary. Live instances render the real derived evidence here.",
        suggested_action: "This is a demo hypothesis. Live instances render the derived next action here.",
      };
    },
  },
];

function stripQuery(path: string): string {
  const q = path.indexOf("?");
  return q === -1 ? path : path.slice(0, q);
}

/** True if the given path is one we intercept in demo mode. */
export function isApiPath(path: string): boolean {
  return path.startsWith("/api/") || path.includes("/api/");
}

/**
 * Resolve an /api/* request to bundled fixture data. Longest-prefix match on the
 * path; query strings are ignored. Non-GET methods are harmless success no-ops.
 * Returns `{}` for anything unrecognized so nothing throws.
 */
export function resolveDemo(rawPath: string, method = "GET"): unknown {
  const path = stripQuery(rawPath.replace(/^https?:\/\/[^/]+/, ""));
  const verb = method.toUpperCase();

  if (verb !== "GET" && verb !== "HEAD") {
    // POST/PUT/DELETE — control loops, refreshes, saves, bookmark toggles,
    // hypothesis actions: acknowledge with a success no-op.
    return { ok: true, demo: true };
  }

  // telos/file carries its ?name= in the query; keep it for the handler.
  const forHandlers = rawPath.replace(/^https?:\/\/[^/]+/, "");

  if (path in EXACT) return EXACT[path];

  let best: { len: number; handler: Handler } | null = null;
  for (const { prefix, handler } of PREFIX) {
    const base = prefix.endsWith("/") ? prefix : prefix + "/";
    if (path === prefix || path.startsWith(base)) {
      if (!best || prefix.length > best.len) best = { len: prefix.length, handler };
    }
  }
  if (best) return best.handler(forHandlers);

  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.warn("[demo] no fixture for", path, "- returning {}");
  }
  return {};
}

/* -------- global fetch + EventSource interception (raw fetch coverage) -------- */

declare global {
  interface Window {
    __pulseDemoInstalled?: boolean;
  }
}

function jsonResponse(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

export function installDemoInterception(): void {
  if (typeof window === "undefined") return;
  if (!isDemoMode()) return;
  if (window.__pulseDemoInstalled) return;
  window.__pulseDemoInstalled = true;

  const nativeFetch = window.fetch.bind(window);
  window.fetch = ((input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    let url: string;
    let method = init?.method || "GET";
    if (typeof input === "string") url = input;
    else if (input instanceof URL) url = input.toString();
    else {
      url = input.url;
      method = init?.method || input.method || "GET";
    }
    const path = url.replace(/^https?:\/\/[^/]+/, "");
    if (path.startsWith("/api/") || path.startsWith("/assistant/")) {
      return Promise.resolve(jsonResponse(resolveDemo(url, method)));
    }
    return nativeFetch(input as RequestInfo, init);
  }) as typeof window.fetch;

  // EventSource: the algorithm dashboard opens a live SSE channel. Emulate it so
  // the page shows live state instead of thrashing through reconnect failures.
  const NativeES = window.EventSource;
  if (NativeES) {
    class DemoEventSource {
      url: string;
      readyState = 1;
      onopen: ((ev: Event) => void) | null = null;
      onmessage: ((ev: MessageEvent) => void) | null = null;
      onerror: ((ev: Event) => void) | null = null;
      private listeners: Record<string, Array<(ev: MessageEvent) => void>> = {};
      private native: EventSource | null = null;
      constructor(url: string) {
        this.url = url;
        const path = url.replace(/^https?:\/\/[^/]+/, "");
        if (path.startsWith("/api/")) {
          setTimeout(() => {
            const payload = resolveDemo(url, "GET");
            const ev = new MessageEvent("algorithm", { data: JSON.stringify(payload) });
            (this.listeners["algorithm"] || []).forEach((l) => l(ev));
            this.onmessage?.(ev);
          }, 60);
        } else {
          this.native = new NativeES(url);
        }
      }
      addEventListener(type: string, cb: (ev: MessageEvent) => void) {
        (this.listeners[type] ||= []).push(cb);
        this.native?.addEventListener(type, cb as EventListener);
      }
      removeEventListener(type: string, cb: (ev: MessageEvent) => void) {
        this.listeners[type] = (this.listeners[type] || []).filter((l) => l !== cb);
        this.native?.removeEventListener(type, cb as EventListener);
      }
      close() {
        this.readyState = 2;
        this.native?.close();
      }
    }
    window.EventSource = DemoEventSource as unknown as typeof EventSource;
  }
}

// Self-install on import so the patch is active before any component fetch.
installDemoInterception();
