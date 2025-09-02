// app/api/subscribe/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import crypto from "crypto";

/** Mailchimp error shape (subset) */
type McError = { title?: string; detail?: string; status?: number };

/* ---------- tiny helpers ---------- */
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
const bad = (message: string, status = 400) => json({ ok: false, message }, status);
const ok = (message: string) => json({ ok: true, message }, 200);

/* ---------- POST /api/subscribe ---------- */
export async function POST(req: Request) {
  try {
    const { email, tag } = (await req.json().catch(() => ({}))) as {
      email?: string;
      tag?: string;
    };

    const clean = String(email || "").trim().toLowerCase();
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(clean)) return bad("Invalid email address.", 422);

    // Env vars
    const API_KEY = process.env.MAILCHIMP_API_KEY || "";
    const LIST_ID = process.env.MAILCHIMP_LIST_ID || "";
    // If MAILCHIMP_SERVER_PREFIX is not set, derive from API key suffix (-usX)
    const PREFIX =
      process.env.MAILCHIMP_SERVER_PREFIX || (API_KEY.includes("-") ? API_KEY.split("-")[1] : "");
    const DOUBLE_OPTIN = /^true$/i.test(process.env.MAILCHIMP_DOUBLE_OPTIN || "");

    // Dev-friendly no-op when env is missing
    if (!API_KEY || !LIST_ID || !PREFIX) {
      console.warn("[subscribe] Missing Mailchimp env; returning success (dev no-op).", {
        hasKey: !!API_KEY,
        hasList: !!LIST_ID,
        prefix: PREFIX || null,
      });
      return ok("Subscribed (dev).");
    }

    // Mailchimp member upsert (idempotent)
    const hash = crypto.createHash("md5").update(clean).digest("hex");
    const url = `https://${PREFIX}.api.mailchimp.com/3.0/lists/${LIST_ID}/members/${hash}`;
    const auth = "Basic " + Buffer.from(`anystring:${API_KEY}`).toString("base64");

    const body = {
      email_address: clean,
      status_if_new: DOUBLE_OPTIN ? "pending" : "subscribed",
      status: DOUBLE_OPTIN ? "pending" : "subscribed",
      // Tag new/updated member; default to "website" if none provided
      tags: [String(tag || "website")],
    };

    const res = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: auth,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      return ok(DOUBLE_OPTIN ? "Check your email to confirm." : "You're subscribed!");
    }

    // Parse MC error and handle common “already exists” as success
    const err = (await res.json().catch(() => ({}))) as McError;
    if (err?.title === "Member Exists" || err?.title === "Forgotten Email Not Subscribed") {
      return ok("You're subscribed!");
    }

    console.error("[subscribe] Mailchimp error:", err);
    return bad(err?.detail || "Subscription failed.", err?.status || res.status || 500);
  } catch (e: any) {
    console.error("[subscribe] Fatal:", e?.message || e);
    return bad("Subscription failed.", 500);
  }
}
