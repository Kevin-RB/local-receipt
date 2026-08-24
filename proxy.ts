import { getSessionCookie } from "better-auth/cookies";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = new Set(["/sign-in", "/sign-up"]);

export const proxy = (request: NextRequest) => {
  // Optimistic check only — real validation happens server-side in layouts.
  // Public paths are never redirected here: a stale cookie must not bounce
  // users away from /sign-in, or the layout check would loop forever.
  if (
    !PUBLIC_PATHS.has(request.nextUrl.pathname) &&
    !getSessionCookie(request)
  ) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  return NextResponse.next();
};

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
