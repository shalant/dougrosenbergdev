import { test, expect } from '@playwright/test';

test.describe('homepage', () => {
  test('renders the hero with no leftover AI-site chrome', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1.hero-name')).toHaveText(/douglas rosenberg/i);
    // The eyebrow + two-button CTA pattern was deliberately removed - guard against it coming back.
    await expect(page.locator('.hero-eyebrow')).toHaveCount(0);
    await expect(page.locator('.hero-cta')).toHaveCount(0);
  });

  test('each selected-work item links to its case study', async ({ page }) => {
    await page.goto('/');
    const items = page.locator('#work a.work-item__link');
    await expect(items).toHaveCount(4);
    const links = await items.evaluateAll((els) =>
      els.map((el) => ({ href: el.getAttribute('href'), name: el.querySelector('h3')?.textContent?.trim() })),
    );
    for (const { href, name } of links) {
      expect(href).toMatch(/^\/webdesign\/[a-z0-9-]+$/);
      const response = await page.goto(href!);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(name!);
    }
  });

  test('the letter-by-letter name reads as one name and keeps its casing', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveAccessibleName(/^douglas rosenberg$/i);
    // Each letter is an inline-block, so text-transform: capitalize would
    // capitalize every one of them; the casing is done at build time instead.
    await expect(page.locator('.hero-name__letters')).toHaveText('Douglas Rosenberg');
  });

  test('emits the sitewide ProfessionalService node tied to the Person', async ({ page }) => {
    await page.goto('/');
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const business = blocks.map((b) => JSON.parse(b)).find((n) => n['@type'] === 'ProfessionalService');
    expect(business?.['@id']).toBe('https://dougrosenbergdev.com/#business');
    expect(business?.areaServed?.name).toBe('Chicago');
    expect(business?.provider?.['@id']).toBe('https://dougrosenbergdev.com/#person');
  });

  test('sends no GA4 hits from a non-production host', async ({ page }) => {
    // CI runs this suite on GitHub's Azure runners against localhost; before this guard,
    // every test was a "new user" in GA4 and the mocked contact submits were key events.
    const hits: string[] = [];
    page.on('request', (req) => {
      if (/google-analytics\.com\/(g\/)?collect/.test(req.url())) hits.push(req.url());
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    expect(await page.evaluate(() => (window as any).dataLayer.some((e: any) => e[0] === 'config'))).toBe(false);
    expect(hits).toEqual([]);
  });

  test('nav links to the client-work pages', async ({ page }) => {
    await page.goto('/');
    // CSS selectors + toBeAttached (plain DOM presence), not getByRole/toBeVisible - below
    // the 820px hamburger breakpoint the nav is display:none until the menu opens (removed
    // from the accessibility tree, so getByRole('link') wouldn't even match it), which is
    // correct responsive behavior, not a bug this test should be sensitive to.
    await expect(page.locator('a.nav-link[href="/webdesign"]')).toBeAttached();
    await expect(page.locator('a.nav-link[href="/services"]')).toBeAttached();
    await expect(page.locator('a.nav-link[href="/consulting"]')).toBeAttached();
  });

  test('a first visit gets dark from a dark OS and steel otherwise, without saving it', async ({ page }) => {
    const html = page.locator('html');
    await page.emulateMedia({ colorScheme: 'light' }); // also what browsers report with no OS signal
    await page.goto('/');
    await expect(html).toHaveAttribute('data-theme', 'steel');
    expect(await page.evaluate(() => localStorage.getItem('dr-theme'))).toBeNull();
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.reload();
    await expect(html).toHaveAttribute('data-theme', 'dark');
  });

  test('a saved choice beats the OS theme', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/?theme=light');
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });

  test('theme toggle cycles dark, light, steel, dark and names the next theme', async ({ page }) => {
    test.setTimeout(90_000); // three view transitions; WebKit here took 24-29s against the 30s default under load
    await page.goto('/');
    const html = page.locator('html');
    const toggle = page.locator('.theme-toggle');
    await expect(html).not.toHaveAttribute('data-theme', 'light');
    await expect(toggle).toHaveAttribute('aria-label', /dark now, light next/);
    await toggle.click();
    await expect(html).toHaveAttribute('data-theme', 'light');
    await expect(toggle).toHaveAttribute('aria-label', /light now, steel and orange next/);
    await toggle.click();
    await expect(html).toHaveAttribute('data-theme', 'steel');
    await expect(toggle).toHaveAttribute('aria-label', /steel and orange now, dark next/);
    await toggle.click();
    await expect(html).toHaveAttribute('data-theme', 'dark');
  });

  test('touch taps on the toggle cycle through all three themes, so a phone can always reach steel', async ({ browser, browserName }) => {
    test.skip(browserName === 'firefox', 'Firefox has no touch emulation in Playwright');
    test.setTimeout(90_000); // a fresh WebKit context is slow here: this took 18-30s against the 30s default
    const context = await browser.newContext({ hasTouch: true, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.goto('/?theme=dark');
    const html = page.locator('html');
    const toggle = page.locator('.theme-toggle');
    await toggle.tap();
    await expect(html).toHaveAttribute('data-theme', 'light');
    await toggle.tap();
    await expect(html).toHaveAttribute('data-theme', 'steel');
    await toggle.tap();
    await expect(html).toHaveAttribute('data-theme', 'dark');
    await context.close();
  });

  test('dragging the toggle ball into a pocket picks that theme and is not also counted as a tap', async ({ page }) => {
    await page.goto('/?theme=dark');
    const html = page.locator('html');
    const box = (await page.locator('.theme-toggle__track').boundingBox())!;
    const y = box.y + box.height / 2;
    await page.mouse.move(box.x + 12, y);
    await page.mouse.down();
    await page.mouse.move(box.x + 48, y, { steps: 6 });
    await page.mouse.up();
    await expect(html).toHaveAttribute('data-theme', 'steel');
    // The click that follows a drag must not tap on to the next theme (dark).
    await page.waitForTimeout(400);
    await expect(html).toHaveAttribute('data-theme', 'steel');
    expect(await page.evaluate(() => localStorage.getItem('dr-theme'))).toBe('steel');
  });

  test('?theme=steel opens the steel theme directly, remembers it, and the toggle cycles on to dark', async ({ page }) => {
    await page.goto('/?theme=steel');
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'steel');
    expect(await page.evaluate(() => localStorage.getItem('dr-theme'))).toBe('steel');
    await page.goto('/');
    await expect(html).toHaveAttribute('data-theme', 'steel');
    await page.locator('.theme-toggle').click();
    await expect(html).toHaveAttribute('data-theme', 'dark');
    await page.goto('/?theme=bogus');
    await expect(html).toHaveAttribute('data-theme', 'dark');
  });

  test('steel extras (dial, progress ring, etched titles) exist only under steel and tear down', async ({ page }) => {
    await page.goto('/?theme=steel');
    await expect(page.locator('.steel-dial')).toHaveCount(1);
    await expect(page.locator('.steel-progress')).toHaveCount(1);
    // Titles are only etched in with motion (the WebKit projects run with reduced motion; see playwright.config.ts).
    const motion = await page.evaluate(() => !matchMedia('(prefers-reduced-motion: reduce)').matches);
    if (motion) await expect(page.locator('.steel-etch').first()).toBeAttached();
    // Scrolling moves the needle's input and the ring's readout off zero.
    await page.evaluate(() => window.scrollTo(0, 1500));
    await expect(page.locator('.steel-progress__label')).not.toHaveText('0');
    await page.locator('.theme-toggle').click();
    await expect(page.locator('.steel-dial')).toHaveCount(0);
    await expect(page.locator('.steel-progress')).toHaveCount(0);
    await expect(page.locator('.steel-etch')).toHaveCount(0);
    await page.goto('/?theme=dark');
    await expect(page.locator('.steel-dial')).toHaveCount(0);
  });

  test('a rapid triple toggle mid-reveal lands back on dark', async ({ page }) => {
    // Each click starts a view transition while the previous is still animating, which
    // skips it; every theme update must still apply, so three clicks complete the cycle.
    await page.goto('/');
    await page.locator('.theme-toggle').click();
    await page.locator('.theme-toggle').click();
    await page.locator('.theme-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('html')).not.toHaveClass(/theme-switching/);
    expect(await page.evaluate(() => localStorage.getItem('dr-theme'))).toBe('dark');
  });

  test('the theme still applies when the view transition never runs its callback', async ({ page }) => {
    // Regression for the 2026-11 CI failures on the ubuntu-26.04 WebKit build: data-theme was
    // only set inside the startViewTransition callback, so a transition that never reached
    // its callback left the toggle doing nothing. Simulated here by stubbing the API with a
    // transition that never calls back (and never finishes). The WebKit projects run with reduced
    // motion, where theme.js skips view transitions entirely and this would pass without testing
    // anything, so motion is turned back on here.
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.addInitScript(() => {
      document.startViewTransition = (() => ({
        finished: new Promise(() => {}),
        ready: new Promise(() => {}),
        updateCallbackDone: new Promise(() => {}),
        skipTransition() {},
      })) as unknown as typeof document.startViewTransition;
    });
    await page.goto('/');
    await page.locator('.theme-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    expect(await page.evaluate(() => localStorage.getItem('dr-theme'))).toBe('light');
  });

  test('experience tabs switch the detail panel', async ({ page }) => {
    await page.goto('/#experience');
    const items = page.locator('.experience-list__item');
    await expect(items).toHaveCount(4);
    const secondTitle = await items.nth(1).locator('.experience-list__title').textContent();
    await items.nth(1).click();
    await expect(page.locator('.experience-detail:not([hidden]) .experience-detail__title')).toHaveText(secondTitle ?? '');
  });

  test('experience tabs follow the arrow-key tabs pattern', async ({ page, isMobile }) => {
    test.skip(isMobile, 'keyboard navigation');
    await page.goto('/#experience');
    const items = page.locator('.experience-list__item');
    await items.first().focus();
    await page.keyboard.press('ArrowDown');
    await expect(items.nth(1)).toBeFocused();
    await expect(items.nth(1)).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#exp-panel-1')).toBeVisible();
    await page.keyboard.press('End');
    await expect(items.nth(3)).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('ArrowDown');
    await expect(items.first()).toHaveAttribute('aria-selected', 'true');
  });

  test('experience bullets collapse behind "Read more" on mobile only', async ({ page, isMobile }) => {
    await page.goto('/#experience');
    const panel = page.locator('.experience-detail:not([hidden])');
    const more = panel.locator('.experience-detail__more');
    const second = panel.locator('.experience-detail__bullets li').nth(1);
    if (!isMobile) {
      await expect(more).toBeHidden();
      await expect(second).toBeVisible();
      return;
    }
    await expect(second).toBeHidden();
    await more.click();
    await expect(more).toHaveText('Show less');
    await expect(more).toHaveAttribute('aria-expanded', 'true');
    await expect(second).toBeVisible();
    await more.click();
    await expect(second).toBeHidden();
  });
});

test.describe('github stats count-up', () => {
  test('lands on the real values, which screen readers get throughout', async ({ page }) => {
    await page.goto('/');
    const values = page.locator('.skills-stat__value');
    test.skip((await values.count()) === 0, 'GitHub stats unavailable at build time');
    const finals = await page.locator('.skills-stat .sr-only').allTextContents();
    await page.locator('.skills-stats__row').scrollIntoViewIfNeeded();
    await expect(values).toHaveText(finals);
  });

  test('skips the animation with reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const values = page.locator('.skills-stat__value');
    test.skip((await values.count()) === 0, 'GitHub stats unavailable at build time');
    const finals = await page.locator('.skills-stat .sr-only').allTextContents();
    await page.locator('.skills-stats__row').scrollIntoViewIfNeeded();
    // 300ms into a 900ms count, an animated value would still be mid-way.
    await page.waitForTimeout(300);
    expect(await values.allTextContents()).toEqual(finals);
  });
});
