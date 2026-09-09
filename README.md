# dougrosenbergdev.com

Douglas Rosenberg's portfolio site — an [Astro](https://astro.build) static build deployed as a [Cloudflare Worker](https://developers.cloudflare.com/workers/). This is a port of a previous Blazor WebAssembly version of the same site (see [`PORT_TODO.md`](./PORT_TODO.md) for why, and what changed).

## Stack

- **Astro** (static output) — every route is real, complete HTML at build time, no client-side framework boot required
- **Cloudflare Workers** — `src/worker.js` handles `POST /api/contact` via Cloudflare's native `send_email` binding, falling back to the static `assets` binding for everything else
- Hand-written CSS (`src/styles/global.css`) — no CSS framework
- Content lives in `src/data/*.json`, not hardcoded in components

## Getting started

Requires Node ≥ 22.12.0.

```bash
npm install
npm run dev        # dev server at http://localhost:4321
npm run build       # static build to dist/
npm run preview     # preview the production build
npm run test:e2e    # Playwright e2e suite
```

## Project structure

```
src/
├── components/    # .astro components
├── layouts/
│   └── BaseLayout.astro   # shared <head> — meta, JSON-LD, font preloads
├── pages/         # file-based routing (index, services, consulting, blog/, webdesign/, ...)
├── data/          # JSON content — experience, blog posts, case studies, site properties
├── styles/
│   └── global.css # all styles
├── assets/images/ # images routed through astro:assets for responsive srcset
└── worker.js      # Cloudflare Worker entry point

e2e/               # Playwright specs
scripts/
└── check-links.mjs  # crawls the built site, verifies every internal link/asset resolves
public/            # static passthrough (fonts, robots.txt, llms.txt, favicons, _headers)
```

## Testing

- **E2E:** `npm run test:e2e` — Chromium, Mobile Chrome, Firefox, WebKit, Mobile Safari (60 tests total)
- **Link integrity:** `node scripts/check-links.mjs` (run against a built `dist/`)
- **Lighthouse:** `npx lhci autorun` (config in `lighthouserc.json`)

CI (`.github/workflows/e2e.yml`, `lighthouse.yml`) runs both on every PR and on push to `master`.

## Deployment

Deploys to Cloudflare Workers via `wrangler.jsonc`, serving `dougrosenbergdev.com` as a custom domain route. See [`PORT_TODO.md`](./PORT_TODO.md) for current deploy status — as of this writing the repo isn't yet connected to Cloudflare's dashboard/GitHub integration.

## More docs

- [`CLAUDE.md`](./CLAUDE.md) — conventions, design rules, and workflow for anyone (human or AI) working in this repo
- [`DESIGN_NOTES.md`](./DESIGN_NOTES.md) — the visual-differentiation pass this port went through (colors, type, layout rules)
- [`PORT_TODO.md`](./PORT_TODO.md) — port status and what's left
