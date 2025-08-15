import { NextResponse } from "next/server";
import { commitFile, getFile } from "@/lib/github";
export const runtime = "nodejs";

export async function GET() {
  try {
    const path = "tmp/_github_selftest.txt";
    const stamp = new Date().toISOString();
    await commitFile({ path, content: `ok ${stamp}\n`, message: "selftest" });
    const file = await getFile(path);
    return NextResponse.json({ ok: true, wrote: !!file, path });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err.message || err) }, { status: 500 });
  }
}
