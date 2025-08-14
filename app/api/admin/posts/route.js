import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/adminAuth";
import { createOrUpdateFile } from "@/lib/github";

export const runtime = "nodejs";

function slugify(s) {
  return String(s || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export async function POST(request) {
  const denied = await requireAdminAuth(request);
  if (denied) return denied;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { title, date, excerpt, tags = [], draft = false, content = "" } = body || {};
  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

  const slug = slugify(title);
  const fm = [
    "---",
    `title: ${JSON.stringify(title)}`,
    date ? `date: ${JSON.stringify(date)}` : null,
    excerpt ? `excerpt: ${JSON.stringify(excerpt)}` : null,
    Array.isArray(tags) && tags.length ? `tags: [${tags.map((t) => JSON.stringify(t)).join(", ")}]` : null,
    `draft: ${!!draft}`,
    "---",
    "",
  ]
    .filter(Boolean)
    .join("\n");

  const md = fm + (content || "");
  const b64 = Buffer.from(md).toString("base64");
  const path = `content/posts/${slug}.md`;

  const gh = await createOrUpdateFile(path, b64, `Save post ${slug}`);
  if (!gh?.ok) {
    return NextResponse.json({ error: "GitHub save failed", details: gh }, { status: 500 });
  }
  return NextResponse.json({ ok: true, slug, path });
}
