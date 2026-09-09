// Crawls every built HTML page and verifies every internal href/src/srcset
// reference resolves to a real file in dist/. Not committed to the site itself -
// a one-off QA tool, run with `node scripts/check-links.mjs`.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';

const DIST = join(import.meta.dirname, '..', 'dist');

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (entry.endsWith('.html')) out.push(full);
  }
  return out;
}

function resolvePath(urlPath) {
  // strip query/hash
  let p = urlPath.split('#')[0].split('?')[0];
  if (!p.startsWith('/')) return null; // external or relative - skip
  if (p.startsWith('//')) return null; // protocol-relative external
  if (p === '/') p = '/index.html';
  let full = join(DIST, p);
  if (existsSync(full) && statSync(full).isDirectory()) full = join(full, 'index.html');
  return full;
}

const pages = walk(DIST);
let totalChecked = 0;
let brokenCount = 0;
const broken = [];

const attrPatterns = [
  /href="([^"]+)"/g,
  /src="([^"]+)"/g,
];

for (const pagePath of pages) {
  const html = readFileSync(pagePath, 'utf8');
  const routePath = pagePath.replace(DIST, '').replace(/\\/g, '/');
  const seen = new Set();

  for (const re of attrPatterns) {
    let m;
    while ((m = re.exec(html))) {
      const url = m[1];
      if (url.startsWith('http') || url.startsWith('mailto:') || url.startsWith('data:') || url.startsWith('#')) continue;
      if (seen.has(url)) continue;
      seen.add(url);
      const resolved = resolvePath(url);
      if (resolved === null) continue;
      totalChecked++;
      if (!existsSync(resolved)) {
        brokenCount++;
        broken.push({ page: routePath, url });
      }
    }
  }

  // srcset entries (space-separated "url widthdescriptor, url widthdescriptor")
  const srcsetRe = /srcset="([^"]+)"/g;
  let sm;
  while ((sm = srcsetRe.exec(html))) {
    const entries = sm[1].split(',').map((e) => e.trim().split(/\s+/)[0]);
    for (const url of entries) {
      if (seen.has(url)) continue;
      seen.add(url);
      const resolved = resolvePath(url);
      if (resolved === null) continue;
      totalChecked++;
      if (!existsSync(resolved)) {
        brokenCount++;
        broken.push({ page: routePath, url });
      }
    }
  }
}

console.log(`Checked ${totalChecked} internal references across ${pages.length} pages.`);
if (broken.length > 0) {
  console.log(`\n${brokenCount} BROKEN:`);
  for (const b of broken) console.log(`  ${b.page} -> ${b.url}`);
  process.exit(1);
} else {
  console.log('No broken internal links/images/assets found.');
}
