import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/adminAuth";
import { createOrUpdateFile } from "@/lib/github";

export const runtime = "nodejs";

function safeName(name = "upload.bin") {
  const base = String(name)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "upload.bin";
}

export async function POST(request) {
  const denied = await requireAdminAuth(request);
  if (denied) return denied;

  let form;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = form.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const b64 = Buffer.from(arrayBuffer).toString("base64");

  const dated = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const filename = `${dated}-${safeName(file.name)}`;
  const path = `public/uploads/${filename}`;

  const gh = await createOrUpdateFile(path, b64, `Upload image ${filename}`);
  if (!gh?.ok) {
    return NextResponse.json({ error: "GitHub save failed", details: gh }, { status: 500 });
  }

  return NextResponse.json({ ok: true, url: `/uploads/${filename}`, path });
}
