import { NextResponse } from "next/server";

export function middleware(req) {
  const url = new URL(req.url);
  const isAdmin = url.pathname.startsWith("/admin") || url.pathname.startsWith("/api/admin");
  if (!isAdmin) return NextResponse.next();

  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Basic ")) {
    return new NextResponse("Unauthorized", { status: 401, headers: { "WWW-Authenticate": "Basic realm=admin" } });
  }
  const b64 = auth.split(" ")[1] || "";
  let decoded = "";
  try { decoded = atob(b64); } catch { return new NextResponse("Bad auth", { status: 400 }); }
  const [user, pass] = decoded.split(":");

  const expectedUser = process.env.ADMIN_USER || "";
  const expectedPass = process.env.ADMIN_PASS || "";
  if (user !== expectedUser || pass !== expectedPass) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };