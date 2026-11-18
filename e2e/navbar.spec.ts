import { test, expect, type Page } from '@playwright/test';

// Guards the shape of the header, not its pixels. A screenshot comparison would need baselines
// made on the same fonts and renderer as CI (Linux), which cannot be made on a developer's
// machine, so these are geometry assertions that hold on any platform: one row, links centered,
// nothing overflowing or colliding, at the widths and in every theme where the layout has
// broken before (the 820-960px dead zone, a CTA clipped off the edge, uneven gaps).
// Chromium only: it is about layout, not about browser engines.

const THEMES = ['dark', 'light', 'steel'] as const;
const DESKTOP_WIDTHS = [1440, 1280, 1100, 1000, 961];
const MOBILE_WIDTHS = [960, 830, 600, 390];

type Box = { x: number; y: number; width: number; height: number };

async function box(page: Page, selector: string): Promise<Box> {
  const b = await page.locator(selector).first().boundingBox();
  expect(b, `${selector} should be visible`).not.toBeNull();
  return b as Box;
}

const centerY = (b: Box) => b.y + b.height / 2;

async function open(page: Page, width: number, theme: string) {
  await page.setViewportSize({ width, height: 800 });
  await page.goto(`/?theme=${theme}`);
  await page.locator('.navbar-content').waitFor();
}

test.describe('navbar layout', () => {
  test.beforeEach(({ browserName }) => {
    test.skip(browserName !== 'chromium', 'layout geometry only needs one engine');
  });

  for (const width of DESKTOP_WIDTHS) {
    test(`${width}px: one row, links centered, nothing overflowing or colliding, in every theme`, async ({ page }) => {
      for (const theme of THEMES) {
        const where = `${width}px ${theme}`;
        await open(page, width, theme);

        const logo = await box(page, '.logo-section');
        const links = await box(page, '.nav-items');
        const cta = await box(page, '.nav-cta');
        const toggle = await box(page, '.theme-toggle');

        // One row: every part's vertical center sits on the logo's, so nothing wrapped or dropped.
        for (const [name, b] of [['links', links], ['cta', cta], ['toggle', toggle]] as const) {
          expect(Math.abs(centerY(b) - centerY(logo)), `${where}: ${name} is off the row`).toBeLessThan(2);
        }

        // The hamburger belongs to the narrow layout only.
        await expect(page.locator('.nav-toggle'), `${where}: hamburger`).toBeHidden();

        // The links are centered in the space between the logo and the actions.
        const actionsLeft = cta.x;
        const middle = (logo.x + logo.width + actionsLeft) / 2;
        expect(Math.abs(links.x + links.width / 2 - middle), `${where}: links are not centered`).toBeLessThan(3);

        // Nothing collides, with room to breathe.
        expect(links.x - (logo.x + logo.width), `${where}: logo and links too close`).toBeGreaterThanOrEqual(16);
        expect(cta.x - (links.x + links.width), `${where}: links and CTA too close`).toBeGreaterThanOrEqual(16);

        // Nothing is clipped off the right edge, and the page does not scroll sideways.
        expect(toggle.x + toggle.width, `${where}: toggle past the edge`).toBeLessThanOrEqual(width);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${where}: horizontal scroll`).toBe(true);

        // Text only, and the four links share one size and weight.
        await expect(page.locator('.navbar-wrapper .nav-icon'), `${where}: icons are gone`).toHaveCount(0);
        const looks = await page.evaluate(() =>
          [...document.querySelectorAll('.nav-items > li > .nav-link:not(.nav-link--cta)')].map((a) => {
            const c = getComputedStyle(a);
            return `${c.fontSize}/${c.fontWeight}/${c.paddingLeft}`;
          }),
        );
        expect(new Set(looks).size, `${where}: links differ in size, weight or padding: ${looks.join(' ')}`).toBe(1);
      }
    });
  }

  for (const width of MOBILE_WIDTHS) {
    test(`${width}px: collapsed into the hamburger, controls pinned right, sheet opens`, async ({ page }) => {
      for (const theme of THEMES) {
        const where = `${width}px ${theme}`;
        await open(page, width, theme);

        const logo = await box(page, '.logo-section');
        const toggle = await box(page, '.theme-toggle');
        const burger = await box(page, '.nav-toggle');

        await expect(page.locator('.nav-cta'), `${where}: desktop CTA`).toBeHidden();
        await expect(page.locator('.nav-items'), `${where}: sheet starts closed`).toBeHidden();

        // Logo, ball and hamburger share a row; the controls hug the right edge.
        expect(Math.abs(centerY(toggle) - centerY(logo)), `${where}: ball off the row`).toBeLessThan(2);
        expect(Math.abs(centerY(burger) - centerY(logo)), `${where}: hamburger off the row`).toBeLessThan(2);
        expect(toggle.x + toggle.width, `${where}: ball overlaps the hamburger`).toBeLessThanOrEqual(burger.x + 1);
        expect(width - (burger.x + burger.width), `${where}: hamburger not at the edge`).toBeLessThan(24);
        expect(logo.x + logo.width, `${where}: logo runs into the ball`).toBeLessThan(toggle.x);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${where}: horizontal scroll`).toBe(true);

        // The sheet opens with the three links and a CTA, and closes again.
        await page.locator('#navToggle').click();
        await expect(page.locator('.nav-items'), `${where}: sheet opens`).toBeVisible();
        await expect(page.locator('.nav-items > li > .nav-link:not(.nav-link--cta):visible')).toHaveCount(3);
        await expect(page.locator('.nav-link--cta')).toBeVisible();
        await page.locator('#navToggle').click();
        await expect(page.locator('.nav-items'), `${where}: sheet closes`).toBeHidden();
      }
    });
  }

  test('hovering a link draws its hairline; the current section keeps it', async ({ page }) => {
    await open(page, 1280, 'dark');
    const link = page.locator('.nav-link[href="/blog"]');
    const widthOf = () => link.evaluate((a) => parseFloat(getComputedStyle(a).backgroundSize));
    expect(await widthOf()).toBe(0);
    await link.hover();
    await expect.poll(widthOf).toBeGreaterThan(20);
  });
});
