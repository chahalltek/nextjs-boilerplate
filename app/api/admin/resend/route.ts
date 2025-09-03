// app/api/admin/resend/route.ts
import { getEvents, getSummary } from "@/lib/_state/resendEvents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const summary = getSummary();
  const recent  = getEvents(10);
  return Response.json({ ok: true, summary, recent });
}
