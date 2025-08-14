// app/api/admin/github-selftest/route.js
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getFile, createOrUpdateFile } from "@/lib/github";

/**
 * POST /api/admin/github-selftest
 * Writes tmp/selftest.txt in the repo (creating or updating it).
 * Always returns a NextResponse to satisfy Next.js route typing.
 * Auth is enforced by middleware for /api/admin/*.
 */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const path = body.path || "tmp/selftest.txt";

    const existing = await getFile(path).catch(() => null);
    const content = `skol selftest @ ${new Date().toISOString()}\n`;

    await createOrUpdateFile(
      path,
      content,
      `chore: github selftest for ${path}`,
      existing?.sha
    );

    return NextResponse.json({ ok: true, path });
  } catch (e) {
    return NextResponse.json(
      { ok: false, reason: e?.message || String(e) },
      { status: 500 }
    );
  }
}
