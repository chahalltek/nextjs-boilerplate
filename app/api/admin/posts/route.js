import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/adminAuth";
import { commitFile } from "@/lib/github";

function fm(s) { return String(s || "").replace(/"/g, '\\"'); }

export async function POST(req) {
  const gate = requireAdminAuth();
  if (!gate.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { slug, title, date, excerpt, content, coverImage } = body;

  if (!slug || !title) {
    return NextResponse.json({ error: "Missing slug/title" }, { status: 400 });
  }

  const frontmatter =
`---
title: "${fm(title)}"
${date ? `date: ${date}\n` : ""}${excerpt ? `excerpt: "${fm(excerpt)}"\n` : ""}${coverImage ? `coverImage: "${fm(coverImage)}"\n` : ""}---
`;

  const md = `${frontmatter}\n${content || ""}\n`;
  const path = `content/blog/${slug}.md`;

  await commitFile({
    path,
    content: md,
    message: `Add/Update blog post: ${slug}`,
  });

  return NextResponse.json({ ok: true });
}
