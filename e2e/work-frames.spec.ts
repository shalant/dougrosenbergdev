import { test, expect } from '@playwright/test';

// Crossfade cards load only their first screenshot with the page; the rest arrive when the
// card is near the viewport, and the crossfade waits for them (.is-loaded).
test('work card screenshots after the first load on approach, not with the page', async ({ page }) => {
  await page.goto('/');
  const stage = page.locator('.work-grid .wd-project__frame-stage').last();
  const rest = stage.locator('img[data-src]');
  expect(await rest.count()).toBeGreaterThan(0);
  await expect(rest.first()).not.toHaveAttribute('src', /.+/);
  await expect(stage).not.toHaveClass(/is-loaded/);

  await stage.scrollIntoViewIfNeeded();
  await expect(stage).toHaveClass(/is-loaded/);
  for (const img of await rest.all()) {
    await expect(img).toHaveAttribute('src', /\.(webp|jpg|png)$/);
  }
});
