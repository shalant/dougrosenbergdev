import { test, expect } from '@playwright/test';

test.describe('homepage', () => {
  test('renders the hero with no leftover AI-site chrome', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1.hero-name')).toHaveText(/douglas rosenberg/i);
    // The eyebrow + two-button CTA pattern was deliberately removed - guard against it coming back.
    await expect(page.locator('.hero-eyebrow')).toHaveCount(0);
    await expect(page.locator('.hero-cta')).toHaveCount(0);
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

  test('theme toggle switches light/dark and persists the attribute', async ({ page }) => {
    await page.goto('/');
    const html = page.locator('html');
    await expect(html).not.toHaveAttribute('data-theme', 'light');
    await page.locator('.theme-toggle').click();
    await expect(html).toHaveAttribute('data-theme', 'light');
    await page.locator('.theme-toggle').click();
    await expect(html).toHaveAttribute('data-theme', 'dark');
  });

  test('experience tabs switch the detail panel', async ({ page }) => {
    await page.goto('/#experience');
    const items = page.locator('.experience-list__item');
    await expect(items).toHaveCount(4);
    const secondTitle = await items.nth(1).locator('.experience-list__title').textContent();
    await items.nth(1).click();
    await expect(page.locator('.experience-detail:not([hidden]) .experience-detail__title')).toHaveText(secondTitle ?? '');
  });
});
