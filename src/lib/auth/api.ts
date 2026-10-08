import "server-only";
import { NextResponse } from "next/server";
import { getCurrentUser, type SessionUser } from "./session";

/**
 * Guard for admin JSON APIs. Uses the same database-validated session as the admin UI.
 * Mutating requests must also come from this site's own origin (CSRF defence on top of SameSite=Lax).
 */
export async function requireApiUser(req: Request, role?: "admin"): Promise<SessionUser | NextResponse> {
  if (req.method !== "GET" && req.method !== "HEAD") {
    const origin = req.headers.get("origin");
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    let originHost: string | null = null;
    try {
      originHost = origin ? new URL(origin).host : null; // "null" or garbage → rejected, not a 500
    } catch {
      originHost = null;
    }
    if (!originHost || !host || originHost !== host) {
      return NextResponse.json({ error: "Cross-site request rejected." }, { status: 403 });
    }
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (role === "admin" && user.role !== "admin") return NextResponse.json({ error: "Admins only." }, { status: 403 });
  return user;
}

export const isResponse = (v: unknown): v is NextResponse => v instanceof Response;
