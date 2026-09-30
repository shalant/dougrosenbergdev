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
});
