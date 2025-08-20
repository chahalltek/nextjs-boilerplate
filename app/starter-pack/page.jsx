// app/starter-pack/page.tsx
import { Suspense } from "react";

export const dynamic = "force-static"; // keeps SSG fast; client handles interactivity

export default function StarterPackPage() {
  return (
    <div className="container max-w-3xl py-10 space-y-6">
      <h1 className="text-2xl font-bold">Skol Starter Pack</h1>
      <p className="text-white/70">
        New to fantasy or Survivor? Drop your email and we’ll send a quick-start PDF plus weekly tips.
      </p>

      <Suspense fallback={<div className="text-white/60">Loading form…</div>}>
        {/* No function props passed across the boundary */}
        <StarterPackForm tag="starter-pack" source="starter-pack-page" />
      </Suspense>
    </div>
  );
}
