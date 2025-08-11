import { NextResponse } from "next/server";
import { createOrUpdateFile } from "@/lib/github";

export const runtime = "nodejs";

function slugify(s) {
  return (s || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export async function POST(req) {
  const form = await req.formData();
  const file = form.get("file");
  const hint = form.get("slug") || "";
  if (!file) return NextResponse.json({ ok: false, error: "no-file" }, { status: 400 });

  const arrayBuf = await file.arrayBuffer();
  const buf = Buffer.from(arrayBuf);
  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 8);
  const base = slugify(hint || file.name.replace(/\.[^.]+$/, ""));
  const repoPath = `public/uploads/${y}/${m}/${base}-${rand}.${ext}`;

  const res = await createOrUpdateFile(repoPath, buf.toString("base64"), `Upload image ${repoPath}`);
  if (!res.ok) return NextResponse.json(res, { status: 500 });

  const url = `/uploads/${y}/${m}/${base}-${rand}.${ext}`;
  return NextResponse.json({ ok: true, url, path: repoPath, name: file.name, size: buf.length });
}