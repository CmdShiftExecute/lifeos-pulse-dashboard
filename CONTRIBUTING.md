# Contributing

Thanks for taking an interest. This is a focused project (a dashboard frontend for LifeOS), so contributions that keep it fast, honest, and coherent are the most welcome.

## Ground rules

- The dashboard is a **read-mostly frontend**. It should never fabricate data. When an endpoint is missing or returns nothing, show an empty state or a fallback, never invented numbers.
- Keep personal data out. Demo and fixture content uses the shared fictional persona (Alex Carter / Aria). No real names, employers, or amounts.
- Match the existing house style: one page per surface, one typed hook per surface, one small API helper, CSS-variable theming.

## Getting set up

```bash
bun install
bun run demo    # fictional data, no backend, port 3333
bun run dev     # same port, expects a real backend on the same origin
```

See [docs/SETUP.md](docs/SETUP.md) for connecting a real LifeOS install and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how the pieces fit.

## Making a change

1. Fork and branch from `main`.
2. Keep changes surgical. Prefer editing an existing surface over adding a new one unless the feature genuinely warrants it.
3. If you add a surface, register it in `src/lib/nav.ts` and add a typed hook rather than fetching inline. The "add a new surface" walkthrough is in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
4. If you consume a new endpoint, document its shape in [docs/API.md](docs/API.md).
5. Run `bun run build` before opening a PR. It must pass type checking and build cleanly.
6. Check your change on both a dark theme and the `daylight` light theme. Theme tokens come in two flavors (full colors and HSL triplets); using a triplet raw in a color position renders invisible text, so verify visibility in the browser.

## Pull requests

Keep them small and single-purpose. Describe what changed and why, and include a screenshot for any visual change. If your PR depends on a backend endpoint the stock Pulse server does not yet serve, say so and link the relevant section of the API doc.

## Reporting issues

Include your setup tier (demo, real LifeOS install, or custom endpoints), the surface affected, and what you expected versus what you saw. Console and network output help for anything that looks like a data-shape mismatch.
