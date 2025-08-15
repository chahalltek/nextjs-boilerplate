// app/api/admin/posts/[slug]/route.js
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { commitFile, getFile, listDir } from "@/lib/github";
import matter from "gray-matter";

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

async function pickExistingDir() {
  for (const dir of CANDIDATES) {
    const entries = await listDir(dir);
    if (entries !== null) return dir; // first existing directory
  }
  return "app/content/posts";
}

export async function GET(_req, { params }) {
  const denied = requireAdmin();
  if (denied) return denied;

  const slug = params?.slug;
  if (!slug) {
    return NextResponse.json({ ok: false, error: "Missing slug" }, { status: 400 });
  }

  // Try both md and mdx across all candidate dirs
  for (const dir of CANDIDATES) {
    for (const ext of ["md", "mdx"]) {
      const path = `${dir}/${slug}.${ext}`;
      try {
        const f = await getFile(path);
        if (f?.contentBase64) {
          const raw = Buffer.from(f.contentBase64, "base64").toString("utf8");
          const fm = matter(raw);
          return NextResponse.json({
            ok: true,
            data: { frontmatter: fm.data, content: fm.content, path },
          });
        }
      } catch {
        // keep trying
      }
    }
  }

  return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
}

export async function PUT(request, { params }) {
  const denied = requireAdmin();
  if (denied) return denied;

  const slug = params?.slug;
  if (!slug) {
    return NextResponse.json({ ok: false, error: "Missing slug" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const { title, excerpt, date, content } = body || {};
  if (!title || !content) {
    return NextResponse.json({ ok: false, error: "Missing title or content" }, { status: 400 });
  }

  const fm = {
    title,
    excerpt: excerpt || "",
    date: date || new Date().toISOString().slice(0, 10),
  };
  const md = matter.stringify(content, fm);
  const base64 = Buffer.from(md, "utf8").toString("base64");

  const dir = await pickExistingDir();
  const path = `${dir}/${slug}.md`;

  try {
    const gh = await commitFile({
      path,
      contentBase64: base64,
      message: `post: ${slug}`,
    });
    return NextResponse.json({ ok: true, commit: gh.commit, path });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500 }
    );
  }
}
