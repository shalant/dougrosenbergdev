#!/usr/bin/env node
// Keeps public/_headers' CSP script-src hash list in step with the built HTML.
// Astro inlines small page scripts, and a CSP that pins inline scripts by
// sha256 silently blocks any script whose text changed since the hash was
// written (dougrosenbergmusic hit exactly this on 2026-09-20). Run after
// `npm run build`.
//
// Default: report drift and exit non-zero. `--write` rewrites the hash run in
// public/_headers instead.
//
// Scans every built page, not just the homepage: blog posts and /webdesign
// carry their own inline scripts. Skips dist/archive/ (the retired Blazor-era
// portfolio, a verbatim third-party bundle; the Worker 301s /archive to /) and
// application/ld+json blocks (data, not executable, so CSP doesn't apply).

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

const DIST = "dist";
const HEADERS_FILE = "public/_headers";
const CSP_HEADER = "Content-Security-Policy-Report-Only:";
const WRITE = process.argv.includes("--write");

function* htmlFiles(dir) {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) {
			if (path === join(DIST, "archive")) continue;
			yield* htmlFiles(path);
		} else if (entry.name.endsWith(".html")) {
			yield path;
		}
	}
}

function hashesFromBuiltHtml() {
	const hashes = new Set();
	for (const file of htmlFiles(DIST)) {
		// Strip comments first: a comment containing "<script>" prose once
		// produced a garbage hash in the music repo.
		const html = readFileSync(file, "utf8").replace(/<!--[\s\S]*?-->/g, "");
		const scriptRe = /<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g;
		let match;
		while ((match = scriptRe.exec(html))) {
			if (/ld\+json/.test(match[1])) continue;
			hashes.add(`sha256-${createHash("sha256").update(match[2], "utf8").digest("base64")}`);
		}
	}
	return hashes;
}

const headersText = readFileSync(HEADERS_FILE, "utf8");
const cspLine = headersText.split(/\r?\n/).find((line) => line.includes(CSP_HEADER));
if (!cspLine) {
	console.error(`No ${CSP_HEADER} line found in ${HEADERS_FILE}`);
	process.exit(1);
}

const expected = hashesFromBuiltHtml();
const actual = new Set([...cspLine.matchAll(/'(sha256-[^']+)'/g)].map((m) => m[1]));
const missing = [...expected].filter((h) => !actual.has(h));
const stale = [...actual].filter((h) => !expected.has(h));

if (missing.length === 0 && stale.length === 0) {
	console.log(`OK: ${HEADERS_FILE} CSP hashes match the built HTML (${expected.size} hashes).`);
	process.exit(0);
}

if (WRITE) {
	const tokens = [...expected].sort().map((h) => `'${h}'`).join(" ");
	const runRe = /(script-src 'self' )(?:'sha256-[^']+'\s*)+/;
	if (!runRe.test(headersText)) {
		console.error(`Could not find a script-src hash run to replace in ${HEADERS_FILE}.`);
		process.exit(1);
	}
	writeFileSync(HEADERS_FILE, headersText.replace(runRe, `$1${tokens} `));
	console.log(`Rewrote ${HEADERS_FILE} with ${expected.size} current hash(es).`);
	process.exit(0);
}

console.error(`${HEADERS_FILE} CSP script-src hashes are out of date.`);
for (const h of missing) console.error(`  missing: '${h}'`);
for (const h of stale) console.error(`  stale:   '${h}'`);
console.error("Regenerate: npm run build && npm run verify-csp -- --write");
process.exit(1);
