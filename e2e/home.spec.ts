import { test, expect } from '@playwright/test';

test.describe('homepage', () => {
  test('renders the hero with no leftover AI-site chrome', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1.hero-name')).toHaveText(/douglas rosenberg/i);
    // The eyebrow + two-button CTA pattern was deliberately removed - guard against it coming back.
    await expect(page.locator('.hero-eyebrow')).toHaveCount(0);
    await expect(page.locator('.hero-cta')).toHaveCount(0);
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
