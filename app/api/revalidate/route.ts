// app/api/revalidate/route.ts
import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { cookies, headers } from "next/headers";

export const runtime = "nodejs";
const ADMIN_COOKIE = "skol_admin";

/** Accepts ?path=/foo or ?tag=bar. Also accepts JSON body { path | tag }.
 * Auth: skol_admin cookie OR header x-admin-key === ADMIN_REVALIDATE_KEY
 */
async function handle(req: Request) {
  const url = new URL(req.url);
  let path = url.searchParams.get("path") || undefined;
  let tag = url.searchParams.get("tag") || undefined;

  if (!path && !tag && req.headers.get("content-type")?.includes("application/json")) {
    const body = await req.json().catch(() => ({}));
    path = body?.path;
    tag = body?.tag;
  }

  // auth
  const hasCookie = cookies().get(ADMIN_COOKIE)?.value;
  const headerKey = headers().get("x-admin-key");
  const envKey = process.env.ADMIN_REVALIDATE_KEY;

  if (!hasCookie && (!envKey || headerKey !== envKey)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (path) {
    revalidatePath(path);
    return NextResponse.json({ ok: true, type: "path", path });
  }
  if (tag) {
    revalidateTag(tag);
    return NextResponse.json({ ok: true, type: "tag", tag });
  }
  return NextResponse.json({ error: "missing path or tag" }, { status: 400 });
}

export const GET = handle;
export const POST = handle;
