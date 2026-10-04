// Per-IP throttle for POST /api/contact, backed by Cloudflare's Workers rate
// limiting binding (see "ratelimits" in wrangler.jsonc). Each accepted request
// sends an email and forwards to the ERP, so the Worker needs its own cap: the
// backend's limiter only covers the ERP side and doesn't stop the email.
//
// Fails open on purpose. A missing binding (local `astro dev`, tests) or a
// binding error must not turn into a contact form that rejects real visitors.
// Counters are per Cloudflare location and eventually consistent, so this is
// a cheap brake on bursts, not an exact quota.

export async function isRateLimited(request, env) {
	if (!env.CONTACT_LIMITER) return false;
	// Cloudflare always sets this header at the edge; the fallback only matters
	// off-edge, where all callers share one bucket instead of getting a free pass.
	const key = request.headers.get("CF-Connecting-IP") ?? "unknown";
	try {
		const { success } = await env.CONTACT_LIMITER.limit({ key });
		return !success;
	} catch (err) {
		console.error("Rate limiter error:", err);
		return false;
	}
}
