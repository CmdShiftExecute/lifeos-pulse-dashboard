# Prompting guide

The dashboard becomes yours when it renders your data. If you run [LifeOS](https://github.com/danielmiessler/LifeOS) on Claude Code, you can get there without writing much code yourself: your assistant can implement the endpoints and scaffold the conventions this dashboard visualizes. This guide gives you copy-paste prompts to do exactly that.

The prompts are written for an assistant running inside your LifeOS install (with access to your files and your Pulse server code). Read each one before you run it, and adjust paths to match your setup. Treat generated endpoints as a draft: verify them against the [API contract](API.md) before relying on the numbers.

A note on framing: the conventions below (TELOS, the memory ledger, the Algorithm phases) come from the LifeOS philosophy, not from this dashboard. Pulse is a way to *see* them. Credit where it is due: they are [Daniel Miessler's](https://github.com/danielmiessler) design; this project renders them.

---

## Part 1: Implement and verify the API endpoints

The dashboard calls a set of same-origin `/api/*` routes, documented with response shapes in [docs/API.md](API.md). Bring them online one group at a time, starting with the surfaces you care about most. Unimplemented routes render empty states, so partial progress is always usable.

### TELOS endpoints

```
Read docs/API.md in the lifeos-pulse-dashboard repo, the "TELOS" section.
I want my Pulse server to serve /api/telos/overview, /api/telos/library, and
/api/memory/logs against my real TELOS files.

For /api/telos/overview: build the response from my TELOS source files
(missions, goals, problems, strategies, metrics, and the dimension percentages).
Return meta.isPersonalized: true so the dashboard shows my data instead of the
showcase. Where a field is not yet populated, return an empty array or empty
string, never sample content.

For /api/telos/library?s={section}: return the requested section
(beliefs, wisdom, models, books, narratives, lessons, decisions, mistakes,
learnings, sessions, operating-model) shaped as { key, title, updated, intro,
groups: [{ heading, items[] }], count }.

After implementing, start the server and curl each route. Show me the JSON and
confirm it matches the shapes in docs/API.md. Fix any mismatch before stopping.
```

### Work and Algorithm endpoints

```
Referencing docs/API.md ("Work & Algorithm"), implement /api/work,
/api/algorithm, and /api/algorithm/stream on my Pulse server.

/api/work should return my current focus, my projects, my live Algorithm
sessions, and my work-tracker kanban (columns of issues) in the documented
shape. /api/algorithm should return current session state(s) with the
AlgorithmState fields from src/types/algorithm.ts (currentPhase, effortLevel,
criteria, agents, phaseHistory, currentMode). /api/algorithm/stream should push
that same payload over SSE; if you cannot support SSE, return 503 so the
frontend falls back to polling.

Verify by opening /work and /agents in the dashboard against my server and
confirming the board and phase timeline populate. Report anything that renders
empty and why.
```

### Life, observability, and performance endpoints

```
Referencing docs/API.md, implement the "Life & overview" and "Observability &
Performance" endpoint groups: /api/life/home, /api/life/{dimension},
/api/observability/*, and /api/performance/*. Pull from my existing life files
and observability logs. Keep every response matching the documented shape.
Verify each with curl and by loading the corresponding dashboard page.
```

### AgentsView proxy (for the Performance tab)

```
The dashboard's Performance analytics read from agentsview's local SQLite DB at
~/.agentsview/sessions.db via /api/agentsview/* proxy routes (see docs/API.md,
"AgentsView proxy"). agentsview is installed via `brew install --cask agentsview`.

Implement /api/agentsview/usage-summary, /activity, /heatmap, /top-sessions, and
/session-meta as read-only queries against ~/.agentsview/sessions.db, returning
the documented shapes. Do not modify that database; read only. Verify
usage-summary with curl and confirm the /performance page's cost and token
charts render.
```

---

## Part 2: The memory ledger convention

The Operating Model map and the memory explorer are built around a simple, durable convention from LifeOS: your assistant keeps three plain-text ledgers as it works. This dashboard reads them through `/api/memory/logs` and renders them as browsable, dated timelines.

### The three ledgers

- **`MISTAKES.md`**, one line per miss, written the moment it is noticed: a dropped option, an unverified assumption, a silent omission, a logical error. A mistake class that repeats becomes a counter-rule. This is your assistant's inoculation record.
- **`DECISIONS.md`**, one line per finalized decision: the question and what was chosen, not the research trail behind it.
- **`SESSIONS.md`**, a dated block per substantive session: what was built, the key decisions, what was verified, what is still open. Newest first.

Optionally, harvested **learnings** (structured items your assistant extracts over time) round out the `/api/memory/logs` payload.

The value of the convention is compounding: the ledgers are cheap to append to in the moment and expensive to reconstruct later. The dashboard makes them visible so the record is worth keeping.

### Scaffold it

```
Set up the memory-ledger convention in my LifeOS install so the Pulse dashboard
can render it.

1. Create MISTAKES.md, DECISIONS.md, and SESSIONS.md in my memory directory if
   they do not exist, each with a short header describing its format:
   - MISTAKES.md: one dated line per miss; append the moment a mistake is noticed.
   - DECISIONS.md: one dated line per finalized decision (the ask + what I chose).
   - SESSIONS.md: one dated ## block per substantive session, newest first
     (what was built, key decisions, what was verified, what is open).
2. Add a standing instruction to my assistant's rules: append to these ledgers
   in the moment, following the formats above. A mistake class that appears twice
   gets promoted to a counter-rule.
3. Make sure /api/memory/logs reads all three (plus any harvested learnings) and
   returns them in the shape documented in docs/API.md.

Then open the memory explorer in the dashboard and confirm my ledgers render.
```

---

## Part 3: Keep TELOS structured so the pages render richly

The TELOS surfaces are only as good as the structure of your TELOS files. The dashboard renders the dependency chain (missions to goals to problems to strategies), attaches KPIs to goals, and flags "stranded" items. That only works if your files are parseable.

### Structure prompt

```
Review my TELOS files against how the Pulse dashboard consumes them
(docs/API.md, "TELOS" section; the Telos type in
src/app/telos/_v7/data.ts is the reference shape).

Make sure my TELOS is structured so that:
- Every mission, goal, problem, and strategy has a stable id and clear text.
- Goals link to the missions they serve and the problems they address.
- Strategies link to the goals they advance.
- Measurable goals carry KPIs/metrics with a current value and a target.
- Dimension percentages exist for each life dimension (they drive the rings).

Then flag anything stranded: work with no goal, goals with no strategy, and
idle strategies. Do not invent links; where a relationship is genuinely missing,
list it so I can decide. Keep my content, only fix structure.
```

### Keep it fresh

```
On a regular cadence, reconcile my TELOS files, KPIs, and dimension percentages
against my real progress, and update the values the dashboard reads. Re-stamp
the "updated" fields so the dashboard's freshness pills stay accurate. Summarize
what changed; do not overwrite history silently.
```

---

## Working with these prompts

- **Verify, do not trust.** After an endpoint is implemented, curl it and load the page. The dashboard renders whatever the backend returns; wrong numbers here are backend bugs, not frontend ones.
- **One surface at a time.** TELOS and work first, then life, then performance. Empty surfaces are fine and expected mid-migration.
- **Match the shapes.** [docs/API.md](API.md) is the contract. If a page renders empty despite a 200 response, the shape is usually off by a field name.
