import { NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs";
import matter from "gray-matter";
import { createOrUpdateFile } from "@/lib/github";

export const runtime = "nodejs";

const ROOT = process.cwd();

export async function GET(_: Request, { params }: { params: { slug: string } }) {
  const p = path.join(ROOT, "content", "survivor", `${params.slug}.md`);
  if (!fs.existsSync(p)) return NextResponse.json({ ok: false, error: "not-found" }, { status: 404 });
  const raw = fs.readFileSync(p, "utf8");
  const fm = matter(raw);
  return NextResponse.json({ ok: true, data: { frontmatter: fm.data, content: fm.content } });
}

export async function PUT(req: Request, { params }: { params: { slug: string } }) {
  const data = await req.json();
  const {
    title = "",
    date = new Date().toISOString().slice(0, 10),
    excerpt = "",
    provider = "hyvor",
    embed = "",
    content = "",
    draft = true,
  } = data;

  const repoPath = `content/survivor/${params.slug}.md`;
  const md = matter.stringify(content, { title, date, excerpt, provider, embed, draft });
  const res = await createOrUpdateFile(repoPath, Buffer.from(md).toString("base64"), `Update poll ${repoPath}`);
  if (!res.ok) return NextResponse.json(res, { status: 500 });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_: Request, { params }: { params: { slug: string } }) {
  // (Optional) If you have a deleteFile() helper in lib/github, use it here.
  // Otherwise, you can leave DELETE unimplemented for now.
  return NextResponse.json({ ok: false, error: "not-implemented" }, { status: 501 });
}
