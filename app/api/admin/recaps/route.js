// app/api/admin/recaps/route.js
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { listDir, getFile, commitFile } from "@/lib/github";
import matter from "gray-matter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIR = "content/recaps";

/** Normalize tags from string | string[] -> string[] */
function normalizeTags(t) {
  if (!t) return [];
  if (Array.isArray(t)) return t.map(String).map((x) => x.trim()).filter(Boolean);
  if (typeof t === "string") {
    return t.split(",").map((x) => x.trim()).filter(Boolean);
  }
  return [];
}

/** Build MD with front-matter */
function buildMarkdown({ title, date, excerpt, published, content, tags }) {
  const fm = {
    title: title || "",
    date: date || new Date().toISOString().slice(0, 10),
    excerpt: excerpt || "",
    published: !!published,
    ...(Array.isArray(tags) && tags.length ? { tags } : {}),
  };
  return matter.stringify(content || "", fm);
}

export async function GET() {
  const denied = requireAdmin();
  if (denied) return denied;

  try {
    const items = await listDir(DIR); // [{name, path, type, sha, ...}]
    const mdFiles = items.filter((it) => it.type === "file" && it.name.endsWith(".md"));

    const recaps = [];
    for (const f of mdFiles) {
      const file = await getFile(f.path);
      if (!file?.contentBase64) continue;

      const raw = Buffer.from(file.contentBase64, "base64").toString("utf8");
      const parsed = matter(raw);
      const fm = parsed.data || {};
      const slug = f.name.replace(/\.md$/, "");

      // ensure tags is array<string>
      const tags = Array.isArray(fm.tags)
        ? fm.tags.map(String).map((x) => x.trim()).filter(Boolean)
        : normalizeTags(fm.tags);

      recaps.push({
        slug,
        title: fm.title || slug,
        date: fm.date || "",
        excerpt: fm.excerpt || "",
        published: !!fm.published,
        tags,
      });
    }

    // newest first by date (fallback slug)
    recaps.sort((a, b) => (b.date || b.slug).localeCompare(a.date || a.slug));
    return NextResponse.json({ ok: true, recaps });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}

export async function POST(request) {
  const denied = requireAdmin();
  if (denied) return denied;

  try {
    const body = await request.json().catch(() => ({}));
    const { slug, title, date, excerpt, published, content, tags: rawTags } = body || {};
    if (!slug || !title) {
      return NextResponse.json({ ok: false, error: "Missing slug or title" }, { status: 400 });
    }

    const tags = normalizeTags(rawTags);
    const md = buildMarkdown({ title, date, excerpt, published, content, tags });
    const base64 = Buffer.from(md, "utf8").toString("base64");
    const path = `${DIR}/${slug}.md`;

    const gh = await commitFile({
      path,
      contentBase64: base64,
      message: `recap: ${slug}`,
    });

    return NextResponse.json({ ok: true, commit: gh.commit, path });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
