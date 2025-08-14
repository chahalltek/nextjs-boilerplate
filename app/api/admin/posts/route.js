// app/api/admin/posts/route.js
import { requireAdmin } from "@/lib/adminAuth";
import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs";

const POSTS_DIR = path.join(process.cwd(), "content", "blog");

export async function POST(request) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const { slug } = await request.json();
  if (!slug) return Response.json({ ok: false, error: "Missing slug" }, { status: 400 });

  // Create empty placeholder if not exists
  await fs.mkdir(POSTS_DIR, { recursive: true });
  const p = path.join(POSTS_DIR, `${slug.replace(/[^\w\-]/g, "")}.md`);
  await fs.writeFile(p, "---\n---\n", "utf8");
  return Response.json({ ok: true });
}
