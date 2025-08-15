import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    GH_REPO: !!process.env.GH_REPO,
    GH_BRANCH: process.env.GH_BRANCH || null,
    GITHUB_TOKEN: process.env.GITHUB_TOKEN ? "set" : null,
    ADMIN_USER: !!process.env.ADMIN_USER,
    ADMIN_PASS: !!process.env.ADMIN_PASS,
  });
}
