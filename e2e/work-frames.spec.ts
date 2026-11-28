import { test, expect } from '@playwright/test';

// Pointer devices: crossfade cards load only their first screenshot with the page; the rest
// arrive when the card is near the viewport, and the crossfade waits for them (.is-loaded).
// Touch devices: no crossfade, so the rest are never fetched.
test('work card screenshots: the rest load on approach with a pointer, never on touch', async ({ page }) => {
  await page.goto('/');
  const touch = await page.evaluate(() => matchMedia('(hover: none)').matches);
  const stage = page.locator('.work-grid .wd-project__frame-stage').last();
  const rest = stage.locator('img[data-src]');
  expect(await rest.count()).toBeGreaterThan(0);
  await expect(rest.first()).not.toHaveAttribute('src', /.+/);
  await expect(stage).not.toHaveClass(/is-loaded/);

  await stage.scrollIntoViewIfNeeded();
  if (touch) {
    await page.waitForTimeout(1000);
    await expect(rest.first()).not.toHaveAttribute('src', /.+/);
    // Not computed play-state: under reduced motion `animation: none` reports "running".
    const running = await stage.evaluate(
      (el) => el.getAnimations({ subtree: true }).filter((a) => a.playState === 'running').length,
    );
    expect(running).toBe(0);
    return;
  }
  await expect(stage).toHaveClass(/is-loaded/);
  for (const img of await rest.all()) {
    await expect(img).toHaveAttribute('src', /\.(webp|jpg|png)$/);
  }
});

for (const path of ['/', '/webdesign/']) {
  test(`project cards on ${path} offer a phone-sized first screenshot`, async ({ page, request }) => {
    await page.goto(path);
    const firsts = page.locator('.wd-project__frame-stage img:first-of-type');
    expect(await firsts.count()).toBeGreaterThan(0);
    for (const img of await firsts.all()) {
      const srcset = await img.getAttribute('srcset');
      expect(srcset).toBeTruthy();
      const small = srcset!.split(',')[0].trim().split(' ')[0];
      expect((await request.get(small)).ok()).toBeTruthy();
    }
  });
}
