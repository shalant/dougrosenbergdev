import { test, expect } from '@playwright/test';

test.describe('/blog', () => {
  test('search filters posts and hides featured while active', async ({ page }) => {
    await page.goto('/blog');
    const allCards = page.locator('.blog-post-card');
    const totalCount = await allCards.count();
    expect(totalCount).toBeGreaterThan(0);

    await page.locator('#blogSearchInput').fill('family tree');
    await expect(page.locator('.blog-post-card:visible')).toHaveCount(1);
    await expect(page.locator('#featuredPostsSection')).toBeHidden();
  });

  test('tag filter narrows results', async ({ page }) => {
    await page.goto('/blog');
    await page.locator('.blog-tag[data-tag="GEO"]').click();
    const visibleCards = page.locator('.blog-post-card:visible');
    const count = await visibleCards.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      expect(await visibleCards.nth(i).getAttribute('data-tags')).toContain('GEO');
    }
  });

  test('post detail renders TOC with working anchor links', async ({ page }) => {
    await page.goto('/blog/building-family-tree-blazor');
    const firstTocLink = page.locator('.toc-link').first();
    const href = await firstTocLink.getAttribute('href');
    await firstTocLink.click();
    expect(page.url()).toContain(href);
    await expect(page.locator(href!)).toBeVisible();
  });
});

test.describe('/blog/archive', () => {
  test('groups posts by year and month', async ({ page }) => {
    await page.goto('/blog/archive');
    await expect(page.locator('.archive-year__title').first()).toHaveText(/\d{4}/);
    await expect(page.locator('.archive-post')).not.toHaveCount(0);
  });
});
