// app/api/admin/posts/route.js
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { listDir } from "@/lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const denied = requireAdmin();
  if (denied) return denied;

  try {
    const items = await listDir("content/blog");
    const posts = (items || [])
      .filter((x) => x.type === "file" && x.name.endsWith(".md"))
      .map((x) => ({ slug: x.name.replace(/\.md$/, ""), path: x.path }));
    return NextResponse.json({ ok: true, posts });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
