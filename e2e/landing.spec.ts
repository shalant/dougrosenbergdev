import { test, expect } from '@playwright/test';

// Audience landing pages (src/data/landing-pages.json). They exist to rank for
// non-name queries, so the checks are about what a crawler sees: one h1, a
// unique title, one canonical, valid JSON-LD, and working links into the
// case studies and back from /services/.
const pages = [
  { path: '/chicago-web-design/', h1: /chicago small businesses/i, schema: 'ProfessionalService', caseStudy: '/webdesign/sonus-construction/' },
  { path: '/musician-websites/', h1: /musicians and bands/i, schema: 'Service', caseStudy: '/webdesign/guacamayo-band/' },
];

for (const { path, h1, schema, caseStudy } of pages) {
  test.describe(path, () => {
    test('renders one h1, a canonical, and the contact trigger', async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('h1')).toHaveText(h1);
      await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://dougrosenbergdev.com${path}`);
      await expect(page.locator('.subpage-hero [data-contact-trigger]')).toBeVisible();
    });

    test('emits parseable service and FAQ JSON-LD', async ({ page }) => {
      await page.goto(path);
      const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
      const types = blocks.map((b) => JSON.parse(b)['@type']);
      expect(types).toContain(schema);
      expect(types).toContain('FAQPage');
    });

    test('links to its case study, which resolves', async ({ page }) => {
      await page.goto(path);
      const link = page.locator(`a[href="${caseStudy}"]`);
      await expect(link).toHaveCount(1);
      const response = await page.request.get(caseStudy);
      expect(response.status()).toBe(200);
    });
  });
}

test('/services/ links to both landing pages', async ({ page }) => {
  await page.goto('/services/');
  for (const { path } of pages) {
    await expect(page.locator(`a[href="${path}"]`)).toHaveCount(1);
  }
});
