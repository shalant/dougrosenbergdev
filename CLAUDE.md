# Claude Code Development Guidelines

Guidance for working on dougrosenbergdev.com — the Astro port of Doug Rosenberg's portfolio.

> **Reference docs** — read these before making non-trivial changes:
> - [`DESIGN_NOTES.md`](./DESIGN_NOTES.md) — visual-differentiation rules (colors, type, layout). If code and this doc disagree, the code is right — fix the doc.
> - [`PORT_TODO.md`](./PORT_TODO.md) — port status, what's left, and standing project constraints (see below).

## Project Overview

**Type:** Astro static site (SSG), deployed as a Cloudflare Worker
**Language:** Astro components (`.astro`), vanilla JS, JSON data files
**Styling:** Hand-written CSS (`src/styles/global.css`) — no framework. Bootstrap was deliberately removed; don't reintroduce it or any other CSS framework without discussion.
**Data:** JSON files in `src/data/` (experience, blog posts, web design case studies, site properties, etc.)
**Design system:** Navy (`#2c3e50`) + teal (`#1abc9c`), with a reserved brass accent (`#c9a15a`) — see [`DESIGN_NOTES.md`](./DESIGN_NOTES.md) for full token usage rules.

**Sibling project:** `PortfolioNov25` (a Blazor WASM app, still live on GitHub Pages) is the *previous* version of this same site. This repo is its replacement, not a separate product — don't assume the two are unrelated, but don't port Blazor/C# conventions from its `CLAUDE.md` here either; the stacks don't match.

## Getting Started

```bash
npm install
npm run dev          # Astro dev server, http://localhost:4321
npm run build         # Static build to dist/
npm run preview       # Preview the production build
npm run test:e2e      # Playwright e2e suite
```

## Project Structure

```
src/
├── components/       # .astro components (Header, Footer, Home, About, Experience, Contact, ...)
├── layouts/
│   └── BaseLayout.astro   # Shared <head> — meta, JSON-LD, font preloads
├── pages/            # File-based routing
│   ├── index.astro, services.astro, consulting.astro, archive.astro, 404.astro
│   ├── blog/         # index, archive, [slug]
│   └── webdesign/     # index, [slug]
├── data/             # JSON content — edit these, not hardcoded copy in components
├── styles/
│   └── global.css    # All styles; see header comment for section map
├── assets/images/    # Images that go through astro:assets for responsive srcset
└── worker.js          # Cloudflare Worker entry — handles POST /api/contact, falls back to ASSETS.fetch()

e2e/                  # Playwright specs (blog, home, webdesign)
scripts/
└── check-links.mjs   # Crawls the built site, verifies every internal href/src/srcset resolves
public/                # Static passthrough (fonts, robots.txt, llms.txt, _headers, favicons)
```

## Code Style & Conventions

- **Components:** One `.astro` file per component in `src/components/`; co-locate a component's `<style>` block with it unless the rule is truly global (then it belongs in `global.css`).
- **Content over hardcoding:** Copy, links, and structured data live in `src/data/*.json`, not inline in components — keeps `BackendTools` (the sibling repo's content-generation tool) able to write to this repo directly.
- **Images:** Route through `astro:assets` (`<Image />` / `getImage`) for anything that should get a responsive `srcset`, not a plain `<img src>` — see the hero portrait for the pattern.
- **Comments:** Minimal. When you do write one, explain *why*, not *what* — this codebase already leans on comments to record non-obvious tradeoffs (see `global.css`'s font-loading comment or `wrangler.jsonc`'s route comments) — keep that standard, don't add restating-the-code noise.

### Design rules (see DESIGN_NOTES.md for full detail)

- **One bold accent per page.** Teal is spent once as a signature moment (the `/webdesign` ring, the homepage status panel) — not a hover color on every card.
- **Brass (`#c9a15a`) is reserved** for the hero entrance/section-divider motif only. Don't promote it to a second regular accent.
- **Type roles are fixed:** Cormorant Garamond = display/names/section titles, Montserrat = body/UI, JetBrains Mono = actual technical facts (versions, dates, code) — not decorative labels.
- **Avoid the AI-site tells** already identified and removed once: eyebrow labels above headings, two-button hero CTAs with an arrow (`→`) suffix, tracked-out ALL-CAPS labels, middle-dot meta strings, uniform rounded-card-with-soft-shadow kits. Don't reintroduce these patterns in new sections.
- **No new color hexes or a new type family without discussion** — this mirrors the prior project's rule and is reinforced by `DESIGN_NOTES.md`'s "port every token verbatim" instruction.

## Testing

- **E2E:** `npm run test:e2e` runs the Playwright suite (`e2e/*.spec.ts`) across Chromium, Mobile Chrome, Firefox, WebKit, and Mobile Safari. Run this — not just a visual check — before considering a UI change done; the Bootstrap-removal regression (blog search filter, mobile contact `<dialog>`) was only caught by this suite, not by eyeballing Chromium.
- **Link integrity:** `node scripts/check-links.mjs` (run against a built `dist/`) crawls every page and verifies every internal `href`/`src`/`srcset` resolves to a real file.
- **Lighthouse:** `npx lhci autorun` (config in `lighthouserc.json`). Accessibility/best-practices/SEO should stay at 1.0; performance is locally noisy (no HTTP/2 or compression from the local `http-server`) — don't chase the CI performance number using local runs as ground truth, the real edge (Cloudflare) scores differently.
- **CI:** `.github/workflows/e2e.yml` and `lighthouse.yml` both trigger on PRs and push to `master` — build, then run the respective check.

## Deployment

**Target: Cloudflare Workers**, not GitHub Pages (that's the old `PortfolioNov25` site). `wrangler.jsonc` defines:
- `main: ./src/worker.js` — handles `POST /api/contact` via Cloudflare's native `send_email` binding (no third-party API key), falls back to the `assets` binding (`./dist`) for everything else.
- Custom domain route `dougrosenbergdev.com` (zone cutover from GitHub Pages completed 2026-09-08).
- `not_found_handling: "404-page"` — serves `dist/404.html` on unmatched routes (Workers doesn't do this by default the way classic Pages did).

**As of the last recorded state (see `PORT_TODO.md`), this repo is not yet connected to Cloudflare's dashboard/GitHub integration** — there's no deploy step in `.github/workflows/`, matching the sibling music-site project's pattern of leaving deploy to Cloudflare's own git integration rather than a workflow file. Don't assume pushing to `main`/`master` deploys anything until that connection exists — check `PORT_TODO.md`'s "Left to do" section for current status before promising a deploy will "just happen."

**Email:** the contact form's `send_email` binding requires two one-time manual Cloudflare-dashboard steps (Email Routing enabled on the zone, destination address verified) before real sends work — see `src/worker.js`'s header comment. Don't assume the contact form is live end-to-end without checking those were done.

## Standing project constraints

- **Recruiter visibility is intentionally kept low** until ~March 2027 (Doug wants the site read as "open to freelance/consulting," not "open to full-time roles"). This shaped `public/llms.txt`'s wording and the homepage hero copy. If you're touching SEO/GEO content, meta descriptions, or structured data, check `PORT_TODO.md`'s "Constraint: keep recruiter visibility low" note first — don't add recruiter-attracting copy or schema without raising it.
- **Faithful-port issues stay as-is unless explicitly asked to fix.** E.g. the `/webdesign` hero ring's washed-out light-theme contrast is inherited from the live Blazor site, not a porting regression — it's logged in `PORT_TODO.md`, not silently fixed, because fixing it would make this port diverge from current production.

## Git Workflow

- **Feature branches only, as of 2026-09-09** — new work (features, fixes, chores) goes on its own branch, not straight to `master`. `master`'s earliest commits predate this rule and were made directly to it; that history stands, but don't repeat the pattern going forward. There's no pre-push hook enforcing this yet (unlike `PortfolioNov25`) — it's a process rule, not a technical block.
- **No commits between 8:30am and 5:00pm on weekdays, absolutely no exceptions.** This is a hard scheduling constraint, not a style preference — if work finishes inside that window, wait and commit after 5pm (or before 8:30am, or anytime on a weekend) rather than committing immediately. Applies to every commit regardless of branch, urgency, or how small the change is.
- **Commit message style actually in use here:** an imperative summary line, then a body explaining *why* the change was made and what was verified (build passed, tests run, manual checks done) — see recent commits (`git log`) for the pattern. This is more detailed than a one-line `[Category]` prefix convention; keep matching it rather than switching to a terser style.
- Before opening/expecting a PR: there is no enforced "docs must update in the same branch" hook here, but it's still good practice — if a change affects something documented in `PORT_TODO.md` or `DESIGN_NOTES.md`, update that doc in the same commit rather than leaving it stale.

## Things to avoid without discussion

- Changing the navy/teal/brass color tokens or adding a new type family (see Design rules above).
- Reintroducing a CSS framework (Bootstrap was deliberately removed).
- Changing `wrangler.jsonc`'s routing/binding config without understanding the Cloudflare-dashboard side (custom domain routes and `send_email` destination verification are set up outside this repo).
- Assuming GitHub Pages / Azure / any hosting other than Cloudflare Workers — none of that applies here.
