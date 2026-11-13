import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isTrackingDomain, normalizeHost } from '@/lib/shortLinks';

export function middleware(req: NextRequest) {
  const host = normalizeHost(req.headers.get('host'));
  const pathname = req.nextUrl.pathname;

  // Handle dedicated tracking domains (e.g. pay.insurvoice.ai)
  if (isTrackingDomain(host)) {
    if (pathname === '/' || pathname === '') {
      return new NextResponse('Not Found', { status: 404 });
    }

    const code = pathname.slice(1);
    const rewriteUrl = new URL(`/api/r/${encodeURIComponent(code)}`, req.url);
    rewriteUrl.searchParams.set('domain', host);
    return NextResponse.rewrite(rewriteUrl);
  }

  const token = req.cookies.get('sb-access-token')?.value;

  // Protect dashboard routes if no session token
  if (!token && pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Redirect to home if logged in and trying to access /login
  if (token && pathname === '/login') {
    return NextResponse.redirect(new URL('/', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
