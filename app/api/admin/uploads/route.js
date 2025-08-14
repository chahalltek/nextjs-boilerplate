import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/adminAuth";
import { commitFile } from "@/lib/github";

export async function POST(req) {
  const gate = requireAdminAuth();
  if (!gate.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "No file" }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const bytes = Buffer.from(arrayBuffer);
  const cleanName = String(file.name || "upload.bin").replace(/[^a-zA-Z0-9._-]/g, "_");
  const ts = Date.now();
  const relPath = `public/uploads/${ts}-${cleanName}`;

  await commitFile({
    path: relPath,
    content: bytes,
    message: `Upload ${cleanName} via Admin`,
  });

  // Public URL your site can serve
  const url = `/uploads/${ts}-${cleanName}`;
  return NextResponse.json({ ok: true, url });
}
