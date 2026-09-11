// Notifies Bing/Yandex (and, via Bing's index, Copilot's web grounding) of every
// URL in the built sitemap via the IndexNow protocol, so new/changed pages get
// crawled within minutes instead of waiting on a natural recrawl. Same key and
// domain the old Blazor site used (PortfolioNov25's publish-gh-pages.yml) -
// IndexNow keys are proven by a file at the domain root, not per-repo, so the
// already-verified-working key was reused rather than generating a new one.
//
// Meant to run after a real deploy (not just a build), since pinging before the
// new content is actually live just wastes the crawl priority IndexNow grants -
// see wrangler.jsonc's header comment for wiring this into Cloudflare's
// dashboard-configured deploy command (`npx wrangler deploy && node
// scripts/indexnow-ping.mjs`). Run manually with `node scripts/indexnow-ping.mjs`
// to re-notify at any time - IndexNow submissions are idempotent, safe to repeat.
//
// Never throws / never exits non-zero on failure - an IndexNow hiccup is not a
// reason to fail a deploy, so this only logs a warning and moves on.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DIST = join(import.meta.dirname, '..', 'dist');
const HOST = 'dougrosenbergdev.com';
const KEY = '420c300198134394a823abc04ef8edf8';
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;

function extractLocs(xml) {
  return Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g), (m) => m[1]);
}

function collectSitemapUrls() {
  const indexPath = join(DIST, 'sitemap-index.xml');
  if (!existsSync(indexPath)) {
    throw new Error(`${indexPath} not found - run "npm run build" first`);
  }

  const sitemapFileUrls = extractLocs(readFileSync(indexPath, 'utf8'));
  const pageUrls = [];

  for (const sitemapUrl of sitemapFileUrls) {
    const filename = new URL(sitemapUrl).pathname.split('/').pop();
    const localPath = join(DIST, filename);
    if (!existsSync(localPath)) {
      console.warn(`indexnow-ping: sitemap index references ${filename}, but it's missing from dist/ - skipping`);
      continue;
    }
    pageUrls.push(...extractLocs(readFileSync(localPath, 'utf8')));
  }

  return pageUrls;
}

async function main() {
  let urlList;
  try {
    urlList = collectSitemapUrls();
  } catch (err) {
    console.warn(`indexnow-ping: couldn't read the built sitemap, skipping ping - ${err.message}`);
    return;
  }

  if (urlList.length === 0) {
    console.warn('indexnow-ping: sitemap had no URLs, skipping ping');
    return;
  }

  try {
    // api.indexnow.org is the canonical shared endpoint, but it's blocked at
    // the network level in this environment (TLS handshake reset, confirmed
    // via curl -v - not an IndexNow-side problem). Bing's own endpoint is
    // equally valid per the protocol - any one participating engine's
    // endpoint propagates the submission to the others - and it works here.
    const response = await fetch('https://www.bing.com/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList }),
    });
    // IndexNow's success response is HTTP 200 with an empty body - that's
    // normal, not a sign anything went wrong.
    const body = await response.text();
    console.log(`indexnow-ping: notified ${urlList.length} URL(s), HTTP ${response.status}${body ? ` - ${body}` : ''}`);
  } catch (err) {
    console.warn(`indexnow-ping: request failed, not blocking the deploy - ${err.message}`);
  }
}

await main();
