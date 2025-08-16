// app/subscribe/page.jsx
import Link from "next/link";
import SubscribeClient from "./SubscribeClient";

export const metadata = {
  title: "Subscribe — Hey Skol Sister",
  description: "Get Hey Skol Sister updates in your inbox.",
};

export const revalidate = 0; // keep it simple

export default function SubscribePage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-12 text-white">
      <h1 className="text-3xl font-bold mb-2">Subscribe</h1>
      <p className="text-white/80 mb-8">
        Get new posts, polls, and updates. No spam. Unsubscribe anytime.
      </p>

      {/* All client-side interactivity lives inside this component */}
      <SubscribeClient />

      <p className="text-xs text-white/60 mt-6">
        By subscribing you agree to our{" "}
        <Link href="/privacy" className="underline hover:text-white">
          Privacy Policy
        </Link>.
      </p>
    </div>
  );
}
