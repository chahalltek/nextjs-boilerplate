import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/adminAuth";
import { createOrUpdateFile } from "@/lib/github";

export const runtime = "nodejs";

export async function POST(request) {
  const denied = await requireAdminAuth(request);
  if (denied) return denied;

  const now  = new Date().toISOString();
  const path = "content/_health.txt";
  const b64  = Buffer.from(`ok ${now}\n`).toString("base64");

  const gh = await createOrUpdateFile(path, b64, `health ${now}`);
  if (!gh?.ok) return NextResponse.json({ ok: false, where: "createOrUpdateFile", gh }, { status: 500 });

  return NextResponse.json({ ok: true, path, gh });
}
