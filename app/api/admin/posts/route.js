// app/api/admin/posts/route.js
import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/adminAuth";
import { getAllPosts } from "@/lib/posts";

export const runtime = "nodejs";

/**
 * List posts for the Admin UI.
 * (Uses the local posts loader; feel free to swap to GitHub later.)
 */
export async function GET() {
  const denied = requireAdminAuth();
  if (denied) return denied;

  const posts = getAllPosts().map((p) => ({
    slug: p.slug,
    title: p.title,
    date: p.date || null,
    draft: !!p.draft,
    excerpt: p.excerpt || "",
    tags: p.tags || [],
  }));

  return NextResponse.json({ ok: true, posts });
}

/**
 * Creating/updating via API can be wired to GitHub later.
 * For now we return 501 so the build succeeds and the list works.
 */
export async function POST(request) {
  const denied = requireAdminAuth();
  if (denied) return denied;

  return NextResponse.json(
    { ok: false, error: "POST /api/admin/posts not implemented yet." },
    { status: 501 }
  );
}
