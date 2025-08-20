// app/refer/page.tsx
import { Suspense } from "react";
import Link from "next/link";

export const dynamic = "force-static"; // this page itself is static; the client subcomponent reads search params

export default function ReferPage() {
  return (
    <div className="container max-w-3xl py-10 space-y-6">
      <h1 className="text-2xl font-bold">Invite a friend</h1>
      <p className="text-white/70">
        Share your link with friends. If you arrived here from a signup redirect,
        we’ll show your shareable link below.
      </p>

      {/* Client subcomponent that uses useSearchParams, wrapped in Suspense (required) */}
      <Suspense fallback={<div className="text-white/60">Loading…</div>}>
        {/* @ts-expect-error Server/Client boundary */}
        <ReferClient />
      </Suspense>

      <div className="text-sm text-white/50">
        <Link href="/">← Back to home</Link>
      </div>
    </div>
  );
}
