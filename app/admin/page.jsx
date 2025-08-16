"use client";

import Link from "next/link";

export default function AdminHome() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">Admin</h1>

      <div className="grid sm:grid-cols-2 gap-4">
        <Link href="/admin/posts" className="card p-5 hover:bg-white/5">
          <div className="text-xl font-semibold">Blog</div>
          <div className="text-white/70 text-sm">Create/edit posts, upload images</div>
        </Link>

        <Link href="/admin/polls" className="card p-5 hover:bg-white/5">
          <div className="text-xl font-semibold">Polls</div>
          <div className="text-white/70 text-sm">Create/hide polls and manage results</div>
        </Link>

        <Link href="/admin/recaps" className="card p-5 hover:bg-white/5">
          <div className="text-xl font-semibold">Weekly Recap</div>
          <div className="text-white/70 text-sm">Post weekly CWS write-ups</div>
        </Link>
      </div>
    </div>
  );
}
