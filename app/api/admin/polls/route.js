// app/api/admin/polls/route.ts
import { requireAdmin } from "@/lib/adminAuth";
import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs";

const POLLS_DIR = path.join(process.cwd(), "content", "polls");

export async function POST(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const body = await request.json();
  const { slug, title, question, options } = body || {};
  if (!slug || !title || !question || !Array.isArray(options) || options.length < 2) {
    return new Response(JSON.stringify({ ok: false, error: "Invalid payload" }), { status: 400 });
  }

  await fs.mkdir(POLLS_DIR, { recursive: true });
  const safe = String(slug).replace(/[^\w\-]/g, "");
  const file = path.join(POLLS_DIR, `${safe}.json`);
  await fs.writeFile(file, JSON.stringify({ slug: safe, title, question, options }, null, 2));
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}
