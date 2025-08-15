// app/survivor/page.jsx
"use client";

import Poll from "@/components/Poll";

export const runtime = "nodejs";
export const metadata = {
  title: "Survivor — Skol Sisters",
  description: "Weekly poll + comments.",
};

export default function SurvivorPage() {
  return (
    <div className="container py-10 max-w-3xl space-y-6">
      <h1 className="text-3xl font-bold">Survivor</h1>
      <p className="text-white/70">Vote in the weekly poll and see live results.</p>
      <Poll />
    </div>
  );
}
