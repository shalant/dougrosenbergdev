// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { readFileSync } from 'node:fs';

// lastmod only where there's a real date to report (blog posts); the other pages
// have no tracked modification date, and a made-up or build-time lastmod on
// every URL would teach crawlers to ignore the field.
const postDates = new Map(
  JSON.parse(readFileSync(new URL('./src/data/blog-posts.json', import.meta.url), 'utf8'))
    .map((/** @type {any} */ p) => [`/blog/${p.id}/`, p.dateModified ?? p.date]),
);

// https://astro.build/config
export default defineConfig({
  site: 'https://dougrosenbergdev.com',
  base: '/',
  integrations: [
    sitemap({
      serialize(item) {
        const lastmod = postDates.get(new URL(item.url).pathname);
        if (lastmod) item.lastmod = new Date(lastmod).toISOString();
        return item;
      },
    }),
  ],
  // /previous -> /archive is now a real HTTP 301 from src/worker.js instead
  // of a static-output meta-refresh page - this Worker sits in front of
  // every request (see worker.js's header comment), so it can do a proper
  // server redirect instead of the client-side-refresh workaround a
  // build-time-only static site would need.
});
