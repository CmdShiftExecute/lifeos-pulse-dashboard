# Setup

<div align="center">

[← Back to overview](../README.md)

</div>

There are three ways to run LifeOS Pulse Dashboard, in increasing order of "this is my actual life in it":

- **Tier A: Demo mode.** Zero config, fictional data. Start here.
- **Tier B: Connect to a real LifeOS install.** Point the dashboard at a backend serving the API.
- **Tier C: agentsview for agent analytics.** A prerequisite for the richest Performance views.

The dashboard is a frontend only. It renders data; it does not produce it. Tiers B and C are about giving it a real data source.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Tier A: Demo mode](#tier-a-demo-mode)
- [Tier B: Connect to a real LifeOS install](#tier-b-connect-to-a-real-lifeos-install)
- [Tier C: agentsview (for agent analytics)](#tier-c-agentsview-for-agent-analytics)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

- [Bun](https://bun.sh) (recommended) or Node 18+.
- A modern browser.
- For Tier B: a running LifeOS install, or the willingness to implement a few HTTP endpoints (see the [prompting guide](PROMPTING-GUIDE.md)).
- For Tier C: macOS, plus [agentsview](https://www.agentsview.io/).

```bash
git clone https://github.com/CmdShiftExecute/lifeos-pulse-dashboard.git
cd lifeos-pulse-dashboard
bun install
```

---

## Tier A: Demo mode

```bash
bun run demo
```

Open [http://localhost:3333](http://localhost:3333).

Demo mode serves a self-contained fictional persona (Alex Carter, an independent product designer, and their assistant Aria). No backend, no network calls to your machine, nothing to configure. Every surface is populated so you can evaluate the interface end to end. All demo values are illustrative and internally consistent; none of them are real.

Use demo mode to decide whether you want to wire it to your own data. When you do, move to Tier B.

---

## Tier B: Connect to a real LifeOS install

### The model

In production the dashboard is served **by your LifeOS Pulse server, on the same origin as the API**. The frontend's entire network layer is one helper that fetches relative paths (`/api/...`) against whatever origin served the page (`src/lib/local-api.ts`). That means:

- No CORS to configure.
- No API base URL to set.
- No secrets in the frontend.

The dashboard calls `/api/telos/overview`, `/api/work`, `/api/life/home`, and the rest; your backend answers them. The complete list, with response shapes, is in **[docs/API.md](API.md)**.

### If you run the stock LifeOS Pulse server

The stock Pulse server (part of [LifeOS](https://github.com/danielmiessler/LifeOS)) already serves these routes. The intended deployment is to build this dashboard as the static frontend and let the Pulse server host it, so the page and the API share an origin. Two common ways to do that:

1. **Host the built dashboard from the Pulse server.** Run `bun run build`, then serve the output from the same server that answers `/api/*`. The dashboard and API now share an origin and everything resolves.
2. **Develop against a running Pulse server.** Run `bun run dev` (port 3333) and put a dev proxy in front so that `/api/*` forwards to your Pulse server's port. Because all requests are relative, any same-origin proxy works.

Exact wiring depends on your LifeOS version and how your Pulse server is configured. The contract that matters is: the dashboard's `/api/*` requests must reach a backend that answers them in the shapes in [docs/API.md](API.md).

### If you do not run the stock Pulse server

You can implement the endpoints yourself. This is more approachable than it sounds, because your assistant can do most of it: LifeOS runs on Claude Code, and the [prompting guide](PROMPTING-GUIDE.md) gives you copy-paste prompts that ask your assistant to implement and verify each endpoint group against your own files. Start with the surfaces you care about (TELOS and work are the usual first two); unimplemented endpoints simply render empty states rather than breaking the app.

### Graceful degradation

The dashboard is built to survive a partial backend. Endpoints that are missing, error, or return empty data produce empty-state guides or type-stable fallbacks, not crashes. TELOS in particular distinguishes three states via a `meta.isPersonalized` flag: a fresh install shows a showcase, a personalized-but-sparse install shows real data with empty-state hints where files are not yet populated, and an unreachable backend falls back to the showcase so the page stays useful. You can therefore bring endpoints online one at a time.

---

## Tier C: agentsview (for agent analytics)

> **Prerequisite for the Performance tab's agent analytics.** The token, cost, model, project, and session breakdowns on `/performance` (and related insight panels) read from [agentsview](https://www.agentsview.io/), a local viewer for your AI coding sessions. Without it, those specific views have no data source and will render empty. The rest of the dashboard does not depend on it.

### What agentsview is

[agentsview](https://www.agentsview.io/) is a local macOS app that browses, searches, and analyzes your past AI coding sessions (Claude Code and others). It maintains a local SQLite database of your session activity, tokens, and cost.

Install it via Homebrew:

```bash
brew install --cask agentsview
```

Its database lives at:

```
~/.agentsview/sessions.db
```

### How the dashboard reads it

The dashboard never touches that SQLite file directly. Your backend exposes it through a small set of proxy endpoints under `/api/agentsview/*` (usage summary, activity, heatmap, top sessions, session metadata). The Performance page consumes those. The endpoint shapes are documented in [docs/API.md](API.md#agentsview-proxy). If you are implementing endpoints yourself, the [prompting guide](PROMPTING-GUIDE.md) includes a prompt for wiring the agentsview proxy against `~/.agentsview/sessions.db`.

---

## Troubleshooting

- **Everything is empty on a real install.** Confirm your backend is on the same origin as the page and that `/api/*` requests reach it. Open the browser network tab and check that, say, `/api/telos/overview` returns 200 with JSON.
- **TELOS shows sample data on a real install.** That is the fresh-install showcase. It switches to your data once your overview endpoint returns `meta.isPersonalized: true`. See [the TELOS prompt](PROMPTING-GUIDE.md).
- **Performance tab is blank.** That is Tier C. Confirm agentsview is installed, `~/.agentsview/sessions.db` exists, and your `/api/agentsview/*` proxy is serving it.
- **Text is invisible on one theme.** Almost always a theme-token issue in a custom change; see the theming note in [ARCHITECTURE.md](ARCHITECTURE.md#theming).

---

← Previous: [README](../README.md) | → Next: [Prompting guide](PROMPTING-GUIDE.md)
