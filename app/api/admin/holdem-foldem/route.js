// app/api/admin/holdem-foldem/route.js
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { listDir, getFile } from "@/lib/github";
import matter from "gray-matter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIR = "content/holdfold";

export async function GET() {
  const denied = requireAdmin();
  if (denied) return denied;

  try {
    const entries = await listDir(DIR);
    const files = entries
      .filter((e) => e.type === "file" && e.name.endsWith(".md"))
      .map((e) => e.path);

    const out = [];
    for (const path of files) {
      const f = await getFile(path);
      if (!f) continue;
      const buf = Buffer.from(f.contentBase64, "base64");
      const { data, content } = matter(buf.toString("utf8"));
      const slug = path.split("/").pop().replace(/\.md$/, "");
      out.push({
        slug,
        title: data.title || slug.replace(/-/g, " "),
        date: data.date || null,
        // small preview only; full content edited from your own draft or loaded later
        excerpt: content.trim().slice(0, 180),
      });
    }

    // newest first by date (fallback: slug desc)
    out.sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      return db - da || b.slug.localeCompare(a.slug);
    });

    return NextResponse.json({ ok: true, items: out });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
