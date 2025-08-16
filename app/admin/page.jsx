// app/admin/page.jsx
import Link from "next/link";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const cards = [
  {
    href: "/admin/posts",
    title: "Blog",
    desc: "Write posts and upload images. Commits to content/posts/…",
    emoji: "📝",
  },
  {
    href: "/admin/cws",
    title: "Weekly Recap",
    desc: "Post your weekly ‘Coulda, Woulda, Shoulda’ recap.",
    emoji: "⏪",
  },
  {
    href: "/admin/holdem-foldem",
    title: "Hold ’em / Fold ’em",
    desc: "Stash-or-trash advice: injuries, usage, and matchups.",
    emoji: "🃏",
  },
  {
    href: "/admin/polls",
    title: "Survivor",
    desc: "Create/manage polls shown on the Survivor page.",
    emoji: "🏝️",
  },
];

export default function AdminHome() {
  return (
    <div className="container max-w-5xl py-10">
      <h1 className="text-3xl font-bold mb-6">Admin</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="block rounded-xl border border-white/10 bg-white/5 p-5 hover:bg-white/10 transition"
          >
            <div className="text-2xl mb-2">{c.emoji}</div>
            <div className="text-lg font-semibold">{c.title}</div>
            <p className="text-sm text-white/70 mt-1">{c.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
