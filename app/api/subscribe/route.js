import crypto from "crypto";

type McError = { title?: string; detail?: string; status?: number };

function bad(message: string, status = 400) {
  return new Response(JSON.stringify({ ok: false, message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
function ok(message: string) {
  return new Response(JSON.stringify({ ok: true, message }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(req: Request) {
  try {
    const { email, tag } = (await req.json().catch(() => ({}))) as {
      email?: string;
      tag?: string;
    };

    const clean = String(email || "")
      .trim()
      .toLowerCase();
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(clean)) return bad("Invalid email address.", 422);

    const API_KEY = process.env.MAILCHIMP_API_KEY || "";
    const LIST_ID = process.env.MAILCHIMP_LIST_ID || "";
    const PREFIX =
      process.env.MAILCHIMP_SERVER_PREFIX ||
      (API_KEY.split("-")[1] || "usX"); // derive data center from key if not provided
    const DOUBLE_OPTIN = /^true$/i.test(process.env.MAILCHIMP_DOUBLE_OPTIN || "");

    // If keys aren’t configured, pretend success (so the UI still works in dev)
    if (!API_KEY || !LIST_ID || !PREFIX) {
      console.warn("[subscribe] Missing Mailchimp env; dev no-op subscribe:", clean);
      return ok("Subscribed (dev).");
    }

    // Mailchimp "upsert" = PUT to members/{subscriber_hash}
    const hash = crypto.createHash("md5").update(clean).digest("hex");
    const url = `https://${PREFIX}.api.mailchimp.com/3.0/lists/${LIST_ID}/members/${hash}`;

    const auth = "Basic " + Buffer.from(`anystring:${API_KEY}`).toString("base64");

    const body = {
      email_address: clean,
      status_if_new: DOUBLE_OPTIN ? "pending" : "subscribed",
      status: "subscribed", // if the member already exists, set/keep subscribed
      tags: [tag || "website"],
    };

    const res = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: auth,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      // Next automatically keeps this server-side; no need to cache
    });

    if (res.ok) {
      return ok(DOUBLE_OPTIN ? "Check your email to confirm." : "You're subscribed!");
    }

    const err = (await res.json().catch(() => ({}))) as McError;

    // Common Mailchimp cases to treat as success
    if (
      err?.title === "Member Exists" ||
      err?.title === "Forgotten Email Not Subscribed" /* soft-bounce scenarios */
    ) {
      return ok("You're subscribed!");
    }

    console.error("[subscribe] Mailchimp error:", err);
    return bad(err?.detail || "Subscription failed.", res.status || 500);
  } catch (e: any) {
    console.error("[subscribe] Fatal:", e?.message || e);
    return bad("Subscription failed.", 500);
  }
}
