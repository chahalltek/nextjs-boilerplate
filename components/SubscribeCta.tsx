"use client";
import Link from "next/link";
import { track } from "@/lib/analytics";

export default function SubscribeCta() {
  return (
    <Link
      href="/subscribe"
      className="cta-card"
      onClick={() => track("subscribe_click", { platform: "email" })}
    >
      <span className="cta-title">Email me when Episode 1 drops</span>
      <span className="cta-sub">No spam. Just vibes and football.</span>
    </Link>
  );
}