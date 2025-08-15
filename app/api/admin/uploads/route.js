// app/api/admin/uploads/route.js
import { NextResponse } from "next/server";
import path from "node:path";
import crypto from "node:crypto";
import { requireAdmin } from "@/lib/adminAuth";
import { createOrUpdateFile } from "@/lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Adjust if you want a different folder
const UPLOAD_DIR = "public/uploads";

function safeName(filename = "file") {
  // keep extension if present
  const ext = path.extname(filename).slice(1).toLowerCase();
  const base = crypto.randomBytes(8).toString("hex");
  return ext ? `${base}.${ext}` : base;
}

export async function POST(req) {
  // Gate: require admin session
  const denied = requireAdmin?.(req);
  if (denied) return denied;

  try {
    const form = await req.formData();
    // the input name should be 'file' on the client
    const file = form.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json({ ok: false, error: "no file provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const filename = safeName(file.name || "upload.bin");
    const repoPath = `${UPLOAD_DIR}/${filename}`;

    const res = await createOrUpdateFile(
      repoPath,
      buffer,
      `feat: upload image ${filename}`
    );

    // Optional: auto-redeploy so the new file is served immediately
    if (process.env.VERCEL_DEPLOY_HOOK_URL) {
      fetch(process.env.VERCEL_DEPLOY_HOOK_URL, { method: "POST" }).catch(() => {});
    }

    // public URL for the site
    const url = `/uploads/${filename}`;
    return NextResponse.json({ ok: true, path: repoPath, url, commit: res?.sha || null });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
