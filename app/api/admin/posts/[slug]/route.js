// app/api/admin/posts/[slug]/route.js
import { requireAdmin } from "@/lib/adminAuth";
import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs";

const POSTS_DIR = path.join(process.cwd(), "content", "blog");

function postPath(slug) {
  const safe = slug.replace(/[^\w\-]/g, "");
  return path.join(POSTS_DIR, `${safe}.md`);
}

export async function GET(_req, { params }) {
  const p = postPath(params.slug);
  try {
    const content = await fs.readFile(p, "utf8");
    return Response.json({ ok: true, data: { content } });
  } catch {
    return Response.json({ ok: false, error: "Not found" }, { status: 404 });
  }
}

export async function PUT(request, { params }) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const body = await request.json();
  const { title, date, excerpt, content } = body || {};
  if (!title || !content) {
    return Response.json({ ok: false, error: "Missing fields" }, { status: 400 });
  }

  const frontMatter =
    `---\n` +
    `title: "${title.replace(/"/g, '\\"')}"\n` +
    (date ? `date: "${date}"\n` : "") +
    (excerpt ? `excerpt: "${excerpt.replace(/"/g, '\\"')}"\n` : "") +
    `---\n\n`;

  await fs.mkdir(POSTS_DIR, { recursive: true });
  await fs.writeFile(postPath(params.slug), frontMatter + content, "utf8");

  return Response.json({ ok: true });
}

export async function DELETE(request, { params }) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  try {
    await fs.unlink(postPath(params.slug));
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false, error: "Not found" }, { status: 404 });
  }
}
