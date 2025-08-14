import { NextResponse } from "next/server";
import matter from "gray-matter";
import { requireAdminAuth } from "@/lib/adminAuth";
import { createOrUpdateFile } from "@/lib/github"; // your existing GitHub helper

export const runtime = "nodejs";

export async function POST(request) {
  const denied = requireAdminAuth(request);
  if (denied) return denied;

  const { title, slug, excerpt, draft, content } = await request.json();

  if (!title || !slug) {
    return NextResponse.json({ error: "title and slug required" }, { status: 400 });
  }

  const fm = matter.stringify(content || "", {
    title,
    date: new Date().toISOString(),
    excerpt: excerpt || "",
    draft: !!draft,
  });

  const path = `content/posts/${slug}.md`;

  // Save via GitHub API (base64 content per your helper)
  const res = await createOrUpdateFile(
    path,
    Buffer.from(fm).toString("base64"),
    `Save post ${path}`
  );

  if (!res?.ok) {
    return NextResponse.json(
      { error: "GitHub save failed", details: res },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
