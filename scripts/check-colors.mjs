// Fails when a color literal (#hex, rgb(), rgba()) appears outside the color-system section
// of src/styles/global.css. Components must use role tokens (see the COLOR SYSTEM comment).
//
//   npm run check:colors
//
// Scanned: global.css after the token region (everything from `.dr-theme-scope {`) and the
// <style> blocks of every .astro file. Not scanned: SVG presentation attributes (brand-mark
// SVGs can't read CSS variables reliably), comments, mask-image lines (their color only
// supplies alpha), and any line carrying `palette:allow` for a deliberate one-off.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const LITERAL = /#[0-9a-fA-F]{3,8}\b|\brgba?\(\s*\d/;
const problems = [];

function scan(file, text, firstLine = 1) {
  const noComments = text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
  noComments.split('\n').forEach((line, i) => {
    if (!LITERAL.test(line)) return;
    if (/mask-image/.test(line) || /palette:allow/.test(text.split('\n')[i])) return;
    problems.push(`${file}:${firstLine + i}  ${line.trim()}`);
  });
}

const css = readFileSync('src/styles/global.css', 'utf8');
const lines = css.split('\n');
const start = lines.findIndex((l) => l.startsWith('.dr-theme-scope {'));
if (start < 0) throw new Error('check-colors: could not find the end of the token region in global.css');
scan('src/styles/global.css', lines.slice(start).join('\n'), start + 1);

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.astro')) {
      const src = readFileSync(p, 'utf8');
      for (const m of src.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) {
        const before = src.slice(0, m.index + m[0].indexOf('>') + 1).split('\n').length;
        scan(p.replaceAll('\\', '/'), m[1], before);
      }
    }
  }
}
walk('src');

if (problems.length) {
  console.error(`Color literals outside the token section (${problems.length}). Use a role token, or add \`palette:allow\` with a reason:\n`);
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log('check-colors: no color literals outside the token section.');
