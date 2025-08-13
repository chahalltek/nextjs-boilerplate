// middleware.js
import { NextResponse } from 'next/server';

function parseBasicAuth(header) {
  if (!header || !header.startsWith('Basic ')) return null;
  const base64 = header.slice(6);

  // Edge runtime has atob(); fall back to Buffer only if we're not on Edge.
  let decoded;
  try {
    decoded =
      typeof atob === 'function'
        ? atob(base64)
        : Buffer.from(base64, 'base64').toString('utf8');
  } catch {
    return null;
  }

  const i = decoded.indexOf(':');
  if (i === -1) return null;
  return { user: decoded.slice(0, i), pass: decoded.slice(i + 1) };
}

export function middleware(req) {
  const { pathname } = new URL(req.url);
  // Protect admin pages and admin APIs only
  if (!pathname.startsWith('/admin') && !pathname.startsWith('/api/admin')) {
    return NextResponse.next();
  }

  const expectedUser = process.env.ADMIN_USER ?? '';
  const expectedPass = process.env.ADMIN_PASS ?? '';

  const creds = parseBasicAuth(req.headers.get('authorization'));
  if (!creds) {
    return new NextResponse('Unauthorized', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="admin"' },
    });
  }

  if (creds.user !== expectedUser || creds.pass !== expectedPass) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
