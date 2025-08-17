// app/api/admin/recaps/route.js
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { listDir, getFile, commitFile } from "@/lib/github";
import matter from "gray-matter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIR = "content/recaps";

function normTags(tags) {
  if (!tags) return undefined;
  if (Array.isArray(tags)) return tags.map(String).map((t) => t.trim()).filter(Boolean);
  if (typeof tags === "string") {
    const arr = tags.split(",").map((t) => t.trim()).filter(Boolean);
    return arr.length ? arr : undefined;
  }
  return undefined;
}

function buildMarkdown({ title, date, excerpt, published, publishAt, tags, content }) {
  const fm = {
    title: title || "",
    date: date || new Date().toISOString().slice(0, 10),
    excerpt: excerpt || "",
    published: !!published,
    ...(publishAt ? { publishAt } : {}),
    ...(normTags(tags) ? { tags: normTags(tags) } : {}),
  };
  return matter.stringify(content || "", fm);
}

export async function GET() {
  const denied = requireAdmin();
  if (denied) return denied;

  try {
    const items = await listDir(DIR);
    const mdFiles = items.filter((it) => it.type === "file" && it.name.endsWith(".md"));

    const recaps = [];
    for (const f of mdFiles) {
      const file = await getFile(f.path);
      if (!file?.contentBase64) continue;
      const raw = Buffer.from(file.contentBase64, "base64").toString("utf8");
      const parsed = matter(raw);
      const fm = parsed.data || {};
      const slug = f.name.replace(/\.md$/, "");
      recaps.push({
        slug,
        title: fm.title || slug,
        date: fm.date || "",
        excerpt: fm.excerpt || "",
        published: !!fm.published,
        publishAt: fm.publishAt || "",
        tags: Array.isArray(fm.tags) ? fm.tags : [],
      });
    }

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
    const { slug, title, date, excerpt, published, publishAt, tags, content } = body || {};
    if (!slug || !title) {
      return NextResponse.json({ ok: false, error: "Missing slug or title" }, { status: 400 });
    }

    const md = buildMarkdown({ title, date, excerpt, published, publishAt, tags, content });
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
