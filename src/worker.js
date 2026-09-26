// Cloudflare Worker entry point — sits in front of the static-assets binding
// configured in wrangler.jsonc ("main" + "assets" together). Handles the one
// real API route (contact form submission -> email, plus a best-effort
// forward into the personal ERP's lead intake) and falls back to
// env.ASSETS.fetch() for every other request, which serves the Astro-built
// static site exactly as before this file existed. Same pattern as
// dougrosenbergmusic's site/src/worker.js.
//
// Email is sent via Cloudflare's native Workers send_email binding (see the
// "send_email" block in wrangler.jsonc) rather than a third-party API — no
// external account or secret needed. Setup requirements, both one-time
// Cloudflare-dashboard steps: Email Routing must be enabled on the
// dougrosenbergdev.com zone, and the destination address below must be a
// verified "Destination Address" in this Cloudflare account's Email Routing
// settings (dashboard -> the zone -> Email -> Email Routing -> Destination
// Addresses) — until both are done, sends will fail with an error from the
// send_email binding.
//
// The submission is also forwarded to customer-intake-backend's
// POST /api/leads (see forwardLeadToErp below) so it lands in the personal
// ERP's Leads table alongside music-booking leads from the other sites.
// Best-effort by design: email is what the visitor sees, so an ERP outage
// must never turn into a failed contact form.

import { EmailMessage } from "cloudflare:email";

const CONTACT_TO = "doug.rosenberg@gmail.com";
const FROM_ADDRESS = "contact@dougrosenbergdev.com";
const ALLOWED_ORIGINS = ["https://dougrosenbergdev.com"];

// customer-intake-backend's public lead-intake endpoint (see its
// Program.cs). "DevServices" is one of that repo's two LeadSource enum
// values (the other is MusicBooking, used by the music/band sites) - it's
// tagged this way, not "DougRosenbergDev", regardless of what that repo's
// own planning doc says elsewhere.
const LEAD_INTAKE_URL = "https://admin.dougrosenbergdev.com/api/leads";
const LEAD_SOURCE = "DevServices";

function json(data, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

function isValidEmail(email) {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Strips CR/LF so form input (name/email) can never inject extra headers
// into the raw MIME message built below.
function sanitizeHeaderValue(value) {
	return value.replace(/[\r\n]+/g, " ").trim();
}

// RFC 2047 encoding so a name/subject with non-ASCII characters renders
// correctly instead of being mangled by mail clients expecting ASCII headers.
function encodeHeaderUtf8(value) {
	return `=?UTF-8?B?${btoa(unescape(encodeURIComponent(value)))}?=`;
}

function buildRawEmail({ name, email, message }) {
	const safeName = sanitizeHeaderValue(name);
	const safeEmail = sanitizeHeaderValue(email);
	const encodedName = encodeHeaderUtf8(safeName);

	return [
		`Message-ID: <${crypto.randomUUID()}@dougrosenbergdev.com>`,
		`From: ${encodeHeaderUtf8("dr codeworks — Contact Form")} <${FROM_ADDRESS}>`,
		`To: ${CONTACT_TO}`,
		`Reply-To: ${encodedName} <${safeEmail}>`,
		`Subject: ${encodeHeaderUtf8(`New contact form message from ${safeName}`)}`,
		`Content-Type: text/plain; charset="UTF-8"`,
		`MIME-Version: 1.0`,
		``,
		`From: ${safeName} <${safeEmail}>`,
		``,
		message,
	].join("\r\n");
}

// Best-effort forward into the personal ERP's Leads table. Never lets a
// backend outage break the contact form itself - errors are logged, not
// thrown, and the caller doesn't await this gating the visitor's response.
// No auth/secret needed: this endpoint has no auth on POST (only CORS +
// per-IP rate limiting), and a server-to-server fetch from here sends no
// Origin header, so the backend's browser-origin CORS check never applies.
async function forwardLeadToErp({ name, email, message }) {
	try {
		const res = await fetch(LEAD_INTAKE_URL, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ source: LEAD_SOURCE, name, email, message }),
			signal: AbortSignal.timeout(5000),
		});
		if (!res.ok) {
			console.error("Lead intake forward failed:", res.status, await res.text());
		}
	} catch (err) {
		console.error("Lead intake forward error:", err);
	}
}

async function handleContact(request, env) {
	// Same-origin form, so a mismatched Origin means the request didn't come
	// from the real contact section — not full CSRF protection (no
	// session/token exists to protect), just a cheap reject of the obvious
	// cross-site case.
	const origin = request.headers.get("Origin");
	if (origin && !ALLOWED_ORIGINS.includes(origin)) {
		return json({ error: "Invalid origin" }, 403);
	}

	let body;
	try {
		body = await request.json();
	} catch {
		return json({ error: "Invalid request body" }, 400);
	}

	const { name, email, message, website } = body ?? {};

	// Honeypot field: real visitors never see or fill it (hidden via CSS in
	// the form itself); bots that fill every field trip this silently.
	if (website) {
		return json({ ok: true });
	}

	if (!name || !email || !message) {
		return json({ error: "Name, email, and message are required." }, 400);
	}
	if (!isValidEmail(email)) {
		return json({ error: "Enter a valid email address." }, 400);
	}
	if (name.length > 200 || email.length > 200 || message.length > 5000) {
		return json({ error: "One of the fields is too long." }, 400);
	}

	const raw = buildRawEmail({ name, email, message });
	const emailMessage = new EmailMessage(FROM_ADDRESS, CONTACT_TO, raw);

	// Email is the guaranteed channel - the visitor's response depends only on
	// it. Forwarding into the ERP runs alongside it (not after), but its
	// outcome doesn't affect what the visitor sees; see forwardLeadToErp above.
	const [emailResult] = await Promise.allSettled([
		env.CONTACT_EMAIL.send(emailMessage),
		forwardLeadToErp({ name, email, message }),
	]);

	if (emailResult.status === "rejected") {
		console.error("send_email error:", emailResult.reason);
		return json(
			{ error: "Message could not be sent right now — please email directly instead." },
			502,
		);
	}

	return json({ ok: true });
}

export default {
	async fetch(request, env) {
		const url = new URL(request.url);

		if (url.pathname === "/api/contact") {
			if (request.method !== "POST") {
				return json({ error: "Method not allowed" }, 405);
			}
			return handleContact(request, env);
		}

		// A real HTTP 301 instead of astro.config.mjs's old static-output
		// meta-refresh page - that approach was a workaround for having no
		// server at build time, but this Worker *is* a server, so it can do
		// the redirect properly. /previous has essentially no real backlinks,
		// so this was low-stakes either way, but a genuine 301 is a stronger
		// signal than "noindex + canonical + meta-refresh" if that changes.
		if (url.pathname === "/previous" || url.pathname === "/previous/") {
			return Response.redirect(new URL("/archive", url.origin), 301);
		}

		return env.ASSETS.fetch(request);
	},
};
