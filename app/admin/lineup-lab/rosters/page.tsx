// app/admin/lineup-lab/rosters/page.tsx
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import Link from "next/link";
import { listRosterIds, getRoster } from "@/lib/roster/store";

export default async function RostersListPage() {
  const ids = await listRosterIds();
  const rows = await Promise.all(
    ids.map(async (id) => {
      const r = await getRoster(id);
      return {
        id,
        name: r?.name || "",
        email: r?.email || "",
        players: r?.players?.length || 0,
        scoring: r?.scoring || "PPR",
      };
    })
  );

  return (
    <main className="container max-w-5xl py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Rosters</h1>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-white/70">
            <tr className="border-b border-white/10">
              <th className="text-left p-3">Team</th>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Players</th>
              <th className="text-left p-3">Scoring</th>
              <th className="text-left p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-white/10">
                <td className="p-3">
                  <div className="font-medium">{r.name || "(untitled)"}</div>
                  <div className="text-xs text-white/50">{r.id.slice(0, 10)}…</div>
                </td>
                <td className="p-3">{r.email}</td>
                <td className="p-3">{r.players}</td>
                <td className="p-3">{r.scoring}</td>
                <td className="p-3">
                  <Link
                    href={`/admin/lineup-lab/rosters/${r.id}`}
                    className="text-sm border border-white/20 rounded px-3 py-1 hover:bg-white/10"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td className="p-4 text-white/60" colSpan={5}>
                  No rosters yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
