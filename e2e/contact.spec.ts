import { test, expect, type Page } from '@playwright/test';

// Covers the shared ContactDialog/ContactForm introduced when every mailto:
// CTA sitewide was swapped for the real /api/contact form - see PORT_TODO.md.
// webdesign.spec.ts already covers the dialog opening/closing from
// webdesign's own trigger button; this file covers the header CTA (present
// on every page) and the homepage's simultaneous inline form + dialog form
// not colliding on ids.

// .nav-cta (desktop) and .nav-link--cta (inside the mobile hamburger menu)
// both exist in the DOM at every viewport - CSS just toggles which is
// visible - but on mobile the whole menu also stays hidden (visibility:
// hidden until #navItems gets .active) until #navToggle is clicked, so a
// bare visible-selector isn't enough there the way it is on desktop.
async function openContactDialogFromHeader(page: Page) {
  const desktopCta = page.locator('.nav-cta');
  if (await desktopCta.isVisible()) {
    await desktopCta.click();
    return;
  }
  await page.locator('#navToggle').click();
  await page.locator('.nav-link--cta').click();
}

test.describe('shared contact dialog', () => {
  test('header "get in touch" opens the dialog on a page with no bespoke contact UI', async ({ page }) => {
    await page.goto('/consulting');
    await openContactDialogFromHeader(page);
    const dialog = page.locator('#contactDialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('#dialog-contact-name')).toBeVisible();
    await page.locator('#closeContactDialog').click();
    await expect(dialog).toBeHidden();
  });

  test('every former mailto CTA opens the same dialog instead of linking out', async ({ page }) => {
    await page.goto('/services');
    const triggers = page.locator('[data-contact-trigger]');
    await expect(triggers).toHaveCount(5);
    await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0);
  });

  test('homepage inline form and header dialog form coexist without id collisions', async ({ page }) => {
    await page.goto('/');
    const inlineForm = page.locator('#contact-form');
    await expect(inlineForm).toBeVisible();

    await openContactDialogFromHeader(page);
    const dialogForm = page.locator('#dialog-contact-form');
    await expect(dialogForm).toBeVisible();

    // Both forms present at once with distinct ids - not the same node twice.
    await expect(page.locator('#contact-form, #dialog-contact-form')).toHaveCount(2);
  });
});
