import { test, expect } from '@playwright/test';

// PageSpeed Insights flagged "Document does not have a main landmark" (2026-11-25).
const paths = [
  '/',
  '/services/',
  '/consulting/',
  '/chicago-web-design/',
  '/musician-websites/',
  '/reading/',
  '/blog/',
  '/blog/archive/',
  '/webdesign/',
  '/webdesign/arborkin/',
  '/404.html',
];

for (const path of paths) {
  test(`${path} has one main landmark, with header and footer outside it`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('main')).toHaveCount(1);
    await expect(page.locator('main h1')).toHaveCount(1);
    await expect(page.locator('main .navbar, main .site-footer')).toHaveCount(0);
  });
}
