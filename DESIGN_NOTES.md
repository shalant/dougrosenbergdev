# Design Notes — Astro Portfolio Port

Working notes for the visual differentiation pass on this port, per feedback that the current site "looks like a common AI site." If a value here disagrees with the code, the code is right — fix this doc.

## Subject & audience

Doug Rosenberg: full-stack developer (.NET/Blazor, Angular, React) who also plays in a working band (Guacamayo). Site's job is to earn trust from **freelance/small-business clients** evaluating him for real project work; recruiter attention showing up as a side effect is fine and no longer being deliberately suppressed (see `PORT_TODO.md`'s superseded recruiter-visibility constraint, 2026-09-16). So the design should read as evidence-driven craftsman work, not a generic "hire me" SaaS template.

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
5. **One deliberate motion moment per page**, not fade-and-slide-up on every section on scroll. Overridden by Doug on 2026-10-18: the 2026-10-17 pass removed the section fade/slide-up, the `h2` `fadeInDown`, the Skills chip stagger and the endless hero scroll-arrow bounce; after seeing it on the dev server he asked for all four back, so they stay. Don't remove them again without asking. The new state-change motion below is additive.

## Motion inventory (2026-10-17)

Everything else is a *state change*: short (≤0.4s), triggered by the visitor, and never an entrance.

- **Signature moment, one per page:** `/` = the hero entrance (Bauhaus layers settle, name, divider, portrait; the scroll arrow keeps bouncing). `/webdesign` = the 3D ring. Subpages = their hero heading's entrance.
- **Entrances (kept by Doug's choice, 2026-10-18):** `.reveal-on-scroll` sections fade and slide up 40px as they enter, Skills chips stagger in 50ms apart, and every `h2` runs `fadeInDown` on load.
- **Sitewide motif:** the brass waveform `SectionDivider` plays once when its section scrolls in.
- **More motion, added at Doug's request (2026-10-18):**
  - **Hero:** the name rises in letter by letter, and the portrait leans up to 8° toward the cursor on desktop (`public/js/motion.js`).
  - **Scroll-driven (CSS scroll timelines, none in Firefox):** as the page scrolls, the two Bauhaus layers, the portrait and the text drift at different speeds, and blog posts get a 3px reading-progress bar at the top.
  - **Entrances:** heading underlines draw out from the center, Experience bullets cascade in when a job is selected, and `/webdesign` project cards and `/blog` post cards stagger in like the skill chips.
  - **Hover (desktop only):** the logo hexagon turns 60°, nav links get an underline that grows from the center, and project and post cards get a soft teal light that follows the cursor.
- **State changes:** Experience tab marker slides between jobs, and its panel settles in 0.3s.
- **GitHub stats:** the six numbers count up once (0.9s, ease-out) the first time the row is 60% in view. Real values are in the HTML; screen readers get a static `.sr-only` copy. Skipped with reduced motion.
- **Contact form:** bad fields get a red border (`aria-invalid`, the existing `#c0392b` error red) and focus moves to the first one; the submit button shows a small spinning ring while sending; success is the existing toast.
- **Theme toggle:** sun/moon cross-rotate in place; the new theme is revealed in a circle growing from the toggle (same-document view transition in `public/js/theme.js`, 0.55s). Instant swap where unsupported or with reduced motion.
- **Page-to-page:** native cross-document view transitions (CSS only). A `/webdesign` card's project name morphs into the case study title, a blog card's title into the post `h1`; everything else cross-fades in 0.25s. Names are `vt-wd-<slug>` / `vt-post-<id>` and must be unique per page; `e2e/view-transitions.spec.ts` guards that. Unsupported browsers (Firefox) navigate normally.
- **Reduced motion:** the global `prefers-reduced-motion` rule in `global.css` zeroes all transitions/animations. New JS-driven motion must check the media query itself.

## Tells removed from the homepage (2026-10-25)

The UI audit (see `UI_AUDIT_PLAN.md`, branch 1) found the homepage still using patterns from the list below:
- **Removed** the `// eyebrow` labels above every homepage `h2`. Subpages (`/services`, `/consulting`, `/blog`, `/webdesign`) still have theirs; that cleanup is a separate change.
- **Removed** tracked ALL-CAPS text from `.hero-btn` (sitewide, so every primary/ghost button), the mobile nav CTA, the `more` dropdown label, Skills category labels, GitHub stat labels, contact form labels and the Music photo caption.
- **Moved off monospace**, keeping it for real facts only (dates, numbers, percentages, the heatmap months): nav links, the nav and footer CTAs, the side section nav, Experience company and `Visit` links, hobby details, Music labels, roles, press attribution and collaborator chips. The footer name is now in Cormorant Garamond instead of a glowing mono `// douglas rosenberg`.
- **Footer copyright:** dropped the middle dot. It now reads `© <year>. Built with Astro.`
- **Emoji:** removed the 🛠️ and 🎨 from `aboutme.json`'s `detailOrQuote`.
- Labels that moved from dimmed teal to dimmed text color now sit at 0.7 opacity so they still clear AA in light mode. They were also taken out of the light-mode teal override.

## Selected work strip (2026-10-25)

`SelectedWork.astro` sits right after the hero (UI audit branch 2): one large project and two stacked beside it, so it never reads as three identical cards. Sharp corners and a thin text-color border on the screenshots, because they are content, not controls. No teal (the homepage's one accent moment stays the status panel) and no shadow. Hover zooms the screenshot 3% and underlines the name; reduced motion drops the zoom. Its section background is plain `--bg`, not `--bg-hero`, so it doesn't run into the hero and About as one band. Picks and their strip images live in `siteproperties.json`'s `featuredWork`.

## Score direction (2026-10-29, branch `score-direction-2026-10-29`)

From a harsh live audit that judged the site competent but generic (navy + teal, stock component kits) with its one ownable idea, the saxophone, buried. Built on the "reads like a score" idea:
- **Divider:** a five-line brass staff was tried in place of the waveform and reverted the same day: Doug prefers the waveform, so `SectionDivider` is unchanged.
- **Experience:** the list is a ruled ledger of years (mono, real dates from `experience.json`), company (Cormorant) and title, with thin brass rules. The decorative `01`-`04` numbers are gone. The tab markup and keyboard pattern are unchanged.
- **Split heading:** "When I'm Not Coding" puts its title in a narrow sticky left column. Selected Work was tried the same way and reverted at Doug's request (he prefers the original stacked layout); Experience, Skills and Contact were never changed this way.
- **Hobbies:** the four bordered cards became a ruled list. The casual section's Bauhaus pattern is sized from the section's height, so its `::before` has a `66rem` floor to keep it at the size it had beside the cards.
- **Selected Work picks (2026-10-30):** ArborKin, Customer Intake Backend, Guacamayo. Same layout; only `featuredWork` in `siteproperties.json` changed. See `PORT_TODO.md` for the screenshot and confidentiality rules.
- **Kept as before, at Doug's request (2026-10-29):** the nav icons (top nav and the section rail), the Skills logo chips, the Selected Work layout and the album cover's colors. Only `login` moved, from the main nav to the footer as "client login".
- **Music:** one serif-italic line under the hero CTA links to `#music`. A navy-and-brass re-tint of the album cover was tried and reverted the same day: Doug found the yellow arbitrary, so the cover keeps its original purple.

## Job-focused homepage (2026-10-29, same branch)

Doug asked for the site to serve the next full-time developer job (see `career-development/docs/FOCUS_PLAN.md`) and to downplay music. Chosen defaults: an implicit signal only (no "open to roles", no salary, since career strategy stays local and the day-job employer can see public pages), freelance pages kept live but moved under "more", music shrunk.
- **Hero:** subtitle describes architecture work (pipelines, integrations, reporting, CI/CD); the single button reads "get in touch"; a plain "Download resume" text link sits beside it (an inline link, not a second button).
- **Nav:** work, experience and blog lead. Web design, services and consulting are a "freelance" group in the `more` dropdown. The nav icons stay.
- **About:** the freelance sentence and the duplicated "currently leading" paragraph are gone. A ruled evidence ledger (500+ staff on 50 reports, 10 apps through 2 pipelines, 50+ tables, 4 applications) sits beside the bio; every figure comes from `experience.json`.
- **Contact:** copy no longer mentions websites; resume, LinkedIn and GitHub links fill the pitch column.
- **Music:** a compact band (small cover, one paragraph, the Tribune quote, a link to dougrosenberg.com) at about 4% of page height. The discography and collaborator chips left the homepage; `music.json` still holds them.
- **Fixes from the audit:** the scrolled header was raised from 62% to 94% opaque because text showed through, then eased to 80% opacity with a 10px blur on 2026-10-30 at Doug's request (he likes the glass look); shapes and images under it show as soft color, text does not read, checked in real Chrome in both themes (a 48px blur made it look like a flat bar, since thin light text vanishes when blurred on the dark theme); the section rail is 15px wide at the right edge with labels on hover only, so it no longer overlaps text from 1280px up; the homepage has no em or en dashes outside Experience; the featured project captions lost theirs.
- **Measured:** a scripted 13-check rubric (nav opacity, rail overlap, largest empty block per section, repeated copy, CTA labels, dashes, mobile overflow, axe, plus the job-focus checks) scored the parent commit 31.3 and this branch 99.4. It measures structure and accessibility, not beauty.
- **Not changed, needs a decision:** page `<title>` and meta ("Web & ERP Development"), the "dr codeworks" wordmark, the footer tagline, `llms.txt`, and the audience paragraph in this repo's `CLAUDE.md`, which still says SMB and musician clients first.

## Explicitly avoided (AI-site tells, per calibration)

Warm cream + terracotta; near-black + acid accent; broadsheet zero-radius dense columns; uniform rounded-card-kit with identical soft grey shadow; tracked-out ALL-CAPS eyebrow labels; middle-dot meta strings; em-dash "WORD — fragment" labels; arrow (`→`) appended to buttons/links.
