// app/survivor/page.jsx
export const metadata = {
  title: "Survivor — Skol Sisters",
  description: "Vote in the weekly poll, see live results, and join the conversation.",
};

export default function SurvivorPage() {
  // Keep the page a server component and load interactivity in the client child.
  return (
    <div className="container mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-4xl font-extrabold tracking-tight text-white">Survivor</h1>
      <p className="mt-2 text-lg text-white/70">
        Vote in the weekly poll and see live results.
      </p>

      {/* Client-side UI */}
      <SurvivorClient />
    </div>
  );
}

/* ---- Lazy import of client component to keep this file server-only ---- */
import dynamic from "next/dynamic";
const SurvivorClient = dynamic(() => import("./SurvivorClient"), { ssr: false });
