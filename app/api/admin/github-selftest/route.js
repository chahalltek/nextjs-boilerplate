// app/api/admin/github-selftest/route.js
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { commitFile } from "@/lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const denied = requireAdmin();
  if (denied) return denied;

  try {
    const stamp = new Date().toISOString();
    const path = "data/selftest.txt";
    const base64 = Buffer.from(`ok ${stamp}\n`, "utf8").toString("base64");
    const gh = await commitFile({
      path,
      contentBase64: base64,
      message: "selftest",
      sha: undefined, // TS friendly
    });
    return NextResponse.json({ ok: true, path, commit: gh.commit });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500 }
    );
  }
}
