// app/api/admin/newsletter/recipients/route.ts
import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// ---------- auth ----------
function isAuthorized(req: Request) {
  const want = (process.env.ADMIN_API_KEY || "").trim();
  if (!want) return false;

  const h = req.headers;
  const bearer = h.get("authorization") || "";
  const xkey = h.get("x-admin-key") || "";
  if (bearer.toLowerCase().startsWith("bearer ")) {
    const token = bearer.slice(7).trim();
    if (token && token === want) return true;
  }
  if (xkey && xkey === want) return true;
  return false;
}

// ---------- small helpers ----------
function lc(s: string | null | undefined) {
  return (s || "").toLowerCase();
}

async function kvSetMembers(key: string): Promise<string[]> {
  try {
    const arr = (await kv.smembers(key)) as unknown as string[] | string | null;
    if (!arr) return [];
    return Array.isArray(arr) ? arr.map(lc) : [lc(arr as string)];
  } catch {
    return [];
  }
}

// ---------- mailchimp fetch ----------
async function fetchMailchimpSubscribed() {
  const API_KEY = (process.env.MAILCHIMP_API_KEY || "").trim();
  const PREFIX = (process.env.MAILCHIMP_SERVER_PREFIX || "").trim();
  const LIST   = (process.env.MAILCHIMP_LIST_ID || "").trim();

  const envPresent =
    !!API_KEY && !!PREFIX && !!LIST && API_KEY.endsWith(`-${PREFIX}`);

  if (!envPresent) {
    return {
      emails: [] as string[],
      debug: {
        mc_env_present: false,
        mc_reason:
          "Missing or mismatched MAILCHIMP_* env (check *_API_KEY, *_SERVER_PREFIX, *_LIST_ID).",
      },
    };
  }

  const url =
    `https://${PREFIX}.api.mailchimp.com/3.0/lists/${LIST}` +
    `/members?status=subscribed&count=1000&fields=members.email_address,total_items`;

  const auth = Buffer.from(`anystring:${API_KEY}`).toString("base64");

  const res = await fetch(url, {
    headers: {
      authorization: `Basic ${auth}`,
      accept: "application/json",
    },
    cache: "no-store",
  });

  const text = await res.text();
  if (!res.ok) {
    return {
      emails: [] as string[],
      debug: {
        mc_env_present: true,
        mc_status: res.status,
        mc_body: safeJson(text),
      },
    };
  }

  const json = safeJson(text) as {
    members?: { email_address?: string }[];
    total_items?: number;
  };
  const emails =
    json?.members?.map((m) => lc(m?.email_address))?.filter(Boolean) ?? [];

  return { emails, debug: { mc_env_present: true, mc_status: res.status } };
}

function safeJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

// ---------- GET ----------
export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const probeEmail = lc(url.searchParams.get("email"));
  const wantDebug = url.searchParams.get("debug") === "1";

  const { emails: mc, debug: mcDebug } = await fetchMailchimpSubscribed();
  const dlist = await kvSetMembers("newsletter:dlist");
  const suppressed = await kvSetMembers("newsletter:suppressed");

  // Build final recipient set: (mailchimp ∪ dlist) \ suppressed
  const final = new Set<string>();
  for (const e of mc) final.add(e);
  for (const e of dlist) final.add(e);
  for (const e of suppressed) final.delete(e);

  // Probe one email?
  if (probeEmail) {
    return NextResponse.json({
      ok: true,
      match: {
        email: probeEmail,
        in_mailchimp: mc.includes(probeEmail),
        in_dlist: dlist.includes(probeEmail),
        suppressed: suppressed.includes(probeEmail),
        included: final.has(probeEmail),
      },
      ...(wantDebug ? { debug: { mcDebug, counts: { mc: mc.length, dlist: dlist.length, suppressed: suppressed.length } } } : {}),
    });
  }

  // Full summary
  const body: any = {
    ok: true,
    count: final.size,
    recipients: Array.from(final), // include list for now; remove if you’d prefer only counts
    sources: {
      mailchimp_subscribed: mc.length,
      dlist: dlist.length,
      suppressed: suppressed.length,
    },
  };

  if (wantDebug) {
    body.debug = { mcDebug };
  }

  return NextResponse.json(body);
}
