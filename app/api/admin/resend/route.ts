// app/api/admin/resend/route.ts
import { getEvents, getSummary } from "@/lib/_state/resendEvents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const KEY = process.env.RESEND_API_KEY || "";
  if (!KEY) {
    return Response.json(
      { ok: false, error: "Missing RESEND_API_KEY" },
      { status: 500 }
    );
  }

  // Last 24 hours ISO
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

  try {
    // Resend’s public API doesn’t have a perfect aggregate endpoint yet;
    // we fetch recent emails and summarize locally (best effort).
    const res = await fetch(
      `https://api.resend.com/emails?limit=100&created_at_gte=${encodeURIComponent(
        since
      )}`,
      {
        headers: {
          Authorization: `Bearer ${KEY}`,
          Accept: "application/json",
        },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return Response.json(
        { ok: false, error: `Resend ${res.status}: ${txt || "error"}` },
        { status: res.status }
      );
    }

    const json = await res.json();
    const items: any[] = json?.data || json?.items || [];

    const getStatus = (it: any) =>
      it?.status || it?.last_event?.type || it?.delivery_status || "";

    const createdAt = (it: any) =>
      new Date(it?.created_at || it?.createdAt || 0).getTime();

    const fresh = items.filter((it) => createdAt(it) >= Date.parse(since));

    const sent = fresh.length;
    const delivered = fresh.filter((it) =>
      /delivered/i.test(getStatus(it))
    ).length;
    const opened = fresh.filter((it) =>
      /open/i.test(getStatus(it))
    ).length;
    const bounced = fresh.filter((it) =>
      /bounce/i.test(getStatus(it))
    ).length;

    return Response.json({ ok: true, sent, delivered, opened, bounced });
  } catch (e: any) {
    return Response.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 }
    );
  }
}
