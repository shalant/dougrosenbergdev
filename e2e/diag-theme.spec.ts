// TEMPORARY diagnostic for the ubuntu-26.04 WebKit theme-toggle failures. Not meant to merge.
import { test } from '@playwright/test';

test('diag: theme toggle timeline', async ({ page }, testInfo) => {
  const log: string[] = [];
  const t0 = Date.now();
  const L = (m: string) => log.push(`${Date.now() - t0}ms ${m}`);
  page.on('pageerror', (e) => L('pageerror ' + e.message));
  page.on('console', (m) => L('console.' + m.type() + ' ' + m.text()));

  await page.goto('/');
  L('loaded');
  L('env ' + JSON.stringify(await page.evaluate(() => ({
    vt: typeof document.startViewTransition,
    drTheme: typeof (window as any).DrTheme,
    theme: document.documentElement.getAttribute('data-theme'),
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
    size: innerWidth + 'x' + innerHeight,
    visibility: document.visibilityState,
  }))));
  L('rafDelayMs ' + await page.evaluate(() => new Promise((r) => {
    const t = performance.now();
    requestAnimationFrame(() => r(Math.round(performance.now() - t)));
  })));
  await page.evaluate(() => {
    (window as any).__clicks = 0;
    document.getElementById('themeToggle')!.addEventListener('click', () => (window as any).__clicks++);
  });

  await page.locator('.theme-toggle').click();
  L('clicked');
  for (let i = 0; i < 24; i++) {
    const s = await page.evaluate(() => ({
      theme: document.documentElement.getAttribute('data-theme'),
      cls: document.documentElement.className,
      clicks: (window as any).__clicks,
      stored: localStorage.getItem('dr-theme'),
    }));
    L(JSON.stringify(s));
    await page.waitForTimeout(250);
  }
  console.log(`DIAG[${testInfo.project.name}]\n` + log.join('\n'));
});
