import { NextResponse } from "next/server";
import { cookies, headers as nextHeaders } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Allow if:
 *  - you have the admin session cookie, OR
 *  - Authorization: Bearer <ADMIN_API_KEY> (case-insensitive), OR
 *  - X-Admin-Key: <ADMIN_API_KEY> (fallback header)
 */
function hasAdminAuth(req: Request) {
  const key = (process.env.ADMIN_API_KEY || "").trim();
  if (!key) return false;

  // Admin cookie from middleware login
  const adminCookie = cookies().get("skol_admin")?.value;
  if (adminCookie) return true;

  // Authorization: Bearer ...
  const h = new Headers(req.headers);
  const auth = h.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  const bearer = m?.[1]?.trim();

  // X-Admin-Key fallback
  const xKey = h.get("x-admin-key")?.trim();

  return (bearer && bearer === key) || (xKey && xKey === key);
}

export async function GET(req: Request) {
  if (!hasAdminAuth(req)) {
    // Small hint without leaking secrets
    const hdrs = nextHeaders();
    const via = hdrs.get("x-forwarded-host") || hdrs.get("host") || "";
    return NextResponse.json({ error: "unauthorized", via }, { status: 401 });
  }

  const url = new URL(req.url);
  const emailFilter = (url.searchParams.get("email") || "").toLowerCase();

  // If you want: call Mailchimp/Resend here. For now, just echo the filter so you can test auth.
  return NextResponse.json({
    ok: true,
    filter: emailFilter || null,
    note:
      "Auth OK. Hook up Mailchimp/Resend lookups here once your key test passes.",
  });
}
