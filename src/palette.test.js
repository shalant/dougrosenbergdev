// Contrast floor for every theme, computed from the real role tokens in global.css.
// A new theme is added by appending an entry to THEMES (selectors whose blocks apply, in
// cascade order); a palette that drops text, headings or accents below the floor fails here
// instead of in review.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('./styles/global.css', import.meta.url), 'utf8');

const THEMES = {
  dark: [':root'],
  light: [':root', 'html[data-theme="light"] .dr-theme-scope'],
  steel: [':root', 'html[data-theme="steel"]'],
};

// Every top-level block whose selector line is exactly `selector {`.
function blocks(selector) {
  const out = [];
  const head = `\n${selector} {`;
  let from = 0;
  for (;;) {
    const at = css.indexOf(head, from);
    if (at < 0) return out;
    const open = at + head.length;
    const close = css.indexOf('}', open);
    out.push(css.slice(open, close));
    from = close;
  }
}

function tokens(theme) {
  const map = {};
  for (const selector of THEMES[theme]) {
    for (const body of blocks(selector)) {
      const stripped = body.replace(/\/\*[\s\S]*?\*\//g, '');
      for (const m of stripped.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) map[m[1]] = m[2].trim();
    }
  }
  return map;
}

function resolve(map, name, depth = 0) {
  const value = map[name];
  assert.ok(value !== undefined, `token ${name} is not defined`);
  assert.ok(depth < 10, `token cycle at ${name}`);
  return value.replace(/var\((--[\w-]+)\)/g, (_, inner) => resolve(map, inner, depth + 1));
}

const rgb = (hex) => {
  assert.match(hex, /^#[0-9a-f]{6}$/i, `expected a 6-digit hex, got ${hex}`);
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
};
const luminance = (channels) => {
  const [r, g, b] = channels.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [hi, lo] = [luminance(rgb(a)), luminance(rgb(b))].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// [foreground role, background role, minimum ratio]
const PAIRS = [
  ['--text', '--bg', 7],
  ['--heading', '--bg', 7],
  ['--accent', '--bg', 4.5],
];

for (const theme of Object.keys(THEMES)) {
  const map = tokens(theme);
  for (const [fg, bg, min] of PAIRS) {
    test(`${theme}: ${fg} on ${bg} is at least ${min}:1`, () => {
      const r = ratio(resolve(map, fg), resolve(map, bg));
      assert.ok(r >= min, `${fg} on ${bg} is ${r.toFixed(2)}:1 in ${theme}, floor is ${min}:1`);
    });
  }
  for (const fill of ['--accent-fill', '--accent-fill-hover']) {
    test(`${theme}: --on-accent on ${fill} is at least 4.5:1`, () => {
      const r = ratio(resolve(map, '--on-accent'), resolve(map, fill));
      assert.ok(r >= 4.5, `--on-accent on ${fill} is ${r.toFixed(2)}:1 in ${theme}`);
    });
  }
}
