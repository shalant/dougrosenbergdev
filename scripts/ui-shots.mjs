// Per-section screenshots of a page, for before/after design reviews (see UI_AUDIT_PLAN.md).
//
//   npm run build && npx http-server dist -p 4322 -s
//   node scripts/ui-shots.mjs --out shots/before [--path /] [--base http://localhost:4322]
//
// Writes <theme>-<desktop|mobile>-<section id>.png for dark and light at 1440x900 and 390x844.
// Two things made naive element screenshots misleading, so both are handled here: the fixed
// header and side nav get painted over whatever section is being captured (hidden first), and
// .reveal-on-scroll sections and staggered entrances below the fold haven't played yet (the
// whole page is walked first, then every finite animation is awaited).
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, arg, i, all) => (arg.startsWith('--') ? [...pairs, [arg.slice(2), all[i + 1]]] : pairs), []),
);
const out = args.out ?? 'shots';
const url = (args.base ?? 'http://localhost:4322') + (args.path ?? '/');
mkdirSync(out, { recursive: true });

const viewports = [
  { name: 'desktop', viewport: { width: 1440, height: 900 } },
  { name: 'mobile', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
];

const browser = await chromium.launch();
for (const theme of ['dark', 'light']) {
  for (const { name, ...options } of viewports) {
    const context = await browser.newContext(options);
    await context.addInitScript((t) => {
      localStorage.setItem('dr-theme', t);
      localStorage.setItem('dr-consent', 'denied');
    }, theme);
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });

    const height = await page.evaluate(() => document.body.scrollHeight);
    for (let y = 0; y < height; y += 300) {
      await page.evaluate((top) => window.scrollTo(0, top), y);
      await page.waitForTimeout(80);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    // Scroll-driven animations (the hero parallax) never "finish", and a paused one never would
    // either, so only running, time-based, finite ones are awaited, with a cap as a backstop.
    await page.evaluate(() =>
      Promise.race([
        Promise.all(
          document.getAnimations()
            .filter((a) => a.timeline === document.timeline && a.playState === 'running'
              && a.effect?.getComputedTiming().iterations !== Infinity)
            .map((a) => a.finished.catch(() => {})),
        ),
        new Promise((resolve) => setTimeout(resolve, 5000)),
      ]),
    );
    await page.locator('#navbar').screenshot({ path: `${out}/${theme}-${name}-header.png`, animations: 'disabled' });
    await page.addStyleTag({ content: '#navbar, .vertical-section-nav, .consent-banner { visibility: hidden !important; }' });

    const sections = await page.$$eval('body section[id], body footer', (els) =>
      els.map((el, i) => el.id || `${el.tagName.toLowerCase()}-${i}`),
    );
    for (const id of sections) {
      const locator = id.startsWith('footer') ? page.locator('footer').first() : page.locator(`section#${id}`);
      await locator.scrollIntoViewIfNeeded();
      await page.waitForTimeout(150);
      await locator.screenshot({ path: `${out}/${theme}-${name}-${id}.png`, animations: 'disabled' });
    }
    console.log(`${theme}/${name}: ${sections.join(', ')}`);
    await context.close();
  }
}
await browser.close();
