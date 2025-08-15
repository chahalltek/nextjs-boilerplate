// app/api/admin/posts/route.js
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { listDir } from "@/lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CANDIDATES = [
  "app/content/posts",
  "content/posts",
  "app/content/blog",
  "content/blog",
];

function isPostFile(name) {
  return /\.(md|mdx)$/i.test(name);
}

async function resolveDirWithEntries() {
  // Prefer a dir that both exists and has MD/MDX files
  for (const dir of CANDIDATES) {
    try {
      const entries = await listDir(dir); // null if 404
      if (entries && entries.some((e) => e.type === "file" && isPostFile(e.name))) {
        return { dir, entries };
      }
    } catch {
      // ignore and keep trying
    }
  }
  // Otherwise, return the first one that exists (may be empty)
  for (const dir of CANDIDATES) {
    const entries = await listDir(dir);
    if (entries !== null) return { dir, entries: entries || [] };
  }
  // Nothing exists yet
  return { dir: "app/content/posts", entries: [] };
}

export async function GET() {
  const denied = requireAdmin();
  if (denied) return denied;

  try {
    const { dir, entries } = await resolveDirWithEntries();
    const posts = entries
      .filter((e) => e.type === "file" && isPostFile(e.name))
      .map((e) => ({
        slug: e.name.replace(/\.(md|mdx)$/i, ""),
        path: e.path,
      }));

    return NextResponse.json({ ok: true, dir, posts });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500 }
    );
  }
}
