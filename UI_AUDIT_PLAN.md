# Homepage UI Audit Plan

Started 2026-10-25. Goal: take the homepage (`/`) from the audit's **68/100** (roughly better than 75-80% of developers with ~4 years' experience) to **85+**, which is the bar for "better than 95%". The audit screenshots were taken at 1440px and 390px wide, in dark and light themes, from a production build of `master` at `3ceaf92`.

The work is split into five branches. Each one branches from a freshly pulled `master` after the previous branch has merged, because they touch the same section headers and CSS.

## How every branch runs

1. `git switch master && git pull`, then create the branch.
2. **Before:** build `master` and capture screenshots with `scripts/ui-shots.mjs` (added in branch 1). It covers the sections the branch touches at desktop and mobile widths, in dark and light themes.
3. Make the change.
4. **Verify:** `npm run build`, `npm run test:unit`, `npm run verify-csp`, `npm run test:e2e` (all five browsers), `node scripts/check-links.mjs`, and `npx lhci autorun`. Accessibility, best-practices and SEO must stay at 1.0.
5. **After:** capture the same screenshots and publish a private **before/after Artifact** that shows them side by side with a re-score. Doug reviews it, and nothing is committed until he approves. Revise and republish as often as needed.
6. On approval, commit and push the branch, then open a PR. The no-commit window (8:30am-5pm CT, Mon-Fri) still applies. **Merging to `master` is the deploy** (Cloudflare git integration), so merge only when Doug says to. Afterwards, confirm the merge commit appears under Deployments and check the live page.
7. Update this file's status line, plus `DESIGN_NOTES.md` and `PORT_TODO.md` where relevant, in the same branch.

## Kept on purpose (not part of this plan)

- **The `login` nav link stays at full nav visibility.** It was kept out of the `more` dropdown deliberately so Doug can demo the admin app in interviews (see `PORT_TODO.md`, 2026-09-21).
- **All entrance motion Doug restored on 2026-10-18 stays:** section fade/slide, `h2` `fadeInDown`, chip stagger and the scroll-arrow bounce (see `DESIGN_NOTES.md` principle 5).
- **No new colors or type families.** Every change reuses the navy, teal and brass tokens and the three existing font families.
- **No invented copy.** Anything client-facing that needs new wording is flagged for Doug to write or approve.

---

## Branch 1: `ui-audit-tells-cleanup`, remove the AI-site tells

**Status:** approved by Doug from the before/after artifact and committed on `ui-audit-tells-cleanup-2026-10-25` (2026-10-25). He liked the eyebrows as a look but agreed they read as an AI tell. Branch 3 may give section headings a device that is specific to this site in their place.
- **Verified:** build, `test:unit` (9/9), `verify-csp`, `test:e2e` (181 passed, 4 skipped), `check-links`, and Lighthouse (accessibility, best-practices and SEO assertions all passed).
- **Also fixed:** a Firefox flake in `e2e/contact.spec.ts` that predates this branch. It failed 3 of 10 runs on `master`. Now 75/75 across all five browsers.
- **Left as is:** the Music caption text is unchanged and still reads `Better Than TV — live`, because no new wording has been confirmed. Only its styling changed.

**Expected gain:** about +6.

The page currently uses patterns that `CLAUDE.md` and `DESIGN_NOTES.md` list as banned.

- **Remove the `// eyebrow` labels** (`.section-eyebrow`) from About, Experience, Skills, Casual, Music and Contact. Also check other pages that use the class.
- **Remove tracked ALL-CAPS text.** Change these to sentence or lower case with normal letter spacing: the Skills category labels (`LANGUAGES`...), the GitHub stat labels, `DOWNLOAD RÉSUMÉ`, `SEND MESSAGE`, the contact form labels, and the Music photo caption.
- **Use monospace only for facts.** Switch these to Montserrat: nav links, the footer `// douglas rosenberg`, hobby details, collaborator chips, `Visit <company>` links, and the `// discography` and `// performed with` labels. Keep monospace for dates, numbers, percentages and the heatmap month labels.
- **Footer:** remove the middle-dot string `© 2026 · built with Astro`. The footer is sitewide, so check every page.
- **Music caption:** `Better Than TV — live` is an em-dash label, and the image is the album cover, not a live shot. **Doug to confirm the wording.**
- **Emoji:** remove the 🛠️ and 🎨 still in `aboutme.json`'s `detailOrQuote` (shown in About's pull-quote).
- **Tooling:** add `scripts/ui-shots.mjs`. It captures per-section screenshots with the fixed header hidden and waits long enough for entrance animations to finish. The audit's element screenshots came out wrong without both of those.
- **Docs:** record the removals in `DESIGN_NOTES.md`.

## Branch 2: `ui-audit-selected-work`, show client work on the homepage

**Status:** not started. **Expected gain:** about +6.

The site targets small-business and musician clients, yet `/` reads like a résumé. This branch adds a selected-work strip directly after the hero.

- **New component** `SelectedWork.astro`, driven by `webdesign.json`. A `featuredOnHome` flag (or an ordered slug list in `siteproperties.json`) decides which projects show, so BackendTools can still write the data.
- **Layout:** one large project plus two stacked, not three identical cards. Corners are sharp because this is content, not a control. Each item shows the hero screenshot, name and industry.
- **Images:** the screenshots live in `public/images/webdesign/`. To get a responsive `srcset`, they'll be routed through `astro:assets` (copy or import from `src/assets`), following the hero portrait's pattern.
- **Transitions:** each project name gets the existing `vt-wd-<slug>` name so it morphs into the case-study title. `e2e/view-transitions.spec.ts` already enforces that names are unique on each page.
- **Navigation:** add the strip to `VerticalSectionNav` and to the "on this page" group of the header's `more` menu.
- **Tests:** an e2e test that each item links to its case study.
- **Doug to pick the three projects.** Proposed: Hardware Etc (a small business with a before/after story), Guacamayo (musician) and Sonus Construction (small business).

## Branch 3: `ui-audit-section-rhythm`, vary the sections and tame the background

**Status:** not started. **Expected gain:** about +5.

- **Spacing:** close the gap of about 80px between each `h2` and its brass waveform.
- **Background motif:** keep the Bauhaus layer strong in the hero and the Music section, and remove it or turn it way down elsewhere. Fix the hard seams in Casual (a vertical edge at about x=630) and behind Contact.
- **Break the repeated layout twice:**
  - **Music** becomes a full-bleed spread with the sax photo as a large panel. Also fix the photo's black letterbox bars and align the discography columns on one grid.
  - **Contact** becomes left-aligned and two columns, with the pitch on the left and the form on the right. That replaces the centered heading and the card-inside-a-section.
- **Casual:** line its content up with the shared left edge (it starts at x=334 while the other sections start at x=194), and change the hobby cards from an uneven 1/2/1 wrap to a regular 2×2 grid.
- **Motion:** the restored entrance animations stay as they are.

## Branch 4: `ui-audit-hero-contrast`, client-facing hero and readable body text

**Status:** not started. **Expected gain:** about +3.

- **Hero subtitle:** replace the ERP/data-masking résumé sentence with a line aimed at clients. **Doug writes or approves the copy.** Claude can draft options, but nothing goes on the page unapproved. Also raise its opacity from 0.55.
- **About pull-quote:** stop repeating the hero sentence word for word.
- **Mobile hero:** left-align it instead of centering, and tighten the subtitle so part of the portrait shows in the first 844px of height.
- **Contrast pass:**
  - Experience bullets: currently 0.865rem, weight 300, 55% opacity.
  - Inactive Experience tab logos: Tackle and Shift are nearly invisible.
  - The faint `01` ghost numeral.
  - Contact input borders.

  Check every change against WCAG AA and keep the Lighthouse accessibility score at 1.0.

## Branch 5: `ui-audit-skills-section`, Skills and GitHub stats

**Status:** closed with no code change (2026-10-25). Doug tried monochrome logos in a before/after and preferred the brand colors on every chip, so the Skills chips stay as they were, including the Syncfusion and DevExpress plates. He also chose to keep all six GitHub tiles and the full-year heatmap. The estimate below was not earned.

**Expected gain:** about +2.

- **Logo chips:** render vendor logos in one color so purple, orange and red don't leak into the palette, and stop Syncfusion and DevExpress from rendering as white chips.
- **Chip layout:** reduce the uniform chip wall. A good option is plain text lists per category, keeping icons only where they help.
- **GitHub stats:** **Doug decides** whether to drop `current streak` and `years active`, and whether the heatmap should keep showing the quiet Feb-May stretch or switch to a shorter window. The data is real, so this is a framing choice, not a correction.

---

## Score log

| Date | Branch | Score | Notes |
|---|---|---|---|
| 2026-10-25 | audit (`3ceaf92`) | 68 | Baseline |
| 2026-10-25 | 1, tells cleanup | 73 (est.) | Eyebrows, caps, decorative mono, middle dot and emoji removed |
