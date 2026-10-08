import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/constants";

/**
 * Optimistic gate for /admin: bounce visitors without a session cookie straight to login.
 * The real check (session validated against the database, role enforced) happens in the
 * admin layout and in every server action.
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const res = NextResponse.next();
  res.headers.set("x-robots-tag", "noindex, nofollow");
  if (pathname === "/admin/login") return res;
  if (!req.cookies.get(SESSION_COOKIE)) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return res;
}

export const config = { matcher: ["/admin", "/admin/:path*"] };
