// app/refer/page.tsx
import { Suspense } from "react";
import Link from "next/link";
import ReferClient from "./ReferClient";

export const dynamic = "force-static";

export default function ReferPage() {
  return (
    <div className="container max-w-3xl py-10 space-y-6">
      <h1 className="text-2xl font-bold">Invite a friend</h1>
      <p className="text-white/70">
        Share your link with friends. If you arrived here from a signup redirect,
        we’ll show your shareable link below.
      </p>

      <Suspense fallback={<div className="text-white/60">Loading…</div>}>
        <ReferClient />
      </Suspense>

      <div className="text-sm text-white/50">
        <Link href="/">← Back to home</Link>
      </div>
    </div>
  );
}
