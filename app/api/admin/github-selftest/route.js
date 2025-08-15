// app/api/admin/github-selftest/route.js
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { commitFile } from "@/lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  const denied = requireAdmin();
  if (denied) return denied;

  const { path } = await request.json().catch(() => ({}));
  const stamp = new Date().toISOString();
  const filePath = path || `data/selftest-${Date.now()}.txt`;

  try {
    const gh = await commitFile({
      path: filePath,
      contentBase64: Buffer.from(`ok ${stamp}\n`, "utf8").toString("base64"),
      message: "selftest",
      sha: undefined,
    });
    return NextResponse.json({ ok: true, path: filePath, commit: gh.commit });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
