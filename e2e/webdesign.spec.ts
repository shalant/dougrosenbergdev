import { test, expect } from '@playwright/test';

test.describe('/webdesign', () => {
  test('ring hero renders orbit cards', async ({ page }) => {
    await page.goto('/webdesign');
    const cards = page.locator('.wd2-hero__card-orbit');
    await expect(cards).toHaveCount(12);
  });

  test('project grid links to case studies', async ({ page }) => {
    await page.goto('/webdesign');
    await page.getByRole('link', { name: /guacamayo/i }).first().click();
    await expect(page).toHaveURL(/\/webdesign\/guacamayo-band/);
    await expect(page.locator('h1')).toHaveText('Guacamayo');
  });

  test('contact dialog opens and closes', async ({ page }) => {
    await page.goto('/webdesign');
    await page.locator('#openContactDialog').click();
    const dialog = page.locator('#contactDialog');
    await expect(dialog).toBeVisible();
    await page.locator('#closeContactDialog').click();
    await expect(dialog).toBeHidden();
  });
});

test.describe('/webdesign/[slug]', () => {
  test('case study CTAs have no arrow-suffix chrome', async ({ page }) => {
    await page.goto('/webdesign/arborkin');
    const ctaText = await page.locator('.wd-case__cta').textContent();
    expect(ctaText).not.toMatch(/[↗→↓]/);
  });
});
