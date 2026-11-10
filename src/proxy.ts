import { type NextRequest, NextResponse } from "next/server";

/**
 * Optimistic gate for /admin: visitors without a session cookie are sent to the sign-in page
 * before any admin code runs, and admin pages are kept out of search indexes.
 *
 * This is deliberately NOT the security boundary — it only checks that a cookie exists. The real
 * verification happens on the server in the admin layout (requireOwner) and in every server
 * action and route handler (assertOwner).
 */
const SESSION_COOKIES = ["__Host-oops_session", "oops_session"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasCookie = SESSION_COOKIES.some((name) => request.cookies.has(name));

  if (!hasCookie && pathname !== "/admin/login") {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  const response = NextResponse.next();
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
