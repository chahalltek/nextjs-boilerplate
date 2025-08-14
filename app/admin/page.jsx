"use client";

import Link from "next/link";

export default function AdminHome() {
  return (
    <div className="container py-12">
      <h1 className="text-3xl md:text-4xl font-bold">Admin</h1>
      <p className="text-white/70 mt-2">
        What would you like to manage today?
      </p>

      <div className="mt-8 grid md:grid-cols-2 gap-4">
        <Link href="/admin/posts" className="cta-card">
          <div className="cta-title">Blog Posts</div>
          <div className="cta-sub">
            Create, edit, upload cover images, and publish posts.
          </div>
        </Link>

        <Link href="/admin/polls" className="cta-card">
          <div className="cta-title">Polls</div>
          <div className="cta-sub">
            Create and manage Survivor/CWS polls.
          </div>
        </Link>
      </div>
    </div>
  );
}
