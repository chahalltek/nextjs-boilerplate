import SurvivorClient from "./survivor-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Survivor — Skol Sisters",
  description: "Weekly poll + comments.",
};

async function getPollList() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/polls`, { cache: "no-store" })
                .catch(() => null);
  const j = await res?.json().catch(() => null);
  return j?.polls ?? [];
}

export default async function SurvivorPage() {
  const polls = await getPollList();
  const first = polls.find(p => p.active) || polls[0] || null;
  return <SurvivorClient polls={polls} initialSlug={first?.slug ?? null} />;
}
