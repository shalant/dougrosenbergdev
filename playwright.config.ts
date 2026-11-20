import { defineConfig, devices } from '@playwright/test';

// webServer runs `http-server dist` rather than `astro preview` - astro preview
// self-daemonizes in this Astro version (detaches and returns immediately instead of
// staying foregrounded), which breaks Playwright's webServer startup detection. Also
// closer to how Cloudflare Workers actually serves this as static assets in production.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4322',
    trace: 'on-first-retry',
    // First visits follow the OS theme, and Playwright's default scheme is light. Pin dark so the
    // specs keep their dark baseline; the first-visit specs in home.spec.ts set the scheme themselves.
    colorScheme: 'dark',
  },
  webServer: {
    command: 'npx http-server dist -p 4322 -s',
    url: 'http://localhost:4322',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    // WebKit runs with reduced motion on purpose. On the CI runner (software rendering) a view
    // transition freezes this page for about 9-10 seconds (diagnostic timeline, PR #76: the page
    // answers one poll every ~5 s and the theme lands at ~12 s), which outlasts any sensible
    // assertion timeout; Chromium finishes the same transition in under 1.5 s. Reduced motion takes
    // theme.js's instant path, so the specs test the toggle's logic instead of WebKit's renderer.
    // The real transition is still covered on Chromium and Mobile Chrome, and the watchdog spec
    // turns motion back on and stubs the API.
    { name: 'webkit', use: { ...devices['Desktop Safari'], reducedMotion: 'reduce' } },
    { name: 'mobile-safari', use: { ...devices['iPhone 14'], reducedMotion: 'reduce' } },
  ],
});
