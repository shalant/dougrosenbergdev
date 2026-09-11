// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://dougrosenbergdev.com',
  base: '/',
  integrations: [sitemap()],
  // /previous -> /archive is now a real HTTP 301 from src/worker.js instead
  // of a static-output meta-refresh page - this Worker sits in front of
  // every request (see worker.js's header comment), so it can do a proper
  // server redirect instead of the client-side-refresh workaround a
  // build-time-only static site would need.
});
