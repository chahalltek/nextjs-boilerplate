// app/api/admin/polls/route.js
import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/adminAuth";
import { createOrUpdateFile } from "@/lib/github";

export const runtime = "nodejs";

function slugify(input) {
  return String(input || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export async function POST(request) {
  const denied = await requireAdminAuth(request);
  if (denied) return denied;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { title, question, options, status = "draft", slug: s } = body || {};
  if (!title || !question) {
    return NextResponse.json({ error: "title and question required" }, { status: 400 });
  }

  const slug = slugify(s || title);
  const safeOptions = Array.isArray(options)
    ? options
        .map((o) => (typeof o === "string" ? o : o?.label || ""))
        .map((label) => label.trim())
        .filter(Boolean)
        .slice(0, 8)
    : [];

  if (safeOptions.length < 2) {
    return NextResponse.json({ error: "At least two options required" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const poll = {
    slug,
    title,
    question,
    options: safeOptions.map((label, idx) => ({
      id: String.fromCharCode(97 + idx),
      label,
      votes: 0,
    })),
    status: status === "published" ? "published" : "draft",
    createdAt: now,
    updatedAt: now,
  };

  const path = `content/polls/${slug}.json`;
  const content = Buffer.from(JSON.stringify(poll, null, 2)).toString("base64");
  const gh = await createOrUpdateFile(path, content, `Save poll ${slug}`);
  if (!gh?.ok) {
    return NextResponse.json({ error: "GitHub save failed", details: gh }, { status: 500 });
  }

  return NextResponse.json({ ok: true, slug });
}
