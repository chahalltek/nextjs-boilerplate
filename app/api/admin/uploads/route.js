// app/api/admin/uploads/route.js
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { commitFile } from "@/lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sanitizeName(name = "") {
  const cleaned = name.split(/[\/\\]/).pop() || "file";
  return cleaned.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function POST(request) {
  const denied = requireAdmin();
  if (denied) return denied;

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json({ ok: false, error: "No file" }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const y = new Date().getFullYear();
    const fname = sanitizeName(file.name);
    const path = `public/uploads/${y}/${Date.now()}-${fname}`;

    const gh = await commitFile({
      path,
      contentBase64: buf.toString("base64"),
      message: `upload: ${fname}`,
      sha: undefined,
    });

    const publicUrl = `/uploads/${y}/${encodeURIComponent(`${Date.now()}-${fname}`)}`; // matches public/
    return NextResponse.json({ ok: true, url: publicUrl, commit: gh.commit });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
