// app/admin/email-audience/page.tsx
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getJson(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return res.json();
}

export default async function EmailAudienceAdmin() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "";
  let mc: any = null;
  let rs: any = null;
  try { mc = await getJson(`${base}/api/admin/mailchimp`); } catch (e) { mc = { ok: false, error: String(e) }; }
  try { rs = await getJson(`${base}/api/admin/resend`); } catch (e) { rs = { ok: false, error: String(e) }; }

  return (
    <main className="container max-w-6xl py-8 space-y-6">
      <h1 className="text-3xl font-bold">Email & Audience</h1>

      {/* Mailchimp */}
      <section className="rounded-xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-lg font-semibold mb-2">Mailchimp Audience</h2>
        {!mc?.ok ? (
          <p className="text-sm text-red-300">Unable to load Mailchimp: {mc?.error || "Unknown error"}</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-white/10 p-4">
              <div className="text-white/60 text-sm">List</div>
              <div className="text-xl font-semibold">{mc.list_name || "—"}</div>
            </div>
            <div className="rounded-lg border border-white/10 p-4">
              <div className="text-white/60 text-sm">Total Subscribers</div>
              <div className="text-2xl font-bold">{mc.total_subscribers ?? 0}</div>
            </div>
            <div className="rounded-lg border border-white/10 p-4">
              <div className="text-white/60 text-sm">30d Growth</div>
              <div className="text-2xl font-bold">{mc.growth_30d ?? 0}</div>
            </div>
          </div>
        )}

        {mc?.ok && (
          <div className="mt-5">
            <div className="text-sm text-white/70 mb-2">Recent signups</div>
            <div className="overflow-auto rounded-lg border border-white/10">
              <table className="w-full text-sm">
                <thead className="bg-white/10">
                  <tr>
                    <th className="text-left px-3 py-2">Email</th>
                    <th className="text-left px-3 py-2">Status</th>
                    <th className="text-left px-3 py-2">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {(mc.recent_signups || []).map((m: any, i: number) => (
                    <tr key={i} className="border-t border-white/10">
                      <td className="px-3 py-2">{m.email}</td>
                      <td className="px-3 py-2">{m.status}</td>
                      <td className="px-3 py-2">{m.ts ? new Date(m.ts).toLocaleString() : "—"}</td>
                    </tr>
                  ))}
                  {!mc.recent_signups?.length && (
                    <tr><td className="px-3 py-2 text-white/60" colSpan={3}>No recent signups.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Resend */}
      <section className="rounded-xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-lg font-semibold mb-2">Resend (Last 24h)</h2>
        {!rs?.ok ? (
          <p className="text-sm text-red-300">Unable to load Resend: {rs?.error || "Unknown error"}</p>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-white/10 p-4">
                <div className="text-white/60 text-sm">Events</div>
                <div className="text-2xl font-bold">{rs.summary?.count ?? 0}</div>
              </div>
              <div className="rounded-lg border border-white/10 p-4">
                <div className="text-white/60 text-sm">Delivered</div>
                <div className="text-2xl font-bold">{rs.summary?.byType?.delivered ?? 0}</div>
              </div>
              <div className="rounded-lg border border-white/10 p-4">
                <div className="text-white/60 text-sm">Bounced</div>
                <div className="text-2xl font-bold">{rs.summary?.byType?.bounced ?? 0}</div>
              </div>
            </div>

            <div className="mt-5">
              <div className="text-sm text-white/70 mb-2">Recent events</div>
              <div className="overflow-auto rounded-lg border border-white/10">
                <table className="w-full text-sm">
                  <thead className="bg-white/10">
                    <tr>
                      <th className="text-left px-3 py-2">Time</th>
                      <th className="text-left px-3 py-2">Type</th>
                      <th className="text-left px-3 py-2">To</th>
                      <th className="text-left px-3 py-2">Subject</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(rs.recent || []).map((e: any, i: number) => (
                      <tr key={i} className="border-t border-white/10">
                        <td className="px-3 py-2">{new Date(e.createdAt).toLocaleString()}</td>
                        <td className="px-3 py-2">{e.type}</td>
                        <td className="px-3 py-2">{Array.isArray(e.to) ? e.to.join(", ") : (e.to || "—")}</td>
                        <td className="px-3 py-2">{e.subject || "—"}</td>
                      </tr>
                    ))}
                    {!rs.recent?.length && (
                      <tr><td className="px-3 py-2 text-white/60" colSpan={4}>
                        No events yet. Be sure to configure a Resend webhook to
                        <code className="mx-1">/api/webhooks/resend</code>.
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
