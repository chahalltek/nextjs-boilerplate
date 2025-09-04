import { NextResponse } from "next/server";

function need(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

async function fetchAllSubscribed(): Promise<string[]> {
  const KEY  = need("MAILCHIMP_API_KEY");
  const LIST = need("MAILCHIMP_LIST_ID");
  const DC   = need("MAILCHIMP_SERVER_PREFIX");

  const all: string[] = [];
  let offset = 0;
  const count = 1000;

  while (true) {
    const url = `https://${DC}.api.mailchimp.com/3.0/lists/${LIST}/members?` +
      new URLSearchParams({
        status: "subscribed",
        count: String(count),
        offset: String(offset),
        fields: "members.email_address,total_items",
        exclude_fields: "_links",
      }).toString();

    const res = await fetch(url, {
      headers: { Authorization: `apikey ${KEY}` },
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`Mailchimp ${res.status}: ${await res.text()}`);
    }
    const json = await res.json();
    const batch = (json.members || []).map((m: any) => m.email_address as string);
    all.push(...batch);
    if (batch.length < count) break;
    offset += count;
  }
  return all;
}

export async function GET(req: Request) {
  try {
    const auth = req.headers.get("authorization") || "";
    const expected = process.env.ADMIN_API_KEY || "";
    if (!expected || !auth.endsWith(expected)) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const q = new URL(req.url).searchParams;
    const probe = (q.get("email") || "").toLowerCase().trim();

    const emails = await fetchAllSubscribed();
    const includes = probe ? emails.some(e => e.toLowerCase() === probe) : undefined;

    return NextResponse.json({
      ok: true,
      total: emails.length,
      includesEmail: includes,
      sampleFirst: emails.slice(0, 5),
      sampleLast: emails.slice(-5),
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
