// app/api/nfl/week/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  // 1) allow manual override in env (helpful in preseason / playoffs)
  const envWeek = Number(process.env.NFL_CURRENT_WEEK);
  if (Number.isFinite(envWeek) && envWeek > 0) {
    return NextResponse.json({ week: envWeek });
  }

  // 2) super-light heuristic: weeks start on Tue, regular season ~18 weeks
  const seasonStart = new Date(new Date().getFullYear(), 8, 3); // Sep 3rd (approx)
  const now = new Date();
  const days = Math.floor((now.getTime() - seasonStart.getTime()) / (1000 * 60 * 60 * 24));
  const week = Math.max(1, Math.min(18, Math.floor(days / 7) + 1));

  return NextResponse.json({ week });
}
