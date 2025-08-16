// app/api/admin/holdfold/route.js
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

    const items = [];
    for (const path of files) {
      const slug = path.split("/").pop().replace(/\.md$/, "");
      const file = await getFile(path);
      if (!file) continue;
      const buf = Buffer.from(file.contentBase64, "base64");
      const { data } = matter(buf.toString("utf8"));
      items.push({
        slug,
        title: data.title || slug.replace(/-/g, " "),
        date: data.date || null,
      });
    }

    // newest first
    items.sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      return db - da || b.slug.localeCompare(a.slug);
    });

    return NextResponse.json({ ok: true, items });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
