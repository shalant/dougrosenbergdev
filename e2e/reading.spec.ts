import { test, expect } from '@playwright/test';

// /reading (2026-11-23): a small shelf of papers colored by subject. The selected spine
// leans 30 degrees while the others stay upright and aligned; its panel shows and the others hide.

test.describe('/reading', () => {
  test('title, subtitle and a nav link that lands here', async ({ page }) => {
    await page.goto('/');
    const link = page.locator('.nav-items a.nav-link[href="/reading"]');
    await expect(link).toHaveCount(1);
    // At 1080px and below the links live in the hamburger sheet.
    if (!(await link.isVisible())) await page.locator('#navToggle').click();
    await link.click();
    await expect(page).toHaveURL(/\/reading\/?$/);
    await expect(page.locator('h1')).toHaveText("What I'm Reading");
    await expect(page.locator('.reading-head__sub')).toContainText('Yes, I read');
    await expect(page.locator('.nav-link[href="/reading"]'), 'the current page is marked in the nav').toHaveClass(/active/);
  });

  test('the shelf has six spines, one leaning, and its panel is the only one showing', async ({ page }) => {
    await page.goto('/reading');
    const spines = page.locator('.spine');
    await expect(spines).toHaveCount(6);
    await expect(page.locator('.spine[aria-current="true"]')).toHaveCount(1);
    await expect(page.locator('.paper.is-current')).toHaveCount(1);
    // Only the current panel is visible, and it is the first real paper, not an empty slot.
    await expect(page.locator('.paper:visible')).toHaveCount(1);
    await expect(page.locator('.paper.is-current h2')).toHaveText('GRT: A Purely Rotational Transformer Architecture');
  });

  test('pressing a spine leans it 30 degrees, pulls it toward the viewer, straightens the others and swaps the panel', async ({ page }) => {
    await page.goto('/reading');
    const monad = page.locator('.spine', { hasText: 'Monad Manifesto' });
    await monad.click();
    await expect(monad).toHaveAttribute('aria-current', 'true');
    await expect(page.locator('.paper.is-current h2')).toHaveText('Monad Manifesto');
    await expect(page.locator('.paper:visible')).toHaveCount(1);

    // Every spine carries a 3D transform (perspective, translate3d, rotate), so read the matrix3d:
    // the first two entries give the rotation, and the last (m44) is 1 at rest and below 1 once the
    // spine has been moved toward the viewer on the Z axis.
    const matrix = (loc: ReturnType<typeof page.locator>) =>
      loc.evaluate((e) => {
        const m = getComputedStyle(e).transform;
        return m === 'none' ? [] : m.replace(/^matrix3d\(|^matrix\(|\)$/g, '').split(',').map(parseFloat);
      });
    const angle = async (loc: ReturnType<typeof page.locator>) => {
      const v = await matrix(loc);
      return v.length ? Math.round((Math.atan2(v[1], v[0]) * 180) / Math.PI) : 0;
    };
    const depth = async (loc: ReturnType<typeof page.locator>) => {
      const v = await matrix(loc);
      return v.length === 16 ? v[15] : 1;
    };
    await expect.poll(() => angle(monad), { message: 'the selected spine leans 30 degrees' }).toBe(30);
    await expect.poll(async () => (await depth(monad)) < 0.95, { message: 'the selected spine is pulled toward the viewer' }).toBe(true);
    // Every other spine is upright, and they share one baseline.
    const others = page.locator('.spine:not([aria-current="true"])');
    for (let i = 0; i < 5; i++) {
      expect(await angle(others.nth(i)), `spine ${i} is upright`).toBe(0);
      expect(await depth(others.nth(i)), `spine ${i} stays on the shelf`).toBeCloseTo(1, 5);
    }
    const bottoms = await others.evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().bottom)));
    expect(new Set(bottoms).size, `upright spines share a baseline: ${bottoms.join(' ')}`).toBe(1);
  });

  test('a hash opens that book, and the arrow keys move along the shelf', async ({ page }) => {
    await page.goto('/reading#paper-4');
    await expect(page.locator('.paper.is-current h2')).toHaveText('Monad Manifesto');
    const monad = page.locator('.spine', { hasText: 'Monad Manifesto' });
    await monad.focus();
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('.spine[aria-current="true"]')).toHaveText('next: UX/UI');
    await expect(page.locator('.paper.is-current h2')).toHaveText('An empty slot');
  });

  test('works without JavaScript: every panel is readable', async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto('/reading');
    await expect(page.locator('.paper:visible')).toHaveCount(6);
    await ctx.close();
  });

  test('no horizontal scroll on a phone, in every theme', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    for (const theme of ['dark', 'light', 'steel']) {
      await page.goto(`/reading?theme=${theme}`);
      await page.locator('.shelf').waitFor();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${theme}: page scrolls sideways`).toBe(true);
    }
  });

  // The C# column used to sit off screen on a phone, behind a sideways scroll (UX review, 2026-11-24).
  for (const width of [360, 390]) {
    test(`the whole shelf fits at ${width}px, whichever book is leaning`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('/reading');
      await page.evaluate(() => document.fonts.ready);
      const shelf = page.locator('.shelf');
      for (let i = 0; i < 6; i++) {
        await page.locator('.spine').nth(i).dispatchEvent('click');
        const { overflow, outside } = await shelf.evaluate((el) => {
          const box = el.getBoundingClientRect();
          return {
            overflow: el.scrollWidth - el.clientWidth,
            outside: [...el.querySelectorAll('.spine')].filter((s) => {
              const r = s.getBoundingClientRect();
              return r.left < box.left - 1 || r.right > box.right + 1;
            }).length,
          };
        });
        expect(overflow, `book ${i} selected: shelf scrolls sideways`).toBeLessThanOrEqual(0);
        expect(outside, `book ${i} selected: spines cut off`).toBe(0);
      }
    });
  }

  test('links inside a panel resolve (posts and the source)',async ({ page, request }) => {
    await page.goto('/reading');
    const hrefs = await page.locator('.paper a[href^="/blog/"]').evaluateAll((els) => els.map((e) => (e as HTMLAnchorElement).getAttribute('href')));
    expect(hrefs.length).toBeGreaterThan(0);
    for (const h of new Set(hrefs)) {
      const res = await request.get(h as string);
      expect(res.status(), `${h} should resolve`).toBe(200);
    }
  });
});
