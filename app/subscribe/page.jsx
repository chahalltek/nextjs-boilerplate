export const metadata = { title: "Subscribe — The Skol Sisters" };

export default function SubscribePage({ searchParams }) {
  const ok = searchParams?.ok === "1";

  return (
    <div className="container py-12 max-w-2xl">
      <h1 className="text-3xl md:text-4xl font-bold">Subscribe</h1>
      <p className="text-white/80 mt-2">
        Get the weekly newsletter with sit/start picks, waiver targets, and Survivor takes.
      </p>

      {ok && (
        <p className="mt-4 p-3 rounded bg-green-600/20 border border-green-600/40">
          You're in! Check your inbox.
        </p>
      )}

      <form
        className="bg-white/5 border border-white/10 rounded-xl p-6 mt-6 grid gap-4"
        method="post"
        action="/api/subscribe"
      >
        <input
          className="px-3 py-2 rounded bg-white/10 border border-white/20 placeholder-white/50"
          type="email"
          name="email"
          placeholder="you@domain.com"
          required
        />
        <button
          className="px-4 py-3 rounded bg-[color:var(--skol-gold)] text-black font-semibold hover:opacity-90"
          type="submit"
        >
          Subscribe
        </button>
        <p className="text-xs text-white/60">By subscribing you agree to our privacy policy.</p>
      </form>
    </div>
  );
}