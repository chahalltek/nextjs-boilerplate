import { NextResponse } from "next/server";
import matter from "gray-matter";
import { createOrUpdateFile, getFile } from "@/lib/github";

export const runtime = "nodejs";

export async function GET(_req, { params }) {
  const raw = await getFile(`content/posts/${params.slug}.md`);
  if (!raw) return NextResponse.json({ ok: false }, { status: 404 });
  const fm = matter(raw);
  return NextResponse.json({ ok: true, ...fm.data, content: fm.content });
}

export async function PUT(req, { params }) {
  const data = await req.json();
  const { title, date, excerpt, tags = [], content = "", draft = true } = data;
  const fm = matter.stringify(content, { title, date, excerpt, tags, draft });
  const path = `content/posts/${params.slug}.md`;
  const res = await createOrUpdateFile(path, Buffer.from(fm).toString("base64"), `Update post ${path}`);
  if (!res.ok) return NextResponse.json(res, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req, { params }) {
  // GitHub delete requires file SHA; quick workaround: overwrite with tombstone content? Better: fetch SHA then DELETE.
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || "main";
  const path = `content/posts/${params.slug}.md`;
  const head = await fetch(`https://api.github.com/repos/${repo}/contents/${encodeURIComponent(path)}?ref=${branch}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" }
  });
  if (!head.ok) return NextResponse.json({ ok: false, status: head.status }, { status: 404 });
  const j = await head.json();
  const res = await fetch(`https://api.github.com/repos/${repo}/contents/${encodeURIComponent(path)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" },
    body: JSON.stringify({ message: `Delete ${path}`, sha: j.sha, branch })
  });
  if (!res.ok) return NextResponse.json({ ok: false, status: res.status }, { status: 500 });
  return NextResponse.json({ ok: true });
}