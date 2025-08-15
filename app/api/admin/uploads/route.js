// app/api/admin/uploads/route.js
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { commitFile } from "@/lib/github";
import crypto from "node:crypto";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  const denied = requireAdmin();
  if (denied) return denied;

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json({ ok: false, error: "No file provided" }, { status: 400 });
    }

    // Read file bytes
    const buf = Buffer.from(await file.arrayBuffer());

    // Build a safe filename (don’t trust browser name; keep it small)
    const extGuess = (path.extname(file.name || "").slice(1).toLowerCase() || "bin")
      .replace(/[^a-z0-9]/g, "") || "bin";
    const key = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${extGuess}`;

    // Commit to repo under public/uploads/
    const repoPath = `public/uploads/${key}`;
    const contentBase64 = buf.toString("base64");

    const gh = await commitFile({
      path: repoPath,
      contentBase64,
      message: `upload: ${key}`,
    });

    // Public URL (will exist after next deploy)
    const url = `/uploads/${key}`;
    return NextResponse.json({ ok: true, url, commit: gh.commit });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err?.message || err) },
      { status: 500 }
    );
  }
}
