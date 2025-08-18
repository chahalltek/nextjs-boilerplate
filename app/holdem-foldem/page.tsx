import ThreadClient from "@/components/hef/ThreadClient";

export const dynamic = "force-dynamic";

export default function HoldEmFoldEmPage() {
  return (
    <main className="container max-w-3xl py-10 space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Hold ’em Fold ’em</h1>
        <p className="text-white/70">Weekly picks with community replies and quick reactions.</p>
      </header>
      <ThreadClient />
    </main>
  );
}
