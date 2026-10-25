import { test, expect, type Page } from '@playwright/test';

// Cross-document view transitions (global.css "CROSS-DOCUMENT VIEW
// TRANSITIONS") are skipped entirely, with only a console error, if two
// rendered elements share a view-transition-name. Guard the uniqueness on
// the list pages and that each detail page carries its card's name.
async function renderedNames(page: Page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>('body *'))
      .filter((el) => el.checkVisibility())
      .map((el) => getComputedStyle(el).viewTransitionName)
      .filter((name) => name && name !== 'none'),
  );
}

for (const { list, prefix, card } of [
  { list: '/webdesign/', prefix: 'vt-wd-', card: 'a.wd-project' },
  { list: '/', prefix: 'vt-wd-', card: 'a.work-item__link' },
  { list: '/blog/', prefix: 'vt-post-', card: 'a.blog-post-card:not([hidden])' },
]) {
  test(`${list} view-transition names are unique and match the detail page`, async ({ page, browserName }) => {
    test.skip(browserName === 'firefox', 'no view-transition-name support');
    await page.goto(list);
    const names = await renderedNames(page);
    expect(names.length).toBeGreaterThan(1);
    expect(new Set(names).size).toBe(names.length);
    expect(names.every((n) => n.startsWith(prefix))).toBe(true);

    const href = await page.locator(card).first().getAttribute('href');
    await page.goto(href!);
    const detailNames = await renderedNames(page);
    expect(detailNames).toHaveLength(1);
    expect(names).toContain(detailNames[0]);
  });
}
