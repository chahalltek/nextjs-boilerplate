// app/api/admin/github-selftest/route.js
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/adminAuth";
import { getFile, createOrUpdateFile } from "@/lib/github";

export async function POST(request) {
  const denied = requireAdminAuth(request);
  if (denied) return denied; // must already be a NextResponse

  const repo = process.env.GITHUB_REPO || process.env.GH_REPO;
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!repo || !token) {
    return NextResponse.json(
      { ok: false, reason: "Missing GITHUB_REPO or GITHUB_TOKEN" },
      { status: 500 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const path = body.path || "tmp/selftest.txt";

  try {
    const existing = await getFile(path).catch(() => null);
    const content = `skol selftest @ ${new Date().toISOString()}\n`;
    await createOrUpdateFile(path, content, "chore: github selftest", existing?.sha);
    return NextResponse.json({ ok: true, path });
  } catch (e) {
    return NextResponse.json(
      { ok: false, reason: String(e?.message || e) },
      { status: 500 }
    );
  }
}
