// app/page.tsx
import Link from "next/link";

export const metadata = {
  title: "The Skol Sisters",
  description:
    "Smart, sisterly fantasy football advice—with Skol spirit.",
};

export default function Home() {
  return (
    <section className="container py-16">
      <h1 className="text-4xl md:text-6xl font-extrabold">The Skol Sisters</h1>
      <p className="text-white/80 mt-4 text-lg">
        Smart, sisterly fantasy football advice—with Skol spirit.
      </p>

      <div className="mt-8 grid gap-4">
        <Link href="/episodes" className="underline">Episodes</Link>
        <Link href="/start-sit" className="underline">Start/Sit</Link>
        <Link href="/blog" className="underline">Blog</Link>
        <Link href="/subscribe" className="underline">Subscribe</Link>
      </div>
    </section>
  );
}
