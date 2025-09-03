// app/admin/email-audience/page.tsx
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type McSummary = {
  audienceName: string;
  listId: string;
  memberCount: number;
  unsubCount: number;
  cleanedCount: number;
  lastUpdated?: string;
};

type ResendSummary = {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  timeframe: string; // e.g. "24h"
};

async function fetchJson<T>(path: string): Promise<T> {
  // Use relative path + forward the incoming request cookies
  const cookieHeader = cookies().toString();
  const res = await fetch(path, {
    method: "GET",
    cache: "no-store",
    headers: { cookie: cookieHeader },
  });
  if (!res.ok) {
    throw new Error(`${path} ${res.status}`);
  }
  return res.json();
}

export default async function EmailAudience() {
  let mc: McSummary | null = null;
  let rs: ResendSummary | null = null;
  let mcErr = "";
  let rsErr = "";

  try {
    mc = await fetchJson<McSummary>("/api/admin/mailchimp");
  } catch (e: any) {
    mcErr = String(e?.message || e);
  }

  try {
    rs = await fetchJson<ResendSummary>("/api/admin/resend");
  } catch (e: any) {
    rsErr = String(e?.message || e);
  }

  return (
    <main className="container max-w-4xl py-10 space-y-6">
      <h1 className="text-3xl font-bold">Email & Audience</h1>

      {/* Mailchimp */}
      <section className="rounded-xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-xl font-semibold mb-2">Mailchimp Audience</h2>
        {mcErr ? (
          <p className="text-red-300">
            Unable to load Mailchimp: {mcErr}
          </p>
        ) : mc ? (
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <div className="text-white/70 text-sm">Audience</div>
              <div className="text-lg font-semibold">{mc.audienceName}</div>
              <div className="text-white/60 text-sm">List ID: {mc.listId}</div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-white/70 text-sm">Members</div>
                <div className="text-xl font-semibold">{mc.memberCount}</div>
              </div>
              <div>
                <div className="text-white/70 text-sm">Unsubscribed</div>
                <div className="text-xl font-semibold">{mc.unsubCount}</div>
              </div>
              <div>
                <div className="text-white/70 text-sm">Cleaned</div>
                <div className="text-xl font-semibold">{mc.cleanedCount}</div>
              </div>
            </div>
            {mc.lastUpdated && (
              <div className="sm:col-span-2 text-white/60 text-sm">
                Last updated: {mc.lastUpdated}
              </div>
            )}
          </div>
        ) : (
          <p className="text-white/70">Loading…</p>
        )}
      </section>

      {/* Resend */}
      <section className="rounded-xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-xl font-semibold mb-2">Resend (Last 24h)</h2>
        {rsErr ? (
          <p className="text-red-300">Unable to load Resend: {rsErr}</p>
        ) : rs ? (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <Stat label="Sent" value={rs.sent} />
            <Stat label="Delivered" value={rs.delivered} />
            <Stat label="Opened" value={rs.opened} />
            <Stat label="Clicked" value={rs.clicked} />
            <Stat label="Bounced" value={rs.bounced} />
          </div>
        ) : (
          <p className="text-white/70">Loading…</p>
        )}
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <div className="text-white/70 text-sm">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}
