// app/subscribe/page.jsx
import Link from "next/link";

export const metadata = {
  title: "Subscribe — Skol Sisters",
  description: "Get new posts and updates from The Skol Sisters.",
};

export default function SubscribePage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-12 min-h-[60vh]">
      <h1 className="text-3xl font-bold text-white mb-3">Subscribe</h1>

      <p className="text-white/80 mb-6">
        Pop your email in below and we’ll send you new posts, polls, and
        site updates. No spam.
      </p>

      {/* If/when you add a real provider form, drop it here */}
      <form
        onSubmit={(e) => e.preventDefault()}
        className="flex gap-2 items-center"
      >
        <input
          type="email"
          required
          placeholder="you@example.com"
          className="input w-full"
        />
        <button
          type="submit"
          className="px-4 py-2 rounded bg-[color:var(--skol-gold)] text-white font-semibold hover:brightness-110"
        >
          Subscribe
        </button>
      </form>

      <p className="text-white/60 text-sm mt-4">
        We respect your privacy. See our{" "}
        <Link href="/privacy" className="underline text-white">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}
