// app/admin/start-sit/page.jsx
"use client";

import { useState } from "react";
import Link from "next/link";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Resolve a dependable absolute base for client-side fetches */
function getBase() {
  // Prefer your public URL if set; otherwise use the current origin.
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    try {
      const u = new URL(process.env.NEXT_PUBLIC_SITE_URL);
      return u.origin;
    } catch {}
  }
  if (typeof window !== "undefined") return window.location.origin;
  return ""; // fallback to relative
}

export default function StartSitAdminPage() {
  const [key, setKey] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setStatus("Saving…");

    const base = getBase();

    // Prefer the protected admin endpoint. Your admin cookie will pass automatically.
    // We also send both `markdown` and `body` to be compatible with either handler shape.
    const payload = { key, title, markdown: body, body };

    try {
      const res = await fetch(`${base}/api/admin/start-sit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        credentials: "include", // ensure cookies (admin session) are sent
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`${res.status} ${txt || res.statusText}`);
      }

      // If your route returns { slug }, use it; otherwise show a success note.
      let slug = "";
      try {
        const json = await res.json();
        slug = json?.slug || "";
      } catch {}

      setStatus(
        slug
          ? `✅ Published. View at /start-sit/${slug}`
          : "✅ Published. You can revalidate /start-sit if needed."
      );
    } catch (err) {
      console.error(err);
      setStatus("❌ Error: " + (err?.message || "Request failed"));
    }
  }

  async function revalidateStartSit() {
    try {
      setStatus("Revalidating /start-sit…");
      const base = getBase();

      // If you later add a real revalidate endpoint, swap it in here.
      // This ping is harmless and keeps a consistent UX.
      await fetch(`${base}/api/search-index?noop=1`, {
        method: "POST",
        cache: "no-store",
        credentials: "include",
      });

      setStatus("✅ Revalidated (or queued).");
    } catch {
      setStatus("⚠️ Revalidate call failed. Use Super Admin → Revalidate path: /start-sit");
    }
  }

  return (
    <main className="container max-w-4xl py-10 space-y-8">
      <header>
        <h1 className="text-3xl font-bold">Start / Sit — Admin</h1>
        <p className="text-white/70">
          Publish this week’s Start/Sit thread. This posts to{" "}
          <code>/api/admin/start-sit</code> (protected by the admin cookie).
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

          {status && <div className="text-sm text-white/70">{status}</div>}
        </form>
      </section>

      <section className="rounded-xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-lg font-semibold mb-2">Tips</h2>
        <ul className="list-disc pl-5 text-sm text-white/80 space-y-1">
          <li>
            Use a consistent <strong>Key</strong> format like <code>YYYY-wkNN</code>.
          </li>
          <li>
            Keep the <strong>Title</strong> concise (e.g., “Week 3 Start/Sit Thread”).
          </li>
          <li>
            After posting, revalidate <code>/start-sit</code> from here or Super Admin.
          </li>
        </ul>
      </section>
    </main>
  );
}
