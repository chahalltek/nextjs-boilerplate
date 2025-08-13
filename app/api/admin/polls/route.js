import { NextResponse } from "next/server";
import { createOrUpdateFile } from "@/lib/github";

export const runtime = "nodejs";

function fileSlug(s) {
  return (s || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export async function POST(req) {
  const data = await req.json();
  const { slug, title, options = [], multiple = false, status = "open" } = data;
  if (!title || !options.length) {
    return NextResponse.json({ ok: false, error: "title-and-options-required" }, { status: 400 });
  }
  const finalSlug = fileSlug(slug || title);
  const path = `content/polls/${finalSlug}.json`;
  const json = JSON.stringify({ title, options, multiple, status }, null, 2);
  const res = await createOrUpdateFile(path, Buffer.from(json).toString("base64"), `Save poll ${path}`);
  if (!res.ok) return NextResponse.json(res, { status: 500 });
  return NextResponse.json({ ok: true, slug: finalSlug });
}
