import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { commitFile } from "@/lib/github";

export const runtime = "nodejs";

export async function POST(req) {
  const denied = requireAdmin();
  if (denied) return denied;

  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json({ ok: false, error: "No file provided" }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const safeName = file.name.replace(/\s+/g, "-");
    const path = `public/uploads/${Date.now()}-${safeName}`;

    await commitFile({ path, content: bytes, message: `Upload ${safeName}` });

    // public/ prefix isn't part of the URL
    return NextResponse.json({ ok: true, url: `/${path.replace(/^public\//, "")}` });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err.message || err) }, { status: 500 });
  }
}
