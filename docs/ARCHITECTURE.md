# Architecture

LifeOS Pulse Dashboard is a Next.js (App Router) frontend. It is deliberately simple in shape: one page per surface, one typed hook per surface, one small API helper, and a CSS-variable theming layer. This document explains how those pieces fit and how to add your own surface.

## Stack

- **Next.js 15** (App Router) with **React 19**.
- **TypeScript** throughout.
- **Tailwind CSS 3** for layout and utilities, with a custom CSS-variable theme layer on top.
- **TanStack Query** for cached fetching, alongside lightweight polling hooks for real-time surfaces.
- **Recharts** and **D3** for charts and force graphs.
- **Framer Motion** for transitions, **lucide-react** for icons, **react-markdown** (+ remark-gfm, rehype-highlight) for wiki rendering.
- **Bun** as the package manager and dev runner (Node also works).

## Directory map

```
src/
  app/                 One folder per route (App Router).
    page.tsx           Root / entry.
    life/  telos/  work/  performance/  memory/  knowledge/  ...
    telos/_v7/         The TELOS command-center implementation (largest surface).
    telos/library/     Library sections + the Operating Model map.
    globals.css themes.css effects.css   Global + theme + effect layers.
  components/
    AppHeader.tsx CommandPalette.tsx ThemeSwitcher.tsx  Shell chrome.
    activity/        Observability dashboards and insight panels.
    wiki/            Wiki renderer, search, sidebar, knowledge graph.
    kit/             Small shared primitives (Section, Reveal, ShowMore, ...).
    ui/              shadcn-style primitives (button, card, badge, chart, ...).
  hooks/             One typed hook per real-time surface.
  lib/
    nav.ts           The single source of navigation (drives header + palette).
    local-api.ts     The one API helper.
    effort.ts utils.ts wiki-links.ts
  contexts/          ThemeContext, ObserverModeContext.
  types/             Shared types (algorithm.ts is the big one).
```

## Data flow

The entire network layer is one function in `src/lib/local-api.ts`:

```ts
async function apiCall<T>(path, options): Promise<T> {
  const response = await fetch(path, { ... });   // relative path, same origin
  if (!response.ok) throw new Error(...);
  return response.json();
}
```

It fetches **relative paths against whatever origin served the page**. In production the LifeOS Pulse server hosts both the dashboard and the `/api/*` routes, so there is no API base URL, no CORS, and no secrets in the frontend. Everything flows from that one decision.

On top of the helper sit **typed hooks**, one per surface (`src/hooks/`):

- `useAlgorithmState`, SSE-first (`/api/algorithm/stream`) with a polling fallback to `/api/algorithm`. This is the pattern for anything real-time: prefer the stream, degrade to polling, never break.
- `useAgentEvents`, `useLifeosEvents`, HTTP polling of event feeds with de-duplication and a bounded buffer.
- `useChartData`, `useAdvancedMetrics`, client-side bucketing and metric derivation over the event stream.
- `useNoveltyState`, `useNoveltyDashboard`, `useHeatLevel`, surface-specific state.

Pages import a hook (or fetch directly for simpler, non-real-time surfaces) and render. Cross-cutting state lives in two contexts, wired in `src/app/providers.tsx`: `ThemeProvider` (active theme) and `ObserverModeProvider` (a privacy blur for screen-sharing). TanStack Query wraps both.

### Demo interception

Demo mode (`bun run demo`) makes the dashboard self-contained: instead of reaching a real backend, `/api/*` requests are answered from a bundled fictional-data set (the Alex Carter / Aria persona). Because every request goes through the single `local-api.ts` helper against relative paths, demo mode is a matter of serving those paths from fixtures rather than from a live server. This is why demo mode needs zero configuration and why the same pages render identically against real and fictional data: the pages never know the difference.

## Navigation

`src/lib/nav.ts` is the single source of truth for navigation. It exports grouped `NavItem[]` arrays (`lifeNav`, `systemNav`, `moreNav`, and the `telosPanel` mega-menu). The `AppHeader` and the `CommandPalette` both read from it, so adding a route to `nav.ts` makes it appear in the header and the keyboard palette at once. Routes can also exist without a nav entry (reachable by URL and, if listed in `moreNav`, by palette).

## Theming

Theming is pure CSS. `src/app/themes.css` defines the palettes; a `[data-theme]` attribute on `<html>` selects one. `ThemeContext` manages the active theme, persists it, and a small no-flash script (`THEME_NO_FLASH_SCRIPT`, injected in `layout.tsx`) applies the saved theme before hydration to avoid a flash of the wrong palette. There are six themes (`deep-space`, `orchid`, `amber`, `neon`, `terminal` dark, and `daylight` light).

Tokens come in **two layers**, and the distinction matters:

1. **shadcn/Tailwind HSL triplets**, e.g. `--foreground: 213 100% 95%`. These are consumed as `hsl(var(--foreground))` or via their Tailwind class (`text-foreground`, `bg-background`, `border-border`). Using a triplet raw in a color position (`color: var(--foreground)`) renders invisible text, because it is a bare `H S% L%` string, not a color. Always wrap triplets in `hsl(...)` or use the utility class.
2. **Pulse full-color tokens**, e.g. `--neon: #4c86ff` and the seven life-dimension colors. These are full color values and are used directly as `var(--neon)`.

When adding UI, check which kind of token you are reaching for, and verify text visibility on both a dark theme and `daylight` before considering a change done.

## How to add a new surface

1. **Create the route.** Add `src/app/{surface}/page.tsx` (App Router). Keep it a client component if it fetches live data.
2. **Add a typed hook** (if the surface is non-trivial or real-time). Put it in `src/hooks/`, have it call `localApiCall` from `src/lib/local-api.ts`, and define its response type. Reuse the SSE-with-polling-fallback pattern from `useAlgorithmState` for real-time data, or plain polling for feeds.
3. **Register navigation.** Add a `NavItem` to the appropriate array in `src/lib/nav.ts` so the header and command palette pick it up.
4. **Document the endpoint.** Add the new `/api/...` route and its response shape to [docs/API.md](API.md). If the data can be produced from a user's LifeOS files, add a prompt for it to [docs/PROMPTING-GUIDE.md](PROMPTING-GUIDE.md).
5. **Handle emptiness.** Render an empty-state guide when the endpoint is missing or returns nothing (see `EmptyStateGuide` and the fresh/personalized/error handling in `src/app/telos/_v7/use-telos-data.ts` for the reference pattern). Never fabricate data on error.
6. **Theme it correctly.** Use theme tokens (Tailwind classes or wrapped triplets / full-color vars), and check both light and dark.
7. **Verify against the build.** `bun run build` must pass. Check the surface in demo mode and, ideally, against a real backend.

## Build and run

```bash
bun install
bun run demo    # fictional data, no backend
bun run dev     # expects a same-origin backend for /api/*
bun run build   # production build + type check
```

The production deployment target is to have the LifeOS Pulse server host the built output on the same origin as the API. See [docs/SETUP.md](SETUP.md) for the deployment tiers.
