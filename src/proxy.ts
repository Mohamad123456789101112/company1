import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "aj_session";

/**
 * First line of defence: unauthenticated visitors are bounced away from
 * private areas before rendering. Real authorization (role checks, ownership)
 * happens again in layouts, pages, and server actions – never trust this alone.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  if (!hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  const response = NextResponse.next();
  // Private pages must never be cached by shared caches.
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  return response;
}

export const config = {
  matcher: [
    "/.env",
    "/config/:path*",
    "/supabase/:path*",
    "/scripts/:path*",
    "/.git/:path*",
    "/dashboard/:path*",
    "/admin/:path*",
    "/learn/:path*",
    "/quiz/:path*",
    "/complete-profile",
    "/checkout/:path*",
  ],
};
