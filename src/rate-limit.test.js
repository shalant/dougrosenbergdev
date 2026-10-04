import { test } from "node:test";
import assert from "node:assert/strict";
import { isRateLimited } from "./rate-limit.js";

const req = (ip) => new Request("https://dougrosenbergdev.com/api/contact", {
	method: "POST",
	headers: ip ? { "CF-Connecting-IP": ip } : {},
});

test("allows the request when the limiter says success", async () => {
	const env = { CONTACT_LIMITER: { limit: async () => ({ success: true }) } };
	assert.equal(await isRateLimited(req("1.2.3.4"), env), false);
});

test("blocks the request when the limiter says no", async () => {
	const env = { CONTACT_LIMITER: { limit: async () => ({ success: false }) } };
	assert.equal(await isRateLimited(req("1.2.3.4"), env), true);
});

test("keys the limiter on the client IP", async () => {
	let seen;
	const env = { CONTACT_LIMITER: { limit: async (opts) => ((seen = opts), { success: true }) } };
	await isRateLimited(req("9.9.9.9"), env);
	assert.deepEqual(seen, { key: "9.9.9.9" });
});

test("fails open when the binding is missing", async () => {
	assert.equal(await isRateLimited(req("1.2.3.4"), {}), false);
});

test("fails open when the binding throws", async () => {
	const env = { CONTACT_LIMITER: { limit: async () => { throw new Error("boom"); } } };
	assert.equal(await isRateLimited(req("1.2.3.4"), env), false);
});
