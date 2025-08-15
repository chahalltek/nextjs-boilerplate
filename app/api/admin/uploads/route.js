// app/api/admin/uploads/route.js
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { commitFile } from "@/lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  const denied = requireAdmin();
  if (denied) return denied;

  const form = await request.formData();
  const file = form.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ ok: false, error: "No file" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const original = `${file.name || "upload.bin"}`.toLowerCase();
  const safeName = original
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  const year = new Date().getFullYear();
  const stamped = `${Date.now()}-${safeName}`;

  // Commit into repo under public/uploads/<year>/
  const repoPath = `public/uploads/${year}/${stamped}`;
  await commitFile({
    path: repoPath,
    contentBase64: buf.toString("base64"),
    message: `upload: ${repoPath}`
  });

  // Public URL on the site. Served dynamically by app/uploads/[...path]/route.js
  const url = `/uploads/${year}/${stamped}`;
  return NextResponse.json({ ok: true, url });
}
