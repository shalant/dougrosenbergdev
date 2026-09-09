# Design Notes — Astro Portfolio Port

Working notes for the visual differentiation pass on this port, per feedback that the current site "looks like a common AI site." If a value here disagrees with the code, the code is right — fix this doc.

## Subject & audience

Doug Rosenberg: full-stack developer (.NET/Blazor, Angular, React) who also plays in a working band (Guacamayo). Site's job right now is to earn trust from **freelance/small-business clients** evaluating him for real project work — not to farm recruiter attention (that's deliberately deferred). So the design should read as evidence-driven craftsman work, not a generic "hire me" SaaS template.

## Concrete finding: the current hero is the textbook tell

`Home.razor`'s hero is almost a checklist match for the flagged defaults: an eyebrow label (`// software engineer`) above the heading, a tagline subtitle, and a two-button CTA where the primary button has an arrow appended (`See My Work →`). This is very likely the specific thing people are reacting to, more than the color/type system (see below — that already shows real bespoke care). The hero photo itself is a real personal portrait, not a stock/generated image — that's a genuine differentiator and stays; only the eyebrow/tagline/button-pair chrome around it goes.

Also worth noting for later blog-content passes: `experience.json`'s bullet points are each prefixed with an emoji (🛠️ 🔄 💡 ...) — a common tell in LLM-drafted resume/portfolio copy. Not fixing this in the port itself (it's content, not layout), but flagging it as a worthwhile fast-follow edit to the data, separate from this visual pass.

## Token system

Note: the existing `app.css` already has more bespoke thought in it than the hero layout does — a `--brass: #c9a15a` accent explicitly "pulled from the saxophone," reserved for one-time hero entrance/divider moments and never used as a second regular accent; a custom `--ease-swing` cubic-bezier described as "a nod to jazz phrasing"; and a tiled art-deco background system (`--art-deco-1/2`) with light/dark blend-mode variants. [[design-bauhaus-background]] — extend this existing motif, don't replace it with something generic. Reuse these exact tokens/values below rather than inventing new ones.

**Color** — port every token in `app.css`'s `:root` verbatim (`--bg`, `--bg-hero`, `--text`, `--heading`, `--accent`/`--teal`/`--teal-dark`, `--brass`, `--art-deco-1/2`, `--ease-swing`). No new hexes; `CLAUDE.md` bars color-scheme changes without discussion and this is a restructure of *usage*, not a new palette. Phase 0 targets the dark (`:root` default) theme only — the light theme is already scoped to just the homepage in the current CSS ("Phase B" per its own comment) and porting that scoping logic is a later-phase concern, not a Phase 0 blocker.
- Reserve `--brass` for exactly what it's reserved for today: the one-time hero moment and section-divider motif. Do not add it as a second "regular" accent — that restraint is already correctly documented in `app.css`, just keep honoring it.
- `--accent`/`--teal` stays a single spent accent per page (nav active state, one hero moment, the ring), not a hover color on every element.

**Type** — the existing three-family system (serif display / geometric sans / mono) is already a real choice, not the generic Inter/system-ui default. Keep it, but tighten how each is *used*:
- **Cormorant Garamond** (display) — set larger and more assertively for names/section titles; it's been under-used as a small label, it should carry the page.
- **Montserrat** (body/UI) — unchanged.
- **JetBrains Mono** — restrict to places where it's semantically true (actual code, version numbers, dates), not as decorative chrome on every small label. Currently overused as generic "tech" seasoning — that's part of the AI-site tell.

**Layout**
- **Fix the hero chrome, keep the photo.** Drop the `// eyebrow` label and the two-button `See My Work →` / `About Me` CTA pair — that's the checklist-match tell. Keep the real portrait (asymmetric two-column: text left, photo right — that composition is fine). Replace the tagline+button-pair with the name set large in Cormorant Garamond, one specific sentence pulled from `aboutme.json`'s `detailOrQuote` (what he's actually building right now — real and current, not a generic tagline), and at most one understated inline link if a CTA is needed at all — the header nav already covers "see my work."
- **Experience section**: a connected ruled timeline (thin lines + small teal tick marks), not a grid of identical rounded-corner soft-shadow cards. A timeline is genuinely sequential, so a structural marker earns its place here — unlike decorative 01/02/03 numbering elsewhere.
- **Corner radius is intentional, not uniform**: sharp/rectangular for structural or data content (experience entries, services pricing table), small soft radius reserved for actual tactile controls (buttons, chips, the nav).
- **Spacing is asymmetric** where the content justifies it (e.g., hero right column narrower than left) rather than a perfectly symmetric grid on every section.

## Principles

1. **Evidence over adjectives.** Real numbers and facts from the JSON data, not "passionate full-stack developer" copy.
2. **One bold accent per page.** Teal is spent once as a signature interactive moment (the 3D ring on `/webdesign`, the status-line panel on `/`) — not the hover color on every card.
3. **Left-aligned, asymmetric composition.** Never the centered-hero-two-buttons default.
4. **Mono type is data, not decoration.** Only appears next to an actual technical fact.
5. **One deliberate motion moment per page**, not fade-and-slide-up on every section on scroll (current `scrollReveal.js` behavior — dial back to fewer, more intentional triggers).

## Explicitly avoided (AI-site tells, per calibration)

Warm cream + terracotta; near-black + acid accent; broadsheet zero-radius dense columns; uniform rounded-card-kit with identical soft grey shadow; tracked-out ALL-CAPS eyebrow labels; middle-dot meta strings; em-dash "WORD — fragment" labels; arrow (`→`) appended to buttons/links.
