// app/survivor/[slug]/page.jsx
import Poll from "@/components/Poll";

export const runtime = "nodejs";

export default function SurvivorPollPage({ params }) {
  return (
    <div className="container py-10 max-w-3xl space-y-6">
      <Poll slug={params.slug} />
    </div>
  );
}
