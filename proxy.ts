import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { ruleForPath, roleAtLeast, type Role } from "@/lib/rbac";

const SECURITY_HEADERS: Record<string, string> = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-DNS-Prefetch-Control": "off",
  "Permissions-Policy": "camera=(self), geolocation=(self), microphone=()",
};

function withSecurityHeaders(res: NextResponse): NextResponse {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.headers.set(k, v);
  // request id for downstream logging correlation
  res.headers.set("x-request-id", crypto.randomUUID());
  return res;
}

/**
 * Edge gate. Cheap checks only — NO database calls.
 * Verifies a session exists and the JWT role clears the route's minimum.
 * Deep authorization (resource ownership) happens in layouts / server actions.
 */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const rule = ruleForPath(pathname);

  if (!rule) return withSecurityHeaders(NextResponse.next());

  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
    // Auth.js v5 prefixes the cookie with `__Secure-` over https.
    secureCookie: process.env.NODE_ENV === "production",
  });

  if (!token) {
    const url = new URL("/login", req.url);
    url.searchParams.set("from", pathname);
    return withSecurityHeaders(NextResponse.redirect(url));
  }

  const role = (token.role as Role | undefined) ?? "member";
  if (!roleAtLeast(role, rule.min)) {
    return withSecurityHeaders(
      NextResponse.redirect(new URL("/dashboard?denied=1", req.url))
    );
  }

  return withSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    "/command/:path*",
    "/forge/:path*",
    "/dashboard/:path*",
    "/profile/:path*",
    "/hunts/:path*",
    "/hunt/:path*",
    "/arcade/:path*",
  ],
};
