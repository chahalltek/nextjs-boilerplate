export default function HomePage() {
  return (
    <section className="container py-16">
      <h1 className="text-4xl md:text-6xl font-extrabold">Skol Sisters</h1>
      <p className="text-white/80 mt-4 text-lg">
        Smart, sisterly fantasy football advice—with Skol spirit.
      </p>
      <div className="mt-8 grid gap-4">
        <a href="/episodes" className="underline">Episodes</a>
        <a href="/start-sit" className="underline">Start/Sit</a>
        <a href="/blog" className="underline">Blog</a>
        <a href="/subscribe" className="underline">Subscribe</a>
      </div>
    </section>
  );
}