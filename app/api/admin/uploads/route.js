// app/api/admin/uploads/route.js
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { commitFile } from "@/lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  const denied = requireAdmin();
  if (denied) return denied;

  // Limit: Vercel’s default body limit is ~4.5MB for Node functions.
  // Keep images small-ish or switch to blob storage if you outgrow this.
  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ ok: false, error: "Bad form data" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ ok: false, error: "No file" }, { status: 400 });
  }

  const arrayBuf = await file.arrayBuffer();
  const bytes = Buffer.from(arrayBuf);
  const base64 = bytes.toString("base64");

  // Create a nice filename
  const origName = (file.name || "upload.bin").replace(/[^\w.\-]/g, "_");
  const ext = origName.includes(".") ? origName.split(".").pop() : "bin";
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `${stamp}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const path = `public/uploads/${filename}`;
  try {
    const gh = await commitFile({
      path,
      contentBase64: base64,
      message: `upload: ${origName}`,
    });

    // URL that Next will serve from /public
    const url = `/uploads/${filename}`;
    return NextResponse.json({ ok: true, url, commit: gh.commit });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
