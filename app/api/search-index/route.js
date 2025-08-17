export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { listDir, getFile } from "@/lib/github";
import matter from "gray-matter";

const SOURCES = [
  { dir: "content/posts", base: "/blog", type: "post" },
  { dir: "content/recaps", base: "/cws", type: "recap" },
  { dir: "content/holdem-foldem", base: "/holdem-foldem", type: "holdem" }, // optional
];

async function collect() {
  const rows = [];
  for (const s of SOURCES) {
    const items = await listDir(s.dir);
    for (const it of items.filter((x) => x.type === "file" && x.name.endsWith(".md"))) {
      const f = await getFile(it.path);
      const raw = f?.contentBase64 ? Buffer.from(f.contentBase64, "base64").toString("utf8") : "";
      const { data, content } = matter(raw);
      if (data?.published === false) continue;
      const slug = it.name.replace(/\.md$/, "");
      rows.push({
        type: s.type,
        url: `${s.base}/${encodeURIComponent(slug)}`,
        slug,
        title: data?.title || slug,
        date: data?.date || "",
        excerpt: data?.excerpt || content.slice(0, 180),
        tags: Array.isArray(data?.tags) ? data.tags : [],
      });
    }
  }
  rows.sort((a, b) => (b.date || b.slug).localeCompare(a.date || a.slug));
  return rows;
}

export async function GET() {
  const rows = await collect();
  return NextResponse.json({ ok: true, rows }, { headers: { "Cache-Control": "no-store" } });
}
