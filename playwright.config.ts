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
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 14'] } },
  ],
});
