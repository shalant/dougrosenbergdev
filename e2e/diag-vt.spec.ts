// TEMPORARY diagnostic (do not merge): how long does a WebKit view transition take on the CI runner,
// on a bare page, on the near-empty 404 page, and on the home page with expensive features switched off?
import { test } from '@playwright/test';

test.use({ reducedMotion: 'no-preference' });

const VARIANTS: Record<string, string> = {
  'home baseline': '',
  'home no backdrop-filter': '*{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}',
  'home no bauhaus layers': '.navbar-wrapper::before,.navbar-wrapper::after,.hero-section::before,.hero-section::after{display:none!important}*::before,*::after{mix-blend-mode:normal!important}',
  'home no filters/shadows': '*{filter:none!important;box-shadow:none!important;text-shadow:none!important}',
  'home no gradients/images': '*{background-image:none!important}img,picture,canvas,video{visibility:hidden!important}',
  'home hero only': 'main#main>section:not(#home){display:none!important}footer{display:none!important}',
};

test('diag: view transition cost', async ({ page }, testInfo) => {
  test.setTimeout(600_000);
  const lines: string[] = [];
  const log = (m: string) => lines.push(m);

  // 1. a bare page: pure WebKit, none of our code
  await page.setContent('<!doctype html><html><body style="margin:0"><div id="a" style="height:400px;background:#123">hi</div></body></html>');
  const bare = await page.evaluate(async () => {
    const t = performance.now();
    const vt = (document as any).startViewTransition(() => { document.getElementById('a')!.style.background = '#fed'; });
    await vt.finished;
    return Math.round(performance.now() - t);
  });
  log(`bare page startViewTransition.finished: ${bare} ms`);

  // 2. the near-empty 404 page, through the real DrTheme.toggle()
  for (const [label, url, css] of [
    ['404 page', '/404', ''],
    ...Object.entries(VARIANTS).map(([k, v]) => [k, '/?theme=dark', v] as [string, string, string]),
  ] as [string, string, string][]) {
    const results: string[] = [];
    for (let i = 0; i < 2; i++) {
      await page.goto(url.includes('?') ? url : url + '?theme=dark');
      await page.waitForTimeout(1500);
      if (css) await page.addStyleTag({ content: css });
      await page.waitForTimeout(300);
      const t0 = Date.now();
      await page.evaluate(() => (window as any).DrTheme.toggle());
      try {
        await page.waitForFunction(() => document.documentElement.getAttribute('data-theme') === 'light' && !document.documentElement.classList.contains('theme-switching'), null, { timeout: 60_000, polling: 200 });
        results.push(`${Date.now() - t0} ms`);
      } catch { results.push('>60000 ms'); }
    }
    log(`${label.padEnd(28)} ${results.join(', ')}`);
  }
  console.log(`DIAGVT[${testInfo.project.name}]\n` + lines.join('\n'));
});
