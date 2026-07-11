# API contract

<div align="center">

[← Back to overview](../README.md)

</div>

The dashboard consumes a same-origin HTTP API. Every request is a relative path (`/api/...`) issued by one helper, `src/lib/local-api.ts`, so the backend that serves the page also answers these routes. In production that backend is the LifeOS Pulse server; you can also implement the endpoints yourself (see the [prompting guide](PROMPTING-GUIDE.md)).

This document lists every endpoint the frontend calls, grouped by surface, with a summary of the response shape it expects. Shapes are derived from the TypeScript types in `src/types/`, the typed hooks in `src/hooks/`, and the page components in `src/app/`. Where a field is optional, the UI degrades gracefully if it is absent.

## Table of Contents

- [Conventions](#conventions)
- [Life & overview](#life--overview)
- [TELOS](#telos)
- [Work & Algorithm](#work--algorithm)
- [Observability & Performance](#observability--performance)
  - [AgentsView proxy](#agentsview-proxy)
- [Knowledge wiki](#knowledge-wiki)
- [Misc](#misc)

## Conventions

- All responses are JSON unless noted (one endpoint is Server-Sent Events).
- Unless a method is stated, the endpoint is `GET`.
- Missing or erroring endpoints render empty states, not crashes. You can bring endpoints online one at a time.
- `?param` query strings are noted where the frontend sends them.
- Types below use TypeScript notation. `?` marks an optional field.

---

## Life & overview

### `GET /api/life/home`
The landing overview.
```ts
{
  oneSentence: string;
  current: {
    mood?: string; energy?: string; focus?: string; location?: string;
    last_meal?: string; sleep_last_night?: string; calendar_load?: string;
    inbox?: string; top_intent?: string;
  };
  topGoals?: { id: string; text: string }[];
  nextActions?: string[];
  spark?: string;
  timelineBlockCount?: number;
}
```

### `GET /api/life/{dimension}`
Per-dimension detail. Called for `goals`, `work`, `health`, `finances`, `business`, `growth`, `air`. Each returns a dimension-specific object; the corresponding page under `src/app/{dimension}/` defines the exact fields it reads. Treat these as free-form dimension payloads: return what your files hold, and the page shows what it recognizes.

### `GET /api/observability/life-card`
Compact "life card" summary rendered in headers and strips. Returns a small object of current-state fields (status line, key metrics). Optional; absence hides the card.

### `GET /api/user-index`
Index statistics over the user's file corpus.
```ts
{
  total_files: number;
  avg_completeness: number;
  frontmatter_coverage: number;
  by_kind: Record<string, number>;
  by_publish: Record<string, number>;
}
```

---

## TELOS

### `GET /api/telos/overview`
The full goal graph. This is the single largest payload. Shape (abbreviated; see `src/app/telos/_v7/data.ts` for the complete `Telos` type):
```ts
{
  owner: { name: string; day: string; streak: number };
  idealState: { horizon: string; note: string };
  dimensions: { key: string; label: string; pct: number; color?: string }[];
  missions: { id: string; text: string; ... }[];
  goals: { id: string; text: string; ... }[];
  problems: { id: string; text: string; ... }[];
  strategies: { id: string; text: string; ... }[];
  metrics: { ... }[];            // KPIs attached to goals
  challenges: { ... }[];
  projects: { ... }[];
  team: { ... }[];
  stranded: {
    work_no_goal: unknown[];
    goals_no_strategy: unknown[];
    strategies_idle: unknown[];
  };
  preferences: { books: []; films: []; models: []; aphorisms: []; ... };
  // ... narrative and synthesis fields
  meta?: { isPersonalized?: boolean };
}
```
The `meta.isPersonalized` flag drives rendering: `false` (or missing `meta`) shows the fresh-install showcase; `true` passes your data through, using type-stable blanks (not sample content) for fields you have not populated yet.

### `GET /api/telos/library?s={section}`
A formatted "library" section. Section keys: `beliefs`, `wisdom`, `models`, `books`, `narratives`, `lessons`, `decisions`, `mistakes`, `learnings`, `sessions`, `operating-model`. Returns sections shaped as:
```ts
{
  key: string;
  title: string;
  updated: string | null;
  intro: string | null;
  groups: { heading: string; items: string[] }[];
  count: number;
}
```

### `GET /api/telos/file?path={path}`
Raw content of a single TELOS file for the in-app viewer/editor. Returns the file's markdown/text.

### `GET /api/memory/logs`
The memory ledgers rendered in TELOS "The Machine" and the memory explorer.
```ts
{
  decisions: { date: string | null; domain: string | null; text: string }[];
  mistakes:  { date: string | null; domain: string | null; text: string }[];
  learnings: {
    file: string; category: string; date: string; title: string;
    rating?: number | null; feedback?: string | null; summary?: string | null;
  }[];
  sessions?: { title: string; date: string | null; body: string }[];
}
```
This maps directly to the memory-ledger convention (`MISTAKES.md`, `DECISIONS.md`, `SESSIONS.md`, and harvested learnings) documented in the [prompting guide](PROMPTING-GUIDE.md).

### `GET /api/omm`
Live data for the Operating Model map: hooks (parsed from settings), scheduled jobs, launchd entries, memory read/write map. Parsed from your config at request time so it never drifts. Shape is a set of arrays (`hooks[]`, `jobs[]`, `launchd[]`, plus memory-map groups); see `src/app/telos/library/operating-model.tsx` for the fields the map reads.

---

## Work & Algorithm

### `GET /api/work`
Work overview plus the kanban.
```ts
{
  projects?: { name: string; path: string; url: string }[];
  currentFocus?: string;
  currentProject?: string;
  activeWorkstreams?: string;
  algorithmSessions?: {
    slug: string; task: string; phase: string; progress?: string; effort?: string;
  }[];
}
```
The kanban board (issues) is returned in the same or a companion payload:
```ts
{
  setup_required?: boolean; reason?: string; instructions?: string[];
  config?: { repo: string; columns: string[]; poll_interval_seconds: number };
  columns?: Record<string, KanbanIssue[]>;
  items?: KanbanIssue[];
  lastFetch?: string | null;
  stale?: boolean; stale_reason?: string;
}
// KanbanIssue:
{
  number: number; title: string; url: string; state: string;
  labels: string[]; assignees: string[]; ageHours: number;
  column: string; updatedAt: string;
  source?: string; principal_stated_goal?: string;
}
```

### `POST /api/work/refresh`
Forces the backend to re-poll the work tracker. No body required; returns updated work/kanban data or a status.

### `GET /api/algorithm`
Current Algorithm session state(s). Response:
```ts
{
  algorithms: AlgorithmState[];
  active: boolean;
  pulseStrip?: { value: number; timestamp: number; message?: string }[];
}
```
`AlgorithmState` is large and fully specified in `src/types/algorithm.ts`. Key fields: `sessionId`, `taskDescription`, `currentPhase` (`OBSERVE | THINK | PLAN | BUILD | EXECUTE | VERIFY | LEARN | IDLE | COMPLETE`), `effortLevel`, `criteria[]`, `agents[]`, `phaseHistory[]`, `currentMode` (`minimal | native | algorithm`), and rework/mode history.

### `GET /api/algorithm/stream`  (Server-Sent Events)
The same payload as `GET /api/algorithm`, pushed over SSE for ~100ms-latency updates. The frontend prefers SSE and falls back to polling `/api/algorithm` (2s) when the stream is unavailable. Return HTTP `503` (optionally with a `LIFEOS_NO_SSE=1` signal) to force the polling fallback.

### `GET /api/agents`
Event feed for agent/hook activity.
```ts
{ events: {
    source_app: string; session_id: string; hook_event_type: string;
    payload?: Record<string, any>; summary?: string; timestamp?: number;
    model_name?: string; agent_name?: string;
  }[]
}
```

### `GET /api/events/recent`
Recent LifeOS events. Accepts either shape:
```ts
{ events: PAIEvent[] }  // or a bare PAIEvent[]
// PAIEvent: { timestamp: string; session_id: string; source: string; type: string; [k: string]: unknown }
```

### `GET /api/ladder`
Data for the agent "ladder" view (escalation/effort ladder). Returns the ladder rows the `/ladder` page renders.

### `GET /api/loops` · `POST /api/loops/control` · `POST /api/loops/start`
The loops (autonomous run) dashboard. `GET /api/loops` returns loop state; `control` and `start` post actions (start/stop/pause) back to the backend. Optional; only needed if your install runs loops.

### `GET /api/novelty`
State for the novelty/ideation engine dashboard. Returns one or more `NoveltyRun` objects (see `src/hooks/useNoveltyState.ts`): phases, checkpoints, fitness trajectory, candidate ideas with per-axis scores, and domain-fertility pairings.

### `GET /api/hypotheses`
The science-loop view: hypotheses with status and evidence. Returns the hypothesis list the `/hypotheses` page renders.

---

## Observability & Performance

### `GET /api/observability/tool-failures`
Tool-failure records for the failure leaderboard and heatmap. Array of failure events (tool, count/timestamp, context).

### `GET /api/observability/voice-events`
Voice/notification events for the voice-activity waveform. Array of timestamped voice events.

### `GET /api/performance/cost`
Cost and token time series for the Performance "cost" tab. Returns daily/aggregated cost and token data honoring the selected time window.

### `GET /api/performance/anthropic-cost`
Model-provider cost breakdown for the "anthropic" tab.

### `GET /api/performance/failures`
Failure analytics for the Performance "failures" tab.

### AgentsView proxy

These proxy [agentsview](https://www.agentsview.io/)'s local SQLite DB (`~/.agentsview/sessions.db`). Required for the Performance agent analytics; see [SETUP Tier C](SETUP.md#tier-c-agentsview-for-agent-analytics).

#### `GET /api/agentsview/usage-summary`
```ts
{
  from: string; to: string;
  totals: {
    inputTokens: number; outputTokens: number;
    cacheCreationTokens: number; cacheReadTokens: number;
    totalCost: number; cacheSavings: number;
  };
  daily: { date: string; totalCost: number; inputTokens: number; outputTokens: number }[];
  projectTotals: { project: string; cost: number; inputTokens: number; outputTokens: number }[];
  modelTotals: { model: string; cost: number; inputTokens: number; outputTokens: number }[];
  agentTotals: { agent: string; cost: number }[];
  sessionCounts: { total: number; byAgent: Record<string, number> };
}
```

#### `GET /api/agentsview/activity`
Activity time series across sessions.

#### `GET /api/agentsview/heatmap`
Calendar heatmap data (per-day activity/error intensity).

#### `GET /api/agentsview/top-sessions`
```ts
{
  sessionId: string; displayName: string; agent: string; project: string;
  startedAt: string; /* plus cost/token/duration fields */
}[]
```

#### `GET /api/agentsview/session-meta`
Metadata for a session (names, project, agent), used to enrich other views.

---

## Knowledge wiki

### `GET /api/wiki`
Wiki index (documentation tree/listing).

### `GET /api/wiki/search?q={query}`
Full-text search across the wiki. Returns matching entries with snippets.

### `GET /api/wiki/doc/{path}`
A single documentation page's rendered content.

### `GET /api/wiki/skills` · `GET /api/wiki/skills/{slug}`
Skill catalog and individual skill detail.

### `GET /api/wiki/hooks` · `GET /api/wiki/hooks/{slug}`
Hooks catalog and individual hook detail.

### `GET /api/wiki/knowledge/{path}`
A knowledge-archive entry.

### `GET /api/wiki/arbol`
Arbol (cloud-execution) wiki content, where present.

### `GET /api/wiki/graph`
Nodes and edges for the wikilink force graph (`/knowledge/graph`, `/system/graph`). Returns `{ nodes[], links[] }` for D3.

### `POST /api/wiki/bookmark/{id}`
Toggles a bookmark. One of the few write endpoints; needs a backend that persists the toggle.

### `GET /api/memory/graph`
Nodes and edges for the memory graph (`/memory/graph`). Same `{ nodes[], links[] }` graph shape.

---

## Misc

### `GET /api/tab-freshness`
Per-surface freshness timestamps, driving the freshness pills on tabs. Returns a map of surface to last-updated info (`pai-freshness-v1` convention).

### `GET /api/onboarding/state`
Onboarding/template state for first-run guidance. Returns whether the install is fresh and which steps remain.

---

← Previous: [Prompting guide](PROMPTING-GUIDE.md) | → Next: [Architecture](ARCHITECTURE.md)
