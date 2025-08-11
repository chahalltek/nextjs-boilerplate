import { NextResponse } from "next/server";

async function subscribeMailchimp(email) {
  const apiKey = process.env.MAILCHIMP_API_KEY;
  const dc = process.env.MAILCHIMP_DC;
  const listId = process.env.MAILCHIMP_LIST_ID;
  if (!apiKey || !dc || !listId) return { ok: false, reason: "missing-mailchimp-env" };

  const url = `https://${dc}.api.mailchimp.com/3.0/lists/${listId}/members`;
  const body = { email_address: email, status_if_new: "subscribed", status: "subscribed" };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${Buffer.from(`any:${apiKey}`).toString("base64")}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  if (res.status === 200 || res.status === 201) return { ok: true, provider: "mailchimp" };
  const json = await res.json().catch(() => ({}));
  if (res.status === 400 && json?.title?.includes("Member Exists")) return { ok: true, provider: "mailchimp", existed: true };
  return { ok: false, provider: "mailchimp", status: res.status, json };
}

async function subscribeConvertKit(email) {
  const apiKey = process.env.CONVERTKIT_API_KEY;
  const formId = process.env.CONVERTKIT_FORM_ID;
  if (!apiKey || !formId) return { ok: false, reason: "missing-convertkit-env" };

  const url = `https://api.convertkit.com/v3/forms/${formId}/subscribe`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: apiKey, email })
  });
  if (res.ok) return { ok: true, provider: "convertkit" };
  const json = await res.json().catch(() => ({}));
  return { ok: false, provider: "convertkit", status: res.status, json };
}

async function notifyResend(subject, text) {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.NOTIFY_EMAIL_TO;
  const from = process.env.NOTIFY_EMAIL_FROM || "Skol Sisters <no-reply@theskolsisters.com>";
  if (!key || !to) return { ok: false, reason: "missing-resend-env" };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
    body: JSON.stringify({ from, to, subject, text })
  });
  if (res.ok) return { ok: true, provider: "resend" };
  return { ok: false, provider: "resend", status: res.status };
}

async function logToGAS(payload) {
  const url = process.env.GOOGLE_APPS_SCRIPT_WEBAPP_URL;
  if (!url) return { ok: false, reason: "missing-gas-url" };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return { ok: res.ok, status: res.status };
}

export async function POST(request) {
  const contentType = request.headers.get("content-type") || "";
  let email = "";
  try {
    if (contentType.includes("application/json")) {
      const body = await request.json();
      email = (body.email || "").trim();
    } else {
      const form = await request.formData();
      email = (form.get("email") || "").toString().trim();
    }
  } catch {}

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: "invalid-email" }, { status: 400 });
  }

  let result = await subscribeMailchimp(email);
  if (!result.ok) result = await subscribeConvertKit(email);

  await logToGAS({ type: "subscribe", email, ts: new Date().toISOString(), provider: result.provider || null, ok: result.ok });
  await notifyResend("New subscriber", `Email: ${email}\nProvider: ${result.provider || "none"}\nOK: ${result.ok}`);

  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    const url = new URL(request.url);
    url.pathname = "/subscribe";
    url.searchParams.set("ok", result.ok ? "1" : "0");
    return NextResponse.redirect(url.toString(), { status: 303 });
  }

  return NextResponse.json({ ok: result.ok, provider: result.provider || null });
}