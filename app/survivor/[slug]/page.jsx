import { getPollBySlug } from "@/lib/survivorPolls";
import HyvorComments from "@/components/HyvorComments";

export default function SurvivorPollPage({ params }) {
  const poll = getPollBySlug(params.slug);
  if (!poll) return <div className="container py-12">Poll not found.</div>;

  return (
    <div className="container py-12 max-w-3xl grid gap-8">
      {/* poll UI you already have */}
      <h1 className="text-3xl font-bold">{poll.question}</h1>
      {/* ... your Poll component & results ... */}

      {/* Per-poll comments */}
      <div className="mt-8">
        <HyvorComments pageId={`survivor-${poll.slug}`} title={poll.question} />
      </div>
    </div>
  );
}
