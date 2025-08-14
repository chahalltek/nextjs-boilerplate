import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/adminAuth";
import { commitFile } from "@/lib/github";

export async function POST(req) {
  const gate = requireAdminAuth();
  if (!gate.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { slug, question, options, status = "active" } = body;

  if (!slug || !question || !Array.isArray(options) || options.length < 2) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const json = JSON.stringify({ slug, question, options, status }, null, 2) + "\n";
  const path = `data/polls/${slug}.json`;

  await commitFile({
    path,
    content: json,
    message: `Add/Update poll: ${slug}`,
  });

  return NextResponse.json({ ok: true });
}
