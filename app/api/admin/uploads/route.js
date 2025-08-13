import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/adminAuth";
import { createOrUpdateFile } from "@/lib/github";
import crypto from "node:crypto";

export const runtime = "nodejs";

function slugify(s) {
  return (s || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export async function POST(request) {
  const guard = requireAdminAuth(request);
  if (guard) return guard;

  const form = await request.formData();
  const file = form.get("file");
  const hint = form.get("slug") || "";

  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "no-file" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const rand = crypto.randomBytes(6).toString("hex");
  const base = slugify(hint || file.name.replace(/\.[^.]+$/, ""));

  const repoPath = `public/uploads/${y}/${m}/${base}-${rand}.${ext}`;
  const contentBase64 = buf.toString("base64");

  const res = await createOrUpdateFile(repoPath, contentBase64, `Upload image ${repoPath}`);
  if (!res.ok) return NextResponse.json(res, { status: 500 });

  const url = `/uploads/${y}/${m}/${base}-${rand}.${ext}`;
  return NextResponse.json({ ok: true, url, path: repoPath, name: file.name, size: buf.length });
}
