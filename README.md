<div align="center">

<img src="docs/screenshots/banner.png" alt="LifeOS Pulse Dashboard" width="100%" />

# LifeOS Pulse Dashboard

A polished frontend for your [LifeOS](https://github.com/danielmiessler/LifeOS) personal AI. It turns the files your assistant already writes (goals, work sessions, memory, cost logs) into a fast, themeable command center you actually want to open.

[![License: MIT](https://img.shields.io/badge/License-MIT-informational.svg)](LICENSE)
![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-149eca?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?logo=tailwindcss)

[![Live Demo](https://img.shields.io/badge/%E2%96%B2%20%E2%96%B8%20LIVE%20DEMO-LIFEOS%20PULSE-000000?style=for-the-badge&labelColor=4a4a4a)](https://lifeos-pulse-dashboard.vercel.app/)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FCmdShiftExecute%2Flifeos-pulse-dashboard)

[Quick start](#quick-start) · [Setup](docs/SETUP.md) · [API contract](docs/API.md) · [Prompting guide](docs/PROMPTING-GUIDE.md) · [Architecture](docs/ARCHITECTURE.md)

</div>

---

## Table of Contents

- [Why this exists](#why-this-exists)
- [Screenshots](#screenshots)
- [Feature tour](#feature-tour)
- [Quick start](#quick-start)
- [Architecture in one breath](#architecture-in-one-breath)
- [Documentation portal](#documentation-portal)
- [More than a reskin](#more-than-a-reskin)
- [Credits](#credits)
- [License](#license)

## Why this exists

LifeOS Pulse Dashboard is a web dashboard that renders the files a [LifeOS](https://github.com/danielmiessler/LifeOS) assistant maintains: your goals, your work, your assistant's memory, and your AI costs.

It is built for people who run LifeOS every day. If that is you, the data already exists on your disk. Your TELOS files hold your goals. Your work registry holds your sessions. Your memory folders hold what your assistant has learned, decided, and gotten wrong. This dashboard puts all of it on one screen instead of in a dozen files you never open.

What you get:

- Your goals with live KPIs, traced from mission to goal to strategy, with stranded work flagged
- Your assistant's sessions and work items on one kanban, updating as it works
- The decisions, mistakes, and session narratives it logs, as dated, browsable ledgers
- Real AI spend by day, model, and project, plus tool-failure analysis
- A live map of the running system: hooks, jobs, and where every kind of memory is written and read

There is nothing to configure before you can judge it: the [live demo](https://lifeos-pulse-dashboard.vercel.app/) runs the whole app on fictional data, and `bun run demo` does the same locally.

Compared to the stock Pulse dashboard that ships with LifeOS, this version adds a zero-backend demo mode, a written API contract, a prompting guide your own assistant can execute to wire up your data, and several conventions that are not part of stock LifeOS at all, described in [More than a reskin](#more-than-a-reskin).

## Screenshots

Every image below is demo-mode data; the first one links to the live demo.

| Life & TELOS overview | Goals system |
| :---: | :---: |
| <a href="https://lifeos-pulse-dashboard.vercel.app/"><img src="docs/screenshots/overview-dark.png" alt="Life overview with dimension rings, click to open the live demo" width="100%" /></a> | <img src="docs/screenshots/telos-dark.png" alt="TELOS goals system" width="100%" /> |

| Work kanban | Performance & cost |
| :---: | :---: |
| <img src="docs/screenshots/work-dark.png" alt="Work kanban" width="100%" /> | <img src="docs/screenshots/performance-dark.png" alt="Performance and cost analytics" width="100%" /> |

| Memory explorer | Operating Model map |
| :---: | :---: |
| <img src="docs/screenshots/memory-dark.png" alt="Memory explorer" width="100%" /> | <img src="docs/screenshots/operating-model-dark.png" alt="Operating Model map" width="100%" /> |

## Feature tour

**Life overview.** A radial view of your life dimensions (craft, health, wealth, mind, and the rest), each ring driven by a percentage your assistant maintains. A one-sentence status, top goals, next actions, and a spark line pull from the same source, so the landing page answers "where am I right now" at a glance.

**TELOS goals system.** The heart of the dashboard. TELOS is the LifeOS convention for modeling a life as a dependency graph: missions to goals to problems to strategies, with KPIs attached. Pulse renders the full chain, flags "stranded" items (work with no goal, goals with no strategy, idle strategies), and gives every mission, belief, mental model, book, and narrative its own richly formatted library page.

**Work kanban.** Your live Algorithm sessions and your work-tracker issues in one board, grouped by phase or column, with effort tiers and source badges. Sessions stream in over SSE with a polling fallback, so the board moves as your assistant works.

**Memory explorer.** The decisions, mistakes, learnings, and session narratives your assistant logs, presented as browsable, dated ledgers. This is the human-readable side of the "memory ledger" convention documented in the [prompting guide](docs/PROMPTING-GUIDE.md).

**Agent & session observability.** Live event feeds, mode and phase timelines, an effort-distribution view, tool-failure leaderboards, and a set of insight panels over your assistant's activity. Useful for understanding what your agents are actually doing and where they stall.

**Performance & cost analytics.** Token and cost breakdowns by day, model, project, and agent, plus tool-failure analysis. The richest views here read from [agentsview](https://www.agentsview.io/), a local Claude-session viewer (see the [prerequisite note in setup](docs/SETUP.md#tier-c-agentsview-for-agent-analytics)).

**Knowledge wiki + graph.** Your documentation, skills, and hooks as a searchable wiki, with a D3 force graph over the wikilinks between notes. Separate graph views exist for knowledge, memory, and system internals.

**Operating Model map.** An interactive, self-describing map of the running system: what boots when, the per-prompt hook chain, scheduled jobs, where memory is written and read, and the honest gaps. It is parsed live from your config, so it never drifts from reality.

**Themes & command palette.** Six cohesive palettes (five dark, one light), switchable instantly, with a keyboard command palette for jumping to any surface.

## Quick start

Requires [Bun](https://bun.sh). Node 18+ also works if you swap `bun` for `npm`.

```bash
git clone https://github.com/CmdShiftExecute/lifeos-pulse-dashboard.git
cd lifeos-pulse-dashboard
bun install

# Demo mode: instant, zero config, fictional data
bun run demo
```

Open [http://localhost:3333](http://localhost:3333). Demo mode serves a self-contained fictional persona (no backend required), so you can click through every surface immediately. Or skip the install entirely and browse the hosted **[live demo](https://lifeos-pulse-dashboard.vercel.app/)**.

Prefer a hosted demo? The **Deploy with Vercel** button above ships the same fictional-data demo to your own Vercel account in about a minute (`vercel.json` bakes in demo mode; remove it or unset `NEXT_PUBLIC_DEMO_MODE` when you self-host against real data).

When you are ready to see your own life in it, follow **[docs/SETUP.md](docs/SETUP.md)** to point the dashboard at your LifeOS install.

## Architecture in one breath

Next.js App Router, one page per surface, one typed React Query / polling hook per surface, and a single tiny API helper (`src/lib/local-api.ts`) that fetches same-origin relative paths. In production the LifeOS Pulse server hosts the API on the same origin as the dashboard, so no CORS and no config. Theming is a pure CSS-variable layer with `[data-theme]` on the root element. Full detail in **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**; the endpoint contract is in **[docs/API.md](docs/API.md)**.

## Documentation portal

For detailed information, refer to the guides in the [`docs/`](docs/) folder. They are chained with previous/next links, so you can read them front to back like a book.

| Document | Target audience | Description |
| --- | --- | --- |
| [Setup](docs/SETUP.md) | New users | Demo mode, connecting a real LifeOS install, the agentsview prerequisite |
| [Prompting guide](docs/PROMPTING-GUIDE.md) | LifeOS users | Copy-paste prompts that wire the dashboard to your data and scaffold the memory-ledger convention |
| [API contract](docs/API.md) | Integrators | Every endpoint the frontend consumes, with response shapes |
| [Architecture](docs/ARCHITECTURE.md) | Developers | Frontend structure, data flow, demo interception, theming, adding a surface |
| [Contributing](CONTRIBUTING.md) | Contributors | Workflow, conventions, what makes a good PR |

## More than a reskin

Calling this "a frontend" is accurate but undersells what is in the box. The foundation and the core conventions (TELOS, the Algorithm, Pulse itself) are Daniel Miessler's. On top of that foundation, this project adds ideas that are not part of stock LifeOS, each proven through daily use on a real install before being generalized here:

**The memory ledger.** A three-file convention the author designed for his own assistant: `DECISIONS.md` (every finalized call, one line each), `MISTAKES.md` (every miss, logged in the moment, promoted to a counter-rule when a class repeats), and `SESSIONS.md` (dated narratives of what got built and why). It gives an AI assistant something most setups lack entirely: an audit trail and an inoculation record. The Memory explorer renders it; the [prompting guide](docs/PROMPTING-GUIDE.md) scaffolds it into your setup with two prompts.

**The Operating Model map.** A live, interactive schematic of the running system: what boots when, the hook chain each prompt passes through, scheduled jobs, where every kind of memory is written and read, and the honest gaps. Parsed from the running config, so it cannot drift from reality the way documentation does.

**The agentsview bridge.** Cost and session analytics most dashboards never get: per-day API-equivalent spend, token burn by model and project, session leaderboards, failure heatmaps, all read from [agentsview](https://www.agentsview.io/)'s local database and rendered as first-class charts.

**The demo engine.** A fixture layer that makes the entire app explorable with zero backend, which doubles as executable documentation of the API contract.

The honest boundary still stands: your data comes from your backend (the stock LifeOS Pulse server, or endpoints your assistant implements from the guide). The dashboard reads; nothing here writes to your life files beyond a few narrow, documented toggles.

## Credits



- **[Daniel Miessler](https://github.com/danielmiessler)** for [LifeOS / PAI](https://github.com/danielmiessler/LifeOS), the personal-AI framework this dashboard is built to visualize. The TELOS, memory, and Algorithm conventions are his.
- **[agentsview](https://www.agentsview.io/)** for the local session data that powers the performance and cost analytics.
- **[Bai Jamjuree](https://fonts.google.com/specimen/Bai+Jamjuree)** and **[JetBrains Mono](https://www.jetbrains.com/lp/mono/)**, both under the SIL Open Font License, for the typefaces.

Built by [Shashank Sharma](https://github.com/CmdShiftExecute).

## License

[MIT](LICENSE) © 2026 Shashank Sharma.
