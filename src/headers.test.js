import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Static checks on public/_headers. Node and the local http-server don't apply
// _headers, so real header behavior is checked against `wrangler dev` / the
// live site with curl (see PORT_TODO.md). These only guard the file's contents.
const headers = readFileSync(new URL("../public/_headers", import.meta.url), "utf8");
const global = headers.match(/^\/\*\r?\n((?:[ \t]+.*\r?\n?)+)/m)?.[1] ?? "";

test("global block sets the simple security headers", () => {
	assert.match(global, /^\s*X-Content-Type-Options: nosniff\s*$/m);
	assert.match(global, /^\s*X-Frame-Options: DENY\s*$/m);
	assert.match(global, /^\s*Referrer-Policy: strict-origin-when-cross-origin\s*$/m);
	assert.match(global, /^\s*Permissions-Policy: .*camera=\(\)/m);
});

test("HSTS has a max-age and no preload or includeSubDomains yet", () => {
	const line = global.match(/^\s*Strict-Transport-Security: (.*)$/m)?.[1] ?? "";
	assert.match(line, /^max-age=\d+$/);
	assert.doesNotMatch(line, /preload|includeSubDomains/i);
});

test("CSP is Report-Only and never uses unsafe-inline for scripts", () => {
	assert.match(global, /^\s*Content-Security-Policy-Report-Only: /m);
	assert.doesNotMatch(global, /^\s*Content-Security-Policy: /m);
	const scriptSrc = global.match(/script-src ([^;]*);/)?.[1] ?? "";
	assert.doesNotMatch(scriptSrc, /unsafe-inline|unsafe-eval/);
});

test("cache rules still follow the security block", () => {
	assert.match(headers, /^\/_astro\/\*\r?\n\s+Cache-Control: public, max-age=31536000, immutable/m);
});
