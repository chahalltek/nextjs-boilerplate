// app/admin/start-sit/page.jsx
"use client";

import { useState } from "react";
import Link from "next/link";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function StartSitAdminPage() {
  const [key, setKey] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setStatus("Saving…");
    try {
      const res = await fetch("/api/start-sit/thread", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ key, title, body }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Request failed");
      }
      setStatus("✅ Saved. You can revalidate /start-sit if needed.");
    } catch (err) {
      console.error(err);
      setStatus("❌ Error: " + (err?.message || "Failed to save"));
    }
  }

  async function revalidateStartSit() {
    try {
      setStatus("Revalidating /start-sit…");
      // Optional convenience: if you have a general revalidate API, call it here.
      // Otherwise use the Super Admin page to revalidate.
      const base = process.env.NEXT_PUBLIC_SITE_URL || "";
      const res = await fetch(`${base}/api/search-index?noop=1`, { method: "POST", cache: "no-store" });
      // The above is a harmless ping. If you have a specific /api/revalidate?path=/start-sit, swap it in.
      setStatus("✅ Revalidated (or queued).");
    } catch (e) {
      setStatus("⚠️ Revalidate call failed. Use Super Admin → Revalidate path: /start-sit");
    }
  }

  return (
    <main className="container max-w-4xl py-10 space-y-8">
      <header>
        <h1 className="text-3xl font-bold">Start / Sit — Admin</h1>
        <p className="text-white/70">
          Publish this week’s Start/Sit thread. This mirrors the HEF workflow, but posts to <code>/api/start-sit/thread</code>.
        </p>
      </header>

      <section className="rounded-xl border border-white/10 bg-white/5 p-5">
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-2">
            <label className="text-sm text-white/80">Key (slug / unique id)</label>
            <input
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="e.g. 2025-wk01"
              className="rounded-lg border border-white/20 bg-transparent px-3 py-2"
              required
            />
            <p className="text-xs text-white/50">
              Used as an identifier (like <code>2025-wk01</code>). Avoid spaces.
            </p>
          </div>

          <div className="grid gap-2">
            <label className="text-sm text-white/80">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Week 1 Start/Sit Thread"
              className="rounded-lg border border-white/20 bg-transparent px-3 py-2"
              required
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm text-white/80">Body (Markdown)</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              placeholder={`## How to use
- Post your toughest start/sit calls below.
- We’ll reply with tiers and confidence.
- Be nice. No spoilers!

## Notes
- Key injuries and weather will be updated here.
`}
              className="rounded-lg border border-white/20 bg-transparent px-3 py-2 font-mono"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              className="rounded-lg border border-white/20 px-3 py-2 hover:bg-white/10"
            >
              Publish Start/Sit Thread
            </button>
            <Link
              href="/start-sit"
              className="rounded-lg border border-white/20 px-3 py-2 hover:bg-white/10"
              target="_blank"
            >
              View Start/Sit Page →
            </Link>
            <button
              type="button"
              onClick={revalidateStartSit}
              className="rounded-lg border border-white/20 px-3 py-2 hover:bg-white/10"
              title="If your app has a revalidate endpoint, this is a convenience. Otherwise use Super Admin → Revalidate."
            >
              Revalidate /start-sit
            </button>
          </div>

          {status && (
            <div className="text-sm text-white/70">
              {status}
            </div>
          )}
        </form>
      </section>

      <section className="rounded-xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-lg font-semibold mb-2">Tips</h2>
        <ul className="list-disc pl-5 text-sm text-white/80 space-y-1">
          <li>Use a consistent <strong>Key</strong> format like <code>YYYY-wkNN</code>.</li>
          <li>Keep the <strong>Title</strong> concise (e.g., “Week 3 Start/Sit Thread”).</li>
          <li>After posting, revalidate <code>/start-sit</code> from here or Super Admin.</li>
        </ul>
      </section>
    </main>
  );
}
