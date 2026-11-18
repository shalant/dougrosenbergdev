// After `npm run build`: every /js/ script in the built HTML must carry ?v=<hash of that file>,
// and the hash must match the file in public/js/ right now. /js/* is cached for a week
// (public/_headers), so an unstamped or stale URL means returning visitors can run an old script
// against new HTML. The stamp comes from src/lib/jsUrl.ts; use jsUrl('name.js') for any new script.
//
//   npm run verify-js-versions
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const problems = [];
let checked = 0;

function hashOf(name) {
  return createHash('sha256').update(readFileSync(join('public', 'js', name))).digest('hex').slice(0, 8);
}

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path);
    else if (path.endsWith('.html')) scan(path);
  }
}

function scan(file) {
  const html = readFileSync(file, 'utf8');
  for (const m of html.matchAll(/\bsrc="(\/js\/([^"?]+)(?:\?v=([0-9a-f]+))?)"/g)) {
    const [, url, name, stamp] = m;
    checked++;
    if (!existsSync(join('public', 'js', name))) problems.push(`${file}: ${url} points at a file that is not in public/js/`);
    else if (!stamp) problems.push(`${file}: ${url} has no ?v= stamp (use jsUrl('${name}') from src/lib/jsUrl.ts)`);
    else if (stamp !== hashOf(name)) problems.push(`${file}: ${url} is stale (the file hashes to ${hashOf(name)})`);
  }
}

if (!existsSync('dist')) {
  console.error('verify-js-versions: dist/ not found. Run `npm run build` first.');
  process.exit(1);
}
walk('dist');
if (checked === 0) problems.push('no /js/ scripts found in dist/ at all; the check is not looking at anything');

if (problems.length) {
  console.error(`JS version stamps (${problems.length} problem${problems.length === 1 ? '' : 's'}):\n` + problems.join('\n'));
  process.exit(1);
}
console.log(`OK: ${checked} /js/ script references across the built pages all carry a current ?v= stamp.`);
