// URL for a script in public/js/, stamped with a hash of its contents: `/js/theme.js?v=3fa9c1d2`.
//
// public/_headers caches /js/* for a week (max-age=604800). Without a stamp, a visitor who
// loaded the site before a deploy keeps the old script for up to seven days while the new HTML
// calls into it. That bit on 2026-11-15, when theme.js gained DrTheme.go() and themeBall.js
// started calling it. The stamp changes only when the file's bytes change, so unchanged scripts
// stay cached for the full week and changed ones are fetched at once. Nothing to bump by hand.
// scripts/verify-js-versions.mjs fails the build check if a /js/ script is left unstamped or
// carries a stale hash.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const cache = new Map<string, string>();

export function jsUrl(name: string): string {
  let v = cache.get(name);
  if (!v) {
    const bytes = readFileSync(join(process.cwd(), 'public', 'js', name));
    v = createHash('sha256').update(bytes).digest('hex').slice(0, 8);
    cache.set(name, v);
  }
  return `/js/${name}?v=${v}`;
}
